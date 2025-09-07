import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImageStep from './ImageStep';
import '@testing-library/jest-dom';

// Mock child components to isolate the test to ImageStep's layout
vi.mock('./FieldPositioner', () => ({
  default: () => <div data-testid="field-positioner">FieldPositioner</div>,
}));
vi.mock('./FormattingPanel', () => ({
  default: () => <div data-testid="formatting-panel">FormattingPanel</div>,
}));
vi.mock('./FormattingDrawer', () => ({
  default: () => <div data-testid="formatting-drawer">FormattingDrawer</div>,
}));

describe('ImageStep', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      aspectRatio: '16:9',
      csvHeaders: ['header1', 'header2'],
      fieldPositions: { header1: { x: 0, y: 0, width: 10, height: 10, visible: true } },
      setFieldPositions: vi.fn(),
      fieldStyles: { header1: { color: 'red' } },
      setFieldStyles: vi.fn(),
      csvData: [{ header1: 'data1', header2: 'data2' }, { header1: 'data3', header2: 'data4' }],
      onImageDisplayedSizeChange: vi.fn(),
      colorPalette: [],
      standardsColors: [],
      onCsvDataUpdate: vi.fn(),
      originalImageSize: { width: 800, height: 600 },
      brandElements: [],
      setBrandElements: vi.fn(),
      backgroundElement: {},
      setBackgroundElement: vi.fn(),
      onZIndexChange: vi.fn(),
      isMobile: false,
      selectedField: null,
      setSelectedField: vi.fn(),
      onDeselectField: vi.fn(),
      onOpenHtmlEditor: vi.fn(),
      isHtmlField: () => false,
      currentPreviewIndex: 0,
      setCurrentPreviewIndex: vi.fn(),
      templateFieldStyles: {},
      activeStep: 3,
      handleImageDrop: vi.fn(),
      handleImageDragOver: vi.fn(),
      handleImageDragEnter: vi.fn(),
      handleImageDragLeave: vi.fn(),
      handleImageUpload: vi.fn(),
      onChangeBackgroundImage: vi.fn(),
      imageInputRef: { current: null },
    };
  });

  it('should render the title, editor, and navigation in a flex column layout on desktop', () => {
    render(<ImageStep {...defaultProps} />);

    const title = screen.getByText('Editor de Página');

    // The Grid item is the flex container
    const flexContainer = title.parentElement;

    expect(flexContainer).toHaveStyle('display: flex');
    expect(flexContainer).toHaveStyle('flex-direction: column');
  });

  it('should not render the navigation controls if csvData has less than 2 items', () => {
    render(<ImageStep {...defaultProps} csvData={[{ header1: 'data1' }]} />);
    const navigation = screen.queryByText(/Registro:/i);
    expect(navigation).not.toBeInTheDocument();
  });
});
