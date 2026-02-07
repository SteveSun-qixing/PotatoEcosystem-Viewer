<script setup lang="ts">
/**
 * WindowControls - 窗口控制组件
 * @module @renderer/components/header/WindowControls
 *
 * 功能：
 * - 最小化窗口
 * - 最大化/还原窗口
 * - 关闭窗口
 * 仅在 Electron 环境下使用
 */
import { ref, onMounted } from 'vue';
import { useTranslation } from '@renderer/composables/useTranslation';

const { t } = useTranslation();

// 窗口状态
const isMaximized = ref(false);

/**
 * 最小化窗口
 */
const handleMinimize = (): void => {
  window.electronAPI?.window?.minimize?.();
};

/**
 * 最大化/还原窗口
 */
const handleMaximize = (): void => {
  window.electronAPI?.window?.maximize?.();
};

/**
 * 关闭窗口
 */
const handleClose = (): void => {
  window.electronAPI?.window?.close?.();
};

/**
 * 监听窗口最大化状态变化
 */
const updateMaximizedState = async (): Promise<void> => {
  if (window.electronAPI?.window?.isMaximized) {
    isMaximized.value = await window.electronAPI.window.isMaximized();
  }
};

// 生命周期
onMounted(() => {
  updateMaximizedState();

  // 监听窗口状态变化
  if (window.electronAPI?.window?.onMaximizedChange) {
    window.electronAPI.window.onMaximizedChange((maximized: boolean) => {
      isMaximized.value = maximized;
    });
  }
});
</script>

<template>
  <div class="window-controls">
    <!-- 最小化按钮 -->
    <button class="window-controls__button window-controls__minimize" type="button" :title="t('window.minimize')" @click="handleMinimize">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1" />
      </svg>
    </button>

    <!-- 最大化/还原按钮 -->
    <button
      class="window-controls__button window-controls__maximize"
      type="button"
      :title="isMaximized ? t('window.restore') : t('window.maximize')"
      @click="handleMaximize"
    >
      <!-- 最大化图标 -->
      <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10">
        <rect x="0" y="0" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
      </svg>
      <!-- 还原图标 -->
      <svg v-else width="10" height="10" viewBox="0 0 10 10">
        <path d="M2,0 L10,0 L10,8 L8,8 L8,10 L0,10 L0,2 L2,2 Z M2,2 L2,8 L8,8 L8,2 Z" fill="none" stroke="currentColor" stroke-width="0.8" />
      </svg>
    </button>

    <!-- 关闭按钮 -->
    <button class="window-controls__button window-controls__close" type="button" :title="t('window.close')" @click="handleClose">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1" />
        <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/**
 * 窗口控制按钮样式
 */
.window-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
}

.window-controls__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 28px;
  padding: 0;
  color: var(--viewer-text-color, #333333);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s;
}

.window-controls__button:hover {
  background-color: var(--viewer-button-hover, rgba(0, 0, 0, 0.1));
}

/* 关闭按钮特殊样式 */
.window-controls__close:hover {
  background-color: var(--viewer-close-hover, #e81123);
  color: #ffffff;
}

/* 暗色主题 */
:global(.theme-dark) .window-controls {
  --viewer-text-color: #e0e0e0;
  --viewer-button-hover: rgba(255, 255, 255, 0.1);
  --viewer-close-hover: #e81123;
}

/* 亮色主题 */
:global(.theme-light) .window-controls {
  --viewer-text-color: #333333;
  --viewer-button-hover: rgba(0, 0, 0, 0.1);
  --viewer-close-hover: #e81123;
}
</style>
