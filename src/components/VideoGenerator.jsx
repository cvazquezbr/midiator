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
  const [slideDurations, setSlideDurations] = useState([]);
  const [transition, setTransition] = useState('fade');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  const imageContainerRef = useRef(null);

  useEffect(() => {
    if (generatedImages.length > 0) {
      setSlideDurations(Array(generatedImages.length).fill(1));
    }
  }, [generatedImages]);

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
      }, slideDurations[currentImageIndex] * 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slideDurations, currentImageIndex, generatedImages.length]);

  const handlePlaySlideshow = () => {
    setIsPlaying(true);
  };

  const handleDurationChange = (index, value) => {
    setSlideDurations((prevDurations) => {
      const newDurations = [...prevDurations];
      newDurations[index] = value;
      return newDurations;
    });
  };

  const generateVideo = async () => {
    setIsLoading(true);
    setError(null);
    setVideo(null);

    const ffmpeg = ffmpegRef.current;
    try {
      await ffmpeg.load();
      for (let i = 0; i < generatedImages.length; i++) {
        const file = await fetchFile(generatedImages[i].url);
        await ffmpeg.writeFile(`img${i}.png`, file);
      }

      let filterComplex = '';
      switch (transition) {
        case 'fade':
          filterComplex = generatedImages
            .map(
              (_, i) =>
                `[${i}:v]fade=t=in:st=0:d=0.5,fade=t=out:st=${
                  slideDurations[i] - 0.5
                }:d=0.5[v${i}]`
            )
            .join(';');
          break;
        case 'slide':
          filterComplex = generatedImages
            .map(
              (_, i) =>
                `[${i}:v]format=pix_fmts=yuva420p,fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st=${
                  slideDurations[i] - 0.5
                }:d=0.5:alpha=1[v${i}]`
            )
            .join(';');
          break;
        case 'none':
        default:
          filterComplex = generatedImages
            .map((_, i) => `[${i}:v]null[v${i}]`)
            .join(';');
          break;
      }

      const concatFilter =
        generatedImages.map((_, i) => `[v${i}]`).join('') +
        `concat=n=${generatedImages.length}:v=1:a=0[v]`;

      const inputs = generatedImages.flatMap((_, i) => ['-i', `img${i}.png`]);

      const filterComplex = generatedImages
        .map(
          (_, i) =>
            `[${i}:v]tpad=stop_mode=clone:stop_duration=${slideDurations[i]}[v${i}]`
        )
        .join(';');

      let crossfadeFilter = '';
      if (transition === 'fade' && generatedImages.length > 1) {
        let currentVideo = 'v0';
        for (let i = 1; i < generatedImages.length; i++) {
          const nextVideo = `v${i}`;
          const outputVideo = `cf${i}`;
          const offset = slideDurations
            .slice(0, i)
            .reduce((a, b) => a + b, 0);
          crossfadeFilter += `[${currentVideo}][${nextVideo}]xfade=transition=fade:duration=1:offset=${
            offset - 0.5
          }[${outputVideo}];`;
          currentVideo = outputVideo;
        }
        crossfadeFilter = crossfadeFilter.slice(0, -1); // remove last semicolon
      }

      const command = [
        '-y',
        ...inputs,
        '-filter_complex',
        `${filterComplex};${crossfadeFilter}`,
        '-map',
        `[${
          transition === 'fade' && generatedImages.length > 1
            ? 'cf' + (generatedImages.length - 1)
            : 'v0'
        }]`,
        '-c:v',
        'libx264',
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
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Generating video...
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
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: index === currentImageIndex ? 1 : 0,
                  transition: `opacity 0.5s ${transition}`,
                }}
              >
                <img
                  key={image.url}
                  src={image.url}
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  <InputLabel htmlFor={`duration-${index}`} sx={{ color: 'white' }}>
                    Duration (s)
                  </InputLabel>
                  <Slider
                    id={`duration-${index}`}
                    value={slideDurations[index] || 1}
                    onChange={(e, newValue) => handleDurationChange(index, newValue)}
                    aria-labelledby="duration-slider"
                    valueLabelDisplay="auto"
                    step={0.1}
                    min={0.1}
                    max={10}
                    sx={{ width: 150, color: 'white' }}
                  />
                </Box>
              </div>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoGenerator;
