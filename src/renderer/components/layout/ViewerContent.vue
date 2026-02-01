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
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import { useViewerApp } from '@renderer/composables/useViewerApp';
import ContentEmpty from '../content/ContentEmpty.vue';
import ContentLoading from '../content/ContentLoading.vue';
import ContentError from '../content/ContentError.vue';

// Store 和 Composables
const viewerStore = useViewerStore();
const { viewerApp, navigate, setContainer } = useViewerApp();

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
const zoom = computed(() => viewerStore.viewOptions.zoom);
const hasContent = computed(() => currentContent.value.type !== 'none');

/**
 * 监听缩放变化，应用缩放样式
 */
watch(zoom, newZoom => {
  if (renderRef.value) {
    renderRef.value.style.transform = `scale(${newZoom})`;
    renderRef.value.style.transformOrigin = 'top left';
  }
});

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

  console.log('[ViewerContent] handleDrop triggered');

  const files = event.dataTransfer?.files;
  console.log('[ViewerContent] Files dropped:', files?.length);

  if (files && files.length > 0) {
    const file = files[0];
    const fileName = file.name.toLowerCase();
    console.log('[ViewerContent] File name:', fileName);

    // 检查文件扩展名
    if (fileName.endsWith('.card') || fileName.endsWith('.box')) {
      const type = fileName.endsWith('.card') ? 'card' : 'box';
      // 使用 file.path 获取完整路径（Electron 环境）
      const filePath = (file as File & { path?: string }).path;
      console.log('[ViewerContent] File path from Electron:', filePath);

      const path = filePath ?? file.name;
      console.log('[ViewerContent] Final path:', path);
      console.log('[ViewerContent] renderRef.value:', renderRef.value);

      try {
        console.log('[ViewerContent] Calling navigate with:', { type, path });
        await navigate({
          type,
          path,
        });
        console.log('[ViewerContent] Navigate completed');
      } catch (err) {
        console.error('[ViewerContent] Failed to open dropped file:', err);
      }
    } else {
      console.log('[ViewerContent] File extension not supported:', fileName);
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
  console.log('[ViewerContent] onMounted, renderRef.value:', renderRef.value);
  if (renderRef.value) {
    console.log('[ViewerContent] Setting container');
    setContainer(renderRef.value);
  } else {
    console.warn('[ViewerContent] renderRef is null in onMounted');
  }
});

/**
 * 清理
 */
onUnmounted(() => {
  // 清理工作（如果需要）
});
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

    <!-- 空状态 -->
    <ContentEmpty v-else-if="!hasContent" />

    <!-- 内容渲染区（始终存在，通过 v-show 控制显示） -->
    <div ref="renderRef" class="viewer-content__render" :class="{ 'viewer-content__render--hidden': !hasContent }">
      <!-- 卡片/箱子内容会被挂载到这里 -->
      <slot />
    </div>

    <!-- 拖拽提示遮罩 -->
    <div v-if="isDragOver" class="viewer-content__drop-overlay">
      <div class="viewer-content__drop-hint">
        <span class="viewer-content__drop-icon">📂</span>
        <span class="viewer-content__drop-text">释放以打开文件</span>
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
  background-color: var(--bg-color, #fff);
}

.viewer-content--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-content__render {
  width: 100%;
  height: 100%;
}

.viewer-content__render--hidden {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
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

:global(.theme-dark) .viewer-content {
  --bg-color: #1a1a1a;
  --hint-bg: #2a2a2a;
  --text-color: #e0e0e0;
}

:global(.theme-light) .viewer-content {
  --bg-color: #fff;
  --hint-bg: #fff;
  --text-color: #333;
}
</style>
