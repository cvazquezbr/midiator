import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  CloudUpload,
  Add,
  InsertDriveFileOutlined,
} from '@mui/icons-material';
import CsvInfobox from './CsvInfobox';

const ContentStep = ({
  steps,
  inputMethod,
  setInputMethod,
  handleDrop: handleDropProp,
  handleDragOver: handleDragOverProp,
  fileInputRef,
  handleCSVUpload,
  downloadExampleCsv,
  setActiveStep,
  getGeminiApiKey,
  setShowSetupModal,
  promptNumRecords,
  setPromptNumRecords,
  promptText,
  setPromptText,
  handleGenerateIAContent,
  isGenerating,
  csvData,
}) => {
  const [isDraggingOverCsv, setIsDraggingOverCsv] = useState(false);

  // Derive csvHeaders from csvData to make the component more robust
  const csvHeaders = useMemo(() => {
    if (csvData && csvData.length > 0 && csvData[0]) {
      return Object.keys(csvData[0]);
    }
    return [];
  }, [csvData]);


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
          {steps[1].label}
        </Typography>

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
            sx={{
              '& .MuiToggleButton-root': {
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600
              }
            }}
          >
            <ToggleButton value="csv">Carregar CSV</ToggleButton>
            <ToggleButton value="ia">Gerar com IA</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {inputMethod === 'csv' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  border: isDraggingOverCsv ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                  backgroundColor: isDraggingOverCsv ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  textAlign: 'center',
                  p: { xs: 1.5, sm: 2, md: 4 },
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(139, 92, 246, 0.05)'
                  }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOverProp}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Arraste e solte ou clique para Upload texto dos posts</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Carregue um arquivo CSV com o conteúdo de seus posts
                  </Typography>
                  <CsvInfobox />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    component="label"
                    sx={{ borderRadius: 2 }}
                  >
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept=".csv"
                      hidden
                      ref={fileInputRef}
                      onChange={handleCSVUpload}
                    />
                  </Button>
                  <Button
                    variant="contained"
                    onClick={downloadExampleCsv}
                    sx={{ borderRadius: 2 }}
                  >
                    Baixar CSV Exemplo
                  </Button>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{
                border: '2px dashed #d1d5db',
                backgroundColor: 'transparent',
                textAlign: 'center',
                p: { xs: 1.5, sm: 2, md: 4 },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(139, 92, 246, 0.05)'
                }
              }}>
                <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Criar Manualmente</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Adicione registros um por um
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                  sx={{ borderRadius: 2 }}
                >
                  Novo Registro
                </Button>
              </Card>
            </Grid>
          </Grid>
        )}

        {inputMethod === 'ia' && (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            {!getGeminiApiKey() && (
              <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: '500px' }}>
                Chave da API Gemini não configurada.
                <MuiLink component="button" variant="body2" onClick={() => setShowSetupModal(true)} sx={{ ml: 1 }}>
                  Configurar Chave Gemini
                </MuiLink>
              </Alert>
            )}

            <TextField
              label="Quantidade de Elementos"
              type="number"
              value={promptNumRecords}
              onChange={(e) => setPromptNumRecords(Math.max(1, parseInt(e.target.value, 10) || 1))}
              inputProps={{ min: 1 }}
              variant="outlined"
              fullWidth
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

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleGenerateIAContent}
              disabled={
                isGenerating ||
                !promptText.trim() ||
                !getGeminiApiKey()
              } sx={{
                py: 1.5,
                borderRadius: 2,
                position: 'relative'
              }}
            >
              {isGenerating ? 'Gerando...' : 'Gerar Conteúdo com IA'}
            </Button>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Após gerar, os dados aparecerão abaixo. Clique em "Próximo" para editá-los.
            </Typography>
            {csvData.length > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ {csvData.length} registros gerados/carregados. Campos: {csvHeaders.join(', ')}.
                <br />Clique em "Próximo" para editar.
              </Alert>
            )}
          </Box>
        )}

        {csvData.length > 0 && (
          <Alert severity="success" sx={{ mt: 3 }}>
            ✅ {csvData.length} registros carregados. Campos: {csvHeaders.join(', ')}.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ContentStep;
