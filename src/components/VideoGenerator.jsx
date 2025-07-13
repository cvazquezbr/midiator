import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Paper,
} from '@mui/material';
import { Movie, PlayArrow, GetApp } from '@mui/icons-material';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const VideoGenerator = ({ generatedImages }) => {
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [slideDuration, setSlideDuration] = useState(3);
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [transition, setTransition] = useState('fade');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const ffmpegRef = useRef(new FFmpeg());
  const imageContainerRef = useRef(null);

  // Carregamento corrigido do FFmpeg
  useEffect(() => {
    const loadFfmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });
      
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      try {
        // Usando jsdelivr CDN que tem melhor suporte a CORS
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
        
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        });
        
        setFfmpegLoaded(true);
        console.log('FFmpeg carregado com sucesso!');
      } catch (err) {
        console.error("Erro ao carregar FFmpeg:", err);
        // Tentar fallback local
        try {
          await ffmpeg.load();
          setFfmpegLoaded(true);
          console.log('FFmpeg carregado com configuração padrão!');
        } catch (fallbackErr) {
          console.error("Erro no fallback:", fallbackErr);
          setError(`Não foi possível carregar o componente de vídeo. Tente recarregar a página.`);
        }
      }
    };

    loadFfmpeg();
  }, []);

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

  const resolutionMap = {
    '1080p': '1920x1080',
    '720p': '1280x720',
    '480p': '854x480',
  };

  const handleGenerateFinalVideo = async () => {
    if (!ffmpegLoaded) {
      setError('FFmpeg ainda não foi carregado. Aguarde um momento.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);

    const ffmpeg = ffmpegRef.current;
    
    try {
      // Limpar arquivos anteriores
      try {
        await ffmpeg.deleteFile('output.mp4');
      } catch (e) {
        // Arquivo não existe, ok
      }

      // Escrever arquivos de imagem
      for (let i = 0; i < generatedImages.length; i++) {
        const imageData = await fetchFile(generatedImages[i].url);
        await ffmpeg.writeFile(`img${i}.png`, imageData);
      }

      // Comando FFmpeg simplificado para testar
      const command = [
        '-y', // Sobrescrever arquivo de saída
        '-framerate', '1/' + slideDuration, // Taxa de quadros baseada na duração
        '-i', 'img%d.png', // Padrão de entrada
        '-c:v', 'libx264', // Codec de vídeo
        '-r', fps.toString(), // FPS de saída
        '-pix_fmt', 'yuv420p', // Formato de pixel
        '-s', resolutionMap[resolution], // Resolução
        'output.mp4'
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
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleExport = () => {
    if (video) {
      const a = document.createElement('a');
      a.href = video;
      a.download = 'video_gerado.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <Movie sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gerar Vídeo
          </Typography>

          {!ffmpegLoaded && !error && (
            <Box sx={{ my: 2 }}>
              <Typography>Carregando editor de vídeo...</Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Seção de Configurações */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configurações
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Duração por Slide (s)"
                  type="number"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(Number(e.target.value))}
                  fullWidth
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Resolução</InputLabel>
                  <Select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <MenuItem value="1080p">1080p (Full HD)</MenuItem>
                    <MenuItem value="720p">720p (HD)</MenuItem>
                    <MenuItem value="480p">480p (SD)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="FPS (Quadros por segundo)"
                  type="number"
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  fullWidth
                  inputProps={{ min: 1, max: 60 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Transição</InputLabel>
                  <Select
                    value={transition}
                    onChange={(e) => setTransition(e.target.value)}
                  >
                    <MenuItem value="fade">Fade</MenuItem>
                    <MenuItem value="dissolve">Dissolve</MenuItem>
                    <MenuItem value="none">Nenhuma</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Seção de Preview */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Preview
            </Typography>
            <Box
              ref={imageContainerRef}
              sx={{
                width: '100%',
                aspectRatio: '16/9',
                backgroundColor: '#000',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {generatedImages.length > 0 && (
                <img
                  src={generatedImages[currentImageIndex].url}
                  alt={`Frame ${currentImageIndex + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transition: 'opacity 0.5s ease-in-out',
                    opacity: 1,
                  }}
                />
              )}
            </Box>
          </Paper>

          {/* Seção de Timeline */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Timeline
            </Typography>
            <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, p: 1 }}>
              {generatedImages.map((image, index) => (
                <img
                  key={image.url}
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  style={{
                    height: '80px',
                    borderRadius: '4px',
                    border:
                      index === currentImageIndex
                        ? '3px solid #1976d2'
                        : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </Box>
          </Paper>

          {isLoading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Gerando vídeo... {progress}%
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {video && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Vídeo Final
              </Typography>
              <video src={video} controls style={{ width: '100%', borderRadius: '4px' }} />
            </Box>
          )}

          {/* Botões de Ação */}
          <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleGeneratePreview}
              disabled={isLoading || generatedImages.length === 0}
              startIcon={<PlayArrow />}
            >
              {isPlaying ? 'Parar Preview' : 'Iniciar Preview'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateFinalVideo}
              disabled={isLoading || generatedImages.length === 0 || !ffmpegLoaded}
              startIcon={<Movie />}
            >
              Gerar Vídeo Final
            </Button>
            <Button
              variant="outlined"
              onClick={handleExport}
              disabled={!video || isLoading}
              startIcon={<GetApp />}
            >
              Exportar
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoGenerator;