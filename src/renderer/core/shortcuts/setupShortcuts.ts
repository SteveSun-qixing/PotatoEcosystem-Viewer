/**
 * setupShortcuts - 设置快捷键绑定
 * @module @renderer/core/shortcuts/setupShortcuts
 *
 * 功能：
 * - 绑定默认快捷键处理器
 * - 连接 ViewerApp 和 ViewerStore
 */
import { shortcutManager } from './ShortcutManager';
import type { ViewerApp } from '../viewer/ViewerApp';
import { useViewerStore } from '@renderer/store/viewer';
import type { ThemeType } from '@common/types';

/**
 * 设置快捷键绑定
 *
 * @param viewerApp ViewerApp 实例
 *
 * @example
 * ```ts
 * const viewerApp = getViewerApp();
 * await viewerApp.initialize();
 * setupShortcuts(viewerApp);
 * ```
 */
export function setupShortcuts(viewerApp: ViewerApp): void {
  const viewerStore = useViewerStore();

  // ==================== 文件操作 ====================

  /**
   * 打开文件 (Ctrl+O)
   */
  shortcutManager.register('open-file', async () => {
    if (window.electronAPI?.file?.openDialog) {
      const result = await window.electronAPI.file.openDialog();
      if (result) {
        const type = result.endsWith('.card') ? 'card' : 'box';
        await viewerApp.navigate({
          type,
          path: result,
        });
      }
    }
  });

  /**
   * 关闭文件 (Ctrl+W)
   */
  shortcutManager.register('close-file', () => {
    viewerApp.closeContent();
  });

  // ==================== 缩放操作 ====================

  /**
   * 放大 (Ctrl+=)
   */
  shortcutManager.register('zoom-in', () => {
    const currentZoom = viewerStore.viewOptions.zoom;
    viewerStore.setZoom(currentZoom + 0.1);
  });

  /**
   * 缩小 (Ctrl+-)
   */
  shortcutManager.register('zoom-out', () => {
    const currentZoom = viewerStore.viewOptions.zoom;
    viewerStore.setZoom(currentZoom - 0.1);
  });

  /**
   * 重置缩放 (Ctrl+0)
   */
  shortcutManager.register('zoom-reset', () => {
    viewerStore.setZoom(1);
  });

  // ==================== 全屏操作 ====================

  /**
   * 全屏 (F11)
   */
  shortcutManager.register('fullscreen', () => {
    if (window.electronAPI?.window?.fullscreen) {
      window.electronAPI.window.fullscreen();
    } else {
      // Web 环境使用 Fullscreen API
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
  });

  // ==================== 导航操作 ====================

  /**
   * 后退 (Alt+←)
   */
  shortcutManager.register('navigate-back', () => {
    viewerApp.goBack();
  });

  /**
   * 前进 (Alt+→)
   */
  shortcutManager.register('navigate-forward', () => {
    viewerApp.goForward();
  });

  // ==================== 界面操作 ====================

  /**
   * 切换侧边栏 (Ctrl+B)
   */
  shortcutManager.register('toggle-sidebar', () => {
    viewerStore.toggleSidebar();
  });

  /**
   * 切换主题 (Ctrl+Shift+T)
   */
  shortcutManager.register('toggle-theme', () => {
    const themes: ThemeType[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(viewerStore.currentTheme as ThemeType);
    const nextIndex = (currentIndex + 1) % themes.length;
    viewerStore.setTheme(themes[nextIndex]);
  });
}

/**
 * 清理快捷键绑定
 */
export function cleanupShortcuts(): void {
  // 注销所有处理器
  shortcutManager.unregister('open-file');
  shortcutManager.unregister('close-file');
  shortcutManager.unregister('zoom-in');
  shortcutManager.unregister('zoom-out');
  shortcutManager.unregister('zoom-reset');
  shortcutManager.unregister('fullscreen');
  shortcutManager.unregister('navigate-back');
  shortcutManager.unregister('navigate-forward');
  shortcutManager.unregister('toggle-sidebar');
  shortcutManager.unregister('toggle-theme');
}
