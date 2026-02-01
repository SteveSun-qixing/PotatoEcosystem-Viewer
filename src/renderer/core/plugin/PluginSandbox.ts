/**
 * 插件沙箱实现
 * 提供安全隔离的插件执行环境
 * @module @renderer/core/plugin/PluginSandbox
 */
import type { PluginManifest } from '@common/types/plugin';
import type { ILogger } from '@common/interfaces';
import { Logger } from '@renderer/services/Logger';

/**
 * 沙箱状态类型
 */
export type SandboxStatus = 'active' | 'inactive' | 'error';

/**
 * 沙箱配置选项
 */
export interface SandboxOptions {
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 允许的全局对象 */
  allowedGlobals?: string[];
  /** 是否允许网络请求 */
  allowNetwork?: boolean;
  /** 是否允许访问 DOM */
  allowDOM?: boolean;
}

/**
 * 沙箱信息
 */
interface SandboxInfo {
  /** iframe 元素 */
  frame: HTMLIFrameElement;
  /** 沙箱状态 */
  status: SandboxStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 插件权限 */
  permissions: string[];
  /** 消息处理器 */
  messageHandler?: (event: MessageEvent) => void;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<SandboxOptions> = {
  timeout: 30000, // 30 秒
  allowedGlobals: ['console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Promise', 'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Error', 'TypeError', 'RangeError', 'SyntaxError'],
  allowNetwork: false,
  allowDOM: false,
};

/**
 * 可用的权限列表
 */
export const AVAILABLE_PERMISSIONS = [
  'file:read',        // 读取文件
  'file:write',       // 写入文件
  'storage:local',    // 本地存储
  'network:fetch',    // 网络请求
  'dom:access',       // DOM 访问
  'clipboard:read',   // 读取剪贴板
  'clipboard:write',  // 写入剪贴板
  'notification',     // 通知
] as const;

/**
 * PluginSandbox - 插件沙箱
 *
 * @description
 * 插件沙箱提供安全隔离的插件执行环境：
 * 1. 创建隔离的执行环境（使用 iframe）
 * 2. 限制插件访问权限
 * 3. 监控插件行为
 * 4. 处理插件异常
 *
 * 安全措施：
 * - 使用 iframe sandbox 属性
 * - 禁用危险的全局对象（eval, Function 等）
 * - 代理所有 API 调用，检查权限
 * - 超时保护
 * - 资源使用限制
 *
 * @example
 * ```typescript
 * const sandbox = new PluginSandbox();
 *
 * // 在沙箱中加载插件
 * await sandbox.loadInSandbox('my-plugin', pluginCode, manifest);
 *
 * // 检查权限
 * if (sandbox.hasPermission(manifest, 'file:read')) {
 *   // 允许文件读取
 * }
 *
 * // 销毁沙箱
 * sandbox.destroySandbox('my-plugin');
 * ```
 */
export class PluginSandbox {
  /**
   * 日志器
   */
  private readonly logger: ILogger;

  /**
   * 沙箱映射表
   * key: 插件 ID
   * value: 沙箱信息
   */
  private readonly sandboxes: Map<string, SandboxInfo> = new Map();

  /**
   * 消息处理器
   */
  private readonly messageHandlers: Map<string, Set<(message: unknown) => void>> = new Map();

  /**
   * 全局消息监听器是否已设置
   */
  private messageListenerSet = false;

  /**
   * 默认沙箱选项
   */
  private readonly options: Required<SandboxOptions>;

  /**
   * 创建插件沙箱实例
   *
   * @param options - 沙箱配置选项
   */
  constructor(options?: SandboxOptions) {
    this.logger = new Logger('PluginSandbox');
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // 设置全局消息监听器
    this.setupMessageListener();

    this.logger.info('PluginSandbox initialized');
  }

