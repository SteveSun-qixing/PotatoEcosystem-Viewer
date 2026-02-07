<script setup lang="ts">
/**
 * ViewerHeader - 头部导航栏组件
 * @module @renderer/components/header/ViewerHeader
 *
 * 功能：
 * - 显示导航按钮（前进/后退）
 * - 显示当前文件标题
 * - 缩放控制
 * - 主题切换
 * - 打开文件按钮
 * - 窗口控制（仅桌面端）
 */
import { computed } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useViewerApp } from '@renderer/composables/useViewerApp';
import { useTranslation } from '@renderer/composables/useTranslation';
import { logger } from '@renderer/services';
import NavigationButtons from './NavigationButtons.vue';
import ZoomControls from '../toolbar/ZoomControls.vue';
import ThemeToggle from '../toolbar/ThemeToggle.vue';
import WindowControls from './WindowControls.vue';

// Store 和 Composables
const viewerStore = useViewerStore();
const { navigate } = useViewerApp();
const { t } = useTranslation();
const log = logger.createChild('ViewerHeader');

// 计算属性
const currentContent = computed(() => viewerStore.currentContent);
const currentTitle = computed(() => {
  const content = currentContent.value;
  if (content.type === 'none') {
    return t('viewer.title');
  }
  // 尝试从元数据获取名称
  const metadata = content.data?.metadata;
  return metadata?.name ?? t('viewer.untitled');
});

// 是否是 Electron 环境
const isElectron = computed(() => typeof window !== 'undefined' && !!window.electronAPI);

/**
 * 处理打开文件
 */
const handleOpenFile = async (): Promise<void> => {
  if (window.electronAPI?.file?.openDialog) {
    try {
      const result = await window.electronAPI.file.openDialog();
      if (result) {
        const type = result.endsWith('.card') ? 'card' : 'box';
        await navigate({ type, path: result });
      }
    } catch (error) {
      log.error('Failed to open file', error as Error);
    }
  }
};

/**
 * 处理菜单点击
 */
const handleMenuClick = (): void => {
  // TODO: 实现菜单功能
  log.debug('Menu clicked');
};
</script>

<template>
  <div class="viewer-header" :class="{ 'viewer-header--electron': isElectron }">
    <!-- 左侧：导航按钮和标题 -->
    <div class="viewer-header__left">
      <NavigationButtons />
      <span class="viewer-header__title" :title="currentTitle">
        {{ currentTitle }}
      </span>
    </div>

    <!-- 中间：缩放控制 -->
    <div class="viewer-header__center">
      <ZoomControls />
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="viewer-header__right">
      <!-- 打开文件按钮 -->
      <button class="viewer-header__button" type="button" :title="t('viewer.open')" @click="handleOpenFile">
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
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span class="viewer-header__button-text">{{ t('viewer.open') }}</span>
      </button>

      <!-- 主题切换 -->
      <ThemeToggle />

      <!-- 菜单按钮 -->
      <button class="viewer-header__button viewer-header__menu-button" type="button" :title="t('viewer.menu')" @click="handleMenuClick">
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
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <!-- 窗口控制按钮（仅 Electron） -->
      <WindowControls v-if="isElectron" class="viewer-header__window-controls" />
    </div>
  </div>
</template>

<style scoped>
/**
 * 头部导航栏样式
 */
.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 12px;
  background-color: var(--viewer-header-bg, #f8f8f8);
  user-select: none;
  /* Electron 窗口拖拽区域 */
  -webkit-app-region: drag;
}

/* Electron 环境下添加额外的顶部内边距（用于拖拽） */
.viewer-header--electron {
  padding-top: 4px;
}

/* 左侧区域 */
.viewer-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  /* 禁止拖拽（让按钮可点击） */
  -webkit-app-region: no-drag;
}

/* 标题 */
.viewer-header__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--viewer-text-color, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* 中间区域 */
.viewer-header__center {
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;
}

/* 右侧区域 */
.viewer-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

/* 按钮样式 */
.viewer-header__button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--viewer-text-color, #333333);
  background-color: var(--viewer-button-bg, transparent);
  border: 1px solid var(--viewer-border-color, #e0e0e0);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.viewer-header__button:hover {
  background-color: var(--viewer-button-hover, #e8e8e8);
}

.viewer-header__button:active {
  background-color: var(--viewer-button-active, #d8d8d8);
}

/* 菜单按钮（无文字） */
.viewer-header__menu-button {
  padding: 6px 8px;
}

.viewer-header__menu-button .viewer-header__button-text {
  display: none;
}

/* 窗口控制按钮区域 */
.viewer-header__window-controls {
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid var(--viewer-border-color, #e0e0e0);
}

/* 响应式：小屏幕隐藏按钮文字 */
@media (max-width: 600px) {
  .viewer-header__button-text {
    display: none;
  }

  .viewer-header__button {
    padding: 6px 8px;
  }

  .viewer-header__title {
    max-width: 120px;
  }
}

/* 暗色主题 */
:global(.theme-dark) .viewer-header {
  --viewer-header-bg: #252525;
  --viewer-text-color: #e0e0e0;
  --viewer-border-color: #3a3a3a;
  --viewer-button-bg: transparent;
  --viewer-button-hover: #3a3a3a;
  --viewer-button-active: #4a4a4a;
}

/* 亮色主题 */
:global(.theme-light) .viewer-header {
  --viewer-header-bg: #f8f8f8;
  --viewer-text-color: #333333;
  --viewer-border-color: #e0e0e0;
  --viewer-button-bg: transparent;
  --viewer-button-hover: #e8e8e8;
  --viewer-button-active: #d8d8d8;
}
</style>
