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
      frame.srcdoc = content;

      // 挂载
      container.appendChild(frame);

      return {
        success: true,
        frame,
        metadata: card.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 生成卡片内容 HTML
   */
  private generateCardContent(card: Card, options: CardRenderOptions): string {
    const theme = options.themeId ?? 'light';

    return `
<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${card.metadata.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color, #fff);
      color: var(--text-color, #333);
      padding: 16px;
    }
    [data-theme="dark"] {
      --bg-color: #1a1a1a;
      --text-color: #e0e0e0;
    }
    .card-container {
      max-width: 100%;
      margin: 0 auto;
    }
    .card-header {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    .card-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .card-meta {
      font-size: 12px;
      color: var(--meta-color, #666);
    }
    .card-content {
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card-container">
    <header class="card-header">
      <h1 class="card-title">${card.metadata.name}</h1>
      <div class="card-meta">
        ${card.metadata.author ? `作者: ${card.metadata.author}` : ''}
        ${card.metadata.created_at ? ` | 创建于: ${new Date(card.metadata.created_at).toLocaleDateString('zh-CN')}` : ''}
      </div>
    </header>
    <main class="card-content">
      ${card.metadata.description ?? '暂无内容'}
    </main>
  </div>
  <script>
    // 通知父窗口卡片已加载
    window.parent.postMessage({ type: 'card:ready', cardId: '${card.id}' }, '*');

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
