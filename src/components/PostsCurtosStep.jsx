import React, { useState, useEffect, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AspectRatioSelector from './ui/AspectRatioSelector';
import {
  CloudUpload,
  InsertDriveFileOutlined,
  AutoAwesomeOutlined as GeminiIcon,
} from '@mui/icons-material';
import SpreadsheetInfobox from './SpreadsheetInfobox';
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
  handleGenerateIAContent,
  isGenerating,
  csvData,
  onDadosAlterados,
  darkMode,
  exportCsv,
  aspectRatio,
  setAspectRatio,
  sidebarOpen,
}) => {
  const [isDraggingOverSpreadsheet, setIsDraggingOverSpreadsheet] = useState(false);
  const [isGeminiKeyConfigured, setIsGeminiKeyConfigured] = useState(true);

  // Derive csvHeaders from csvData to make the component more robust
  const csvHeaders = useMemo(() => {
    if (csvData && csvData.length > 0 && csvData[0]) {
      return Object.keys(csvData[0]);
    }
    return [];
  }, [csvData]);


  useEffect(() => {
    const key = getGeminiApiKey();
    setIsGeminiKeyConfigured(!!key);
  }, []);

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverSpreadsheet(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverSpreadsheet(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverSpreadsheet(false);
    handleDropProp(event);
  };

  // CRITICAL FIX: The decision to show the data grid (RecordManager) or the creation options
  // should depend *only* on the `inputMethod` prop, not on the presence of `csvData`.
  // This ensures the "Back" button works correctly.
  const showRecordManager = inputMethod === 'manual';
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
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, mb: 4 }}>
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
                <ToggleButton value="csv">Carregar Planilha</ToggleButton>
                <ToggleButton value="manual">Criação Manual</ToggleButton>
              </ToggleButtonGroup>

              <AspectRatioSelector
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              />
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
                  max={10}
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
                      border: isDraggingOverSpreadsheet ? '2px dashed #8b5cf6' : '2px dashed #d1d5db',
                      backgroundColor: isDraggingOverSpreadsheet ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
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
                        Carregue um arquivo de planilha com o conteúdo de seus posts
                      </Typography>
                      <SpreadsheetInfobox />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <Button variant="contained" component="label">
                        Selecionar Arquivo
                        <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleCSVUpload} />
                      </Button>
                      <Button variant="outlined" onClick={downloadExampleCsv}>
                        Baixar Planilha Exemplo
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
                    Baixar Planilha
                </Button>
            </Box>
            <RecordManager
              registros={csvData}
              colunas={csvHeaders}
              onDadosAlterados={(action) => {
                  let novosRegistros = [...csvData.filter(Boolean)];
                  let novasColunas = [...csvHeaders];
                  let proximoId = (novosRegistros.length > 0 ? Math.max(...novosRegistros.map(r => parseInt(String(r.id).replace('reg-', ''), 10) || 0)) : 0) + 1;

                  switch (action.type) {
                      case 'ADD_RECORD':
                          novosRegistros.push({ ...action.payload.data, id: `reg-${proximoId}` });
                          break;
                      case 'UPDATE_RECORD':
                          novosRegistros = novosRegistros.map(reg =>
                              String(reg.id) === String(action.payload.id) ? { ...reg, ...action.payload.data } : reg
                          );
                          break;
                      case 'DELETE_RECORD':
                          novosRegistros = novosRegistros.filter(reg => String(reg.id) !== String(action.payload.id));
                          break;
                      case 'UPDATE_FIELD':
                          novosRegistros = novosRegistros.map(reg => {
                              if (String(reg.id) === String(action.payload.id)) {
                                  return { ...reg, [action.payload.fieldName]: action.payload.newContent };
                              }
                              return reg;
                          });
                          break;
                      default:
                          // Ação desconhecida, não faz nada
                          return;
                  }
                  onDadosAlterados(novosRegistros, novasColunas);
              }}
              darkMode={darkMode}
              sidebarOpen={sidebarOpen}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PostsCurtosStep;
