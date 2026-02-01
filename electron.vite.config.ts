import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@common': resolve(__dirname, 'src/common'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/preload/index.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@common': resolve(__dirname, 'src/common'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@common': resolve(__dirname, 'src/common'),
        '@renderer': resolve(__dirname, 'src/renderer'),
      },
    },
  },
});
