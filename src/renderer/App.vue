<script setup lang="ts">
/**
 * Chips Viewer 根组件
 */
import { onMounted, ref } from 'vue';
import { logger, eventBus } from './services';
import { EVENTS } from '@common/constants';

const log = logger.createChild('App');
const isReady = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  log.info('App component mounted');

  // 标记为就绪
  isReady.value = true;

  // 发布就绪事件
  eventBus.emit(EVENTS.STATE_CHANGE, { appReady: true });
});
</script>

<template>
  <div class="chips-viewer">
    <!-- 加载中状态 -->
    <div v-if="!isReady" class="chips-viewer__loading">
      <div class="chips-viewer__loading-spinner" />
      <span class="chips-viewer__loading-text">Loading...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="chips-viewer__error">
      <span class="chips-viewer__error-text">{{ error }}</span>
    </div>

    <!-- 主内容区 -->
    <div v-else class="chips-viewer__main">
      <!-- 头部导航栏 -->
      <header class="chips-viewer__header">
        <h1 class="chips-viewer__title">Chips Viewer</h1>
      </header>

      <!-- 主体区域 -->
      <main class="chips-viewer__content">
        <div class="chips-viewer__empty">
          <p>拖拽 .card 或 .box 文件到此处打开</p>
          <p>或使用 Ctrl+O 打开文件</p>
        </div>
      </main>

      <!-- 底部状态栏 -->
      <footer class="chips-viewer__footer">
        <span class="chips-viewer__status">Ready</span>
      </footer>
    </div>
  </div>
</template>
