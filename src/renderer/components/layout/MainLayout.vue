<script setup lang="ts">
/**
 * MainLayout - 主布局组件（简洁版）
 * @module @renderer/components/layout/MainLayout
 *
 * 简洁的查看器布局，类似图片查看器
 * 只有内容区，无侧边栏、工具栏、状态栏
 */
import { computed, watch, onMounted, onUnmounted } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import ViewerContent from './ViewerContent.vue';

// Store
const viewerStore = useViewerStore();
const currentTheme = computed(() => viewerStore.currentTheme);

// 应用主题到 document
watch(
  currentTheme,
  newTheme => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    } else {
      document.documentElement.classList.add(`theme-${newTheme}`);
    }
  },
  { immediate: true }
);

// 监听系统主题变化
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const handleMediaChange = (e: MediaQueryListEvent): void => {
  if (currentTheme.value === 'system') {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(e.matches ? 'theme-dark' : 'theme-light');
  }
};

onMounted(() => {
  mediaQuery.addEventListener('change', handleMediaChange);
});

onUnmounted(() => {
  mediaQuery.removeEventListener('change', handleMediaChange);
});
</script>

<template>
  <div class="viewer-layout">
    <ViewerContent />
  </div>
</template>

<style scoped>
.viewer-layout {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--viewer-bg-color, #ffffff);
  color: var(--viewer-text-color, #333333);
}

/* 暗色主题 */
:global(.theme-dark) .viewer-layout {
  --viewer-bg-color: #1a1a1a;
  --viewer-text-color: #e0e0e0;
}

/* 亮色主题 */
:global(.theme-light) .viewer-layout {
  --viewer-bg-color: #ffffff;
  --viewer-text-color: #333333;
}
</style>
