<script setup lang="ts">
/**
 * ViewerContent - 内容区组件
 * @module @renderer/components/layout/ViewerContent
 *
 * 功能：
 * - 显示卡片或箱子内容
 * - 支持拖拽打开文件
 * - 缩放功能
 * - 加载、错误、空状态显示
 */
import { computed, ref, onMounted } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useViewerApp } from '@renderer/composables/useViewerApp';
import { useTranslation } from '@renderer/composables/useTranslation';
import { logger } from '@renderer/services';
import ContentEmpty from '../content/ContentEmpty.vue';
import ContentLoading from '../content/ContentLoading.vue';
import ContentError from '../content/ContentError.vue';

// Store 和 Composables
const viewerStore = useViewerStore();
const { navigate, setContainer } = useViewerApp();
const { t } = useTranslation();
const log = logger.createChild('ViewerContent');

// DOM 引用
const contentRef = ref<HTMLElement | null>(null);
const renderRef = ref<HTMLElement | null>(null);

// 拖拽状态
const isDragOver = ref(false);

// 计算属性
const currentContent = computed(() => viewerStore.currentContent);
const isLoading = computed(() => viewerStore.isLoading);
const loadingMessage = computed(() => viewerStore.loadingMessage);
const error = computed(() => viewerStore.error);
const hasContent = computed(() => currentContent.value.type !== 'none');

const parseFileUri = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'file:') {
      return null;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (/^\/[a-zA-Z]:\//.test(pathname)) {
      pathname = pathname.slice(1);
    }
    return pathname;
  } catch {
    return null;
  }
};

const extractPathFromTransferPayload = (dataTransfer: DataTransfer): string | null => {
  const uriList = dataTransfer.getData('text/uri-list');
  if (uriList) {
    const lines = uriList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    for (const line of lines) {
      const uriPath = parseFileUri(line);
      if (uriPath) {
        return uriPath;
      }
    }
  }

  const plainText = dataTransfer.getData('text/plain');
  if (plainText) {
    const uriPath = parseFileUri(plainText);
    if (uriPath) {
      return uriPath;
    }

    const textPath = plainText.trim();
    if (textPath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(textPath)) {
      return textPath;
    }
  }

  return null;
};

const resolveDroppedFilePath = (event: DragEvent, file: File): string | null => {
  const fileWithPath = file as File & { path?: string };
  if (typeof fileWithPath.path === 'string' && fileWithPath.path.trim()) {
    return fileWithPath.path;
  }

  if (window.electronAPI?.file?.getPathForFile) {
    const pathFromElectron = window.electronAPI.file.getPathForFile(file);
    if (typeof pathFromElectron === 'string' && pathFromElectron.trim()) {
      return pathFromElectron;
    }
  }

  if (event.dataTransfer) {
    return extractPathFromTransferPayload(event.dataTransfer);
  }

  return null;
};

/**
 * 处理拖拽进入
 */
const handleDragEnter = (event: DragEvent): void => {
  event.preventDefault();
  isDragOver.value = true;
};

/**
 * 处理拖拽离开
 */
const handleDragLeave = (event: DragEvent): void => {
  event.preventDefault();
  // 确保离开的是内容区而不是子元素
  const rect = contentRef.value?.getBoundingClientRect();
  if (rect) {
    const { clientX, clientY } = event;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      isDragOver.value = false;
    }
  }
};

/**
 * 处理拖拽经过
 */
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
};

/**
 * 处理文件拖放
 */
const handleDrop = async (event: DragEvent): Promise<void> => {
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    const fileName = file.name.toLowerCase();

    // 检查文件扩展名
    if (fileName.endsWith('.card') || fileName.endsWith('.box')) {
      const type = fileName.endsWith('.card') ? 'card' : 'box';
      const path = resolveDroppedFilePath(event, file);
      if (!path) {
        const message = type === 'card' ? t('content.error.openCardFailed') : t('content.error.openBoxFailed');
        viewerStore.setError(message);
        log.error('Dropped file path cannot be resolved', new Error(message), { fileName });
        return;
      }

      try {
        await navigate({
          type,
          path,
        });
      } catch (err) {
        log.error('Failed to open dropped file', err as Error, { type, path });
      }
    } else {
      log.warn('Unsupported file extension', { fileName });
    }
  }
};

