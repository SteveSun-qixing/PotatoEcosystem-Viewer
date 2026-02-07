<script setup lang="ts">
/**
 * Chips Viewer 根组件
 *
 * 简洁的卡片查看器：
 * - 顶部标题栏（卡片名称 + 窗口控制按钮）
 * - 中间内容区（卡片渲染 / 空状态 / 加载中 / 错误）
 * - 底部状态栏（文件路径 + 缩放控制）
 */
import { onMounted, onUnmounted, watch, ref, nextTick } from 'vue';
import { useViewerStore } from './store';
import { getCardService } from './services';

const store = useViewerStore();
const cardService = getCardService();
const contentRef = ref<HTMLElement | null>(null);

// ========== 主题管理 ==========

function applyTheme(mode: string): void {
  if (mode === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  } else {
    document.documentElement.dataset.theme = mode;
  }
}

watch(() => store.theme, applyTheme, { immediate: true });

// ========== 文件操作 ==========

/** 打开文件对话框 */
async function handleOpenFile(): Promise<void> {
  try {
    const filePath = await window.electronAPI?.file.openDialog();
    if (filePath) {
      await openCardFile(filePath);
    }
  } catch (err) {
    console.error('[Viewer] Open file failed:', err);
    store.setError((err as Error).message);
  }
}

/** 打开卡片文件 */
async function openCardFile(filePath: string): Promise<void> {
  console.log('[Viewer] Opening card:', filePath);

  store.startLoading(filePath);

  // 更新窗口标题
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  window.electronAPI?.window.setTitle(`${fileName} - Chips Viewer`);

  try {
    // 1. 读取文件数据
    const fileData = await window.electronAPI.file.read(filePath);
    console.log('[Viewer] File read, size:', fileData.byteLength ?? (fileData as unknown as Uint8Array).length);

    // 2. 解析卡片
    const parser = cardService['_parser'];
    const uint8Data = fileData instanceof ArrayBuffer
      ? new Uint8Array(fileData)
      : new Uint8Array(fileData as unknown as ArrayBuffer);

    const parseResult = await parser.parse({ type: 'data', data: uint8Data });

    if (!parseResult.success || !parseResult.data) {
      console.error('[Viewer] Parse failed:', parseResult.error);
      store.setError(parseResult.error ?? 'Card parse failed');
      return;
    }

    const cardData = parseResult.data;
    console.log('[Viewer] Parsed card:', cardData.metadata.name, '- base cards:', cardData.baseCards.length);
    for (const bc of cardData.baseCards) {
      console.log('[Viewer]   Base card:', bc.id, bc.type, JSON.stringify(bc.config).slice(0, 100));
    }

    // 3. 先切换到 ready 状态，让容器变为可见
    store.setReady(cardData.metadata);

    // 4. 等待 DOM 更新，确保容器已经可见
    await nextTick();

    // 5. 现在渲染到可见的容器中
    if (!contentRef.value) {
      console.error('[Viewer] Content container not found');
      store.setError('Content container not available');
      return;
    }

    console.log('[Viewer] Rendering into container, visible:', contentRef.value.offsetWidth > 0);
    const mountResult = await cardService.renderParsedCard(
      cardData,
      contentRef.value,
      { isolationMode: 'iframe', cardGap: 0, containerPadding: 0 }
    );

    if (!mountResult.success) {
      console.error('[Viewer] Mount failed:', mountResult.error);
      store.setError(mountResult.error ?? 'Card render failed');
      return;
    }

    console.log('[Viewer] Card rendered successfully, mounted cards:', mountResult.mountedCards?.length);
    if (mountResult.warnings?.length) {
      console.warn('[Viewer] Warnings:', mountResult.warnings);
    }
  } catch (err) {
    console.error('[Viewer] Error:', err);
    store.setError((err as Error).message);
  }
}

/** 关闭当前卡片 */
function handleCloseCard(): void {
  cardService.destroyCurrentCard();
  store.closeCard();
  window.electronAPI?.window.setTitle('Chips Viewer');
}

// ========== 文件拖放 ==========

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  e.stopPropagation();
}

