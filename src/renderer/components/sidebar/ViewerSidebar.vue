<script setup lang="ts">
/**
 * ViewerSidebar - 侧边栏组件
 * @module @renderer/components/sidebar/ViewerSidebar
 *
 * 功能：
 * - 多标签页切换
 * - 文件信息显示
 * - 大纲导航
 * - 最近文件列表
 * - 书签管理
 */
import { computed, ref } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useTranslation } from '@renderer/composables/useTranslation';
import FileInfoPanel from './FileInfoPanel.vue';
import OutlinePanel from './OutlinePanel.vue';
import RecentFilesPanel from './RecentFilesPanel.vue';
import BookmarksPanel from './BookmarksPanel.vue';

// Store 和 Composables
const viewerStore = useViewerStore();
const { t } = useTranslation();

// 当前激活的标签页
const activeTab = ref<'info' | 'outline' | 'recent' | 'bookmarks'>('info');

// 计算属性
const currentContent = computed(() => viewerStore.currentContent);
const hasContent = computed(() => currentContent.value.type !== 'none');

// 标签页配置
const tabs = computed(() => [
  { id: 'info' as const, label: t('sidebar.info'), icon: 'info' },
  { id: 'outline' as const, label: t('sidebar.outline'), icon: 'outline' },
  { id: 'recent' as const, label: t('sidebar.recent'), icon: 'recent' },
  { id: 'bookmarks' as const, label: t('sidebar.bookmarks'), icon: 'bookmarks' },
]);

/**
 * 切换标签页
 */
const switchTab = (tabId: typeof activeTab.value): void => {
  activeTab.value = tabId;
};
</script>

<template>
  <div class="viewer-sidebar">
    <!-- 标签页头部 -->
    <div class="viewer-sidebar__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="viewer-sidebar__tab"
        :class="{ 'viewer-sidebar__tab--active': activeTab === tab.id }"
        type="button"
        :title="tab.label"
        @click="switchTab(tab.id)"
      >
        <!-- 图标 -->
        <span class="viewer-sidebar__tab-icon">
          <!-- Info 图标 -->
          <svg v-if="tab.icon === 'info'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <!-- Outline 图标 -->
          <svg v-else-if="tab.icon === 'outline'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <!-- Recent 图标 -->
          <svg v-else-if="tab.icon === 'recent'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <!-- Bookmarks 图标 -->
          <svg v-else-if="tab.icon === 'bookmarks'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span class="viewer-sidebar__tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- 标签页内容 -->
    <div class="viewer-sidebar__content">
      <!-- 文件信息 -->
      <template v-if="activeTab === 'info'">
        <FileInfoPanel v-if="hasContent" :content="currentContent" />
        <div v-else class="viewer-sidebar__empty">
          {{ t('sidebar.noFile') }}
        </div>
      </template>

      <!-- 大纲 -->
      <template v-else-if="activeTab === 'outline'">
        <OutlinePanel v-if="hasContent" :content="currentContent" />
        <div v-else class="viewer-sidebar__empty">
          {{ t('sidebar.noOutline') }}
        </div>
      </template>

      <!-- 最近文件 -->
      <template v-else-if="activeTab === 'recent'">
        <RecentFilesPanel />
      </template>

      <!-- 书签 -->
      <template v-else-if="activeTab === 'bookmarks'">
        <BookmarksPanel />
      </template>
    </div>
  </div>
</template>

<style scoped>
/**
 * 侧边栏样式
 */
.viewer-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--viewer-sidebar-bg, #fafafa);
}

/* 标签页头部 */
.viewer-sidebar__tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid var(--viewer-border-color, #e0e0e0);
  background-color: var(--viewer-tabs-bg, #f0f0f0);
}

/* 标签按钮 */
.viewer-sidebar__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 2px;
  padding: 8px 4px;
  color: var(--viewer-secondary-color, #666666);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.viewer-sidebar__tab:hover {
  color: var(--viewer-text-color, #333333);
  background-color: var(--viewer-tab-hover, rgba(0, 0, 0, 0.05));
}

.viewer-sidebar__tab--active {
  color: var(--viewer-primary-color, #1890ff);
  background-color: var(--viewer-sidebar-bg, #fafafa);
  border-bottom: 2px solid var(--viewer-primary-color, #1890ff);
  margin-bottom: -1px;
}

.viewer-sidebar__tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-sidebar__tab-label {
  font-size: 10px;
  white-space: nowrap;
}

/* 标签页内容 */
.viewer-sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* 空状态 */
.viewer-sidebar__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--viewer-tertiary-color, #999999);
  font-size: 13px;
}

/* 暗色主题 */
:global(.theme-dark) .viewer-sidebar {
  --viewer-sidebar-bg: #252525;
  --viewer-tabs-bg: #1e1e1e;
  --viewer-border-color: #3a3a3a;
  --viewer-text-color: #e0e0e0;
  --viewer-secondary-color: #999999;
  --viewer-tertiary-color: #666666;
  --viewer-primary-color: #409eff;
  --viewer-tab-hover: rgba(255, 255, 255, 0.05);
}

/* 亮色主题 */
:global(.theme-light) .viewer-sidebar {
  --viewer-sidebar-bg: #fafafa;
  --viewer-tabs-bg: #f0f0f0;
  --viewer-border-color: #e0e0e0;
  --viewer-text-color: #333333;
  --viewer-secondary-color: #666666;
  --viewer-tertiary-color: #999999;
  --viewer-primary-color: #1890ff;
  --viewer-tab-hover: rgba(0, 0, 0, 0.05);
}
</style>
