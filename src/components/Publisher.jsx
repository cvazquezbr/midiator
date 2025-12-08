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
  Collapse,
} from '@mui/material';
import { Language, Publish, LinkedIn, Delete, Edit, Visibility, Replay, ExpandLess, ExpandMore } from '@mui/icons-material';
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
import { markdownToLinkedinText, escapeLinkedinText } from '../lib/utils';
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
  onAssetUploaded,
}) => {
  // Internal state management for scheduling and media selection
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [weeklySchedule, setWeeklySchedule] = useState(Array(7).fill('12:00'));
  const [selectedImages, setSelectedImages] = useState({});
  const [selectedVideos, setSelectedVideos] = useState({});

  const [tabValue, setTabValue] = React.useState(0);
  const [groupedSchedules, setGroupedSchedules] = useState({});
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openItems, setOpenItems] = useState({});

  const handleItemClick = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };
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

  const groupSchedules = (schedules, profiles) => {
    const mainPosts = schedules.filter(s => !s.parent_id);
    const followUpPosts = schedules.filter(s => s.parent_id);

    for (const post of mainPosts) {
        post.followUps = followUpPosts
            .filter(fp => fp.parent_id === post.id)
            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    }

    const groupedByAuthor = mainPosts.reduce((acc, post) => {
        const authorUrn = post.post_content.authorUrn;
        if (!acc[authorUrn]) {
            const profile = profiles.find(p => `urn:li:${p.type}:${p.id}` === authorUrn);
            acc[authorUrn] = {
                profileName: profile ? profile.name : 'Unknown Profile',
                posts: []
            };
        }
        acc[authorUrn].posts.push(post);
        return acc;
    }, {});

    return groupedByAuthor;
  };
  
  const uploadPendingAssets = async (imageUrls) => {
    const urlMap = {};
    const uploadsToProcess = [];

    // Find which of the selected URLs are blob URLs that need uploading.
    for (const [index, url] of imageUrls.entries()) {
      if (url.startsWith('blob:') && pendingAssets[url]) {
        const blob = pendingAssets[url];
        const fileExtension = blob.type.split('/')[1] || 'bin';
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const campaignId = currentCampaign?.id;

        // A campaign ID is essential for the standardized path.
        if (!campaignId) {
          toast.error("Para agendar um post com novas imagens, primeiro salve a campanha.");
          throw new Error("ID da Campanha não encontrado. Salve a campanha antes de agendar.");
        }

        const filename = `${campaignId}/asset_${Date.now()}_${randomSuffix}.${fileExtension}`;

        uploadsToProcess.push({
          url,
          blob,
          filename, // Standardized filename
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

          // Notify the parent component of the successful upload
          if (onAssetUploaded) {
            onAssetUploaded(uploadData.url, newBlob.url);
          }
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
      // Re-fetch and group schedules
      fetchSchedules().then(({ schedules, assets }) => {
        const allProfiles = getPublishingTargets();
        const grouped = groupSchedules(schedules, allProfiles);
        setGroupedSchedules(grouped);
        if (assets && Object.keys(assets).length > 0) {
          setPendingAssets(prevAssets => ({ ...prevAssets, ...assets }));
        }
      });
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

        // Update the state to reflect the deletion
        setGroupedSchedules(prevGrouped => {
            const newGrouped = { ...prevGrouped };
            for (const authorUrn in newGrouped) {
                newGrouped[authorUrn].posts = newGrouped[authorUrn].posts.filter(p => p.id !== scheduleToDelete);
                // Also remove from followUps if it exists there (though UI might not allow deleting followups directly)
                for (const post of newGrouped[authorUrn].posts) {
                    post.followUps = post.followUps.filter(fp => fp.id !== scheduleToDelete);
                }
                // If an author group becomes empty, remove it
                if (newGrouped[authorUrn].posts.length === 0) {
                    delete newGrouped[authorUrn];
                }
            }
            return newGrouped;
        });

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
        const allProfiles = getPublishingTargets();
        const grouped = groupSchedules(schedules, allProfiles);
        setGroupedSchedules(grouped);
        if (assets && Object.keys(assets).length > 0) {
          setPendingAssets(prevAssets => ({ ...prevAssets, ...assets }));
        }
      });
    }
  }, [tabValue, fetchSchedules, setPendingAssets, linkedinProfiles]);

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

            // This logic replicates the successful selective escaping from the cron job.
            // It escapes the main content and CTA, but leaves hashtags untouched.

            const titlePart = campaignContent.titulo?.toUpperCase() || '';
            const contentPart = escapeLinkedinText(markdownToLinkedinText(sourceContent));
            const ctaPart = escapeLinkedinText(campaignContent.cta || '');
            const hashtagsPart = (campaignContent.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ');

            const finalParts = [];
            if (titlePart) finalParts.push(titlePart);
            if (contentPart) finalParts.push(contentPart);
            if (ctaPart) finalParts.push('----', ctaPart);
            if (hashtagsPart) finalParts.push('----', hashtagsPart);

            setContent(finalParts.join('\n\n'));
        }
    }, [campaignContent, contentSize]);

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
    const images = (generatedPagesData || []).filter(Boolean).map((img, index) => ({ ...img, type: 'image', mediaId: `image-${index}`, fileSize: img.blob ? formatBytes(img.blob.size) : 'N/A', fileType: img.blob ? img.blob.type : 'N/A' }));
    const videos = (generatedVideos || []).filter(Boolean).map((vid, index) => ({ ...vid, type: 'video', mediaId: `video-${index}`, fileSize: vid.blob ? formatBytes(vid.blob.size) : 'N/A', fileType: vid.blob ? vid.blob.type : 'N/A' }));
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
            // Adiciona CTA e Hashtags para consistência com follow-ups
            cta: campaignContent?.cta || '',
            hashtags: campaignContent?.hashtags || [],
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
              // Clone the array to prevent potential mutation issues across loop iterations
              images: [...permanentImageUrls],
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
                {isLoadingSchedules && <LinearProgress />}
                {!isLoadingSchedules && Object.keys(groupedSchedules).length === 0 && (
                    <Typography sx={{mt: 2, textAlign: 'center'}}>Nenhum agendamento encontrado.</Typography>
                )}
                <List component="nav" sx={{ width: '100%' }}>
                    {Object.entries(groupedSchedules).map(([authorUrn, { profileName, posts }]) => (
                        <React.Fragment key={authorUrn}>
                            <ListItem button onClick={() => handleItemClick(authorUrn)}>
                                <ListItemText primary={profileName} primaryTypographyProps={{ fontWeight: 'bold' }} />
                                {openItems[authorUrn] ? <ExpandLess /> : <ExpandMore />}
                            </ListItem>
                            <Collapse in={openItems[authorUrn]} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {posts.map(post => (
                                        <PostListItem
                                            key={post.id}
                                            post={post}
                                            level={1}
                                            openItems={openItems}
                                            handleItemClick={handleItemClick}
                                            handleViewDetails={handleViewDetails}
                                            handleOpenEditModal={handleOpenEditModal}
                                            handleDeleteSchedule={handleDeleteSchedule}
                                        />
                                    ))}
                                </List>
                            </Collapse>
                        </React.Fragment>
                    ))}
                </List>
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

