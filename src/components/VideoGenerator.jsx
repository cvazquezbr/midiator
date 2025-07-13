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
import { fetchFile, toBlobURL } from '@ffmpeg/util'; // Importe toBlobURL aqui




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

  const ffmpegRef = useRef(new FFmpeg());



  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const imageContainerRef = useRef(null);

  // Correção 1: Lógica de carregamento do FFmpeg atualizada
  useEffect(() => {
    const loadFfmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on('log', ({ message }) => {
        console.log(message); // Útil para depuração
      });
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      try {
        // Use um CDN (como unpkg) para carregar os arquivos do core.
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript' ),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegLoaded(true);
      } catch (err) {
        console.error("Failed to load ffmpeg:", err);
        setError("Não foi possível carregar o componente de vídeo. Tente recarregar a página.");
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
    setIsPlaying(!isPlaying); // Alterna o estado de play/pause
  };

  const resolutionMap = {
    '1080p': '1920x1080',
    '720p': '1280x720',
    '480p': '854x480',
  };

  const handleGenerateFinalVideo = async () => {
    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);

    const ffmpeg = ffmpegRef.current;
    try {
      // Escreve os arquivos de imagem no sistema de arquivos virtual do FFmpeg
      for (let i = 0; i < generatedImages.length; i++) {
        // Usar fetchFile da biblioteca @ffmpeg/util é mais robusto
        await ffmpeg.writeFile(`img${i}.png`, await fetchFile(generatedImages[i].url));
      }

      // Correção 2: Geração de comando FFmpeg mais robusta
      const command = ['-y'];
      const filterComplexParts = [];
      const n = generatedImages.length;

      // Adiciona cada imagem como uma entrada de loop
      for (let i = 0; i < n; i++) {
        command.push('-loop', '1', '-t', slideDuration.toString(), '-i', `img${i}.png`);
      }

      // Prepara o filtro de escala e preenchimento para cada vídeo
      const scaledInputs = generatedImages.map((_, i) =>
        `[${i}:v]scale=${resolutionMap[resolution]}:force_original_aspect_ratio=decrease,pad=${resolutionMap[resolution]}:-1:-1:color=black,setsar=1[v${i}];`
      ).join('');
      filterComplexParts.push(scaledInputs);

      let outputMapLabel = '[out]'; // Rótulo de saída padrão

      if (n > 1 && transition !== 'none') {
        let xfadeChain = '';
        // Constrói a cadeia de transições xfade
        xfadeChain += `[v0][v1]xfade=transition=${transition}:duration=1:offset=${slideDuration - 1}[xv1];`;
        for (let i = 1; i < n - 1; i++) {
          xfadeChain += `[xv${i}][v${i + 1}]xfade=transition=${transition}:duration=1:offset=${(i + 1) * slideDuration - 1}[xv${i + 1}];`;
        }
        filterComplexParts.push(xfadeChain);
        outputMapLabel = `[xv${n - 1}]`; // A saída é o último elo da cadeia
      } else {
        // Se não houver transição, apenas concatena os vídeos
        const concatInputs = generatedImages.map((_, i) => `[v${i}]`).join('');
        filterComplexParts.push(`${concatInputs}concat=n=${n}:v=1:a=0[out]`);
      }

      command.push('-filter_complex', filterComplexParts.join(''));
      command.push('-map', outputMapLabel);
      command.push('-c:v', 'libx264', '-r', fps.toString(), '-pix_fmt', 'yuv420p', 'output.mp4');

      console.log("Executing FFmpeg command:", command.join(' '));
      await ffmpeg.exec(command);

      const data = await ffmpeg.readFile('output.mp4');
      const videoUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'video/mp4' })
      );
      setVideo(videoUrl);
    } catch (err) {
      console.error(err);
      setError(`Ocorreu um erro na geração do vídeo: ${err.message}`);
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
                  inputProps={{ min: 1 }}
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
                  onChange={(e) => setFps(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Modelo de Transição</InputLabel>
                  <Select
                    value={transition}
                    onChange={(e) => setTransition(e.target.value)}
                  >
                    <MenuItem value="fade">Fade (Esmaecer)</MenuItem>
                    <MenuItem value="slideleft">Slide Left</MenuItem>
                    <MenuItem value="slideright">Slide Right</MenuItem>
                    <MenuItem value="slideup">Slide Up</MenuItem>
                    <MenuItem value="slidedown">Slide Down</MenuItem>
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
                    transition: 'opacity 0.5s ease-in-out', // Efeito suave no preview
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
              disabled={isLoading || generatedImages.length === 0 || !ffmpegLoaded}
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
