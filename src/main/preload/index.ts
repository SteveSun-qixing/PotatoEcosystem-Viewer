/**
 * 预加载脚本
 * 在渲染进程中安全暴露 API
 * @module @main/preload
 */
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@common/constants';

// 暴露给渲染进程的 API
const electronAPI = {
  // 窗口操作
  window: {
    minimize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
    fullscreen: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_FULLSCREEN),
  },

  // 文件操作
  file: {
    openDialog: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DIALOG),
  },

  // 平台信息
  platform: process.platform,
};

// 安全暴露 API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
