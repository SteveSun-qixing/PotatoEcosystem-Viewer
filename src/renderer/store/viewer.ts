/**
 * 查看器状态管理
 * @module @renderer/store/viewer
 *
 * 管理查看器的核心状态：当前打开的卡片、加载状态、主题等。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ParsedCardMetadata } from '@chips/sdk';

/** 查看器状态枚举 */
export type ViewerState = 'empty' | 'loading' | 'ready' | 'error';

/** 主题类型 */
export type ThemeMode = 'light' | 'dark' | 'system';

export const useViewerStore = defineStore('viewer', () => {
  // ========== 状态 ==========

  /** 当前状态 */
  const state = ref<ViewerState>('empty');

  /** 当前卡片元数据 */
  const cardMetadata = ref<ParsedCardMetadata | null>(null);

  /** 当前文件路径 */
  const filePath = ref<string | null>(null);

  /** 错误信息 */
  const errorMessage = ref<string | null>(null);

  /** 主题模式 */
  const theme = ref<ThemeMode>('system');

  /** 缩放比例（百分比） */
  const zoom = ref(100);

  // ========== 计算属性 ==========

  /** 当前卡片名称 */
  const cardName = computed(() => cardMetadata.value?.name ?? '');

  /** 是否有打开的卡片 */
  const hasCard = computed(() => state.value === 'ready' && cardMetadata.value !== null);

  /** 是否正在加载 */
  const isLoading = computed(() => state.value === 'loading');

  /** 是否有错误 */
  const hasError = computed(() => state.value === 'error');

  /** 是否空状态 */
  const isEmpty = computed(() => state.value === 'empty');

  // ========== 操作方法 ==========

  /** 开始加载卡片 */
  function startLoading(path: string): void {
    state.value = 'loading';
    filePath.value = path;
    errorMessage.value = null;
    cardMetadata.value = null;
  }

  /** 卡片加载完成 */
  function setReady(metadata: ParsedCardMetadata): void {
    state.value = 'ready';
    cardMetadata.value = metadata;
    errorMessage.value = null;
  }

  /** 设置错误 */
  function setError(message: string): void {
    state.value = 'error';
    errorMessage.value = message;
  }

  /** 关闭卡片 */
  function closeCard(): void {
    state.value = 'empty';
    cardMetadata.value = null;
    filePath.value = null;
    errorMessage.value = null;
  }

  /** 设置主题 */
  function setTheme(mode: ThemeMode): void {
    theme.value = mode;
  }

  /** 设置缩放 */
  function setZoom(value: number): void {
    zoom.value = Math.max(25, Math.min(400, value));
  }

  /** 放大 */
  function zoomIn(): void {
    setZoom(zoom.value + 10);
  }

  /** 缩小 */
  function zoomOut(): void {
    setZoom(zoom.value - 10);
  }

  /** 重置缩放 */
  function zoomReset(): void {
    setZoom(100);
  }

  return {
    // 状态
    state,
    cardMetadata,
    filePath,
    errorMessage,
    theme,
    zoom,
    // 计算属性
    cardName,
    hasCard,
    isLoading,
    hasError,
    isEmpty,
    // 操作
    startLoading,
    setReady,
    setError,
    closeCard,
    setTheme,
    setZoom,
    zoomIn,
    zoomOut,
    zoomReset,
  };
});
