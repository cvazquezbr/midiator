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
import FieldPositioner from './components/FieldPositioner';
import ImageGeneratorFrontendOnly from './components/ImageGeneratorFrontendOnly';
import './App.css';

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [fieldPositions, setFieldPositions] = useState({});
  const [fieldStyles, setFieldStyles] = useState({});
  
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
            setCsvData(results.data);
            const headers = Object.keys(results.data[0] || {});
            setCsvHeaders(headers);
            
            // Inicializar posições dos campos
            const initialPositions = {};
            const initialStyles = {};
            
            headers.forEach((header, index) => {
              initialPositions[header] = {
                x: 10 + (index % 3) * 30,
                y: 10 + Math.floor(index / 3) * 25,
                width: 25,
                height: 15,
                visible: true
              };
              
              initialStyles[header] = {
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
                shadowOffsetY: 2
              };
            });
            
            setFieldPositions(initialPositions);
            setFieldStyles(initialStyles);
            
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
          Midiator - Editor Avançado
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
            />
          )}

          {/* Passo 4: Geração */}
          {activeStep === 3 && (
            <ImageGeneratorFrontendOnly
              csvData={csvData}
              backgroundImage={backgroundImage}
              fieldPositions={fieldPositions}
              fieldStyles={fieldStyles}
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

