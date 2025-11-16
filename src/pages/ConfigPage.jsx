
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
    Alert
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
        updateSetting
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
                <Typography variant="h6" gutterBottom>
                    Modelos de IA (Google Gemini)
                </Typography>

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
                                {models.map((model) => (
                                    <MenuItem key={model.name} value={model.name}>
                                        {model.displayName} ({model.name.replace('models/', '')})
                                    </MenuItem>
                                ))}
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
                                {imageModels.map((model) => (
                                    <MenuItem key={model.name} value={model.name}>
                                        {model.displayName} ({model.name.replace('models/', '')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default ConfigPage;
