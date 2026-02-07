import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SDKService } from '@renderer/services/SDKService';

describe('SDKService base card content format', () => {
  const service = new SDKService();

  it('parses canonical type/data document', () => {
    const result = (service as unknown as {
      parseBaseCardDocument: (
        document: Record<string, unknown>,
        structureType: string
      ) => { type: string; data: Record<string, unknown> };
    }).parseBaseCardDocument(
      {
        type: 'RichTextCard',
        data: {
          content_source: 'inline',
          content_text: '<p>hello</p>',
        },
      },
      'RichTextCard'
    );

    expect(result.type).toBe('RichTextCard');
    expect(result.data.content_source).toBe('inline');
  });

  it('throws when document type is missing', () => {
    expect(() => {
      (service as unknown as {
        parseBaseCardDocument: (
          document: Record<string, unknown>,
          structureType: string
        ) => { type: string; data: Record<string, unknown> };
      }).parseBaseCardDocument(
        {
          data: {
            content_source: 'inline',
          },
        },
        'RichTextCard'
      );
    }).toThrow('Base card config must include type');
  });

  it('throws when structure type and content type mismatch', () => {
    expect(() => {
      (service as unknown as {
        parseBaseCardDocument: (
          document: Record<string, unknown>,
          structureType: string
        ) => { type: string; data: Record<string, unknown> };
      }).parseBaseCardDocument(
        {
          type: 'ImageCard',
          data: {
            images: [],
          },
        },
        'RichTextCard'
      );
    }).toThrow('Base card type mismatch');
  });

  it('parses real card file using canonical type/data base card format', async () => {
    const cardPath = resolve(
      process.cwd(),
      '../ProductFinishedProductTestingSpace/ExternalEnvironment/未命名卡片1_2.card'
    );
    const fileBuffer = await readFile(cardPath);

    const card = await (service as unknown as {
      parseCardFile: (buffer: ArrayBuffer, path: string) => Promise<{ baseCards?: Array<{ type: string }> }>;
    }).parseCardFile(fileBuffer as unknown as ArrayBuffer, cardPath);

    const baseCards = card.baseCards ?? [];
    expect(baseCards).toHaveLength(2);
    expect(baseCards.map(item => item.type)).toEqual(
      expect.arrayContaining(['RichTextCard', 'ImageCard'])
    );
  });
});
