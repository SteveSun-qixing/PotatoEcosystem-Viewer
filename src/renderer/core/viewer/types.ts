/**
 * ViewerApp 类型定义
 * @module @renderer/core/viewer/types
 */
import type { Platform, ThemeType, RenderMode } from '@common/types';

/**
 * ViewerApp 配置选项
 */
export interface ViewerAppOptions {
  /** 运行平台 */
  platform?: Platform;

  /** 界面语言 */
  language?: string;

  /** 主题类型 */
  theme?: ThemeType;

  /** 插件配置 */
  plugins?: {
    /** 是否自动加载插件 */
    autoLoad?: boolean;
    /** 是否启用内置插件 */
    enableBuiltin?: boolean;
    /** 自定义插件路径 */
    customPaths?: string[];
  };

  /** 渲染配置 */
  rendering?: {
    /** 默认渲染模式 */
    defaultMode?: RenderMode;
    /** 是否懒加载 */
    lazyLoad?: boolean;
    /** 缓存大小 */
    cacheSize?: number;
    /** 预加载数量 */
    preloadCount?: number;
  };

  /** 导航配置 */
  navigation?: {
    /** 是否启用历史记录 */
    enableHistory?: boolean;
    /** 最大历史记录数 */
    maxHistory?: number;
    /** 是否启用快捷键 */
    enableShortcuts?: boolean;
  };

  /** 窗口配置 */
  window?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
  };

  /** 调试模式 */
  debug?: boolean;
}

/**
 * ViewerApp 初始化结果
 */
export interface InitializeResult {
  /** 是否成功 */
  success: boolean;
  /** 耗时(ms) */
  duration: number;
  /** 错误列表 */
  errors?: string[];
  /** 警告列表 */
  warnings?: string[];
}

/**
 * 内容打开选项
 */
export interface OpenContentOptions {
  /** 渲染容器 */
  container?: HTMLElement;
  /** 主题ID */
  themeId?: string;
  /** 渲染模式 */
  mode?: RenderMode;
  /** 是否可交互 */
  interactive?: boolean;
  /** 是否自动高度 */
  autoHeight?: boolean;
  /** 是否添加到历史 */
  addToHistory?: boolean;
}

/**
 * 导航控制器选项
 */
export interface NavigationControllerOptions {
  /** 最大历史记录数 */
  maxHistory?: number;
  /** 是否持久化 */
  persist?: boolean;
  /** 存储键名 */
  storageKey?: string;
}

/**
 * 配置管理器选项
 */
export interface ConfigManagerOptions {
  /** 默认配置 */
  defaults?: Partial<ViewerAppOptions>;
  /** 存储键名 */
  storageKey?: string;
  /** 是否自动保存 */
  autoSave?: boolean;
}

/**
 * 内部状态
 */
export interface InternalState {
  /** 是否正在初始化 */
  initializing: boolean;
  /** 是否正在销毁 */
  destroying: boolean;
  /** 初始化时间戳 */
  initTimestamp: number | null;
  /** 最后操作时间戳 */
  lastActivityTimestamp: number;
}
