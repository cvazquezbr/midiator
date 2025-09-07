import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import ImageStep from './ImageStep';

// Mock child components
vi.mock('./FormattingPanel', () => ({
  default: () => <div data-testid="formatting-panel-mock" />
}));
vi.mock('./FieldPositioner', () => ({
  default: () => <div data-testid="field-positioner-mock" />
}));

describe('ImageStep', () => {
    const mockSetPageState = vi.fn();
    const mockSetBackgroundElement = vi.fn();
    const mockSetElements = vi.fn();
    const mockSetCurrentPreviewIndex = vi.fn();

    const defaultProps = {
        pageState: { backgroundColor: '#ffffff' },
        setPageState: mockSetPageState,
        backgroundElement: null,
        setBackgroundElement: mockSetBackgroundElement,
        elements: [],
        setElements: mockSetElements,
        csvData: [], // Default to no CSV data
        currentPreviewIndex: 0,
        setCurrentPreviewIndex: mockSetCurrentPreviewIndex,
        isMobile: false, // Default to desktop view
    };

    beforeEach(() => {
        // Clear mocks before each test
        vi.clearAllMocks();
    });

    it('renders correctly on desktop without CSV data', () => {
        render(<ImageStep {...defaultProps} />);

        expect(screen.getByText('Editor de Página')).toBeInTheDocument();
        expect(screen.getByTestId('field-positioner-mock')).toBeInTheDocument();
        expect(screen.getByTestId('formatting-panel-mock')).toBeInTheDocument();

        // The record navigation should NOT be present
        expect(screen.queryByText(/Registro:/)).not.toBeInTheDocument();
    });

    it('renders CSV record navigation when csvData is present', () => {
        const propsWithCsv = {
            ...defaultProps,
            csvData: [{ name: 'John' }, { name: 'Jane' }], // Provide 2 records
        };
        render(<ImageStep {...propsWithCsv} />);

        // The record navigation SHOULD be present
        expect(screen.getByText(/Registro: 1 \/ 2/)).toBeInTheDocument();
        // The Tooltip component renders an aria-label on a span
        expect(screen.getByLabelText('Registro Anterior')).toBeInTheDocument();
        expect(screen.getByLabelText('Próximo Registro')).toBeInTheDocument();
    });

    it('renders the upload and gallery buttons on desktop', () => {
        render(<ImageStep {...defaultProps} isMobile={false} />);
        expect(screen.getByRole('button', { name: /carregar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /galeria/i })).toBeInTheDocument();
    });

    it('renders a FAB on mobile instead of the formatting panel', () => {
        render(<ImageStep {...defaultProps} isMobile={true} />);

        // The full panel shouldn't be visible
        expect(screen.queryByTestId('formatting-panel-mock')).not.toBeInTheDocument();

        // A floating action button should be visible instead
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });
});
