import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Card, CardContent, Grid,
  LinearProgress, Alert, Select, MenuItem,
  FormControl, InputLabel, TextField, Paper,
  Snackbar, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import { Movie, PlayArrow, GetApp, Info, ErrorOutline, Refresh } from '@mui/icons-material';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const VideoGenerator = ({ generatedImages }) => {
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [slideDuration, setSlideDuration] = useState(3);
  const [resolution, setResolution] = useState('720p');
  const [fps, setFps] = useState(24);
  const [transition, setTransition] = useState('fade');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [environmentChecks, setEnvironmentChecks] = useState(null);
  const [compatibilityMode, setCompatibilityMode] = useState(false);

  const ffmpegRef = useRef(new FFmpeg());
  const imageContainerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const resolutionMap = {
    '1080p': '1920x1080',
    '720p': '1280x720',
    '480p': '854x480',
  };

  const transitionOptions = [
    { value: 'fade', label: 'Fade (Recomendado)' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'slideleft', label: 'Deslizar Esquerda' },
    { value: 'slideright', label: 'Deslizar Direita' },
    { value: 'none', label: 'Nenhuma (Mais Rápido)' },
  ];

  const checkEnvironmentSupport = useCallback(async () => {
    const checks = {
      webAssemblySupport: typeof WebAssembly !== 'undefined',
      sharedArrayBufferSupport: typeof SharedArrayBuffer !== 'undefined',
      crossOriginIsolated: window.crossOriginIsolated || false, // Corrigido: 'crossOriginIsolated' is not defined
      adBlockerDetected: false,
      networkRestricted: false
    };

    try {
      const testImg = new Image();
      testImg.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      await new Promise((resolve, reject) => {
        testImg.onload = resolve;
        testImg.onerror = () => {
          checks.adBlockerDetected = true;
          resolve();
        };
        setTimeout(reject, 2000);
      });
    } catch (e) {
      checks.adBlockerDetected = true;
    }

    try {
      // Removido 'response' não utilizado
      await fetch('https://cdn.jsdelivr.net/npm/react@18.0.0/package.json', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
    } catch (e) {
      checks.networkRestricted = true;
    }

    setEnvironmentChecks(checks);
    return checks;
  }, []);

  const loadFFmpegWithRetry = useCallback(async (maxRetries = 3, baseDelay = 1000) => {
    const ffmpeg = ffmpegRef.current;
    
    if (!environmentChecks?.webAssemblySupport) {
      throw new Error('WebAssembly não é suportado neste navegador');
    }

    if (!environmentChecks?.sharedArrayBufferSupport) {
      console.warn('⚠️ SharedArrayBuffer não disponível. Tentando modo de compatibilidade...');
      setCompatibilityMode(true);
      return false;
    }

    const localFFmpegPaths = {
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
      workerURL: '/ffmpeg/ffmpeg-core.worker.js',
    };

    let lastError = null;

    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      try {
        console.log(`🔄 Tentativa ${retryCount + 1}/${maxRetries} para carregar FFmpeg localmente...`);
        setLoadingProgress(((retryCount + 1) / maxRetries) * 100);
        
        const loadPromise = ffmpeg.load(localFFmpegPaths);

        const timeoutMs = 30000 + (retryCount * 15000);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido`)), timeoutMs);
        });

        await Promise.race([loadPromise, timeoutPromise]);
        
        console.log('✅ FFmpeg carregado localmente com sucesso!');
        return true;
        
      } catch (err) {
        lastError = err;
        console.warn(`❌ Tentativa ${retryCount + 1} falhou ao carregar FFmpeg localmente:`, err.message);
        
        if (retryCount < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Falha ao carregar FFmpeg localmente após múltiplas tentativas. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
  }, [environmentChecks]); // Adicionado environmentChecks como dependência

  useEffect(() => {
    const ffmpegInstance = ffmpegRef.current; // Copiado para variável local

    const loadFfmpeg = async () => {
      try {
        const checks = await checkEnvironmentSupport();
        
        if (!checks.webAssemblySupport) {
          throw new Error('WebAssembly não é suportado neste navegador. Considere atualizar para uma versão mais recente.');
        }

        ffmpegInstance.on('log', ({ message }) => {
          console.log('FFmpeg Log:', message);
        });

        ffmpegInstance.on('progress', ({ progress: currentTime, duration }) => {
          if (duration > 0) {
            const percent = Math.max(0, Math.min(100, Math.round((currentTime / duration) * 100)));
            setProgress(percent);
            
            if (startTimeRef.current) {
              const elapsed = (Date.now() - startTimeRef.current) / 1000;
              const remaining = (elapsed / percent) * (100 - percent);
              setEstimatedTime(Math.round(remaining));
            }
          }
        });

        console.log('🔄 Iniciando carregamento do FFmpeg...');
        
        const loadSuccess = await loadFFmpegWithRetry();
        
        if (loadSuccess) {
          setFfmpegLoaded(true);
          setLoadingProgress(100);
        } else {
          console.log('🔄 Usando modo de compatibilidade...');
          setCompatibilityMode(true);
          setFfmpegLoaded(false);
        }
        
      } catch (err) {
        console.error('Erro ao carregar FFmpeg:', err);
        const errorMessage = err.message || 'Erro desconhecido ao carregar FFmpeg';
        setError(`Não foi possível carregar o editor de vídeo: ${errorMessage}`);
        setSnackbarOpen(true);
        setCompatibilityMode(true);
      }
    };

    loadFfmpeg();
    
    return () => {
      if (ffmpegInstance) { // Usando a variável local
        try {
          ffmpegInstance.terminate();
        } catch (err) {
          console.warn('Erro ao terminar FFmpeg:', err);
        }
      }
    };
  }, [checkEnvironmentSupport, loadFFmpegWithRetry]); // Adicionado checkEnvironmentSupport e loadFFmpegWithRetry como dependências

  useEffect(() => {
    let interval;
    if (isPlaying && generatedImages.length > 0) {
      interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % generatedImages.length);
      }, slideDuration * 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slideDuration, generatedImages.length]);

  const handleGeneratePreview = () => {
    setCurrentImageIndex(0);
    setIsPlaying(!isPlaying);
  };

  const handleGenerateFinalVideo = async () => {
    if (!ffmpegLoaded && !compatibilityMode) {
      setError('Editor de vídeo ainda não está carregado. Aguarde ou recarregue a página.');
      setSnackbarOpen(true);
      return;
    }

    if (generatedImages.length === 0) {
      setError('Nenhuma imagem disponível para gerar o vídeo.');
      setSnackbarOpen(true);
      return;
    }

    if (compatibilityMode || !ffmpegLoaded) {
      await generateVideoWithCompatibilityMode();
    } else {
      await generateVideoWithFFmpeg();
    }
  };

  const generateVideoWithFFmpeg = async () => {
    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    setProcessingTime(0);
    setEstimatedTime(0);
    startTimeRef.current = Date.now();
    
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setProcessingTime(seconds);
      }
    }, 1000);

    const ffmpeg = ffmpegRef.current;

    try {
      await ffmpeg.deleteFile('output.mp4').catch(() => {});
      
      const writePromises = generatedImages.map(async (img, i) => {
        const imageData = await fetchFile(img.url);
        await ffmpeg.writeFile(`img${i}.png`, imageData);
      });
      
      await Promise.all(writePromises);

      const [width, height] = resolutionMap[resolution].split('x');
      const inputs = [];
      const filterParts = [];

      for (let i = 0; i < generatedImages.length; i++) {
        inputs.push('-loop', '1', '-t', slideDuration.toString(), '-i', `img${i}.png`);
        filterParts.push(
          `[${i}:v]setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=decrease` +
          `,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
        );
      }

      let filterComplex;
      let outputStream;
      let totalDuration;

      if (transition === 'none') {
        filterComplex = [
          ...filterParts,
          generatedImages.map((_, i) => `[v${i}]`).join(''),
          `concat=n=${generatedImages.length}:v=1:a=0[outv]`
        ].join(';');
        
        outputStream = ['-map', '[outv]'];
        totalDuration = generatedImages.length * slideDuration;
      } else {
        let lastOutput = 'v0';
        const transitionFilters = [];

        for (let i = 0; i < generatedImages.length - 1; i++) {
          const input1 = lastOutput;
          const input2 = `v${i + 1}`;
          const output = `crossfade${i}`;
          const offset = (i + 1) * (slideDuration - 1);
          
          transitionFilters.push(
            `[${input1}][${input2}]xfade=transition=${transition}:duration=1:offset=${offset}[${output}]`
          );
          lastOutput = output;
        }

        filterComplex = [...filterParts, ...transitionFilters].join(';');
        outputStream = ['-map', `[${lastOutput}]`];
        totalDuration = (generatedImages.length * slideDuration) - (generatedImages.length - 1);
      }

      const command = [
        '-y',
        ...inputs,
        '-filter_complex', filterComplex,
        ...outputStream,
        '-c:v', 'libx264',
        '-r', fps.toString(),
        '-pix_fmt', 'yuv420p',
        '-t', totalDuration.toString(),
        '-preset', 'ultrafast',
        'output.mp4',
      ];

      console.log("Executando comando FFmpeg:", command.join(' '));
      await ffmpeg.exec(command);

      const data = await ffmpeg.readFile('output.mp4');
      const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      setVideo(videoUrl);

    } catch (err) {
      console.error('Erro na geração do vídeo:', err);
      setError(`Erro na geração do vídeo: ${err.message}`);
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
      setProgress(0);
      clearInterval(progressIntervalRef.current);
      startTimeRef.current = null;
    }
  };

  const generateVideoWithCompatibilityMode = async () => {
    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    setProcessingTime(0);
    startTimeRef.current = Date.now();

    try {
      console.log('🔄 Usando modo de compatibilidade (Canvas + MediaRecorder)');
      
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder não está disponível neste navegador');
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const [width, height] = resolutionMap[resolution].split('x').map(Number);
      
      canvas.width = width;
      canvas.height = height;

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9' 
      });
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setVideo(videoUrl);
      };

      recorder.start();

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);

      for (let i = 0; i < generatedImages.length; i++) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = generatedImages[i].url;
        });

        const scale = Math.min(width / img.width, height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;

        const frames = slideDuration * fps;
        for (let frame = 0; frame < frames; frame++) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          await new Promise(resolve => setTimeout(resolve, 1000 / fps));
        }
      }

      clearInterval(progressInterval);
      setProgress(100);
      recorder.stop();

    } catch (err) {
      console.error('Erro na geração alternativa do vídeo:', err);
      setError(`Modo de compatibilidade falhou: ${err.message}. Tente recarregar a página.`);
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
      setProgress(0);
      clearInterval(progressIntervalRef.current);
      startTimeRef.current = null;
    }
  };

  const handleExport = () => {
    if (video) {
      const a = document.createElement('a');
      a.href = video;
      a.download = `video-${Date.now()}.${compatibilityMode ? 'webm' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds} segundos`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds} min`;
  };

  const LoadingStatus = () => {
    if (ffmpegLoaded) return null;
    
    return (
      <Box sx={{ my: 2, textAlign: 'center' }}>
        {!error ? (
          <>
            <CircularProgress sx={{ color: 'white', mb: 1 }} />
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Carregando motor de vídeo... {Math.round(loadingProgress)}%
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {compatibilityMode ? 'Preparando modo de compatibilidade...' : 'Primeira vez pode levar até 30 segundos'}
            </Typography>
          </>
        ) : (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2, 
              backgroundColor: 'rgba(244,67,54,0.2)', 
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' }
            }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>
            
            <Button 
              size="small" 
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              sx={{ color: 'white', textDecoration: 'underline' }}
            >
              {showTroubleshooting ? 'Ocultar' : 'Ver'} soluções
            </Button>
            
            {showTroubleshooting && (
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  💡 Possíveis soluções:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Verifique sua conexão com a internet
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Desative temporariamente bloqueadores de anúncios
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Tente em modo de navegação anônima
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Use Chrome ou Firefox (versões recentes)
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  • Recarregue a página (Ctrl+F5)
                </Typography>
                
                <Button 
                  size="small" 
                  onClick={handleReload}
                  startIcon={<Refresh />}
                  sx={{ mt: 1, color: 'white', border: '1px solid white' }}
                >
                  Recarregar Página
                </Button>
              </Box>
            )}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Card sx={{ 
        background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
        color: 'white',
        borderRadius: 2,
        boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
      }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: 'bold',
            color: 'white'
          }}>
            <Movie sx={{ mr: 1, fontSize: 32 }} />
            Gerador de Vídeo
            {compatibilityMode && (
              <Tooltip title="Modo de compatibilidade ativo - funcionalidade limitada mas funcional">
                <Info sx={{ ml: 1, fontSize: 20, color: 'orange' }} />
              </Tooltip>
            )}
          </Typography>

          <LoadingStatus />

          {compatibilityMode && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 2, 
                backgroundColor: 'rgba(25,118,210,0.2)', 
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' }
              }}
            >
              Modo de compatibilidade ativo. O vídeo será gerado em formato WebM com funcionalidade limitada.
            </Alert>
          )}

          {environmentChecks && (
            <Paper elevation={0} sx={{ 
              p: 2, 
              mb: 3, 
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 2
            }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                Status do Sistema
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.webAssemblySupport ? 'lightgreen' : 'lightcoral' }}>
                    WebAssembly: {environmentChecks.webAssemblySupport ? '✅' : '❌'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.sharedArrayBufferSupport ? 'lightgreen' : 'orange' }}>
                    SharedArrayBuffer: {environmentChecks.sharedArrayBufferSupport ? '✅' : '⚠️'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.crossOriginIsolated ? 'lightgreen' : 'orange' }}>
                    Cross-Origin Isolated: {environmentChecks.crossOriginIsolated ? '✅' : '⚠️'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: environmentChecks.adBlockerDetected ? 'orange' : 'lightgreen' }}>
                    Bloqueador: {environmentChecks.adBlockerDetected ? '⚠️ Detectado' : '✅ Não detectado'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Paper elevation={0} sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
              Configurações do Vídeo
              <Tooltip title="Configurações recomendadas para melhor desempenho">
                <Info sx={{ ml: 1, fontSize: 18, verticalAlign: 'middle' }} />
              </Tooltip>
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Duração por Slide (segundos)"
                  type="number"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(Math.max(1, Math.min(10, Number(e.target.value))))}
                  fullWidth
                  InputProps={{
                    style: { color: 'white' }
                  }}
                  InputLabelProps={{
                    style: { color: 'rgba(255,255,255,0.7)' }
                  }}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Resolução</InputLabel>
                  <Select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    sx={{ color: 'white' }}
                  >
                    <MenuItem value="480p">480p (Mais rápido)</MenuItem>
                    <MenuItem value="720p">720p (Recomendado)</MenuItem>
                    <MenuItem value="1080p">1080p (Alta qualidade)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Quadros por Segundo (FPS)"
                  type="number"
                  value={fps}
                  onChange={(e) => setFps(Math.max(10, Math.min(60, Number(e.target.value))))}
                  fullWidth
                  InputProps={{
                    style: { color: 'white' }
                  }}
                  InputLabelProps={{
                    style: { color: 'rgba(255,255,255,0.7)' }
                  }}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Transição</InputLabel>
                  <Select
                    value={transition}
                    onChange={(e) => setTransition(e.target.value)}
                    sx={{ color: 'white' }}
                    disabled={compatibilityMode}
                  >
                    {transitionOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label} {compatibilityMode && option.value !== 'none' ? '(Indisponível)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
              Pré-visualização
            </Typography>
            
            <Box
              ref={imageContainerRef}
              sx={{
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: 'rgba(0,0,0,0.3)',
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {generatedImages.length > 0 ? (
                <img
                  src={generatedImages[currentImageIndex].url}
                  alt={`Frame ${currentImageIndex + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transition: 'opacity 0.5s ease-in-out',
                  }}
                />
              ) : (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  <Typography>Nenhuma imagem disponível</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {isLoading && (
            <Box sx={{ mt: 2, backgroundColor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'white' }}>
                  Gerando vídeo... {progress}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {estimatedTime > 0 ? `Tempo estimado: ${formatTime(estimatedTime)}` : 'Calculando...'}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 10, borderRadius: 5 }} 
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                Processando há {processingTime} segundos
                {compatibilityMode && ' (Modo de compatibilidade)'}
              </Typography>
            </Box>
          )}

          {video && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                Vídeo Final {compatibilityMode && '(WebM)'}
              </Typography>
              <video 
                src={video} 
                controls 
                style={{ 
                  width: '100%', 
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  backgroundColor: '#000'
                }} 
              />
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleGeneratePreview}
              disabled={isLoading || generatedImages.length === 0}
              startIcon={<PlayArrow />}
              sx={{ 
                flex: 1,
                minWidth: 200,
                background: 'linear-gradient(45deg, #00c853, #64dd17)',
                fontWeight: 'bold'
              }}
            >
              {isPlaying ? 'Parar Preview' : 'Iniciar Preview'}
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateFinalVideo}
              disabled={isLoading || generatedImages.length === 0}
              startIcon={<Movie />}
              sx={{ 
                flex: 1,
                minWidth: 200,
                background: compatibilityMode ? 
                  'linear-gradient(45deg, #ff9800, #ffc107)' : 
                  'linear-gradient(45deg, #2962ff, #2979ff)',
                fontWeight: 'bold'
              }}
            >
              {compatibilityMode ? 'Gerar Vídeo (Compatibilidade)' : 'Gerar Vídeo Final'}
            </Button>
            
            <Button
              variant="contained"
              onClick={handleExport}
              disabled={!video || isLoading}
              startIcon={<GetApp />}
              sx={{ 
                flex: 1,
                minWidth: 200,
                background: 'linear-gradient(45deg, #ff6d00, #ff9100)',
                fontWeight: 'bold'
              }}
            >
              Exportar Vídeo
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          onClose={handleCloseSnackbar}
          icon={<ErrorOutline />}
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VideoGenerator;

