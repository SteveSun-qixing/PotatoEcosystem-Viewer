/**
 * CardManager 单元测试
 */
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { CardManager } from '@renderer/core/viewer/CardManager';
import type { BaseCardRenderPlugin } from '@renderer/core/viewer/BaseCardPluginRegistry';
import { EventBus } from '@renderer/services';
import type { SDKService } from '@renderer/services';

const createMockSDKService = (): SDKService =>
  ({
    loadCard: vi.fn(),
    getCardMetadata: vi.fn(),
    validateCard: vi.fn(),
    renderCard: vi.fn(),
    request: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  }) as unknown as SDKService;

const mockCard = {
  id: 'card-test-001',
  metadata: {
    chip_standards_version: '1.0.0',
    card_id: 'card-test-001',
    name: '测试卡片',
    created_at: '2024-01-01T00:00:00Z',
    modified_at: '2024-01-01T00:00:00Z',
    description: '这是一个测试卡片',
    author: '测试作者',
  },
  structure: {
    structure: [
      {
        id: 'base-rich-001',
        type: 'RichTextCard',
      },
    ],
    manifest: {
      card_count: 1,
      resource_count: 0,
      resources: [],
    },
  },
  baseCards: [
    {
      id: 'base-rich-001',
      type: 'RichTextCard',
      config: {
        card_type: 'RichTextCard',
        content_source: 'inline',
        content_text: '<p>hello</p>',
      },
      content: '<p>hello</p>',
    },
  ],
};

describe('CardManager', () => {
  let cardManager: CardManager;
  let mockSDKService: SDKService;
  let eventBus: EventBus;
  let container: HTMLDivElement;

  beforeEach(() => {
    mockSDKService = createMockSDKService();
    eventBus = new EventBus();
    cardManager = new CardManager(mockSDKService, eventBus);

    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  describe('openCard', () => {
    it('should open a card successfully', async () => {
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockResolvedValue({
        success: true,
        frame: document.createElement('iframe'),
      });

      const result = await cardManager.openCard('/test/card.card', container);

      expect(result.success).toBe(true);
      expect(mockSDKService.loadCard).toHaveBeenCalledWith('/test/card.card');
      expect(cardManager.getCurrentCard()).toEqual(mockCard);
    });

    it('should handle load error gracefully', async () => {
      (mockSDKService.loadCard as Mock).mockRejectedValue(new Error('Load failed'));

      const result = await cardManager.openCard('/test/card.card', container);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Load failed');
      expect(cardManager.getCurrentCard()).toBeNull();
    });

    it('should fallback to plugin rendering when foundation rendering fails', async () => {
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockRejectedValue(new Error('Render failed'));

      const cleanup = vi.fn();
      const plugin: BaseCardRenderPlugin = {
        id: 'test:richtext',
        cardType: 'RichTextCard',
        render: async ({ container: target }) => {
          target.innerHTML = '<div data-testid="plugin-render">plugin rendered</div>';
          return { cleanup };
        },
      };
      cardManager.registerBaseCardPlugin(plugin);

      const result = await cardManager.openCard('/test/card.card', container);

      expect(result.success).toBe(true);
      expect(container.querySelector('[data-testid="plugin-render"]')).not.toBeNull();
      cardManager.closeCard();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should render a visible error block when required base card plugin is missing', async () => {
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockRejectedValue(new Error('Render failed'));

      const result = await cardManager.openCard('/test/card.card', container);
      const errorBlock = container.querySelector('.chips-viewer-base-card-empty');

      expect(result.success).toBe(true);
      expect(errorBlock?.textContent).toContain('Plugin missing for RichTextCard');
    });

    it('should cleanup previous plugin render when opening a new card', async () => {
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockRejectedValue(new Error('Render failed'));

      const cleanup = vi.fn();
      cardManager.registerBaseCardPlugin({
        id: 'test:richtext',
        cardType: 'RichTextCard',
        render: async ({ container: target }) => {
          target.innerHTML = '<div class="plugin-card">ok</div>';
          return { cleanup };
        },
      });

      await cardManager.openCard('/test/card1.card', container);
      await cardManager.openCard('/test/card2.card', container);

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(container.querySelectorAll('.plugin-card').length).toBe(1);
      cardManager.closeCard();
      expect(cleanup).toHaveBeenCalledTimes(2);
    });
  });

  describe('closeCard', () => {
    it('should close the current card', async () => {
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockResolvedValue({
        success: true,
        frame: document.createElement('iframe'),
      });

      await cardManager.openCard('/test/card.card', container);

      cardManager.closeCard();

      expect(cardManager.getCurrentCard()).toBeNull();
      expect(container.querySelector('iframe')).toBeNull();
    });
  });

  describe('getCardMetadata', () => {
    it('should return card metadata', async () => {
      (mockSDKService.getCardMetadata as Mock).mockResolvedValue(mockCard.metadata);

      const metadata = await cardManager.getCardMetadata('/test/card.card');

      expect(metadata).toEqual(mockCard.metadata);
      expect(mockSDKService.getCardMetadata).toHaveBeenCalledWith('/test/card.card');
    });
  });

  describe('validateCard', () => {
    it('should validate a card file', async () => {
      (mockSDKService.validateCard as Mock).mockResolvedValue(true);

      const isValid = await cardManager.validateCard('/test/card.card');

      expect(isValid).toBe(true);
      expect(mockSDKService.validateCard).toHaveBeenCalledWith('/test/card.card');
    });
  });

  describe('zoom', () => {
    it('should set and get zoom level', () => {
      cardManager.setZoom(1.5);
      expect(cardManager.getZoom()).toBe(1.5);
    });

    it('should clamp zoom to valid range', () => {
      cardManager.setZoom(0.05);
      expect(cardManager.getZoom()).toBe(0.1);

      cardManager.setZoom(10);
      expect(cardManager.getZoom()).toBe(5);
    });
  });
});
