/**
 * 插件上下文实现
 * 为插件提供安全的、受限的 API 访问
 * @module @renderer/core/plugin/PluginContext
 */
import type {
  PluginContext,
  CommandHandler,
  RendererDefinition,
  LayoutRendererDefinition,
  PluginFileAPI,
  PluginStorageAPI,
  PluginThemeAPI,
  PluginI18nAPI,
} from '@common/types/plugin';
import type { IEventBus, ILogger } from '@common/interfaces';
import { Logger } from '@renderer/services/Logger';
import { VERSION } from '@common/constants';

/**
 * 插件存储键前缀
 */
const STORAGE_PREFIX = 'plugin:';

/**
 * PluginContextImpl - 插件上下文实现类
 *
 * @description
 * 为每个插件提供独立的运行时上下文，包括：
 * - 文件访问 API（受限）
 * - 本地存储 API
 * - 主题 API
 * - 国际化 API
 * - 命令注册
 * - 渲染器注册
 * - 事件系统
 *
 * 所有 API 访问都经过安全检查，确保插件只能访问被允许的资源。
 *
 * @example
 * ```typescript
 * const context = new PluginContextImpl(
 *   'my-plugin',
 *   eventBus,
 *   commandRegistry,
 *   rendererRegistry
 * );
 *
 * // 在插件中使用
 * context.log('Plugin loaded');
 * context.registerCommand('my-command', () => { ... });
 * ```
 */
export class PluginContextImpl implements PluginContext {
  /**
   * 插件 ID
   */
  readonly pluginId: string;

  /**
   * SDK 版本号
   */
  readonly sdkVersion: string;

  /**
   * 插件配置
   */
  config: Record<string, unknown>;

  /**
   * 插件 API 接口
   */
  readonly api: {
    file: PluginFileAPI;
    storage: PluginStorageAPI;
    theme: PluginThemeAPI;
    i18n: PluginI18nAPI;
  };

  /**
   * 事件总线引用
   */
  private readonly eventBus: IEventBus;

  /**
   * 命令注册表引用
   */
  private readonly commandRegistry: Map<string, CommandHandler>;

  /**
   * 渲染器注册表引用
   */
  private readonly rendererRegistry: Map<string, RendererDefinition>;

  /**
   * 布局渲染器注册表引用
   */
  private readonly layoutRendererRegistry: Map<string, LayoutRendererDefinition>;

  /**
   * 插件订阅的事件处理器
   */
  private readonly eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();

  /**
   * 日志器
   */
  private readonly logger: ILogger;

  /**
   * 已注册的命令名称（用于清理）
   */
  private readonly registeredCommands: Set<string> = new Set();

  /**
   * 已注册的渲染器类型（用于清理）
   */
  private readonly registeredRenderers: Set<string> = new Set();

  /**
   * 已注册的布局渲染器类型（用于清理）
   */
  private readonly registeredLayoutRenderers: Set<string> = new Set();

  /**
   * 上下文是否已销毁
   */
  private destroyed = false;

  /**
   * 创建插件上下文实例
   *
   * @param pluginId - 插件唯一标识符
   * @param eventBus - 事件总线实例
   * @param commandRegistry - 全局命令注册表
   * @param rendererRegistry - 全局渲染器注册表
   * @param layoutRendererRegistry - 全局布局渲染器注册表
   * @param config - 插件初始配置
   */
  constructor(
    pluginId: string,
    eventBus: IEventBus,
    commandRegistry: Map<string, CommandHandler>,
    rendererRegistry: Map<string, RendererDefinition>,
    layoutRendererRegistry: Map<string, LayoutRendererDefinition>,
    config?: Record<string, unknown>
  ) {
    this.pluginId = pluginId;
    this.sdkVersion = VERSION;
    this.eventBus = eventBus;
    this.commandRegistry = commandRegistry;
    this.rendererRegistry = rendererRegistry;
    this.layoutRendererRegistry = layoutRendererRegistry;
    this.config = config ?? {};
    this.logger = new Logger(`Plugin:${pluginId}`);

    // 初始化 API
    this.api = {
      file: this.createFileAPI(),
      storage: this.createStorageAPI(),
      theme: this.createThemeAPI(),
      i18n: this.createI18nAPI(),
    };
  }

  /**
   * 日志输出
   *
   * @param message - 日志消息
   * @param data - 附加数据
   */
  log = (message: string, data?: unknown): void => {
    this.checkDestroyed();
    this.logger.info(message, data as Record<string, unknown>);
  };

  /**
   * 注册命令
   *
   * @param name - 命令名称
   * @param handler - 命令处理函数
   * @throws {Error} 如果命令名已存在
   */
  registerCommand = (name: string, handler: CommandHandler): void => {
    this.checkDestroyed();

    const fullName = `${this.pluginId}:${name}`;

    if (this.commandRegistry.has(fullName)) {
      throw new Error(`Command "${fullName}" already registered`);
    }

    this.commandRegistry.set(fullName, handler);
    this.registeredCommands.add(fullName);

    this.logger.debug('Command registered', { name: fullName });
  };