/**
 * 处理重试
 */
const handleRetry = (): void => {
  const path = currentContent.value.path;
  const type = currentContent.value.type;
  if (path && type !== 'none') {
    navigate({ type, path });
  }
};

/**
 * 处理关闭错误
 */
const handleCloseError = (): void => {
  viewerStore.setError(null);
  viewerStore.clearContent();
};

/**
 * 设置渲染容器
 */
onMounted(() => {
  if (renderRef.value) {
    setContainer(renderRef.value);
  } else {
    log.warn('Render container is null on mount');
  }
});

/**
 * 清理
 */
</script>

<template>
  <div
    ref="contentRef"
    class="viewer-content"
    :class="{
      'viewer-content--drag-over': isDragOver,
      'viewer-content--loading': isLoading,
      'viewer-content--error': error,
      'viewer-content--empty': !hasContent && !isLoading && !error,
    }"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
  >
    <!-- 加载中 -->
    <ContentLoading v-if="isLoading" :message="loadingMessage" />

    <!-- 错误状态 -->
    <ContentError v-else-if="error" :error="error" @retry="handleRetry" @close="handleCloseError" />

    <div v-else class="viewer-content__body">
      <ContentEmpty v-if="!hasContent" />

      <!-- 内容渲染区（始终存在，通过 v-show 控制显示） -->
      <div ref="renderRef" class="viewer-content__render" :class="{ 'viewer-content__render--hidden': !hasContent }">
        <!-- 卡片/箱子内容会被挂载到这里 -->
        <slot />
      </div>
    </div>

    <!-- 拖拽提示遮罩 -->
    <div v-if="isDragOver" class="viewer-content__drop-overlay">
      <div class="viewer-content__drop-hint">
        <span class="viewer-content__drop-icon">📂</span>
        <span class="viewer-content__drop-text">{{ t('content.drop.hint') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--bg-color, #fff);
}

.viewer-content--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-content__body {
  width: 100%;
  height: 100%;
  position: relative;
}

.viewer-content__render {
  width: 100%;
  height: 100%;
  min-height: 100%;
  padding: 24px;
  overflow: auto;
}

.viewer-content__render--hidden {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}

.viewer-content__render :deep(.chips-viewer-card) {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e7ee;
  box-shadow: 0 10px 24px rgba(33, 41, 53, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.viewer-content__render :deep(.chips-viewer-base-card-empty),
.viewer-content__render :deep(.chips-viewer-card-empty) {
  padding: 14px 16px;
  border: 1px dashed #c3cad3;
  border-radius: 10px;
  color: #6f7782;
  font-size: 13px;
  background: #f7f9fc;
}

/* 拖拽提示 */
.viewer-content__drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
}

.viewer-content__drop-hint {
  padding: 24px 40px;
  background: var(--hint-bg, #fff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.viewer-content__drop-text {
  font-size: 16px;
  color: var(--text-color, #333);
}

.viewer-content__drop-icon {
  display: none;
}

:global(.theme-light) .viewer-content {
  --bg-color: #fff;
  --hint-bg: #fff;
  --text-color: #333;
}

:global(.theme-dark) .viewer-content {
  --bg-color: #1a1a1a;
  --hint-bg: #2a2a2a;
  --text-color: #e0e0e0;
}

:global(.theme-dark) .viewer-content__render :deep(.chips-viewer-card) {
  background: #20242b;
  border-color: #363f4a;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
}

:global(.theme-dark) .viewer-content__render :deep(.chips-viewer-base-card-empty),
:global(.theme-dark) .viewer-content__render :deep(.chips-viewer-card-empty) {
  border-color: #485363;
  background: #2a313a;
  color: #c6d0dc;
}
</style>
