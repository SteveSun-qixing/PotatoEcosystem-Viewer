/**
 * 渲染进程入口
 * @module @renderer/main
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { logger } from './services';
import { setupShortcuts } from './core/shortcuts';
import { useConfigStore } from './store';

/**
 * 应用启动函数
 */
async function bootstrap(): Promise<void> {
  const log = logger.createChild('Bootstrap');
  const startTime = performance.now();

  try {
    log.info('Starting Chips Viewer...');

    // 1. 创建 Vue 应用
    const app = createApp(App);

    // 2. 使用 Pinia 状态管理
    const pinia = createPinia();
    app.use(pinia);

    // 3. 加载用户配置
    const configStore = useConfigStore(pinia);
    await configStore.loadConfig();
    log.debug('Config loaded');

    // 4. 应用主题
    applyTheme(configStore.theme);

    // 5. 监听主题变化
    configStore.$subscribe((mutation, state) => {
      if (mutation.type === 'direct') {
        applyTheme(state.theme);
      }
    });

    // 6. 挂载应用
    app.mount('#app');

    // 7. 设置快捷键
    setupShortcuts();
    log.debug('Shortcuts initialized');

    // 8. 监听系统主题变化
    if (configStore.theme === 'system') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (configStore.theme === 'system') {
          document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
        }
      });
    }

    const duration = performance.now() - startTime;
    log.info('Chips Viewer started successfully', { duration: `${duration.toFixed(2)}ms` });
  } catch (error) {
    log.error('Failed to start Chips Viewer', error as Error);

    // 显示错误信息
    document.body.innerHTML = `
      <div style="
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: system-ui;
        color: #333;
        text-align: center;
        padding: 24px;
      ">
        <h1 style="color: #ff4d4f; margin-bottom: 16px;">启动失败</h1>
        <p style="color: #666; max-width: 400px;">${(error as Error).message}</p>
        <button onclick="window.location.reload()" style="
          margin-top: 24px;
          padding: 8px 24px;
          background: #1890ff;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">重新加载</button>
      </div>
    `;

    throw error;
  }
}

/**
 * 应用主题
 */
function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

// 启动应用
bootstrap();
