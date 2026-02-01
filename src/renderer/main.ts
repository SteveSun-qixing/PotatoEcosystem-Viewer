/**
 * 渲染进程入口
 * @module @renderer/main
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { logger } from './services';

async function bootstrap(): Promise<void> {
  const log = logger.createChild('Bootstrap');

  try {
    log.info('Starting Chips Viewer...');

    // 创建 Vue 应用
    const app = createApp(App);

    // 使用 Pinia 状态管理
    const pinia = createPinia();
    app.use(pinia);

    // 挂载应用
    app.mount('#app');

    log.info('Chips Viewer started successfully');
  } catch (error) {
    log.error('Failed to start Chips Viewer', error as Error);
    throw error;
  }
}

bootstrap();
