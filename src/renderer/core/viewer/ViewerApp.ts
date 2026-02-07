/**
 * ViewerApp - 查看器应用主类
 * @module @renderer/core/viewer/ViewerApp
 */
import type {
  IViewerApp,
  IBoxManager,
  INavigationController,
  IConfigManager,
  IEventBus,
  ILogger,
  IPluginManager,
} from '@common/interfaces';
import type {
  ViewerState,
  CurrentContent,
  NavigationTarget,
  CardRenderOptions,
  BoxRenderOptions,
} from '@common/types';
import type { ViewerAppOptions, InitializeResult, OpenContentOptions } from './types';
import { CardManager } from './CardManager';
import { BoxManager } from './BoxManager';
import { NavigationController } from './NavigationController';
import { ConfigManager } from './ConfigManager';
import { PluginManager } from '../plugin/PluginManager';
import { EventBus, Logger, loadWorkspaceBaseCardPlugins, sdkService, translate } from '@renderer/services';
import { EVENTS, DEFAULT_CONFIG, CACHE_KEYS } from '@common/constants';
import { useViewerStore } from '@renderer/store/viewer';
import type { BaseCardRenderPlugin } from './BaseCardPluginRegistry';

/**
 * ViewerApp - 薯片查看器应用主类
 *
 * 职责：
 * 1. 管理应用生命周期
 * 2. 协调各个子模块
 * 3. 提供统一的 API 入口
 */
export class ViewerApp implements IViewerApp {
  // 状态
  private _state: ViewerState = 'idle';
  private _currentContent: CurrentContent = {
    type: 'none',
    data: null,
    path: null,
    renderResult: null,
  };

  // 子模块
  private cardManager: CardManager;
  private boxManager: IBoxManager;
  private navigationController: INavigationController;
  private configManager: IConfigManager;
  private pluginManager: IPluginManager;

  // 事件系统
  private eventBus: IEventBus;
  private logger: ILogger;

  // 配置
  private options: ViewerAppOptions;

  // 渲染容器
  private container: HTMLElement | null = null;

  // Pinia store
  private store = useViewerStore();

  constructor(options: ViewerAppOptions = {}) {
    this.options = { ...DEFAULT_CONFIG, ...options };

    // 初始化事件总线和日志
    this.eventBus = new EventBus();
    this.logger = new Logger('ViewerApp');

    // 初始化插件管理器
    this.pluginManager = new PluginManager(this.eventBus as EventBus);

    // 初始化配置管理器
    this.configManager = new ConfigManager({
      defaults: this.options,
      autoSave: true,
    });

    // 初始化导航控制器
    this.navigationController = new NavigationController({
      maxHistory: this.options.navigation?.maxHistory ?? 100,
      persist: true,
    });

    // 初始化卡片和箱子管理器
    this.cardManager = new CardManager(sdkService, this.eventBus as EventBus);
    this.boxManager = new BoxManager(sdkService, this.pluginManager, this.eventBus as EventBus);

    this.logger.info('ViewerApp instance created');
  }

  // ==================== 状态访问器 ====================

  get state(): ViewerState {
    return this._state;
  }

  get isReady(): boolean {
    return this._state === 'ready';
  }

  get currentContent(): CurrentContent {
    return this._currentContent;
  }

  // ==================== 生命周期方法 ====================

  /**
   * 初始化应用
   */
  async initialize(): Promise<void> {
    if (this._state !== 'idle') {
      this.logger.warn('ViewerApp is not in idle state, skipping initialization');
      return;
    }

    const startTime = performance.now();
    this.setState('initializing');
    this.logger.info('Initializing ViewerApp...');

    try {
      // 1. 初始化 SDK
      await sdkService.initialize({
        autoConnect: true,
        debug: this.options.debug,
      });

      // 2. 加载配置
      await this.configManager.load();

      // 3. 设置事件监听
      this.setupEventListeners();

      // 4. 加载基础卡片渲染插件
      await this.loadBaseCardPlugins();

      // 5. 标记就绪
      this.setState('ready');
      this.syncNavigationStore();
      this.exposeRuntimeApi();

      const duration = performance.now() - startTime;
      this.logger.info('ViewerApp initialized successfully', { duration: `${duration.toFixed(2)}ms` });

      const result: InitializeResult = {
        success: true,
        duration,
      };

      this.emit(EVENTS.STATE_CHANGE, { state: 'ready', result });
    } catch (error) {
      this.setState('error');
      this.logger.error('Failed to initialize ViewerApp', error as Error);
      throw error;
    }
  }

