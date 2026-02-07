import { describe, expect, it } from 'vitest';
import { loadWorkspaceBaseCardPlugins } from '@renderer/services/BaseCardPluginLoader';

describe('BaseCardPluginLoader', () => {
  it('loads workspace base card plugins for runtime rendering', async () => {
    const plugins = await loadWorkspaceBaseCardPlugins();
    const cardTypes = plugins.map(plugin => plugin.cardType);

    expect(cardTypes).toEqual(expect.arrayContaining(['RichTextCard', 'ImageCard']));
  });
});