async function handleDrop(e: DragEvent): Promise<void> {
  e.preventDefault();
  e.stopPropagation();

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const file = files[0];

  // 尝试获取真实路径（Electron 环境）
  const filePath = window.electronAPI?.file.getPathForFile(file);
  if (filePath) {
    await openCardFile(filePath);
    return;
  }

  // Web 回退：直接读取文件数据
  if (contentRef.value) {
    store.startLoading(file.name);
    try {
      const data = await file.arrayBuffer();
      const parser = cardService['_parser'];
      const parseResult = await parser.parse({
        type: 'data',
        data: new Uint8Array(data),
      });

      if (!parseResult.success || !parseResult.data) {
        store.setError(parseResult.error ?? 'Card parse failed');
        return;
      }

      store.setReady(parseResult.data.metadata);
      await nextTick();

      const mountResult = await cardService.renderParsedCard(
        parseResult.data,
        contentRef.value!,
      );

      if (!mountResult.success) {
        store.setError(mountResult.error ?? 'Card render failed');
      }
    } catch (err) {
      store.setError((err as Error).message);
    }
  }
}

// ========== 快捷键 ==========

function handleKeyDown(e: KeyboardEvent): void {
  const isCtrl = e.ctrlKey || e.metaKey;

  if (isCtrl && e.key === 'o') {
    e.preventDefault();
    handleOpenFile();
  } else if (isCtrl && e.key === 'w') {
    e.preventDefault();
    handleCloseCard();
  } else if (isCtrl && e.key === '=') {
    e.preventDefault();
    store.zoomIn();
  } else if (isCtrl && e.key === '-') {
    e.preventDefault();
    store.zoomOut();
  } else if (isCtrl && e.key === '0') {
    e.preventDefault();
    store.zoomReset();
  } else if (e.key === 'F11') {
    e.preventDefault();
    window.electronAPI?.window.fullscreen();
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  if (store.theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (store.theme === 'system') applyTheme('system');
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  cardService.destroy();
});
</script>

<template>
  <div
    class="viewer"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <!-- 标题栏 -->
    <header class="viewer-header">
      <div class="viewer-header__left">
        <button class="viewer-header__btn" title="Open File (Ctrl+O)" @click="handleOpenFile">
          <span class="viewer-header__icon">📂</span>
        </button>
        <span v-if="store.cardName" class="viewer-header__title">{{ store.cardName }}</span>
        <span v-else class="viewer-header__title viewer-header__title--empty">Chips Viewer</span>
      </div>
      <div class="viewer-header__right">
        <button
          class="viewer-header__btn"
          title="Toggle Theme"
          @click="store.setTheme(store.theme === 'dark' ? 'light' : 'dark')"
        >
          <span class="viewer-header__icon">{{ store.theme === 'dark' ? '☀️' : '🌙' }}</span>
        </button>
        <button class="viewer-header__btn viewer-header__btn--window" @click="window.electronAPI?.window.minimize()">
          <span class="viewer-header__icon">—</span>
        </button>
        <button class="viewer-header__btn viewer-header__btn--window" @click="window.electronAPI?.window.maximize()">
          <span class="viewer-header__icon">□</span>
        </button>
        <button class="viewer-header__btn viewer-header__btn--close" @click="window.electronAPI?.window.close()">
          <span class="viewer-header__icon">✕</span>
        </button>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="viewer-content">
      <!--
        状态覆盖层（绝对定位在卡片容器上方）
        卡片容器始终保持在 DOM 中且参与布局，确保 iframe 渲染时能获得正确尺寸。
        状态覆盖层通过 z-index 遮盖在容器之上。
      -->

      <!-- 空状态覆盖层 -->
      <div v-if="store.isEmpty" class="viewer-overlay viewer-empty">
        <div class="viewer-empty__icon">📄</div>
        <div class="viewer-empty__text">Open a .card file to view</div>
        <div class="viewer-empty__hint">
          Drag &amp; drop a file here, or press Ctrl+O to open
        </div>
        <button class="viewer-empty__btn" @click="handleOpenFile">Open File</button>
      </div>

      <!-- 加载中覆盖层 -->
      <div v-if="store.isLoading" class="viewer-overlay viewer-loading">
        <div class="viewer-loading__spinner" />
        <div class="viewer-loading__text">Loading...</div>
      </div>

      <!-- 错误覆盖层 -->
      <div v-if="store.hasError" class="viewer-overlay viewer-error">
        <div class="viewer-error__icon">❌</div>
        <div class="viewer-error__text">{{ store.errorMessage }}</div>
        <div class="viewer-error__actions">
          <button class="viewer-error__btn" @click="handleCloseCard">Close</button>
          <button class="viewer-error__btn viewer-error__btn--primary" @click="handleOpenFile">
            Open Another
          </button>
        </div>
      </div>

      <!-- 卡片渲染容器（始终可见，不使用 display:none） -->
      <div
        ref="contentRef"
        class="viewer-card-container"
        :style="{ transform: `scale(${store.zoom / 100})`, transformOrigin: 'top center' }"
      />
    </main>

    <!-- 状态栏 -->
    <footer class="viewer-footer">
      <span v-if="store.filePath" class="viewer-footer__path">{{ store.filePath }}</span>
      <span class="viewer-footer__spacer" />
      <span class="viewer-footer__zoom">
        <button class="viewer-footer__zoom-btn" @click="store.zoomOut()">−</button>
        <span class="viewer-footer__zoom-value">{{ store.zoom }}%</span>
        <button class="viewer-footer__zoom-btn" @click="store.zoomIn()">+</button>
        <button class="viewer-footer__zoom-btn" @click="store.zoomReset()" title="Reset zoom">↺</button>
      </span>
    </footer>
  </div>
</template>

<style>
/* ========== 全局重置 ========== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
  background-color: var(--bg-color);
  -webkit-font-smoothing: antialiased;
}
#app { height: 100%; }

/* ========== CSS 变量 - 亮色主题 ========== */
:root {
  --primary-color: #1890ff;
  --primary-color-hover: #40a9ff;
  --text-color: #333;
  --text-color-secondary: #666;
  --text-color-tertiary: #999;
  --bg-color: #ffffff;
  --bg-color-secondary: #f5f5f5;
  --border-color: #e0e0e0;
  --header-height: 40px;
  --footer-height: 24px;
}

/* ========== CSS 变量 - 暗色主题 ========== */
[data-theme='dark'] {
  --text-color: #e0e0e0;
  --text-color-secondary: #a0a0a0;
  --text-color-tertiary: #707070;
  --bg-color: #1a1a1a;
  --bg-color-secondary: #252525;
  --border-color: #404040;
}

/* ========== 滚动条 ========== */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-color-tertiary); }
</style>

