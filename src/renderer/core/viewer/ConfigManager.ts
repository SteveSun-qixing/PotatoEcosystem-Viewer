/**
 * ConfigManager - 配置管理器
 * @module @renderer/core/viewer/ConfigManager
 */
import type { IConfigManager } from '@common/interfaces';
import type { ViewerConfig } from '@common/types';
import type { ConfigManagerOptions } from './types';
import { Logger } from '@renderer/services';
import { DEFAULT_CONFIG, CACHE_KEYS } from '@common/constants';

/**
 * ConfigManager - 配置管理器
 *
 * 支持多层级配置：默认配置 < 用户配置 < 运行时配置
 */
export class ConfigManager implements IConfigManager {
  private defaultConfig: ViewerConfig;
  private userConfig: Partial<ViewerConfig> = {};
  private runtimeConfig: Partial<ViewerConfig> = {};
  private changeHandlers: Map<string, Array<(newValue: unknown, oldValue: unknown) => void>> = new Map();
  private storageKey: string;
  private autoSave: boolean;
  private readonly logger: Logger;

  constructor(options: ConfigManagerOptions = {}) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...options.defaults } as ViewerConfig;
    this.storageKey = options.storageKey ?? CACHE_KEYS.USER_CONFIG;
    this.autoSave = options.autoSave ?? true;
    this.logger = new Logger('ConfigManager');
  }

  /**
   * 获取配置值
   */
  get<T>(key: string, defaultValue?: T): T {
    // 按优先级查找：运行时配置 > 用户配置 > 默认配置
    const runtimeValue = this.getNestedValue(this.runtimeConfig, key);
    if (runtimeValue !== undefined) {
      return runtimeValue as T;
    }

    const userValue = this.getNestedValue(this.userConfig, key);
    if (userValue !== undefined) {
      return userValue as T;
    }

    const defaultConfigValue = this.getNestedValue(this.defaultConfig, key);
    if (defaultConfigValue !== undefined) {
      return defaultConfigValue as T;
    }

    return defaultValue as T;
  }

  /**
   * 设置配置值（运行时）
   */
  set(key: string, value: unknown): void {
    const oldValue = this.get(key);
    this.setNestedValue(this.runtimeConfig as Record<string, unknown>, key, value);
    this.notifyChange(key, value, oldValue);
    this.logger.debug('Runtime config set', { key, value });
  }

  /**
   * 设置用户配置
   */
  setUserConfig(key: string, value: unknown): void {
    const oldValue = this.get(key);
    this.setNestedValue(this.userConfig as Record<string, unknown>, key, value);
    this.notifyChange(key, value, oldValue);
    this.logger.debug('User config set', { key, value });

    if (this.autoSave) {
      this.save().catch(error => {
        this.logger.error('Auto save failed', error as Error);
      });
    }
  }

  /**
   * 获取完整配置
   */
  getAll(): ViewerConfig {
    return this.mergeConfig();
  }

  /**
   * 重置运行时配置
   */
  reset(): void {
    this.runtimeConfig = {};
    this.logger.info('Runtime config reset');
  }

  /**
   * 重置所有配置（包括用户配置）
   */
  resetAll(): void {
    this.runtimeConfig = {};
    this.userConfig = {};
    this.logger.info('All config reset');

    if (this.autoSave) {
      this.save().catch(error => {
        this.logger.error('Auto save failed after reset', error as Error);
      });
    }
  }

  /**
   * 保存用户配置到本地存储
   */
  async save(): Promise<void> {
    try {
      const data = JSON.stringify(this.userConfig);
      localStorage.setItem(this.storageKey, data);
      this.logger.debug('Config saved');
    } catch (error) {
      this.logger.error('Failed to save config', error as Error);
      throw error;
    }
  }

  /**
   * 从本地存储加载用户配置
   */
  async load(): Promise<void> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.userConfig = JSON.parse(data);
        this.logger.debug('Config loaded', { keys: Object.keys(this.userConfig) });
      }
    } catch (error) {
      this.logger.error('Failed to load config', error as Error);
      this.userConfig = {};
    }
  }

  /**
   * 监听配置变化
   */
  onChange(key: string, handler: (newValue: unknown, oldValue: unknown) => void): void {
    const handlers = this.changeHandlers.get(key) ?? [];
    handlers.push(handler);
    this.changeHandlers.set(key, handlers);
    this.logger.debug('Config change handler added', { key });
  }

  /**
   * 取消监听
   */
  offChange(key: string, handler?: (newValue: unknown, oldValue: unknown) => void): void {
    if (!handler) {
      this.changeHandlers.delete(key);
      this.logger.debug('All config change handlers removed', { key });
      return;
    }

    const handlers = this.changeHandlers.get(key);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.changeHandlers.delete(key);
        } else {
          this.changeHandlers.set(key, handlers);
        }
        this.logger.debug('Config change handler removed', { key });
      }
    }
  }

  /**
   * 导出配置
   */
  export(): string {
    return JSON.stringify(this.userConfig, null, 2);
  }

  /**
   * 导入配置
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.userConfig = parsed;
      this.logger.info('Config imported');

      if (this.autoSave) {
        this.save().catch(error => {
          this.logger.error('Auto save failed after import', error as Error);
        });
      }
    } catch (error) {
      this.logger.error('Failed to import config', error as Error);
      throw new Error('Invalid config data');
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 合并配置
   */
  private mergeConfig(): ViewerConfig {
    return this.deepMerge(
      this.deepMerge({}, this.defaultConfig),
      this.deepMerge(this.userConfig, this.runtimeConfig)
    ) as ViewerConfig;
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }

    return result;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current = obj as Record<string, unknown>;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[key] as Record<string, unknown>;
    }

    return current;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] === undefined || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 通知变更
   */
  private notifyChange(key: string, newValue: unknown, oldValue: unknown): void {
    // 精确匹配的处理器
    const exactHandlers = this.changeHandlers.get(key);
    if (exactHandlers) {
      for (const handler of exactHandlers) {
        try {
          handler(newValue, oldValue);
        } catch (error) {
          this.logger.error('Config change handler error', error as Error, { key });
        }
      }
    }

    // 父路径的处理器
    const keyParts = key.split('.');
    for (let i = keyParts.length - 1; i > 0; i--) {
      const parentKey = keyParts.slice(0, i).join('.');
      const parentHandlers = this.changeHandlers.get(parentKey);
      if (parentHandlers) {
        const parentNewValue = this.get(parentKey);
        for (const handler of parentHandlers) {
          try {
            handler(parentNewValue, undefined);
          } catch (error) {
            this.logger.error('Config change handler error', error as Error, { key: parentKey });
          }
        }
      }
    }
  }
}
