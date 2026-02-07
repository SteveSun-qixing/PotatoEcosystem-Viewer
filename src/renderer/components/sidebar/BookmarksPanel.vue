<script setup lang="ts">
/**
 * BookmarksPanel - 书签面板
 * @module @renderer/components/sidebar/BookmarksPanel
 *
 * 功能：
 * - 显示书签列表
 * - 添加/删除书签
 * - 点击跳转到书签位置
 */
import { ref, computed, onMounted } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useViewerApp } from '@renderer/composables/useViewerApp';
import { useTranslation } from '@renderer/composables/useTranslation';
import { logger } from '@renderer/services';
import { generateId } from '@common/types';

const viewerStore = useViewerStore();
const { navigate } = useViewerApp();
const { t } = useTranslation();
const log = logger.createChild('BookmarksPanel');

// 书签类型
interface Bookmark {
  id: string;
  name: string;
  path: string;
  type: 'card' | 'box';
  position?: { x: number; y: number };
  createdAt: string;
}

// 书签列表
const bookmarks = ref<Bookmark[]>([]);

// 存储键
const STORAGE_KEY = 'viewer:bookmarks';

// 当前内容
const currentContent = computed(() => viewerStore.currentContent);
const hasContent = computed(() => currentContent.value.type !== 'none');

// 当前文件是否已被书签
const isBookmarked = computed(() => {
  if (!hasContent.value) return false;
  const path = currentContent.value.path;
  return bookmarks.value.some(b => b.path === path);
});

/**
 * 加载书签列表
 */
const loadBookmarks = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      bookmarks.value = JSON.parse(stored);
    }
  } catch (error) {
    log.error('Failed to load bookmarks', error as Error);
    bookmarks.value = [];
  }
};

/**
 * 保存书签列表
 */
const saveBookmarks = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks.value));
  } catch (error) {
    log.error('Failed to save bookmarks', error as Error);
  }
};

/**
 * 添加书签
 */
const handleAddBookmark = (): void => {
  if (!hasContent.value) return;

  const content = currentContent.value;
  const metadata = content.data?.metadata;

  const bookmark: Bookmark = {
    id: generateId(),
    name: metadata?.name ?? t('viewer.untitled'),
    path: content.path ?? '',
    type: content.type as 'card' | 'box',
    createdAt: new Date().toISOString(),
  };

  bookmarks.value.unshift(bookmark);
  saveBookmarks();
};

/**
 * 删除书签
 */
const handleRemoveBookmark = (id: string): void => {
  const index = bookmarks.value.findIndex(b => b.id === id);
  if (index !== -1) {
    bookmarks.value.splice(index, 1);
    saveBookmarks();
  }
};

/**
 * 打开书签
 */
const handleOpenBookmark = async (bookmark: Bookmark): Promise<void> => {
  try {
    await navigate({
      type: bookmark.type,
      path: bookmark.path,
    });
  } catch (error) {
    log.error('Failed to open bookmark', error as Error, { path: bookmark.path });
  }
};

// 生命周期
onMounted(() => {
  loadBookmarks();
});
</script>

<template>
  <div class="bookmarks-panel">
    <!-- 添加书签按钮 -->
    <div v-if="hasContent" class="bookmarks-panel__actions">
      <button
        class="bookmarks-panel__add"
        type="button"
        :disabled="isBookmarked"
        @click="handleAddBookmark"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          <line v-if="!isBookmarked" x1="12" y1="8" x2="12" y2="14" />
          <line v-if="!isBookmarked" x1="9" y1="11" x2="15" y2="11" />
        </svg>
        <span>{{ isBookmarked ? t('bookmarks.added') : t('bookmarks.add') }}</span>
      </button>
    </div>

    <!-- 书签列表 -->
    <ul v-if="bookmarks.length > 0" class="bookmarks-panel__list">
      <li v-for="bookmark in bookmarks" :key="bookmark.id" class="bookmarks-panel__item">
        <button class="bookmarks-panel__bookmark" type="button" @click="handleOpenBookmark(bookmark)">
          <!-- 图标 -->
          <span class="bookmarks-panel__icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <!-- 名称 -->
          <span class="bookmarks-panel__name">{{ bookmark.name }}</span>
        </button>
        <!-- 删除按钮 -->
        <button
          class="bookmarks-panel__remove"
          type="button"
          :title="t('bookmarks.remove')"
          @click.stop="handleRemoveBookmark(bookmark.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </li>
    </ul>

    <!-- 空状态 -->
    <div v-else class="bookmarks-panel__empty">
      {{ t('bookmarks.empty') }}
    </div>
  </div>
</template>

<style scoped>
/**
 * 书签面板样式
 */
.bookmarks-panel {
  padding: 4px 0;
}

/* 操作区 */
.bookmarks-panel__actions {
  padding: 4px 0;
  margin-bottom: 8px;
}

.bookmarks-panel__add {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--viewer-text-color, #333333);
  background-color: var(--viewer-button-bg, #f0f0f0);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.bookmarks-panel__add:hover:not(:disabled) {
  background-color: var(--viewer-button-hover, #e0e0e0);
}

.bookmarks-panel__add:disabled {
  color: var(--viewer-tertiary-color, #999999);
  cursor: not-allowed;
}

/* 书签列表 */
.bookmarks-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bookmarks-panel__item {
  display: flex;
  align-items: center;
  margin: 0;
}

.bookmarks-panel__bookmark {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 8px;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bookmarks-panel__bookmark:hover {
  background-color: var(--viewer-item-hover, rgba(0, 0, 0, 0.05));
}

.bookmarks-panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--viewer-primary-color, #1890ff);
}

.bookmarks-panel__name {
  font-size: 13px;
  color: var(--viewer-text-color, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmarks-panel__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--viewer-tertiary-color, #999999);
  background-color: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.bookmarks-panel__item:hover .bookmarks-panel__remove {
  opacity: 1;
}

.bookmarks-panel__remove:hover {
  color: var(--viewer-error-color, #ff4d4f);
  background-color: var(--viewer-item-hover, rgba(0, 0, 0, 0.05));
}

/* 空状态 */
.bookmarks-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--viewer-tertiary-color, #999999);
  font-size: 13px;
}

/* 暗色主题 */
:global(.theme-dark) .bookmarks-panel {
  --viewer-text-color: #e0e0e0;
  --viewer-tertiary-color: #666666;
  --viewer-primary-color: #409eff;
  --viewer-button-bg: #3a3a3a;
  --viewer-button-hover: #4a4a4a;
  --viewer-item-hover: rgba(255, 255, 255, 0.05);
  --viewer-error-color: #ff6b6b;
}

/* 亮色主题 */
:global(.theme-light) .bookmarks-panel {
  --viewer-text-color: #333333;
  --viewer-tertiary-color: #999999;
  --viewer-primary-color: #1890ff;
  --viewer-button-bg: #f0f0f0;
  --viewer-button-hover: #e0e0e0;
  --viewer-item-hover: rgba(0, 0, 0, 0.05);
  --viewer-error-color: #ff4d4f;
}
</style>