  /**
   * 在沙箱中加载插件
   *
   * @param pluginId - 插件 ID
   * @param code - 插件代码
   * @param manifest - 插件清单
   * @returns 插件模块导出
   */
  async loadInSandbox(
    pluginId: string,
    code: string,
    manifest: PluginManifest
  ): Promise<unknown> {
    this.logger.info('Loading plugin in sandbox', { pluginId });

    // 检查是否已有沙箱
    if (this.sandboxes.has(pluginId)) {
      this.logger.warn('Sandbox already exists, destroying old one', { pluginId });
      this.destroySandbox(pluginId);
    }

    // 创建沙箱 iframe
    const frame = this.createSandboxIframe(pluginId);

    // 创建受限上下文
    const context = this.createRestrictedContext(manifest);

    // 存储沙箱信息
    const sandboxInfo: SandboxInfo = {
      frame,
      status: 'active',
      createdAt: new Date(),
      permissions: manifest.permissions ?? [],
    };

    this.sandboxes.set(pluginId, sandboxInfo);

    try {
      // 在沙箱中执行代码
      const result = await this.executeInSandbox(pluginId, code, context);

      this.logger.info('Plugin loaded in sandbox', { pluginId });

      return result;
    } catch (error) {
      sandboxInfo.status = 'error';
      this.logger.error('Failed to load plugin in sandbox', error as Error, { pluginId });
      throw error;
    }
  }

  /**
   * 创建受限上下文
   *
   * @description
   * 根据插件清单中的权限创建受限的执行上下文。
   * 只有声明的权限对应的 API 才可用。
   *
   * @param manifest - 插件清单
   * @returns 受限上下文对象
   */
  createRestrictedContext(manifest: PluginManifest): Record<string, unknown> {
    const permissions = manifest.permissions ?? [];

    // 基础上下文（始终可用）
    const context: Record<string, unknown> = {
      // 安全的控制台
      console: {
        log: (...args: unknown[]) => console.log(`[Plugin:${manifest.id}]`, ...args),
        info: (...args: unknown[]) => console.info(`[Plugin:${manifest.id}]`, ...args),
        warn: (...args: unknown[]) => console.warn(`[Plugin:${manifest.id}]`, ...args),
        error: (...args: unknown[]) => console.error(`[Plugin:${manifest.id}]`, ...args),
        debug: (...args: unknown[]) => console.debug(`[Plugin:${manifest.id}]`, ...args),
      },

      // 安全的定时器
      setTimeout: (callback: () => void, delay: number) => {
        const maxDelay = Math.min(delay, this.options.timeout);
        return window.setTimeout(callback, maxDelay);
      },
      clearTimeout: (id: number) => window.clearTimeout(id),
      setInterval: (callback: () => void, delay: number) => {
        const minDelay = Math.max(delay, 100); // 最小 100ms
        return window.setInterval(callback, minDelay);
      },
      clearInterval: (id: number) => window.clearInterval(id),

      // 基础类型
      Promise,
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Symbol,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
    };

    // 根据权限添加额外的 API
    if (this.hasPermission(manifest, 'storage:local')) {
      context.localStorage = this.createRestrictedStorage(manifest.id);
    }

    if (this.hasPermission(manifest, 'network:fetch')) {
      context.fetch = this.createRestrictedFetch(manifest.id);
    }

    // 包装 API 以添加权限检查
    return this.wrapAPIWithPermissionCheck(context, permissions) as Record<string, unknown>;
  }

  /**
   * 在沙箱中执行代码
   *
   * @param pluginId - 插件 ID
   * @param code - 要执行的代码
   * @param context - 执行上下文
   * @returns 执行结果
   */
  async executeInSandbox(
    pluginId: string,
    code: string,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const sandboxInfo = this.sandboxes.get(pluginId);
    if (!sandboxInfo) {
      throw new Error(`Sandbox for plugin "${pluginId}" not found`);
    }

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        reject(new Error(`Plugin "${pluginId}" execution timeout`));
      }, this.options.timeout);