const PostListItem = ({ post, level, openItems, handleItemClick, handleViewDetails, handleOpenEditModal, handleDeleteSchedule }) => {
    const postImage = post.post_content?.images?.[0] || post.campaign_data?.pageTemplate?.images?.[0]?.url;

    return (
        <React.Fragment>
            <ListItem sx={{ pl: 2 + level * 2, borderLeft: '2px solid', borderBottom: '1px solid', borderColor: 'divider', bgcolor: level === 1 ? 'action.hover' : 'background.paper' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={5} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {postImage && (
                            <Box
                                component="img"
                                src={postImage}
                                alt="Post image"
                                sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1, display: { xs: 'none', sm: 'block' } }}
                            />
                        )}
                        <ListItemText
                            primary={post.post_content.titulo || (level > 1 ? 'Follow-up' : 'Post Agendado')}
                            secondary={formatInTimeZone(new Date(post.scheduled_at), getTimezone() || 'UTC', 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            primaryTypographyProps={{ fontWeight: 'bold' }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3} md={2}>
                        <Chip
                            label={post.status}
                            color={post.status === 'published' ? 'success' : (post.status === 'failed' ? 'error' : 'primary')}
                            size="small"
                        />
                        {post.status === 'failed' && post.error_message && (
                            <Tooltip title={post.error_message}>
                                <Info fontSize="small" sx={{ verticalAlign: 'middle', ml: 0.5, color: 'error.main' }} />
                            </Tooltip>
                        )}
                    </Grid>
                    <Grid item xs={6} sm={3} md={2} sx={{ textAlign: 'center' }}>
                        {post.status === 'published' && post.linkedin_post_url ? (
                            <MuiLink href={post.linkedin_post_url} target="_blank" rel="noopener">Ver Post</MuiLink>
                        ) : '-'}
                    </Grid>
                    <Grid item xs={12} sm={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 0.5, mt: { xs: 1, md: 0 } }}>
                        {post.followUps && post.followUps.length > 0 && (
                            <Tooltip title={openItems[post.id] ? "Recolher follow-ups" : "Expandir follow-ups"}>
                                <IconButton onClick={() => handleItemClick(post.id)} size="small">
                                    {openItems[post.id] ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Ver Detalhes">
                            <IconButton onClick={() => handleViewDetails(post.id)} size="small"><Visibility /></IconButton>
                        </Tooltip>
                        <Tooltip title={post.status === 'failed' ? 'Tentar Novamente' : 'Editar Agendamento'}>
                            <IconButton onClick={() => handleOpenEditModal(post)} size="small">
                                {post.status === 'failed' ? <Replay /> : <Edit />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir Agendamento">
                            <IconButton onClick={() => handleDeleteSchedule(post.id)} size="small"><Delete /></IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </ListItem>
            {post.followUps && post.followUps.length > 0 && (
                <Collapse in={openItems[post.id]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {post.followUps.map(followUp => (
                            <PostListItem
                                key={followUp.id}
                                post={followUp}
                                level={level + 1}
                                openItems={openItems}
                                handleItemClick={handleItemClick}
                                handleViewDetails={handleViewDetails}
                                handleOpenEditModal={handleOpenEditModal}
                                handleDeleteSchedule={handleDeleteSchedule}
                            />
                        ))}
                    </List>
                </Collapse>
            )}
        </React.Fragment>
    );
};


export default Publisher;
