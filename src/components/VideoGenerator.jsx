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
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Movie, Slideshow } from '@mui/icons-material';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const VideoGenerator = ({ generatedImages }) => {
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [frameRate, setFrameRate] = useState(1);
  const [transition, setTransition] = useState('fade');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const ffmpegRef = useRef(new FFmpeg());

  const imageContainerRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          if (prevIndex < generatedImages.length - 1) {
            return prevIndex + 1;
          } else {
            setIsPlaying(false);
            return 0;
          }
        });
      }, 1000 / frameRate);
    }
    return () => clearInterval(interval);
  }, [isPlaying, frameRate, generatedImages.length]);

  const handlePlaySlideshow = () => {
    setIsPlaying(true);
  };

  const generateVideo = async () => {
    console.log('Starting video generation...');
    setIsLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    setProgressMessage('Carregando ffmpeg...');

    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    try {
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      });
      console.log('ffmpeg loaded successfully');
      setProgressMessage('Escrevendo arquivos...');
      for (let i = 0; i < generatedImages.length; i++) {
        const file = await fetchFile(generatedImages[i].url);
        await ffmpeg.writeFile(`img${i}.png`, file);
      }

      setProgressMessage('Gerando vídeo...');
      await ffmpeg.exec([
        '-framerate',
        `${frameRate}`,
        '-i',
        'img%d.png',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        'output.mp4',
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const videoUrl = URL.createObjectURL(
        new Blob([data.buffer], { type: 'video/mp4' })
      );
      setVideo(videoUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setProgress(0);
      setProgressMessage('');
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

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Frame Rate (FPS)</InputLabel>
                <Slider
                  value={frameRate}
                  onChange={(e, newValue) => setFrameRate(newValue)}
                  aria-labelledby="frame-rate-slider"
                  valueLabelDisplay="auto"
                  step={1}
                  marks
                  min={1}
                  max={30}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Transition</InputLabel>
                <Select
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                >
                  <MenuItem value="fade">Fade</MenuItem>
                  <MenuItem value="slide">Slide</MenuItem>
                  <MenuItem value="none">None</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={generateVideo}
              disabled={isLoading || generatedImages.length === 0}
              startIcon={<Movie />}
            >
              Generate Video
            </Button>
            <Button
              variant="outlined"
              onClick={handlePlaySlideshow}
              disabled={isPlaying || generatedImages.length === 0}
              startIcon={<Slideshow />}
            >
              Play Slideshow
            </Button>
          </Box>

          {isLoading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {progressMessage}
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
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
                Generated Video
              </Typography>
              <video src={video} controls style={{ width: '100%' }} />
            </Box>
          )}

          <Box
            ref={imageContainerRef}
            sx={{
              mt: 3,
              width: '100%',
              aspectRatio: '16/9',
              backgroundColor: '#000',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {generatedImages.map((image, index) => (
              <img
                key={image.url}
                src={image.url}
                alt={`Frame ${index + 1}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: index === currentImageIndex ? 1 : 0,
                  transition: `opacity ${1 / frameRate}s ${transition}`,
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoGenerator;
