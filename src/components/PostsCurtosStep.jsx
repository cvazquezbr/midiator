import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  TextField,
  Link as MuiLink,
  Alert,
  Slider,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFileOutlined,
  AutoAwesomeOutlined as GeminiIcon,
} from '@mui/icons-material';
import CsvInfobox from './CsvInfobox';
import RecordManager from '../features/RecordManager/RecordManager';
import { getGeminiApiKey } from '../utils/geminiCredentials';

const PostsCurtosStep = ({
  inputMethod,
  setInputMethod,
  handleDrop: handleDropProp,
  handleDragOver: handleDragOverProp,
  fileInputRef,
  handleCSVUpload,
  downloadExampleCsv,
  setShowSetupModal,
  promptNumRecords,
  setPromptNumRecords,
  promptText,
  setPromptText,
  generateImagesAutomatically,
  setGenerateImagesAutomatically,
  handleGenerateIAContent,
  isGenerating,
  csvData,
  csvHeaders,
  onDadosAlterados,
  darkMode,
  exportCsv,
  aspectRatio,
  setAspectRatio,
}) => {
  const [isDraggingOverCsv, setIsDraggingOverCsv] = useState(false);
  const [isGeminiKeyConfigured, setIsGeminiKeyConfigured] = useState(true);

  useEffect(() => {
    const key = getGeminiApiKey();
    setIsGeminiKeyConfigured(!!key);
  }, []);

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverCsv(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverCsv(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverCsv(false);
    handleDropProp(event);
  };

  // Show RecordManager if data exists or if user chose manual creation
  const showRecordManager = inputMethod === 'manual';

  // Show creation options if there's no data and method is not manual
  const showCreationOptions = !showRecordManager;

  return (
    <Card>
      <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 4 } }}>
        <Typography variant="h5" gutterBottom sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 3
        }}>
          <InsertDriveFileOutlined />
          Posts Curtos
        </Typography>

        {/* Seletor de método de entrada - sempre visível quando não há dados */}
        {!showRecordManager && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <ToggleButtonGroup
                color="primary"
                value={inputMethod}
                exclusive
                onChange={(event, newInputMethod) => {
                  if (newInputMethod !== null) {
                    setInputMethod(newInputMethod);
                  }
                }}
              >
                <ToggleButton value="ia" sx={{ display: 'flex', gap: 1 }}>
                  <GeminiIcon />
                  Gerar com IA
                </ToggleButton>
                <ToggleButton value="csv">Carregar CSV</ToggleButton>
                <ToggleButton value="manual">Criação Manual</ToggleButton>
              </ToggleButtonGroup>
            </Box>
        )}


        {showCreationOptions && (
          <>
            {inputMethod === 'ia' && (
              <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                {!isGeminiKeyConfigured && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    A chave de API do Gemini não está configurada. Por favor, vá para <MuiLink component="button" variant="body2" onClick={() => setShowSetupModal(true)}>Configurações</MuiLink> para adicioná-la.
                  </Alert>
                )}
                <Typography gutterBottom>Quantidade de Posts</Typography>
                <Slider
                  value={promptNumRecords}
                  onChange={(e, newValue) => setPromptNumRecords(newValue)}
                  aria-labelledby="discrete-slider"
                  valueLabelDisplay="auto"
                  step={1}
                  marks
                  min={1}
                  max={5}
                  sx={{ mb: 3 }}
                />
                <TextField
                  label="Descrição do Conteúdo"
                  multiline
                  rows={4}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="Ex: Um carrossel sobre os benefícios da meditação para reduzir o estresse..."
                  sx={{ mb: 3 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={generateImagesAutomatically}
                        onChange={(e) => setGenerateImagesAutomatically(e.target.checked)}
                      />
                    }
                    label="Gerar imagens"
                    sx={{ m: 0 }} // Remove default margin
                  />
                  <FormControl variant="outlined" sx={{ minWidth: 150 }}>
                    <InputLabel id="aspect-ratio-label">Razão de Aspecto</InputLabel>
                    <Select
                      labelId="aspect-ratio-label"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      label="Razão de Aspecto"
                      size="small"
                    >
                      <MenuItem value="1:1">Quadrado (1:1)</MenuItem>
                      <MenuItem value="4:5">Retrato (4:5)</MenuItem>
                      <MenuItem value="16:9">Paisagem (16:9)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleGenerateIAContent}
                  disabled={isGenerating || !promptText.trim()}
                >
                  {isGenerating ? 'Gerando...' : 'Gerar Conteúdo com IA'}
                </Button>
              </Box>
            )}

            {inputMethod === 'csv' && (
              <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12} md={8}>
                  <Card
                    sx={{
                      border: isDraggingOverCsv ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                      backgroundColor: isDraggingOverCsv ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                      textAlign: 'center',
                      p: 4,
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOverProp}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                  >
                    <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Arraste e solte ou clique para Upload</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Carregue um arquivo CSV com o conteúdo de seus posts
                      </Typography>
                      <CsvInfobox />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <Button variant="contained" component="label">
                        Selecionar Arquivo
                        <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleCSVUpload} />
                      </Button>
                      <Button variant="outlined" onClick={downloadExampleCsv}>
                        Baixar CSV Exemplo
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        )}

        {showRecordManager && (
          <Box sx={{ width: '100%' }}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Button onClick={() => setInputMethod('ia')}>
                    &larr; Voltar para obter dados
                </Button>
                <Button
                    variant="contained"
                    onClick={() => exportCsv(csvData, csvHeaders)}
                    disabled={!csvData || csvData.length === 0}
                >
                    Baixar CSV
                </Button>
            </Box>
            <RecordManager
              registrosIniciais={csvData}
              colunasIniciais={csvHeaders}
              onDadosAlterados={onDadosAlterados}
              darkMode={darkMode}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PostsCurtosStep;
