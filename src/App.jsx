import React, { useState, useRef, useEffect } from 'react';
import { useIsMobile } from './hooks/use-mobile'; // Importa o hook
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
  Chip,
  IconButton, // Adicionado para botões de ícone
  Tooltip // Adicionado para dicas de ferramenta
} from '@mui/material';
import {
  CloudUpload,
  FileUpload,
  Settings,
  Image as ImageIcon,
  Palette,
  ArrowBackIosNew, // Ícone para voltar
  ArrowForwardIos, // Ícone para próximo
  MoreVert, // Ícone para o menu de ações
  Brightness4, // Ícone para modo dark
  Brightness7 // Ícone para modo light
} from '@mui/icons-material';
import Papa from 'papaparse';
import ColorThief from 'colorthief';
// Adicionar Menu e MenuItem para o menu de ações
import { Menu, MenuItem } from '@mui/material';
// Imports para Theming
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'; // Normaliza estilos e aplica cor de fundo do tema

import FieldPositioner from './components/FieldPositioner';
import ImageGeneratorFrontendOnly from './components/ImageGeneratorFrontendOnly';
import './App.css';

// Definição dos temas light e dark
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Azul padrão do MUI
    },
    secondary: {
      main: '#dc004e', // Rosa padrão do MUI
    },
    background: {
      default: '#f4f6f8', // Um cinza claro para o fundo
      paper: '#ffffff',   // Branco para os Papers
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9', // Um azul mais claro para contraste no modo escuro
    },
    secondary: {
      main: '#f48fb1', // Um rosa mais claro
    },
    background: {
      default: '#121212', // Padrão do Material Design para fundo escuro
      paper: '#1e1e1e',   // Um pouco mais claro para Papers no modo escuro
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    }
  },
});


