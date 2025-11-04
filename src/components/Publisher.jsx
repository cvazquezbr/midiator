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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Language, Publish, LinkedIn, Delete, Edit, Visibility, Replay } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker, DateTimePicker } from '@mui/x-date-pickers';
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
} from '@mui/material';
import { Info } from '@mui/icons-material';
import { toast } from 'sonner';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { getTimezone } from '../utils/timezone';
import { publishToWordPress } from '../utils/wordpressAPI';
import { dataURLtoBlob, urlToBlob } from '../utils/imageComposer';
import { markdownToLinkedinText } from '../lib/utils';
import { getLinkedInProfiles, publishToLinkedIn, uploadImagesForLinkedIn, uploadVideoForLinkedIn } from '../utils/linkedinAPI';
import { createSchedule, getSchedulesForUser, deleteSchedule, getSchedule, updateSchedule } from '../utils/scheduleAPI';
import { getCampaigns, deserializeCampaignData } from '../utils/campaignState.js';
import ConfirmationModal from './ui/ConfirmationModal/ConfirmationModal';
import { upload } from '@vercel/blob/client';

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
  settings,
  campaignContent,
  generatedPagesData = [],
  generatedVideos = [],
  followupPosts = [],
  // isScheduled, << Managed internally
  // setIsScheduled, << Managed internally
  // scheduleDate, << Managed internally
  // setScheduleDate, << Managed internally
  // weeklySchedule, << Managed internally
  // setWeeklySchedule, << Managed internally
  // selectedImages, << Managed internally
  // setSelectedImages, << Managed internally
  // selectedVideos, << Managed internally
  // setSelectedVideos, << Managed internally
  onUpdateScheduledPosts,
  currentCampaign,
  pendingAssets,
  setPendingAssets,
}) => {
  // Internal state management for scheduling and media selection
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [weeklySchedule, setWeeklySchedule] = useState(Array(7).fill('12:00'));
  const [selectedImages, setSelectedImages] = useState({});
  const [selectedVideos, setSelectedVideos] = useState({});

  const [tabValue, setTabValue] = React.useState(0);
  const [mySchedules, setMySchedules] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [linkedinProfiles, setLinkedinProfiles] = useState({ personal: null, organizations: [] });
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [publishResults, setPublishResults] = useState([]);
  const [content, setContent] = useState('');
  const [contentSize, setContentSize] = useState('grande');
  const [unifiedMedia, setUnifiedMedia] = useState([]);
  const [previewedMedia, setPreviewedMedia] = useState(null);
  const [schedulePreview, setSchedulePreview] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  const characterLimit = 3000;
  
  const uploadPendingAssets = async (imageUrls) => {
    const urlMap = {};
    const uploadsToProcess = [];

    // Find which of the selected URLs are blob URLs that need uploading.
    for (const url of imageUrls) {
      if (url.startsWith('blob:') && pendingAssets[url]) {
        uploadsToProcess.push({
          url,
          blob: pendingAssets[url],
          filename: `scheduled-post-${Date.now()}`,
        });
      } else {
        // If it's not a blob URL, it's already a permanent URL.
        urlMap[url] = url;
      }
    }

    if (uploadsToProcess.length === 0) {
      return urlMap;
    }

    const toastId = toast.loading(`Fazendo upload de ${uploadsToProcess.length} imagem(ns) para o agendamento...`);

    try {
      const customFetch = (url, options) => fetch(url, { ...options, credentials: 'include' });
      await Promise.all(
        uploadsToProcess.map(async (uploadData) => {
          const newBlob = await upload(uploadData.filename, uploadData.blob, {
            access: 'public',
            handleUploadUrl: '/api/upload-client',
            fetch: customFetch,
          });
          // Map the original blob: URL to the new permanent URL
          urlMap[uploadData.url] = newBlob.url;
        })
      );
      toast.success('Upload de imagens concluído!', { id: toastId });
      return urlMap;
    } catch (error) {
      console.error('Error uploading assets for schedule:', error);
      toast.error(`Falha no upload de imagens: ${error.message}`, { id: toastId });
      // If upload fails, throw the error to stop the scheduling process
      throw new Error('Image upload failed, scheduling aborted.');
    }
  };

  useEffect(() => {
    if (currentCampaign) {
      setSelectedCampaignId(currentCampaign.id);
    }
  }, [currentCampaign]);

  useEffect(() => {
    const fetchCampaigns = async () => {
        try {
            const userCampaigns = await getCampaigns();
            setCampaigns(userCampaigns);
        } catch (error) {
            toast.error(`Failed to load campaigns: ${error.message}`);
        }
    };
    fetchCampaigns();
  }, []);

  const fetchSchedules = React.useCallback(async () => {
    if (tabValue !== 2) return { schedules: [], assets: {} };
    setIsLoadingSchedules(true);
    try {
      const schedules = await getSchedulesForUser();
      const allNewlyCreatedAssets = {};

      const hydrationPromises = schedules.map(async (schedule) => {
        if (schedule.campaign_data) {
          try {
            // deserializeCampaignData now directly returns the assets
            const { finalState, newlyCreatedAssets } = await deserializeCampaignData(schedule.campaign_data);
            if (newlyCreatedAssets) {
              Object.assign(allNewlyCreatedAssets, newlyCreatedAssets);
            }
            return { ...schedule, campaign_data: finalState };
          } catch (e) {
            console.error(`Failed to hydrate schedule ${schedule.id}`, e);
            return schedule;
          }
        }
        return schedule;
      });

      const hydratedSchedules = await Promise.all(hydrationPromises);
      const parsedSchedules = hydratedSchedules.map(s => ({
        ...s,
        post_content: typeof s.post_content === 'string' ? JSON.parse(s.post_content) : s.post_content,
      }));
      parsedSchedules.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return { schedules: parsedSchedules, assets: allNewlyCreatedAssets };
    } catch (error) {
      console.error("Failed to fetch user schedules:", error);
      toast.error(`Failed to fetch schedules: ${error.message}`);
      return { schedules: [], assets: {} };
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [tabValue]);

  const handleViewDetails = async (scheduleId) => {
    try {
      let scheduleDetails = await getSchedule(scheduleId);

      // Hydrate campaign_data if it exists
      if (scheduleDetails.campaign_data) {
        const { finalState, newlyCreatedAssets } = await deserializeCampaignData(scheduleDetails.campaign_data);
        scheduleDetails.campaign_data = finalState;
        if (newlyCreatedAssets && Object.keys(newlyCreatedAssets).length > 0) {
            setPendingAssets(newlyCreatedAssets);
        }
      }

      const parsedSchedule = {
        ...scheduleDetails,
        post_content: typeof scheduleDetails.post_content === 'string' ? JSON.parse(scheduleDetails.post_content) : scheduleDetails.post_content,
      };
      setViewingSchedule(parsedSchedule);
    } catch (error) {
      toast.error(`Failed to get schedule details: ${error.message}`);
    }
  };

  const handleOpenEditModal = (schedule) => {
    setEditingSchedule({ ...schedule, newScheduledAt: new Date(schedule.scheduledAt) });
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;
    setIsUpdating(true);
    try {
      const userTimezone = getTimezone() || 'UTC';
      const utcDate = fromZonedTime(editingSchedule.newScheduledAt, userTimezone);
      await updateSchedule(editingSchedule.id, utcDate.toISOString());
      toast.success("Schedule updated successfully!");
      setEditingSchedule(null);
      fetchSchedules();
    } catch (error) {
      toast.error(`Failed to update schedule: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSchedule = (scheduleId) => {
    setScheduleToDelete(scheduleId);
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    try {
      await deleteSchedule(scheduleToDelete);
      setMySchedules(prevSchedules => prevSchedules.filter(s => s.id !== scheduleToDelete));
      toast.success("Agendamento excluído com sucesso!");
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error(`Falha ao excluir agendamento: ${error.message}`);
    } finally {
      setScheduleToDelete(null);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (tabValue === 2) {
      fetchSchedules().then(({ schedules, assets }) => {
        setMySchedules(schedules);
        if (assets && Object.keys(assets).length > 0) {
          setPendingAssets(prevAssets => ({ ...prevAssets, ...assets }));
        }
      });
    }
  }, [tabValue, fetchSchedules, setPendingAssets]);

  const [isPublishingWp, setIsPublishingWp] = useState(false);
  const [publishingStatusWp, setPublishingStatusWp] = useState('');
  const [publishedPostUrlWp, setPublishedPostUrlWp] = useState(null);

  const [isPublishingLi, setIsPublishingLi] = useState(false);
  const [publishingStatusLi, setPublishingStatusLi] = useState('');
  const [publishedPostUrlLi, setPublishedPostUrlLi] = useState(null);

  const handleVideoError = (e) => {
    const error = e.target.error;
    let errorMessage = 'Ocorreu um erro desconhecido no player de vídeo.';
    if (error) {
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
                errorMessage = 'A pré-visualização do vídeo foi abortada.';
                break;
            case error.MEDIA_ERR_NETWORK:
                errorMessage = 'Ocorreu um erro de rede ao carregar a pré-visualização do vídeo.';
                break;
            case error.MEDIA_ERR_DECODE:
                errorMessage = 'Ocorreu um erro ao decodificar o vídeo para a pré-visualização. O arquivo pode estar corrompido.';
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'O formato do vídeo não é suportado para pré-visualização neste navegador.';
                break;
            default:
                errorMessage = `Erro na pré-visualização do vídeo: ${error.message} (Código: ${error.code})`;
                break;
        }
    }
    console.error('Video Preview Error:', errorMessage, e);
    toast.error(errorMessage);
  };

    useEffect(() => {
        if (campaignContent) {
            let sourceContent = '';
            switch (contentSize) {
                case 'pequeno':
                    sourceContent = campaignContent.conteudoPequeno || '';
                    break;
                case 'medio':
                    sourceContent = campaignContent.conteudoMedio || '';
                    break;
                case 'grande':
                default:
                    sourceContent = campaignContent.conteudo || '';
                    break;
            }

            let postText = [
                campaignContent.titulo?.toUpperCase(),
                '',
                markdownToLinkedinText(sourceContent),
                '',
                '----',
                campaignContent.cta,
                '----',
                (campaignContent.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
            ].join('\n');

            // A remoção de nova linha foi desativada para permitir posts formatados.
            // A lógica de limite de caracteres agora cuida das restrições da API.
            // postText = postText.replace(/(\r\n|\n|\r)/gm, ' ').trim();

            // Trunca o conteúdo final com base no limite dinâmico
            if (postText.length > characterLimit) {
                // Encontra o último espaço antes do limite para não cortar palavras ao meio
                const lastSpace = postText.substring(0, characterLimit).lastIndexOf(' ');
                const cutoff = lastSpace > 0 ? lastSpace : characterLimit;
                postText = postText.substring(0, cutoff) + '...';
            }

            setContent(postText);
        }
    }, [campaignContent, contentSize, characterLimit]);

  const getPublishingTargets = () => {
    const targets = [];
    const addedIds = new Set();
    if (linkedinProfiles.personal) {
        const personalTarget = {
            id: linkedinProfiles.personal.id,
            name: `${linkedinProfiles.personal.name} (Perfil Pessoal)`,
            type: 'person'
        };
        targets.push(personalTarget);
        addedIds.add(personalTarget.id);
    }

    if (linkedinProfiles.organizations && linkedinProfiles.organizations.length > 0) {
        linkedinProfiles.organizations.forEach(org => {
            if (!addedIds.has(org.id)) {
                targets.push({
                    id: org.id,
                    name: `${org.name} (Página)`,
                    type: 'organization'
                });
                addedIds.add(org.id);
            }
        });
    }
    return targets;
  };

  const handleRefreshProfiles = async () => {
    if (!settings?.linkedin) {
        toast.error("Configuração do LinkedIn não encontrada. Verifique as configurações.");
        return;
    }
    setIsLoadingProfiles(true);
    setProfileError('');
    const toastId = toast.loading("Buscando perfis do LinkedIn...");
    try {
        const profiles = await getLinkedInProfiles(settings.linkedin, true); // force a refresh
        setLinkedinProfiles({
            personal: profiles.personal,
            organizations: profiles.organizations || []
        });
        if (!profiles.personal && (!profiles.organizations || profiles.organizations.length === 0)) {
             toast.info("Nenhum perfil pessoal ou de organização encontrado.", { id: toastId });
        } else {
             toast.success("Perfis do LinkedIn atualizados.", { id: toastId });
        }
        if (!selectedTarget && profiles.personal) {
            setSelectedTarget({
                id: profiles.personal.id,
                name: `${profiles.personal.name} (Perfil Pessoal)`,
                type: 'person'
            });
        }
    } catch (error) {
        console.error("Erro ao buscar perfis do LinkedIn:", error);
        const errorMessage = error.message || "Ocorreu um erro desconhecido.";
        setProfileError(errorMessage);
        toast.error(`Falha ao buscar perfis: ${errorMessage}`, { id: toastId });
        setLinkedinProfiles({ personal: null, organizations: [] });
    } finally {
        setIsLoadingProfiles(false);
    }
  };

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
    const preview = (followupPosts || []).filter(Boolean).map((post, index) => {
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
    console.log('generatedPagesData in Publisher:', generatedPagesData);
    const images = (generatedPagesData || []).map((img, index) => ({ ...img, type: 'image', mediaId: `image-${index}`, fileSize: img.blob ? formatBytes(img.blob.size) : 'N/A', fileType: img.blob ? img.blob.type : 'N/A' }));
    const videos = (generatedVideos || []).map((vid, index) => ({ ...vid, type: 'video', mediaId: `video-${index}`, fileSize: vid.blob ? formatBytes(vid.blob.size) : 'N/A', fileType: vid.blob ? vid.blob.type : 'N/A' }));
    const allMedia = [...images, ...videos];
    setUnifiedMedia(allMedia);
    if (allMedia.length > 0) {
      setPreviewedMedia(allMedia[0]);
    } else {
      setPreviewedMedia(null);
    }
  }, [generatedPagesData, generatedVideos]);

  useEffect(() => {
    if (!generatedPagesData || generatedPagesData.length === 0) {
      setSelectedImages({});
    }
  }, [generatedPagesData]);

  useEffect(() => {
    if (!generatedVideos || generatedVideos.length === 0) {
      setSelectedVideos({});
    }
  }, [generatedVideos]);

  const handlePublishWordPress = async () => {
    setIsPublishingWp(true);
    setPublishingStatusWp('Iniciando publicação...');
    setPublishedPostUrlWp(null);
    try {
      if (!settings.wordpress || !settings.wordpress.wordpressUrl || !settings.wordpress.username || !settings.wordpress.password || !settings.wordpress.tagsUrl || !settings.wordpress.mediaUrl || !settings.wordpress.postsUrl) {
        throw new Error('Configuração do WordPress não encontrada ou incompleta. Por favor, configure-a primeiro.');
      }
      if (!campaignContent || !campaignContent.conteudoFormatado || !generatedPagesData || generatedPagesData.length === 0) {
        throw new Error('Dados da campanha ou páginas não estão disponíveis.');
      }

      let firstImage = { ...generatedPagesData[0] }; // Make a copy to avoid state mutation

      // If blob is missing, try to get it.
      if (!firstImage.blob && firstImage.url) {
        setPublishingStatusWp('Preparando imagem para upload...');
        toast.info("Preparando imagem para upload...");
        if (firstImage.url.startsWith('data:')) {
            firstImage.blob = dataURLtoBlob(firstImage.url);
        } else {
            try {
              firstImage.blob = await urlToBlob(firstImage.url);
            } catch (e) {
              throw new Error(`Falha ao baixar a imagem da URL: ${firstImage.url}. ${e.message}`);
            }
        }
      }

      if (!firstImage || !firstImage.blob) {
        throw new Error('A primeira página gerada não contém uma imagem (blob) válida ou não pôde ser baixada.');
      }

      const campaignData = {
        campaignContent,
        conteudoFormatado: campaignContent.conteudoFormatado,
        imageBlob: firstImage.blob,
      };
      setPublishingStatusWp('Publicando no WordPress... Isso pode levar um momento.');
      const post = await publishToWordPress(campaignData, settings.wordpress);
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
    setPublishingStatusLi('Agendando post principal...');
    try {
      if (!selectedTarget) {
        throw new Error("Selecione um perfil do LinkedIn para agendar.");
      }
      const getScheduledTime = (date) => {
        const dayIndex = date.getDay();
        return weeklySchedule[dayIndex] || '12:00';
      };
      const userTimezone = getTimezone() || 'UTC';
      const mainPostDate = new Date(scheduleDate);
      const [mainHours, mainMinutes] = getScheduledTime(mainPostDate).split(':');
      mainPostDate.setHours(parseInt(mainHours, 10), parseInt(mainMinutes, 10), 0, 0);
      const mainPostUtcDate = fromZonedTime(mainPostDate, userTimezone);
      const selectedImageIndexes = Object.keys(selectedImages).filter(index => selectedImages[index]);
      const blobImageUrls = selectedImageIndexes.map(index => unifiedMedia[parseInt(index)].url);

      // Upload images with blob URLs and get their permanent URLs
      const urlMap = await uploadPendingAssets(blobImageUrls);
      const permanentImageUrls = blobImageUrls.map(url => urlMap[url] || url);

      const mainPostPayload = {
        campaign_id: selectedCampaignId || null,
        scheduled_at: mainPostUtcDate.toISOString(),
        authorUrn: `urn:li:${selectedTarget.type}:${selectedTarget.id}`,
        content: {
            // Salva o texto final, já formatado, para garantir consistência.
            fullText: content,
            // Mantém as imagens associadas.
            images: permanentImageUrls,
            // Mantém o título para exibição na lista de agendamentos.
            titulo: campaignContent?.titulo || 'Post Agendado',
        },
      };
      const mainPostSchedule = await createSchedule(mainPostPayload);
      setPublishingStatusLi('Post principal agendado. Agendando follow-ups...');

      if (followupPosts && followupPosts.length > 0) {
        // Defensive check against AI duplicating the main post as the first follow-up.
        const mainPostContent = (campaignContent?.conteudo || '').trim();
        const firstFollowupContent = (followupPosts[0]?.conteudo || '').trim();
        const postsToSchedule = mainPostContent === firstFollowupContent ? followupPosts.slice(1) : followupPosts;

        if (postsToSchedule.length < followupPosts.length) {
          toast.info("Primeiro post de follow-up era um duplicado e foi ignorado.");
        }

        for (const post of postsToSchedule) {
          // Find the original index to maintain correct date progression
          const originalIndex = followupPosts.findIndex(p => p === post);
          const followupDate = new Date(scheduleDate);
          followupDate.setDate(scheduleDate.getDate() + originalIndex + 1);
          const [fHours, fMinutes] = getScheduledTime(followupDate).split(':');
          followupDate.setHours(parseInt(fHours, 10), parseInt(fMinutes, 10), 0, 0);
          const followupUtcDate = fromZonedTime(followupDate, userTimezone);
          const followupPayload = {
            campaign_id: selectedCampaignId || null,
            parent_id: mainPostSchedule.id,
            scheduled_at: followupUtcDate.toISOString(),
            authorUrn: `urn:li:${selectedTarget.type}:${selectedTarget.id}`,
            content: {
              titulo: post.titulo || '',
              conteudo: post.conteudo || '',
              cta: post.cta || '',
              hashtags: post.hashtags_sugeridas || [],
              images: permanentImageUrls, // Attach same images to follow-ups
            },
          };
          await createSchedule(followupPayload);
        }
      }
      toast.success('Todos os posts foram agendados com sucesso!');
      setPublishingStatusLi('Agendamento concluído!');
      fetchSchedules();
      setTabValue(2);
    } catch (error) {
      console.error('Erro ao agendar no LinkedIn:', error);
      setPublishingStatusLi(`Erro no agendamento: ${error.message}`);
      toast.error(`Erro no agendamento: ${error.message}`);
    } finally {
      setIsPublishingLi(false);
    }
  };

  const handlePublishLinkedIn = async () => {
    if (isScheduled) {
      handleScheduleLinkedIn();
      return;
    }
    if (!content.trim() || !selectedTarget) {
      toast.error('Conteúdo e alvo de publicação são obrigatórios');
      return;
    }

    setIsPublishingLi(true);
    setPublishingStatusLi('Iniciando publicação...');
    setPublishedPostUrlLi(null);

    try {
        const authorUrn = `urn:li:${selectedTarget.type === 'organization' ? 'organization' : 'person'}:${selectedTarget.id}`;
        let videoUrn = null;
        let imageUrns = [];

        const selectedVideoIndexes = Object.keys(selectedVideos).filter(index => selectedVideos[index]);
        const selectedImageIndexes = Object.keys(selectedImages).filter(index => selectedImages[index]);

        if (selectedVideoIndexes.length > 0) {
            const videoIndex = parseInt(selectedVideoIndexes[0]);
            const videoData = generatedVideos[videoIndex];
            let videoBlob = videoData.blob;

            // If blob is not directly on the object, try to find it in the pendingAssets map.
            if (!videoBlob && videoData.url && pendingAssets) {
              videoBlob = pendingAssets[videoData.url];
            }

            if (!videoBlob) {
                throw new Error("Os dados do vídeo selecionado (blob) não foram encontrados. Tente gerar o vídeo novamente.");
            }
            if (videoBlob.size > 200 * 1024 * 1024) { // 200 MB limit
                throw new Error(`O vídeo é muito grande (${formatBytes(videoBlob.size)}). O limite do LinkedIn é 200MB.`);
            }

            videoUrn = await uploadVideoForLinkedIn(settings?.linkedin, videoBlob, authorUrn, setPublishingStatusLi);
        } else if (selectedImageIndexes.length > 0) {
            setPublishingStatusLi('Preparando imagens para upload...');
            const toastId = toast.loading("Preparando imagens para o upload...");

            const imageBlobsToUpload = await Promise.all(
              selectedImageIndexes.map(async (index, i) => {
                const media = unifiedMedia[parseInt(index)];

                // Corrected logic:
                // 1. Check if the URL corresponds to a pending asset (a local blob).
                if (media.url && pendingAssets[media.url]) {
                  return pendingAssets[media.url];
                }

                // 2. If not, it's a permanent URL that needs to be downloaded.
                toast.info(`Baixando imagem ${i + 1}/${selectedImageIndexes.length}...`);
                try {
                  const blob = await urlToBlob(media.url);
                  return blob;
                } catch (e) {
                  toast.error(`Falha ao baixar a imagem ${i + 1}.`);
                  console.error(`Failed to fetch blob for ${media.url}`, e);
                  return null;
                }
              })
            );
            toast.dismiss(toastId);

            if (imageBlobsToUpload.some(blob => !blob)) {
                throw new Error("Falha ao baixar uma ou mais imagens. Verifique o console e tente novamente.");
            }

            // JULES - DEBUG LOG
            console.log('--- JULES DEBUG ---');
            console.log('Selected Image Indexes:', selectedImageIndexes);
            console.log('Number of blobs to upload:', imageBlobsToUpload.length);
            imageBlobsToUpload.forEach((blob, i) => {
                if (blob) {
                    console.log(`Blob ${i}: size=${blob.size}, type=${blob.type}`);
                } else {
                    console.log(`Blob ${i}: null`);
                }
            });
            console.log('-------------------');


            imageUrns = await uploadImagesForLinkedIn(settings?.linkedin, imageBlobsToUpload, authorUrn, setPublishingStatusLi);
        }

        setPublishingStatusLi('Criando a publicação...');
        const campaignData = {
            content: content.trim(),
            targetId: selectedTarget.id,
            targetType: selectedTarget.type,
            images: imageUrns,
            video: videoUrn,
        };

        const result = await publishToLinkedIn(campaignData, settings?.linkedin);
      const postLink = result.id ? `https://www.linkedin.com/feed/update/${result.id}/` : null;

      setPublishingStatusLi('Publicado com sucesso!');
      if(postLink) {
        setPublishedPostUrlLi(postLink);

        // Save the successful publication to the schedule table for monitoring
        try {
            const publicationPayload = {
                campaign_id: selectedCampaignId || null,
                scheduled_at: new Date().toISOString(), // Immediate publication
                authorUrn: `urn:li:${selectedTarget.type}:${selectedTarget.id}`,
                content: {
                    titulo: campaignContent?.titulo || 'Publicação Avulsa',
                    conteudo: content, // Use the final content from the text field
                    cta: campaignContent?.cta || '',
                    hashtags: campaignContent?.hashtags || [],
                },
                linkedin_post_url: postLink,
                status: 'published'
            };
            await createSchedule(publicationPayload);
            toast.success("Publicação registrada para monitoramento.");
            fetchSchedules(); // Refresh the schedules list
        } catch (scheduleError) {
            console.error("Failed to save publication to schedule:", scheduleError);
            toast.error(`Falha ao registrar publicação para monitoramento: ${scheduleError.message}`);
        }
      }

      setPublishResults(prev => [{
        id: Date.now(),
        target: selectedTarget.name,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        success: true,
        timestamp: new Date().toLocaleString('pt-BR'),
        link: postLink
      }, ...prev]);

    } catch (error) {
      console.error('Erro na publicação:', error);
      const errorMessage = error.message || 'Ocorreu um erro desconhecido.';
      setPublishingStatusLi(`Erro ao publicar: ${errorMessage}`);
      toast.error(`Erro ao publicar: ${errorMessage}`);
      setPublishResults(prev => [{
        id: Date.now(),
        target: selectedTarget.name,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        success: false,
        error: errorMessage,
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);
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
            <Box>
              <Typography variant="h6" gutterBottom>
                <LinkedIn sx={{ verticalAlign: 'middle', mr: 1 }} />
                LinkedIn
              </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl fullWidth sx={{ my: 2 }}>
                        <InputLabel id="linkedin-profile-select-label">Publicar como</InputLabel>
                        <Select
                            labelId="linkedin-profile-select-label"
                            id="linkedin-profile-select"
                            value={selectedTarget ? JSON.stringify(selectedTarget) : ''}
                            label="Publicar como"
                            onChange={(e) => { if(e.target.value) { setSelectedTarget(JSON.parse(e.target.value)); } }}
                            disabled={isLoadingProfiles || isPublishingLi}
                        >
                            {isLoadingProfiles && <MenuItem value=""><em><CircularProgress size={20} /> Carregando perfis...</em></MenuItem>}
                            {getPublishingTargets().map((target) => (
                                <MenuItem key={target.id} value={JSON.stringify(target)}>
                                    {target.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Tooltip title="Atualizar perfis do LinkedIn">
                        <span>
                            <IconButton onClick={handleRefreshProfiles} disabled={isLoadingProfiles}>
                                <Replay />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
                {profileError && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {profileError}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <ToggleButtonGroup
                    color="primary"
                    value={contentSize}
                    exclusive
                    onChange={(e, newSize) => {
                      if (newSize) setContentSize(newSize);
                    }}
                    aria-label="Tamanho do conteúdo"
                  >
                    <ToggleButton value="pequeno">Pequeno</ToggleButton>
                    <ToggleButton value="medio">Médio</ToggleButton>
                    <ToggleButton value="grande">Grande</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <TextField
                    label="Conteúdo da Publicação"
                    multiline
                    rows={6}
                    fullWidth
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    variant="outlined"
                    sx={{ my: 2 }}
                    placeholder="O que você gostaria de compartilhar?"
                    inputProps={{ maxLength: characterLimit }}
                    error={content.length > characterLimit}
                    helperText={content.length > characterLimit ? `Conteúdo excede o limite de ${characterLimit} caracteres.` : ''}
                />
                <Typography
                    variant="caption"
                    sx={{
                        textAlign: 'right',
                        display: 'block',
                        color: content.length > characterLimit ? 'error.main' : 'text.secondary'
                    }}
                >
                    {content.length} / {characterLimit}
                </Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Selecionar Mídia
              </Typography>
              <Alert severity="info" sx={{ mb: 1 }}>
                <strong>Regra do LinkedIn:</strong> Você pode selecionar <strong>várias imagens OU apenas um vídeo</strong> por post. Não é possível misturar os dois tipos de mídia.
              </Alert>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ height: 400, overflow: 'auto', p: 1 }}>
                    <List>
                      {Array.isArray(unifiedMedia) && unifiedMedia.map((media, index) => (
                        <ListItem
                          key={media.mediaId}
                          button
                          onClick={() => setPreviewedMedia(media)}
                          selected={previewedMedia && previewedMedia.mediaId === media.mediaId}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={media.type === 'image' ? !!selectedImages[index] : !!selectedVideos[index - generatedPagesData.length]}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                if (media.type === 'image') {
                                  setSelectedImages(prev => ({ ...prev, [index]: isChecked }));
                                } else {
                                  const videoIndex = index - generatedPagesData.length;
                                  if (isChecked) {
                                    setSelectedVideos({ [videoIndex]: true });
                                  } else {
                                    setSelectedVideos({ [videoIndex]: false });
                                  }
                                }
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText primary={`${media.type === 'image' ? 'Imagem' : 'Vídeo'} ${media.type === 'image' ? index + 1 : index - generatedPagesData.length + 1}`} />
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
                            <video
                              src={previewedMedia.url}
                              controls
                              style={{ maxHeight: '100%', maxWidth: '100%' }}
                              onError={handleVideoError}
                              onStalled={handleVideoError}
                              onSuspend={handleVideoError}
                            />
                          )}
                        </Box>
                      </>
                    ) : (
                      <Typography>Selecione uma mídia para visualizar</Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
              <FormControl fullWidth sx={{ my: 2 }}>
                  <InputLabel id="campaign-select-label">Associar Campanha (Opcional)</InputLabel>
                  <Select
                      labelId="campaign-select-label"
                      value={selectedCampaignId}
                      label="Associar Campanha (Opcional)"
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                  >
                      <MenuItem value="">
                          <em>Nenhuma</em>
                      </MenuItem>
                      {campaigns.map((campaign) => (
                          <MenuItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                          </MenuItem>
                      ))}
                  </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />}
                label="Agendar publicação"
                sx={{ my: 2, display: 'block' }}
              />
              {isScheduled && (
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <Grid container spacing={3} sx={{ mt: 1 }}>
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
                disabled={isPublishingLi || (isScheduled) || !selectedTarget || !content.trim() || content.length > characterLimit}
              >
                {isPublishingLi ? 'Publicando...' : 'Publicar Agora no LinkedIn'}
              </Button>
              {isScheduled && (
                <Button variant="outlined" size="large" sx={{ml: 2}} onClick={handleScheduleLinkedIn} disabled={isPublishingLi}>
                    {isPublishingLi ? 'Agendando...' : 'Salvar Agendamento'}
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
            {publishResults.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>Histórico de Publicações Recentes</Typography>
                    <Paper sx={{ maxHeight: 300, overflow: 'auto', p: 1 }}>
                        <List>
                            {publishResults.map(result => (
                                <ListItem
                                    key={result.id}
                                    sx={{
                                        borderLeft: 5,
                                        borderColor: result.success ? 'success.main' : 'error.main',
                                        mb: 1,
                                        bgcolor: result.success ? 'success.light' : 'error.light'
                                    }}
                                >
                                    <ListItemText
                                        primary={`[${result.timestamp}] Publicado em: ${result.target}`}
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.primary">
                                                    "{result.content}"
                                                </Typography>
                                                {result.error && <Typography variant="caption" color="error">Erro: {result.error}</Typography>}
                                                {result.link && <MuiLink href={result.link} target="_blank" rel="noopener">Ver no LinkedIn</MuiLink>}
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Box>
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
                disabled={isPublishingWp || isPublishingLi || generatedPagesData.length === 0}
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
                {!selectedTarget && <Alert severity="warning">Selecione um perfil na aba "LinkedIn" para ver seus agendamentos.</Alert>}
                {isLoadingSchedules && <LinearProgress />}
                {!isLoadingSchedules && mySchedules.length === 0 && selectedTarget && (
                    <Typography sx={{mt: 2, textAlign: 'center'}}>Nenhum agendamento encontrado para este perfil.</Typography>
                )}
                {mySchedules.length > 0 && (
                    <TableContainer component={Paper} sx={{mt: 2}}>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Imagem</TableCell>
                                    <TableCell>Título</TableCell>
                                    <TableCell align="right">Data Agendada</TableCell>
                                    <TableCell align="right">Status</TableCell>
                                    <TableCell align="right">Link</TableCell>
                                    <TableCell align="right">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {mySchedules.filter(row => row.post_content).map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            {row.campaign_data?.pageTemplate?.images?.[0]?.url && (
                                                <img src={row.campaign_data?.pageTemplate?.images[0]?.url} alt="Campaign" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                                            )}
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            {row.post_content.titulo}
                                            {row.parent_id && row.parent_post_url && (
                                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                    Follow-up de: <MuiLink href={row.parent_post_url} target="_blank" rel="noopener">Post Principal</MuiLink>
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {formatInTimeZone(new Date(row.scheduled_at), getTimezone() || 'UTC', 'dd/MM/yyyy HH:mm:ss zzz', { locale: ptBR })}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={row.status}
                                                color={row.status === 'published' ? 'success' : (row.status === 'failed' ? 'error' : 'primary')}
                                                size="small"
                                            />
                                            {row.status === 'failed' && row.error_message && (
                                                <Tooltip title={row.error_message}>
                                                    <Info fontSize="small" sx={{verticalAlign: 'middle', ml: 0.5, color: 'error.main'}}/>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {row.status === 'published' && row.linkedin_post_url ? (
                                                <MuiLink href={row.linkedin_post_url} target="_blank" rel="noopener">
                                                    Ver Post
                                                </MuiLink>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="View Details">
                                                <IconButton onClick={() => handleViewDetails(row.id)} size="small">
                                                    <Visibility />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={row.status === 'failed' ? 'Retry' : 'Edit Schedule'}>
                                                <IconButton onClick={() => handleOpenEditModal(row)} size="small">
                                                    {row.status === 'failed' ? <Replay /> : <Edit />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Schedule">
                                                <IconButton onClick={() => handleDeleteSchedule(row.id)} size="small">
                                                    <Delete />
                                                </IconButton>
                                            </Tooltip>
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
      <Dialog open={!!viewingSchedule} onClose={() => setViewingSchedule(null)} fullWidth maxWidth="md">
        <DialogTitle>Schedule Details</DialogTitle>
        <DialogContent>
            {viewingSchedule ? (
                <Box>
                    <Typography variant="h6" gutterBottom>{viewingSchedule.post_content.titulo}</Typography>

                    {viewingSchedule.post_content.fullText ? (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', my: 2 }}>
                            {viewingSchedule.post_content.fullText}
                        </Typography>
                    ) : (
                        <>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', my: 2 }}>{viewingSchedule.post_content.conteudo}</Typography>
                            <Typography variant="body2" color="text.secondary"><strong>CTA:</strong> {viewingSchedule.post_content.cta}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                <strong>Hashtags:</strong> {(viewingSchedule.post_content.hashtags || []).join(' ')}
                            </Typography>
                        </>
                    )}

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2"><strong>Scheduled for:</strong> {formatInTimeZone(new Date(viewingSchedule.scheduled_at), getTimezone() || 'UTC', 'dd/MM/yyyy HH:mm:ss zzz', { locale: ptBR })}</Typography>
                    <Typography variant="body2"><strong>Status:</strong> {viewingSchedule.status}</Typography>
                    {viewingSchedule.error_message && <Typography variant="body2" color="error"><strong>Error:</strong> {viewingSchedule.error_message}</Typography>}
                </Box>
            ) : <CircularProgress />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingSchedule(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editingSchedule} onClose={() => setEditingSchedule(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Schedule Time</DialogTitle>
        <DialogContent>
            {editingSchedule && (
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                    <Box sx={{mt: 2}}>
                        <DateTimePicker
                            label="New Schedule Time"
                            value={editingSchedule.newScheduledAt}
                            onChange={(newValue) => setEditingSchedule(prev => ({ ...prev, newScheduledAt: newValue }))}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                            minDateTime={new Date()}
                        />
                    </Box>
                </LocalizationProvider>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingSchedule(null)}>Cancel</Button>
          <Button onClick={handleUpdateSchedule} disabled={isUpdating}>
            {isUpdating ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmationModal
        aberto={!!scheduleToDelete}
        onFechar={() => setScheduleToDelete(null)}
        onConfirmar={confirmDeleteSchedule}
        titulo="Confirmar Exclusão de Agendamento"
        mensagem="Tem certeza de que deseja excluir este agendamento? Esta ação não pode ser desfeita e não removerá a publicação da rede social, caso já tenha sido publicada."
      />
    </Card>
  );
};

export default Publisher;
