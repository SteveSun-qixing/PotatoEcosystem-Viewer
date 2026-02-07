import yaml from 'js-yaml';
import type { BaseCardRenderContext, BaseCardRenderPlugin } from '@renderer/core/viewer/BaseCardPluginRegistry';
import { getLocale } from './i18n';

interface PluginManifest {
  id?: string;
  name?: string;
  version?: string;
  type?: string;
  cardType?: string;
}

interface RuntimePluginCore {
  request(params: { service: string; payload: unknown }): Promise<{ success: boolean; data?: unknown; error?: string }>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

interface RuntimeRenderer {
  setCore?: (core: RuntimePluginCore) => void;
  render: (
    config: Record<string, unknown>,
    container: HTMLElement,
    options: {
      cardId?: string;
      mode: 'view' | 'edit';
      theme?: string;
      interactive?: boolean;
      locale?: string;
    }
  ) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

interface RuntimePlugin {
  metadata?: {
    cardType?: string;
  };
  initialize?: (core: RuntimePluginCore) => Promise<void> | void;
  start?: () => Promise<void> | void;
  stop?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
  createRenderer?: () => RuntimeRenderer;
}

type PluginConstructor = new () => RuntimePlugin;

const manifestModules = import.meta.glob('../../../../BasicCardPlugin/**/manifest.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const pluginModules = import.meta.glob('../../../../BasicCardPlugin/**/src/plugin.ts');

function resolveRootFromManifest(path: string): string {
  return path.replace(/\/manifest\.yaml$/, '');
}

function resolveRootFromPlugin(path: string): string {
  return path.replace(/\/src\/plugin\.ts$/, '');
}

function normalizeModuleMap(): Map<string, () => Promise<unknown>> {
  const map = new Map<string, () => Promise<unknown>>();
  for (const [path, loader] of Object.entries(pluginModules)) {
    map.set(resolveRootFromPlugin(path), loader);
  }
  return map;
}

function resolvePluginConstructor(module: Record<string, unknown>): PluginConstructor {
  const candidates = [module.default, ...Object.values(module)].filter(
    value => typeof value === 'function'
  ) as PluginConstructor[];

  for (const candidate of candidates) {
    if (typeof candidate.prototype?.createRenderer === 'function') {
      return candidate;
    }
  }

  throw new Error('No valid plugin constructor found (missing createRenderer)');
}

async function callHook(target: RuntimePlugin | RuntimeRenderer, hook: string): Promise<void> {
  const fn = (target as Record<string, unknown>)[hook];
  if (typeof fn === 'function') {
    await (fn as () => Promise<void> | void).call(target);
  }
}

function createPluginCore(context: BaseCardRenderContext): RuntimePluginCore {
  return {
    request: ({ service, payload }) => context.requestService(service, payload),
    on: () => {},
    off: () => {},
  };
}

function createRenderOptions(context: BaseCardRenderContext): {
  cardId?: string;
  mode: 'view' | 'edit';
  theme?: string;
  interactive?: boolean;
  locale?: string;
} {
  return {
    cardId: context.card.id,
    mode: 'view',
    theme: context.themeId,
    interactive: context.interactive,
    locale: context.locale || getLocale(),
  };
}

function buildWrapperPlugin(
  pluginId: string,
  cardType: string,
  loader: () => Promise<unknown>
): BaseCardRenderPlugin {
  return {
    id: pluginId,
    cardType,
    async render(context) {
      const module = (await loader()) as Record<string, unknown>;
      const PluginCtor = resolvePluginConstructor(module);
      const runtimePlugin = new PluginCtor();
      const core = createPluginCore(context);
      let renderer: RuntimeRenderer | null = null;

      try {
        if (typeof runtimePlugin.initialize === 'function') {
          await runtimePlugin.initialize(core);
        }
        await callHook(runtimePlugin, 'start');

        if (typeof runtimePlugin.createRenderer !== 'function') {
          throw new Error(`Plugin ${pluginId} does not provide createRenderer()`);
        }

        renderer = runtimePlugin.createRenderer();
        if (!renderer || typeof renderer.render !== 'function') {
          throw new Error(`Plugin ${pluginId} renderer is invalid`);
        }

        if (typeof renderer.setCore === 'function') {
          renderer.setCore(core);
        }

        const config = { ...context.config };
        if (context.content && !Object.prototype.hasOwnProperty.call(config, 'content_text')) {
          config.content_text = context.content;
        }

        await renderer.render(config, context.container, createRenderOptions(context));

        return {
          cleanup: async () => {
            await callHook(renderer as RuntimeRenderer, 'destroy');
            await callHook(runtimePlugin, 'stop');
            await callHook(runtimePlugin, 'destroy');
          },
        };
      } catch (error) {
        if (renderer) {
          await callHook(renderer, 'destroy');
        }
        await callHook(runtimePlugin, 'stop');
        await callHook(runtimePlugin, 'destroy');
        throw error;
      }
    },
  };
}

export async function loadWorkspaceBaseCardPlugins(): Promise<BaseCardRenderPlugin[]> {
  const moduleMap = normalizeModuleMap();
  const plugins: BaseCardRenderPlugin[] = [];

  for (const [path, rawManifest] of Object.entries(manifestModules)) {
    let manifest: PluginManifest;
    try {
      manifest = (yaml.load(rawManifest) as PluginManifest) ?? {};
    } catch {
      continue;
    }

    if (manifest.type !== 'base_card' || typeof manifest.cardType !== 'string' || !manifest.cardType) {
      continue;
    }

    const root = resolveRootFromManifest(path);
    const loader = moduleMap.get(root);
    if (!loader) {
      continue;
    }

    const pluginId = manifest.id || `${manifest.cardType}-plugin`;
    plugins.push(buildWrapperPlugin(pluginId, manifest.cardType, loader));
  }

  return plugins;
}
