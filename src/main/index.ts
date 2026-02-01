/**
 * Electron 主进程入口
 * @module @main/index
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { IPC_CHANNELS } from '@common/constants';

let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Chips Viewer',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  // 开发模式加载 localhost，生产模式加载打包文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools 可通过 Cmd+Option+I 手动打开
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 设置 IPC 处理器
 */
function setupIPC(): void {
  // 窗口操作
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow?.close();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_FULLSCREEN, () => {
    mainWindow?.setFullScreen(!mainWindow.isFullScreen());
  });

  // 文件操作
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_DIALOG, async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Chips Files', extensions: ['card', 'box'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // 读取文件
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, filePath: string) => {
    const { readFile } = await import('fs/promises');
    try {
      const buffer = await readFile(filePath);
      return buffer;
    } catch (error) {
      console.error('Failed to read file:', filePath, error);
      throw error;
    }
  });
}

// 应用启动
app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// macOS 以外的平台，所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
