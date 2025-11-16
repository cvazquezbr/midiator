import React, {useState, useEffect} from 'react';
import {
    Container,
    Typography,
    Paper,
    Switch,
    FormControlLabel,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
    TextField,
    Button
} from '@mui/material';
import {
    getGeminiModel,
    saveGeminiModel,
    getGeminiImageModel,
    saveGeminiImageModel
} from '../utils/geminiCredentials';
const ConfigPage = () => {
    const [models, setModels] = useState([]);
    const [imageModels, setImageModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedModel, setSelectedModel] = useState(getGeminiModel() || '');
    const [selectedImageModel, setSelectedImageModel] = useState(getGeminiImageModel() || '');

    useEffect(() => {
        const fetchModels = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('/api/google/models');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const allModels = data.models || [];

                const textModels = allModels
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .sort((a, b) => a.displayName.localeCompare(b.displayName));

                const imgModels = allModels
                    .filter(m => m.supportedGenerationMethods.includes('generateContent') && m.name.includes('imagen'))
                    .sort((a, b) => a.displayName.localeCompare(b.displayName));

                setModels(textModels);
                setImageModels(imgModels);

                if (!getGeminiModel() && textModels.length > 0) {
                    const defaultModel = textModels.find(m => m.name.includes('gemini-1.5-pro'));
                    if (defaultModel) {
                        setSelectedModel(defaultModel.name);
                        saveGeminiModel(defaultModel.name);
                    }
                }

                if (!getGeminiImageModel() && imgModels.length > 0) {
                    // Seleciona o primeiro modelo de imagem disponível como padrão
                    const defaultImageModel = imgModels[0];
                    if (defaultImageModel) {
                        setSelectedImageModel(defaultImageModel.name);
                        saveGeminiImageModel(defaultImageModel.name);
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
    }, []);

    const handleModelChange = (event) => {
        const newModel = event.target.value;
        setSelectedModel(newModel);
        saveGeminiModel(newModel);
    };

    const handleImageModelChange = (event) => {
        const newModel = event.target.value;
        setSelectedImageModel(newModel);
        saveGeminiImageModel(newModel);
    };

    return (
        <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
            <Typography variant="h4" gutterBottom>
                Configurações
            </Typography>
            <Paper sx={{p: 3, mt: 2}}>
                <Typography variant="h6" gutterBottom>
                    Modelos de IA (Google Gemini)
                </Typography>

                {loading && <CircularProgress/>}
                {error && <Alert severity="error">{error}</Alert>}

                {!loading && !error && (
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
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