  /**
   * 销毁应用
   */
  async destroy(): Promise<void> {
    if (this._state === 'destroyed') {
      return;
    }

    this.logger.info('Destroying ViewerApp...');
    this.setState('destroyed');

    try {
      // 1. 关闭当前内容
      this.closeContent();

      // 2. 保存配置
      await this.configManager.save();

      // 3. 清理事件监听
      this.eventBus.clear();

      // 4. 销毁 SDK
      sdkService.destroy();
      this.clearRuntimeApi();

      this.logger.info('ViewerApp destroyed successfully');
    } catch (error) {
      this.logger.error('Error during ViewerApp destruction', error as Error);
    }
  }

  // ==================== 内容操作 ====================

  /**
   * 打开卡片
   */
  async openCard(path: string, options?: Partial<CardRenderOptions & OpenContentOptions>): Promise<void> {
    this.ensureReady();
    this.logger.info('Opening card', { path });

    try {
      this.setState('loading');
      this.store.setLoading(true, translate('content.loading.card'));

      // 获取渲染容器
      const container = options?.container ?? this.container;
      if (!container) {
        throw new Error(translate('content.error.noContainer'));
      }

      // 调用卡片管理器打开卡片
      const result = await this.cardManager.openCard(path, container, options);

      if (result.success) {
        // 更新当前内容
        this._currentContent = {
          type: 'card',
          data: this.cardManager.getCurrentCard(),
          path,
          renderResult: result,
        };

        // 更新最近文件
        this.addRecentFile({
          type: 'card',
          path,
          name: this._currentContent.data?.metadata?.name,
        });

        // 添加到导航历史
        if (options?.addToHistory !== false) {
          await this.navigationController.navigate({
            type: 'card',
            path,
            options,
          });
          this.syncNavigationStore();
        }

        // 更新 store
        this.store.setCurrentContent(this._currentContent);
        this.emit(EVENTS.CONTENT_OPEN, { type: 'card', path, result });
      } else {
        throw new Error(result.error ?? translate('content.error.openCardFailed'));
      }

      this.setState('ready');
    } catch (error) {
      this.setState('error');
      this.store.setError((error as Error).message);
      this.emit(EVENTS.CONTENT_ERROR, { type: 'card', path, error });
      throw error;
    } finally {
      this.store.setLoading(false);
    }
  }

  /**
   * 打开箱子
   */
  async openBox(path: string, options?: Partial<BoxRenderOptions & OpenContentOptions>): Promise<void> {
    this.ensureReady();
    this.logger.info('Opening box', { path });

    try {
      this.setState('loading');
      this.store.setLoading(true, translate('content.loading.box'));

      // 获取渲染容器
      const container = options?.container ?? this.container;
      if (!container) {
        throw new Error(translate('content.error.noContainer'));
      }

      // 调用箱子管理器打开箱子
      const result = await this.boxManager.openBox(path, container, options);

      if (result.success) {
        // 更新当前内容
        this._currentContent = {
          type: 'box',
          data: this.boxManager.getCurrentBox(),
          path,
          renderResult: result,
        };

        // 更新最近文件
        this.addRecentFile({
          type: 'box',
          path,
          name: this._currentContent.data?.metadata?.name,
        });

        // 添加到导航历史
        if (options?.addToHistory !== false) {
          await this.navigationController.navigate({
            type: 'box',
            path,
            options,
          });
          this.syncNavigationStore();
        }

        // 更新 store
        this.store.setCurrentContent(this._currentContent);
        this.emit(EVENTS.CONTENT_OPEN, { type: 'box', path, result });
      } else {
        throw new Error(result.error ?? translate('content.error.openBoxFailed'));
      }

      this.setState('ready');
    } catch (error) {
      this.setState('error');
      this.store.setError((error as Error).message);
      this.emit(EVENTS.CONTENT_ERROR, { type: 'box', path, error });
      throw error;
    } finally {
      this.store.setLoading(false);
    }
  }

