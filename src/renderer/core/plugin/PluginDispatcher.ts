/**
 * 插件调度器实现
 * 根据文件类型选择合适的插件
 * @module @renderer/core/plugin/PluginDispatcher
 */
import type { PluginInstance, FileInfo } from '@common/types/plugin';
import type { IPluginManager, ILogger } from '@common/interfaces';
import { Logger } from '@renderer/services/Logger';

/**
 * 默认插件设置存储键
 */
const DEFAULT_PLUGINS_STORAGE_KEY = 'viewer:default-plugins';

/**
 * 回退插件 ID
 */
const FALLBACK_PLUGIN_ID = 'chips:fallback-viewer';

/**
 * MIME 类型映射表
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  // 图片
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  // 视频
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',

  // 音频
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',

  // 文档
  '.pdf': 'application/pdf',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.json': 'application/json',
  '.xml': 'application/xml',

  // 薯片卡片格式
  '.card': 'application/x-card',
  '.box': 'application/x-box',
};

/**
 * PluginDispatcher - 插件调度器
 *
 * @description
 * 插件调度器负责根据文件类型选择最合适的插件：
 * 1. 根据文件类型选择插件
 * 2. 管理默认插件设置
 * 3. 实现插件优先级排序
 * 4. 提供回退机制
 *
 * 调度策略：
 * 1. 检查用户设置的默认插件
 * 2. 检查文件扩展名匹配
 * 3. 检查 MIME 类型匹配
 * 4. 按优先级排序候选插件
 * 5. 返回最佳匹配或回退插件
 *
 * @example
 * ```typescript
 * const dispatcher = new PluginDispatcher(pluginManager);
 *
 * // 为文件选择插件
 * const plugin = await dispatcher.dispatch({
 *   path: '/path/to/image.png',
 *   name: 'image.png',
 *   extension: '.png',
 *   mimeType: 'image/png',
 *   size: 1024,
 *   lastModified: new Date()
 * });
 *
 * // 设置默认插件
 * dispatcher.setDefaultPlugin('image/png', 'chips:image-viewer');
 * ```
 */
export class PluginDispatcher {
  /**
   * 插件管理器引用
   */
  private readonly pluginManager: IPluginManager;

  /**
   * 默认插件映射
   * key: MIME 类型或文件扩展名
   * value: 插件 ID
   */
  private readonly defaultPlugins: Map<string, string> = new Map();

  /**
   * 日志器
   */
  private readonly logger: ILogger;

  /**
   * 创建插件调度器实例
   *
   * @param pluginManager - 插件管理器实例
   */
  constructor(pluginManager: IPluginManager) {
    this.pluginManager = pluginManager;
    this.logger = new Logger('PluginDispatcher');

    // 加载保存的默认插件设置
    this.loadDefaultSettings();

    this.logger.info('PluginDispatcher initialized');
  }

  /**
   * 为文件选择最佳插件
   *
   * @description
   * 按以下优先级选择插件：
   * 1. 用户设置的默认插件
   * 2. 扩展名精确匹配的插件
   * 3. MIME 类型匹配的插件
   * 4. 回退插件
   *
   * @param file - 文件信息
   * @returns 最佳匹配的插件实例，无匹配返回 null
   */
  async dispatch(file: FileInfo): Promise<PluginInstance | null> {
    this.logger.debug('Dispatching plugin for file', {
      path: file.path,
      extension: file.extension,
      mimeType: file.mimeType,
    });

    // 1. 检查用户设置的默认插件
    const defaultPlugin = this.getDefaultPluginForFile(file);
    if (defaultPlugin) {
      const plugin = this.pluginManager.get(defaultPlugin);
      if (plugin && this.pluginManager.isEnabled(plugin.id)) {
        this.logger.debug('Using default plugin', { pluginId: plugin.id });
        return plugin;
      }
    }

    // 2. 获取所有可用插件
    const availablePlugins = this.getAvailablePlugins(file);

    if (availablePlugins.length === 0) {
      this.logger.debug('No available plugins found, trying fallback');
      return this.getFallbackPlugin();
    }

    // 3. 按优先级排序
    const sortedPlugins = this.sortByPriority(availablePlugins, file);

    this.logger.debug('Dispatched plugin', {
      pluginId: sortedPlugins[0].id,
      candidateCount: sortedPlugins.length,
    });

    return sortedPlugins[0];
  }

