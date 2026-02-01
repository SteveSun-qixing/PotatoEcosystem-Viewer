<script setup lang="ts">
/**
 * OutlinePanel - 大纲面板
 * @module @renderer/components/sidebar/OutlinePanel
 *
 * 功能：
 * - 显示内容大纲
 * - 支持点击跳转
 */
import { computed } from 'vue';
import { useTranslation } from '@renderer/composables/useTranslation';
import type { CurrentContent } from '@common/types';

// Props
const props = defineProps<{
  /** 当前内容 */
  content: CurrentContent;
}>();

const { t } = useTranslation();

// 大纲项类型
interface OutlineItem {
  id: string;
  title: string;
  level: number;
  children?: OutlineItem[];
}

// 计算大纲（从内容中提取）
const outlineItems = computed<OutlineItem[]>(() => {
  // TODO: 从 content 中提取大纲数据
  // 这里需要根据实际的卡片/箱子数据结构来实现
  const data = props.content.data;
  if (!data) return [];

  // 示例：如果内容有 outline 字段
  if ('outline' in data && Array.isArray(data.outline)) {
    return data.outline as OutlineItem[];
  }

  return [];
});

const hasOutline = computed(() => outlineItems.value.length > 0);

/**
 * 处理大纲项点击
 */
const handleItemClick = (item: OutlineItem): void => {
  // TODO: 实现滚动到对应位置
  console.log('Outline item clicked:', item);
};
</script>

<template>
  <div class="outline-panel">
    <template v-if="hasOutline">
      <ul class="outline-panel__list">
        <li v-for="item in outlineItems" :key="item.id" class="outline-panel__item" :style="{ paddingLeft: `${(item.level - 1) * 16}px` }">
          <button class="outline-panel__link" type="button" @click="handleItemClick(item)">
            {{ item.title }}
          </button>
        </li>
      </ul>
    </template>

    <div v-else class="outline-panel__empty">
      {{ t('outline.empty') }}
    </div>
  </div>
</template>

<style scoped>
/**
 * 大纲面板样式
 */
.outline-panel {
  padding: 4px 0;
}

.outline-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.outline-panel__item {
  margin: 0;
}

.outline-panel__link {
  display: block;
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  color: var(--viewer-text-color, #333333);
  background-color: transparent;
  border: none;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.outline-panel__link:hover {
  background-color: var(--viewer-item-hover, rgba(0, 0, 0, 0.05));
}

.outline-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--viewer-tertiary-color, #999999);
  font-size: 13px;
}

/* 暗色主题 */
:global(.theme-dark) .outline-panel {
  --viewer-text-color: #e0e0e0;
  --viewer-tertiary-color: #666666;
  --viewer-item-hover: rgba(255, 255, 255, 0.05);
}

/* 亮色主题 */
:global(.theme-light) .outline-panel {
  --viewer-text-color: #333333;
  --viewer-tertiary-color: #999999;
  --viewer-item-hover: rgba(0, 0, 0, 0.05);
}
</style>
