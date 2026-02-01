/**
 * CardManager 单元测试
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CardManager } from '@renderer/core/viewer/CardManager';
import { EventBus } from '@renderer/services';
import type { SDKService } from '@renderer/services';

// Mock SDKService
const createMockSDKService = (): SDKService => ({
  loadCard: vi.fn(),
  getCardMetadata: vi.fn(),
  validateCard: vi.fn(),
  renderCard: vi.fn(),
  isReady: vi.fn().mockReturnValue(true),
} as unknown as SDKService);

// Mock Card 数据
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
    structure: [],
    manifest: {
      card_count: 0,
      resource_count: 0,
      resources: [],
    },
  },
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

    // 创建测试容器
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // 重置 mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  describe('openCard', () => {
    it('should open a card successfully', async () => {
      // Setup
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockResolvedValue({
        success: true,
        frame: document.createElement('iframe'),
      });

      // Act
      const result = await cardManager.openCard('/test/card.card', container);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSDKService.loadCard).toHaveBeenCalledWith('/test/card.card');
      expect(cardManager.getCurrentCard()).toEqual(mockCard);
    });

    it('should handle load error gracefully', async () => {
      // Setup
      (mockSDKService.loadCard as Mock).mockRejectedValue(new Error('Load failed'));

      // Act
      const result = await cardManager.openCard('/test/card.card', container);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Load failed');
      expect(cardManager.getCurrentCard()).toBeNull();
    });

    it('should fallback to local rendering when SDK rendering fails', async () => {
      // Setup
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockRejectedValue(new Error('Render failed'));

      // Act
      const result = await cardManager.openCard('/test/card.card', container);

      // Assert
      expect(result.success).toBe(true);
      expect(container.querySelector('iframe')).not.toBeNull();
    });

    it('should cleanup previous card when opening a new one', async () => {
      // Setup
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockResolvedValue({
        success: true,
        frame: document.createElement('iframe'),
      });

      // Act - 打开第一个卡片
      await cardManager.openCard('/test/card1.card', container);
      const firstFrame = container.querySelector('iframe');

      // 打开第二个卡片
      await cardManager.openCard('/test/card2.card', container);

      // Assert
      expect(container.querySelectorAll('iframe').length).toBe(1);
      expect(container.querySelector('iframe')).not.toBe(firstFrame);
    });
  });

  describe('closeCard', () => {
    it('should close the current card', async () => {
      // Setup
      (mockSDKService.loadCard as Mock).mockResolvedValue(mockCard);
      (mockSDKService.renderCard as Mock).mockResolvedValue({
        success: true,
        frame: document.createElement('iframe'),
      });

      await cardManager.openCard('/test/card.card', container);

      // Act
      cardManager.closeCard();

      // Assert
      expect(cardManager.getCurrentCard()).toBeNull();
      expect(container.querySelector('iframe')).toBeNull();
    });
  });

  describe('getCardMetadata', () => {
    it('should return card metadata', async () => {
      // Setup
      (mockSDKService.getCardMetadata as Mock).mockResolvedValue(mockCard.metadata);

      // Act
      const metadata = await cardManager.getCardMetadata('/test/card.card');

      // Assert
      expect(metadata).toEqual(mockCard.metadata);
      expect(mockSDKService.getCardMetadata).toHaveBeenCalledWith('/test/card.card');
    });
  });

  describe('validateCard', () => {
    it('should validate a card file', async () => {
      // Setup
      (mockSDKService.validateCard as Mock).mockResolvedValue(true);

      // Act
      const isValid = await cardManager.validateCard('/test/card.card');

      // Assert
      expect(isValid).toBe(true);
      expect(mockSDKService.validateCard).toHaveBeenCalledWith('/test/card.card');
    });
  });

  describe('zoom', () => {
    it('should set and get zoom level', () => {
      // Act
      cardManager.setZoom(1.5);

      // Assert
      expect(cardManager.getZoom()).toBe(1.5);
    });

    it('should clamp zoom to valid range', () => {
      // Act & Assert
      cardManager.setZoom(0.05);
      expect(cardManager.getZoom()).toBe(0.1);

      cardManager.setZoom(10);
      expect(cardManager.getZoom()).toBe(5);
    });
  });
});
