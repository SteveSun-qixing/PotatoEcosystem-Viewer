<script setup lang="ts">
/**
 * NavigationButtons - 导航按钮组件
 * @module @renderer/components/header/NavigationButtons
 *
 * 功能：
 * - 前进/后退导航按钮
 * - 按钮禁用状态管理
 * - 快捷键提示
 */
import { computed } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useViewerApp } from '@renderer/composables/useViewerApp';
import { useTranslation } from '@renderer/composables/useTranslation';

// Store 和 Composables
const viewerStore = useViewerStore();
const { goBack, goForward } = useViewerApp();
const { t } = useTranslation();

// 计算属性
const canGoBack = computed(() => viewerStore.canGoBack);
const canGoForward = computed(() => viewerStore.canGoForward);

/**
 * 处理后退
 */
const handleBack = (): void => {
  if (canGoBack.value) {
    goBack();
  }
};

/**
 * 处理前进
 */
const handleForward = (): void => {
  if (canGoForward.value) {
    goForward();
  }
};
</script>

<template>
  <div class="navigation-buttons">
    <!-- 后退按钮 -->
    <button
      class="navigation-buttons__button"
      type="button"
      :disabled="!canGoBack"
      :title="`${t('navigation.back')} (Alt+←)`"
      @click="handleBack"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <!-- 前进按钮 -->
    <button
      class="navigation-buttons__button"
      type="button"
      :disabled="!canGoForward"
      :title="`${t('navigation.forward')} (Alt+→)`"
      @click="handleForward"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/**
 * 导航按钮样式
 */
.navigation-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navigation-buttons__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--viewer-text-color, #333333);
  background-color: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.navigation-buttons__button:hover:not(:disabled) {
  background-color: var(--viewer-button-hover, #e8e8e8);
}

.navigation-buttons__button:active:not(:disabled) {
  background-color: var(--viewer-button-active, #d8d8d8);
}

.navigation-buttons__button:disabled {
  color: var(--viewer-disabled-color, #cccccc);
  cursor: not-allowed;
}

/* 暗色主题 */
:global(.theme-dark) .navigation-buttons {
  --viewer-text-color: #e0e0e0;
  --viewer-button-hover: #3a3a3a;
  --viewer-button-active: #4a4a4a;
  --viewer-disabled-color: #555555;
}

/* 亮色主题 */
:global(.theme-light) .navigation-buttons {
  --viewer-text-color: #333333;
  --viewer-button-hover: #e8e8e8;
  --viewer-button-active: #d8d8d8;
  --viewer-disabled-color: #cccccc;
}
</style>
