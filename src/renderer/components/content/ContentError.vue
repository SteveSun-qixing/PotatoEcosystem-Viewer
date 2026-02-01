<script setup lang="ts">
/**
 * ContentError - 错误状态组件
 * @module @renderer/components/content/ContentError
 *
 * 功能：
 * - 显示错误信息
 * - 提供重试和关闭操作
 */
import { useTranslation } from '@renderer/composables/useTranslation';

const { t } = useTranslation();

// Props
const props = defineProps<{
  /** 错误信息 */
  error: string;
}>();

// Events
const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'close'): void;
}>();

/**
 * 处理重试
 */
const handleRetry = (): void => {
  emit('retry');
};

/**
 * 处理关闭
 */
const handleClose = (): void => {
  emit('close');
};
</script>

<template>
  <div class="content-error">
    <!-- 错误图标 -->
    <div class="content-error__icon">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>

    <!-- 错误标题 -->
    <h3 class="content-error__title">
      {{ t('content.error.title') }}
    </h3>

    <!-- 错误信息 -->
    <p class="content-error__message">
      {{ error }}
    </p>

    <!-- 操作按钮 -->
    <div class="content-error__actions">
      <button class="content-error__button content-error__button--primary" type="button" @click="handleRetry">
        {{ t('content.error.retry') }}
      </button>
      <button class="content-error__button content-error__button--secondary" type="button" @click="handleClose">
        {{ t('content.error.close') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/**
 * 错误状态样式
 */
.content-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
  text-align: center;
}

.content-error__icon {
  color: var(--viewer-error-color, #ff4d4f);
}

.content-error__title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: var(--viewer-text-color, #333333);
}

.content-error__message {
  margin: 0;
  font-size: 14px;
  color: var(--viewer-secondary-color, #666666);
  max-width: 400px;
  line-height: 1.6;
  word-break: break-word;
}

.content-error__actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.content-error__button {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.content-error__button--primary {
  color: #ffffff;
  background-color: var(--viewer-primary-color, #1890ff);
}

.content-error__button--primary:hover {
  background-color: var(--viewer-primary-hover, #40a9ff);
}

.content-error__button--secondary {
  color: var(--viewer-text-color, #333333);
  background-color: var(--viewer-button-bg, #f0f0f0);
}

.content-error__button--secondary:hover {
  background-color: var(--viewer-button-hover, #e0e0e0);
}

/* 暗色主题 */
:global(.theme-dark) .content-error {
  --viewer-error-color: #ff6b6b;
  --viewer-text-color: #e0e0e0;
  --viewer-secondary-color: #999999;
  --viewer-primary-color: #409eff;
  --viewer-primary-hover: #66b1ff;
  --viewer-button-bg: #3a3a3a;
  --viewer-button-hover: #4a4a4a;
}

/* 亮色主题 */
:global(.theme-light) .content-error {
  --viewer-error-color: #ff4d4f;
  --viewer-text-color: #333333;
  --viewer-secondary-color: #666666;
  --viewer-primary-color: #1890ff;
  --viewer-primary-hover: #40a9ff;
  --viewer-button-bg: #f0f0f0;
  --viewer-button-hover: #e0e0e0;
}
</style>
