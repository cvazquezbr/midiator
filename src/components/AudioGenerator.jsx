import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Replay,
  GraphicEq,
  Audiotrack,
  Timer
} from '@mui/icons-material';

const AudioGenerator = ({ csvData, fieldPositions, onAudiosGenerated }) => {
  const [audioData, setAudioData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const currentTrackIndexRef = useRef(0);

  const generateAudio = async (text) => {
    return new Promise((resolve, reject) => {
      const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
      const textWithoutEmojis = text.replace(emojiRegex, '');
      const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);
      utterance.lang = 'pt-BR';
      utterance.onend = () => {
        // There is no direct way to get the audio blob from the Web Speech API.
        // We will store the text and duration, and synthesize it on the fly.
        // The duration is an approximation.
        const duration = textWithoutEmojis.length * 50; // Approximate duration in ms
        resolve({ text, duration: duration / 1000 });
      };
      utterance.onerror = (event) => {
        reject(event.error);
      };
      speechSynthesis.speak(utterance);
    });
  };

  const handleGenerateAllAudio = async () => {
    setIsGenerating(true);
    const generatedAudios = [];
    for (let i = 0; i < csvData.length; i++) {
      const record = csvData[i];
      const visibleFields = Object.keys(record).filter(
        (field) => fieldPositions[field]?.visible
      );
      const textToSpeak = visibleFields.map((field) => record[field]).join('. ');
      try {
        const audio = await generateAudio(textToSpeak);
        generatedAudios.push(audio);
      } catch (error) {
        console.error('Error generating audio for slide', i, error);
      }
    }
    setAudioData(generatedAudios);
    onAudiosGenerated(generatedAudios);
    setIsGenerating(false);
  };

  const handlePlayPause = (index) => {
    if (currentlyPlaying === index) {
      speechSynthesis.cancel();
      setCurrentlyPlaying(null);
    } else {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(audioData[index].text);
      utterance.lang = 'pt-BR';
      utterance.onend = () => {
        setCurrentlyPlaying(null);
      };
      speechSynthesis.speak(utterance);
      setCurrentlyPlaying(index);
    }
  };

  const playNextTrack = () => {
    if (currentTrackIndexRef.current < audioData.length) {
      const utterance = new SpeechSynthesisUtterance(audioData[currentTrackIndexRef.current].text);
      utterance.lang = 'pt-BR';
      utterance.onend = () => {
        setCurrentlyPlaying(null);
        currentTrackIndexRef.current += 1;
        playNextTrack();
      };
      speechSynthesis.speak(utterance);
      setCurrentlyPlaying(currentTrackIndexRef.current);
    } else {
      setIsPlayingAll(false);
    }
  };

  const handlePlayAll = () => {
    if (isPlayingAll) {
      speechSynthesis.cancel();
      setIsPlayingAll(false);
      setCurrentlyPlaying(null);
    } else {
      setIsPlayingAll(true);
      currentTrackIndexRef.current = 0;
      playNextTrack();
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <Audiotrack sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gerar Áudio
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleGenerateAllAudio}
                disabled={isGenerating || csvData.length === 0}
                startIcon={isGenerating ? <CircularProgress size={20} /> : <GraphicEq />}
              >
                {isGenerating ? 'Gerando Áudios...' : 'Gerar Áudio para Todos os Slides'}
              </Button>
              <Button
                variant="outlined"
                onClick={handlePlayAll}
                disabled={isGenerating || audioData.length === 0}
                startIcon={isPlayingAll ? <Pause /> : <PlayArrow />}
                sx={{ ml: 2 }}
              >
                {isPlayingAll ? 'Pausar Tudo' : 'Reproduzir Tudo'}
              </Button>
            </Grid>
          </Grid>

          {audioData.length > 0 && (
            <List sx={{ mt: 2 }}>
              {audioData.map((audio, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <Box>
                      <Chip icon={<Timer />} label={`${audio.duration.toFixed(1)}s`} sx={{ mr: 2 }} />
                      <IconButton onClick={() => handlePlayPause(index)}>
                        {currentlyPlaying === index ? <Pause /> : <PlayArrow />}
                      </IconButton>
                      <IconButton onClick={async () => {
                        const newAudio = await generateAudio(audio.text);
                        const newAudioData = [...audioData];
                        newAudioData[index] = newAudio;
                        setAudioData(newAudioData);
                        onAudiosGenerated(newAudioData);
                      }}>
                        <Replay />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    <Audiotrack />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Slide ${index + 1}`}
                    secondary={audio.text}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AudioGenerator;
