<script setup lang="ts">
/**
 * ContentLoading - 加载状态组件
 * @module @renderer/components/content/ContentLoading
 *
 * 功能：
 * - 显示加载动画
 * - 显示加载提示信息
 */
import { useTranslation } from '@renderer/composables/useTranslation';

const { t } = useTranslation();

// Props
withDefaults(
  defineProps<{
    /** 加载提示消息 */
    message?: string;
  }>(),
  {
    message: '',
  }
);
</script>

<template>
  <div class="content-loading">
    <!-- 加载动画 -->
    <div class="content-loading__spinner">
      <div class="content-loading__circle" />
    </div>

    <!-- 加载标题 -->
    <h3 class="content-loading__title">
      {{ t('content.loading.title') }}
    </h3>

    <!-- 加载消息 -->
    <p class="content-loading__message">
      {{ message || t('content.loading.description') }}
    </p>
  </div>
</template>

<style scoped>
/**
 * 加载状态样式
 */
.content-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
  text-align: center;
}

/* 加载动画容器 */
.content-loading__spinner {
  width: 48px;
  height: 48px;
  position: relative;
}

/* 加载圆环动画 */
.content-loading__circle {
  width: 100%;
  height: 100%;
  border: 3px solid var(--viewer-loading-track, #e0e0e0);
  border-top-color: var(--viewer-primary-color, #1890ff);
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

.content-loading__title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--viewer-text-color, #333333);
}

.content-loading__message {
  margin: 0;
  font-size: 14px;
  color: var(--viewer-secondary-color, #666666);
}

/* 暗色主题 */
:global(.theme-dark) .content-loading {
  --viewer-loading-track: #3a3a3a;
  --viewer-primary-color: #409eff;
  --viewer-text-color: #e0e0e0;
  --viewer-secondary-color: #999999;
}

/* 亮色主题 */
:global(.theme-light) .content-loading {
  --viewer-loading-track: #e0e0e0;
  --viewer-primary-color: #1890ff;
  --viewer-text-color: #333333;
  --viewer-secondary-color: #666666;
}
</style>
