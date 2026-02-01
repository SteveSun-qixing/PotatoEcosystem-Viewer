<script setup lang="ts">
/**
 * MainLayout - 主布局组件
 * @module @renderer/components/layout/MainLayout
 *
 * 布局结构：
 * ┌─────────────────────────────────────┐
 * │              Header                  │
 * ├─────────┬───────────────────────────┤
 * │         │                           │
 * │ Sidebar │       Content             │
 * │         │                           │
 * ├─────────┴───────────────────────────┤
 * │              Footer                  │
 * └─────────────────────────────────────┘
 *
 * 功能：
 * - 管理应用主要布局结构
 * - 控制侧边栏显示和宽度
 * - 响应式布局支持
 * - 支持暗色/亮色主题
 */
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useViewerStore } from '@renderer/store/viewer';
import ViewerHeader from '../header/ViewerHeader.vue';
import ViewerSidebar from '../sidebar/ViewerSidebar.vue';
import ViewerContent from './ViewerContent.vue';
import ViewerFooter from '../footer/ViewerFooter.vue';

// Store
const viewerStore = useViewerStore();

// 响应式状态
const sidebarVisible = computed(() => viewerStore.sidebarVisible);
const sidebarWidth = computed(() => viewerStore.sidebarWidth);
const currentTheme = computed(() => viewerStore.currentTheme);
const showToolbar = computed(() => viewerStore.viewOptions.showToolbar);
const showStatusBar = computed(() => viewerStore.viewOptions.showStatusBar);

// 侧边栏拖拽调整大小
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);

/**
 * 处理侧边栏宽度调整
 */
const handleSidebarResize = (width: number): void => {
  viewerStore.setSidebarWidth(width);
};

/**
 * 开始拖拽调整侧边栏大小
 */
const startResize = (event: MouseEvent): void => {
  isResizing.value = true;
  startX.value = event.clientX;
  startWidth.value = sidebarWidth.value;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

/**
 * 拖拽过程中
 */
const onResize = (event: MouseEvent): void => {
  if (!isResizing.value) return;

  const deltaX = event.clientX - startX.value;
  const newWidth = startWidth.value + deltaX;
  handleSidebarResize(newWidth);
};

/**
 * 结束拖拽
 */
const endResize = (): void => {
  if (!isResizing.value) return;

  isResizing.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

// 应用主题到 document
watch(
  currentTheme,
  newTheme => {
    // 移除旧主题类
    document.documentElement.classList.remove('theme-light', 'theme-dark');

    // 应用新主题
    if (newTheme === 'system') {
      // 检测系统主题
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

// 生命周期
onMounted(() => {
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', endResize);
  mediaQuery.addEventListener('change', handleMediaChange);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', endResize);
  mediaQuery.removeEventListener('change', handleMediaChange);
});
</script>

<template>
  <div class="viewer-layout">
    <!-- 头部导航栏 -->
    <header v-if="showToolbar" class="viewer-layout__header">
      <ViewerHeader />
    </header>

    <!-- 主体区域 -->
    <div class="viewer-layout__body">
      <!-- 侧边栏 -->
      <aside
        v-if="sidebarVisible"
        class="viewer-layout__sidebar"
        :style="{ width: `${sidebarWidth}px` }"
      >
        <ViewerSidebar />
        <!-- 侧边栏调整手柄 -->
        <div class="viewer-layout__sidebar-resizer" @mousedown="startResize" />
      </aside>

      <!-- 内容区 -->
      <main class="viewer-layout__content">
        <ViewerContent />
      </main>
    </div>

    <!-- 底部状态栏 -->
    <footer v-if="showStatusBar" class="viewer-layout__footer">
      <ViewerFooter />
    </footer>
  </div>
</template>

<style scoped>
/**
 * 主布局样式
 * 使用 CSS 变量支持主题切换
 */
.viewer-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--viewer-bg-color, #ffffff);
  color: var(--viewer-text-color, #333333);
}

/* 头部 */
.viewer-layout__header {
  flex-shrink: 0;
  height: var(--viewer-header-height, 48px);
  border-bottom: 1px solid var(--viewer-border-color, #e0e0e0);
  background-color: var(--viewer-header-bg, #f8f8f8);
}

/* 主体区域 */
.viewer-layout__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.viewer-layout__sidebar {
  position: relative;
  flex-shrink: 0;
  border-right: 1px solid var(--viewer-border-color, #e0e0e0);
  background-color: var(--viewer-sidebar-bg, #fafafa);
  overflow: hidden;
}

/* 侧边栏调整手柄 */
.viewer-layout__sidebar-resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s;
}

.viewer-layout__sidebar-resizer:hover {
  background-color: var(--viewer-primary-color, #1890ff);
}

/* 内容区 */
.viewer-layout__content {
  flex: 1;
  overflow: hidden;
  background-color: var(--viewer-content-bg, #ffffff);
}

/* 底部 */
.viewer-layout__footer {
  flex-shrink: 0;
  height: var(--viewer-footer-height, 24px);
  border-top: 1px solid var(--viewer-border-color, #e0e0e0);
  background-color: var(--viewer-footer-bg, #f8f8f8);
}

/* 暗色主题变量 */
:global(.theme-dark) .viewer-layout {
  --viewer-bg-color: #1e1e1e;
  --viewer-text-color: #e0e0e0;
  --viewer-border-color: #3a3a3a;
  --viewer-header-bg: #252525;
  --viewer-sidebar-bg: #252525;
  --viewer-content-bg: #1e1e1e;
  --viewer-footer-bg: #252525;
  --viewer-primary-color: #409eff;
}

/* 亮色主题变量 */
:global(.theme-light) .viewer-layout {
  --viewer-bg-color: #ffffff;
  --viewer-text-color: #333333;
  --viewer-border-color: #e0e0e0;
  --viewer-header-bg: #f8f8f8;
  --viewer-sidebar-bg: #fafafa;
  --viewer-content-bg: #ffffff;
  --viewer-footer-bg: #f8f8f8;
  --viewer-primary-color: #1890ff;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .viewer-layout__sidebar {
    position: absolute;
    left: 0;
    top: var(--viewer-header-height, 48px);
    bottom: var(--viewer-footer-height, 24px);
    z-index: 100;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }
}
</style>
