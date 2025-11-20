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
import googleCloudTTSAPI from '../utils/googleCloudTTSAPI';
import { useSettings } from '../context/SettingsContext';
import { useCampaign } from '../context/CampaignContext';
import { getPlayableBlob } from '../utils/fileUtils';
import ProgressModal from './ProgressModal';
import { toast } from 'sonner';

const AudioGenerator = ({ csvData, fieldPositions }) => {
  const { campaignState, setCampaignState, pendingAssets, addPendingAsset, removePendingAsset } = useCampaign();
  const { generatedAudioData: audioData } = campaignState;
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [audioMode, setAudioMode] = useState('browser');
  const [speechRate, setSpeechRate] = useState(1.0); // Nova state para velocidade
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const { settings } = useSettings();
  const currentTrackIndexRef = useRef(0);
  const audioRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Initialize the Google Cloud TTS API when the component mounts or mode changes
  useEffect(() => {
    if (audioMode.startsWith('google-tts')) {
      const credsString = settings.googleCloudTTSCredentials;
      if (credsString) {
        try {
          const credentials = JSON.parse(credsString);
          googleCloudTTSAPI.initialize(credentials);
        } catch (error) {
          console.error("Falha ao analisar as credenciais do Google Cloud TTS a partir das configurações:", error);
          // Optionally, you could show a toast or an alert here
        }
      } else {
        // This is not necessarily an error, the user might not have set them up yet.
        // The error will be thrown when they try to generate.
        console.log("Credenciais do Google Cloud TTS não configuradas.");
      }
    }
  }, [audioMode, settings.googleCloudTTSCredentials]);

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
        resolve({ text, duration: adjustedDuration / 1000, blob: null, url: null, source: 'browser', rate });
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

    // Substituir &nbsp; por espaço normal
    const noNbsp = noHtml.replace(/&nbsp;/g, ' ');

    // Remove múltiplos pontos com ou sem espaços: ". .", "..", "... ", etc → ". "
    const fixedDots = noNbsp.replace(/(\s*\.\s*){2,}/g, '. ');

    // Limpa padrões específicos indesejados, como "..':"
    const cleanedText = fixedDots.replace(/\.{2,}':/g, '');

    // Remove espaços extras
    return cleanedText.trim();
  };

  const generateAudioGoogleTTS = async (text, voice, rate = 1.0) => {
    // Always check for initialization before generating.
    if (!googleCloudTTSAPI.isInitialized) {
      const credsString = settings.googleCloudTTSCredentials;
      if (credsString) {
        try {
          const credentials = JSON.parse(credsString);
          googleCloudTTSAPI.initialize(credentials);
        } catch (error) {
          console.error("Falha ao analisar as credenciais do Google Cloud TTS a partir das configurações:", error);
          throw new Error('As credenciais do Google Cloud TTS salvas são inválidas. Por favor, verifique-as na tela de configuração.');
        }
      } else {
        throw new Error('Credenciais do Google Cloud TTS não configuradas. Por favor, adicione-as na tela de configuração.');
      }
    }

    if (!googleCloudTTSAPI.isInitialized) {
      // This is a fallback check, in case initialization failed silently before.
      throw new Error('A API do Google Cloud TTS não pôde ser inicializada. Verifique as credenciais.');
    }

    const cleanText = removeFormatting(text);

    // A velocidade é passada para o método synthesize
    const audioContent = await googleCloudTTSAPI.synthesize(cleanText, voice, rate);
    const blob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mpeg' });

    // Use the centralized handler to create a blob URL and manage the asset
    const blobUrl = addPendingAsset(blob);
    if (!blobUrl) {
      throw new Error("Failed to create a local URL for the generated audio.");
    }

    // We need the duration, so we still use a temporary Audio object
    const audio = new Audio(blobUrl);

    return new Promise(resolve => {
      audio.onloadedmetadata = () => {
        // Resolve with the blobUrl and the blob itself for immediate playback.
        resolve({ text, duration: audio.duration, blob: blob, url: blobUrl, source: 'google-tts', rate });
      };
    });
  };

  const handleGenerateAllAudio = async (voice) => {
    setIsGenerating(true);
    setShowProgressModal(true);
    isCancelledRef.current = false;
    const generatedAudios = [];

    // Clean up old assets before generating new ones
    audioData.forEach(audio => {
      if (audio.url && audio.url.startsWith('blob:')) {
        removePendingAsset(audio.url);
      }
    });

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
          audio.index = i;
          audio.filename = `audio_${String(i + 1).padStart(3, '0')}.mp3`;
        } else {
          audio = await generateAudioBrowser(textToSpeak, speechRate);
          audio.index = i;
          audio.filename = `audio_${String(i + 1).padStart(3, '0')}.mp3`;
        }
        generatedAudios.push(audio);
      } catch (error) {
        console.error('Error generating audio for slide', i, error);
        toast.error(`Erro ao gerar áudio para o slide ${i + 1}: ${error.message}`);
      }
    }
    
    setCampaignState({ generatedAudioData: generatedAudios });
    setIsGenerating(false);
    setShowProgressModal(false);
    setProgress(0);
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
  };

  const handlePlayPause = (index) => {
    if (currentlyPlaying === index) {
      if (audioRef.current) audioRef.current.pause();
      speechSynthesis.cancel();
      setCurrentlyPlaying(null);
      return;
    }

    speechSynthesis.cancel();
    if (audioRef.current) {
        // Clean up the previous blob URL to prevent memory leaks
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.pause();
    }

    const audio = audioData[index];
    const blobToPlay = getPlayableBlob(audio, pendingAssets);

    if (audio.source === 'google-tts' && blobToPlay) {
      // The URL from `getPlayableBlob` is already a valid blob URL managed by the context.
      // However, for playback, we create a new temporary object URL to be safe,
      // and revoke it when the audio element is paused or a new one is played.
      const playbackUrl = URL.createObjectURL(blobToPlay);
      audioRef.current = new Audio(playbackUrl);
      audioRef.current.onended = () => {
        setCurrentlyPlaying(null);
        URL.revokeObjectURL(playbackUrl); // Clean up after playback
      };
      audioRef.current.play();
    } else if (audio.source === 'browser') {
      const utterance = new SpeechSynthesisUtterance(audio.text);
      utterance.lang = 'pt-BR';
      utterance.rate = speechRate;
      utterance.onended = () => setCurrentlyPlaying(null);
      speechSynthesis.speak(utterance);
    } else {
      toast.error("Não foi possível encontrar os dados de áudio para reprodução.");
      console.error("Failed to find playable blob for audio:", audio);
      return;
    }
    setCurrentlyPlaying(index);
  };

  const playNextTrack = () => {
    if (currentTrackIndexRef.current >= audioData.length) {
      setIsPlayingAll(false);
      setCurrentlyPlaying(null);
      return;
    }

    const audio = audioData[currentTrackIndexRef.current];
    const blobToPlay = getPlayableBlob(audio, pendingAssets);

    if (audio.source === 'google-tts' && blobToPlay) {
      const playbackUrl = URL.createObjectURL(blobToPlay);
      audioRef.current = new Audio(playbackUrl);
      audioRef.current.onended = () => {
        URL.revokeObjectURL(playbackUrl);
        currentTrackIndexRef.current += 1;
        playNextTrack();
      };
      audioRef.current.play();
    } else if (audio.source === 'browser') {
      const utterance = new SpeechSynthesisUtterance(audio.text);
      utterance.lang = 'pt-BR';
      utterance.rate = speechRate;
      utterance.onended = () => {
        currentTrackIndexRef.current += 1;
        playNextTrack();
      };
      speechSynthesis.speak(utterance);
    } else {
        // Skip unplayable track
        console.warn("Skipping unplayable track:", audio);
        currentTrackIndexRef.current += 1;
        playNextTrack();
        return;
    }

    setCurrentlyPlaying(currentTrackIndexRef.current);
  };

  const handlePlayAll = () => {
    if (isPlayingAll) {
      if (audioRef.current) {
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
        }
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
    const blob = getPlayableBlob(audio, pendingAssets);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_${index + 1}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Clean up the temporary URL
    }
  };

  const handleDownloadAll = () => {
    audioData.forEach((audio, index) => {
      const blob = getPlayableBlob(audio, pendingAssets);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audio_${index + 1}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up the temporary URL
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
                    disabled={isGenerating || audioData.some(a => !getPlayableBlob(a))}
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

                          // Clean up the old asset before generating a new one
                          const oldAudio = audioData[index];
                          if (oldAudio.url && oldAudio.url.startsWith('blob:')) {
                            removePendingAsset(oldAudio.url);
                          }

                          let newAudio;
                          if (audioMode.startsWith('google-tts')) {
                            newAudio = await generateAudioGoogleTTS(audio.text, voiceMap[audioMode], speechRate);
                          } else {
                            newAudio = await generateAudioBrowser(audio.text, speechRate);
                          }
                          const newAudioData = [...audioData];
                          newAudioData[index] = newAudio;
                          setCampaignState({ generatedAudioData: newAudioData });
                        }} size="small">
                          <Replay />
                        </IconButton>
                        <Tooltip title="Baixar áudio (somente Google TTS)">
                          <span>
                            <IconButton onClick={() => handleDownload(index)} disabled={!getPlayableBlob(audio, pendingAssets)} size="small">
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