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
} from '@mui/material';
import { Language, Publish, LinkedIn } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { ptBR } from 'date-fns/locale';
import { publishToWordPress } from '../utils/wordpressAPI';
import { publishToLinkedIn, getLinkedInProfiles } from '../utils/linkedinAPI';

const Publisher = ({ campaignContent, conteudoFormatado, generatedImagesData }) => {
  // State for WordPress
  const [isPublishingWp, setIsPublishingWp] = useState(false);
  const [publishingStatusWp, setPublishingStatusWp] = useState('');
  const [publishedPostUrlWp, setPublishedPostUrlWp] = useState(null);

  // State for LinkedIn
  const [isPublishingLi, setIsPublishingLi] = useState(false);
  const [publishingStatusLi, setPublishingStatusLi] = useState('');
  const [publishedPostUrlLi, setPublishedPostUrlLi] = useState(null);

  // New states for LinkedIn Publisher enhancements
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date(new Date().getTime() + 60 * 60 * 1000)); // Default to 1 hour from now
  const [selectedImages, setSelectedImages] = useState({}); // e.g. { 0: true, 1: false }
  const [linkedinProfiles, setLinkedinProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Fetch LinkedIn profiles on component mount
  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoadingProfiles(true);
      setProfileError('');
      try {
        const profiles = await getLinkedInProfiles();
        setLinkedinProfiles(profiles);
        if (profiles.length > 0) {
          setSelectedProfile(profiles[0].urn); // Default to the first profile
        }
      } catch (error) {
        console.error("Erro ao buscar perfis do LinkedIn:", error);
        setProfileError(error.message);
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  // Set default image selection when images are generated
  useEffect(() => {
    if (generatedImagesData && generatedImagesData.length > 0) {
      setSelectedImages({ 0: true }); // Select the first image by default
    } else {
      setSelectedImages({});
    }
  }, [generatedImagesData]);


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

  const handleScheduleLinkedIn = () => {
    setPublishingStatusLi(`Publicação agendada para ${scheduleDate.toLocaleString('pt-BR')}. O envio automático ainda não está implementado.`);
    console.log('Salvando agendamento:', {
      profile: selectedProfile,
      images: selectedImages,
      date: scheduleDate,
      content: campaignContent,
    });
    // Here you would typically save this information to a backend or localStorage.
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

      const campaignData = {
        campaignContent,
        authorUrn: selectedProfile,
        imageBlobs,
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
        <Grid container spacing={4}>
          {/* WordPress Publisher */}
          <Grid item xs={12} md={6}>
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
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* LinkedIn Publisher */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="h6" gutterBottom>
                <LinkedIn sx={{ verticalAlign: 'middle', mr: 1 }} />
                LinkedIn
              </Typography>

              {/* Profile Selection */}
              <FormControl fullWidth sx={{ my: 2 }}>
                <InputLabel id="linkedin-profile-select-label">Publicar como</InputLabel>
                <Select
                  labelId="linkedin-profile-select-label"
                  id="linkedin-profile-select"
                  value={selectedProfile}
                  label="Publicar como"
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  disabled={isLoadingProfiles || isPublishingLi}
                >
                  {isLoadingProfiles && <MenuItem value=""><em><CircularProgress size={20} /> Carregando perfis...</em></MenuItem>}
                  {profileError && <MenuItem value="" disabled><em>Erro: {profileError}</em></MenuItem>}
                  {linkedinProfiles.map((profile) => (
                    <MenuItem key={profile.urn} value={profile.urn}>
                      {profile.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Image Selection */}
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Selecionar Imagens
              </Typography>
              <FormGroup row sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {generatedImagesData && generatedImagesData.map((img, index) => (
                  <FormControlLabel
                    key={index}
                    control={
                      <Checkbox
                        checked={!!selectedImages[index]}
                        onChange={(e) => setSelectedImages({ ...selectedImages, [index]: e.target.checked })}
                        name={`img-${index}`}
                      />
                    }
                    label={
                      <Box component="img" src={img.url} alt={`Generated ${index + 1}`} sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }} />
                    }
                  />
                ))}
              </FormGroup>

              {/* Scheduling */}
              <FormControlLabel
                control={<Switch checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />}
                label="Agendar publicação"
                sx={{ my: 2, display: 'block' }}
              />

              {isScheduled && (
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DateTimePicker
                    label="Data e Hora do Agendamento"
                    value={scheduleDate}
                    onChange={(newValue) => setScheduleDate(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDateTime={new Date()}
                  />
                </LocalizationProvider>
              )}

              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={handlePublishLinkedIn}
                disabled={isPublishingLi || isPublishingWp || (isScheduled) || !selectedProfile}
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
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default Publisher;