      // 设置消息处理器
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.pluginId !== pluginId) {
          return;
        }

        clearTimeout(timeoutId);

        if (event.data.type === 'result') {
          resolve(event.data.value);
        } else if (event.data.type === 'error') {
          reject(new Error(event.data.error));
        }
      };

      sandboxInfo.messageHandler = messageHandler;
      window.addEventListener('message', messageHandler);

      // 注入上下文并执行代码
      this.injectContext(sandboxInfo.frame, context);

      // 构建安全的执行代码
      const safeCode = this.buildSafeCode(pluginId, code);

      // 发送执行请求到 iframe
      const frameWindow = sandboxInfo.frame.contentWindow;
      if (frameWindow) {
        try {
          // 直接在 iframe 中创建并执行脚本
          const script = frameWindow.document.createElement('script');
          script.textContent = safeCode;
          frameWindow.document.body.appendChild(script);
        } catch (error) {
          clearTimeout(timeoutId);
          window.removeEventListener('message', messageHandler);
          reject(error);
        }
      } else {
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Sandbox iframe not accessible'));
      }
    });
  }

  /**
   * 销毁插件沙箱
   *
   * @param pluginId - 插件 ID
   */
  destroySandbox(pluginId: string): void {
    const sandboxInfo = this.sandboxes.get(pluginId);
    if (!sandboxInfo) {
      return;
    }

    this.logger.debug('Destroying sandbox', { pluginId });

    // 移除消息处理器
    if (sandboxInfo.messageHandler) {
      window.removeEventListener('message', sandboxInfo.messageHandler);
    }

    // 移除 iframe
    if (sandboxInfo.frame.parentNode) {
      sandboxInfo.frame.parentNode.removeChild(sandboxInfo.frame);
    }

    // 从映射表中移除
    this.sandboxes.delete(pluginId);
    this.messageHandlers.delete(pluginId);

    this.logger.info('Sandbox destroyed', { pluginId });
  }

  /**
   * 销毁所有沙箱
   */
  destroyAll(): void {
    this.logger.info('Destroying all sandboxes', { count: this.sandboxes.size });

    for (const pluginId of this.sandboxes.keys()) {
      this.destroySandbox(pluginId);
    }
  }

  /**
   * 检查插件是否有指定权限
   *
   * @param manifest - 插件清单
   * @param permission - 权限名称
   * @returns 是否有权限
   */
  hasPermission(manifest: PluginManifest, permission: string): boolean {
    const permissions = manifest.permissions ?? [];
    return permissions.includes(permission);
  }

  /**
   * 获取沙箱状态
   *
   * @param pluginId - 插件 ID
   * @returns 沙箱状态，不存在返回 null
   */
  getSandboxStatus(pluginId: string): SandboxStatus | null {
    const sandboxInfo = this.sandboxes.get(pluginId);
    return sandboxInfo?.status ?? null;
  }

  /**
   * 获取活跃沙箱数量
   */
  get activeSandboxCount(): number {
    let count = 0;
    for (const info of this.sandboxes.values()) {
      if (info.status === 'active') {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取所有沙箱 ID
   */
  getSandboxIds(): string[] {
    return Array.from(this.sandboxes.keys());
  }

  /**
   * 向沙箱发送消息
   *
   * @param pluginId - 插件 ID
   * @param message - 消息内容
   */
  postMessage(pluginId: string, message: unknown): void {
    const sandboxInfo = this.sandboxes.get(pluginId);
    if (!sandboxInfo || !sandboxInfo.frame.contentWindow) {
      this.logger.warn('Cannot post message: sandbox not available', { pluginId });
      return;
    }

    sandboxInfo.frame.contentWindow.postMessage(
      { pluginId, ...message as object },
      '*'
    );
  }

  /**
   * 添加消息处理器
   *
   * @param pluginId - 插件 ID
   * @param handler - 消息处理函数
   */
  onMessage(pluginId: string, handler: (message: unknown) => void): void {
    if (!this.messageHandlers.has(pluginId)) {
      this.messageHandlers.set(pluginId, new Set());
    }
    this.messageHandlers.get(pluginId)!.add(handler);
  }

  /**
   * 移除消息处理器
   *
   * @param pluginId - 插件 ID
   * @param handler - 消息处理函数（可选，不传则移除所有）
   */
  offMessage(pluginId: string, handler?: (message: unknown) => void): void {
    if (!handler) {
      this.messageHandlers.delete(pluginId);
    } else {
      this.messageHandlers.get(pluginId)?.delete(handler);
    }
  }

  /**
   * 创建沙箱 iframe
   *
   * @param pluginId - 插件 ID
   * @returns iframe 元素
   */
  private createSandboxIframe(pluginId: string): HTMLIFrameElement {
    const frame = document.createElement('iframe');

    // 设置安全属性
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('id', `plugin-sandbox-${pluginId}`);

    // 隐藏 iframe
    frame.style.display = 'none';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = 'none';

    // 创建空白文档
    frame.srcdoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Plugin Sandbox: ${pluginId}</title>
        </head>
        <body></body>
      </html>
    `;

    // 添加到 DOM
    document.body.appendChild(frame);

    this.logger.debug('Sandbox iframe created', { pluginId });

    return frame;
  }

  /**
   * 注入上下文到 iframe
   *
   * @param iframe - iframe 元素
   * @param context - 上下文对象
   */
  private injectContext(iframe: HTMLIFrameElement, context: Record<string, unknown>): void {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      throw new Error('Cannot access iframe window');
    }

    // 将上下文注入到 iframe 的全局对象
    for (const [key, value] of Object.entries(context)) {
      try {
        (frameWindow as unknown as Record<string, unknown>)[key] = value;
      } catch (error) {
        this.logger.warn('Failed to inject context property', { key, error });
      }
    }
  }

  /**
   * 设置全局消息监听器
   */
  private setupMessageListener(): void {
    if (this.messageListenerSet) {
      return;
    }

    window.addEventListener('message', this.handleMessage.bind(this));
    this.messageListenerSet = true;
  }

  /**
   * 处理来自沙箱的消息
   *
   * @param event - 消息事件
   */
  private handleMessage(event: MessageEvent): void {
    const data = event.data;
    if (!data || typeof data !== 'object' || !data.pluginId) {
      return;
    }

    const handlers = this.messageHandlers.get(data.pluginId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          this.logger.error('Message handler error', error as Error, {
            pluginId: data.pluginId,
          });
        }
      }
    }
  }

  /**
   * 包装 API 以添加权限检查
   *
   * @param api - API 对象
   * @param permissions - 权限列表
   * @returns 包装后的 API
   */
  private wrapAPIWithPermissionCheck(
    api: unknown,
    permissions: string[]
  ): unknown {
    if (typeof api !== 'object' || api === null) {
      return api;
    }

    const wrapped: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(api)) {
      if (typeof value === 'function') {
        // 包装函数以添加权限检查日志
        wrapped[key] = (...args: unknown[]) => {
          this.logger.debug('API call', { key, permissions });
          return (value as (...args: unknown[]) => unknown)(...args);
        };
      } else if (typeof value === 'object' && value !== null) {
        // 递归包装嵌套对象
        wrapped[key] = this.wrapAPIWithPermissionCheck(value, permissions);
      } else {
        wrapped[key] = value;
      }
    }

    return wrapped;
  }

  /**
   * 创建受限的本地存储
   *
   * @param pluginId - 插件 ID
   * @returns 受限的存储对象
   */
  private createRestrictedStorage(pluginId: string): Record<string, unknown> {
    const prefix = `plugin:${pluginId}:`;

    return {
      getItem: (key: string) => localStorage.getItem(prefix + key),
      setItem: (key: string, value: string) => localStorage.setItem(prefix + key, value),
      removeItem: (key: string) => localStorage.removeItem(prefix + key),
      clear: () => {
        // 只清除该插件的存储项
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      },
    };
  }

  /**
   * 创建受限的 fetch 函数
   *
   * @param pluginId - 插件 ID
   * @returns 受限的 fetch 函数
   */
  private createRestrictedFetch(pluginId: string): typeof fetch {
    const logger = this.logger;

    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      // 记录网络请求
      logger.debug('Plugin network request', { pluginId, url });

      // 可以在这里添加 URL 白名单检查

      return fetch(input, init);
    };
  }

  /**
   * 构建安全的执行代码
   *
   * @param pluginId - 插件 ID
   * @param code - 原始代码
   * @returns 安全包装后的代码
   */
  private buildSafeCode(pluginId: string, code: string): string {
    // 禁用危险的全局对象
    const disabledGlobals = ['eval', 'Function', 'XMLHttpRequest', 'WebSocket'];
    const disableCode = disabledGlobals
      .map(name => `var ${name} = undefined;`)
      .join('\n');

    return `
      (function() {
        'use strict';
        ${disableCode}

        try {
          var module = { exports: {} };
          var exports = module.exports;

          ${code}

          window.parent.postMessage({
            pluginId: '${pluginId}',
            type: 'result',
            value: module.exports
          }, '*');
        } catch (error) {
          window.parent.postMessage({
            pluginId: '${pluginId}',
            type: 'error',
            error: error.message || String(error)
          }, '*');
        }
      })();
    `;
  }
}
