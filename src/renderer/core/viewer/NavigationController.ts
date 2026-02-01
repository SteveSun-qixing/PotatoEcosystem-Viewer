/**
 * NavigationController - 导航控制器
 * @module @renderer/core/viewer/NavigationController
 */
import type { INavigationController } from '@common/interfaces';
import type { NavigationTarget, NavigationHistoryEntry } from '@common/types';
import type { NavigationControllerOptions } from './types';
import { Logger } from '@renderer/services';
import { CACHE_KEYS } from '@common/constants';
import { generateId } from '@common/types';

/**
 * NavigationController - 导航控制器
 *
 * 职责：
 * 1. 管理浏览历史
 * 2. 实现前进/后退功能
 * 3. 管理滚动位置
 * 4. 持久化历史记录
 */
export class NavigationController implements INavigationController {
  private history: NavigationHistoryEntry[] = [];
  private currentIndex = -1;
  private maxHistory: number;
  private persist: boolean;
  private storageKey: string;
  private readonly logger: Logger;

  constructor(options: NavigationControllerOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100;
    this.persist = options.persist ?? true;
    this.storageKey = options.storageKey ?? CACHE_KEYS.NAVIGATION_HISTORY;
    this.logger = new Logger('NavigationController');

    // 加载历史记录
    if (this.persist) {
      this.loadHistory();
    }
  }

  /**
   * 导航到目标
   */
  async navigate(target: NavigationTarget): Promise<void> {
    this.logger.info('Navigating', { target });

    // 生成标题
    const title = this.generateTitle(target);

    // 创建历史条目
    const entry: NavigationHistoryEntry = {
      id: generateId(),
      target,
      title,
      timestamp: new Date(),
    };

    // 添加到历史
    this.addToHistory(entry);

    this.logger.debug('Navigation entry added', { entryId: entry.id, title });
  }

  /**
   * 后退
   */
  goBack(): void {
    if (!this.canGoBack()) {
      this.logger.warn('Cannot go back, at the beginning of history');
      return;
    }

    // 保存当前位置的滚动位置
    this.saveCurrentScrollPosition();

    this.currentIndex--;
    this.logger.debug('Navigated back', { currentIndex: this.currentIndex });

    if (this.persist) {
      this.persistHistory();
    }
  }

  /**
   * 前进
   */
  goForward(): void {
    if (!this.canGoForward()) {
      this.logger.warn('Cannot go forward, at the end of history');
      return;
    }

    // 保存当前位置的滚动位置
    this.saveCurrentScrollPosition();

    this.currentIndex++;
    this.logger.debug('Navigated forward', { currentIndex: this.currentIndex });

    if (this.persist) {
      this.persistHistory();
    }
  }

  /**
   * 是否可以后退
   */
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 是否可以前进
   */
  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取历史记录
   */
  getHistory(): NavigationHistoryEntry[] {
    return [...this.history];
  }

  /**
   * 获取当前条目
   */
  getCurrentEntry(): NavigationHistoryEntry | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null;
    }
    return this.history[this.currentIndex];
  }

  /**
   * 清除历史
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
    this.logger.info('History cleared');

    if (this.persist) {
      this.persistHistory();
    }
  }

  /**
   * 跳转到历史记录中的指定位置
   */
  goTo(index: number): void {
    if (index < 0 || index >= this.history.length) {
      this.logger.warn('Invalid history index', { index, historyLength: this.history.length });
      return;
    }

    // 保存当前位置的滚动位置
    this.saveCurrentScrollPosition();

    this.currentIndex = index;
    this.logger.debug('Navigated to index', { index });

    if (this.persist) {
      this.persistHistory();
    }
  }

  /**
   * 保存滚动位置
   */
  saveScrollPosition(position: { x: number; y: number }): void {
    const entry = this.getCurrentEntry();
    if (entry) {
      entry.scrollPosition = position;
      this.logger.debug('Scroll position saved', { entryId: entry.id, position });

      if (this.persist) {
        this.persistHistory();
      }
    }
  }

  /**
   * 恢复滚动位置
   */
  restoreScrollPosition(): { x: number; y: number } | null {
    const entry = this.getCurrentEntry();
    if (entry?.scrollPosition) {
      this.logger.debug('Restoring scroll position', { entryId: entry.id, position: entry.scrollPosition });
      return entry.scrollPosition;
    }
    return null;
  }

  /**
   * 获取历史记录长度
   */
  getHistoryLength(): number {
    return this.history.length;
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  // ==================== 私有方法 ====================

  /**
   * 添加到历史
   */
  private addToHistory(entry: NavigationHistoryEntry): void {
    // 如果不在历史末尾，清除后面的记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新条目
    this.history.push(entry);
    this.currentIndex = this.history.length - 1;

    // 检查是否需要截断
    this.trimHistory();

    if (this.persist) {
      this.persistHistory();
    }
  }

  /**
   * 截断历史记录
   */
  private trimHistory(): void {
    if (this.history.length > this.maxHistory) {
      const removeCount = this.history.length - this.maxHistory;
      this.history = this.history.slice(removeCount);
      this.currentIndex = Math.max(0, this.currentIndex - removeCount);
      this.logger.debug('History trimmed', { removedCount: removeCount, newLength: this.history.length });
    }
  }

  /**
   * 持久化历史记录
   */
  private persistHistory(): void {
    try {
      const data = {
        history: this.history,
        currentIndex: this.currentIndex,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      this.logger.debug('History persisted', { count: this.history.length });
    } catch (error) {
      this.logger.error('Failed to persist history', error as Error);
    }
  }

  /**
   * 加载历史记录
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);

        // 恢复历史记录，转换时间戳
        this.history = (data.history || []).map((entry: NavigationHistoryEntry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
        this.currentIndex = data.currentIndex ?? -1;

        // 验证索引
        if (this.currentIndex >= this.history.length) {
          this.currentIndex = this.history.length - 1;
        }

        this.logger.debug('History loaded', { count: this.history.length, currentIndex: this.currentIndex });
      }
    } catch (error) {
      this.logger.error('Failed to load history', error as Error);
      this.history = [];
      this.currentIndex = -1;
    }
  }

  /**
   * 保存当前滚动位置
   */
  private saveCurrentScrollPosition(): void {
    // 获取当前滚动位置
    const position = {
      x: window.scrollX,
      y: window.scrollY,
    };
    this.saveScrollPosition(position);
  }

  /**
   * 生成标题
   */
  private generateTitle(target: NavigationTarget): string {
    const pathParts = target.path.split('/');
    const filename = pathParts[pathParts.length - 1] || target.path;

    // 移除扩展名
    const name = filename.replace(/\.(card|box)$/i, '');

    return name || target.path;
  }
}