<style scoped>
/* ========== 布局 ========== */
.viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ========== 标题栏 ========== */
.viewer-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
}

.viewer-header__left,
.viewer-header__right {
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.viewer-header__title {
  margin-left: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
  -webkit-app-region: drag;
}

.viewer-header__title--empty {
  color: var(--text-color-tertiary);
}

.viewer-header__btn {
  width: 32px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-color-secondary);
  transition: background 0.15s;
}

.viewer-header__btn:hover { background: var(--bg-color-secondary); }
.viewer-header__btn--close:hover { background: #e81123; color: #fff; }

.viewer-header__icon { font-size: 12px; line-height: 1; }

/* ========== 内容区 ========== */
.viewer-content {
  flex: 1;
  overflow: auto;
  position: relative;
  background: var(--bg-color-secondary);
}

/* ========== 状态覆盖层（绝对定位在卡片容器上方） ========== */
.viewer-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-color-secondary);
}

/* ========== 空状态 ========== */
.viewer-empty { gap: 12px; }
.viewer-empty__icon { font-size: 48px; opacity: 0.6; }
.viewer-empty__text { font-size: 16px; color: var(--text-color-secondary); }
.viewer-empty__hint { font-size: 13px; color: var(--text-color-tertiary); }
.viewer-empty__btn {
  margin-top: 8px;
  padding: 8px 24px;
  font-size: 14px;
  color: #fff;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.viewer-empty__btn:hover { background: var(--primary-color-hover); }

/* ========== 加载中 ========== */
.viewer-loading { gap: 16px; }
.viewer-loading__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.viewer-loading__text { color: var(--text-color-secondary); font-size: 14px; }

/* ========== 错误状态 ========== */
.viewer-error { gap: 12px; padding: 24px; text-align: center; }
.viewer-error__icon { font-size: 36px; }
.viewer-error__text { color: #d32f2f; max-width: 480px; word-break: break-word; }
.viewer-error__actions { display: flex; gap: 12px; margin-top: 8px; }
.viewer-error__btn {
  padding: 6px 20px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
}
.viewer-error__btn--primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

/* ========== 卡片容器（始终可见，不使用 display:none） ========== */
.viewer-card-container {
  width: 100%;
  min-height: 100%;
}

/* ========== 状态栏 ========== */
.viewer-footer {
  height: var(--footer-height);
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
  font-size: 11px;
  color: var(--text-color-tertiary);
  flex-shrink: 0;
  user-select: none;
}

.viewer-footer__path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 50%;
}

.viewer-footer__spacer { flex: 1; }

.viewer-footer__zoom { display: flex; align-items: center; gap: 4px; }

.viewer-footer__zoom-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-color-tertiary);
  border-radius: 3px;
}

.viewer-footer__zoom-btn:hover {
  background: var(--bg-color-secondary);
  color: var(--text-color);
}

.viewer-footer__zoom-value { min-width: 36px; text-align: center; }
</style>
