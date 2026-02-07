<script setup lang="ts">
/**
 * RecentFilesPanel - 最近文件面板
 * @module @renderer/components/sidebar/RecentFilesPanel
 *
 * 功能：
 * - 显示最近打开的文件列表
 * - 支持点击打开文件
 * - 清除历史记录
 */
import { ref, onMounted } from 'vue';
import { useViewerApp } from '@renderer/composables/useViewerApp';
import { useTranslation } from '@renderer/composables/useTranslation';
import { logger, getLocale } from '@renderer/services';
import { CACHE_KEYS } from '@common/constants';

const { navigate } = useViewerApp();
const { t } = useTranslation();
const log = logger.createChild('RecentFilesPanel');

// 最近文件类型
interface RecentFile {
  path: string;
  name: string;
  type: 'card' | 'box';
  timestamp: string;
}

// 最近文件列表
const recentFiles = ref<RecentFile[]>([]);

/**
 * 加载最近文件列表
 */
const loadRecentFiles = (): void => {
  try {
    const stored = localStorage.getItem(CACHE_KEYS.RECENT_FILES);
    if (stored) {
      recentFiles.value = JSON.parse(stored);
    }
  } catch (error) {
    log.error('Failed to load recent files', error as Error);
    recentFiles.value = [];
  }
};

/**
 * 打开文件
 */
const handleOpenFile = async (file: RecentFile): Promise<void> => {
  try {
    await navigate({
      type: file.type,
      path: file.path,
    });
  } catch (error) {
    log.error('Failed to open recent file', error as Error, { path: file.path });
  }
};

/**
 * 清除历史记录
 */
const handleClearHistory = (): void => {
  recentFiles.value = [];
  localStorage.removeItem(CACHE_KEYS.RECENT_FILES);
};

/**
 * 格式化时间
 */
const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return t('recent.time.today');
    } else if (days === 1) {
      return t('recent.time.yesterday');
    } else if (days < 7) {
      return t('recent.time.daysAgo', { days });
    } else {
      return date.toLocaleDateString(getLocale());
    }
  } catch {
    return timestamp;
  }
};

/**
 * 从路径获取文件名
 */
const getFileName = (path: string): string => {
  const parts = path.split(/[/\\\\]/);
  return parts[parts.length - 1] || path;
};

// 生命周期
onMounted(() => {
  loadRecentFiles();
});
</script>

<template>
  <div class="recent-files-panel">
    <!-- 头部 -->
    <div v-if="recentFiles.length > 0" class="recent-files-panel__header">
      <span class="recent-files-panel__title">{{ t('recent.title') }}</span>
      <button class="recent-files-panel__clear" type="button" @click="handleClearHistory">
        {{ t('recent.clear') }}
      </button>
    </div>

    <!-- 文件列表 -->
    <ul v-if="recentFiles.length > 0" class="recent-files-panel__list">
      <li v-for="file in recentFiles" :key="file.path" class="recent-files-panel__item">
        <button class="recent-files-panel__file" type="button" @click="handleOpenFile(file)">
          <!-- 文件图标 -->
          <span class="recent-files-panel__icon">
            <svg v-if="file.type === 'card'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <!-- 文件信息 -->
          <span class="recent-files-panel__info">
            <span class="recent-files-panel__name">{{ file.name || getFileName(file.path) }}</span>
            <span class="recent-files-panel__time">{{ formatTime(file.timestamp) }}</span>
          </span>
        </button>
      </li>
    </ul>

    <!-- 空状态 -->
    <div v-else class="recent-files-panel__empty">
      {{ t('recent.empty') }}
    </div>
  </div>
</template>

<style scoped>
/**
 * 最近文件面板样式
 */
.recent-files-panel {
  padding: 4px 0;
}

/* 头部 */
.recent-files-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  margin-bottom: 8px;
}

.recent-files-panel__title {
  font-size: 11px;
  font-weight: 500;
  color: var(--viewer-secondary-color, #666666);
  text-transform: uppercase;
}

.recent-files-panel__clear {
  padding: 2px 8px;
  font-size: 11px;
  color: var(--viewer-tertiary-color, #999999);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.recent-files-panel__clear:hover {
  color: var(--viewer-error-color, #ff4d4f);
}

/* 文件列表 */
.recent-files-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-files-panel__item {
  margin: 0;
}

.recent-files-panel__file {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.recent-files-panel__file:hover {
  background-color: var(--viewer-item-hover, rgba(0, 0, 0, 0.05));
}

.recent-files-panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--viewer-secondary-color, #666666);
}

.recent-files-panel__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.recent-files-panel__name {
  font-size: 13px;
  color: var(--viewer-text-color, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-files-panel__time {
  font-size: 11px;
  color: var(--viewer-tertiary-color, #999999);
}

/* 空状态 */
.recent-files-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--viewer-tertiary-color, #999999);
  font-size: 13px;
}

/* 暗色主题 */
:global(.theme-dark) .recent-files-panel {
  --viewer-text-color: #e0e0e0;
  --viewer-secondary-color: #999999;
  --viewer-tertiary-color: #666666;
  --viewer-item-hover: rgba(255, 255, 255, 0.05);
  --viewer-error-color: #ff6b6b;
}

/* 亮色主题 */
:global(.theme-light) .recent-files-panel {
  --viewer-text-color: #333333;
  --viewer-secondary-color: #666666;
  --viewer-tertiary-color: #999999;
  --viewer-item-hover: rgba(0, 0, 0, 0.05);
  --viewer-error-color: #ff4d4f;
}
</style>
