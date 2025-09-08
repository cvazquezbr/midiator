import { describe, it, expect, vi } from 'vitest';
import { createCanvas } from 'canvas';
import { drawAndComposeImage } from '../src/utils/imageComposer.js';
import dummy_background from './dummy_background.js';

describe('drawAndComposeImage', () => {
  it('should return an object with url, blob, filename, and index', async () => {
    global.document = {
      createElement: (tag) => {
        if (tag === 'canvas') {
          return createCanvas(720, 720);
        }
        return {};
      },
    };
    global.Image = (await import('canvas')).Image;

    const pageTemplate = {
      backgroundColor: '#FFFFFF',
      images: [{
        src: dummy_background,
        x: 0, y: 0, width: 100, height: 100,
        filters: {},
      }],
    };

    const result = await drawAndComposeImage({
      record: { text: 'Hello' },
      index: 0,
      brandElements: [],
      fieldPositions: { text: { x: 10, y: 10, width: 80, height: 20, visible: true } },
      fieldStyles: { text: { fontSize: 16, color: '#000000' } },
      fontScale: 1,
      aspectRatio: '1:1',
      pageTemplate: pageTemplate,
    });

    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('blob');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('index', 0);
    expect(result.url).toMatch(/^data:image\/png;base64,/);
  });

  it('should apply image transformations (e.g., size), resulting in a different image', async () => {
    global.document = {
      createElement: (tag) => (tag === 'canvas' ? createCanvas(720, 720) : {}),
    };
    global.Image = (await import('canvas')).Image;

    // 1. Generate with default size
    const pageTemplateDefaultSize = {
      backgroundColor: '#FFFFFF',
      images: [{ src: dummy_background, x: 0, y: 0, width: 100, height: 100 }],
    };
    const resultDefaultSize = await drawAndComposeImage({
      record: {}, index: 0, brandElements: [], fieldPositions: {}, fieldStyles: {},
      fontScale: 1, aspectRatio: '1:1', pageTemplate: pageTemplateDefaultSize,
    });

    // 2. Generate with different size
    const pageTemplateDifferentSize = {
      backgroundColor: '#FFFFFF',
      images: [{ src: dummy_background, x: 0, y: 0, width: 50, height: 50 }],
    };
    const resultDifferentSize = await drawAndComposeImage({
      record: {}, index: 0, brandElements: [], fieldPositions: {}, fieldStyles: {},
      fontScale: 1, aspectRatio: '1:1', pageTemplate: pageTemplateDifferentSize,
    });

    // 3. Compare data URLs
    expect(resultDifferentSize.url).not.toBe(resultDefaultSize.url);
  });
});
