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
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Replay,
  GraphicEq,
  Audiotrack,
  Timer,
  SaveAlt,
  CloudDownload
} from '@mui/icons-material';
import { getGoogleCloudTTSCredentials } from '../utils/googleCloudTTSCredentials';
import { callGoogleCloudTTSAPI } from '../utils/googleCloudTTSAPI';
import ProgressModal from './ProgressModal';

const AudioGenerator = ({ csvData, fieldPositions, onAudiosGenerated }) => {
  const [audioData, setAudioData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [audioMode, setAudioMode] = useState('browser');
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const currentTrackIndexRef = useRef(0);
  const audioRef = useRef(null);
  const isCancelledRef = useRef(false);

  const generateAudioBrowser = async (text) => {
    return new Promise((resolve, reject) => {
      const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
      const textWithoutEmojis = text.replace(emojiRegex, '');
      const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);
      utterance.lang = 'pt-BR';
      utterance.onend = () => {
        const duration = textWithoutEmojis.length * 50; // Approximate duration in ms
        resolve({ text, duration: duration / 1000, blob: null, source: 'browser' });
      };
      utterance.onerror = (event) => {
        reject(event.error);
      };
      speechSynthesis.speak(utterance);
    });
  };

  const removeEmojis = (text) => {
    return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
  };

  const generateAudioGoogleTTS = async (text, voice) => {
    const credentials = getGoogleCloudTTSCredentials();
    if (!credentials) {
      throw new Error('Credenciais do Google Cloud TTS não configuradas.');
    }
    const cleanText = removeEmojis(text);
    const audioContent = await callGoogleCloudTTSAPI(cleanText, credentials, voice);
    const blob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    return new Promise(resolve => {
        audio.onloadedmetadata = () => {
            resolve({ text, duration: audio.duration, blob, source: 'google-tts' });
        };
    });
  };

  const handleGenerateAllAudio = async (voice) => {
    setIsGenerating(true);
    setShowProgressModal(true);
    isCancelledRef.current = false;
    const generatedAudios = [];
    for (let i = 0; i < csvData.length; i++) {
      if (isCancelledRef.current) {
        break;
      }
      setProgress(i + 1);
      const record = csvData[i];
      const visibleFields = Object.keys(record).filter(
        (field) => fieldPositions[field]?.visible
      );
      const textToSpeak = visibleFields.map((field) => record[field]).join('. ');
      try {
        let audio;
        if (audioMode.startsWith('google-tts')) {
          audio = await generateAudioGoogleTTS(textToSpeak, voice);
        } else {
          audio = await generateAudioBrowser(textToSpeak);
        }
        generatedAudios.push(audio);
      } catch (error) {
        console.error('Error generating audio for slide', i, error);
        alert(`Erro ao gerar áudio para o slide ${i + 1}: ${error.message}`);
      }
    }
    setAudioData(generatedAudios);
    onAudiosGenerated(generatedAudios);
    setIsGenerating(false);
    setShowProgressModal(false);
    setProgress(0);
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
  };

  const handlePlayPause = (index) => {
    if (currentlyPlaying === index) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      speechSynthesis.cancel();
      setCurrentlyPlaying(null);
    } else {
      speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = audioData[index];
      if (audio.source === 'google-tts' && audio.blob) {
        const url = URL.createObjectURL(audio.blob);
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
          setCurrentlyPlaying(null);
        };
        audioRef.current.play();
      } else {
        const utterance = new SpeechSynthesisUtterance(audio.text);
        utterance.lang = 'pt-BR';
        utterance.onend = () => {
          setCurrentlyPlaying(null);
        };
        speechSynthesis.speak(utterance);
      }
      setCurrentlyPlaying(index);
    }
  };

  const playNextTrack = () => {
    if (currentTrackIndexRef.current < audioData.length) {
      const audio = audioData[currentTrackIndexRef.current];
      if (audio.source === 'google-tts' && audio.blob) {
        const url = URL.createObjectURL(audio.blob);
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
          setCurrentlyPlaying(null);
          currentTrackIndexRef.current += 1;
          playNextTrack();
        };
        audioRef.current.play();
      } else {
        const utterance = new SpeechSynthesisUtterance(audio.text);
        utterance.lang = 'pt-BR';
        utterance.onend = () => {
          setCurrentlyPlaying(null);
          currentTrackIndexRef.current += 1;
          playNextTrack();
        };
        speechSynthesis.speak(utterance);
      }
      setCurrentlyPlaying(currentTrackIndexRef.current);
    } else {
      setIsPlayingAll(false);
    }
  };

  const handlePlayAll = () => {
    if (isPlayingAll) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      speechSynthesis.cancel();
      setIsPlayingAll(false);
      setCurrentlyPlaying(null);
    } else {
      setIsPlayingAll(true);
      currentTrackIndexRef.current = 0;
      playNextTrack();
    }
  };

  const handleDownload = (index) => {
    const audio = audioData[index];
    if (audio.blob) {
      const url = URL.createObjectURL(audio.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_${index + 1}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadAll = () => {
    audioData.forEach((audio, index) => {
      if (audio.blob) {
        const url = URL.createObjectURL(audio.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audio_${index + 1}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="audio-mode-label">Modo de Áudio</InputLabel>
                <Select
                  labelId="audio-mode-label"
                  id="audio-mode-select"
                  value={audioMode}
                  label="Modo de Áudio"
                  onChange={(e) => setAudioMode(e.target.value)}
                >
                  <MenuItem value="browser">Navegador (Padrão)</MenuItem>
                  <MenuItem value="google-tts-a">Google Cloud TTS (Voz A)</MenuItem>
                  <MenuItem value="google-tts-b">Google Cloud TTS (Voz B)</MenuItem>
                  <MenuItem value="google-tts-c">Google Cloud TTS (Voz C)</MenuItem>
                  <MenuItem value="google-tts-chirp-female">Google Cloud TTS (Chirp HD Feminina)</MenuItem>
                  <MenuItem value="google-tts-chirp-male">Google Cloud TTS (Chirp HD Masculina)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Button
                variant="contained"
                onClick={() => {
                  const voiceMap = {
                    'google-tts-a': 'pt-BR-Wavenet-A',
                    'google-tts-b': 'pt-BR-Wavenet-B',
                    'google-tts-c': 'pt-BR-Wavenet-C',
                    'google-tts-chirp-female': 'pt-BR-Chirp3-HD-Achernar',
                    'google-tts-chirp-male': 'pt-BR-Chirp3-HD-Achird',
                  };
                  handleGenerateAllAudio(voiceMap[audioMode]);
                }}
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
              <Tooltip title="Baixar todos os áudios (somente Google TTS)">
                <span>
                  <Button
                    variant="outlined"
                    onClick={handleDownloadAll}
                    disabled={isGenerating || audioData.some(a => !a.blob)}
                    startIcon={<CloudDownload />}
                    sx={{ ml: 2 }}
                  >
                    Baixar Todos
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          </Grid>

          {audioData.length > 0 && (
            <List sx={{ mt: 2 }}>
              {audioData.map((audio, index) => (
                <ListItem
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    borderBottom: '1px solid #eee',
                    p: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: 'calc(100% - 180px)', overflow: 'hidden' }}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                      <Audiotrack />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Slide ${index + 1}`}
                      secondary={audio.text}
                      primaryTypographyProps={{
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}
                      secondaryTypographyProps={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 1, sm: 0 } }}>
                    <Chip icon={<Timer />} label={`${audio.duration.toFixed(1)}s`} sx={{ mr: 1 }} />
                    <IconButton onClick={() => handlePlayPause(index)} size="small">
                      {currentlyPlaying === index ? <Pause /> : <PlayArrow />}
                    </IconButton>
                    <IconButton onClick={async () => {
                      const voiceMap = {
                        'google-tts-a': 'pt-BR-Wavenet-A',
                        'google-tts-b': 'pt-BR-Wavenet-B',
                        'google-tts-c': 'pt-BR-Wavenet-C',
                        'google-tts-chirp-female': 'pt-BR-Chirp3-HD-Achernar',
                        'google-tts-chirp-male': 'pt-BR-Chirp3-HD-Achird',
                      };
                      let newAudio;
                      if (audioMode.startsWith('google-tts')) {
                        newAudio = await generateAudioGoogleTTS(audio.text, voiceMap[audioMode]);
                      } else {
                        newAudio = await generateAudioBrowser(audio.text);
                      }
                      const newAudioData = [...audioData];
                      newAudioData[index] = newAudio;
                      setAudioData(newAudioData);
                      onAudiosGenerated(newAudioData);
                    }} size="small">
                      <Replay />
                    </IconButton>
                    <Tooltip title="Baixar áudio (somente Google TTS)">
                      <span>
                        <IconButton onClick={() => handleDownload(index)} disabled={!audio.blob} size="small">
                          <SaveAlt />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
      <ProgressModal
        open={showProgressModal}
        progress={progress}
        total={csvData.length}
        onCancel={handleCancel}
        title="Gerando Áudios"
        progressText={`Progresso: ${progress} de ${csvData.length} áudios gerados.`}
      />
    </Box>
  );
};

export default AudioGenerator;