  /**
   * 获取文件支持的所有插件
   *
   * @param file - 文件信息
   * @returns 支持该文件的插件实例数组
   */
  getAvailablePlugins(file: FileInfo): PluginInstance[] {
    const result: PluginInstance[] = [];
    const enabledPlugins = this.pluginManager.list({ state: 'enabled' });

    for (const plugin of enabledPlugins) {
      if (this.checkPluginSupport(plugin, file)) {
        result.push(plugin);
      }
    }

    return result;
  }

  /**
   * 设置文件类型的默认插件
   *
   * @param mimeType - MIME 类型或文件扩展名
   * @param pluginId - 插件 ID
   */
  setDefaultPlugin(mimeType: string, pluginId: string): void {
    // 验证插件是否存在
    const plugin = this.pluginManager.get(pluginId);
    if (!plugin) {
      this.logger.warn('Cannot set default: plugin not found', { pluginId });
      return;
    }

    this.defaultPlugins.set(mimeType, pluginId);

    this.logger.info('Default plugin set', { mimeType, pluginId });

    // 持久化设置
    this.persistDefaultSettings();
  }

  /**
   * 获取文件类型的默认插件
   *
   * @param mimeType - MIME 类型或文件扩展名
   * @returns 默认插件 ID，无设置返回 null
   */
  getDefaultPlugin(mimeType: string): string | null {
    return this.defaultPlugins.get(mimeType) ?? null;
  }

  /**
   * 清除默认插件设置
   *
   * @param mimeType - MIME 类型或文件扩展名
   */
  clearDefaultPlugin(mimeType: string): void {
    if (this.defaultPlugins.has(mimeType)) {
      this.defaultPlugins.delete(mimeType);

      this.logger.info('Default plugin cleared', { mimeType });

      // 持久化设置
      this.persistDefaultSettings();
    }
  }

  /**
   * 获取所有默认插件设置
   *
   * @returns 默认插件映射表的副本
   */
  getDefaultPluginSettings(): Map<string, string> {
    return new Map(this.defaultPlugins);
  }

  /**
   * 获取回退插件
   *
   * @description
   * 当没有合适的插件时，返回回退插件。
   * 回退插件通常是一个通用的文件查看器。
   *
   * @returns 回退插件实例，无可用返回 null
   */
  getFallbackPlugin(): PluginInstance | null {
    // 尝试获取指定的回退插件
    const fallback = this.pluginManager.get(FALLBACK_PLUGIN_ID);
    if (fallback && this.pluginManager.isEnabled(fallback.id)) {
      return fallback;
    }

    // 尝试获取任意 utility 类型的插件作为回退
    const utilities = this.pluginManager.list({ type: 'utility', state: 'enabled' });
    if (utilities.length > 0) {
      return utilities[0];
    }

    // 尝试获取任意 viewer-tool 类型的插件
    const viewers = this.pluginManager.list({ type: 'viewer-tool', state: 'enabled' });
    if (viewers.length > 0) {
      return viewers[0];
    }

    this.logger.warn('No fallback plugin available');
    return null;
  }

  /**
   * 根据文件路径推断 MIME 类型
   *
   * @param path - 文件路径
   * @returns MIME 类型
   */
  inferMimeType(path: string): string {
    const extension = this.getFileExtension(path);
    return EXTENSION_TO_MIME[extension] ?? 'application/octet-stream';
  }

  /**
   * 根据文件路径创建 FileInfo 对象
   *
   * @param path - 文件路径
   * @param size - 文件大小（可选）
   * @param lastModified - 最后修改时间（可选）
   * @returns FileInfo 对象
   */
  createFileInfo(path: string, size = 0, lastModified = new Date()): FileInfo {
    const name = this.getFileName(path);
    const extension = this.getFileExtension(path);
    const mimeType = this.inferMimeType(path);

    return {
      path,
      name,
      extension,
      mimeType,
      size,
      lastModified,
    };
  }

  /**
   * 按优先级排序插件
   *
   * @param plugins - 插件列表
   * @param file - 文件信息
   * @returns 排序后的插件列表
   */
  private sortByPriority(plugins: PluginInstance[], file: FileInfo): PluginInstance[] {
    return [...plugins].sort((a, b) => {
      const scoreA = this.calculatePluginScore(a, file);
      const scoreB = this.calculatePluginScore(b, file);
      return scoreB - scoreA; // 降序排列
    });
  }

