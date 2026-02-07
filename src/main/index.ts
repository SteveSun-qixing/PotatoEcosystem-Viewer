/**
 * Electron 主进程入口
 * @module @main/index
 *
 * 查看器主进程职责：
 * - 窗口管理（创建、最小化、最大化、关闭、全屏）
 * - 文件对话框（打开 .card 文件）
 * - 文件读取（将文件数据传递给渲染进程）
 * - 命令行参数处理（直接打开指定文件）
 */
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { readFile } from 'fs/promises';

let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 640,
    minHeight: 480,
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
  ipcMain.on('window:minimize', () => mainWindow?.minimize());

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => mainWindow?.close());

  ipcMain.on('window:fullscreen', () => {
    mainWindow?.setFullScreen(!mainWindow.isFullScreen());
  });

  // 文件打开对话框
  ipcMain.handle('file:open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Chips Card', extensions: ['card'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // 读取文件
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const buffer = await readFile(filePath);
      return buffer;
    } catch (error) {
      console.error('File read failed:', filePath, error);
      throw error;
    }
  });

  // 设置窗口标题
  ipcMain.on('window:set-title', (_event, title: string) => {
    if (mainWindow && title) {
      mainWindow.setTitle(title);
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