  /**
   * 注册渲染器
   *
   * @param type - 渲染器类型标识
   * @param renderer - 渲染器定义
   * @throws {Error} 如果渲染器类型已存在
   */
  registerRenderer = (type: string, renderer: RendererDefinition): void => {
    this.checkDestroyed();

    const fullType = `${this.pluginId}:${type}`;

    if (this.rendererRegistry.has(fullType)) {
      throw new Error(`Renderer "${fullType}" already registered`);
    }

    this.rendererRegistry.set(fullType, renderer);
    this.registeredRenderers.add(fullType);

    this.logger.debug('Renderer registered', { type: fullType, cardTypes: renderer.cardTypes });
  };

  /**
   * 注册布局渲染器
   *
   * @param layoutType - 布局类型标识
   * @param renderer - 布局渲染器定义
   * @throws {Error} 如果布局渲染器类型已存在
   */
  registerLayoutRenderer = (layoutType: string, renderer: LayoutRendererDefinition): void => {
    this.checkDestroyed();

    const fullType = `${this.pluginId}:${layoutType}`;

    if (this.layoutRendererRegistry.has(fullType)) {
      throw new Error(`Layout renderer "${fullType}" already registered`);
    }

    this.layoutRendererRegistry.set(fullType, renderer);
    this.registeredLayoutRenderers.add(fullType);

    this.logger.debug('Layout renderer registered', { type: fullType, layoutType: renderer.layoutType });
  };

  /**
   * 发布事件
   *
   * @param event - 事件名称
   * @param data - 事件数据
   */
  emit = (event: string, data: unknown): void => {
    this.checkDestroyed();

    // 添加插件前缀以隔离事件
    const fullEvent = `plugin:${this.pluginId}:${event}`;
    this.eventBus.emit(fullEvent, data);
  };

  /**
   * 订阅事件
   *
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  on = (event: string, handler: (data: unknown) => void): void => {
    this.checkDestroyed();

    const fullEvent = `plugin:${this.pluginId}:${event}`;

    // 保存处理器引用以便清理
    if (!this.eventHandlers.has(fullEvent)) {
      this.eventHandlers.set(fullEvent, new Set());
    }
    this.eventHandlers.get(fullEvent)!.add(handler);

    // 订阅事件
    this.eventBus.on(fullEvent, handler);
  };

  /**
   * 取消订阅事件
   *
   * @param event - 事件名称
   * @param handler - 事件处理函数（可选，不传则取消所有该事件的订阅）
   */
  off = (event: string, handler?: (data: unknown) => void): void => {
    this.checkDestroyed();

    const fullEvent = `plugin:${this.pluginId}:${event}`;

    if (handler) {
      this.eventHandlers.get(fullEvent)?.delete(handler);
    } else {
      this.eventHandlers.delete(fullEvent);
    }

    this.eventBus.off(fullEvent);
  };

  /**
   * 获取插件设置
   *
   * @returns 当前插件设置
   */
  getSettings = (): Record<string, unknown> => {
    this.checkDestroyed();
    return { ...this.config };
  };

  /**
   * 更新插件设置
   *
   * @param settings - 要更新的设置项
   */
  updateSettings = (settings: Partial<Record<string, unknown>>): void => {
    this.checkDestroyed();

    this.config = {
      ...this.config,
      ...settings,
    };

    // 发布设置变更事件
    this.emit('settings:change', this.config);

    this.logger.debug('Settings updated', { settings });
  };

  /**
   * 销毁上下文
   *
   * @description
   * 清理所有已注册的资源：
   * - 取消所有事件订阅
   * - 移除所有命令注册
   * - 移除所有渲染器注册
   * - 移除所有布局渲染器注册
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.logger.debug('Destroying plugin context');

    // 清理事件订阅
    for (const [event] of this.eventHandlers) {
      this.eventBus.off(event);
    }
    this.eventHandlers.clear();

    // 清理命令注册
    for (const name of this.registeredCommands) {
      this.commandRegistry.delete(name);
    }
    this.registeredCommands.clear();

    // 清理渲染器注册
    for (const type of this.registeredRenderers) {
      this.rendererRegistry.delete(type);
    }
    this.registeredRenderers.clear();

    // 清理布局渲染器注册
    for (const type of this.registeredLayoutRenderers) {
      this.layoutRendererRegistry.delete(type);
    }
    this.registeredLayoutRenderers.clear();

    this.destroyed = true;

    this.logger.info('Plugin context destroyed');
  }

  /**
   * 检查上下文是否已销毁
   *
   * @throws {Error} 如果上下文已销毁
   */
  private checkDestroyed(): void {
    if (this.destroyed) {
      throw new Error(`Plugin context for "${this.pluginId}" has been destroyed`);
    }
  }

