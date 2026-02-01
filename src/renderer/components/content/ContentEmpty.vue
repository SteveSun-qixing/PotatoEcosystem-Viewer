<script setup lang="ts">
/**
 * ContentEmpty - 空状态组件
 * @module @renderer/components/content/ContentEmpty
 *
 * 功能：
 * - 显示欢迎信息
 * - 提供打开文件按钮
 * - 提示拖拽操作
 */
import { useTranslation } from '@renderer/composables/useTranslation';

const { t } = useTranslation();

// 事件
const emit = defineEmits<{
  (e: 'open'): void;
}>();

/**
 * 处理打开文件
 */
const handleOpen = async (): Promise<void> => {
  // 调用 Electron API 打开文件对话框
  if (window.electronAPI?.file?.openDialog) {
    try {
      const result = await window.electronAPI.file.openDialog();
      if (result) {
        emit('open');
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  }
};
</script>

<template>
  <div class="content-empty">
    <!-- 图标 -->
    <div class="content-empty__icon">
      <svg
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    </div>

    <!-- 标题 -->
    <h2 class="content-empty__title">
      {{ t('content.empty.title') }}
    </h2>

    <!-- 描述 -->
    <p class="content-empty__description">
      {{ t('content.empty.description') }}
    </p>

    <!-- 打开按钮 -->
    <button class="content-empty__button" type="button" @click="handleOpen">
      {{ t('content.empty.openButton') }}
    </button>

    <!-- 支持的格式提示 -->
    <p class="content-empty__formats">支持 .card 和 .box 格式文件</p>
  </div>
</template>

<style scoped>
/**
 * 空状态样式
 */
.content-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
  text-align: center;
  user-select: none;
}

.content-empty__icon {
  color: var(--viewer-icon-color, #999999);
  margin-bottom: 8px;
}

.content-empty__title {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
  color: var(--viewer-text-color, #333333);
}

.content-empty__description {
  margin: 0;
  font-size: 14px;
  color: var(--viewer-secondary-color, #666666);
  max-width: 300px;
  line-height: 1.6;
}

.content-empty__button {
  margin-top: 8px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  background-color: var(--viewer-primary-color, #1890ff);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.content-empty__button:hover {
  background-color: var(--viewer-primary-hover, #40a9ff);
  transform: translateY(-1px);
}

.content-empty__button:active {
  transform: translateY(0);
}

.content-empty__formats {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--viewer-tertiary-color, #999999);
}

/* 暗色主题 */
:global(.theme-dark) .content-empty {
  --viewer-icon-color: #666666;
  --viewer-text-color: #e0e0e0;
  --viewer-secondary-color: #999999;
  --viewer-tertiary-color: #666666;
  --viewer-primary-color: #409eff;
  --viewer-primary-hover: #66b1ff;
}

/* 亮色主题 */
:global(.theme-light) .content-empty {
  --viewer-icon-color: #999999;
  --viewer-text-color: #333333;
  --viewer-secondary-color: #666666;
  --viewer-tertiary-color: #999999;
  --viewer-primary-color: #1890ff;
  --viewer-primary-hover: #40a9ff;
}
</style>
