import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Campaign from './Campaign';
import { CampaignProvider } from '../context/CampaignContext';
import * as SettingsContextModule from '../context/SettingsContext';

vi.mock('../context/SettingsContext', () => ({
    useSettings: () => ({
        settings: { gemini_model: 'gemini-1.5-flash', gemini_api_key: 'test' },
        updateSetting: vi.fn(),
    }),
}));

vi.mock('../utils/generationHandlers', () => ({
    generateCommonProblems: vi.fn(),
    generateCommonSolutions: vi.fn(),
}));

vi.mock('../utils/googleApi', () => ({
    uploadImageToDrive: vi.fn(),
    getOrCreateBackgroundsFolderId: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

describe('Campaign component - Page Image Upload', () => {
    it('renders upload button in Page tab', () => {
        const setCampaignState = vi.fn();

        render(
            <CampaignProvider>
                <Campaign
                    steps={[{ label: 'Step 1' }, { label: 'Step 2' }, { label: 'Step 3' }]}
                    activeStep={1}
                    problema="Problema teste"
                    solucao="Solucao teste"
                    objetivo="Gerar leads"
                    tomDeVoz="Profissional"
                    campaignContent={{ titulo: 'Título', conteudo: 'Conteúdo' }}
                    setCampaignState={setCampaignState}
                    followupPosts={[]}
                />
            </CampaignProvider>
        );

        // Switch to Tab 2 ("Página")
        const tabPage = screen.getByRole('tab', { name: /Página/i });
        fireEvent.click(tabPage);

        expect(screen.getByText(/Fazer Upload de Imagem/i)).toBeInTheDocument();
        expect(screen.getByText(/Gerar Página com IA/i)).toBeInTheDocument();
    });
});
