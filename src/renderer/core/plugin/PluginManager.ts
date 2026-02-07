/**
 * 插件管理器实现
 * 管理插件的安装、启用、禁用和卸载
 * @module @renderer/core/plugin/PluginManager
 */
import type {
  PluginInstance,
  PluginMetadata,
  PluginRegistration,
  PluginQueryOptions,
  PluginState,
  PluginContext,
  CommandHandler,
  RendererDefinition,
  LayoutRendererDefinition,
} from '@common/types/plugin';
import type { IPluginManager, IEventBus, ILogger } from '@common/interfaces';
import { Logger } from '@renderer/services/Logger';
import { EVENTS, CACHE_KEYS } from '@common/constants';
import { PluginContextImpl } from './PluginContext';

/**
 * 插件注册信息内部存储结构
 */
interface InternalPluginData {
  /** 插件实例信息 */
  instance: PluginInstance;
  /** 插件注册信息（包含激活/停用函数） */
  registration: PluginRegistration;
  /** 插件上下文 */
  context: PluginContextImpl | null;
}

/**
 * 持久化的插件状态
 */
interface PersistedPluginState {
  enabledPlugins: string[];
  pluginConfigs: Record<string, Record<string, unknown>>;
}

/**
 * PluginManager - 插件管理器
 *
 * @description
 * 插件管理器是插件系统的核心组件，负责：
 * 1. 管理插件生命周期（注册、启用、禁用、卸载）
 * 2. 维护插件注册表
 * 3. 提供插件查询接口
 * 4. 管理插件配置
 * 5. 协调命令和渲染器的注册
 *
 * @example
 * ```typescript
 * const pluginManager = new PluginManager(eventBus);
 *
 * // 注册插件
 * pluginManager.register({
 *   id: 'my-plugin',
 *   metadata: { ... },
 *   activate: async (ctx) => { ... },
 *   deactivate: async () => { ... }
 * });
 *
 * // 启用插件
 * await pluginManager.enable('my-plugin');
 *
 * // 查询插件
 * const viewers = pluginManager.list({ type: 'viewer-tool' });
 * ```
 */
export class PluginManager implements IPluginManager {
  /**
   * 插件注册表
   * key: 插件 ID
   * value: 插件内部数据
   */
  private readonly plugins: Map<string, InternalPluginData> = new Map();

  /**
   * 全局命令注册表
   * key: 完整命令名（pluginId:commandName）
   * value: 命令处理函数
   */
  private readonly commands: Map<string, CommandHandler> = new Map();

  /**
   * 全局渲染器注册表
   * key: 完整渲染器类型（pluginId:rendererType）
   * value: 渲染器定义
   */
  private readonly renderers: Map<string, RendererDefinition> = new Map();

  /**
   * 全局布局渲染器注册表
   * key: 完整布局类型（pluginId:layoutType）
   * value: 布局渲染器定义
   */
  private readonly layoutRenderers: Map<string, LayoutRendererDefinition> = new Map();

  /**
   * 日志器
   */
  private readonly logger: ILogger;

  /**
   * 事件总线
   */
  private readonly eventBus: IEventBus;

  /**
   * 创建插件管理器实例
   *
   * @param eventBus - 事件总线实例
   */
  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.logger = new Logger('PluginManager');

    // 加载持久化的插件状态
    this.loadPluginState();

