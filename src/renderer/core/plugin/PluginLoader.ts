/**
 * 插件加载器实现
 * 负责从文件系统或网络加载插件
 * @module @renderer/core/plugin/PluginLoader
 */
import type {
  PluginRegistration,
  PluginManifest,
  PluginMetadata,
  PluginContext,
} from '@common/types/plugin';
import type { ILogger } from '@common/interfaces';
import { Logger } from '@renderer/services/Logger';
import { MIN_SDK_VERSION, VERSION } from '@common/constants';

/**
 * 清单验证结果
 */
interface ManifestValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 兼容性检查结果
 */
interface CompatibilityResult {
  /** 是否兼容 */
  compatible: boolean;
  /** 不兼容原因 */
  reason?: string;
}

/**
 * PluginLoader - 插件加载器
 *
 * @description
 * 插件加载器负责：
 * 1. 从文件系统加载插件
 * 2. 解析插件清单
 * 3. 验证插件完整性
 * 4. 加载内置插件
 *
 * 支持的加载来源：
 * - 内置插件（编译时注册）
 * - 本地文件系统插件
 * - 插件目录扫描
 *
 * @example
 * ```typescript
 * const loader = new PluginLoader();
 *
 * // 注册内置插件
 * loader.registerBuiltinPlugin(videoViewerPlugin);
 *
 * // 加载所有内置插件
 * const builtins = await loader.loadBuiltinPlugins();
 *
 * // 从路径加载插件
 * const plugin = await loader.loadFromPath('/path/to/plugin');
 * ```
 */
export class PluginLoader {
  /**
   * 日志器
   */
  private readonly logger: ILogger;

  /**
   * 内置插件列表
   */
  private readonly builtinPlugins: PluginRegistration[] = [];

  /**
   * 已加载的插件缓存
   */
  private readonly loadedPlugins: Map<string, PluginRegistration> = new Map();

  /**
   * 创建插件加载器实例
   */
  constructor() {
    this.logger = new Logger('PluginLoader');
    this.logger.info('PluginLoader initialized');
  }

  /**
   * 加载内置插件
   *
   * @description
   * 返回所有已注册的内置插件列表。
   * 内置插件通过 registerBuiltinPlugin 方法注册。
   *
   * @returns 内置插件注册信息数组
   */
  async loadBuiltinPlugins(): Promise<PluginRegistration[]> {
    this.logger.info('Loading builtin plugins', { count: this.builtinPlugins.length });

    // 验证所有内置插件
    const validPlugins: PluginRegistration[] = [];

    for (const plugin of this.builtinPlugins) {
      const validation = this.validateManifest(plugin.metadata as PluginManifest);
      if (validation.valid) {
        validPlugins.push(plugin);
      } else {
        this.logger.warn('Invalid builtin plugin', {
          id: plugin.id,
          errors: validation.errors,
        });
      }
    }

    this.logger.info('Builtin plugins loaded', { count: validPlugins.length });

    return validPlugins;
  }

  /**
   * 从路径加载插件
   *
   * @description
   * 从指定路径加载插件。支持：
   * - 目录路径（包含 plugin.json 清单）
   * - 清单文件路径
   *
   * @param pluginPath - 插件路径
   * @returns 插件注册信息
   * @throws {Error} 如果加载失败
   */
  async loadFromPath(pluginPath: string): Promise<PluginRegistration> {
    this.logger.info('Loading plugin from path', { path: pluginPath });

    // 检查缓存
    if (this.loadedPlugins.has(pluginPath)) {
      this.logger.debug('Returning cached plugin', { path: pluginPath });
      return this.loadedPlugins.get(pluginPath)!;
    }

    try {
      // 确定清单文件路径
      const manifestPath = pluginPath.endsWith('.json')
        ? pluginPath
        : `${pluginPath}/plugin.json`;

      // 读取清单文件
      const manifestContent = await this.readFile(manifestPath);
      const manifest = this.parseManifest(manifestContent);

      // 验证清单
      const validation = this.validateManifest(manifest);
      if (!validation.valid) {
        throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
      }

      // 检查兼容性
      const compatibility = this.checkCompatibility(manifest);
      if (!compatibility.compatible) {
        throw new Error(`Plugin incompatible: ${compatibility.reason}`);
      }

      // 确定基础路径
      const basePath = pluginPath.endsWith('.json')
        ? pluginPath.substring(0, pluginPath.lastIndexOf('/'))
        : pluginPath;

      // 加载插件注册信息
      const registration = await this.loadFromManifest(manifest, basePath);

      // 缓存
      this.loadedPlugins.set(pluginPath, registration);

      this.logger.info('Plugin loaded from path', {
        path: pluginPath,
        id: registration.id,
      });

      return registration;
    } catch (error) {
      this.logger.error('Failed to load plugin from path', error as Error, {
        path: pluginPath,
      });
      throw error;
    }
  }

