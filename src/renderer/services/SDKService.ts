/**
 * SDK 连接服务
 * 封装与 @chips/sdk 的交互
 * @module @renderer/services/SDKService
 */
import type { Card, Box } from '@common/types';
import type { ISDKService, SDKServiceOptions } from '@common/interfaces';
import { Logger } from './Logger';
import { EventBus } from './EventBus';
import { EVENTS } from '@common/constants';

// SDK 类型定义（实际类型来自 @chips/sdk）
interface ChipsSDKInstance {
  initialize(): Promise<void>;
  destroy(): void;
  isReady: boolean;
  card: {
    get(path: string): Promise<Card>;
    getMetadata(path: string): Promise<Card['metadata']>;
  };
  box: {
    get(path: string): Promise<Box>;
    getMetadata(path: string): Promise<Box['metadata']>;
  };
  file: {
    validateFile(path: string): Promise<{ valid: boolean; errors?: string[] }>;
    getFileInfo(path: string): Promise<{ type: string; size: number; exists: boolean }>;
  };
  connector: {
    request<T>(params: { service: string; payload: unknown }): Promise<{
      success: boolean;
      data?: T;
      error?: { message: string; code?: string };
    }>;
  };
}

/**
 * SDK 服务类
 * 负责与 Chips SDK 的所有交互
 */
export class SDKService implements ISDKService {
  private sdk: ChipsSDKInstance | null = null;
  private initialized = false;
  private readonly logger: Logger;
  private readonly eventBus: EventBus;
  private initPromise: Promise<void> | null = null;

  constructor(eventBus?: EventBus) {
    this.logger = new Logger('SDKService');
    this.eventBus = eventBus ?? new EventBus();
  }

  /**
   * 初始化 SDK
   */
  async initialize(options: SDKServiceOptions = {}): Promise<void> {
    // 防止重复初始化
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized) {
      this.logger.warn('SDK already initialized');
      return;
    }

    this.initPromise = this.doInitialize(options);
    return this.initPromise;
  }

  private async doInitialize(options: SDKServiceOptions): Promise<void> {
    try {
      this.logger.info('Initializing SDK...', { options });

      // 动态导入 SDK（避免循环依赖）
      const { ChipsSDK } = await import('@chips/sdk');

      this.sdk = new ChipsSDK({
        autoConnect: options.autoConnect ?? true,
        debug: options.debug ?? false,
      }) as unknown as ChipsSDKInstance;

      await this.sdk.initialize();

      this.initialized = true;
      this.logger.info('SDK initialized successfully');

      this.eventBus.emit(EVENTS.STATE_CHANGE, { sdkReady: true });
    } catch (error) {
      this.logger.error('Failed to initialize SDK', error as Error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * 销毁 SDK
   */
  destroy(): void {
    if (this.sdk) {
      this.sdk.destroy();
      this.sdk = null;
      this.initialized = false;
      this.initPromise = null;
      this.logger.info('SDK destroyed');
    }
  }

  /**
   * 获取 SDK 实例
   */
  getSDK(): ChipsSDKInstance {
    if (!this.sdk) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
    return this.sdk;
  }

  /**
   * 检查 SDK 是否就绪
   */
  isReady(): boolean {
    return this.initialized && this.sdk?.isReady === true;
  }

  /**
   * 等待 SDK 就绪
   */
  async waitForReady(timeout = 10000): Promise<void> {
    if (this.isReady()) {
      return;
    }

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    return this.eventBus.waitFor(EVENTS.STATE_CHANGE, timeout);
  }

  /**
   * 加载卡片
   */
  async loadCard(path: string): Promise<Card> {
    const sdk = this.getSDK();
    this.logger.debug('Loading card', { path });

    try {
      const card = await sdk.card.get(path);
      this.logger.debug('Card loaded', { path, cardId: card.id });
      return card;
    } catch (error) {
      this.logger.error('Failed to load card', error as Error, { path });
      throw error;
    }
  }

  /**
   * 获取卡片元数据
   */
  async getCardMetadata(path: string): Promise<Card['metadata']> {
    const sdk = this.getSDK();
    return sdk.card.getMetadata(path);
  }

  /**
   * 加载箱子
   */
  async loadBox(path: string): Promise<Box> {
    const sdk = this.getSDK();
    this.logger.debug('Loading box', { path });

    try {
      const box = await sdk.box.get(path);
      this.logger.debug('Box loaded', { path, boxId: box.id });
      return box;
    } catch (error) {
      this.logger.error('Failed to load box', error as Error, { path });
      throw error;
    }
  }

  /**
   * 获取箱子元数据
   */
  async getBoxMetadata(path: string): Promise<Box['metadata']> {
    const sdk = this.getSDK();
    return sdk.box.getMetadata(path);
  }

  /**
   * 验证卡片文件
   */
  async validateCard(path: string): Promise<boolean> {
    const sdk = this.getSDK();
    this.logger.debug('Validating card', { path });

    try {
      const result = await sdk.file.validateFile(path);
      return result.valid;
    } catch (error) {
      this.logger.error('Card validation failed', error as Error, { path });
      return false;
    }
  }

  /**
   * 验证箱子文件
   */
  async validateBox(path: string): Promise<boolean> {
    const sdk = this.getSDK();
    this.logger.debug('Validating box', { path });

    try {
      const result = await sdk.file.validateFile(path);
      return result.valid;
    } catch (error) {
      this.logger.error('Box validation failed', error as Error, { path });
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(path: string): Promise<{ exists: boolean; type: string; size: number }> {
    const sdk = this.getSDK();

    try {
      const info = await sdk.file.getFileInfo(path);
      return {
        exists: info.exists,
        type: info.type,
        size: info.size,
      };
    } catch (error) {
      this.logger.error('Failed to get file info', error as Error, { path });
      return { exists: false, type: 'unknown', size: 0 };
    }
  }

  /**
   * 通过内核路由请求
   */
  async request<T>(service: string, payload: unknown): Promise<T> {
    const sdk = this.getSDK();
    this.logger.debug('Making request', { service });

    try {
      const response = await sdk.connector.request<T>({
        service,
        payload,
      });

      if (!response.success) {
        const errorMessage = response.error?.message ?? 'Request failed';
        throw new Error(errorMessage);
      }

      return response.data as T;
    } catch (error) {
      this.logger.error('Request failed', error as Error, { service });
      throw error;
    }
  }

  /**
   * 调用 Foundation 的渲染服务
   */
  async renderCard(
    cardData: Card,
    options: {
      containerId: string;
      themeId?: string;
      mode?: 'full' | 'preview' | 'thumbnail';
    }
  ): Promise<{ success: boolean; frame?: HTMLIFrameElement; error?: string }> {
    return this.request('foundation.card.render', {
      cardData,
      options,
    });
  }

  /**
   * 调用 Foundation 的箱子渲染服务
   */
  async renderBox(
    boxData: Box,
    options: {
      containerId: string;
      themeId?: string;
      layoutId?: string;
    }
  ): Promise<{ success: boolean; frame?: HTMLIFrameElement; error?: string }> {
    return this.request('foundation.box.render', {
      boxData,
      options,
    });
  }
}

// 单例导出
export const sdkService = new SDKService();
