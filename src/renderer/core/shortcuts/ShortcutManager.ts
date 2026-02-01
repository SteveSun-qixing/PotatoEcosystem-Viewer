/**
 * ShortcutManager - 快捷键管理器
 * @module @renderer/core/shortcuts/ShortcutManager
 *
 * 功能：
 * - 快捷键注册和注销
 * - 快捷键绑定配置
 * - 默认快捷键设置
 * - 快捷键事件处理
 */
import type { ShortcutBinding } from '@common/types';
import { DEFAULT_SHORTCUTS } from '@common/constants';
import { Logger } from '@renderer/services';

/**
 * 快捷键处理器类型
 */
type ShortcutHandler = () => void | Promise<void>;

/**
 * ShortcutManager - 快捷键管理器
 *
 * 职责：
 * 1. 管理快捷键绑定
 * 2. 处理键盘事件
 * 3. 分发快捷键到对应处理器
 */
export class ShortcutManager {
  /** 快捷键绑定映射 */
  private bindings: Map<string, ShortcutBinding> = new Map();

  /** 快捷键处理器映射 */
  private handlers: Map<string, ShortcutHandler> = new Map();

  /** 是否启用快捷键 */
  private enabled = true;

  /** 日志实例 */
  private log = new Logger('ShortcutManager');

  /** 键盘事件处理函数引用（用于移除监听） */
  private boundHandleKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    // 绑定 this 上下文
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    // 设置默认快捷键绑定
    this.setupDefaultBindings();

    // 设置键盘事件监听
    this.setupKeyListener();