  /**
   * 从清单加载插件
   *
   * @param manifest - 插件清单
   * @param basePath - 插件基础路径
   * @returns 插件注册信息
   */
  async loadFromManifest(manifest: PluginManifest, basePath: string): Promise<PluginRegistration> {
    this.logger.debug('Loading plugin from manifest', {
      id: manifest.id,
      basePath,
    });

    // 加载插件主模块
    const mainPath = this.resolvePluginPath(basePath, manifest.main);
    const pluginModule = await this.loadPluginModule(mainPath);

    // 构建注册信息
    const registration: PluginRegistration = {
      id: manifest.id,
      metadata: this.extractMetadata(manifest),
      activate: (pluginModule as { activate: (ctx: PluginContext) => Promise<void> }).activate,
      deactivate: (pluginModule as { deactivate?: () => Promise<void> }).deactivate,
    };

    return registration;
  }

  /**
   * 扫描目录下的所有插件
   *
   * @description
   * 递归扫描指定目录，查找所有包含 plugin.json 的子目录。
   *
   * @param directory - 要扫描的目录
   * @returns 插件注册信息数组
   */
  async scanDirectory(directory: string): Promise<PluginRegistration[]> {
    this.logger.info('Scanning directory for plugins', { directory });

    const plugins: PluginRegistration[] = [];

    try {
      // 在 Electron 环境中，需要通过 IPC 调用主进程来扫描目录
      // 这里提供一个基础实现框架
      const entries = await this.listDirectory(directory);

      for (const entry of entries) {
        const entryPath = `${directory}/${entry}`;

        // 检查是否是目录且包含 plugin.json
        if (await this.isDirectory(entryPath)) {
          const manifestPath = `${entryPath}/plugin.json`;

          if (await this.fileExists(manifestPath)) {
            try {
              const plugin = await this.loadFromPath(entryPath);
              plugins.push(plugin);
            } catch (error) {
              this.logger.warn('Failed to load plugin from directory', {
                path: entryPath,
                error: (error as Error).message,
              });
            }
          }
        }
      }

      this.logger.info('Directory scan completed', {
        directory,
        pluginsFound: plugins.length,
      });
    } catch (error) {
      this.logger.error('Failed to scan directory', error as Error, { directory });
    }

    return plugins;
  }

  /**
   * 验证插件清单
   *
   * @param manifest - 插件清单
   * @returns 验证结果
   */
  validateManifest(manifest: PluginManifest): ManifestValidationResult {
    const errors: string[] = [];

    // 验证必需字段
    if (!manifest.id) {
      errors.push('Missing required field: id');
    } else if (!/^[a-z][a-z0-9-]*(:?[a-z][a-z0-9-]*)*$/.test(manifest.id)) {
      errors.push('Invalid id format');
    }

    if (!manifest.name) {
      errors.push('Missing required field: name');
    }

    if (!manifest.version) {
      errors.push('Missing required field: version');
    } else if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(manifest.version)) {
      errors.push('Invalid version format (expected semver)');
    }

    if (!manifest.type) {
      errors.push('Missing required field: type');
    } else if (!['viewer-tool', 'layout', 'theme', 'utility'].includes(manifest.type)) {
      errors.push(`Invalid plugin type: ${manifest.type}`);
    }

    if (!manifest.main) {
      errors.push('Missing required field: main');
    }

    // 验证可选字段格式
    if (manifest.supportedTypes && !Array.isArray(manifest.supportedTypes)) {
      errors.push('supportedTypes must be an array');
    }

    if (manifest.supportedExtensions && !Array.isArray(manifest.supportedExtensions)) {
      errors.push('supportedExtensions must be an array');
    }

    if (manifest.permissions && !Array.isArray(manifest.permissions)) {
      errors.push('permissions must be an array');
    }

    if (manifest.settings && !Array.isArray(manifest.settings)) {
      errors.push('settings must be an array');
    }

