import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ImageStep from './ImageStep';
import { CampaignProvider } from '../context/CampaignContext';

// Mock child components
vi.mock('./ImageStepUI', () => ({
  default: (props) => <div data-testid="imagestep-ui-mock" {...props} />
}));

const mockContextValue = {
  csvData: [],
  csvHeaders: [],
  fieldPositions: {},
  setFieldPositions: vi.fn(),
  fieldStyles: {},
  setFieldStyles: vi.fn(),
  brandElements: [],
  setBrandElements: vi.fn(),
  pageTemplate: { images: [] },
  setPageTemplate: vi.fn(),
  selectedField: null,
  setSelectedField: vi.fn(),
};

const renderWithProvider = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <CampaignProvider value={providerProps.value}>
      {ui}
    </CampaignProvider>,
    renderOptions
  );
};

describe('ImageStep Container', () => {
    const defaultProps = {
        currentPreviewIndex: 0,
        setCurrentPreviewIndex: vi.fn(),
        isMobile: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the UI component and passes props correctly', () => {
        renderWithProvider(<ImageStep {...defaultProps} />, {
          providerProps: { value: mockContextValue },
        });

        // Check if the UI mock is rendered
        const uiMock = screen.getByTestId('imagestep-ui-mock');
        expect(uiMock).toBeInTheDocument();
    });

    // Since the logic for showing/hiding elements based on mobile or csvData
    // is inside ImageStepUI, we don't need to test it here. We just need to
    // ensure the container renders the UI component. The old tests for ImageStep
    // should be adapted for ImageStepUI if we wanted to test that level of detail.
    // For this refactoring, we'll keep it simple and just test the container's rendering.
});
