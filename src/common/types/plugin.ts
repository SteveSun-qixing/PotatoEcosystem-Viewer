/**
 * 插件系统类型定义
 * @module @common/types/plugin
 */

// 插件状态
export type PluginState = 'installed' | 'enabled' | 'disabled' | 'loading' | 'error';

// 插件类型
export type PluginType = 'viewer-tool' | 'layout' | 'theme' | 'utility';

// 插件元数据
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  license?: string;
  homepage?: string;
  repository?: string;
  icon?: string;
  supportedTypes?: string[];
  supportedExtensions?: string[];
  minViewerVersion?: string;
}

// 插件清单
export interface PluginManifest extends PluginMetadata {
  main: string;
  style?: string;
  permissions?: string[];
  settings?: PluginSetting[];
  dependencies?: Record<string, string>;
}

// 插件设置项
export interface PluginSetting {
  key: string;
  type: 'boolean' | 'number' | 'string' | 'select' | 'color';
  default: unknown;
  label: string;
  description?: string;
  options?: Array<{ value: unknown; label: string }>;
  min?: number;
  max?: number;
}

// 插件实例
export interface PluginInstance {
  id: string;
  metadata: PluginMetadata;
  state: PluginState;
  config: Record<string, unknown>;
  error?: string;
}

// 命令处理器
export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

// 渲染器定义
export interface RendererDefinition {
  cardTypes: string[];
  render: (context: RenderContext) => Promise<RenderResult>;
  update?: (context: RenderContext) => Promise<void>;
  dispose?: () => void;
}

// 渲染上下文
export interface RenderContext {
  card: unknown;
  container: HTMLElement;
  theme: string;
  options: Record<string, unknown>;
}

// 渲染结果
export interface RenderResult {
  success: boolean;
  html?: string;
  css?: string;
  error?: string;
}

// 插件上下文
export interface PluginContext {
  pluginId: string;
  sdkVersion: string;
  config: Record<string, unknown>;

  // API 访问
  api: {
    file: PluginFileAPI;
    storage: PluginStorageAPI;
    theme: PluginThemeAPI;
    i18n: PluginI18nAPI;
  };

  // 日志
  log: (message: string, data?: unknown) => void;

  // 注册
  registerCommand: (name: string, handler: CommandHandler) => void;
  registerRenderer: (type: string, renderer: RendererDefinition) => void;

  // 事件
  emit: (event: string, data: unknown) => void;
  on: (event: string, handler: (data: unknown) => void) => void;

  // 设置
  getSettings: () => Record<string, unknown>;
  updateSettings: (settings: Partial<Record<string, unknown>>) => void;
}

// 插件 API 接口
export interface PluginFileAPI {
  read: (path: string) => Promise<ArrayBuffer>;
  readText: (path: string) => Promise<string>;
  exists: (path: string) => Promise<boolean>;
}

export interface PluginStorageAPI {
  get: <T>(key: string, defaultValue?: T) => T;
  set: (key: string, value: unknown) => void;
  remove: (key: string) => void;
}

export interface PluginThemeAPI {
  getCurrent: () => string;
  getVariable: (name: string) => string;
}

export interface PluginI18nAPI {
  t: (key: string, params?: Record<string, unknown>) => string;
  getLocale: () => string;
}

// 文件信息
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  lastModified: Date;
}

// 渲染选项
export interface RenderOptions {
  theme?: string;
  interactive?: boolean;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

// 插件注册信息
export interface PluginRegistration {
  id: string;
  metadata: PluginMetadata;
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

// 插件查询选项
export interface PluginQueryOptions {
  type?: PluginType;
  state?: PluginState;
  supportedType?: string;
}
