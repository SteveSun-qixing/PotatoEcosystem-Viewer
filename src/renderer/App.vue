<script setup lang="ts">
/**
 * Chips Viewer 根组件
 * @module @renderer/App
 */
import { onMounted, onUnmounted, ref, provide } from 'vue';
import { MainLayout } from './components/layout/MainLayout.vue';
import { useViewerApp } from './composables';
import { logger, eventBus } from './services';
import { EVENTS } from '@common/constants';

const log = logger.createChild('App');
const isInitializing = ref(true);
const initError = ref<string | null>(null);

// 获取 ViewerApp 实例
const { viewerApp, state, isReady, error } = useViewerApp();

// 提供给子组件
provide('viewerApp', viewerApp);

onMounted(async () => {
  log.info('App component mounted');

  try {
    // 初始化 ViewerApp
    if (viewerApp && !isReady.value) {
      await viewerApp.initialize();
    }

    isInitializing.value = false;
    log.info('App initialized successfully');

    // 发布就绪事件
    eventBus.emit(EVENTS.STATE_CHANGE, { appReady: true });
  } catch (err) {
    initError.value = (err as Error).message;
    isInitializing.value = false;
    log.error('App initialization failed', err as Error);
  }
});

onUnmounted(async () => {
  log.info('App component unmounting');

  if (viewerApp) {
    await viewerApp.destroy();
  }
});
</script>

<template>
  <div class="chips-viewer-app" :data-state="state">
    <!-- 初始化中 -->
    <div v-if="isInitializing" class="chips-viewer-app__initializing">
      <div class="chips-viewer-app__spinner" />
      <p class="chips-viewer-app__text">正在初始化...</p>
    </div>

    <!-- 初始化错误 -->
    <div v-else-if="initError" class="chips-viewer-app__error">
      <div class="chips-viewer-app__error-icon">❌</div>
      <h2>初始化失败</h2>
      <p>{{ initError }}</p>
      <button @click="() => window.location.reload()">重新加载</button>
    </div>

    <!-- 主布局 -->
    <MainLayout v-else />
  </div>
</template>

<style>
/* 全局重置 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
  background-color: var(--bg-color);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}

/* CSS 变量 - 亮色主题 */
:root {
  --primary-color: #1890ff;
  --primary-color-hover: #40a9ff;
  --primary-color-active: #096dd9;

  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #ff4d4f;

  --text-color: #333333;
  --text-color-secondary: #666666;
  --text-color-tertiary: #999999;

  --bg-color: #ffffff;
  --bg-color-secondary: #f5f5f5;
  --bg-color-tertiary: #fafafa;

  --border-color: #e0e0e0;
  --border-color-light: #f0f0f0;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  --header-height: 48px;
  --footer-height: 24px;
  --sidebar-width: 280px;
  --sidebar-min-width: 200px;
  --sidebar-max-width: 400px;

  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* CSS 变量 - 暗色主题 */
[data-theme='dark'] {
  --text-color: #e0e0e0;
  --text-color-secondary: #a0a0a0;
  --text-color-tertiary: #707070;

  --bg-color: #1a1a1a;
  --bg-color-secondary: #252525;
  --bg-color-tertiary: #2a2a2a;

  --border-color: #404040;
  --border-color-light: #353535;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}

/* 应用容器 */
.chips-viewer-app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 初始化状态 */
.chips-viewer-app__initializing {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.chips-viewer-app__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.chips-viewer-app__text {
  color: var(--text-color-secondary);
}

/* 错误状态 */
.chips-viewer-app__error {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.chips-viewer-app__error-icon {
  font-size: 48px;
}

.chips-viewer-app__error h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--error-color);
}

.chips-viewer-app__error p {
  color: var(--text-color-secondary);
  max-width: 400px;
}

.chips-viewer-app__error button {
  padding: 8px 24px;
  font-size: 14px;
  color: #fff;
  background-color: var(--primary-color);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.chips-viewer-app__error button:hover {
  background-color: var(--primary-color-hover);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-tertiary);
}

/* 选择样式 */
::selection {
  background: var(--primary-color);
  color: #fff;
}
</style>
