/**
 * Electron API 类型声明
 * @module @renderer/types/electron
 *
 * 声明 window.electronAPI 接口
 */

/**
 * 窗口 API
 */
interface WindowAPI {
  /** 最小化窗口 */
  minimize: () => void;
  /** 最大化窗口 */
  maximize: () => void;
  /** 关闭窗口 */
  close: () => void;
  /** 全屏 */
  fullscreen: () => void;
  /** 是否最大化 */
  isMaximized: () => Promise<boolean>;
  /** 监听最大化状态变化 */
  onMaximizedChange: (callback: (maximized: boolean) => void) => void;
}

/**
 * 文件 API
 */
interface FileAPI {
  /** 打开文件对话框 */
  openDialog: () => Promise<string | null>;
  /** 读取文件 */
  read: (path: string) => Promise<ArrayBuffer>;
  /** 从拖拽 File 对象提取绝对路径（Electron） */
  getPathForFile?: (file: File) => string;
}

/**
 * Electron API 接口
 */
interface ElectronAPI {
  window: WindowAPI;
  file: FileAPI;
  readFile?: (path: string) => Promise<ArrayBuffer>;
  platform?: string;
}

/**
 * 扩展全局 Window 接口
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
