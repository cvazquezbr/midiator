import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Link as MuiLink,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Switch,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { Language, Publish, LinkedIn } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import TimeHeatMap from './TimeHeatMap';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
} from '@mui/material';
import { Info } from '@mui/icons-material';
import { publishToWordPress } from '../utils/wordpressAPI';
import { publishToLinkedIn, getLinkedInProfiles } from '../utils/linkedinAPI';
import { getLinkedinConfig } from '../utils/linkedinCredentials';
import googleDriveAPI from '../utils/googleDriveAPI';
import { createSchedule, getSchedulesForUser } from '../utils/scheduleAPI';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Publisher = ({
  campaignContent,
  conteudoFormatado,
  generatedImagesData,
  generatedVideosData,
  followupPosts,
  isScheduled,
  setIsScheduled,
  scheduleDate,
  setScheduleDate,
  weeklySchedule,
  setWeeklySchedule,
  selectedProfile,
  setSelectedProfile,
  selectedImages,
  setSelectedImages,
  selectedVideos,
  setSelectedVideos
}) => {
  const [tabValue, setTabValue] = React.useState(0);
  const [mySchedules, setMySchedules] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch schedules when the tab is opened or the selected profile changes
  useEffect(() => {
    const fetchSchedules = async () => {
        if (tabValue === 2 && selectedProfile) { // Tab 2 is "My Schedules"
            setIsLoadingSchedules(true);
            try {
                const schedules = await getSchedulesForUser(selectedProfile);
                // Sort by most recent schedule first
                schedules.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
                setMySchedules(schedules);
            } catch (error) {
                console.error("Failed to fetch user schedules:", error);
                // Optionally set an error state to show in the UI
            } finally {
                setIsLoadingSchedules(false);
            }
        }
    };

    fetchSchedules();
  }, [tabValue, selectedProfile]);

  // State for WordPress
  const [isPublishingWp, setIsPublishingWp] = useState(false);
  const [publishingStatusWp, setPublishingStatusWp] = useState('');
  const [publishedPostUrlWp, setPublishedPostUrlWp] = useState(null);

  // State for LinkedIn
  const [isPublishingLi, setIsPublishingLi] = useState(false);
  const [publishingStatusLi, setPublishingStatusLi] = useState('');
  const [publishedPostUrlLi, setPublishedPostUrlLi] = useState(null);

  // Local states for Publisher component
  const [linkedinProfiles, setLinkedinProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [unifiedMedia, setUnifiedMedia] = useState([]);
  const [previewedMedia, setPreviewedMedia] = useState(null);
  const [schedulePreview, setSchedulePreview] = useState([]);

  useEffect(() => {
    if (!followupPosts || followupPosts.length === 0) {
      setSchedulePreview([]);
      return;
    }

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getScheduledTime = (date) => {
      const dayIndex = date.getDay();
      return weeklySchedule[dayIndex] || 'N/A';
    };

    const preview = followupPosts.map((post, index) => {
      const postDate = new Date(scheduleDate);
      postDate.setDate(postDate.getDate() + index + 1);

      return {
        key: `followup-${index}`,
        date: postDate.toLocaleDateString('pt-BR'),
        day: daysOfWeek[postDate.getDay()],
        time: getScheduledTime(postDate),
        title: post.tipo_gancho || `Follow-up ${index + 1}`
      };
    });

    setSchedulePreview(preview);

  }, [followupPosts, scheduleDate, weeklySchedule]);

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  useEffect(() => {
    const images = (generatedImagesData || []).map((img, index) => ({ ...img, type: 'image', id: `image-${index}`, fileSize: img.blob ? formatBytes(img.blob.size) : 'N/A', fileType: img.blob ? img.blob.type : 'N/A' }));
    const videos = (generatedVideosData || []).map((vid, index) => ({ ...vid, type: 'video', id: `video-${index}`, fileSize: vid.blob ? formatBytes(vid.blob.size) : 'N/A', fileType: vid.blob ? vid.blob.type : 'N/A' }));
    const allMedia = [...images, ...videos];
    setUnifiedMedia(allMedia);
    if (allMedia.length > 0) {
      setPreviewedMedia(allMedia[0]);
    } else {
      setPreviewedMedia(null);
    }
  }, [generatedImagesData, generatedVideosData]);

  // Fetch LinkedIn profiles on component mount
  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoadingProfiles(true);
      setProfileError('');
      try {
        const profiles = await getLinkedInProfiles();

        // Defensively clean the data received from the API
        if (Array.isArray(profiles)) {
          const cleanedProfiles = profiles.filter(p => p && typeof p.urn === 'string' && typeof p.name === 'string');
          setLinkedinProfiles(cleanedProfiles);

          // Set a default profile only if one isn't already selected and the first cleaned profile is valid
          if (cleanedProfiles.length > 0 && !selectedProfile) {
            setSelectedProfile(cleanedProfiles[0].urn);
          }
        } else {
            setLinkedinProfiles([]);
            // It's a valid case for a user to have no profiles, so a console warning might be too noisy.
            // console.warn("LinkedIn API did not return a valid array of profiles or the user has no profiles.");
        }

      } catch (error) {
        console.error("Erro ao buscar perfis do LinkedIn:", error);
        setProfileError(error.message);
        setLinkedinProfiles([]); // Ensure profiles are cleared on error
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, [setSelectedProfile]);

  // Effect to clear selection if media data is removed.
  useEffect(() => {
    if (!generatedImagesData || generatedImagesData.length === 0) {
      setSelectedImages({});
    }
  }, [generatedImagesData]);

  // Effect to clear selection if media data is removed.
  useEffect(() => {
    if (!generatedVideosData || generatedVideosData.length === 0) {
      setSelectedVideos({});
    }
  }, [generatedVideosData]);


  const handlePublishWordPress = async () => {
    setIsPublishingWp(true);
    setPublishingStatusWp('Iniciando publicação...');
    setPublishedPostUrlWp(null);

    try {
      if (!campaignContent || !conteudoFormatado || !generatedImagesData || generatedImagesData.length === 0) {
        throw new Error('Dados da campanha ou imagens não estão disponíveis.');
      }
      const firstImage = generatedImagesData[0];
      if (!firstImage || !firstImage.blob) {
        throw new Error('A primeira imagem gerada não contém um blob válido.');
      }
      const campaignData = {
        campaignContent,
        conteudoFormatado,
        imageBlob: firstImage.blob,
      };
      setPublishingStatusWp('Publicando no WordPress... Isso pode levar um momento.');
      const post = await publishToWordPress(campaignData);
      setPublishingStatusWp(`Post "${post.title.rendered}" criado como rascunho com sucesso!`);
      setPublishedPostUrlWp(post.link);
    } catch (error) {
      console.error('Erro ao publicar no WordPress:', error);
      setPublishingStatusWp(`Erro ao publicar: ${error.message}`);
    } finally {
      setIsPublishingWp(false);
    }
  };

  const handleScheduleLinkedIn = async () => {
    setIsPublishingLi(true);
    setPublishingStatusLi('Iniciando agendamento e upload para o Google Drive...');
    try {
        const linkedinConfig = getLinkedinConfig();
        const driveFolderId = linkedinConfig?.folderId;

        if (!driveFolderId) {
            throw new Error('O ID da Pasta no Google Drive não está configurado na autenticação do LinkedIn.');
        }

        if (!googleDriveAPI.isInitialized) {
            setPublishingStatusLi('Inicializando API do Google Drive...');
            const apiKey = localStorage.getItem("google_drive_api_key");
            const clientId = localStorage.getItem("google_drive_client_id");
            if (!apiKey || !clientId) {
                throw new Error("Credenciais da API do Google Drive não encontradas. Por favor, configure a integração na página principal.");
            }
            await googleDriveAPI.initialize(apiKey, clientId);
        }

        if (!googleDriveAPI.isUserSignedIn()) {
            setPublishingStatusLi('Fazendo login no Google Drive...');
            await googleDriveAPI.signIn();
        }

        const campaignTitle = campaignContent?.titulo || `Campanha Sem Título - ${new Date().toISOString()}`;

        setPublishingStatusLi(`Criando pasta "${campaignTitle}" no Google Drive...`);
        const campaignFolder = await googleDriveAPI.createFolder(campaignTitle, driveFolderId);

        // Lida com upload de imagens
        const imagesToUpload = generatedImagesData.filter((_, index) => selectedImages[index]);
        const uploadedImageIds = [];
        if (imagesToUpload.length > 0) {
            setPublishingStatusLi(`Fazendo upload de ${imagesToUpload.length} imagens...`);
            for (const image of imagesToUpload) {
                const fileName = `imagem_${imagesToUpload.indexOf(image) + 1}.png`;
                const uploadedFile = await googleDriveAPI.uploadFile(image.blob, fileName, campaignFolder.id);
                uploadedImageIds.push(uploadedFile.id);
            }
        }

        // Lida com upload de vídeo
        const videosToUpload = generatedVideosData.filter((_, index) => selectedVideos[index]);
        let uploadedVideoId = '';
        if (videosToUpload.length > 0) {
            setPublishingStatusLi(`Fazendo upload do vídeo...`);
            const video = videosToUpload[0];
            const fileName = `video.mp4`; // ou o tipo de arquivo apropriado
            const uploadedFile = await googleDriveAPI.uploadFile(video.blob, fileName, campaignFolder.id);
            uploadedVideoId = uploadedFile.id;
        }

        setPublishingStatusLi('Criando planilha de controle no Google Drive...');

        const headers = ['Data', 'Horário', 'Author URN', 'Título', 'Conteúdo', 'Convite (CTA)', 'Hashtags', 'Imagens (IDs no Drive)', 'Video (ID no Drive)'];

        const formatDate = (date) => date.toLocaleDateString('pt-BR');
        const getScheduledTime = (date) => {
            const dayIndex = date.getDay(); // 0 for Sunday, 1 for Monday, etc.
            const time = weeklySchedule[dayIndex];
            if (!time) {
                console.warn(`Nenhum horário agendado para o dia ${dayIndex}. Usando 12:00 como padrão.`);
                return '12:00';
            }
            return time;
        };

        const mainPostRow = [
            formatDate(scheduleDate),
            getScheduledTime(scheduleDate),
            selectedProfile,
            campaignContent?.titulo || '',
            campaignContent?.conteudo || '',
            campaignContent?.cta || '',
            campaignContent?.hashtags?.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') || '',
            uploadedImageIds.join(', '),
            uploadedVideoId
        ];

        const sheetData = [headers, mainPostRow];

        if (followupPosts && followupPosts.length > 0) {
            followupPosts.forEach((post, index) => {
                const followupDate = new Date(scheduleDate);
                followupDate.setDate(scheduleDate.getDate() + index + 1);

                const followupRow = [
                    formatDate(followupDate),
                    getScheduledTime(followupDate),
                    selectedProfile,
                    post.titulo || '', // Usando o título do post
                    post.conteudo || '',
                    post.cta || '',
                    post.hashtags_sugeridas?.map(h => h.startsWith('#') ? h : `#${h}`).join(' ') || '',
                    '', // Sem imagem para follow-up
                    ''  // Sem vídeo para follow-up
                ];
                sheetData.push(followupRow);
            });
        }

        const spreadsheet = await googleDriveAPI.createSpreadsheet(
            `Controle - ${campaignTitle}`,
            sheetData,
            campaignFolder.id
        );

        setPublishingStatusLi('Salvando agendamento no servidor para automação...');

        const { accessToken } = getLinkedinConfig();
        if (!accessToken) {
            throw new Error('Não foi possível encontrar o Access Token do LinkedIn para o agendamento automático.');
        }

        const mainPostDate = new Date(scheduleDate);
        const [hours, minutes] = getScheduledTime(mainPostDate).split(':');
        mainPostDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

        const mainPostSchedule = {
            scheduledAt: mainPostDate.toISOString(),
            authorUrn: selectedProfile,
            content: campaignContent,
            accessToken: accessToken,
            imageDriveIds: uploadedImageIds,
            videoDriveId: uploadedVideoId,
        };

        await createSchedule(mainPostSchedule);

        if (followupPosts && followupPosts.length > 0) {
            for (const [index, post] of followupPosts.entries()) {
                const followupDate = new Date(scheduleDate);
                followupDate.setDate(scheduleDate.getDate() + index + 1);
                const [fHours, fMinutes] = getScheduledTime(followupDate).split(':');
                followupDate.setHours(parseInt(fHours, 10), parseInt(fMinutes, 10));

                const followupSchedule = {
                    scheduledAt: followupDate.toISOString(),
                    authorUrn: selectedProfile,
                    content: {
                        titulo: post.titulo || '',
                        conteudo: post.conteudo || '',
                        cta: post.cta || '',
                        hashtags: post.hashtags_sugeridas || [],
                    },
                    accessToken: accessToken,
                    imageDriveIds: [], // Follow-ups are text-only
                    videoDriveId: '',
                };
                await createSchedule(followupSchedule);
            }
        }

        setPublishingStatusLi(`Agendamento salvo no Google Drive e no servidor! Planilha: ${spreadsheet.spreadsheetUrl}`);
        setPublishedPostUrlLi(spreadsheet.spreadsheetUrl);

    } catch (error) {
        console.error('Erro ao salvar agendamento no Google Drive:', error);
        setPublishingStatusLi(`Erro no agendamento: ${error.message}`);
    } finally {
        setIsPublishingLi(false);
    }
  };

  const handlePublishLinkedIn = async () => {
    if (isScheduled) {
      // This case should not be reached if the button is disabled, but as a safeguard:
      handleScheduleLinkedIn();
      return;
    }

    setIsPublishingLi(true);
    setPublishingStatusLi('Iniciando publicação...');
    setPublishedPostUrlLi(null);

    try {
      if (!campaignContent || !conteudoFormatado) {
        throw new Error('Dados da campanha não estão disponíveis. Volte para as etapas anteriores.');
      }
      if (!selectedProfile) {
        throw new Error('Nenhum perfil do LinkedIn foi selecionado.');
      }

      const imageBlobs = generatedImagesData
        .filter((_, index) => selectedImages[index])
        .map(img => img.blob);

      const videoBlobs = generatedVideosData
        .filter((_, index) => selectedVideos[index])
        .map(vid => vid.blob);

      const videoBlob = videoBlobs.length > 0 ? videoBlobs[0] : null;

      const campaignData = {
        campaignContent,
        authorUrn: selectedProfile,
        imageBlobs,
        videoBlob,
      };

      setPublishingStatusLi('Publicando no LinkedIn... Isso pode levar um momento.');
      const post = await publishToLinkedIn(campaignData);
      setPublishingStatusLi(`Post publicado no LinkedIn com sucesso!`);
      setPublishedPostUrlLi(post.link);
    } catch (error) {
      console.error('Erro ao publicar no LinkedIn:', error);
      setPublishingStatusLi(`Erro ao publicar: ${error.message}`);
    } finally {
      setIsPublishingLi(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Publish />
          Publicar Conteúdo
        </Typography>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="publishing tabs">
              <Tab label="LinkedIn" />
              <Tab label="WordPress" />
              <Tab label="Meus Agendamentos" />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            {/* LinkedIn Publisher */}
            <Box>
              <Typography variant="h6" gutterBottom>
                <LinkedIn sx={{ verticalAlign: 'middle', mr: 1 }} />
                LinkedIn
              </Typography>

              {/* Profile Selection */}
              {profileError ? (
                <TextField
                  error
                  fullWidth
                  disabled
                  label="Erro ao carregar perfis do LinkedIn"
                  defaultValue={profileError}
                  sx={{ my: 2 }}
                />
              ) : (
                <FormControl fullWidth sx={{ my: 2 }}>
                  <InputLabel id="linkedin-profile-select-label">Publicar como</InputLabel>
                  <Select
                    labelId="linkedin-profile-select-label"
                    id="linkedin-profile-select"
                    value={selectedProfile || ''}
                    label="Publicar como"
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    disabled={isLoadingProfiles || isPublishingLi}
                  >
                    {isLoadingProfiles && <MenuItem value=""><em><CircularProgress size={20} /> Carregando perfis...</em></MenuItem>}
                    {Array.isArray(linkedinProfiles) && linkedinProfiles.map((profile) => (
                        <MenuItem key={profile.urn} value={profile.urn}>
                          {profile.name}
                        </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Media Selection */}
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Selecionar Mídia
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Regra do LinkedIn: Você pode selecionar várias imagens ou apenas um vídeo por post.
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ height: 400, overflow: 'auto', p: 1 }}>
                    <List>
                      {Array.isArray(unifiedMedia) && unifiedMedia.map((media, index) => (
                        <ListItem
                          key={media.id}
                          button
                          onClick={() => setPreviewedMedia(media)}
                          selected={previewedMedia && previewedMedia.id === media.id}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={media.type === 'image' ? !!selectedImages[index] : !!selectedVideos[index - generatedImagesData.length]}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                if (media.type === 'image') {
                                  // Se uma imagem é selecionada, desmarca qualquer vídeo
                                  if (isChecked) {
                                    setSelectedVideos({});
                                  }
                                  setSelectedImages(prev => ({ ...prev, [index]: isChecked }));
                                } else { // media.type === 'video'
                                  const videoIndex = index - generatedImagesData.length;
                                  // Se um vídeo é selecionado
                                  if (isChecked) {
                                    // Desmarca todas as imagens e outros vídeos
                                    setSelectedImages({});
                                    setSelectedVideos({ [videoIndex]: true });
                                  } else {
                                    // Desmarca o vídeo atual
                                    setSelectedVideos({ [videoIndex]: false });
                                  }
                                }
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText primary={`${media.type === 'image' ? 'Imagem' : 'Vídeo'} ${media.type === 'image' ? index + 1 : index - generatedImagesData.length + 1}`} />
                          {media.type === 'image' ? (
                            <Box component="img" src={media.url} sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }} />
                          ) : (
                            <video src={media.url} muted style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }} />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1 }}>
                    {previewedMedia ? (
                      <>
                        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%' }}>
                          {previewedMedia.type === 'image' ? (
                            <img src={previewedMedia.url} alt="Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                          ) : (
                            <video src={previewedMedia.url} controls style={{ maxHeight: '100%', maxWidth: '100%' }} />
                          )}
                        </Box>
                        <Box sx={{ mt: 1, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Tipo: {previewedMedia.fileType}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            Tamanho: {previewedMedia.fileSize}
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <Typography>Selecione uma mídia para visualizar</Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Scheduling */}
              <FormControlLabel
                control={<Switch checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />}
                label="Agendar publicação"
                sx={{ my: 2, display: 'block' }}
              />

              {isScheduled && (
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    {/* Left Column */}
                    <Grid item xs={12} md={5}>
                      <Grid container direction="column" spacing={3}>
                        <Grid item>
                          <Typography variant="h6" gutterBottom>1. Data de Início da Campanha</Typography>
                          <DatePicker
                              label="Selecione a data inicial"
                              value={scheduleDate}
                              onChange={(newDate) => setScheduleDate(newDate)}
                              renderInput={(params) => <TextField {...params} fullWidth />}
                              minDate={new Date()}
                          />
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Esta é a data do primeiro post. Os posts de follow-up serão agendados nos dias seguintes.
                          </Typography>
                        </Grid>
                        <Grid item>
                          <Typography variant="h6" gutterBottom>3. Prévia do Agendamento</Typography>
                          <Paper sx={{ p: 2, maxHeight: 300, overflowY: 'auto' }}>
                              {Array.isArray(schedulePreview) && schedulePreview.length > 0 ? (
                                  <List dense>
                                      {schedulePreview.map(item => (
                                          <ListItem key={item.key} disablePadding sx={{ mb: 1 }}>
                                              <ListItemText
                                                  primary={`${item.date} (${item.day}) às ${item.time}`}
                                                  secondary={item.title}
                                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                                                  secondaryTypographyProps={{ variant: 'caption' }}
                                              />
                                          </ListItem>
                                      ))}
                                  </List>
                              ) : (
                                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                                      Nenhum post de follow-up para exibir.
                                  </Typography>
                              )}
                          </Paper>
                        </Grid>
                      </Grid>
                    </Grid>
                    {/* Right Column */}
                    <Grid item xs={12} md={7}>
                        <Typography variant="h6" gutterBottom>2. Horários da Semana</Typography>
                        <TimeHeatMap
                            weeklySchedule={weeklySchedule}
                            onScheduleChange={setWeeklySchedule}
                            startHour={8}
                            endHour={23}
                        />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
              )}

              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={handlePublishLinkedIn}
                disabled={isPublishingLi || (isScheduled) || !selectedProfile}
              >
                {isPublishingLi ? 'Publicando...' : 'Publicar Agora no LinkedIn'}
              </Button>

              {isScheduled && (
                <Button variant="outlined" size="large" sx={{ml: 2}} onClick={handleScheduleLinkedIn}>
                    Salvar Agendamento
                </Button>
              )}

              {isPublishingLi && <LinearProgress sx={{ my: 2 }} />}
              {publishingStatusLi && (
                <Alert
                  severity={publishedPostUrlLi ? 'success' : (publishingStatusLi.startsWith('Erro') ? 'error' : 'info')}
                  sx={{ mt: 2 }}
                >
                  {publishingStatusLi}
                  {publishedPostUrlLi && (
                    <MuiLink href={publishedPostUrlLi} target="_blank" rel="noopener" sx={{ display: 'block', mt: 1 }}>
                      Visualizar post no LinkedIn
                    </MuiLink>
                  )}
                </Alert>
              )}
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Box>
              <Typography variant="h6" gutterBottom>
                <Language sx={{ verticalAlign: 'middle', mr: 1 }} />
                WordPress
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Envia o conteúdo para o seu site WordPress como um post em rascunho. A primeira imagem gerada será usada como imagem destacada.
              </Typography>
              <Button
                variant="contained"
                size="large"
                color="secondary"
                onClick={handlePublishWordPress}
                disabled={isPublishingWp || isPublishingLi}
              >
                {isPublishingWp ? 'Publicando...' : 'Publicar no WordPress'}
              </Button>
              {isPublishingWp && <LinearProgress sx={{ my: 2 }} />}
              {publishingStatusWp && (
                <Alert
                  severity={publishedPostUrlWp ? 'success' : (publishingStatusWp.startsWith('Erro') ? 'error' : 'info')}
                  sx={{ mt: 2 }}
                >
                  {publishingStatusWp}
                  {publishedPostUrlWp && (
                    <MuiLink href={publishedPostUrlWp} target="_blank" rel="noopener" sx={{ display: 'block', mt: 1 }}>
                      Visualizar rascunho do post
                    </MuiLink>
                  )}
                </Alert>
              )}
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <Box>
                <Typography variant="h6" gutterBottom>Meus Agendamentos</Typography>
                {!selectedProfile && <Alert severity="warning">Selecione um perfil na aba "LinkedIn" para ver seus agendamentos.</Alert>}
                {isLoadingSchedules && <LinearProgress />}
                {!isLoadingSchedules && mySchedules.length === 0 && selectedProfile && (
                    <Typography sx={{mt: 2, textAlign: 'center'}}>Nenhum agendamento encontrado para este perfil.</Typography>
                )}
                {mySchedules.length > 0 && (
                    <TableContainer component={Paper} sx={{mt: 2}}>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Título</TableCell>
                                    <TableCell align="right">Data Agendada (UTC)</TableCell>
                                    <TableCell align="right">Status</TableCell>
                                    <TableCell align="right">Link</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {mySchedules.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell component="th" scope="row">
                                            {row.content.titulo}
                                        </TableCell>
                                        <TableCell align="right">{new Date(row.scheduledAt).toLocaleString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={row.status}
                                                color={row.status === 'published' ? 'success' : (row.status === 'failed' ? 'error' : 'primary')}
                                                size="small"
                                            />
                                            {row.status === 'failed' && row.error && (
                                                <Tooltip title={row.error}>
                                                    <Info fontSize="small" sx={{verticalAlign: 'middle', ml: 0.5, color: 'error.main'}}/>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {row.status === 'published' && row.postId ? (
                                                <MuiLink href={`https://www.linkedin.com/feed/update/${row.postId}/`} target="_blank" rel="noopener">
                                                    Ver Post
                                                </MuiLink>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
          </TabPanel>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Publisher;
