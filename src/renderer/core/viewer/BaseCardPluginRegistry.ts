import type { Card } from '@common/types';

export interface BaseCardServiceResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface BaseCardRenderContext {
  card: Card;
  baseCardId: string;
  baseCardType: string;
  config: Record<string, unknown>;
  content?: string;
  container: HTMLElement;
  themeId?: string;
  interactive: boolean;
  mode: 'full' | 'preview' | 'thumbnail';
  locale: string;
  requestService: (service: string, payload: unknown) => Promise<BaseCardServiceResponse>;
}

export interface BaseCardRenderResult {
  cleanup?: () => Promise<void> | void;
}

export interface BaseCardRenderPlugin {
  id: string;
  cardType: string;
  render: (context: BaseCardRenderContext) => Promise<BaseCardRenderResult | void>;
}

export class BaseCardPluginRegistry {
  private readonly plugins = new Map<string, BaseCardRenderPlugin>();

  register(plugin: BaseCardRenderPlugin): void {
    this.plugins.set(plugin.cardType, plugin);
  }

  unregister(pluginId: string): void {
    for (const [cardType, plugin] of this.plugins.entries()) {
      if (plugin.id === pluginId) {
        this.plugins.delete(cardType);
      }
    }
  }

  get(cardType: string): BaseCardRenderPlugin | undefined {
    return this.plugins.get(cardType);
  }

  list(): BaseCardRenderPlugin[] {
    return Array.from(this.plugins.values());
  }
}
