import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    Button
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useSettings } from '../context/SettingsContext';
import { toast } from 'sonner';

const ConfigPage = () => {
    const { settings, updateSetting, saveSettings, isLoading: isSaving } = useSettings();
    const [models, setModels] = useState([]);
    const [imageModels, setImageModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const selectedModel = settings.gemini_model || '';
    const selectedImageModel = settings.gemini_image_model || '';

    useEffect(() => {
        const fetchModels = async () => {
            if (!settings.gemini_api_key) {
                setError('A chave da API Gemini não está configurada. Por favor, configure-a no modal de setup.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await fetch('/api/google/models');
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    if (errorData && errorData.error) {
                        throw new Error(errorData.error);
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const allModels = data.models || [];

                const textModels = allModels
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .sort((a, b) => a.displayName.localeCompare(b.displayName));

                const imgModels = allModels
                    .filter(m => m.supportedGenerationMethods.includes('generateContent') && m.name.includes('vision'))
                    .sort((a, b) => a.displayName.localeCompare(b.displayName));

                setModels(textModels);
                setImageModels(imgModels);

                // Default model logic can be simplified or handled in the context if needed
                if (!selectedModel && textModels.length > 0) {
                    const defaultModel = textModels.find(m => m.name.includes('gemini-1.5-pro'));
                    if (defaultModel) {
                        updateSetting('gemini_model', defaultModel.name);
                    }
                }

                if (!selectedImageModel && imgModels.length > 0) {
                    const defaultImageModel = imgModels.find(m => m.name.includes('gemini-pro-vision'));
                     if (defaultImageModel) {
                        updateSetting('gemini_image_model', defaultImageModel.name);
                    }
                }

            } catch (e) {
                setError(`Falha ao carregar modelos: ${e.message}`);
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchModels();
    }, [settings.gemini_api_key]); // Refetch models if the API key changes

    const handleModelChange = (event) => {
        updateSetting('gemini_model', event.target.value);
    };

    const handleImageModelChange = (event) => {
        updateSetting('gemini_image_model', event.target.value);
    };

    const handleSave = async () => {
        // The saveSettings function from the context will save the entire settings object
        await saveSettings();
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Configurações
            </Typography>
            <Paper sx={{ p: 3, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Modelos de IA (Google Gemini)
                </Typography>

                {loading && <CircularProgress />}
                {error && <Alert severity="error">{error}</Alert>}

                {!loading && !error && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel id="text-model-select-label">Modelo de Texto</InputLabel>
                            <Select
                                labelId="text-model-select-label"
                                value={selectedModel}
                                label="Modelo de Texto"
                                onChange={handleModelChange}
                                disabled={models.length === 0}
                            >
                                {models.map((model) => (
                                    <MenuItem key={model.name} value={model.name}>
                                        {model.displayName} ({model.name.replace('models/', '')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="image-model-select-label">Modelo de Imagem (Vision)</InputLabel>
                            <Select
                                labelId="image-model-select-label"
                                value={selectedImageModel}
                                label="Modelo de Imagem (Vision)"
                                onChange={handleImageModelChange}
                                disabled={imageModels.length === 0}
                            >
                                {imageModels.map((model) => (
                                    <MenuItem key={model.name} value={model.name}>
                                        {model.displayName} ({model.name.replace('models/', '')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}
                 <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={isSaving}
                        startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar na Nuvem'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ConfigPage;
