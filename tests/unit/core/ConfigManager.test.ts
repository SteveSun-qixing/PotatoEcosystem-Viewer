/**
 * ConfigManager 单元测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '@renderer/core/viewer/ConfigManager';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    localStorage.clear();
    configManager = new ConfigManager({
      defaults: {
        language: 'zh-CN',
        theme: 'light',
      },
      autoSave: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('get', () => {
    it('should return default value for undefined key', () => {
      // Act
      const result = configManager.get('nonexistent', 'default');

      // Assert
      expect(result).toBe('default');
    });

    it('should return value from default config', () => {
      // Act
      const result = configManager.get('language');

      // Assert
      expect(result).toBe('zh-CN');
    });

    it('should support nested keys', () => {
      // Setup
      configManager.set('plugins.autoLoad', true);

      // Act
      const result = configManager.get('plugins.autoLoad');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('set', () => {
    it('should set runtime config', () => {
      // Act
      configManager.set('language', 'en-US');

      // Assert
      expect(configManager.get('language')).toBe('en-US');
    });

    it('should override user config with runtime config', () => {
      // Setup
      configManager.setUserConfig('language', 'ja-JP');

      // Act
      configManager.set('language', 'en-US');

      // Assert
      expect(configManager.get('language')).toBe('en-US');
    });

    it('should handle nested keys', () => {
      // Act
      configManager.set('rendering.cacheSize', 100);

      // Assert
      expect(configManager.get('rendering.cacheSize')).toBe(100);
    });
  });

  describe('setUserConfig', () => {
    it('should set user config', () => {
      // Act
      configManager.setUserConfig('theme', 'dark');

      // Assert
      expect(configManager.get('theme')).toBe('dark');
    });
  });

  describe('getAll', () => {
    it('should return merged config', () => {
      // Setup
      configManager.setUserConfig('theme', 'dark');
      configManager.set('language', 'en-US');

      // Act
      const all = configManager.getAll();

      // Assert
      expect(all.theme).toBe('dark');
      expect(all.language).toBe('en-US');
    });
  });

  describe('reset', () => {
    it('should reset runtime config', () => {
      // Setup
      configManager.set('language', 'en-US');

      // Act
      configManager.reset();

      // Assert
      expect(configManager.get('language')).toBe('zh-CN');
    });

    it('should not reset user config', () => {
      // Setup
      configManager.setUserConfig('theme', 'dark');
      configManager.set('language', 'en-US');

      // Act
      configManager.reset();

      // Assert
      expect(configManager.get('theme')).toBe('dark');
    });
  });

  describe('resetAll', () => {
    it('should reset both runtime and user config', () => {
      // Setup
      configManager.setUserConfig('theme', 'dark');
      configManager.set('language', 'en-US');

      // Act
      configManager.resetAll();

      // Assert
      expect(configManager.get('theme')).toBe('light');
      expect(configManager.get('language')).toBe('zh-CN');
    });
  });

  describe('save/load', () => {
    it('should save and load config from storage', async () => {
      // Setup
      const cm = new ConfigManager({
        storageKey: 'test-config',
        autoSave: false,
      });

      cm.setUserConfig('theme', 'dark');
      cm.setUserConfig('language', 'ja-JP');

      // Act - save
      await cm.save();

      // Create new instance and load
      const cm2 = new ConfigManager({
        storageKey: 'test-config',
        autoSave: false,
      });
      await cm2.load();

      // Assert
      expect(cm2.get('theme')).toBe('dark');
      expect(cm2.get('language')).toBe('ja-JP');
    });
  });

  describe('onChange', () => {
    it('should notify handlers on config change', () => {
      // Setup
      const handler = vi.fn();
      configManager.onChange('language', handler);

      // Act
      configManager.set('language', 'en-US');

      // Assert
      expect(handler).toHaveBeenCalledWith('en-US', 'zh-CN');
    });

    it('should notify parent key handlers', () => {
      // Setup
      const handler = vi.fn();
      configManager.onChange('plugins', handler);

      // Act
      configManager.set('plugins.autoLoad', false);

      // Assert
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('offChange', () => {
    it('should remove specific handler', () => {
      // Setup
      const handler = vi.fn();
      configManager.onChange('language', handler);
      configManager.offChange('language', handler);

      // Act
      configManager.set('language', 'en-US');

      // Assert
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all handlers for key', () => {
      // Setup
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      configManager.onChange('language', handler1);
      configManager.onChange('language', handler2);
      configManager.offChange('language');

      // Act
      configManager.set('language', 'en-US');

      // Assert
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('export/import', () => {
    it('should export config as JSON string', () => {
      // Setup
      configManager.setUserConfig('theme', 'dark');
      configManager.setUserConfig('language', 'ja-JP');

      // Act
      const exported = configManager.export();
      const parsed = JSON.parse(exported);

      // Assert
      expect(parsed.theme).toBe('dark');
      expect(parsed.language).toBe('ja-JP');
    });

    it('should import config from JSON string', () => {
      // Setup
      const data = JSON.stringify({ theme: 'dark', language: 'ko-KR' });

      // Act
      configManager.import(data);

      // Assert
      expect(configManager.get('theme')).toBe('dark');
      expect(configManager.get('language')).toBe('ko-KR');
    });

    it('should throw on invalid import data', () => {
      // Act & Assert
      expect(() => configManager.import('invalid json')).toThrow('Invalid config data');
    });
  });
});
