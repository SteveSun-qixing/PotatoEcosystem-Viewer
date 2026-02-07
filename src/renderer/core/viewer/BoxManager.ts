/**
 * BoxManager - 箱子管理器
 * @module @renderer/core/viewer/BoxManager
 */
import type { IBoxManager, IEventBus, IPluginManager } from '@common/interfaces';
import type { Box, BoxMetadata, BoxRenderOptions, BoxRenderResult } from '@common/types';
import type { SDKService } from '@renderer/services';
import { Logger, translate, getLocale } from '@renderer/services';
import { EVENTS } from '@common/constants';

/**
 * BoxManager - 箱子管理器
 *
 * 职责：
 * 1. 加载箱子文件
 * 2. 调用 Foundation 的 BoxRenderer 进行渲染
 * 3. 管理当前打开的箱子
 * 4. 处理布局切换
 */
export class BoxManager implements IBoxManager {
  private currentBox: Box | null = null;
  private currentFrame: HTMLIFrameElement | null = null;
  private currentContainer: HTMLElement | null = null;
  private currentLayout: string | null = null;

  private readonly sdkService: SDKService;
  private readonly pluginManager: IPluginManager;
  private readonly logger: Logger;
  private readonly eventBus: IEventBus;

  constructor(sdkService: SDKService, pluginManager: IPluginManager, eventBus: IEventBus) {
    this.sdkService = sdkService;
    this.pluginManager = pluginManager;
    this.eventBus = eventBus;
    this.logger = new Logger('BoxManager');
  }

