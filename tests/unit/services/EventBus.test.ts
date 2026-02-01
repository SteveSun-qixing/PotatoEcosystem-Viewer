/**
 * EventBus 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@renderer/services/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on/emit', () => {
    it('should register and trigger event handlers', () => {
      const handler = vi.fn();
      eventBus.on('test', handler);

      eventBus.emit('test', { value: 42 });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);

      eventBus.emit('test', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should not trigger handler for different event', () => {
      const handler = vi.fn();
      eventBus.on('event1', handler);

      eventBus.emit('event2', 'data');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should trigger handler only once', () => {
      const handler = vi.fn();
      eventBus.once('test', handler);

      eventBus.emit('test', 1);
      eventBus.emit('test', 2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
    });
  });

  describe('off', () => {
    it('should remove specific handler by id', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const id1 = eventBus.on('test', handler1);
      eventBus.on('test', handler2);

      eventBus.off('test', id1);
      eventBus.emit('test', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should remove all handlers when no id provided', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);

      eventBus.off('test');
      eventBus.emit('test', 'data');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('waitFor', () => {
    it('should wait for event and resolve', async () => {
      setTimeout(() => {
        eventBus.emit('test', { result: 'success' });
      }, 10);

      const result = await eventBus.waitFor<{ result: string }>('test', 1000);

      expect(result).toEqual({ result: 'success' });
    });

    it('should reject on timeout', async () => {
      await expect(eventBus.waitFor('test', 10)).rejects.toThrow('Timeout');
    });
  });

  describe('listenerCount', () => {
    it('should return correct listener count', () => {
      expect(eventBus.listenerCount('test')).toBe(0);

      eventBus.on('test', vi.fn());
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.on('test', vi.fn());
      expect(eventBus.listenerCount('test')).toBe(2);
    });
  });

  describe('hasListeners', () => {
    it('should return true when listeners exist', () => {
      expect(eventBus.hasListeners('test')).toBe(false);

      eventBus.on('test', vi.fn());
      expect(eventBus.hasListeners('test')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());

      eventBus.clear();

      expect(eventBus.listenerCount('event1')).toBe(0);
      expect(eventBus.listenerCount('event2')).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should catch and log handler errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      eventBus.on('test', errorHandler);
      eventBus.on('test', normalHandler);

      eventBus.emit('test', 'data');

      expect(consoleSpy).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
