/**
 * CardManager - 卡片管理器
 * @module @renderer/core/viewer/CardManager
 */
import type { ICardManager, IEventBus } from '@common/interfaces';
import type { Card, CardMetadata, CardRenderOptions, CardRenderResult } from '@common/types';
import type { SDKService } from '@renderer/services';
import { Logger } from '@renderer/services';
import { EVENTS } from '@common/constants';

/**
 * CardManager - 卡片管理器
 *
 * 职责：
 * 1. 加载卡片文件
 * 2. 调用 Foundation 的 CardRenderer 进行渲染
 * 3. 管理当前打开的卡片
 * 4. 处理渲染结果
 */
export class CardManager implements ICardManager {
  private currentCard: Card | null = null;
  private currentFrame: HTMLIFrameElement | null = null;
  private currentContainer: HTMLElement | null = null;
  private zoom = 1;

  private readonly sdkService: SDKService;
  private readonly logger: Logger;
  private readonly eventBus: IEventBus;

  constructor(sdkService: SDKService, eventBus: IEventBus) {
    this.sdkService = sdkService;
    this.eventBus = eventBus;
    this.logger = new Logger('CardManager');
  }

  /**
   * 打开卡片
   */
  async openCard(
    path: string,
    container: HTMLElement,
    options?: Partial<CardRenderOptions>
  ): Promise<CardRenderResult> {
    this.logger.info('Opening card', { path });
    const startTime = performance.now();

    try {
      // 1. 清理当前卡片
      this.cleanupCurrentCard();

      // 2. 加载卡片数据
      const card = await this.loadCard(path);
      this.currentCard = card;
      this.currentContainer = container;

      // 3. 构建渲染选项
      const renderOptions: CardRenderOptions = {
        cardId: card.id,
        containerId: container.id || `card-container-${Date.now()}`,
        mode: options?.mode ?? 'full',
        themeId: options?.themeId,
        interactive: options?.interactive ?? true,
        autoHeight: options?.autoHeight ?? true,
      };

      // 4. 确保容器有 ID
      if (!container.id) {
        container.id = renderOptions.containerId;
      }

      // 5. 渲染卡片
      const result = await this.renderCard(card, container, renderOptions);
      const duration = performance.now() - startTime;

      if (result.success && result.frame) {
        // 6. 保存 frame 引用
        this.currentFrame = result.frame;

        // 7. 建立交互通道
        this.setupInteractionChannel(result.frame);

        // 8. 发布事件
        this.eventBus.emit(EVENTS.CONTENT_RENDER, {
          type: 'card',
          path,
          success: true,
          duration,
        });

        this.logger.info('Card opened successfully', { path, duration: `${duration.toFixed(2)}ms` });
      }

      return {
        ...result,
        duration,
      };
    } catch (error) {
      this.logger.error('Failed to open card', error as Error, { path });

      this.eventBus.emit(EVENTS.CONTENT_ERROR, {
        type: 'card',
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
   * 关闭当前卡片
   */
  closeCard(): void {
    this.logger.info('Closing card');
    this.cleanupCurrentCard();
    this.currentCard = null;
    this.currentContainer = null;
  }

  /**
   * 获取当前卡片
   */
  getCurrentCard(): Card | null {
    return this.currentCard;
  }

  /**
   * 获取卡片元数据
   */
  async getCardMetadata(path: string): Promise<CardMetadata> {
    this.logger.debug('Getting card metadata', { path });
    return this.sdkService.getCardMetadata(path);
  }

  /**
   * 验证卡片文件
   */
  async validateCard(path: string): Promise<boolean> {
    this.logger.debug('Validating card', { path });
    return this.sdkService.validateCard(path);
  }

  /**
   * 刷新当前卡片
   */
  async refreshCard(): Promise<void> {
    if (!this.currentCard || !this.currentContainer) {
      this.logger.warn('No card to refresh');
      return;
    }

    this.logger.info('Refreshing card');

    // 重新渲染当前卡片
    const path = this.currentCard.metadata.card_id;
    await this.openCard(path as string, this.currentContainer);
  }

  /**
   * 设置缩放
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(5, zoom));

    if (this.currentFrame) {
      this.currentFrame.style.transform = `scale(${this.zoom})`;
      this.currentFrame.style.transformOrigin = 'top left';
    }

    this.logger.debug('Zoom set', { zoom: this.zoom });
  }

  /**
   * 获取当前缩放
   */
  getZoom(): number {
    return this.zoom;
  }

  // ==================== 私有方法 ====================

  /**
   * 加载卡片数据
   */
  private async loadCard(path: string): Promise<Card> {
    this.logger.debug('Loading card data', { path });
    return this.sdkService.loadCard(path);
  }

  /**
   * 渲染卡片
   */
  private async renderCard(
    card: Card,
    container: HTMLElement,
    options: CardRenderOptions
  ): Promise<CardRenderResult> {
    this.logger.debug('Rendering card', { cardId: card.id });

    try {
      // 通过 SDK 调用 Foundation 的渲染服务
      const result = await this.sdkService.renderCard(card, {
        containerId: options.containerId,
        themeId: options.themeId,
        mode: options.mode,
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
        metadata: card.metadata,
        error: result.error,
      };
    } catch (error) {
      // 如果 SDK 渲染失败，使用本地渲染作为回退
      this.logger.warn('SDK rendering failed, using local fallback', { error });
      return this.renderCardLocally(card, container, options);
    }
  }

  /**
   * 本地渲染卡片（回退方案）
   */
  private renderCardLocally(
    card: Card,
    container: HTMLElement,
    options: CardRenderOptions
  ): CardRenderResult {
    this.logger.debug('Rendering card locally', { cardId: card.id });
    console.log('[CardManager] renderCardLocally called');
    console.log('[CardManager] Card:', card);
    console.log('[CardManager] Container:', container);

    try {
      // 创建 iframe
      const frame = document.createElement('iframe');
      frame.id = `card-frame-${card.id}`;
      frame.className = 'chips-card-frame';
      frame.sandbox.add('allow-scripts', 'allow-same-origin');

      // 设置样式
      this.setupFrameStyles(frame);

      // 创建内容（简化版）
      const content = this.generateCardContent(card, options);
      console.log('[CardManager] Generated content length:', content.length);
      frame.srcdoc = content;

      // 挂载
      console.log('[CardManager] Appending frame to container');
      container.appendChild(frame);
      console.log('[CardManager] Frame appended successfully');

      return {
        success: true,
        frame,
        metadata: card.metadata,
      };
    } catch (error) {
      console.error('[CardManager] renderCardLocally error:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 生成卡片内容 HTML（简洁版 - 类似图片查看器）
   */
  private generateCardContent(card: Card & { baseCards?: any[] }, options: CardRenderOptions): string {
    const theme = options.themeId ?? 'light';
    const baseCards = card.baseCards || [];
    
    // 渲染所有基础卡片内容（无边框，连续显示）
    const baseCardsHtml = baseCards.map(bc => this.renderBaseCard(bc)).join('\n');
    
    // 如果没有基础卡片，显示卡片描述
    const contentHtml = baseCards.length > 0 
      ? baseCardsHtml 
      : `<div class="empty-content">${this.escapeHtml(card.metadata.description || '暂无内容')}</div>`;

    return `
<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(card.metadata.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      min-height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-color, #fff);
      color: var(--text-color, #333);
      line-height: 1.7;
      padding: 40px 24px;
    }
    [data-theme="dark"] {
      --bg-color: #1a1a1a;
      --text-color: #e0e0e0;
      --meta-color: #888;
      --code-bg: #2a2a2a;
      --quote-border: #404040;
      --quote-bg: #252525;
    }
    [data-theme="light"] {
      --bg-color: #ffffff;
      --text-color: #333333;
      --meta-color: #666666;
      --code-bg: #f5f5f5;
      --quote-border: #ddd;
      --quote-bg: #fafafa;
    }
    
    /* 内容容器 */
    .content {
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* 基础卡片内容（无边框） */
    .base-card-content {
      margin-bottom: 32px;
    }
    .base-card-content:last-child {
      margin-bottom: 0;
    }
    
    /* 富文本样式 */
    h1 { font-size: 32px; font-weight: 700; margin: 32px 0 20px; line-height: 1.3; }
    h2 { font-size: 26px; font-weight: 600; margin: 28px 0 16px; line-height: 1.3; }
    h3 { font-size: 22px; font-weight: 600; margin: 24px 0 12px; line-height: 1.4; }
    h4 { font-size: 18px; font-weight: 600; margin: 20px 0 10px; }
    h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
    
    p { margin-bottom: 18px; font-size: 16px; }
    
    ul, ol { margin: 18px 0; padding-left: 28px; }
    li { margin-bottom: 10px; }
    li > ul, li > ol { margin: 8px 0; }
    
    blockquote {
      border-left: 4px solid var(--quote-border);
      padding: 16px 24px;
      margin: 20px 0;
      background: var(--quote-bg);
      font-style: italic;
      color: var(--meta-color);
    }
    blockquote p:last-child { margin-bottom: 0; }
    
    code {
      background: var(--code-bg);
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    pre {
      background: var(--code-bg);
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
    }
    pre code {
      background: none;
      padding: 0;
    }
    
    a { color: #1890ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 20px 0;
      display: block;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid var(--quote-border);
      padding: 12px 16px;
      text-align: left;
    }
    th {
      background: var(--code-bg);
      font-weight: 600;
    }
    
    strong { font-weight: 600; }
    em { font-style: italic; }
    
    /* 分隔线 */
    hr {
      border: none;
      border-top: 1px solid var(--quote-border);
      margin: 32px 0;
    }
    
    /* 空内容提示 */
    .empty-content {
      color: var(--meta-color);
      font-size: 16px;
      text-align: center;
      padding: 60px 20px;
    }
    
    /* 视频/图片容器 */
    figure {
      margin: 24px 0;
      text-align: center;
    }
    figcaption {
      color: var(--meta-color);
      font-size: 14px;
      margin-top: 12px;
    }
    video {
      max-width: 100%;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="content">
    ${contentHtml}
  </div>
</body>
</html>`;
  }

  /**
   * 渲染单个基础卡片（简洁版 - 无边框无标题）
   */
  private renderBaseCard(baseCard: { id: string; type: string; config: any; content: string }): string {
    let content = '';
    
    switch (baseCard.type) {
      case 'RichTextCard':
        content = baseCard.content || baseCard.config?.content_text || '';
        break;
        
      case 'MarkdownCard':
        content = this.simpleMarkdownToHtml(baseCard.content || baseCard.config?.content_text || '');
        break;
        
      case 'ImageCard':
        const imgSrc = baseCard.config?.image_file || '';
        const imgCaption = baseCard.config?.caption || '';
        content = `
          <figure>
            <img src="${this.escapeHtml(imgSrc)}" alt="">
            ${imgCaption ? `<figcaption>${this.escapeHtml(imgCaption)}</figcaption>` : ''}
          </figure>
        `;
        break;
        
      case 'VideoCard':
        const videoSrc = baseCard.config?.video_file || '';
        const poster = baseCard.config?.cover_image || '';
        content = `
          <figure>
            <video controls ${poster ? `poster="${this.escapeHtml(poster)}"` : ''}>
              <source src="${this.escapeHtml(videoSrc)}" type="video/mp4">
            </video>
          </figure>
        `;
        break;
        
      default:
        content = baseCard.content || '';
    }
    
    return `<div class="base-card-content">${content}</div>`;
  }

  /**
   * 简单的 Markdown 转 HTML
   */
  private simpleMarkdownToHtml(markdown: string): string {
    if (!markdown) return '';
    
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
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

    if (this.zoom !== 1) {
      frame.style.transform = `scale(${this.zoom})`;
      frame.style.transformOrigin = 'top left';
    }
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
        case 'card:ready':
          this.logger.debug('Card frame ready', { cardId: data?.cardId });
          break;
        case 'card:resize':
          this.handleFrameResize(frame, data);
          break;
        case 'card:navigate':
          this.eventBus.emit('card:navigate', data);
          break;
        case 'card:error':
          this.logger.error('Card frame error', undefined, data);
          break;
        default:
          this.logger.debug('Unknown message from card frame', { type });
      }
    };

    window.addEventListener('message', handleMessage);

    // 保存清理函数
    (frame as HTMLIFrameElement & { _cleanupHandler?: () => void })._cleanupHandler = (): void => {
      window.removeEventListener('message', handleMessage);
    };
  }

  /**
   * 处理 frame 大小调整
   */
  private handleFrameResize(
    frame: HTMLIFrameElement,
    data: { width?: number; height?: number }
  ): void {
    if (data.height) {
      frame.style.height = `${data.height}px`;
    }
    if (data.width) {
      frame.style.width = `${data.width}px`;
    }
  }

  /**
   * 清理当前卡片
   */
  private cleanupCurrentCard(): void {
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
