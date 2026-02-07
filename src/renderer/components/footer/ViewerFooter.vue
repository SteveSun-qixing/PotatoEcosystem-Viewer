<script setup lang="ts">
/**
 * ViewerFooter - 底部状态栏组件
 * @module @renderer/components/footer/ViewerFooter
 *
 * 功能：
 * - 显示状态信息（就绪/加载中/查看中）
 * - 显示当前文件路径
 * - 显示缩放比例
 * - 显示其他状态指示器
 */
import { computed } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useTranslation } from '@renderer/composables/useTranslation';

// Store 和 Composables
const viewerStore = useViewerStore();
const { t } = useTranslation();

// 计算属性
const currentContent = computed(() => viewerStore.currentContent);
const isLoading = computed(() => viewerStore.isLoading);
const loadingMessage = computed(() => viewerStore.loadingMessage);
const error = computed(() => viewerStore.error);
const zoom = computed(() => viewerStore.viewOptions.zoom);
const zoomPercent = computed(() => Math.round(zoom.value * 100));
const hasContent = computed(() => currentContent.value.type !== 'none');

/**
 * 状态文本
 */
const statusText = computed(() => {
  if (isLoading.value) {
    return loadingMessage.value || t('status.loading');
  }
  if (error.value) {
    return error.value;
  }
  if (!hasContent.value) {
    return t('status.ready');
  }
  return t('status.viewing');
});

/**
 * 状态图标类型
 */
const statusType = computed(() => {
  if (isLoading.value) return 'loading';
  if (error.value) return 'error';
  if (hasContent.value) return 'viewing';
  return 'ready';
});

/**
 * 文件路径信息
 */
const contentInfo = computed(() => {
  if (!hasContent.value) return '';

  const path = currentContent.value.path;
  if (!path) return '';

  // 截取显示路径（保留最后几级）
  const parts = path.split(/[/\\\\]/);
  if (parts.length > 3) {
    return '...' + '/' + parts.slice(-3).join('/');
  }
  return path;
});

/**
 * 内容类型
 */
const contentType = computed(() => {
  if (!hasContent.value) return '';
  return currentContent.value.type === 'card' ? t('fileInfo.card') : t('fileInfo.box');
});
</script>

<template>
  <div class="viewer-footer">
    <!-- 左侧：状态信息 -->
    <div class="viewer-footer__left">
      <!-- 状态指示器 -->
      <span class="viewer-footer__status" :class="`viewer-footer__status--${statusType}`">
        <!-- 加载中动画 -->
        <span v-if="statusType === 'loading'" class="viewer-footer__spinner" />
        <!-- 错误图标 -->
        <svg v-else-if="statusType === 'error'" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
        <!-- 查看中图标 -->
        <svg v-else-if="statusType === 'viewing'" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
        <!-- 就绪图标 -->
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </span>
      <span class="viewer-footer__text">{{ statusText }}</span>
    </div>

    <!-- 中间：文件信息 -->
    <div class="viewer-footer__center">
      <template v-if="hasContent">
        <span class="viewer-footer__type">{{ contentType }}</span>
        <span v-if="contentInfo" class="viewer-footer__path" :title="currentContent.path ?? ''">
          {{ contentInfo }}
        </span>
      </template>
    </div>

    <!-- 右侧：缩放和其他信息 -->
    <div class="viewer-footer__right">
      <span class="viewer-footer__zoom">{{ zoomPercent }}%</span>
    </div>
  </div>
</template>

<style scoped>
/**
 * 底部状态栏样式
 */
.viewer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 12px;
  font-size: 11px;
  background-color: var(--viewer-footer-bg, #f8f8f8);
  user-select: none;
}

/* 左侧 */
.viewer-footer__left {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 状态指示器 */
.viewer-footer__status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
}

.viewer-footer__status--ready {
  color: var(--viewer-ready-color, #52c41a);
}

.viewer-footer__status--loading {
  color: var(--viewer-loading-color, #1890ff);
}

.viewer-footer__status--viewing {
  color: var(--viewer-viewing-color, #1890ff);
}

.viewer-footer__status--error {
  color: var(--viewer-error-color, #ff4d4f);
}

/* 加载动画 */
.viewer-footer__spinner {
  width: 10px;
  height: 10px;
  border: 2px solid var(--viewer-loading-track, #e0e0e0);
  border-top-color: var(--viewer-loading-color, #1890ff);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.viewer-footer__text {
  color: var(--viewer-secondary-color, #666666);
}

/* 中间 */
.viewer-footer__center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.viewer-footer__type {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--viewer-type-color, #666666);
  background-color: var(--viewer-type-bg, #e8e8e8);
  border-radius: 3px;
}

.viewer-footer__path {
  color: var(--viewer-tertiary-color, #999999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

/* 右侧 */
.viewer-footer__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.viewer-footer__zoom {
  color: var(--viewer-secondary-color, #666666);
  min-width: 40px;
  text-align: right;
}

/* 暗色主题 */
:global(.theme-dark) .viewer-footer {
  --viewer-footer-bg: #252525;
  --viewer-secondary-color: #999999;
  --viewer-tertiary-color: #666666;
  --viewer-type-color: #999999;
  --viewer-type-bg: #3a3a3a;
  --viewer-ready-color: #67c23a;
  --viewer-loading-color: #409eff;
  --viewer-loading-track: #3a3a3a;
  --viewer-viewing-color: #409eff;
  --viewer-error-color: #ff6b6b;
}

/* 亮色主题 */
:global(.theme-light) .viewer-footer {
  --viewer-footer-bg: #f8f8f8;
  --viewer-secondary-color: #666666;
  --viewer-tertiary-color: #999999;
  --viewer-type-color: #666666;
  --viewer-type-bg: #e8e8e8;
  --viewer-ready-color: #52c41a;
  --viewer-loading-color: #1890ff;
  --viewer-loading-track: #e0e0e0;
  --viewer-viewing-color: #1890ff;
  --viewer-error-color: #ff4d4f;
}
</style>
