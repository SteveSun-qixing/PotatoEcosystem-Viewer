/**
 * ViewerApp 集成测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ViewerApp } from '@renderer/core/viewer/ViewerApp';
import { sdkService } from '@renderer/services';

// Mock SDK
vi.mock('@renderer/services', async () => {
  const actual = await vi.importActual('@renderer/services');
  return {
    ...actual,
    sdkService: {
      initialize: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      isReady: vi.fn().mockReturnValue(true),
      loadCard: vi.fn().mockResolvedValue({
        id: 'test-card-001',
        metadata: {
          chip_standards_version: '1.0.0',
          card_id: 'test-card-001',
          name: '测试卡片',
          created_at: '2024-01-01T00:00:00Z',
          modified_at: '2024-01-01T00:00:00Z',
        },
        structure: { structure: [], manifest: { card_count: 0, resource_count: 0, resources: [] } },
      }),
      loadBox: vi.fn().mockResolvedValue({
        id: 'test-box-001',
        metadata: {
          chip_standards_version: '1.0.0',
          box_id: 'test-box-001',
          name: '测试箱子',
          created_at: '2024-01-01T00:00:00Z',
          modified_at: '2024-01-01T00:00:00Z',
          layout: 'grid',
        },
        structure: { cards: [], total_count: 0 },
        content: { active_layout: 'grid', layout_configs: { grid: { layout_type: 'grid' } } },
      }),
      renderCard: vi.fn().mockResolvedValue({ success: true, frame: document.createElement('iframe') }),
      renderBox: vi.fn().mockResolvedValue({ success: true, frame: document.createElement('iframe') }),
      getCardMetadata: vi.fn(),
      getBoxMetadata: vi.fn(),
      validateCard: vi.fn().mockResolvedValue(true),
      validateBox: vi.fn().mockResolvedValue(true),
    },
  };
});

describe('ViewerApp Integration', () => {
  let app: ViewerApp;
  let container: HTMLDivElement;

  beforeEach(async () => {
    // 设置 Pinia
    setActivePinia(createPinia());

    // 创建测试容器
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // 创建并初始化应用
    app = new ViewerApp({ debug: true });
  });

  afterEach(async () => {
    // 清理
    if (app) {
      await app.destroy();
    }
    container.remove();
    vi.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully', async () => {
      await app.initialize();

      expect(app.state).toBe('ready');
      expect(app.isReady).toBe(true);
      expect(sdkService.initialize).toHaveBeenCalled();
    });

    it('should destroy properly', async () => {
      await app.initialize();
      await app.destroy();

      expect(app.state).toBe('destroyed');
    });

    it('should not reinitialize if already ready', async () => {
      await app.initialize();
      await app.initialize();

      expect(sdkService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Card Operations', () => {
    beforeEach(async () => {
      await app.initialize();
      app.setContainer(container);
    });

    it('should open a card', async () => {
      await app.openCard('/test/card.card');

      expect(app.currentContent.type).toBe('card');
      expect(app.currentContent.path).toBe('/test/card.card');
      expect(sdkService.loadCard).toHaveBeenCalledWith('/test/card.card');
    });

    it('should close content', async () => {
      await app.openCard('/test/card.card');
      app.closeContent();

      expect(app.currentContent.type).toBe('none');
      expect(app.currentContent.data).toBeNull();
    });
  });

  describe('Box Operations', () => {
    beforeEach(async () => {
      await app.initialize();
      app.setContainer(container);
    });

    it('should open a box', async () => {
      await app.openBox('/test/box.box');

      expect(app.currentContent.type).toBe('box');
      expect(app.currentContent.path).toBe('/test/box.box');
      expect(sdkService.loadBox).toHaveBeenCalledWith('/test/box.box');
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      await app.initialize();
      app.setContainer(container);
    });

    it('should track navigation history', async () => {
      await app.openCard('/card1.card');
      await app.openCard('/card2.card');

      expect(app.canGoBack()).toBe(true);
      expect(app.canGoForward()).toBe(false);
    });

    it('should navigate back and forward', async () => {
      await app.openCard('/card1.card');
      await app.openCard('/card2.card');

      app.goBack();
      expect(app.canGoForward()).toBe(true);

      app.goForward();
      expect(app.canGoForward()).toBe(false);
    });
  });

  describe('Events', () => {
    beforeEach(async () => {
      await app.initialize();
      app.setContainer(container);
    });

    it('should emit events on content open', async () => {
      const handler = vi.fn();
      app.on('content:open', handler);

      await app.openCard('/test/card.card');

      expect(handler).toHaveBeenCalled();
    });

    it('should unsubscribe from events', async () => {
      const handler = vi.fn();
      const id = app.on('content:open', handler);
      app.off('content:open', id);

      await app.openCard('/test/card.card');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should get and set config', () => {
      app.setConfig('test.key', 'value');
      expect(app.getConfig('test.key')).toBe('value');
    });
  });

  describe('Zoom', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should set and get zoom level', () => {
      app.setZoom(1.5);
      expect(app.getZoom()).toBe(1.5);
    });
  });
});
