/**
 * 插件系统模块导出
 * @module @renderer/core/plugin
 */

// 插件上下文
export { PluginContextImpl, createPluginContext } from './PluginContext';

// 插件管理器
export { PluginManager } from './PluginManager';

// 插件加载器
export { PluginLoader } from './PluginLoader';

// 插件调度器
export { PluginDispatcher } from './PluginDispatcher';

// 插件沙箱
export {
  PluginSandbox,
  AVAILABLE_PERMISSIONS,
  type SandboxStatus,
  type SandboxOptions,
} from './PluginSandbox';
