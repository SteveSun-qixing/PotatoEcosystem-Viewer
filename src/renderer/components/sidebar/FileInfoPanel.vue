<script setup lang="ts">
/**
 * FileInfoPanel - 文件信息面板
 * @module @renderer/components/sidebar/FileInfoPanel
 *
 * 功能：
 * - 显示当前文件的详细信息
 * - 文件名、类型、创建时间、修改时间
 * - 标签和描述
 */
import { computed } from 'vue';
import { useTranslation } from '@renderer/composables/useTranslation';
import { getLocale } from '@renderer/services';
import type { CurrentContent } from '@common/types';

// Props
const props = defineProps<{
  /** 当前内容 */
  content: CurrentContent;
}>();

const { t } = useTranslation();

// 计算属性
const metadata = computed(() => props.content.data?.metadata);
const isCard = computed(() => props.content.type === 'card');

/**
 * 格式化日期
 */
const formattedDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString(getLocale());
  } catch {
    return dateStr;
  }
};

/**
 * 格式化标签
 */
const formatTag = (tag: string | string[]): string => {
  if (Array.isArray(tag)) {
    return tag.join(':');
  }
  return String(tag);
};
</script>

<template>
  <div class="file-info-panel">
    <div v-if="metadata" class="file-info-panel__card">
      <!-- 名称 -->
      <div class="file-info-panel__item">
        <span class="file-info-panel__label">{{ t('fileInfo.name') }}</span>
        <span class="file-info-panel__value">{{ metadata.name || '-' }}</span>
      </div>

      <!-- 类型 -->
      <div class="file-info-panel__item">
        <span class="file-info-panel__label">{{ t('fileInfo.type') }}</span>
        <span class="file-info-panel__value file-info-panel__value--type">
          <span class="file-info-panel__type-badge" :class="{ 'file-info-panel__type-badge--card': isCard }">
            {{ isCard ? t('fileInfo.card') : t('fileInfo.box') }}
          </span>
        </span>
      </div>

      <!-- 创建时间 -->
      <div class="file-info-panel__item">
        <span class="file-info-panel__label">{{ t('fileInfo.createdAt') }}</span>
        <span class="file-info-panel__value">{{ formattedDate(metadata.created_at) }}</span>
      </div>

      <!-- 修改时间 -->
      <div class="file-info-panel__item">
        <span class="file-info-panel__label">{{ t('fileInfo.modifiedAt') }}</span>
        <span class="file-info-panel__value">{{ formattedDate(metadata.modified_at) }}</span>
      </div>

      <!-- 标签 -->
      <div v-if="metadata.tags?.length" class="file-info-panel__item file-info-panel__item--tags">
        <span class="file-info-panel__label">{{ t('fileInfo.tags') }}</span>
        <div class="file-info-panel__tags">
          <span v-for="(tag, index) in metadata.tags" :key="index" class="file-info-panel__tag">
            {{ formatTag(tag) }}
          </span>
        </div>
      </div>

      <!-- 描述 -->
      <div v-if="metadata.description" class="file-info-panel__item file-info-panel__item--description">
        <span class="file-info-panel__label">{{ t('fileInfo.description') }}</span>
        <p class="file-info-panel__description">{{ metadata.description }}</p>
      </div>
    </div>

    <!-- 无元数据 -->
    <div v-else class="file-info-panel__empty">{{ t('sidebar.noFile') }}</div>
  </div>
</template>

<style scoped>
/**
 * 文件信息面板样式
 */
.file-info-panel {
  padding: 4px 0;
}

.file-info-panel__card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 信息项 */
.file-info-panel__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-info-panel__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--viewer-secondary-color, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.file-info-panel__value {
  font-size: 13px;
  color: var(--viewer-text-color, #333333);
  word-break: break-word;
}

/* 类型徽章 */
.file-info-panel__type-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #ffffff;
  background-color: var(--viewer-box-color, #52c41a);
  border-radius: 4px;
}

.file-info-panel__type-badge--card {
  background-color: var(--viewer-card-color, #1890ff);
}

/* 标签 */
.file-info-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.file-info-panel__tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--viewer-text-color, #333333);
  background-color: var(--viewer-tag-bg, #f0f0f0);
  border-radius: 4px;
}

/* 描述 */
.file-info-panel__description {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--viewer-text-color, #333333);
}

/* 空状态 */
.file-info-panel__empty {
  text-align: center;
  color: var(--viewer-tertiary-color, #999999);
  font-size: 13px;
  padding: 20px;
}

/* 暗色主题 */
:global(.theme-dark) .file-info-panel {
  --viewer-text-color: #e0e0e0;
  --viewer-secondary-color: #999999;
  --viewer-tertiary-color: #666666;
  --viewer-tag-bg: #3a3a3a;
  --viewer-card-color: #409eff;
  --viewer-box-color: #67c23a;
}

/* 亮色主题 */
:global(.theme-light) .file-info-panel {
  --viewer-text-color: #333333;
  --viewer-secondary-color: #666666;
  --viewer-tertiary-color: #999999;
  --viewer-tag-bg: #f0f0f0;
  --viewer-card-color: #1890ff;
  --viewer-box-color: #52c41a;
}
</style>
