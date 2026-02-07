/**
 * 事件总线服务
 * @module @renderer/services/EventBus
 */
import { logger } from './Logger';

type EventHandler<T = unknown> = (data: T) => void;

interface EventSubscription {
  id: string;
  handler: EventHandler;
  once: boolean;
}

/**
 * 事件总线类
 * 提供发布/订阅模式的事件系统
 */
export class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private idCounter = 0;
  private readonly log = logger.createChild('EventBus');

  /**
   * 订阅事件
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 订阅ID，用于取消订阅
   */
  on<T>(event: string, handler: EventHandler<T>): string {
    return this.subscribe(event, handler as EventHandler, false);
  }

  /**
   * 订阅事件（只触发一次）
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 订阅ID
   */
  once<T>(event: string, handler: EventHandler<T>): string {
    return this.subscribe(event, handler as EventHandler, true);
  }

  /**
   * 取消订阅
   * @param event 事件名称
   * @param handlerId 订阅ID（可选，不传则取消所有该事件的订阅）
   */
  off(event: string, handlerId?: string): void {
    if (!handlerId) {
      this.subscriptions.delete(event);
      return;
    }

    const subs = this.subscriptions.get(event);
    if (subs) {
      const filtered = subs.filter(sub => sub.id !== handlerId);
      if (filtered.length > 0) {
        this.subscriptions.set(event, filtered);
      } else {
        this.subscriptions.delete(event);
      }
    }
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param data 事件数据
   */
  emit(event: string, data?: unknown): void {
    const subs = this.subscriptions.get(event);
    if (!subs) return;

    const toRemove: string[] = [];

    for (const sub of subs) {
      try {
        sub.handler(data);
        if (sub.once) {
          toRemove.push(sub.id);
        }
      } catch (error) {
        this.log.error('Event handler error', error as Error, { event });
      }
    }

    // 移除一次性订阅
    for (const id of toRemove) {
      this.off(event, id);
    }
  }

  /**
   * 清除所有订阅
   */
  clear(): void {
    this.subscriptions.clear();
  }

  /**
   * 等待事件
   * @param event 事件名称
   * @param timeout 超时时间（毫秒）
   * @returns Promise
   */
  waitFor<T>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = timeout
        ? setTimeout(() => {
            this.off(event, handlerId);
            reject(new Error(`Timeout waiting for event "${event}"`));
          }, timeout)
        : null;

      const handlerId = this.once<T>(event, data => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  /**
   * 获取事件订阅数量
   * @param event 事件名称
   * @returns 订阅数量
   */
  listenerCount(event: string): number {
    return this.subscriptions.get(event)?.length ?? 0;
  }

  /**
   * 检查是否有事件监听器
   * @param event 事件名称
   * @returns 是否有监听器
   */
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }

  private subscribe(event: string, handler: EventHandler, once: boolean): string {
    const id = `${event}-${++this.idCounter}`;
    const subscription: EventSubscription = { id, handler, once };

    const subs = this.subscriptions.get(event) ?? [];
    subs.push(subscription);
    this.subscriptions.set(event, subs);

    return id;
  }
}

// 单例导出
export const eventBus = new EventBus();
