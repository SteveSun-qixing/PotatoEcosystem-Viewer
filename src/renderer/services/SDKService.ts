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

// 基础卡片配置
export interface BaseCardConfig {
  id: string;
  type: string;
  config: Record<string, any>;
  content: string;
}

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

      // 尝试动态导入 SDK
      try {
        const sdkModule = await import('@chips/sdk');
        const ChipsSDK = sdkModule.ChipsSDK || sdkModule.default;

        if (ChipsSDK) {
          this.sdk = new ChipsSDK({
            autoConnect: options.autoConnect ?? true,
            debug: options.debug ?? false,
          }) as unknown as ChipsSDKInstance;

          await this.sdk.initialize();
          this.logger.info('SDK initialized successfully');
        } else {
          throw new Error('ChipsSDK not found in module');
        }
      } catch (sdkError) {
        // SDK 不可用，使用降级模式
        this.logger.warn('SDK not available, running in standalone mode', sdkError as Error);
        this.sdk = this.createStandaloneSDK();
      }

      this.initialized = true;
      this.eventBus.emit(EVENTS.STATE_CHANGE, { sdkReady: true });
    } catch (error) {
      this.logger.error('Failed to initialize SDK', error as Error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * 创建独立模式 SDK（不依赖外部 SDK）
   */
  private createStandaloneSDK(): ChipsSDKInstance {
    this.logger.info('Creating standalone SDK instance');

    return {
      initialize: async () => {},
      destroy: () => {},
      isReady: true,
      card: {
        get: async (path: string) => this.loadLocalCard(path),
        getMetadata: async (path: string) => {
          const card = await this.loadLocalCard(path);
          return card.metadata;
        },
      },
      box: {
        get: async (path: string) => this.loadLocalBox(path),
        getMetadata: async (path: string) => {
          const box = await this.loadLocalBox(path);
          return box.metadata;
        },
      },
      file: {
        validateFile: async () => ({ valid: true }),
        getFileInfo: async (path: string) => ({
          type: path.endsWith('.card') ? 'card' : path.endsWith('.box') ? 'box' : 'unknown',
          size: 0,
          exists: true,
        }),
      },
      connector: {
        request: async <T>() => ({
          success: false,
          error: { message: 'Standalone mode - connector not available' },
        } as { success: boolean; data?: T; error?: { message: string } }),
      },
    };
  }

  /**
   * 从本地文件加载卡片（独立模式）
   */
  private async loadLocalCard(path: string): Promise<Card> {
    this.logger.info('Loading local card', { path });

    // 使用 Electron IPC 读取文件
    if (typeof window !== 'undefined' && (window as any).electronAPI?.file?.read) {
      try {
        const buffer = await (window as any).electronAPI.file.read(path);
        this.logger.debug('File read successfully', { size: buffer.byteLength });

        // 解析 .card 文件（ZIP 格式）
        const card = await this.parseCardFile(buffer, path);
        return card;
      } catch (error) {
        this.logger.error('Failed to read local card file', error as Error);
      }
    } else {
      this.logger.warn('electronAPI.file.read not available');
    }

    // 返回占位卡片数据
    return this.createPlaceholderCard(path);
  }

  /**
   * 解析 .card 文件 (ZIP 格式)
   */
  private async parseCardFile(buffer: ArrayBuffer, path: string): Promise<Card> {
    try {
      // 动态导入 JSZip
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);

      const fileList = Object.keys(zip.files);
      this.logger.debug('ZIP loaded, files:', fileList);

      // 读取 .card/metadata.yaml
      let metadataFile = zip.file('.card/metadata.yaml') || zip.file('.card/metadata.yml');
      // 兼容旧格式
      if (!metadataFile) {
        metadataFile = zip.file('metadata.yaml') || zip.file('metadata.yml');
      }
      
      if (!metadataFile) {
        this.logger.warn('No metadata.yaml found in card file');
        return this.createPlaceholderCard(path);
      }

      const metadataContent = await metadataFile.async('string');
      this.logger.debug('Metadata content:', metadataContent.substring(0, 500));

      // 使用 js-yaml 解析
      const yaml = (await import('js-yaml')).default;
      const metadata = yaml.load(metadataContent) as Record<string, any>;

      // 读取 .card/structure.yaml
      let structureFile = zip.file('.card/structure.yaml') || zip.file('.card/structure.yml');
      // 兼容旧格式
      if (!structureFile) {
        structureFile = zip.file('structure.yaml') || zip.file('structure.yml');
      }

      let structure: { structure: any[]; manifest: any } = { 
        structure: [], 
        manifest: { card_count: 0, resource_count: 0, resources: [] } 
      };
      
      if (structureFile) {
        const structureContent = await structureFile.async('string');
        this.logger.debug('Structure content:', structureContent.substring(0, 500));
        const parsedStructure = yaml.load(structureContent) as Record<string, any>;
        this.logger.debug('Parsed structure:', parsedStructure);
        structure = {
          structure: parsedStructure?.structure || [],
          manifest: {
            card_count: parsedStructure?.manifest?.card_count || 0,
            resource_count: parsedStructure?.manifest?.resource_count || 0,
            resources: parsedStructure?.manifest?.resources || [],
          },
        };
        this.logger.debug('Structure array:', structure.structure);
      }

      // 读取 content/ 目录下的基础卡片配置
      const baseCards: BaseCardConfig[] = [];
      this.logger.info('Loading base cards, count:', structure.structure.length);
      
      for (const item of structure.structure) {
        const configPath = `content/${item.id}.yaml`;
        const configFile = zip.file(configPath);
        this.logger.debug(`Looking for base card config: ${configPath}`);
        
        if (configFile) {
          const configContent = await configFile.async('string');
          this.logger.debug(`Base card config (${item.id}):`, configContent.substring(0, 500));
          const config = yaml.load(configContent) as Record<string, any>;
          this.logger.debug(`Parsed config:`, config);
          
          // 如果是文件引用，读取文件内容
          let content = config?.content_text || '';
          if (config?.content_source === 'file' && config?.content_file) {
            const contentFile = zip.file(config.content_file);
            if (contentFile) {
              content = await contentFile.async('string');
            }
          }
          
          baseCards.push({
            id: item.id,
            type: item.type || config?.card_type,
            config: config || {},
            content,
          });
          this.logger.info(`Base card loaded: ${item.id}, type: ${item.type}, content length: ${content.length}`);
        } else {
          this.logger.warn(`Base card config not found: ${configPath}`);
        }
      }

      // 扩展 Card 类型以包含基础卡片数据
      const card: Card & { baseCards?: BaseCardConfig[] } = {
        id: metadata.card_id || `card-${Date.now()}`,
        metadata: {
          chip_standards_version: metadata.chip_standards_version || '1.0.0',
          card_id: metadata.card_id || `card-${Date.now()}`,
          name: metadata.name || path.split('/').pop()?.replace('.card', '') || 'Unknown',
          description: metadata.description || '',
          author: metadata.author || 'Unknown',
          created_at: metadata.created_at || new Date().toISOString(),
          modified_at: metadata.modified_at || new Date().toISOString(),
          tags: metadata.tags || [],
          theme: metadata.theme,
        },
        structure: structure as Card['structure'],
        baseCards,
      };

      this.logger.info('Card parsed successfully', { 
        cardId: card.id, 
        name: card.metadata.name,
        baseCardCount: baseCards.length 
      });
      return card;
    } catch (error) {
      this.logger.error('Failed to parse card file', error as Error);
      return this.createPlaceholderCard(path);
    }
  }

  /**
   * 简单的 YAML 解析器（支持基本格式）
   */
  private parseSimpleYaml(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split('\n');
    let currentKey = '';
    let currentIndent = 0;
    const stack: { obj: Record<string, any>; indent: number }[] = [{ obj: result, indent: -1 }];

    for (const line of lines) {
      // 跳过空行和注释
      if (!line.trim() || line.trim().startsWith('#')) continue;

      // 计算缩进
      const indent = line.search(/\S/);
      const trimmedLine = line.trim();

      // 处理列表项
      if (trimmedLine.startsWith('- ')) {
        const value = trimmedLine.substring(2).trim();
        const parent = stack[stack.length - 1].obj;
        if (Array.isArray(parent[currentKey])) {
          // 简单值
          if (!value.includes(':')) {
            parent[currentKey].push(value.replace(/^["']|["']$/g, ''));
          }
        }
        continue;
      }

      // 处理键值对
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim();
        let value = trimmedLine.substring(colonIndex + 1).trim();

        // 回退到正确的层级
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }

        const currentObj = stack[stack.length - 1].obj;

        if (value === '' || value === '|' || value === '>') {
          // 嵌套对象或多行字符串
          currentObj[key] = {};
          stack.push({ obj: currentObj[key], indent });
          currentKey = key;
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // 内联数组
          currentObj[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        } else {
          // 简单值
          value = value.replace(/^["']|["']$/g, ''); // 移除引号
          if (value === 'true') currentObj[key] = true;
          else if (value === 'false') currentObj[key] = false;
          else if (!isNaN(Number(value)) && value !== '') currentObj[key] = Number(value);
          else currentObj[key] = value;

          currentKey = key;

          // 检查下一行是否是数组
          const nextLineIndex = lines.indexOf(line) + 1;
          if (nextLineIndex < lines.length) {
            const nextLine = lines[nextLineIndex].trim();
            if (nextLine.startsWith('- ')) {
              currentObj[key] = [];
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * 从本地文件加载箱子（独立模式）
   */
  private async loadLocalBox(path: string): Promise<Box> {
    // 使用 Electron IPC 读取文件
    if (typeof window !== 'undefined' && (window as any).electronAPI?.readFile) {
      try {
        const content = await (window as any).electronAPI.readFile(path);
        return this.parseBoxContent(content, path);
      } catch (error) {
        this.logger.error('Failed to read local box file', error as Error);
      }
    }

    // 返回占位箱子数据
    return this.createPlaceholderBox(path);
  }

  /**
   * 解析卡片内容
   */
  private parseCardContent(content: ArrayBuffer, path: string): Card {
    // TODO: 实际解析 .card ZIP 文件
    return this.createPlaceholderCard(path);
  }

  /**
   * 解析箱子内容
   */
  private parseBoxContent(content: ArrayBuffer, path: string): Box {
    // TODO: 实际解析 .box ZIP 文件
    return this.createPlaceholderBox(path);
  }

  /**
   * 创建占位卡片
   */
  private createPlaceholderCard(path: string): Card {
    const filename = path.split('/').pop() || 'unknown.card';
    const now = new Date().toISOString();
    return {
      id: `card-${Date.now()}`,
      metadata: {
        chip_standards_version: '1.0.0',
        card_id: `card-${Date.now()}`,
        name: filename.replace('.card', ''),
        description: `卡片文件: ${filename}`,
        author: 'Local',
        created_at: now,
        modified_at: now,
        tags: [],
      },
      structure: {
        structure: [],
        manifest: {
          card_count: 0,
          resource_count: 0,
          resources: [],
        },
      },
    };
  }

  /**
   * 创建占位箱子
   */
  private createPlaceholderBox(path: string): Box {
    const filename = path.split('/').pop() || 'unknown.box';
    const now = new Date().toISOString();
    return {
      id: `box-${Date.now()}`,
      metadata: {
        chip_standards_version: '1.0.0',
        box_id: `box-${Date.now()}`,
        name: filename.replace('.box', ''),
        description: `箱子文件: ${filename}`,
        created_at: now,
        modified_at: now,
        layout: 'grid',
        tags: [],
      },
      structure: {
        cards: [],
        total_count: 0,
      },
      content: {
        active_layout: 'grid',
        layout_configs: {
          grid: {
            layout_type: 'grid',
            columns: 2,
          },
        },
      },
    };
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
    // 检查是否在降级模式
    if (!this.sdk || !this.initialized) {
      throw new Error('SDK not available - use local rendering');
    }

    try {
      return await this.request('foundation.card.render', {
        cardData,
        options,
      });
    } catch {
      // 如果请求失败，抛出异常让调用者使用本地渲染
      throw new Error('Foundation rendering not available');
    }
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