    // 验证设置项
    if (manifest.settings) {
      for (const setting of manifest.settings) {
        if (!setting.key) {
          errors.push(`Setting missing required field: key`);
        }
        if (!setting.type) {
          errors.push(`Setting "${setting.key}" missing required field: type`);
        }
        if (!setting.label) {
          errors.push(`Setting "${setting.key}" missing required field: label`);
        }
        if (setting.default === undefined) {
          errors.push(`Setting "${setting.key}" missing required field: default`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查插件兼容性
   *
   * @param manifest - 插件清单
   * @returns 兼容性检查结果
   */
  checkCompatibility(manifest: PluginManifest): CompatibilityResult {
    // 检查最低 Viewer 版本要求
    if (manifest.minViewerVersion) {
      const required = this.parseVersion(manifest.minViewerVersion);
      const current = this.parseVersion(VERSION);

      if (this.compareVersions(current, required) < 0) {
        return {
          compatible: false,
          reason: `Plugin requires Viewer version ${manifest.minViewerVersion} or higher, current version is ${VERSION}`,
        };
      }
    }

    // 检查 SDK 版本兼容性
    const minSdk = this.parseVersion(MIN_SDK_VERSION);
    // 假设插件元数据中有 sdkVersion 字段
    const pluginSdk = manifest.dependencies?.['@chips/sdk'];
    if (pluginSdk) {
      const pluginSdkVersion = this.parseVersion(pluginSdk);
      if (this.compareVersions(pluginSdkVersion, minSdk) < 0) {
        return {
          compatible: false,
          reason: `Plugin SDK version ${pluginSdk} is not compatible with minimum required version ${MIN_SDK_VERSION}`,
        };
      }
    }

    return { compatible: true };
  }

  /**
   * 注册内置插件
   *
   * @param registration - 插件注册信息
   */
  registerBuiltinPlugin(registration: PluginRegistration): void {
    // 验证注册信息
    const validation = this.validateManifest(registration.metadata as PluginManifest);
    if (!validation.valid) {
      this.logger.error('Invalid builtin plugin registration', undefined, {
        id: registration.id,
        errors: validation.errors,
      });
      throw new Error(`Invalid builtin plugin: ${validation.errors.join(', ')}`);
    }

    // 检查是否已注册
    const exists = this.builtinPlugins.some(p => p.id === registration.id);
    if (exists) {
      this.logger.warn('Builtin plugin already registered', { id: registration.id });
      return;
    }

    this.builtinPlugins.push(registration);

    this.logger.debug('Builtin plugin registered', {
      id: registration.id,
      name: registration.metadata.name,
    });
  }

  /**
   * 获取所有已注册的内置插件
   *
   * @returns 内置插件列表
   */
  getBuiltinPlugins(): PluginRegistration[] {
    return [...this.builtinPlugins];
  }

  /**
   * 清除加载缓存
   */
  clearCache(): void {
    this.loadedPlugins.clear();
    this.logger.debug('Plugin load cache cleared');
  }

  /**
   * 解析清单文件内容
   *
   * @param content - 清单文件内容
   * @returns 解析后的清单对象
   */
  private parseManifest(content: string): PluginManifest {
    try {
      return JSON.parse(content) as PluginManifest;
    } catch (error) {
      throw new Error(`Failed to parse manifest: ${(error as Error).message}`);
    }
  }

  /**
   * 加载插件模块
   *
   * @param mainPath - 主模块路径
   * @returns 插件模块导出
   */
  private async loadPluginModule(mainPath: string): Promise<unknown> {
    try {
      // 使用动态导入加载插件模块
      const module = await import(/* @vite-ignore */ mainPath);
      return module;
    } catch (error) {
      throw new Error(`Failed to load plugin module from "${mainPath}": ${(error as Error).message}`);
    }
  }

  /**
   * 解析插件相对路径
   *
   * @param basePath - 基础路径
   * @param relativePath - 相对路径
   * @returns 完整路径
   */
  private resolvePluginPath(basePath: string, relativePath: string): string {
    // 如果是绝对路径，直接返回
    if (relativePath.startsWith('/') || relativePath.startsWith('file://')) {
      return relativePath;
    }

    // 处理相对路径
    if (relativePath.startsWith('./')) {
      relativePath = relativePath.substring(2);
    }

    return `${basePath}/${relativePath}`;
  }

  /**
   * 从清单提取元数据
   *
   * @param manifest - 插件清单
   * @returns 插件元数据
   */
  private extractMetadata(manifest: PluginManifest): PluginMetadata {
    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      type: manifest.type,
      description: manifest.description,
      author: manifest.author,
      license: manifest.license,
      homepage: manifest.homepage,
      repository: manifest.repository,
      icon: manifest.icon,
      supportedTypes: manifest.supportedTypes,
      supportedExtensions: manifest.supportedExtensions,
      minViewerVersion: manifest.minViewerVersion,
    };
  }

  /**
   * 读取文件内容
   *
   * @param path - 文件路径
   * @returns 文件内容
   */
  private async readFile(path: string): Promise<string> {
    try {
      const response = await fetch(`file://${path}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    } catch (error) {
      throw new Error(`Failed to read file "${path}": ${(error as Error).message}`);
    }
  }

  /**
   * 检查文件是否存在
   *
   * @param path - 文件路径
   * @returns 是否存在
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const response = await fetch(`file://${path}`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 列出目录内容
   *
   * @param directory - 目录路径
   * @returns 目录项列表
   */
  private async listDirectory(directory: string): Promise<string[]> {
    // 在 Electron 环境中，这需要通过 IPC 调用主进程
    // 这里返回空数组作为默认实现
    this.logger.debug('listDirectory called', { directory });
    return [];
  }

  /**
   * 检查路径是否是目录
   *
   * @param path - 路径
   * @returns 是否是目录
   */
  private async isDirectory(path: string): Promise<boolean> {
    // 在 Electron 环境中，这需要通过 IPC 调用主进程
    this.logger.debug('isDirectory called', { path });
    return false;
  }

  /**
   * 解析版本号
   *
   * @param version - 版本字符串
   * @returns 版本号数组 [major, minor, patch]
   */
  private parseVersion(version: string): [number, number, number] {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return [0, 0, 0];
    }
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
  }

  /**
   * 比较版本号
   *
   * @param a - 版本 A
   * @param b - 版本 B
   * @returns 比较结果（-1: a < b, 0: a = b, 1: a > b）
   */
  private compareVersions(
    a: [number, number, number],
    b: [number, number, number]
  ): -1 | 0 | 1 {
    for (let i = 0; i < 3; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return 0;
  }
}
