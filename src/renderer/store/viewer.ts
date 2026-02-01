/**
 * Viewer 状态管理
 * @module @renderer/store/viewer
 */
import { defineStore } from 'pinia';
import type {
  ViewerState,
  CurrentContent,
  ViewOptions,
  NavigationHistoryEntry,
} from '@common/types';

export interface ViewerStoreState {
  // 应用状态
  state: ViewerState;
  error: string | null;

  // 当前内容
  currentContent: CurrentContent;

  // 视图选项
  viewOptions: ViewOptions;

  // 导航
  navigationHistory: NavigationHistoryEntry[];
  currentHistoryIndex: number;

  // 主题
  currentTheme: string;

  // 侧边栏
  sidebarVisible: boolean;
  sidebarWidth: number;

  // 加载状态
  isLoading: boolean;
  loadingMessage: string;
}

export const useViewerStore = defineStore('viewer', {
  state: (): ViewerStoreState => ({
    state: 'idle',
    error: null,
    currentContent: {
      type: 'none',
      data: null,
      path: null,
      renderResult: null,
    },
    viewOptions: {
      zoom: 1,
      fitMode: 'auto',
      showSidebar: true,
      showToolbar: true,
      showStatusBar: true,
    },
    navigationHistory: [],
    currentHistoryIndex: -1,
    currentTheme: 'system',
    sidebarVisible: true,
    sidebarWidth: 280,
    isLoading: false,
    loadingMessage: '',
  }),

  getters: {
    isReady: state => state.state === 'ready',
    hasContent: state => state.currentContent.type !== 'none',
    canGoBack: state => state.currentHistoryIndex > 0,
    canGoForward: state =>
      state.currentHistoryIndex < state.navigationHistory.length - 1,
    currentEntry: state =>
      state.navigationHistory[state.currentHistoryIndex] ?? null,
  },

  actions: {
    // 状态管理
    setState(newState: ViewerState): void {
      this.state = newState;
    },

    setError(error: string | null): void {
      this.error = error;
      if (error) {
        this.state = 'error';
      }
    },

    // 内容管理
    setCurrentContent(content: CurrentContent): void {
      this.currentContent = content;
    },

    clearContent(): void {
      this.currentContent = {
        type: 'none',
        data: null,
        path: null,
        renderResult: null,
      };
    },

    // 视图选项
    setZoom(zoom: number): void {
      this.viewOptions.zoom = Math.max(0.1, Math.min(5, zoom));
    },

    setFitMode(mode: ViewOptions['fitMode']): void {
      this.viewOptions.fitMode = mode;
    },

    toggleSidebar(): void {
      this.sidebarVisible = !this.sidebarVisible;
    },

    setSidebarWidth(width: number): void {
      this.sidebarWidth = Math.max(200, Math.min(500, width));
    },

    // 导航
    addToHistory(entry: NavigationHistoryEntry): void {
      // 清除当前位置之后的历史
      this.navigationHistory = this.navigationHistory.slice(
        0,
        this.currentHistoryIndex + 1
      );
      this.navigationHistory.push(entry);
      this.currentHistoryIndex = this.navigationHistory.length - 1;
    },

    goToHistoryIndex(index: number): void {
      if (index >= 0 && index < this.navigationHistory.length) {
        this.currentHistoryIndex = index;
      }
    },

    clearHistory(): void {
      this.navigationHistory = [];
      this.currentHistoryIndex = -1;
    },

    // 主题
    setTheme(theme: string): void {
      this.currentTheme = theme;
    },

    // 加载状态
    setLoading(loading: boolean, message?: string): void {
      this.isLoading = loading;
      this.loadingMessage = message ?? '';
    },
  },
});
