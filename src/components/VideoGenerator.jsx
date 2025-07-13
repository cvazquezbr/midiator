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
import FFmpeg from '@ffmpeg/ffmpeg';

const VideoGenerator = ({ generatedImages }) => {
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    const loadFfmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });
      ffmpeg.on('progress', ({ progress, time }) => {
        console.log(`Progress: ${progress * 100} %`);
        console.log(`Time: ${time / 1000000} s`);
      });
      await ffmpeg.load();
      setFfmpegLoaded(true);
    }
    loadFfmpeg();
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          if (prevIndex < generatedImages.length - 1) {
            return prevIndex + 1;
          } else {
            setIsPlaying(false); // Para o slideshow no final
            return 0; // Volta para o início
          }
        });
      }, slideDuration * 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slideDuration, generatedImages.length]);

  const handleGeneratePreview = () => {
    setCurrentImageIndex(0);
    setIsPlaying(true);
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

    const ffmpeg = ffmpegRef.current;
    try {
      for (let i = 0; i < generatedImages.length; i++) {
        const response = await fetch(generatedImages[i].url);
        const data = await response.arrayBuffer();
        await ffmpeg.writeFile(`img${i}.png`, new Uint8Array(data));
      }

      const inputFiles = generatedImages
        .map((_, i) => `-loop 1 -t ${slideDuration} -i img${i}.png`)
        .join(' ');

      // Lógica de transição
      let filterComplex = '';
      const n = generatedImages.length;

      if (n > 0) {
        const scaledInputs = generatedImages.map((_, i) => `[${i}:v]scale=${resolutionMap[resolution]}:force_original_aspect_ratio=decrease,pad=${resolutionMap[resolution]}:-1:-1:color=black,setsar=1[v${i}];`).join('');

        if (n > 1 && transition !== 'none') {
          let xfadeChain = '';
          xfadeChain += `[v0][v1]xfade=transition=${transition}:duration=1:offset=${slideDuration - 1}[xv1];`;
          for (let i = 1; i < n - 1; i++) {
            xfadeChain += `[xv${i}][v${i + 1}]xfade=transition=${transition}:duration=1:offset=${(i + 1) * slideDuration - 1}[xv${i + 1}];`;
          }
          filterComplex = scaledInputs + xfadeChain;
        } else {
          filterComplex = scaledInputs + generatedImages.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[out]`;
        }
      }

      const command = [
        '-y',
        ...inputFiles.split(' '),
        '-filter_complex',
        filterComplex,
        '-map',
        n > 1 && transition !== 'none' ? `[xv${n-1}]` : '[out]',
        '-c:v',
        'libx264',
        '-r',
        fps.toString(),
        '-pix_fmt',
        'yuv420p',
        'output.mp4',
      ];

      await ffmpeg.exec(command);

      const data = await ffmpeg.readFile('output.mp4');
      const videoUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'video/mp4' })
      );
      setVideo(videoUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Resolução</InputLabel>
                  <Select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <MenuItem value="1080p">1080p</MenuItem>
                    <MenuItem value="720p">720p</MenuItem>
                    <MenuItem value="480p">480p</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="FPS"
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
                    <MenuItem value="fade">Fade</MenuItem>
                    <MenuItem value="slide">Slide</MenuItem>
                    <MenuItem value="zoom">Zoom</MenuItem>
                    <MenuItem value="none">None</MenuItem>
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
            <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1 }}>
              {generatedImages.map((image, index) => (
                <img
                  key={image.url}
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  style={{
                    height: '80px',
                    border:
                      index === currentImageIndex
                        ? '2px solid #1976d2'
                        : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </Box>
          </Paper>

          {isLoading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Gerando vídeo...
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
              <video src={video} controls style={{ width: '100%' }} />
            </Box>
          )}

          {/* Botões de Ação */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleGeneratePreview}
              disabled={isLoading || generatedImages.length === 0 || isPlaying || !ffmpegLoaded}
              startIcon={<PlayArrow />}
            >
              Gerar Preview
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
