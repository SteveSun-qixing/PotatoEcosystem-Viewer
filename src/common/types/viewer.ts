/**
 * Viewer 应用类型定义
 * @module @common/types/viewer
 */
import type { Card, CardRenderResult } from './card';
import type { Box, BoxRenderResult } from './box';
import type { ThemeType, Platform, RenderMode } from './base';

// Viewer 状态
export type ViewerState = 'idle' | 'initializing' | 'ready' | 'loading' | 'error' | 'destroyed';

// Viewer 配置
export interface ViewerConfig {
  // 基础配置
  platform: Platform;
  language: string;
  theme: ThemeType;

  // 功能配置
  plugins: {
    autoLoad: boolean;
    enableBuiltin: boolean;
    customPaths?: string[];
  };

  // 渲染配置
  rendering: {
    defaultMode: RenderMode;
    lazyLoad: boolean;
    cacheSize: number;
    preloadCount: number;
  };

  // 导航配置
  navigation: {
    enableHistory: boolean;
    maxHistory: number;
    enableShortcuts: boolean;
  };

  // 窗口配置
  window?: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    maximizable: boolean;
    fullscreenable: boolean;
  };
}

// 导航目标
export interface NavigationTarget {
  type: 'card' | 'box' | 'url';
  path: string;
  options?: Record<string, unknown>;
}

// 导航历史条目
export interface NavigationHistoryEntry {
  id: string;
  target: NavigationTarget;
  title: string;
  timestamp: Date;
  scrollPosition?: { x: number; y: number };
}

// 当前内容
export interface CurrentContent {
  type: 'card' | 'box' | 'none';
  data: Card | Box | null;
  path: string | null;
  renderResult: CardRenderResult | BoxRenderResult | null;
}

// 视图选项
export interface ViewOptions {
  zoom: number;
  fitMode: 'auto' | 'width' | 'height' | 'page';
  showSidebar: boolean;
  showToolbar: boolean;
  showStatusBar: boolean;
}

// Viewer 事件类型
export type ViewerEventType =
  | 'content:open'
  | 'content:close'
  | 'content:render'
  | 'content:error'
  | 'navigation:change'
  | 'navigation:back'
  | 'navigation:forward'
  | 'plugin:load'
  | 'plugin:unload'
  | 'plugin:error'
  | 'theme:change'
  | 'zoom:change'
  | 'state:change';

// Viewer 事件数据
export interface ViewerEvent<T = unknown> {
  type: ViewerEventType;
  data: T;
  timestamp: Date;
}

// 快捷键绑定
export interface ShortcutBinding {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description?: string;
}

// 工具栏项目
export interface ToolbarItem {
  id: string;
  type: 'button' | 'toggle' | 'dropdown' | 'separator';
  icon?: string;
  label?: string;
  tooltip?: string;
  action?: string;
  disabled?: boolean;
  active?: boolean;
  items?: ToolbarItem[];
}

// 侧边栏面板
export interface SidebarPanel {
  id: string;
  title: string;
  icon?: string;
  component: string;
  position: 'left' | 'right';
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// 状态栏项目
export interface StatusBarItem {
  id: string;
  position: 'left' | 'center' | 'right';
  content: string;
  tooltip?: string;
  clickable?: boolean;
  action?: string;
}

// ViewerApp 选项
export interface ViewerAppOptions {
  platform?: Platform;
  language?: string;
  theme?: ThemeType;
  plugins?: {
    autoLoad?: boolean;
    enableBuiltin?: boolean;
    customPaths?: string[];
  };
  rendering?: {
    defaultMode?: RenderMode;
    lazyLoad?: boolean;
    cacheSize?: number;
  };
  navigation?: {
    enableHistory?: boolean;
    maxHistory?: number;
  };
  debug?: boolean;
}
