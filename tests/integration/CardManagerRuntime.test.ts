import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CardManager } from '@renderer/core/viewer/CardManager';
import { EventBus } from '@renderer/services/EventBus';
import { SDKService } from '@renderer/services/SDKService';
import { loadWorkspaceBaseCardPlugins } from '@renderer/services/BaseCardPluginLoader';

describe('CardManager runtime plugin rendering', () => {
  it('opens and renders a real card file in standalone plugin mode', async () => {
    const cardPath = resolve(
      process.cwd(),
      '../ProductFinishedProductTestingSpace/ExternalEnvironment/未命名卡片1_2.card'
    );
    const fileBuffer = await readFile(cardPath);
    const sdkService = new SDKService();

    const card = await (sdkService as unknown as {
      parseCardFile: (buffer: ArrayBuffer, path: string) => Promise<unknown>;
    }).parseCardFile(fileBuffer as unknown as ArrayBuffer, cardPath);

    const sdkMock = {
      loadCard: vi.fn().mockResolvedValue(card),
      renderCard: vi.fn().mockRejectedValue(new Error('Foundation rendering unavailable')),
      getCardMetadata: vi.fn(),
      validateCard: vi.fn(),
      request: vi.fn(),
    } as unknown as SDKService;

    const manager = new CardManager(sdkMock, new EventBus());
    const plugins = await loadWorkspaceBaseCardPlugins();
    for (const plugin of plugins) {
      manager.registerBaseCardPlugin(plugin);
    }

    const container = document.createElement('div');
    const result = await manager.openCard(cardPath, container, {
      mode: 'full',
      interactive: true,
      autoHeight: true,
    });

    expect(result.success).toBe(true);
    expect(container.querySelectorAll('.chips-viewer-base-card')).toHaveLength(2);
    expect(container.querySelector('.chips-richtext-content')).not.toBeNull();
    expect(container.querySelectorAll('.chips-image-grid__img').length).toBeGreaterThan(0);
  });
});
