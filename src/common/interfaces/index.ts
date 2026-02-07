/**
 * 核心接口定义
 * @module @common/interfaces
 */
import type { Card, CardMetadata, CardRenderOptions, CardRenderResult } from '../types/card';
import type { Box, BoxMetadata, BoxRenderOptions, BoxRenderResult } from '../types/box';
import type {
  PluginInstance,
  PluginMetadata,
  PluginRegistration,
  PluginQueryOptions,
  PluginContext,
} from '../types/plugin';
import type {
  ViewerConfig,
  NavigationTarget,
  NavigationHistoryEntry,
  CurrentContent,
  ViewerState,
} from '../types/viewer';
import type { LogLevel } from '../types/base';

/**
 * Viewer 应用接口
 */
export interface IViewerApp {
  // 状态
  readonly state: ViewerState;
  readonly isReady: boolean;
  readonly currentContent: CurrentContent;

  // 生命周期
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // 内容操作
  openCard(path: string, options?: Partial<CardRenderOptions>): Promise<void>;
  openBox(path: string, options?: Partial<BoxRenderOptions>): Promise<void>;
  closeContent(): void;

  // 导航
  navigate(target: NavigationTarget): Promise<void>;
  goBack(): void;
  goForward(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;

  // 事件
  on<T>(event: string, handler: (data: T) => void): string;
  off(event: string, handlerId?: string): void;
  emit(event: string, data?: unknown): void;
}

/**
 * 卡片管理器接口
 */
export interface ICardManager {
  openCard(
    path: string,
    container: HTMLElement,
    options?: Partial<CardRenderOptions>
  ): Promise<CardRenderResult>;
  closeCard(): void;
  getCurrentCard(): Card | null;
  getCardMetadata(path: string): Promise<CardMetadata>;
  validateCard(path: string): Promise<boolean>;
  refreshCard(): Promise<void>;
  setZoom(zoom: number): void;
  getZoom(): number;
}

/**
 * 箱子管理器接口
 */
export interface IBoxManager {
  openBox(
    path: string,
    container: HTMLElement,
    options?: Partial<BoxRenderOptions>
  ): Promise<BoxRenderResult>;
  closeBox(): void;
  getCurrentBox(): Box | null;
  getBoxMetadata(path: string): Promise<BoxMetadata>;
  validateBox(path: string): Promise<boolean>;
  switchLayout(layoutId: string): Promise<void>;
  getAvailableLayouts(): Array<{ id: string; name: string }>;
}

/**
 * 导航控制器接口
 */
export interface INavigationController {
  navigate(target: NavigationTarget): Promise<void>;
  goBack(): void;
  goForward(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
  getHistory(): NavigationHistoryEntry[];
  clearHistory(): void;
  getCurrentEntry(): NavigationHistoryEntry | null;
  getHistoryLength(): number;
  getCurrentIndex(): number;
  goTo(index: number): void;
  saveScrollPosition(position: { x: number; y: number }): void;
  restoreScrollPosition(): { x: number; y: number } | null;
}

/**
 * 插件管理器接口
 */
export interface IPluginManager {
  // 注册
  register(registration: PluginRegistration): void;
  unregister(id: string): Promise<void>;

  // 启用/禁用
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;

  // 查询
  get(id: string): PluginInstance | undefined;
  getMetadata(id: string): PluginMetadata | undefined;
  list(options?: PluginQueryOptions): PluginInstance[];
  isEnabled(id: string): boolean;

  // 调度
  getPluginForFile(path: string): PluginInstance | undefined;
  getPluginsForType(mimeType: string): PluginInstance[];

  // 上下文
  createContext(pluginId: string): PluginContext;
}

/**
 * 主题管理器接口
 */
export interface IThemeManager {
  getCurrentTheme(): string;
  setTheme(themeId: string): void;
  listThemes(): Array<{ id: string; name: string; type: 'light' | 'dark' }>;
  applyTheme(themeId: string, element?: HTMLElement): void;
  getSystemTheme(): 'light' | 'dark';
  watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void;
}

/**
 * 配置管理器接口
 */
export interface IConfigManager {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): void;
  setUserConfig(key: string, value: unknown): void;
  getAll(): ViewerConfig;
  reset(): void;
  save(): Promise<void>;
  load(): Promise<void>;
  onChange(key: string, handler: (newValue: unknown, oldValue: unknown) => void): void;
  offChange(key: string, handler?: (newValue: unknown, oldValue: unknown) => void): void;
}

/**
 * 事件总线接口
 */
export interface IEventBus {
  on<T>(event: string, handler: (data: T) => void): string;
  once<T>(event: string, handler: (data: T) => void): string;
  off(event: string, handlerId?: string): void;
  emit(event: string, data?: unknown): void;
  clear(): void;
  waitFor<T>(event: string, timeout?: number): Promise<T>;
  listenerCount(event: string): number;
  hasListeners(event: string): boolean;
}

/**
 * 日志服务接口
 */
export interface ILogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  createChild(module: string): ILogger;
}

/**
 * SDK 服务接口
 */
export interface ISDKService {
  initialize(options?: SDKServiceOptions): Promise<void>;
  destroy(): void;
  isReady(): boolean;
  loadCard(path: string): Promise<Card>;
  loadBox(path: string): Promise<Box>;
  validateCard(path: string): Promise<boolean>;
  validateBox(path: string): Promise<boolean>;
  request<T>(service: string, payload: unknown): Promise<T>;
}

/**
 * SDK 服务选项
 */
export interface SDKServiceOptions {
  autoConnect?: boolean;
  debug?: boolean;
}

/**
 * 渲染桥接器接口
 */
export interface IRenderingBridge {
  renderCard(card: Card, container: HTMLElement, options: CardRenderOptions): Promise<CardRenderResult>;
  renderBox(box: Box, container: HTMLElement, options: BoxRenderOptions): Promise<BoxRenderResult>;
  disposeFrame(frame: HTMLIFrameElement): void;
  setupMessageChannel(frame: HTMLIFrameElement, handlers: MessageHandlers): void;
}

/**
 * 消息处理器类型
 */
export interface MessageHandlers {
  onReady?: () => void;
  onResize?: (size: { width: number; height: number }) => void;
  onNavigate?: (target: NavigationTarget) => void;
  onError?: (error: Error) => void;
  [key: string]: ((...args: unknown[]) => void) | undefined;
}

/**
 * IFrame 管理器接口
 */
export interface IIFrameManager {
  create(options: IFrameCreateOptions): HTMLIFrameElement;
  destroy(frame: HTMLIFrameElement): void;
  postMessage(frame: HTMLIFrameElement, message: unknown): void;
  setSize(frame: HTMLIFrameElement, width: number, height: number): void;
  getFrames(): HTMLIFrameElement[];
}

/**
 * IFrame 创建选项
 */
export interface IFrameCreateOptions {
  id?: string;
  src?: string;
  sandbox?: string;
  allow?: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
}

/**
 * 快捷键管理器接口
 */
export interface IShortcutManager {
  register(shortcut: ShortcutDefinition): void;
  unregister(actionId: string): void;
  trigger(actionId: string): void;
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  getShortcuts(): ShortcutDefinition[];
}

/**
 * 快捷键定义
 */
export interface ShortcutDefinition {
  id: string;
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  description?: string;
  scope?: 'global' | 'viewer' | 'sidebar';
}