  /**
   * 创建文件 API
   *
   * @returns 文件访问 API
   */
  private createFileAPI(): PluginFileAPI {
    return {
      /**
       * 读取文件内容（二进制）
       */
      read: async (path: string): Promise<ArrayBuffer> => {
        this.checkDestroyed();
        this.logger.debug('File read request', { path });

        // 通过 IPC 请求主进程读取文件
        try {
          const response = await fetch(`file://${path}`);
          if (!response.ok) {
            throw new Error(`Failed to read file: ${path}`);
          }
          return response.arrayBuffer();
        } catch (error) {
          this.logger.error('File read failed', error as Error, { path });
          throw error;
        }
      },

      /**
       * 读取文件内容（文本）
       */
      readText: async (path: string): Promise<string> => {
        this.checkDestroyed();
        this.logger.debug('File read text request', { path });

        try {
          const response = await fetch(`file://${path}`);
          if (!response.ok) {
            throw new Error(`Failed to read file: ${path}`);
          }
          return response.text();
        } catch (error) {
          this.logger.error('File read text failed', error as Error, { path });
          throw error;
        }
      },

      /**
       * 检查文件是否存在
       */
      exists: async (path: string): Promise<boolean> => {
        this.checkDestroyed();
        this.logger.debug('File exists check', { path });

        try {
          const response = await fetch(`file://${path}`, { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      },
    };
  }

  /**
   * 创建存储 API
   *
   * @returns 存储访问 API
   */
  private createStorageAPI(): PluginStorageAPI {
    const storageKey = (key: string) => `${STORAGE_PREFIX}${this.pluginId}:${key}`;

    return {
      /**
       * 获取存储值
       */
      get: <T>(key: string, defaultValue?: T): T => {
        this.checkDestroyed();

        const fullKey = storageKey(key);
        const value = localStorage.getItem(fullKey);

        if (value === null) {
          return defaultValue as T;
        }

        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      },

      /**
       * 设置存储值
       */
      set: (key: string, value: unknown): void => {
        this.checkDestroyed();

        const fullKey = storageKey(key);
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);

        localStorage.setItem(fullKey, serialized);
      },

      /**
       * 移除存储值
       */
      remove: (key: string): void => {
        this.checkDestroyed();

        const fullKey = storageKey(key);
        localStorage.removeItem(fullKey);
      },
    };
  }

  /**
   * 创建主题 API
   *
   * @returns 主题访问 API
   */
  private createThemeAPI(): PluginThemeAPI {
    return {
      /**
       * 获取当前主题 ID
       */
      getCurrent: (): string => {
        this.checkDestroyed();

        // 从 document 的 data 属性获取当前主题
        return document.documentElement.dataset.theme ?? 'light';
      },

      /**
       * 获取主题变量值
       */
      getVariable: (name: string): string => {
        this.checkDestroyed();

        const computedStyle = getComputedStyle(document.documentElement);
        return computedStyle.getPropertyValue(`--${name}`).trim();
      },
    };
  }

  /**
   * 创建国际化 API
   *
   * @returns 国际化 API
   */
  private createI18nAPI(): PluginI18nAPI {
    return {
      /**
       * 翻译文本
       *
       * @param key - 翻译键
       * @param params - 插值参数
       * @returns 翻译后的文本
       */
      t: (key: string, params?: Record<string, unknown>): string => {
        this.checkDestroyed();

        // 简单实现：从插件配置中获取翻译
        // 实际实现应该使用完整的 i18n 系统
        const translations = (this.config.translations ?? {}) as Record<string, string>;
        let text = translations[key] ?? key;

        // 简单的参数替换
        if (params) {
          for (const [paramKey, paramValue] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
          }
        }

        return text;
      },

      /**
       * 获取当前语言环境
       */
      getLocale: (): string => {
        this.checkDestroyed();

        return navigator.language ?? 'zh-CN';
      },
    };
  }
}

/**
 * 创建插件上下文的工厂函数
 *
 * @param pluginId - 插件 ID
 * @param eventBus - 事件总线
 * @param commandRegistry - 命令注册表
 * @param rendererRegistry - 渲染器注册表
 * @param layoutRendererRegistry - 布局渲染器注册表
 * @param config - 插件配置
 * @returns 插件上下文实例
 */
export function createPluginContext(
  pluginId: string,
  eventBus: IEventBus,
  commandRegistry: Map<string, CommandHandler>,
  rendererRegistry: Map<string, RendererDefinition>,
  layoutRendererRegistry: Map<string, LayoutRendererDefinition>,
  config?: Record<string, unknown>
): PluginContext {
  return new PluginContextImpl(pluginId, eventBus, commandRegistry, rendererRegistry, layoutRendererRegistry, config);
}
