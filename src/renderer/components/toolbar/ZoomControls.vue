<script setup lang="ts">
/**
 * ZoomControls - 缩放控制组件
 * @module @renderer/components/toolbar/ZoomControls
 *
 * 功能：
 * - 缩放增减按钮
 * - 预设缩放级别选择
 * - 重置缩放
 * - 显示当前缩放百分比
 */
import { computed, ref } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useTranslation } from '@renderer/composables/useTranslation';

// Store 和 Composables
const viewerStore = useViewerStore();
const { t } = useTranslation();

// 下拉菜单显示状态
const showDropdown = ref(false);

// 计算属性
const zoom = computed(() => viewerStore.viewOptions.zoom);
const zoomPercent = computed(() => Math.round(zoom.value * 100));

// 预设缩放级别
const presetZooms = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
];

/**
 * 放大
 */
const handleZoomIn = (): void => {
  viewerStore.setZoom(zoom.value + 0.1);
};

/**
 * 缩小
 */
const handleZoomOut = (): void => {
  viewerStore.setZoom(zoom.value - 0.1);
};

/**
 * 重置缩放
 */
const handleZoomReset = (): void => {
  viewerStore.setZoom(1);
};

/**
 * 选择预设缩放级别
 */
const handleSelectZoom = (value: number): void => {
  viewerStore.setZoom(value);
  showDropdown.value = false;
};

/**
 * 切换下拉菜单
 */
const toggleDropdown = (): void => {
  showDropdown.value = !showDropdown.value;
};

/**
 * 关闭下拉菜单
 */
const closeDropdown = (): void => {
  showDropdown.value = false;
};
</script>

<template>
  <div class="zoom-controls" @mouseleave="closeDropdown">
    <!-- 缩小按钮 -->
    <button
      class="zoom-controls__button"
      type="button"
      :disabled="zoom <= 0.1"
      :title="`${t('zoom.out')} (Ctrl+-)`"
      @click="handleZoomOut"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <!-- 缩放百分比选择器 -->
    <div class="zoom-controls__selector">
      <button class="zoom-controls__value" type="button" @click="toggleDropdown">
        {{ zoomPercent }}%
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <!-- 下拉菜单 -->
      <div v-if="showDropdown" class="zoom-controls__dropdown">
        <button
          v-for="preset in presetZooms"
          :key="preset.value"
          class="zoom-controls__option"
          :class="{ 'zoom-controls__option--active': zoom === preset.value }"
          type="button"
          @click="handleSelectZoom(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- 放大按钮 -->
    <button
      class="zoom-controls__button"
      type="button"
      :disabled="zoom >= 5"
      :title="`${t('zoom.in')} (Ctrl+=)`"
      @click="handleZoomIn"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <!-- 重置按钮 -->
    <button class="zoom-controls__button zoom-controls__reset" type="button" :title="`${t('zoom.reset')} (Ctrl+0)`" @click="handleZoomReset">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/**
 * 缩放控制样式
 */
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 按钮样式 */
.zoom-controls__button {
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

.zoom-controls__button:hover:not(:disabled) {
  background-color: var(--viewer-button-hover, #e8e8e8);
}

.zoom-controls__button:disabled {
  color: var(--viewer-disabled-color, #cccccc);
  cursor: not-allowed;
}

/* 重置按钮分隔 */
.zoom-controls__reset {
  margin-left: 4px;
}

/* 选择器 */
.zoom-controls__selector {
  position: relative;
}

.zoom-controls__value {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--viewer-text-color, #333333);
  background-color: transparent;
  border: 1px solid var(--viewer-border-color, #e0e0e0);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 60px;
  justify-content: center;
}

.zoom-controls__value:hover {
  background-color: var(--viewer-button-hover, #e8e8e8);
}

/* 下拉菜单 */
.zoom-controls__dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  padding: 4px;
  background-color: var(--viewer-dropdown-bg, #ffffff);
  border: 1px solid var(--viewer-border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 80px;
}

.zoom-controls__option {
  display: block;
  width: 100%;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--viewer-text-color, #333333);
  background-color: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s;
}

.zoom-controls__option:hover {
  background-color: var(--viewer-item-hover, rgba(0, 0, 0, 0.05));
}

.zoom-controls__option--active {
  color: var(--viewer-primary-color, #1890ff);
  background-color: var(--viewer-primary-bg, rgba(24, 144, 255, 0.1));
}

/* 暗色主题 */
:global(.theme-dark) .zoom-controls {
  --viewer-text-color: #e0e0e0;
  --viewer-border-color: #3a3a3a;
  --viewer-button-hover: #3a3a3a;
  --viewer-disabled-color: #555555;
  --viewer-dropdown-bg: #2a2a2a;
  --viewer-item-hover: rgba(255, 255, 255, 0.05);
  --viewer-primary-color: #409eff;
  --viewer-primary-bg: rgba(64, 158, 255, 0.2);
}

/* 亮色主题 */
:global(.theme-light) .zoom-controls {
  --viewer-text-color: #333333;
  --viewer-border-color: #e0e0e0;
  --viewer-button-hover: #e8e8e8;
  --viewer-disabled-color: #cccccc;
  --viewer-dropdown-bg: #ffffff;
  --viewer-item-hover: rgba(0, 0, 0, 0.05);
  --viewer-primary-color: #1890ff;
  --viewer-primary-bg: rgba(24, 144, 255, 0.1);
}
</style>