  /**
   * 计算插件匹配分数
   *
   * @description
   * 分数计算规则：
   * - 扩展名精确匹配：+100
   * - MIME 类型精确匹配：+50
   * - MIME 类型前缀匹配（如 image/*）：+25
   * - 内置插件加分：+10
   *
   * @param plugin - 插件实例
   * @param file - 文件信息
   * @returns 匹配分数
   */
  private calculatePluginScore(plugin: PluginInstance, file: FileInfo): number {
    let score = 0;

    const { supportedExtensions = [], supportedTypes = [] } = plugin.metadata;

    // 扩展名精确匹配
    if (supportedExtensions.includes(file.extension)) {
      score += 100;
    }

    // MIME 类型精确匹配
    if (supportedTypes.includes(file.mimeType)) {
      score += 50;
    }

    // MIME 类型前缀匹配（如 image/*）
    const mimePrefix = file.mimeType.split('/')[0] + '/*';
    if (supportedTypes.includes(mimePrefix)) {
      score += 25;
    }

    // 内置插件加分（以 chips: 开头的为内置插件）
    if (plugin.id.startsWith('chips:')) {
      score += 10;
    }

    return score;
  }

  /**
   * 检查插件是否支持指定文件
   *
   * @param plugin - 插件实例
   * @param file - 文件信息
   * @returns 是否支持
   */
  private checkPluginSupport(plugin: PluginInstance, file: FileInfo): boolean {
    const { supportedExtensions = [], supportedTypes = [] } = plugin.metadata;

    // 检查扩展名
    if (supportedExtensions.includes(file.extension)) {
      return true;
    }

    // 检查 MIME 类型
    if (supportedTypes.includes(file.mimeType)) {
      return true;
    }

    // 检查 MIME 类型前缀（如 image/*）
    const mimePrefix = file.mimeType.split('/')[0] + '/*';
    if (supportedTypes.includes(mimePrefix)) {
      return true;
    }

    return false;
  }

  /**
   * 获取文件的默认插件
   *
   * @param file - 文件信息
   * @returns 默认插件 ID，无设置返回 null
   */
  private getDefaultPluginForFile(file: FileInfo): string | null {
    // 先检查扩展名设置
    const extensionDefault = this.defaultPlugins.get(file.extension);
    if (extensionDefault) {
      return extensionDefault;
    }

    // 再检查 MIME 类型设置
    const mimeDefault = this.defaultPlugins.get(file.mimeType);
    if (mimeDefault) {
      return mimeDefault;
    }

    // 检查 MIME 类型前缀设置
    const mimePrefix = file.mimeType.split('/')[0] + '/*';
    const prefixDefault = this.defaultPlugins.get(mimePrefix);
    if (prefixDefault) {
      return prefixDefault;
    }

    return null;
  }

  /**
   * 持久化默认插件设置
   */
  private persistDefaultSettings(): void {
    try {
      const settings: Record<string, string> = {};
      for (const [key, value] of this.defaultPlugins) {
        settings[key] = value;
      }

      localStorage.setItem(DEFAULT_PLUGINS_STORAGE_KEY, JSON.stringify(settings));

      this.logger.debug('Default plugin settings persisted', {
        count: this.defaultPlugins.size,
      });
    } catch (error) {
      this.logger.error('Failed to persist default plugin settings', error as Error);
    }
  }

  /**
   * 加载默认插件设置
   */
  private loadDefaultSettings(): void {
    try {
      const saved = localStorage.getItem(DEFAULT_PLUGINS_STORAGE_KEY);
      if (!saved) {
        return;
      }

      const settings: Record<string, string> = JSON.parse(saved);
      for (const [key, value] of Object.entries(settings)) {
        this.defaultPlugins.set(key, value);
      }

      this.logger.debug('Default plugin settings loaded', {
        count: this.defaultPlugins.size,
      });
    } catch (error) {
      this.logger.error('Failed to load default plugin settings', error as Error);
    }
  }

  /**
   * 获取文件扩展名
   *
   * @param path - 文件路径
   * @returns 小写扩展名（包含点号）
   */
  private getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));

    if (lastDot === -1 || lastDot < lastSlash) {
      return '';
    }

    return path.slice(lastDot).toLowerCase();
  }

  /**
   * 获取文件名
   *
   * @param path - 文件路径
   * @returns 文件名
   */
  private getFileName(path: string): string {
    const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    return path.slice(lastSlash + 1);
  }
}
