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

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    const fileName = file.name.toLowerCase();

    // 检查文件扩展名
    if (fileName.endsWith('.card') || fileName.endsWith('.box')) {
      const type = fileName.endsWith('.card') ? 'card' : 'box';
      // 使用 file.path 获取完整路径（Electron 环境）
      const path = (file as File & { path?: string }).path ?? file.name;

      try {
        await navigate({
          type,
          path,
        });
      } catch (err) {
        console.error('Failed to open dropped file:', err);
      }
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

    <!-- 内容渲染区 -->
    <div v-else ref="renderRef" class="viewer-content__render">
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
/**
 * 内容区样式
 */
.viewer-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--viewer-content-bg, #ffffff);
}

/* 内容渲染区 */
.viewer-content__render {
  width: 100%;
  height: 100%;
  transform-origin: top left;
  transition: transform 0.2s ease;
}

/* 拖拽悬停样式 */
.viewer-content--drag-over {
  background-color: var(--viewer-drag-bg, rgba(24, 144, 255, 0.05));
}

/* 拖拽提示遮罩 */
.viewer-content__drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 100;
}

.viewer-content__drop-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 48px;
  background-color: var(--viewer-card-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.viewer-content__drop-icon {
  font-size: 48px;
}

.viewer-content__drop-text {
  font-size: 18px;
  color: var(--viewer-text-color, #333333);
}

/* 暗色主题 */
:global(.theme-dark) .viewer-content {
  --viewer-content-bg: #1e1e1e;
  --viewer-drag-bg: rgba(64, 158, 255, 0.1);
  --viewer-card-bg: #2a2a2a;
  --viewer-text-color: #e0e0e0;
}

/* 亮色主题 */
:global(.theme-light) .viewer-content {
  --viewer-content-bg: #ffffff;
  --viewer-drag-bg: rgba(24, 144, 255, 0.05);
  --viewer-card-bg: #ffffff;
  --viewer-text-color: #333333;
}
</style>
