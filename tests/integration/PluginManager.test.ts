/**
 * PluginManager 集成测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManager } from '@renderer/core/plugin/PluginManager';
import { EventBus } from '@renderer/services';
import type { PluginRegistration, PluginMetadata } from '@common/types';

// 创建测试插件
function createTestPlugin(id: string, overrides: Partial<PluginMetadata> = {}): PluginRegistration {
  return {
    id,
    metadata: {
      id,
      name: `Test Plugin ${id}`,
      version: '1.0.0',
      type: 'viewer-tool',
      description: 'A test plugin',
      supportedTypes: ['text/plain'],
      supportedExtensions: ['.txt'],
      ...overrides,
    },
    activate: vi.fn(),
    deactivate: vi.fn(),
  };
}

describe('PluginManager Integration', () => {
  let pluginManager: PluginManager;
  let eventBus: EventBus;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    pluginManager = new PluginManager(eventBus);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Registration', () => {
    it('should register a plugin', () => {
      const plugin = createTestPlugin('test-plugin-1');
      pluginManager.register(plugin);

      const registered = pluginManager.get('test-plugin-1');
      expect(registered).toBeDefined();
      expect(registered?.metadata.name).toBe('Test Plugin test-plugin-1');
    });

    it('should not register duplicate plugins', () => {
      const plugin = createTestPlugin('test-plugin-1');
      pluginManager.register(plugin);
      pluginManager.register(plugin);

      const list = pluginManager.list();
      expect(list.length).toBe(1);
    });

    it('should unregister a plugin', async () => {
      const plugin = createTestPlugin('test-plugin-1');
      pluginManager.register(plugin);
      await pluginManager.unregister('test-plugin-1');

      expect(pluginManager.get('test-plugin-1')).toBeUndefined();
    });
  });

  describe('Enable/Disable', () => {
    it('should enable a plugin', async () => {
      const plugin = createTestPlugin('test-plugin-1');
      pluginManager.register(plugin);
      await pluginManager.enable('test-plugin-1');

      expect(pluginManager.isEnabled('test-plugin-1')).toBe(true);
      expect(plugin.activate).toHaveBeenCalled();
    });

    it('should disable a plugin', async () => {
      const plugin = createTestPlugin('test-plugin-1');
      pluginManager.register(plugin);
      await pluginManager.enable('test-plugin-1');
      await pluginManager.disable('test-plugin-1');

      expect(pluginManager.isEnabled('test-plugin-1')).toBe(false);
      expect(plugin.deactivate).toHaveBeenCalled();
    });
  });

  describe('Query', () => {
    beforeEach(() => {
      pluginManager.register(createTestPlugin('plugin-1', { type: 'viewer-tool' }));
      pluginManager.register(createTestPlugin('plugin-2', { type: 'theme' }));
      pluginManager.register(createTestPlugin('plugin-3', { type: 'viewer-tool' }));
    });

    it('should list all plugins', () => {
      const list = pluginManager.list();
      expect(list.length).toBe(3);
    });

    it('should filter by type', () => {
      const list = pluginManager.list({ type: 'viewer-tool' });
      expect(list.length).toBe(2);
    });

    it('should filter by state', async () => {
      await pluginManager.enable('plugin-1');

      const enabled = pluginManager.list({ state: 'enabled' });
      expect(enabled.length).toBe(1);
      expect(enabled[0].id).toBe('plugin-1');
    });
  });

  describe('File Type Matching', () => {
    beforeEach(async () => {
      pluginManager.register(createTestPlugin('txt-viewer', {
        supportedTypes: ['text/plain'],
        supportedExtensions: ['.txt'],
      }));
      pluginManager.register(createTestPlugin('md-viewer', {
        supportedTypes: ['text/markdown'],
        supportedExtensions: ['.md'],
      }));
      await pluginManager.enable('txt-viewer');
      await pluginManager.enable('md-viewer');
    });

    it('should find plugin for file', () => {
      const plugin = pluginManager.getPluginForFile('/path/to/file.txt');
      expect(plugin?.id).toBe('txt-viewer');
    });

    it('should find plugins for MIME type', () => {
      const plugins = pluginManager.getPluginsForType('text/plain');
      expect(plugins.length).toBe(1);
      expect(plugins[0].id).toBe('txt-viewer');
    });

    it('should return undefined for unknown file type', () => {
      const plugin = pluginManager.getPluginForFile('/path/to/file.unknown');
      expect(plugin).toBeUndefined();
    });
  });

  describe('Persistence', () => {
    it('should persist enabled state', async () => {
      pluginManager.register(createTestPlugin('plugin-1'));
      await pluginManager.enable('plugin-1');

      // 检查 localStorage
      const stored = localStorage.getItem('viewer:plugin-state');
      expect(stored).not.toBeNull();

      const data = JSON.parse(stored!);
      expect(data.enabled).toContain('plugin-1');
    });
  });

  describe('Events', () => {
    it('should emit event on plugin load', async () => {
      const handler = vi.fn();
      eventBus.on('plugin:load', handler);

      const plugin = createTestPlugin('plugin-1');
      pluginManager.register(plugin);
      await pluginManager.enable('plugin-1');

      expect(handler).toHaveBeenCalled();
    });

    it('should emit event on plugin unload', async () => {
      const handler = vi.fn();
      eventBus.on('plugin:unload', handler);

      const plugin = createTestPlugin('plugin-1');
      pluginManager.register(plugin);
      await pluginManager.enable('plugin-1');
      await pluginManager.disable('plugin-1');

      expect(handler).toHaveBeenCalled();
    });
  });
});
