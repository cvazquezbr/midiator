import React, { useState, useRef, useEffect } from 'react';
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
  Tooltip,
  Slider
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Replay,
  GraphicEq,
  Audiotrack,
  Timer,
  SaveAlt,
  CloudDownload,
  Speed
} from '@mui/icons-material';
import { getGoogleCloudTTSCredentials } from '../utils/googleCloudTTSCredentials';
import { callGoogleCloudTTSAPI } from '../utils/googleCloudTTSAPI';
import ProgressModal from './ProgressModal';

const AudioGenerator = ({ csvData, fieldPositions, onAudiosGenerated, initialAudioData }) => {
  const [audioData, setAudioData] = useState(initialAudioData || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [audioMode, setAudioMode] = useState('browser');
  const [speechRate, setSpeechRate] = useState(1.0); // Nova state para velocidade
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const currentTrackIndexRef = useRef(0);
  const audioRef = useRef(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    setAudioData(initialAudioData || []);
  }, [initialAudioData]);

  const generateAudioBrowser = async (text, rate = 1.0) => {
    return new Promise((resolve, reject) => {
      const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
      const textWithoutEmojis = text.replace(emojiRegex, '');
      const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);
      utterance.lang = 'pt-BR';
      utterance.rate = rate; // Aplicar velocidade
      utterance.onend = () => {
        const baseDuration = textWithoutEmojis.length * 50;
        const adjustedDuration = baseDuration / rate; // Ajustar duração baseada na velocidade
        resolve({ text, duration: adjustedDuration / 1000, blob: null, source: 'browser', rate });
      };
      utterance.onerror = (event) => {
        reject(event.error);
      };
      speechSynthesis.speak(utterance);
    });
  };

  const removeFormatting = (text) => {
    // Decodifica entidades HTML
    const decoded = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Remove emojis
    const noEmojis = decoded.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ''
    );

    // Remove tags HTML
    const noHtml = noEmojis.replace(/<\/?[^>]+(>|$)/g, '');

    // Remove múltiplos pontos com ou sem espaços: ". .", "..", "... ", etc → ". "
    const fixedDots = noHtml.replace(/(\s*\.\s*){2,}/g, '. ');

    // Limpa padrões específicos indesejados, como "..':"
    const cleanedText = fixedDots.replace(/\.{2,}':/g, '');

    // Remove espaços extras
    return cleanedText.trim();
  };

  const generateAudioGoogleTTS = async (text, voice, rate = 1.0) => {
    const credentials = getGoogleCloudTTSCredentials();
    if (!credentials) {
      throw new Error('Credenciais do Google Cloud TTS não configuradas.');
    }
    const cleanText = removeFormatting(text);
    
    // Passar a velocidade para a API do Google Cloud TTS
    const audioContent = await callGoogleCloudTTSAPI(cleanText, credentials, voice, rate);
    const blob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    return new Promise(resolve => {
      audio.onloadedmetadata = () => {
        resolve({ text, duration: audio.duration, blob, source: 'google-tts', rate });
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
          audio = await generateAudioGoogleTTS(textToSpeak, voice, speechRate);
        } else {
          audio = await generateAudioBrowser(textToSpeak, speechRate);
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
        // Para áudios do Google TTS, a velocidade já está aplicada no áudio
        audioRef.current.onended = () => {
          setCurrentlyPlaying(null);
        };
        audioRef.current.play();
      } else {
        // Para áudios do browser, usar a velocidade original ou recriar com nova velocidade
        const utterance = new SpeechSynthesisUtterance(audio.text);
        utterance.lang = 'pt-BR';
        utterance.rate = speechRate;
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
        utterance.rate = speechRate;
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

  const handleSpeedChange = (event, newValue) => {
    setSpeechRate(newValue);
    
    // Se há um áudio tocando atualmente, a velocidade será aplicada na próxima reprodução.
    // Não é possível alterar a velocidade de um áudio já gerado pelo Google TTS.
    if (currentlyPlaying !== null) {
      // Para browser TTS, precisaríamos parar e reiniciar com nova velocidade,
      // o que pode ser intrusivo. A velocidade será aplicada na próxima vez que o áudio for reproduzido.
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
            <Grid item xs={12} sm={3}>
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
            
            <Grid item xs={12} sm={3}>
              <Box sx={{ px: 2 }}>
                <Typography gutterBottom>
                  <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Velocidade: {speechRate}x
                </Typography>
                <Slider
                  value={speechRate}
                  onChange={handleSpeedChange}
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  marks={[
                    { value: 0.5, label: '0.5x' },
                    { value: 1.0, label: '1.0x' },
                    { value: 1.5, label: '1.5x' },
                    { value: 2.0, label: '2.0x' },
                  ]}
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
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
                    borderBottom: '1px solid #eee',
                    p: 2
                  }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm>
                      <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                        <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                          <Audiotrack />
                        </ListItemIcon>
                        <ListItemText
                          primary={`Slide ${index + 1}`}
                          secondary={removeFormatting(audio.text)}
                          primaryTypographyProps={{
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}
                          secondaryTypographyProps={{
                            whiteSpace: 'normal',
                            wordWrap: 'break-word'
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm="auto">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          icon={<Timer />} 
                          label={`${audio.duration.toFixed(1)}s`} 
                          sx={{ mr: 1 }} 
                        />
                        {audio.rate && (
                          <Chip 
                            icon={<Speed />} 
                            label={`${audio.rate}x`} 
                            variant="outlined"
                            sx={{ mr: 1 }} 
                          />
                        )}
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
                            newAudio = await generateAudioGoogleTTS(audio.text, voiceMap[audioMode], speechRate);
                          } else {
                            newAudio = await generateAudioBrowser(audio.text, speechRate);
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
                    </Grid>
                  </Grid>
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