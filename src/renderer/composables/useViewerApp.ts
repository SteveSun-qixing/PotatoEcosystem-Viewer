/**
 * useViewerApp - ViewerApp 组合式函数
 * @module @renderer/composables/useViewerApp
 *
 * 提供对 ViewerApp 实例的响应式访问
 */
import { ref, readonly, onMounted, onUnmounted, type Ref } from 'vue';
import { getViewerApp, type ViewerApp } from '@renderer/core/viewer/ViewerApp';
import type { ViewerState, CurrentContent, NavigationTarget } from '@common/types';
import { EVENTS } from '@common/constants';

/**
 * ViewerApp 组合式函数返回类型
 */
export interface UseViewerAppReturn {
  /** ViewerApp 实例 */
  viewerApp: ViewerApp;
  /** 应用状态 */
  state: Readonly<Ref<ViewerState>>;
  /** 当前内容 */
  currentContent: Readonly<Ref<CurrentContent>>;
  /** 是否就绪 */
  isReady: Readonly<Ref<boolean>>;
  /** 是否可以后退 */
  canGoBack: Readonly<Ref<boolean>>;
  /** 是否可以前进 */
  canGoForward: Readonly<Ref<boolean>>;
  /** 打开卡片 */
  openCard: (path: string) => Promise<void>;
  /** 打开箱子 */
  openBox: (path: string) => Promise<void>;
  /** 导航 */
  navigate: (target: NavigationTarget) => Promise<void>;
  /** 后退 */
  goBack: () => void;
  /** 前进 */
  goForward: () => void;
  /** 关闭内容 */
  closeContent: () => void;
  /** 设置缩放 */
  setZoom: (zoom: number) => void;
  /** 设置主题 */
  setTheme: (theme: string) => void;
  /** 设置渲染容器 */
  setContainer: (container: HTMLElement) => void;
}

// 单例状态，在多个组件间共享
const state = ref<ViewerState>('idle');
const currentContent = ref<CurrentContent>({
  type: 'none',
  data: null,
  path: null,
  renderResult: null,
});
const isReady = ref(false);
const canGoBack = ref(false);
const canGoForward = ref(false);

/**
 * useViewerApp - 获取 ViewerApp 实例和响应式状态
 *
 * @example
 * ```vue
 * <script setup>
 * const { viewerApp, state, isReady, openCard } = useViewerApp();
 *
 * onMounted(async () => {
 *   await viewerApp.initialize();
 * });
 *
 * const handleOpen = async () => {
 *   await openCard('/path/to/card.card');
 * };
 * </script>
 * ```
 */
export function useViewerApp(): UseViewerAppReturn {
  const viewerApp = getViewerApp();

  // 事件处理器 ID 列表
  const handlerIds: string[] = [];

  /**
   * 更新状态
   */
  const updateState = (): void => {
    state.value = viewerApp.state;
    currentContent.value = viewerApp.currentContent;
    isReady.value = viewerApp.isReady;
    canGoBack.value = viewerApp.canGoBack();
    canGoForward.value = viewerApp.canGoForward();
  };

  /**
   * 设置事件监听
   */
  const setupListeners = (): void => {
    // 监听状态变化
    const stateHandlerId = viewerApp.on(EVENTS.STATE_CHANGE, updateState);
    handlerIds.push(stateHandlerId);

    // 监听内容打开
    const contentOpenHandlerId = viewerApp.on(EVENTS.CONTENT_OPEN, updateState);
    handlerIds.push(contentOpenHandlerId);

    // 监听内容关闭
    const contentCloseHandlerId = viewerApp.on(EVENTS.CONTENT_CLOSE, updateState);
    handlerIds.push(contentCloseHandlerId);

    // 监听导航变化
    const navBackHandlerId = viewerApp.on(EVENTS.NAVIGATION_BACK, updateState);
    handlerIds.push(navBackHandlerId);

    const navForwardHandlerId = viewerApp.on(EVENTS.NAVIGATION_FORWARD, updateState);
    handlerIds.push(navForwardHandlerId);
  };

  /**
   * 清理事件监听
   */
  const cleanupListeners = (): void => {
    for (const handlerId of handlerIds) {
      viewerApp.off(EVENTS.STATE_CHANGE, handlerId);
    }
    handlerIds.length = 0;
  };

  // 生命周期
  onMounted(() => {
    setupListeners();
    updateState();
  });

  onUnmounted(() => {
    cleanupListeners();
  });

  // 包装方法
  const openCard = async (path: string): Promise<void> => {
    await viewerApp.openCard(path);
  };

  const openBox = async (path: string): Promise<void> => {
    await viewerApp.openBox(path);
  };

  const navigate = async (target: NavigationTarget): Promise<void> => {
    await viewerApp.navigate(target);
  };

  const goBack = (): void => {
    viewerApp.goBack();
  };

  const goForward = (): void => {
    viewerApp.goForward();
  };

  const closeContent = (): void => {
    viewerApp.closeContent();
  };

  const setZoom = (zoom: number): void => {
    viewerApp.setZoom(zoom);
  };

  const setTheme = (theme: string): void => {
    viewerApp.setTheme(theme);
  };

  const setContainer = (container: HTMLElement): void => {
    viewerApp.setContainer(container);
  };

  return {
    viewerApp,
    state: readonly(state),
    currentContent: readonly(currentContent),
    isReady: readonly(isReady),
    canGoBack: readonly(canGoBack),
    canGoForward: readonly(canGoForward),
    openCard,
    openBox,
    navigate,
    goBack,
    goForward,
    closeContent,
    setZoom,
    setTheme,
    setContainer,
  };
}
