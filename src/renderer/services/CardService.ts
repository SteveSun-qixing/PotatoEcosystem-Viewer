/**
 * 卡片服务
 * @module @renderer/services/CardService
 *
 * 封装 SDK 的卡片渲染能力，为查看器提供简洁的接口。
 *
 * 渲染流水线（四阶段）：
 * 1. CardParser - 解析 .card 文件（ZIP）
 * 2. ResourceResolver - 将资源路径转为 blob URL
 * 3. RendererFetcher - 获取基础卡片渲染代码
 * 4. CardRenderManager - iframe 隔离渲染
 */
import {
  CardParser,
  ResourceResolver,
  RendererFetcher,
  CardRenderManager,
  type ParsedCardData,
  type CardMountResult,
  type IsolationMode,
  type RendererCode,
} from '@chips/sdk';

/**
 * 卡片渲染选项
 */
export interface CardRenderOptions {
  /** 隔离模式（默认 iframe） */
  isolationMode?: IsolationMode;
  /** 基础卡片之间的间距 */
  cardGap?: number;
  /** 容器内边距 */
  containerPadding?: number;
}

/**
 * 卡片打开结果
 */
export interface CardOpenResult {
  /** 是否成功 */
  success: boolean;
  /** 解析后的卡片数据（成功时） */
  data?: ParsedCardData;
  /** 渲染结果（成功时） */
  mountResult?: CardMountResult;
  /** 错误信息 */
  error?: string;
}

/**
 * 卡片服务
 *
 * 查看器的核心服务，封装 SDK 的四阶段渲染流水线。
 *
 * @example
 * ```ts
 * const service = new CardService();
 *
 * // 打开并渲染卡片
 * const result = await service.openCard('/path/to/card.card', container);
 *
 * // 清理
 * service.destroy();
 * ```
 */
export class CardService {
  private _parser: CardParser;
  private _resourceResolver: ResourceResolver;
  private _fetcher: RendererFetcher;
  private _currentMount: CardMountResult | null = null;

  constructor() {
    this._parser = new CardParser({ keepRawFiles: true });
    this._resourceResolver = new ResourceResolver();
    this._fetcher = new RendererFetcher({ enableCache: true });
  }

  /**
   * 打开并渲染卡片文件
   */
  async openCard(
    filePath: string,
    container: HTMLElement,
    options?: CardRenderOptions
  ): Promise<CardOpenResult> {
    try {
      this.destroyCurrentCard();

      // 1. 读取文件
      const fileData = await this._readFile(filePath);

      // 2. 解析卡片
      const parseResult = await this._parser.parse({
        type: 'data',
        data: new Uint8Array(fileData),
      });

      if (!parseResult.success || !parseResult.data) {
        return { success: false, error: parseResult.error || 'Card parse failed' };
      }

      const cardData = parseResult.data;

      // 3. 渲染
      const mountResult = await this.renderParsedCard(cardData, container, options);

      if (!mountResult.success) {
        return { success: false, data: cardData, error: mountResult.error || 'Card render failed' };
      }

      this._currentMount = mountResult;
      return { success: true, data: cardData, mountResult };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 从二进制数据打开并渲染卡片
   */
  async openCardFromData(
    data: ArrayBuffer | Uint8Array,
    container: HTMLElement,
    options?: CardRenderOptions
  ): Promise<CardOpenResult> {
    try {
      this.destroyCurrentCard();

      const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);
      const parseResult = await this._parser.parse({ type: 'data', data: uint8Data });

      if (!parseResult.success || !parseResult.data) {
        return { success: false, error: parseResult.error || 'Card parse failed' };
      }

      const cardData = parseResult.data;
      const mountResult = await this.renderParsedCard(cardData, container, options);

      if (!mountResult.success) {
        return { success: false, data: cardData, error: mountResult.error || 'Card render failed' };
      }

      this._currentMount = mountResult;
      return { success: true, data: cardData, mountResult };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 渲染已解析的卡片数据
   *
   * 完整的四阶段流水线：资源解析 → 获取渲染代码 → 渲染挂载
   */
  async renderParsedCard(
    cardData: ParsedCardData,
    container: HTMLElement,
    options?: CardRenderOptions
  ): Promise<CardMountResult> {
    // 阶段 2：资源解析（将相对路径转为 blob URL）
    this._resourceResolver.cleanup();
    const resolved = this._resourceResolver.resolve(cardData);
    const resolvedData = resolved.cardData;

    console.log(`[CardService] Resources resolved: ${resolved.resolvedCount}, failed: ${resolved.failedPaths.length}`);
    if (resolved.failedPaths.length > 0) {
      console.warn('[CardService] Failed to resolve:', resolved.failedPaths);
    }

    // 阶段 3：获取渲染代码
    const cardTypes = resolvedData.baseCards.map((bc) => bc.type);
    const renderers = await this._fetcher.fetchRenderers(cardTypes);

    // 阶段 4：创建渲染管理器并渲染
    const manager = new CardRenderManager({
      isolationMode: options?.isolationMode ?? 'iframe',
      cardGap: options?.cardGap ?? 0,
      containerPadding: options?.containerPadding ?? 0,
    });

    return manager.render(resolvedData, renderers, container);
  }

  /**
   * 注册自定义基础卡片渲染器
   */
  registerRenderer(cardType: string, code: RendererCode): void {
    this._fetcher.registerRenderer(cardType, code);
  }

  /**
   * 销毁当前渲染的卡片
   */
  destroyCurrentCard(): void {
    if (this._currentMount?.destroy) {
      this._currentMount.destroy();
      this._currentMount = null;
    }
    this._resourceResolver.cleanup();
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.destroyCurrentCard();
    this._fetcher.clearCache();
  }

  /**
   * 读取文件
   */
  private async _readFile(filePath: string): Promise<ArrayBuffer> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI.file.read(filePath);
    }
    const response = await fetch(filePath);
    return response.arrayBuffer();
  }
}

/**
 * 单例实例
 */
let _instance: CardService | null = null;

/**
 * 获取卡片服务单例
 */
export function getCardService(): CardService {
  if (!_instance) {
    _instance = new CardService();
  }
  return _instance;
}
