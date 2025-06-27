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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Divider,
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
  GetApp
} from '@mui/icons-material';
import Papa from 'papaparse';
import FieldPositioner from './components/FieldPositioner';
import ImageGenerator from './components/ImageGenerator';
import './App.css';

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [fieldPositions, setFieldPositions] = useState({});
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(24);
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const fonts = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Courier New',
    'Impact',
    'Comic Sans MS',
    'Roboto',
    'Open Sans'
  ];

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
      label: 'Configurar Fonte',
      description: 'Escolha a fonte e tamanho do texto'
    },
    {
      label: 'Posicionar Campos',
      description: 'Posicione os campos do CSV na imagem'
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
            setCsvData(results.data);
            const headers = Object.keys(results.data[0] || {});
            setCsvHeaders(headers);
            
            // Inicializar posições dos campos
            const initialPositions = {};
            headers.forEach((header, index) => {
              initialPositions[header] = {
                x: 20 + (index % 3) * 30,
                y: 20 + Math.floor(index / 3) * 15,
                visible: true
              };
            });
            setFieldPositions(initialPositions);
            
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
        setBackgroundImage(e.target.result);
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
      case 3: return true; // Configuração de fonte é opcional
      case 4: return true; // Posicionamento é opcional
      default: return true;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
          Gerador de Imagens CSV
        </Typography>
        <Typography variant="h6" align="center" color="textSecondary" sx={{ mb: 4 }}>
          Transforme dados CSV em imagens personalizadas com facilidade
        </Typography>
        
        {/* Indicadores de status */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
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
            label={`${selectedFont} ${fontSize}px`}
            color="info"
            variant="filled"
          />
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

          {/* Passo 3: Configuração de Fonte */}
          {activeStep === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Configuração da Fonte
                </Typography>
                
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Família da Fonte</InputLabel>
                      <Select
                        value={selectedFont}
                        label="Família da Fonte"
                        onChange={(e) => setSelectedFont(e.target.value)}
                      >
                        {fonts.map(font => (
                          <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Tamanho da Fonte: {fontSize}px
                    </Typography>
                    <Slider
                      value={fontSize}
                      onChange={(e, value) => setFontSize(value)}
                      min={12}
                      max={72}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 12, label: '12px' },
                        { value: 24, label: '24px' },
                        { value: 48, label: '48px' },
                        { value: 72, label: '72px' }
                      ]}
                    />
                  </Grid>
                </Grid>
                
                {/* Preview da fonte */}
                <Box sx={{ mt: 3, p: 3, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Preview da Fonte:
                  </Typography>
                  <Typography
                    style={{
                      fontFamily: selectedFont,
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.2
                    }}
                  >
                    Exemplo de texto com a fonte selecionada
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Passo 4: Posicionamento */}
          {activeStep === 3 && (
            <FieldPositioner
              backgroundImage={backgroundImage}
              csvHeaders={csvHeaders}
              fieldPositions={fieldPositions}
              setFieldPositions={setFieldPositions}
              selectedFont={selectedFont}
              fontSize={fontSize}
              csvData={csvData}
            />
          )}

          {/* Passo 5: Geração */}
          {activeStep === 4 && (
            <ImageGenerator
              csvData={csvData}
              backgroundImage={backgroundImage}
              fieldPositions={fieldPositions}
              selectedFont={selectedFont}
              fontSize={fontSize}
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

