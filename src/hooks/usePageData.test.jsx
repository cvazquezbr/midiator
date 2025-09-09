import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// Import the actual context, not the provider
import { CampaignContext } from '../context/CampaignContext';
import { usePageData } from './usePageData';

// A generic wrapper that provides the context directly
const createWrapper = (mockContextValue) => ({ children }) => (
  <CampaignContext.Provider value={mockContextValue}>
    {children}
  </CampaignContext.Provider>
);

describe('usePageData', () => {
  it('should return global data when no custom page data exists', () => {
    const mockContext = {
      generatedPagesData: [],
      pageTemplate: { backgroundColor: '#FFFFFF', images: [] },
      fieldPositions: { title: { x: 10, y: 10 } },
      fieldStyles: { title: { fontSize: 24 } },
      brandElements: [{ id: 'brand1', src: 'logo.png' }],
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => usePageData(0), { wrapper });

    expect(result.current.isCustom).toBe(false);
    expect(result.current.effectivePageTemplate.backgroundColor).toBe('#FFFFFF');
    expect(result.current.effectiveFieldPositions.title.x).toBe(10);
    expect(result.current.effectiveFieldStyles.title.fontSize).toBe(24);
    expect(result.current.effectiveBrandElements[0].id).toBe('brand1');
  });

  it('should return custom data when it exists for a page', () => {
    const mockContext = {
      generatedPagesData: [
        {
          index: 0,
          record: { title: 'Custom Title' },
          customPageTemplate: { backgroundColor: '#000000' },
          customFieldPositions: { title: { x: 20, y: 20 } },
          customFieldStyles: { title: { fontSize: 48 } },
          customBrandElements: [{ id: 'brand2', src: 'custom.png' }],
        },
      ],
      pageTemplate: { backgroundColor: '#FFFFFF' },
      fieldPositions: { title: { x: 10, y: 10 } },
      fieldStyles: { title: { fontSize: 24 } },
      brandElements: [{ id: 'brand1', src: 'logo.png' }],
    };

    const wrapper = createWrapper(mockContext);
    const { result } = renderHook(() => usePageData(0), { wrapper });

    expect(result.current.isCustom).toBe(true);
    expect(result.current.effectivePageTemplate.backgroundColor).toBe('#000000');
    expect(result.current.effectiveFieldPositions.title.x).toBe(20);
    expect(result.current.effectiveFieldStyles.title.fontSize).toBe(48);
    expect(result.current.effectiveBrandElements[0].id).toBe('brand2');
    expect(result.current.record.title).toBe('Custom Title');
  });
});
