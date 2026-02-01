/**
 * 常量定义
 * @module @common/constants
 */
import type { ViewerConfig, ShortcutBinding } from '../types';

// 版本信息
export const VERSION = '1.0.0';
export const PROTOCOL_VERSION = '1.0.0';
export const MIN_SDK_VERSION = '1.0.0';

// 默认配置
export const DEFAULT_CONFIG: ViewerConfig = {
  platform: 'electron',
  language: 'zh-CN',
  theme: 'system',
  plugins: {
    autoLoad: true,
    enableBuiltin: true,
  },
  rendering: {
    defaultMode: 'full',
    lazyLoad: true,
    cacheSize: 50,
    preloadCount: 3,
  },
  navigation: {
    enableHistory: true,
    maxHistory: 100,
    enableShortcuts: true,
  },
} as const;

// 事件名称
export const EVENTS = {
  CONTENT_OPEN: 'content:open',
  CONTENT_CLOSE: 'content:close',
  CONTENT_RENDER: 'content:render',
  CONTENT_ERROR: 'content:error',
  NAVIGATION_CHANGE: 'navigation:change',
  NAVIGATION_BACK: 'navigation:back',
  NAVIGATION_FORWARD: 'navigation:forward',
  PLUGIN_LOAD: 'plugin:load',
  PLUGIN_UNLOAD: 'plugin:unload',
  PLUGIN_ERROR: 'plugin:error',
  THEME_CHANGE: 'theme:change',
  ZOOM_CHANGE: 'zoom:change',
  STATE_CHANGE: 'state:change',
} as const;

// IPC 通道名称
export const IPC_CHANNELS = {
  // 窗口操作
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_FULLSCREEN: 'window:fullscreen',

  // 文件操作
  FILE_OPEN: 'file:open',
  FILE_OPEN_DIALOG: 'file:open-dialog',
  FILE_RECENT: 'file:recent',

  // 菜单操作
  MENU_ACTION: 'menu:action',

  // 系统
  APP_READY: 'app:ready',
  APP_QUIT: 'app:quit',
} as const;

// 快捷键
export const DEFAULT_SHORTCUTS: Record<string, Omit<ShortcutBinding, 'action'>> = {
  'open-file': { key: 'o', modifiers: ['ctrl'] },
  'close-file': { key: 'w', modifiers: ['ctrl'] },
  'zoom-in': { key: '=', modifiers: ['ctrl'] },
  'zoom-out': { key: '-', modifiers: ['ctrl'] },
  'zoom-reset': { key: '0', modifiers: ['ctrl'] },
  fullscreen: { key: 'F11' },
  'navigate-back': { key: 'ArrowLeft', modifiers: ['alt'] },
  'navigate-forward': { key: 'ArrowRight', modifiers: ['alt'] },
  'toggle-sidebar': { key: 'b', modifiers: ['ctrl'] },
  'toggle-theme': { key: 't', modifiers: ['ctrl', 'shift'] },
} as const;

// 文件扩展名
export const FILE_EXTENSIONS = {
  CARD: '.card',
  BOX: '.box',
} as const;

// MIME 类型
export const MIME_TYPES = {
  CARD: 'application/x-card',
  BOX: 'application/x-box',
} as const;

// 缓存键
export const CACHE_KEYS = {
  RECENT_FILES: 'viewer:recent-files',
  USER_CONFIG: 'viewer:user-config',
  PLUGIN_STATE: 'viewer:plugin-state',
  NAVIGATION_HISTORY: 'viewer:navigation-history',
} as const;

// 性能阈值
export const PERFORMANCE_THRESHOLDS = {
  STARTUP_TIME: 2000, // 启动时间 < 2秒
  OPEN_TIME: 500, // 打开时间 < 500ms
  RENDER_TIME: 200, // 渲染时间 < 200ms
  MEMORY_LIMIT: 200, // 内存限制 200MB
} as const;

// 支持的语言
export const SUPPORTED_LANGUAGES = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'] as const;

// 默认主题 ID
export const DEFAULT_THEME_IDS = {
  LIGHT: 'chips:light',
  DARK: 'chips:dark',
  SYSTEM: 'system',
} as const;
