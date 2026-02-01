/**
 * Viewer 核心模块导出
 * @module @renderer/core/viewer
 */

// 主类
export { ViewerApp, getViewerApp, destroyViewerApp } from './ViewerApp';

// 管理器
export { CardManager } from './CardManager';
export { BoxManager } from './BoxManager';
export { NavigationController } from './NavigationController';
export { ConfigManager } from './ConfigManager';

// 类型
export type {
  ViewerAppOptions,
  InitializeResult,
  OpenContentOptions,
  NavigationControllerOptions,
  ConfigManagerOptions,
  InternalState,
} from './types';
