/**
 * 预加载脚本
 *
 * 在渲染进程中安全暴露 Electron API。
 * 仅暴露查看器需要的最小 API 集合。
 */
import { contextBridge, ipcRenderer } from 'electron';

// webUtils is available in Electron 28+
let webUtils: { getPathForFile: (file: File) => string } | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  webUtils = require('electron').webUtils;
} catch {
  // Older Electron version without webUtils
}

const electronAPI = {
  /** 窗口操作 */
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    fullscreen: (): void => ipcRenderer.send('window:fullscreen'),
    setTitle: (title: string): void => ipcRenderer.send('window:set-title', title),
  },

  /** 文件操作 */
  file: {
    openDialog: (): Promise<string | null> =>
      ipcRenderer.invoke('file:open-dialog'),
    read: (filePath: string): Promise<ArrayBuffer> =>
      ipcRenderer.invoke('file:read', filePath),
    getPathForFile: (file: File): string => {
      try {
        return webUtils?.getPathForFile(file) ?? '';
      } catch {
        return '';
      }
    },
  },

  /** 平台信息 */
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
