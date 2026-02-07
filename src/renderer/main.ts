/**
 * 渲染进程入口
 * @module @renderer/main
 *
 * 简洁的启动流程：创建 Vue 应用 → 挂载
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
