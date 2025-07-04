import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  Settings,
  Image as ImageIcon,
  Palette
} from '@mui/icons-material';
import Papa from 'papaparse';
import ColorThief from 'colorthief';
import FieldPositioner from './components/FieldPositioner';
import ImageGeneratorFrontendOnly from './components/ImageGeneratorFrontendOnly';
import './App.css';

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const steps = [
    {
      label: 'Upload do CSV',
      description: 'Carregue o arquivo CSV com os dados'
    },
    {
      label: 'Upload da Imagem',
      description: 'Carregue a imagem de fundo PNG/JPG'
    },
    {
      label: 'Posicionar e Formatar',
      description: 'Posicione os campos e configure a formatação'
    },
    {
      label: 'Gerar Imagens',
      description: 'Gere as imagens finais'
    }
  ];

  // Função para ler arquivo CSV
  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const newCsvData = results.data;
            const newHeaders = Object.keys(newCsvData[0] || {});
            
            setCsvData(newCsvData);
            setCsvHeaders(newHeaders);
            
            // Adaptar fieldPositions e fieldStyles existentes
            const updatedFieldPositions = {};
            const updatedFieldStyles = {};

            const defaultStylesBase = {
              fontFamily: 'Arial',
              fontSize: 24,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              color: '#000000',
              textStroke: false,
              strokeColor: '#ffffff',
              strokeWidth: 2,
              textShadow: false,
              shadowColor: '#000000',
              shadowBlur: 4,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
              textAlign: 'left', // Adicionado para consistência com defaults iniciais
              verticalAlign: 'top' // Adicionado para consistência
            };
            
            newHeaders.forEach((header, index) => {
              // Posições
              if (fieldPositions[header]) {
                updatedFieldPositions[header] = fieldPositions[header];
              } else {
                updatedFieldPositions[header] = {
                  x: 10 + (index % 5) * 18, // Ajustado para caber mais campos inicialmente
                  y: 10 + Math.floor(index / 5) * 12,
                  width: 15, // Ligeiramente menor para caber mais
                  height: 10,
                  visible: true
                };
              }
              
              // Estilos
              if (fieldStyles[header]) {
                updatedFieldStyles[header] = fieldStyles[header];
              } else {
                updatedFieldStyles[header] = { ...defaultStylesBase };
              }
            });
            
            setFieldPositions(updatedFieldPositions);
            setFieldStyles(updatedFieldStyles);
            
            if (activeStep === 0) setActiveStep(1);
          }
        },
        error: (error) => {
          console.error('Erro ao ler CSV:', error);
          alert('Erro ao ler o arquivo CSV. Verifique se o formato está correto.');
        }
      });
    }
  };

  // Função para upload da imagem de fundo
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setBackgroundImage(imageUrl);

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(img, 5); // Extrai 5 cores
          setColorPalette(palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`));
        };
        img.src = imageUrl;

        if (activeStep === 1) setActiveStep(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const canProceedToStep = (step) => {
    switch (step) {
      case 1: return csvData.length > 0;
      case 2: return backgroundImage !== null;
      case 3: return true; // Posicionamento e formatação são opcionais
      default: return true;
    }
  };

  // Calcular estatísticas dos campos
  const getFieldStats = () => {
    const visibleFields = Object.values(fieldPositions).filter(pos => pos.visible).length;
    const totalFields = csvHeaders.length;
    const styledFields = Object.keys(fieldStyles).length;
    
    return { visibleFields, totalFields, styledFields };
  };

  const { visibleFields, totalFields, styledFields } = getFieldStats();

  // Função para salvar o estado do template
  const handleSaveState = () => {
    const stateToSave = {
      version: "1.0",
      backgroundImageUrl: backgroundImage,
      fieldPositions: fieldPositions,
      fieldStyles: fieldStyles,
      csvHeaders: csvHeaders,
      colorPalette: colorPalette, 
      csvData: csvData, // <-- ADICIONADO: Salvar os dados do CSV
    };

    const jsonString = JSON.stringify(stateToSave, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_config.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("Configuração do template salva como template_config.json!");
  };

  // Função para carregar o estado do template de um arquivo
  const handleLoadStateFromFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedState = JSON.parse(e.target.result);

          if (loadedState.version === "1.0" &&
              loadedState.backgroundImageUrl !== undefined && // Checar undefined para permitir null
              loadedState.fieldPositions &&
              loadedState.fieldStyles &&
              loadedState.csvHeaders) {

            setBackgroundImage(loadedState.backgroundImageUrl);
            setFieldPositions(loadedState.fieldPositions);
            setFieldStyles(loadedState.fieldStyles);
            setCsvHeaders(loadedState.csvHeaders);
            
            if (loadedState.colorPalette) {
              setColorPalette(loadedState.colorPalette);
            } else {
              // Fallback se a paleta não estiver no JSON (templates antigos)
              // Poderia tentar extrair da imagem carregada se backgroundImage existir
              if (loadedState.backgroundImageUrl) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                  const colorThief = new ColorThief();
                  try {
                    const palette = colorThief.getPalette(img, 5);
                    setColorPalette(palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`));
                  } catch (error) {
                    console.warn("Não foi possível extrair paleta da imagem carregada no JSON.", error);
                    setColorPalette([]); // Reset ou paleta padrão
                  }
                };
                img.src = loadedState.backgroundImageUrl;
              } else {
                setColorPalette([]); // Reset ou paleta padrão
              }
            }
            
            if (loadedState.csvData) {
              setCsvData(loadedState.csvData);
              // Se csvHeaders não vierem explicitamente ou forem inconsistentes,
              // poderíamos derivá-los de loadedState.csvData[0] aqui,
              // mas como loadedState.csvHeaders é obrigatório, confiamos nele.
            } else {
              setCsvData([]); 
            }
            
            // setActiveStep para o início ou para o passo de posicionamento?
            // setActiveStep(0); // Volta para o upload do CSV
            // ou
            if (loadedState.backgroundImageUrl && loadedState.csvHeaders.length > 0) {
              setActiveStep(2); // Vai para posicionar/formatar se BG e Headers existem
            } else if (loadedState.csvHeaders.length > 0) {
              setActiveStep(1); // Vai para upload da imagem se só headers existem
            } else {
              setActiveStep(0);
            }


            alert("Configuração do template carregada com sucesso!");
          } else {
            alert("Arquivo JSON inválido, formato incorreto ou versão incompatível.");
          }
        } catch (error) {
          console.error("Erro ao carregar o arquivo JSON:", error);
          alert("Erro ao ler o arquivo JSON.");
        }
      };
      reader.readAsText(file);
      event.target.value = null; 
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
          Midiator - Mesclar conteúdo
        </Typography>
        <Typography variant="h6" align="center" color="textSecondary" sx={{ mb: 4 }}>
          Crie imagens personalizadas com controles de formatação individual
        </Typography>
        
        {/* Indicadores de status */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Chip 
            icon={<FileUpload />}
            label={`${csvData.length} registros`}
            color={csvData.length > 0 ? 'success' : 'default'}
            variant={csvData.length > 0 ? 'filled' : 'outlined'}
          />
          <Chip 
            icon={<ImageIcon />}
            label="Imagem de fundo"
            color={backgroundImage ? 'success' : 'default'}
            variant={backgroundImage ? 'filled' : 'outlined'}
          />
          <Chip 
            icon={<Settings />}
            label={`${visibleFields}/${totalFields} campos`}
            color={visibleFields > 0 ? 'info' : 'default'}
            variant="filled"
          />
          <Chip 
            icon={<Palette />}
            label={`${styledFields} estilos`}
            color={styledFields > 0 ? 'secondary' : 'default'}
            variant="filled"
          />
        </Box>

        {/* Botões Salvar/Carregar Configuração */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
          <Button variant="contained" onClick={handleSaveState} color="info">
            Salvar Config. Template
          </Button>
          <Button variant="contained" component="label" color="info">
            Carregar Config. Template
            <input type="file" hidden accept=".json" onChange={handleLoadStateFromFile} />
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Stepper lateral */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel
                      optional={
                        index === steps.length - 1 ? (
                          <Typography variant="caption">Último passo</Typography>
                        ) : null
                      }
                    >
                      {step.label}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="textSecondary">
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Grid>

        {/* Conteúdo principal */}
        <Grid item xs={12} md={9}>
          {/* Passo 1: Upload CSV */}
          {activeStep === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <FileUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Upload do Arquivo CSV
                </Typography>
                
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Button
                    variant="contained"
                    component="label"
                    size="large"
                    startIcon={<FileUpload />}
                    sx={{ mb: 2 }}
                  >
                    Selecionar Arquivo CSV
                    <input
                      type="file"
                      accept=".csv"
                      hidden
                      ref={fileInputRef}
                      onChange={handleCSVUpload}
                    />
                  </Button>
                  
                  <Typography variant="body2" color="textSecondary">
                    Selecione um arquivo CSV com os dados que deseja usar nas imagens
                  </Typography>
                  
                  {csvData.length > 0 && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      ✅ {csvData.length} registros carregados com sucesso!
                      <br />
                      Campos encontrados: {csvHeaders.join(', ')}
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Passo 2: Upload Imagem */}
          {activeStep === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <CloudUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Upload da Imagem de Fundo
                </Typography>
                
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Button
                    variant="contained"
                    component="label"
                    size="large"
                    startIcon={<CloudUpload />}
                    sx={{ mb: 2 }}
                  >
                    Selecionar Imagem PNG/JPG
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      hidden
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                    />
                  </Button>
                  
                  <Typography variant="body2" color="textSecondary">
                    Esta imagem será usada como fundo para todas as imagens geradas
                  </Typography>
                  
                  {backgroundImage && (
                    <Box sx={{ mt: 3 }}>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        ✅ Imagem de fundo carregada com sucesso!
                      </Alert>
                      <img
                        src={backgroundImage}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '300px',
                          objectFit: 'contain',
                          border: '2px solid #ddd',
                          borderRadius: '8px'
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Passo 3: Posicionamento e Formatação */}
          {activeStep === 2 && (
            <FieldPositioner
              backgroundImage={backgroundImage}
              csvHeaders={csvHeaders}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              fieldStyles={fieldStyles}
              setFieldStyles={setFieldStyles}
              csvData={csvData}
              onImageDisplayedSizeChange={setDisplayedImageSize}
              colorPalette={colorPalette}
            />
          )}

          {/* Passo 4: Geração */}
          {activeStep === 3 && (
            <ImageGeneratorFrontendOnly
              csvData={csvData}
              backgroundImage={backgroundImage}
              fieldPositions={fieldPositions}
              fieldStyles={fieldStyles}
              displayedImageSize={displayedImageSize}
              csvHeaders={csvHeaders} // <-- ADICIONADO
              colorPalette={colorPalette} // <-- ADICIONADO
            />
          )}

          {/* Botões de navegação */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Voltar
            </Button>
            
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)}
            >
              {activeStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default App;

