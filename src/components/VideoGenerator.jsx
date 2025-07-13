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
import { Movie, PlayArrow, Stop, Slideshow } from '@mui/icons-material';
import Uppy from '@uppy/core';
import ScreenCapture from '@uppy/screen-capture';

const VideoGenerator = ({ generatedImages }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [frameRate, setFrameRate] = useState(1);
  const [transition, setTransition] = useState('fade');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const uppy = new Uppy({
    autoProceed: true,
  }).use(ScreenCapture, {
    onBeforeRecording: async () => {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      return stream;
    },
  });

  useEffect(() => {
    if (!uppy) {
      return;
    }
    const onComplete = (result) => {
      const videoFile = result.successful[0];
      if (videoFile) {
        setVideo(URL.createObjectURL(videoFile.data));
      }
      setIsRecording(false);
    };

    const onError = (error) => {
      setError(error.message);
      setIsRecording(false);
    };

    uppy.on('complete', onComplete);
    uppy.on('error', onError);

    return () => {
      uppy.off('complete', onComplete);
      uppy.off('error', onError);
    };
  }, [uppy]);

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

  const handleStartRecording = () => {
    uppy.getPlugin('ScreenCapture').start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    uppy.getPlugin('ScreenCapture').stop();
  };

  const handlePlaySlideshow = () => {
    setIsPlaying(true);
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
              onClick={handleStartRecording}
              disabled={isRecording}
              startIcon={<PlayArrow />}
            >
              Start Recording
            </Button>
            <Button
              variant="contained"
              onClick={handleStopRecording}
              disabled={!isRecording}
              startIcon={<Stop />}
            >
              Stop Recording
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

          {isRecording && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Recording...
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