  /**
   * 关闭当前内容
   */
  closeContent(): void {
    if (this._currentContent.type === 'none') {
      return;
    }

    this.logger.info('Closing content', { type: this._currentContent.type });

    if (this._currentContent.type === 'card') {
      this.cardManager.closeCard();
    } else if (this._currentContent.type === 'box') {
      this.boxManager.closeBox();
    }

    this._currentContent = {
      type: 'none',
      data: null,
      path: null,
      renderResult: null,
    };

    this.store.clearContent();
    this.emit(EVENTS.CONTENT_CLOSE, { type: this._currentContent.type });
  }

  // ==================== 导航方法 ====================

  /**
   * 导航到目标
   */
  async navigate(target: NavigationTarget): Promise<void> {
    this.ensureReady();
    this.logger.info('Navigating', { target });

    switch (target.type) {
      case 'card':
        await this.openCard(target.path, target.options as Partial<CardRenderOptions>);
        break;
      case 'box':
        await this.openBox(target.path, target.options as Partial<BoxRenderOptions>);
        break;
      default:
        this.logger.warn('Unknown navigation target type', { type: target.type });
    }
  }

  /**
   * 后退
   */
  goBack(): void {
    if (!this.canGoBack()) {
      this.logger.warn('Cannot go back');
      return;
    }

    this.navigationController.goBack();
    this.syncNavigationStore();
    const entry = this.navigationController.getCurrentEntry();
    if (entry) {
      this.navigate(entry.target).catch(error => {
        this.logger.error('Failed to navigate back', error as Error);
      });
    }

    this.emit(EVENTS.NAVIGATION_BACK, {});
  }

  /**
   * 前进
   */
  goForward(): void {
    if (!this.canGoForward()) {
      this.logger.warn('Cannot go forward');
      return;
    }

    this.navigationController.goForward();
    this.syncNavigationStore();
    const entry = this.navigationController.getCurrentEntry();
    if (entry) {
      this.navigate(entry.target).catch(error => {
        this.logger.error('Failed to navigate forward', error as Error);
      });
    }

    this.emit(EVENTS.NAVIGATION_FORWARD, {});
  }

  /**
   * 是否可以后退
   */
  canGoBack(): boolean {
    return this.navigationController.canGoBack();
  }

  /**
   * 是否可以前进
   */
  canGoForward(): boolean {
    return this.navigationController.canGoForward();
  }

  // ==================== 事件方法 ====================

  /**
   * 订阅事件
   */
  on<T>(event: string, handler: (data: T) => void): string {
    return this.eventBus.on(event, handler);
  }

  /**
   * 取消订阅
   */
  off(event: string, handlerId?: string): void {
    this.eventBus.off(event, handlerId);
  }

  /**
   * 发布事件
   */
  emit(event: string, data?: unknown): void {
    this.eventBus.emit(event, data);
  }

  // ==================== 快捷方法 ====================

  /**
   * 设置渲染容器
   */
  setContainer(container: HTMLElement): void {
    this.container = container;
  }

  /**
   * 设置主题
   */
  setTheme(themeId: string): void {
    this.store.setTheme(themeId);
    this.emit(EVENTS.THEME_CHANGE, { themeId });
  }

  /**
   * 获取配置
   */
  getConfig<T>(key: string, defaultValue?: T): T {
    return this.configManager.get(key, defaultValue);
  }

  /**
   * 设置配置
   */
  setConfig(key: string, value: unknown): void {
    this.configManager.set(key, value);
  }

  /**
   * 设置缩放
   */
  setZoom(zoom: number): void {
    this.store.setZoom(zoom);
    this.cardManager.setZoom(zoom);
    this.emit(EVENTS.ZOOM_CHANGE, { zoom });
  }

  /**
   * 获取缩放
   */
  getZoom(): number {
    return this.cardManager.getZoom();
  }

  registerBaseCardPlugin(plugin: BaseCardRenderPlugin): void {
    this.cardManager.registerBaseCardPlugin(plugin);
  }