function App() {
  const [activeStep, setActiveStep] = useState(0);
  // Inicializa darkMode a partir do localStorage ou default para false (light mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  const [displayedImageSize, setDisplayedImageSize] = useState({ width: 0, height: 0 });
  const [generatedImagesData, setGeneratedImagesData] = useState([]); // Para armazenar dados de ImageGeneratorFrontendOnly
  const isMobile = useIsMobile(); // Usa o hook para determinar se é mobile
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(isMobile); // Inicializa colapsado em mobile
  const [anchorElMenu, setAnchorElMenu] = useState(null); // Para o menu de ações

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const loadStateInputRef = useRef(null); // Ref para o input de carregar estado

  // Efeito para lidar com o scroll e colapsar o header
  useEffect(() => {
    // Se for mobile, o header começa colapsado e não muda com o scroll
    if (isMobile) {
      setIsHeaderCollapsed(true);
      return;
    }

    const handleScroll = () => {
      if (window.scrollY > 50) { // Colapsa após 50px de scroll
        setIsHeaderCollapsed(true);
      } else {
        setIsHeaderCollapsed(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile]); // Adiciona isMobile como dependência

  // Efeito para salvar a preferência do tema no localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

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
  const handleSaveState = async () => {
    // Função auxiliar para converter Blob para Base64
    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    // Mapear generatedImagesData para um formato serializável
    const serializableGeneratedImages = await Promise.all(
      generatedImagesData.map(async (img) => {
        let imageBase64 = null;
        if (img.blob) {
          try {
            imageBase64 = await blobToBase64(img.blob);
          } catch (error) {
            console.error("Erro ao converter blob para Base64:", error);
            // Continuar mesmo se um blob falhar, para não impedir o salvamento do resto
          }
        }
        return {
          ...img,
          blob: undefined, // Remover o blob original
          url: undefined, // Remover o objectURL temporário
          imageBase64: imageBase64, // Adicionar a string base64
          // Manter: record, filename, customFieldPositions, customFieldStyles, backgroundImage (se individual)
        };
      })
    );

    const stateToSave = {
      version: "1.1", // Incrementar versão para refletir a nova estrutura
      backgroundImageUrl: backgroundImage, // Este é o BG global/template, já é uma string (dataURL ou URL externa)
      fieldPositions: fieldPositions,
      fieldStyles: fieldStyles,
      csvHeaders: csvHeaders,
      colorPalette: colorPalette,
      csvData: csvData,
      generatedImages: serializableGeneratedImages, // Salvar os dados das imagens geradas
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
      reader.onload = async (e) => { // Tornar async para aguardar conversões
        try {
          const loadedState = JSON.parse(e.target.result);

          // Função auxiliar para converter Base64 para Blob
          const base64ToBlob = async (base64, type = 'image/png') => {
            const res = await fetch(base64);
            const blob = await res.blob();
            return blob;
          };

          // Verificar versão e campos essenciais
          if (loadedState.version && (loadedState.version === "1.0" || loadedState.version === "1.1") &&
              loadedState.backgroundImageUrl !== undefined &&
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

            // Restaurar generatedImages se presentes (versão 1.1+)
            if (loadedState.version === "1.1" && loadedState.generatedImages) {
              const restoredGeneratedImages = await Promise.all(
                loadedState.generatedImages.map(async (imgData) => {
                  let blob = null;
                  let url = null;
                  if (imgData.imageBase64) {
                    try {
                      blob = await base64ToBlob(imgData.imageBase64);
                      url = URL.createObjectURL(blob);
                    } catch (error) {
                      console.error("Erro ao converter base64 para blob ao carregar:", error);
                    }
                  }
                  return {
                    ...imgData,
                    blob: blob,
                    url: url,
                    imageBase64: undefined, // Remover para não manter em memória desnecessariamente
                  };
                })
              );
              setGeneratedImagesData(restoredGeneratedImages);
            } else {
              setGeneratedImagesData([]); // Limpar se não houver dados ou for versão antiga
            }
            
            // Navegação de passo
            if (loadedState.backgroundImageUrl && loadedState.csvHeaders.length > 0) {
              setActiveStep(2); 
            } else if (loadedState.csvHeaders.length > 0) {
              setActiveStep(1); 
            } else {
              setActiveStep(0);
            }

            alert("Configuração do template carregada com sucesso!");
          } else {
            alert("Arquivo JSON inválido, formato incorreto ou versão incompatível.");
            console.log("Loaded state:", loadedState); // Adicionar log para depuração
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

  const handleMenuOpen = (event) => {
    setAnchorElMenu(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorElMenu(null);
  };

  const handleLoadTemplateClick = () => {
    handleMenuClose();
    // Acionar o clique no input de arquivo escondido
    if (loadStateInputRef.current) {
      loadStateInputRef.current.click();
    }
  };

  const handleSaveTemplateClick = () => {
    handleMenuClose();
    handleSaveState();
  };


  const currentTheme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline /> {/* Adiciona normalização e cor de fundo do tema */}
      <Container maxWidth="xl" sx={{ pt: isHeaderCollapsed || isMobile ? '80px' : '280px', transition: 'padding-top 0.3s ease-in-out' }}>
        <Paper 
          elevation={3} 
          sx={{ 
          p: isHeaderCollapsed || isMobile ? 2 : 4, 
          mb: 4, 
          position: 'fixed', // Para fixar o header no topo
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100, // Acima do conteúdo e dos botões de navegação laterais
          height: isHeaderCollapsed || isMobile ? '60px' : 'auto', // Altura dinâmica
          minHeight: '60px', // Altura mínima quando colapsado
          overflow: 'hidden', // Para esconder conteúdo que transborda durante a transição
          transition: 'height 0.3s ease-in-out, padding 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', // Centraliza conteúdo verticalmente quando colapsado
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Box>
            <Typography 
              variant={isHeaderCollapsed || isMobile ? 'h5' : 'h3'} 
              component="h3" 
              color="primary"
              sx={{ transition: 'font-size 0.3s ease-in-out', m:0, p:0, lineHeight: isHeaderCollapsed || isMobile ? 'normal': 'inherit' }} // Ajuste para remover margem/padding do Typography
            >
              Midiator - Mesclar conteúdo
            </Typography>
            {!(isHeaderCollapsed || isMobile) && (
              <Typography variant="h6" color="textSecondary" sx={{ mb: 0, transition: 'opacity 0.3s ease-in-out, height 0.3s ease-in-out', opacity: isHeaderCollapsed || isMobile ? 0 : 1, height: isHeaderCollapsed || isMobile ? 0 : 'auto' }}>
                Crie imagens personalizadas com controles de formatação individual
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}> {/* Container para os ícones do lado direito */}
            <Tooltip title={darkMode ? "Alternar para modo claro" : "Alternar para modo escuro"}>
              <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Mais ações">
              <IconButton
                aria-label="Mais ações"
                aria-controls="actions-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                color="inherit"
              >
                <MoreVert />
              </IconButton>
            </Tooltip>
            <Menu
              id="actions-menu"
              anchorEl={anchorElMenu}
              keepMounted
              open={Boolean(anchorElMenu)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleSaveTemplateClick}>Salvar Config. Template</MenuItem>
              <MenuItem onClick={handleLoadTemplateClick}>Carregar Config. Template</MenuItem>
            </Menu>
            {/* Input de arquivo escondido para carregar template */}
            <input 
              type="file" 
              hidden 
              accept=".json" 
              onChange={handleLoadStateFromFile} 
              ref={loadStateInputRef} 
            />
          </Box>
        </Box>
        
        {!(isHeaderCollapsed || isMobile) && (
          <>
            {/* Indicadores de status */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, mb: 2, flexWrap: 'wrap', transition: 'opacity 0.3s ease-in-out, height 0.3s ease-in-out', opacity: isHeaderCollapsed || isMobile ? 0 : 1, height: isHeaderCollapsed || isMobile ? 0 : 'auto' }}>
              <Chip 
                icon={<FileUpload />}
                label={`${csvData.length} registros`}
                color={csvData.length > 0 ? 'success' : 'default'}
                variant={csvData.length > 0 ? 'filled' : 'outlined'}
                size={isHeaderCollapsed ? 'small' : 'medium'}
              />
              <Chip 
                icon={<ImageIcon />}
                label="Imagem de fundo"
                color={backgroundImage ? 'success' : 'default'}
                variant={backgroundImage ? 'filled' : 'outlined'}
                size={isHeaderCollapsed ? 'small' : 'medium'}
              />
              <Chip 
                icon={<Settings />}
                label={`${visibleFields}/${totalFields} campos`}
                color={visibleFields > 0 ? 'info' : 'default'}
                variant="filled"
                size={isHeaderCollapsed ? 'small' : 'medium'}
              />
              <Chip 
                icon={<Palette />}
                label={`${styledFields} estilos`}
                color={styledFields > 0 ? 'secondary' : 'default'}
                variant="filled"
                size={isHeaderCollapsed ? 'small' : 'medium'}
              />
            </Box>
            {/* Botões Salvar/Carregar Configuração foram movidos para o Menu */}
          </>
        )}
      </Paper>

      <Grid container spacing={3} sx={{ mt: 0 }}> {/* mt:0 porque o padding do container já cuida do espaço */}
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
        <Grid item xs={12} md={9} 
           >
          
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
              colorPalette={colorPalette}
              // Passar o setter para que ImageGeneratorFrontendOnly possa atualizar App.jsx
              setGeneratedImagesData={setGeneratedImagesData} 
              // Passar os dados existentes, caso o ImageGeneratorFrontendOnly precise deles ao iniciar
              initialGeneratedImagesData={generatedImagesData}
            />
          )}

          {/* Botões de navegação não estão mais aqui */}
        </Grid>
      </Grid>

      {/* Botões de Navegação Circulares Flutuantes */}
      <Box
        sx={{
          position: 'fixed',
          bottom: '50%', // Centraliza verticalmente
          left: '20px', // Distância da esquerda
          transform: 'translateY(50%)', // Ajuste fino para centralização vertical
          zIndex: 1000, // Para garantir que fiquem acima de outros elementos
        }}
      >
        <Tooltip title="Anterior" placement="right">
          <span> {/* Span para habilitar tooltip em botão desabilitado */}
            <IconButton
              aria-label="anterior"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <ArrowBackIosNew />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: '50%', // Centraliza verticalmente
          right: '20px', // Distância da direita
          transform: 'translateY(50%)', // Ajuste fino para centralização vertical
          zIndex: 1000, // Para garantir que fiquem acima de outros elementos
        }}
      >
        <Tooltip title={activeStep === steps.length - 1 ? 'Finalizar' : 'Próximo'} placement="left">
          <span> {/* Span para habilitar tooltip em botão desabilitado */}
            <IconButton
              aria-label="próximo"
              onClick={handleNext}
              disabled={activeStep === steps.length - 1 || !canProceedToStep(activeStep + 1)}
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <ArrowForwardIos />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Container>
    </ThemeProvider>
  );
}

export default App;