  /**
   * 打开箱子
   */
  async openBox(
    path: string,
    container: HTMLElement,
    options?: Partial<BoxRenderOptions>
  ): Promise<BoxRenderResult> {
    this.logger.info('Opening box', { path });
    const startTime = performance.now();

    try {
      // 1. 清理当前箱子
      this.cleanupCurrentBox();

      // 2. 加载箱子数据
      const box = await this.loadBox(path);
      this.currentBox = box;
      this.currentContainer = container;

      // 3. 确定布局
      const layoutId = options?.layoutConfig?.layout_type ?? box.content.active_layout;
      this.currentLayout = layoutId;

      // 4. 构建渲染选项
      const renderOptions: BoxRenderOptions = {
        boxId: box.id,
        containerId: container.id || `box-container-${Date.now()}`,
        themeId: options?.themeId,
        layoutConfig: options?.layoutConfig ?? box.content.layout_configs[layoutId],
      };

      // 5. 确保容器有 ID
      if (!container.id) {
        container.id = renderOptions.containerId;
      }

      // 6. 渲染箱子
      const result = await this.renderBox(box, container, renderOptions);
      const duration = performance.now() - startTime;

      if (result.success && result.frame) {
        // 7. 保存 frame 引用
        this.currentFrame = result.frame;

        // 8. 建立交互通道
        this.setupInteractionChannel(result.frame);

        // 9. 发布事件
        this.eventBus.emit(EVENTS.CONTENT_RENDER, {
          type: 'box',
          path,
          success: true,
          duration,
        });

        this.logger.info('Box opened successfully', { path, duration: `${duration.toFixed(2)}ms` });
      }

      return {
        ...result,
        duration,
      };
    } catch (error) {
      this.logger.error('Failed to open box', error as Error, { path });

      this.eventBus.emit(EVENTS.CONTENT_ERROR, {
        type: 'box',
        path,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 关闭当前箱子
   */
  closeBox(): void {
    this.logger.info('Closing box');
    this.cleanupCurrentBox();
    this.currentBox = null;
    this.currentContainer = null;
    this.currentLayout = null;
  }

  /**
   * 获取当前箱子
   */
  getCurrentBox(): Box | null {
    return this.currentBox;
  }

  /**
   * 获取箱子元数据
   */
  async getBoxMetadata(path: string): Promise<BoxMetadata> {
    this.logger.debug('Getting box metadata', { path });
    return this.sdkService.getBoxMetadata(path);
  }

  /**
   * 验证箱子文件
   */
  async validateBox(path: string): Promise<boolean> {
    this.logger.debug('Validating box', { path });
    return this.sdkService.validateBox(path);
  }

  /**
   * 切换布局
   */
  async switchLayout(layoutId: string): Promise<void> {
    if (!this.currentBox || !this.currentContainer) {
      this.logger.warn('No box to switch layout');
      return;
    }

    this.logger.info('Switching layout', { from: this.currentLayout, to: layoutId });

    // 验证布局是否存在
    if (!this.currentBox.content.layout_configs[layoutId]) {
      throw new Error(`Layout "${layoutId}" not found`);
    }

    this.currentLayout = layoutId;

    // 重新渲染箱子
    await this.openBox(
      this.currentBox.metadata.box_id as string,
      this.currentContainer,
      { layoutConfig: this.currentBox.content.layout_configs[layoutId] }
    );
  }

  /**
   * 获取可用布局列表
   *
   * 从插件系统获取已安装的布局插件列表
   */
  getAvailableLayouts(): Array<{ id: string; name: string }> {
    // 从插件管理器获取已安装的布局插件
    const layoutPlugins = this.pluginManager.list({ type: 'layout' });

    return layoutPlugins.map(plugin => ({
      id: plugin.metadata.id,
      name: plugin.metadata.name,
    }));
  }

  // ==================== 私有方法 ====================

  /**
   * 加载箱子数据
   */
  private async loadBox(path: string): Promise<Box> {
    this.logger.debug('Loading box data', { path });
    return this.sdkService.loadBox(path);
  }

  /**
   * 渲染箱子
   */
  private async renderBox(
    box: Box,
    container: HTMLElement,
    options: BoxRenderOptions
  ): Promise<BoxRenderResult> {
    this.logger.debug('Rendering box', { boxId: box.id });

    try {
      // 获取布局类型
      const layoutType = options.layoutConfig?.layout_type ?? box.content.active_layout;
      this.logger.debug('Using layout type', { layoutType });

      // 尝试从插件系统获取布局渲染器
      const layoutRenderer = this.pluginManager.getLayoutRenderer?.(layoutType);

      if (layoutRenderer) {
        this.logger.info('Using plugin layout renderer', { layoutType });
        return this.renderBoxWithPlugin(box, container, options, layoutRenderer, layoutType);
      }

      // 没有找到布局插件，尝试通过 SDK 调用 Foundation 的渲染服务
      this.logger.debug('No plugin layout renderer found, trying SDK');
      const result = await this.sdkService.renderBox(box, {
        containerId: options.containerId,
        themeId: options.themeId,
        layoutId: options.layoutConfig?.layout_type,
      });

      if (result.success && result.frame) {
        // 设置 frame 样式
        this.setupFrameStyles(result.frame);

        // 挂载到容器
        container.appendChild(result.frame);
      }

      return {
        success: result.success,
        frame: result.frame,
        metadata: box.metadata,
        error: result.error,
      };
    } catch (error) {
      // 如果 SDK 渲染失败，使用本地渲染作为回退
      this.logger.warn('SDK rendering failed, using local fallback', { error });
      return this.renderBoxLocally(box, container, options);
    }
  }

  /**
   * 使用插件渲染器渲染箱子
   */
  private async renderBoxWithPlugin(
    box: Box,
    container: HTMLElement,
    options: BoxRenderOptions,
    layoutRenderer: { render: (context: any) => Promise<any> },
    layoutType: string
  ): Promise<BoxRenderResult> {
    this.logger.debug('Rendering box with plugin layout renderer', { layoutType });

    try {
      // 创建 iframe
      const frame = document.createElement('iframe');
      frame.id = `box-frame-${box.id}`;
      frame.className = 'chips-box-frame';
      if (frame.sandbox && typeof frame.sandbox.add === 'function') {
        frame.sandbox.add('allow-scripts', 'allow-same-origin');
      } else {
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      }

      // 设置样式
      this.setupFrameStyles(frame);

      // 调用布局渲染器
      const renderResult = await layoutRenderer.render({
        box,
        container: frame.contentDocument?.body || container,
        theme: options.themeId ?? 'light',
        config: options.layoutConfig ?? {},
        cards: box.structure.cards,
      });

      if (!renderResult.success) {
        throw new Error(renderResult.error ?? 'Layout renderer failed');
      }

      // 生成 HTML 内容
      const html = this.generateBoxContentWithPlugin(box, options, renderResult, layoutType);
      frame.srcdoc = html;

      // 挂载到容器
      container.appendChild(frame);

      return {
        success: true,
        frame,
        metadata: box.metadata,
      };
    } catch (error) {
      this.logger.error('Plugin layout rendering failed', error as Error);
      // 回退到本地渲染
      return this.renderBoxLocally(box, container, options);
    }
  }

  /**
   * 生成使用插件的箱子内容 HTML
   */
  private generateBoxContentWithPlugin(
    box: Box,
    options: BoxRenderOptions,
    renderResult: { html?: string; css?: string },
    layoutType: string
  ): string {
    const theme = options.themeId ?? 'light';
    const locale = getLocale();
    const cardCount = box.structure.cards.length;
    const pluginHtml = renderResult.html ?? '';
    const pluginCss = renderResult.css ?? '';

    return `
<!DOCTYPE html>
<html lang="${locale}" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(box.metadata.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color, #f5f5f5);
      color: var(--text-color, #333);
      padding: 0;
      min-height: 100vh;
    }
    [data-theme="dark"] {
      --bg-color: #121212;
      --text-color: #e0e0e0;
      --card-bg: #1e1e1e;
    }
    /* 插件提供的 CSS */
    ${pluginCss}
  </style>
</head>
<body>
  ${pluginHtml}
  <script>
    // 通知父窗口箱子已加载
    window.parent.postMessage({ type: 'box:ready', boxId: '${box.id}', layout: '${layoutType}' }, '*');

    // 监听消息
    window.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      if (type === 'theme:change') {
        document.documentElement.dataset.theme = data.theme;
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * 本地渲染箱子（回退方案）
   */
  private renderBoxLocally(
    box: Box,
    container: HTMLElement,
    options: BoxRenderOptions
  ): BoxRenderResult {
    this.logger.debug('Rendering box locally', { boxId: box.id });

    try {
      // 创建 iframe
      const frame = document.createElement('iframe');
      frame.id = `box-frame-${box.id}`;
      frame.className = 'chips-box-frame';
      frame.sandbox.add('allow-scripts', 'allow-same-origin');

      // 设置样式
      this.setupFrameStyles(frame);

      // 创建内容（简化版）
      const content = this.generateBoxContent(box, options);
      frame.srcdoc = content;

      // 挂载
      container.appendChild(frame);

      return {
        success: true,
        frame,
        metadata: box.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 生成箱子内容 HTML
   */
  private generateBoxContent(box: Box, options: BoxRenderOptions): string {
    const theme = options.themeId ?? 'light';
    const locale = getLocale();
    const layout = options.layoutConfig?.layout_type ?? 'grid';
    const cardCount = box.structure.cards.length;

    return `
<!DOCTYPE html>
<html lang="${locale}" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(box.metadata.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color, #f5f5f5);
      color: var(--text-color, #333);
      padding: 16px;
      min-height: 100vh;
    }
    [data-theme="dark"] {
      --bg-color: #121212;
      --text-color: #e0e0e0;
      --card-bg: #1e1e1e;
    }
    .box-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .box-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    .box-title {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .box-meta {
      font-size: 14px;
      color: var(--meta-color, #666);
    }
    .box-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .card-item {
      background: var(--card-bg, #fff);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .card-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .card-item-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .card-item-path {
      font-size: 12px;
      color: var(--meta-color, #888);
      word-break: break-all;
    }
    .empty-state {
      text-align: center;
      padding: 48px;
      color: var(--meta-color, #888);
    }
  </style>
</head>
<body>
  <div class="box-container">
    <header class="box-header">
      <h1 class="box-title">${this.escapeHtml(box.metadata.name)}</h1>
      <div class="box-meta">
        ${translate('box.layout')}: ${this.escapeHtml(layout)} | ${translate('box.cardCount')}: ${cardCount}
        ${box.metadata.description ? ` | ${this.escapeHtml(box.metadata.description)}` : ''}
      </div>
    </header>
    <main class="box-grid">
      ${cardCount > 0 ? box.structure.cards.map((card, index) => `
        <div class="card-item" data-card-id="${card.id}" data-index="${index}">
          <div class="card-item-title">${this.escapeHtml(card.metadata_cache?.name ?? translate('box.cardFallback', { index: index + 1 }))}</div>
          <div class="card-item-path">${this.escapeHtml(card.path)}</div>
        </div>
      `).join('') : `
        <div class="empty-state">
          <p>${translate('box.empty.title')}</p>
          <p>${translate('box.empty.subtitle')}</p>
        </div>
      `}
    </main>
  </div>
  <script>
    // 通知父窗口箱子已加载
    window.parent.postMessage({ type: 'box:ready', boxId: '${box.id}' }, '*');

    // 点击卡片
    document.querySelectorAll('.card-item').forEach(item => {
      item.addEventListener('click', () => {
        const cardId = item.dataset.cardId;
        window.parent.postMessage({ type: 'box:card-click', cardId }, '*');
      });
    });

    // 监听消息
    window.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      if (type === 'theme:change') {
        document.documentElement.dataset.theme = data.theme;
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * 设置 frame 样式
   */
  private setupFrameStyles(frame: HTMLIFrameElement): void {
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = 'none';
    frame.style.display = 'block';
    frame.style.backgroundColor = 'transparent';
  }

  /**
   * 建立交互通道
   */
  private setupInteractionChannel(frame: HTMLIFrameElement): void {
    const handleMessage = (event: MessageEvent): void => {
      // 验证消息来源
      if (event.source !== frame.contentWindow) {
        return;
      }

      const { type, data } = event.data || {};

      switch (type) {
        case 'box:ready':
          this.logger.debug('Box frame ready', { boxId: data?.boxId });
          break;
        case 'box:card-click':
          this.handleCardClick(data?.cardId);
          break;
        case 'box:layout-change':
          this.eventBus.emit('box:layout-change', data);
          break;
        case 'box:error':
          this.logger.error('Box frame error', undefined, data);
          break;
        default:
          this.logger.debug('Unknown message from box frame', { type });
      }
    };

    window.addEventListener('message', handleMessage);

    // 保存清理函数
    (frame as HTMLIFrameElement & { _cleanupHandler?: () => void })._cleanupHandler = (): void => {
      window.removeEventListener('message', handleMessage);
    };
  }

  /**
   * 处理卡片点击
   */
  private handleCardClick(cardId: string): void {
    this.logger.debug('Card clicked in box', { cardId });

    // 发布事件，由 ViewerApp 处理导航
    this.eventBus.emit('box:card-click', { cardId, box: this.currentBox });
  }

  /**
   * 清理当前箱子
   */
  private cleanupCurrentBox(): void {
    if (this.currentFrame) {
      // 调用清理函数
      const cleanupHandler = (this.currentFrame as HTMLIFrameElement & { _cleanupHandler?: () => void })._cleanupHandler;
      if (cleanupHandler) {
        cleanupHandler();
      }

      // 移除 DOM
      this.currentFrame.remove();
      this.currentFrame = null;
    }
  }
}