  unregisterBaseCardPlugin(pluginId: string): void {
    this.cardManager.unregisterBaseCardPlugin(pluginId);
  }

  listBaseCardPlugins(): BaseCardRenderPlugin[] {
    return this.cardManager.listBaseCardPlugins();
  }

  // ==================== 私有方法 ====================

  /**
   * 设置状态
   */
  private setState(state: ViewerState): void {
    const oldState = this._state;
    this._state = state;
    this.store.setState(state);
    this.logger.debug('State changed', { from: oldState, to: state });
  }

  /**
   * 确保应用已就绪
   */
  private ensureReady(): void {
    if (this._state !== 'ready' && this._state !== 'loading') {
      throw new Error(`${translate('app.notReady')} (${this._state})`);
    }
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 监听 SDK 状态变化
    this.eventBus.on(EVENTS.STATE_CHANGE, (data: { sdkReady?: boolean }) => {
      if (data.sdkReady) {
        this.logger.debug('SDK is ready');
      }
    });

    // 监听内容错误
    this.eventBus.on(EVENTS.CONTENT_ERROR, (data: { type: string; error: string }) => {
      this.logger.error('Content error', undefined, data);
    });
  }

  /**
   * 同步导航状态到 Store
   */
  private syncNavigationStore(): void {
    this.store.$patch({
      navigationHistory: this.navigationController.getHistory(),
      currentHistoryIndex: this.navigationController.getCurrentIndex(),
    });
  }

  /**
   * 记录最近文件
   */
  private addRecentFile(file: { type: 'card' | 'box'; path: string; name?: string | null }): void {
    try {
      const stored = localStorage.getItem(CACHE_KEYS.RECENT_FILES);
      const recentFiles = stored ? (JSON.parse(stored) as Array<Record<string, unknown>>) : [];

      const filtered = recentFiles.filter(item => item.path !== file.path);
      const entry = {
        path: file.path,
        name: file.name ?? '',
        type: file.type,
        timestamp: new Date().toISOString(),
      };

      const next = [entry, ...filtered].slice(0, 20);
      localStorage.setItem(CACHE_KEYS.RECENT_FILES, JSON.stringify(next));
    } catch (error) {
      this.logger.error('Failed to update recent files', error as Error, { path: file.path });
    }
  }

  private async loadBaseCardPlugins(): Promise<void> {
    const plugins = await loadWorkspaceBaseCardPlugins();
    for (const plugin of plugins) {
      this.cardManager.registerBaseCardPlugin(plugin);
    }
    this.logger.info('Base card plugins loaded', { count: plugins.length });
  }

  private exposeRuntimeApi(): void {
    if (typeof window === 'undefined') {
      return;
    }
    (window as unknown as { chipsViewerRuntime?: unknown }).chipsViewerRuntime = {
      openCard: (path: string): Promise<void> => this.openCard(path),
      openBox: (path: string): Promise<void> => this.openBox(path),
      registerBaseCardPlugin: (plugin: BaseCardRenderPlugin): void => this.registerBaseCardPlugin(plugin),
      unregisterBaseCardPlugin: (pluginId: string): void => this.unregisterBaseCardPlugin(pluginId),
      listBaseCardPlugins: (): BaseCardRenderPlugin[] => this.listBaseCardPlugins(),
    };
  }

  private clearRuntimeApi(): void {
    if (typeof window === 'undefined') {
      return;
    }
    delete (window as unknown as { chipsViewerRuntime?: unknown }).chipsViewerRuntime;
  }
}

// 单例工厂
let viewerAppInstance: ViewerApp | null = null;

/**
 * 获取或创建 ViewerApp 实例
 */
export function getViewerApp(options?: ViewerAppOptions): ViewerApp {
  if (!viewerAppInstance) {
    viewerAppInstance = new ViewerApp(options);
  }
  return viewerAppInstance;
}

/**
 * 销毁 ViewerApp 实例
 */
export async function destroyViewerApp(): Promise<void> {
  if (viewerAppInstance) {
    await viewerAppInstance.destroy();
    viewerAppInstance = null;
  }
}