    this.log.info('ShortcutManager initialized');
  }

  /**
   * 注册快捷键处理器
   * @param action 动作名称
   * @param handler 处理函数
   */
  register(action: string, handler: ShortcutHandler): void {
    this.handlers.set(action, handler);
    this.log.debug(`Registered handler for action: ${action}`);
  }

  /**
   * 注销快捷键处理器
   * @param action 动作名称
   */
  unregister(action: string): void {
    this.handlers.delete(action);
    this.log.debug(`Unregistered handler for action: ${action}`);
  }

  /**
   * 设置快捷键绑定
   * @param action 动作名称
   * @param binding 绑定配置
   */
  setBinding(action: string, binding: Omit<ShortcutBinding, 'action'>): void {
    this.bindings.set(action, { ...binding, action });
    this.log.debug(`Set binding for action: ${action}`, binding);
  }

  /**
   * 获取快捷键绑定
   * @param action 动作名称
   * @returns 绑定配置
   */
  getBinding(action: string): ShortcutBinding | undefined {
    return this.bindings.get(action);
  }

  /**
   * 获取所有绑定
   * @returns 所有绑定配置
   */
  getAllBindings(): ShortcutBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * 重置为默认绑定
   */
  resetToDefaults(): void {
    this.bindings.clear();
    this.setupDefaultBindings();
    this.log.info('Reset to default bindings');
  }

  /**
   * 启用快捷键
   */
  enable(): void {
    this.enabled = true;
    this.log.debug('Shortcuts enabled');
  }

  /**
   * 禁用快捷键
   */
  disable(): void {
    this.enabled = false;
    this.log.debug('Shortcuts disabled');
  }

  /**
   * 检查快捷键是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 手动触发快捷键动作
   * @param action 动作名称
   */
  trigger(action: string): void {
    const handler = this.handlers.get(action);
    if (handler) {
      this.log.debug(`Manually triggering action: ${action}`);
      Promise.resolve(handler()).catch(error => {
        this.log.error(`Error executing handler for action: ${action}`, error as Error);
      });
    }
  }

  /**
   * 获取动作的快捷键描述
   * @param action 动作名称
   * @returns 快捷键描述（如 "Ctrl+O"）
   */
  getShortcutLabel(action: string): string {
    const binding = this.bindings.get(action);
    if (!binding) return '';

    const modifiers = binding.modifiers ?? [];
    const parts: string[] = [];

    // 按照平台习惯排序修饰键
    if (modifiers.includes('ctrl')) parts.push('Ctrl');
    if (modifiers.includes('alt')) parts.push('Alt');
    if (modifiers.includes('shift')) parts.push('Shift');
    if (modifiers.includes('meta')) parts.push('⌘');

    // 添加主键
    parts.push(this.formatKey(binding.key));

    return parts.join('+');
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    this.handlers.clear();
    this.bindings.clear();
    this.log.info('ShortcutManager destroyed');
  }

  // ==================== 私有方法 ====================

  /**
   * 设置默认快捷键绑定
   */
  private setupDefaultBindings(): void {
    for (const [action, binding] of Object.entries(DEFAULT_SHORTCUTS)) {
      this.bindings.set(action, {
        ...binding,
        action,
      });
    }
    this.log.debug('Default bindings set', {
      count: this.bindings.size,
    });
  }

  /**
   * 设置键盘事件监听
   */
  private setupKeyListener(): void {
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // 检查是否启用
    if (!this.enabled) return;

    // 忽略输入框中的快捷键
    if (this.isInputElement(event.target as HTMLElement)) return;

    // 遍历所有绑定查找匹配
    for (const [action, binding] of this.bindings) {
      if (this.matchesBinding(event, binding)) {
        // 阻止默认行为
        event.preventDefault();
        event.stopPropagation();

        // 执行处理器
        const handler = this.handlers.get(action);
        if (handler) {
          this.log.debug(`Executing shortcut: ${action}`);
          Promise.resolve(handler()).catch(error => {
            this.log.error(`Error executing handler for action: ${action}`, error as Error);
          });
        }
        return;
      }
    }
  }

  /**
   * 检查键盘事件是否匹配绑定
   */
  private matchesBinding(event: KeyboardEvent, binding: ShortcutBinding): boolean {
    // 比较主键（不区分大小写）
    const eventKey = event.key.toLowerCase();
    const bindingKey = binding.key.toLowerCase();

    if (eventKey !== bindingKey) return false;

    // 比较修饰键
    const modifiers = binding.modifiers ?? [];

    const ctrlRequired = modifiers.includes('ctrl');
    const altRequired = modifiers.includes('alt');
    const shiftRequired = modifiers.includes('shift');
    const metaRequired = modifiers.includes('meta');

    // macOS 上 Ctrl 映射到 Meta
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlPressed = isMac ? event.metaKey : event.ctrlKey;

    if (ctrlRequired !== ctrlPressed) return false;
    if (altRequired !== event.altKey) return false;
    if (shiftRequired !== event.shiftKey) return false;
    if (!isMac && metaRequired !== event.metaKey) return false;

    return true;
  }

  /**
   * 检查元素是否是输入元素
   */
  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || element.isContentEditable;
  }

  /**
   * 格式化键名用于显示
   */
  private formatKey(key: string): string {
    // 特殊键名映射
    const keyMap: Record<string, string> = {
      arrowleft: '←',
      arrowright: '→',
      arrowup: '↑',
      arrowdown: '↓',
      escape: 'Esc',
      enter: '↵',
      backspace: '⌫',
      delete: 'Del',
      ' ': 'Space',
      '=': '+',
      '-': '-',
    };

    const lower = key.toLowerCase();
    return keyMap[lower] ?? key.toUpperCase();
  }
}

// 单例导出
let shortcutManagerInstance: ShortcutManager | null = null;

/**
 * 获取快捷键管理器单例
 */
export function getShortcutManager(): ShortcutManager {
  if (!shortcutManagerInstance) {
    shortcutManagerInstance = new ShortcutManager();
  }
  return shortcutManagerInstance;
}

/**
 * 销毁快捷键管理器
 */
export function destroyShortcutManager(): void {
  if (shortcutManagerInstance) {
    shortcutManagerInstance.destroy();
    shortcutManagerInstance = null;
  }
}

// 默认导出单例
export const shortcutManager = getShortcutManager();