    this.logger.info('PluginManager initialized');
  }

  /**
   * 注册插件
   *
   * @description
   * 将插件注册到管理器中，但不会自动激活。
   * 注册后插件状态为 'installed'。
   *
   * @param registration - 插件注册信息
   * @throws {Error} 如果插件 ID 已存在或验证失败
   */
  register(registration: PluginRegistration): void {
    // 验证插件注册信息
    this.validatePlugin(registration);

    const { id, metadata } = registration;

    // 检查是否已注册
    if (this.plugins.has(id)) {
      this.logger.warn('Plugin already registered', { id });
      return;
    }

    // 创建插件实例
    const instance: PluginInstance = {
      id,
      metadata,
      state: 'installed',
      config: {},
    };

    // 存储插件数据
    const pluginData: InternalPluginData = {
      instance,
      registration,
      context: null,
    };

    this.plugins.set(id, pluginData);

    this.logger.info('Plugin registered', { id, name: metadata.name, version: metadata.version });

    // 发布插件加载事件
    this.eventBus.emit(EVENTS.PLUGIN_LOAD, { pluginId: id, metadata });
  }

  /**
   * 注销插件
   *
   * @description
   * 从管理器中移除插件。如果插件当前是启用状态，
   * 会先禁用再移除。
   *
   * @param id - 插件 ID
   */
  async unregister(id: string): Promise<void> {
    const pluginData = this.plugins.get(id);
    if (!pluginData) {
      this.logger.warn('Attempting to unregister non-existent plugin', { id });
      return;
    }

    const wasEnabled = pluginData.instance.state === 'enabled';

    // 如果插件已启用，先禁用
    if (wasEnabled) {
      await this.disable(id);
    }

    // 从注册表中移除
    this.plugins.delete(id);

    this.logger.info('Plugin unregistered', { id });

    // 发布插件卸载事件
    if (!wasEnabled) {
      this.eventBus.emit(EVENTS.PLUGIN_UNLOAD, { pluginId: id });
    }

    // 持久化状态
    this.persistPluginState();
  }

  /**
   * 启用插件
   *
   * @description
   * 激活已注册的插件。激活过程：
   * 1. 创建插件上下文
   * 2. 调用插件的 activate 函数
   * 3. 更新插件状态为 'enabled'
   *
   * @param id - 插件 ID
   * @throws {Error} 如果插件未注册或激活失败
   */
  async enable(id: string): Promise<void> {
    const pluginData = this.plugins.get(id);
    if (!pluginData) {
      throw new Error(`Plugin "${id}" is not registered`);
    }

    // 检查当前状态
    if (pluginData.instance.state === 'enabled') {
      this.logger.debug('Plugin already enabled', { id });
      return;
    }

    if (pluginData.instance.state === 'loading') {
      this.logger.warn('Plugin is currently loading', { id });
      return;
    }

    await this.activatePlugin(id);

    // 持久化状态
    this.persistPluginState();
  }

  /**
   * 禁用插件
   *
   * @description
   * 停用已启用的插件。停用过程：
   * 1. 调用插件的 deactivate 函数
   * 2. 销毁插件上下文
   * 3. 更新插件状态为 'disabled'
   *
   * @param id - 插件 ID
   */
  async disable(id: string): Promise<void> {
    const pluginData = this.plugins.get(id);
    if (!pluginData) {
      this.logger.warn('Attempting to disable non-existent plugin', { id });
      return;
    }

    if (pluginData.instance.state !== 'enabled') {
      this.logger.debug('Plugin is not enabled', { id, state: pluginData.instance.state });
      return;
    }

    await this.deactivatePlugin(id);

    // 发布插件卸载事件
    this.eventBus.emit(EVENTS.PLUGIN_UNLOAD, { pluginId: id });

    // 持久化状态
    this.persistPluginState();
  }

  /**
   * 获取插件实例
   *
   * @param id - 插件 ID
   * @returns 插件实例，未找到返回 undefined
   */
  get(id: string): PluginInstance | undefined {
    return this.plugins.get(id)?.instance;
  }

  /**
   * 获取插件元数据
   *
   * @param id - 插件 ID
   * @returns 插件元数据，未找到返回 undefined
   */
  getMetadata(id: string): PluginMetadata | undefined {
    return this.plugins.get(id)?.instance.metadata;
  }

  /**
   * 获取插件状态
   *
   * @param id - 插件 ID
   * @returns 插件状态，未找到返回 undefined
   */
  getState(id: string): PluginState | undefined {
    return this.plugins.get(id)?.instance.state;
  }

  /**
   * 检查插件是否启用
   *
   * @param id - 插件 ID
   * @returns 是否启用
   */
  isEnabled(id: string): boolean {
    return this.plugins.get(id)?.instance.state === 'enabled';
  }

  /**
   * 列出所有插件
   *
   * @param options - 查询选项
   * @returns 符合条件的插件实例数组
   */
  list(options?: PluginQueryOptions): PluginInstance[] {
    let result: PluginInstance[] = [];

    for (const pluginData of this.plugins.values()) {
      result.push(pluginData.instance);
    }

    // 应用过滤条件
    if (options) {
      if (options.type) {
        result = result.filter(p => p.metadata.type === options.type);
      }
      if (options.state) {
        result = result.filter(p => p.state === options.state);
      }
      if (options.supportedType) {
        result = result.filter(
          p => p.metadata.supportedTypes?.includes(options.supportedType!) ?? false
        );
      }
    }

    return result;
  }

  /**
   * 更新插件配置
   *
   * @param id - 插件 ID
   * @param config - 要更新的配置项
   */
  updateConfig(id: string, config: Partial<Record<string, unknown>>): void {
    const pluginData = this.plugins.get(id);
    if (!pluginData) {
      this.logger.warn('Attempting to update config for non-existent plugin', { id });
      return;
    }

    // 更新实例配置
    pluginData.instance.config = {
      ...pluginData.instance.config,
      ...config,
    };

    // 如果有上下文，也更新上下文配置
    if (pluginData.context) {
      pluginData.context.config = { ...pluginData.instance.config };
    }

    this.logger.debug('Plugin config updated', { id, config });

    // 持久化状态
    this.persistPluginState();
  }

  /**
   * 执行插件命令
   *
   * @param name - 完整命令名（pluginId:commandName）
   * @param args - 命令参数
   * @returns 命令执行结果
   */
  async executeCommand(name: string, args?: unknown): Promise<unknown> {
    const handler = this.commands.get(name);
    if (!handler) {
      throw new Error(`Command "${name}" not found`);
    }

    this.logger.debug('Executing command', { name, args });

    try {
      const result = await handler(args);
      return result;
    } catch (error) {
      this.logger.error('Command execution failed', error as Error, { name });
      throw error;
    }
  }

  /**
   * 获取支持指定卡片类型的渲染器
   *
   * @param cardType - 卡片类型
   * @returns 渲染器定义，未找到返回 undefined
   */
  getRenderer(cardType: string): RendererDefinition | undefined {
    for (const renderer of this.renderers.values()) {
      if (renderer.cardTypes.includes(cardType)) {
        return renderer;
      }
    }
    return undefined;
  }

  /**
   * 获取支持指定布局类型的布局渲染器
   *
   * @param layoutType - 布局类型
   * @returns 布局渲染器定义，未找到返回 undefined
   */
  getLayoutRenderer(layoutType: string): LayoutRendererDefinition | undefined {
    for (const layoutRenderer of this.layoutRenderers.values()) {
      if (layoutRenderer.layoutType === layoutType) {
        return layoutRenderer;
      }
    }
    return undefined;
  }

  /**
   * 获取所有已注册的布局类型
   *
   * @returns 布局类型数组
   */
  getLayoutTypes(): string[] {
    const types = new Set<string>();
    for (const layoutRenderer of this.layoutRenderers.values()) {
      types.add(layoutRenderer.layoutType);
    }
    return Array.from(types);
  }

  /**
   * 获取文件对应的插件
   *
   * @description
   * 根据文件路径的扩展名查找支持该文件的插件
   *
   * @param path - 文件路径
   * @returns 支持该文件的插件实例，未找到返回 undefined
   */
  getPluginForFile(path: string): PluginInstance | undefined {
    // 提取文件扩展名
    const extension = this.getFileExtension(path);
    if (!extension) {
      return undefined;
    }

    // 查找支持该扩展名的已启用插件
    for (const pluginData of this.plugins.values()) {
      const { instance } = pluginData;
      if (instance.state !== 'enabled') {
        continue;
      }

      const supportedExtensions = instance.metadata.supportedExtensions ?? [];
      if (supportedExtensions.includes(extension)) {
        return instance;
      }
    }

    return undefined;
  }

  /**
   * 获取支持指定 MIME 类型的插件列表
   *
   * @param mimeType - MIME 类型
   * @returns 支持该类型的插件实例数组
   */
  getPluginsForType(mimeType: string): PluginInstance[] {
    const result: PluginInstance[] = [];

    for (const pluginData of this.plugins.values()) {
      const { instance } = pluginData;
      if (instance.state !== 'enabled') {
        continue;
      }

      const supportedTypes = instance.metadata.supportedTypes ?? [];
      if (supportedTypes.includes(mimeType)) {
        result.push(instance);
      }
    }

    return result;
  }

  /**
   * 获取所有已注册的命令
   *
   * @returns 命令名数组
   */
  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * 获取所有已注册的渲染器类型
   *
   * @returns 渲染器类型数组
   */
  getRendererTypes(): string[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * 获取所有已注册的布局渲染器键
   *
   * @returns 布局渲染器键数组
   */
  getLayoutRendererKeys(): string[] {
    return Array.from(this.layoutRenderers.keys());
  }

  /**
   * 创建插件上下文
   *
   * @param pluginId - 插件 ID
   * @returns 插件上下文
   */
  createContext(pluginId: string): PluginContext {
    const pluginData = this.plugins.get(pluginId);
    if (!pluginData) {
      throw new Error(`Plugin "${pluginId}" is not registered`);
    }

    return new PluginContextImpl(
      pluginId,
      this.eventBus,
      this.commands,
      this.renderers,
      this.layoutRenderers,
      pluginData.instance.config
    );
  }

  /**
   * 获取插件数量
   */
  get count(): number {
    return this.plugins.size;
  }

  /**
   * 获取已启用插件数量
   */
  get enabledCount(): number {
    let count = 0;
    for (const pluginData of this.plugins.values()) {
      if (pluginData.instance.state === 'enabled') {
        count++;
      }
    }
    return count;
  }

  /**
   * 验证插件注册信息
   *
   * @param registration - 插件注册信息
   * @throws {Error} 如果验证失败
   */
  private validatePlugin(registration: PluginRegistration): void {
    const { id, metadata, activate } = registration;

    // 验证必需字段
    if (!id || typeof id !== 'string') {
      throw new Error('Plugin ID is required and must be a string');
    }

    if (!metadata) {
      throw new Error('Plugin metadata is required');
    }

    if (!metadata.name || typeof metadata.name !== 'string') {
      throw new Error('Plugin name is required and must be a string');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      throw new Error('Plugin version is required and must be a string');
    }

    if (!metadata.type) {
      throw new Error('Plugin type is required');
    }

    if (typeof activate !== 'function') {
      throw new Error('Plugin activate function is required');
    }

    // 验证插件 ID 格式（允许命名空间）
    const idPattern = /^[a-z][a-z0-9-]*(:?[a-z][a-z0-9-]*)*$/;
    if (!idPattern.test(id)) {
      throw new Error(`Invalid plugin ID format: "${id}"`);
    }

    // 验证版本格式（语义化版本）
    const versionPattern = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
    if (!versionPattern.test(metadata.version)) {
      throw new Error(`Invalid version format: "${metadata.version}"`);
    }
  }

  /**
   * 激活插件
   *
   * @param id - 插件 ID
   */
  private async activatePlugin(id: string): Promise<void> {
    const pluginData = this.plugins.get(id)!;

    this.logger.info('Activating plugin', { id });

    // 更新状态为加载中
    pluginData.instance.state = 'loading';

    try {
      // 创建插件上下文
      const context = new PluginContextImpl(
        id,
        this.eventBus,
        this.commands,
        this.renderers,
        pluginData.instance.config
      );

      pluginData.context = context;

      // 调用插件激活函数
      await pluginData.registration.activate(context);

      // 更新状态为已启用
      pluginData.instance.state = 'enabled';
      pluginData.instance.error = undefined;

      this.logger.info('Plugin activated', { id });
    } catch (error) {
      // 激活失败
      pluginData.instance.state = 'error';
      pluginData.instance.error = (error as Error).message;

      // 清理上下文
      if (pluginData.context) {
        pluginData.context.destroy();
        pluginData.context = null;
      }

      this.logger.error('Plugin activation failed', error as Error, { id });

      // 发布错误事件
      this.eventBus.emit(EVENTS.PLUGIN_ERROR, {
        pluginId: id,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * 停用插件
   *
   * @param id - 插件 ID
   */
  private async deactivatePlugin(id: string): Promise<void> {
    const pluginData = this.plugins.get(id)!;

    this.logger.info('Deactivating plugin', { id });

    try {
      // 调用插件停用函数
      if (pluginData.registration.deactivate) {
        await pluginData.registration.deactivate();
      }

      // 销毁上下文
      if (pluginData.context) {
        pluginData.context.destroy();
        pluginData.context = null;
      }

      // 更新状态
      pluginData.instance.state = 'disabled';
      pluginData.instance.error = undefined;

      this.logger.info('Plugin deactivated', { id });
    } catch (error) {
      this.logger.error('Plugin deactivation failed', error as Error, { id });

      // 即使停用失败，也要清理上下文
      if (pluginData.context) {
        pluginData.context.destroy();
        pluginData.context = null;
      }

      pluginData.instance.state = 'disabled';
      pluginData.instance.error = `Deactivation error: ${(error as Error).message}`;
    }
  }

  /**
   * 持久化插件状态
   */
  private persistPluginState(): void {
    try {
      const state: PersistedPluginState = {
        enabledPlugins: [],
        pluginConfigs: {},
      };

      for (const [id, pluginData] of this.plugins) {
        if (pluginData.instance.state === 'enabled') {
          state.enabledPlugins.push(id);
        }
        if (Object.keys(pluginData.instance.config).length > 0) {
          state.pluginConfigs[id] = pluginData.instance.config;
        }
      }

      const payload = {
        ...state,
        enabled: [...state.enabledPlugins],
      };

      localStorage.setItem(CACHE_KEYS.PLUGIN_STATE, JSON.stringify(payload));

      this.logger.debug('Plugin state persisted', {
        enabledCount: state.enabledPlugins.length,
      });
    } catch (error) {
      this.logger.error('Failed to persist plugin state', error as Error);
    }
  }

  /**
   * 加载持久化的插件状态
   */
  private loadPluginState(): void {
    try {
      const saved = localStorage.getItem(CACHE_KEYS.PLUGIN_STATE);
      if (!saved) {
        return;
      }

      const state = JSON.parse(saved) as PersistedPluginState & {
        enabled?: string[];
        configs?: Record<string, Record<string, unknown>>;
      };

      // 存储加载的配置，供后续插件注册时使用
      this.loadedPluginConfigs = state.pluginConfigs ?? state.configs ?? {};
      this.loadedEnabledPlugins = state.enabledPlugins ?? state.enabled ?? [];

      this.logger.debug('Plugin state loaded', {
        enabledCount: state.enabledPlugins.length,
      });
    } catch (error) {
      this.logger.error('Failed to load plugin state', error as Error);
    }
  }

  /**
   * 加载的插件配置（临时存储）
   */
  private loadedPluginConfigs: Record<string, Record<string, unknown>> = {};

  /**
   * 加载的已启用插件列表（临时存储）
   */
  private loadedEnabledPlugins: string[] = [];

  /**
   * 检查插件是否应该自动启用
   *
   * @param id - 插件 ID
   * @returns 是否应该自动启用
   */
  shouldAutoEnable(id: string): boolean {
    return this.loadedEnabledPlugins.includes(id);
  }

  /**
   * 获取加载的插件配置
   *
   * @param id - 插件 ID
   * @returns 插件配置
   */
  getLoadedConfig(id: string): Record<string, unknown> | undefined {
    return this.loadedPluginConfigs[id];
  }

  /**
   * 获取文件扩展名
   *
   * @param path - 文件路径
   * @returns 扩展名（包含点号）
   */
  private getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1 || lastDot === path.length - 1) {
      return '';
    }
    return path.slice(lastDot).toLowerCase();
  }
}
