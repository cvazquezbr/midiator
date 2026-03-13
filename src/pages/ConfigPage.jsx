
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
    TextField,
    Button,
    Divider
} from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import { saveGeminiModel, saveGeminiImageModel } from '../utils/geminiCredentials';

const ConfigPage = () => {
    const {
        models,
        imageModels,
        loadingModels,
        errorModels,
        settings,
        updateSetting,
        saveSettings
    } = useSettings();

    const [selectedModel, setSelectedModel] = useState(settings.gemini_model || '');
    const [selectedImageModel, setSelectedImageModel] = useState(settings.gemini_image_model || '');

    useEffect(() => {
        if (settings.gemini_model) {
            setSelectedModel(settings.gemini_model);
        }
    }, [settings.gemini_model]);

    useEffect(() => {
        if (settings.gemini_image_model) {
            setSelectedImageModel(settings.gemini_image_model);
        }
    }, [settings.gemini_image_model]);


    const handleModelChange = (event) => {
        const newModel = event.target.value;
        setSelectedModel(newModel);
        updateSetting('gemini_model', newModel);
        saveGeminiModel(newModel);
    };

    const handleImageModelChange = (event) => {
        const newModel = event.target.value;
        setSelectedImageModel(newModel);
        updateSetting('gemini_image_model', newModel);
        saveGeminiImageModel(newModel);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Configurações
            </Typography>
            <Paper sx={{ p: 3, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Modelos de IA (Google Gemini)
                    </Typography>
                    <Button variant="contained" size="small" onClick={saveSettings}>Salvar Alterações</Button>
                </Box>

                {loadingModels && <CircularProgress />}
                {errorModels && <Alert severity="error">{errorModels}</Alert>}

                {!loadingModels && !errorModels && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel id="text-model-select-label">Modelo de Texto</InputLabel>
                            <Select
                                labelId="text-model-select-label"
                                value={selectedModel}
                                label="Modelo de Texto"
                                onChange={handleModelChange}
                                disabled={models.length === 0}
                            >
                                {models.map((model) => {
                                    const isFlash = model.displayName.toLowerCase().includes('flash');
                                    const displayName = `${model.displayName} (${model.name.replace('models/', '')})`;
                                    return (
                                        <MenuItem key={model.name} value={model.name}>
                                            {displayName} {isFlash && <em style={{ marginLeft: '8px', color: '#666' }}>(Baixo Custo)</em>}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="image-model-select-label">Modelo de Imagem</InputLabel>
                            <Select
                                labelId="image-model-select-label"
                                value={selectedImageModel}
                                label="Modelo de Imagem"
                                onChange={handleImageModelChange}
                                disabled={imageModels.length === 0}
                            >
                                {imageModels.map((model) => {
                                    const isFlash = model.displayName.toLowerCase().includes('flash');
                                    const displayName = `${model.displayName} (${model.name.replace('models/', '')})`;
                                    return (
                                        <MenuItem key={model.name} value={model.name}>
                                            {displayName} {isFlash && <em style={{ marginLeft: '8px', color: '#666' }}>(Recomendado, Baixo Custo)</em>}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" gutterBottom>
                    Google Search API (Descoberta LinkedIn)
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Configurações necessárias para a descoberta de posts relevantes quando a API oficial do LinkedIn falha.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        fullWidth
                        label="Google Search API Key"
                        type="password"
                        value={settings.google_search_api_key || ''}
                        onChange={(e) => updateSetting('google_search_api_key', e.target.value)}
                        placeholder="AIza..."
                        helperText="Obtida no Google Cloud Console"
                    />
                    <TextField
                        fullWidth
                        label="Google Search Engine ID (CX)"
                        value={settings.google_search_cx || ''}
                        onChange={(e) => updateSetting('google_search_cx', e.target.value)}
                        placeholder="0123456789..."
                        helperText="Identificador do seu mecanismo de busca customizado"
                    />
                </Box>
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={saveSettings}>Salvar Todas as Configurações</Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ConfigPage;
