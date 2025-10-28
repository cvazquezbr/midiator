import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { useCampaign } from '../context/CampaignContext';
import { useUserAuth } from '../context/UserAuthContext';
import Campaign from '../components/Campaign';
import { toast } from 'sonner';

function HomePage() {
  const { campaignState, setCampaignState, createCampaign, cloneCampaign, fetchCampaigns, campaigns, loading, error } = useCampaign();
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserAuth();

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (campaignId && campaigns.length > 0) {
      const selectedCampaign = campaigns.find(c => c.id === campaignId);
      if (selectedCampaign) {
        setCampaignState(selectedCampaign.data);
      } else {
        toast.error('Campanha não encontrada.');
        navigate('/');
      }
    }
  }, [campaignId, campaigns, setCampaignState, navigate]);

  const handleCreateCampaign = async () => {
    const newCampaignId = await createCampaign();
    if (newCampaignId) {
      navigate(`/campaigns/${newCampaignId}`);
    }
  };

  const handleCloneCampaign = async (sourceCampaignId) => {
    const newCampaignId = await cloneCampaign(sourceCampaignId);
    if (newCampaignId) {
      navigate(`/campaigns/${newCampaignId}`);
      toast.success('Campanha clonada com sucesso!');
    }
  };

  const handleSelectCampaign = (selectedCampaignId) => {
    if (selectedCampaignId) {
      navigate(`/campaigns/${selectedCampaignId}`);
    } else {
      setCampaignState(prev => ({ pageTemplate: { ...prev.pageTemplate, images: [...(prev.pageTemplate.images || []), newImage] } }));
      toast.success('Imagem adicionada ao modelo.');
    }
    extractColorPalette(imageUrl, p => setCampaignState({ imageColorPalette: p }));
  }, [imageGalleryTargetIndex, setCampaignState, extractColorPalette]);

  const handleImageSelected = useCallback((file) => {
    if (!file) return;
    const managedUrl = addPendingAsset(file);
    if (managedUrl) addNewImageToCanvas(managedUrl);
    else toast.error("Houve um erro ao registrar a imagem.");
  }, [addPendingAsset, addNewImageToCanvas]);

  const handleForegroundImageUpload = useCallback((event) => handleImageSelected(event.target.files[0]), [handleImageSelected]);
  const handleImageDragOver = (event) => event.preventDefault();
  const handleImageDragEnter = (event) => event.preventDefault();
  const handleImageDragLeave = (event) => event.preventDefault();
  const handleNext = () => { if (activeStep === 3) setCampaignState(prev => ({ ...prev, templateFieldStyles: fieldStyles })); setActiveStep(p => p + 1); };
  const handleBack = () => setActiveStep(p => p - 1);
  const canProceedToStep = (step) => {
    switch (step) {
      case 1: return true;
      case 2: return campaignState.campaignContent !== null;
      case 3: return csvData.length > 0;
      case 4: return true;
      case 5: if (generatedPagesData.length === 0 || !generatedPagesData.every(img => img.url)) { toast.error("Gere todas as páginas antes de prosseguir."); return false; } return true;
      case 6: if (campaignState.generatedAudioData?.length === 0 && csvData.length > 0) { toast.error("Gere os áudios antes de prosseguir."); return false; } if (campaignState.generatedAudioData?.some(a => !a.duration)) { toast.error("Aguarde o cálculo da duração de todos os áudios."); return false; } return true;
      default: return true;
    }
  };
  const { visibleFields, totalFields, styledFields } = useMemo(() => ({
    visibleFields: Object.values(fieldPositions).filter(pos => pos.visible).length,
    totalFields: csvHeaders.length,
    styledFields: Object.keys(fieldStyles).length
  }), [fieldPositions, csvHeaders, fieldStyles]);

  const handleZIndexChange = (elementId, action) => {
    if (!elementId) return;
    let allElements = [ ...Object.entries(fieldPositions).map(([id, pos]) => ({ id, zIndex: pos.zIndex, isBrand: false })), ...brandElements.map(el => ({ id: el.id, zIndex: el.zIndex, isBrand: true })), ];
    allElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const currentIndex = allElements.findIndex(el => el.id === elementId);
    if (currentIndex === -1) return;
    const [currentElement] = allElements.splice(currentIndex, 1);
    switch (action) {
      case 'front': allElements.push(currentElement); break;
      case 'back': allElements.unshift(currentElement); break;
      case 'forward': allElements.splice(Math.min(currentIndex + 1, allElements.length), 0, currentElement); break;
      case 'backward': allElements.splice(Math.max(currentIndex - 1, 0), 0, currentElement); break;
      default: allElements.splice(currentIndex, 0, currentElement); return;
    }
    const newPositions = { ...fieldPositions };
    const newBrandElements = [...brandElements];
    allElements.forEach((el, index) => {
      el.zIndex = index;
      if (el.isBrand) { const brandEl = newBrandElements.find(b => b.id === el.id); if (brandEl) brandEl.zIndex = index; }
      else { if (newPositions[el.id]) newPositions[el.id].zIndex = index; }
    });
    setCampaignState(prev => ({ ...prev, fieldPositions: newPositions, brandElements: newBrandElements }));
  };

  const handleSidebarStepClick = (index) => { if (isMobile) setSidebarOpen(false); setActiveStep(index); };

  const handleDadosAlterados = useCallback((novosRegistros, novasColunas) => {
    setCampaignState(prev => {
      const sanitizedRegistros = novosRegistros.map((record, index) => ({
        ...(record || {}),
        Título: (record || {}).Título || `Página ${index + 1}`,
      }));

      const updates = {
        csvData: sanitizedRegistros,
        // Preserve existing media data to prevent data loss on CSV update
        generatedVideos: prev.generatedVideos || [],
        generatedAudioData: prev.generatedAudioData || [],
      };

      if (JSON.stringify(novasColunas) !== JSON.stringify(prev.csvHeaders)) {
        updates.csvHeaders = novasColunas;
      }

      updates.generatedPagesData = sanitizedRegistros.map((record, index) => {
        const existingPage = (prev.generatedPagesData || []).find(p => p.index === index) || {};
        return {
          ...existingPage,
          index,
          record,
          url: null,
          blob: null
        };
      });

      return { ...prev, ...updates };
    });
  }, [setCampaignState]);

  const handleCsvRecordContentUpdate = useCallback((newCsvData) => {
    setCampaignState(prev => {
      const sanitizedCsvData = newCsvData.map((record, index) => ({
        ...(record || {}),
        Título: (record || {}).Título || `Página ${index + 1}`,
      }));

      const synchronizedPages = sanitizedCsvData.map((record, index) => {
        const existingPage = (prev.generatedPagesData || []).find(p => p.index === index) || {};
        return { ...existingPage, index, record };
      });

      const updates = {
        csvData: sanitizedCsvData,
        generatedPagesData: synchronizedPages,
        // Preserve media data
        generatedVideos: prev.generatedVideos || [],
        generatedAudioData: prev.generatedAudioData || [],
      };

      return { ...prev, ...updates };
    });
  }, [setCampaignState]);

  const handleThumbnailRecordTextUpdate = useCallback((recordIndex, updatedRecord) => {
    setCampaignState(prev => ({
      ...prev,
      csvData: prev.csvData.map((row, idx) => idx === recordIndex ? updatedRecord : row)
    }));
  }, [setCampaignState]);

  const handleGenerateCampaignContent = async (regenerate = false) => {
    setIsGeneratingCampaign(true); setCampaignGenerationFailed(false); setGenerationError(''); setGenerationStatus('Iniciando...');
    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign) || 'indisponível';
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign) || 'indisponível';
      const content = await generateCampaignContent({ problema: campaignState.problema, solucao: campaignState.solucao, objetivo: campaignState.objetivo, tomDeVoz: campaignState.tomDeVoz, persona: finalPersona, autor: finalAutor });
      setCampaignState(prev => ({ ...prev, campaignContent: content, promptText: `${content.titulo || ''}\n\n${content.conteudo || ''}\n\n${content.cta || ''}` }));
      if (regenerate) { toast.success("Conteúdo principal regenerado."); return; }
      setCampaignState(prev => ({ ...prev, followupPosts: [] }));
      await Promise.all([ handleGenerateSummary(1800, content), handleGenerateSummary(130, content) ]);
      toast.success("Campanha gerada com sucesso!");
    } catch (error) {
      toast.error(`Erro ao gerar conteúdo: ${error.message}`);
      setCampaignState(prev => ({ ...prev, campaignContent: null })); setCampaignGenerationFailed(true); setGenerationError(error.message);
    } finally {
      setIsGeneratingCampaign(false); setGenerationStatus('');
    }
  };

  const handleGenerateImage = useCallback(async (content, palette = null) => {
    const finalContent = content || campaignContentRef.current;
    if (!finalContent) { toast.error("Gere o conteúdo do texto primeiro."); return false; }
    setIsGeneratingImage(true);
    try {
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const imagePrompt = await generateCampaignImagePrompt({ content: finalContent, aspectRatio, autor: finalAutor, palette });
      const base64Data = await generateCampaignImage({ prompt: imagePrompt, aspectRatio, colors: palette?.colors || [] });
      const imageBlob = dataURLtoBlob(`data:image/png;base64,${base64Data}`);
      const managedUrl = addPendingAsset(imageBlob);
      if (!managedUrl) throw new Error("Falha ao criar URL para a imagem gerada.");
      setCampaignState(prev => ({
        ...prev,
        generatedPageUrl: managedUrl,
        pageUrls: [managedUrl, ...(prev.pageUrls || [])]
      }));
      addNewImageToCanvas(managedUrl);
      return true;
    } catch (imageError) {
      toast.error(`Erro na geração da imagem: ${imageError.message}`);
      setCampaignState(prev => ({ ...prev, generatedPageUrl: null }));
      return false;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [aspectRatio, addNewImageToCanvas, addPendingAsset, autorList, selectedAutorForCampaign, setCampaignState]);

  const handleGenerateSummary = async (targetLength, content) => {
    // The source of truth for the main content is the 'content' param if provided,
    // otherwise it's what's currently in the state.
    const sourceContent = content || campaignState.campaignContent;

    if (!sourceContent || !sourceContent.conteudo) {
      toast.error("Conteúdo principal não encontrado para gerar resumo.");
      return; // Exit early if there's nothing to summarize
    }

    const setLoading = targetLength === 1800 ? setIsGeneratingSummaryMedio : setIsGeneratingSummaryPequeno;
    setLoading(true);
    try {
      const summaryPrompt = `Resuma o seguinte texto para ter no máximo ${targetLength} caracteres, mantendo a essência e o tom: "${stripHtml(sourceContent.conteudo)}"`;
      const summary = await geminiAPI.generateContent(summaryPrompt);
      const fieldName = targetLength === 1800 ? 'conteudoMedio' : 'conteudoPequeno';

      // Use a functional update on setCampaignState to prevent race conditions.
      // This ensures that parallel calls don't overwrite each other's results.
      setCampaignState(currentState => ({
        ...currentState,
        campaignContent: {
          ...currentState.campaignContent, // Preserve all existing fields in campaignContent
          [fieldName]: summary, // Add or update the specific summary field
        },
      }));
    } catch (error) {
      toast.error(`Erro ao gerar resumo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFormattedContent = async (content = campaignState.campaignContent) => {
    if (!content?.conteudo) { toast.error("Gere o conteúdo principal primeiro."); return; }
    setIsGeneratingConteudoFormatado(true);
    try {
      const finalContent = await generateFormattedContent({ content });
      setCampaignState(prev => ({ ...prev, campaignContent: { ...prev.campaignContent, conteudoFormatado: finalContent } }));
    } catch (error) {
      toast.error(`Erro ao formatar conteúdo: ${error.message}`);
    } finally {
      setIsGeneratingConteudoFormatado(false);
    }
  };

  const handleGenerateFollowupPosts = async (content = campaignState.campaignContent) => {
    if (!content?.conteudo) { toast.error("Gere o conteúdo principal primeiro."); return; }
    const { followupPosts, followupPostsQuantity } = campaignState;
    if (followupPosts.length >= followupPostsQuantity) { toast.info('Quantidade de posts desejada já atingida.'); return; }
    setCampaignState(prev => ({ ...prev, isGeneratingFollowup: true }));
    try {
      const finalPersona = personaList.find(p => p.id === selectedPersonaForCampaign);
      const finalAutor = autorList.find(a => a.id === selectedAutorForCampaign);
      const neededQuantity = followupPostsQuantity - followupPosts.length;
      const plan = await generateFollowupPlan({ content, neededQuantity, existingPosts: followupPosts, persona: finalPersona, autor: finalAutor });
      const newPosts = await generateFollowupPosts({ content, plan, persona: finalPersona, autor: finalAutor });
      setCampaignState(prev => ({ ...prev, followupPosts: [...followupPosts, ...newPosts] }));
    } catch (error) {
      toast.error(`Erro ao gerar posts de follow-up: ${error.message}`);
    } finally {
      setCampaignState(prev => ({ ...prev, isGeneratingFollowup: false }));
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  if (!campaignId || !campaignState) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Bem-vindo, {user?.name || 'Usuário'}</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Selecione uma campanha para editar ou crie uma nova para começar.
        </Typography>
        <Button variant="contained" onClick={handleCreateCampaign} sx={{ mb: 2 }}>
          Criar Nova Campanha
        </Button>
        <Grid container spacing={2}>
          {campaigns.map(campaign => (
            <Grid item xs={12} sm={6} md={4} key={campaign.id}>
              <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{campaign.data.name || 'Campanha sem nome'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Atualizada em: {new Date(campaign.data.updatedAt?.seconds * 1000).toLocaleString()}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={() => handleSelectCampaign(campaign.id)}>
                    Abrir
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => handleCloneCampaign(campaign.id)}>
                    Clonar
                  </Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Suspense fallback={<CircularProgress />}>
      <Campaign
        campaignId={campaignId}
        onSelectCampaign={handleSelectCampaign}
        campaigns={campaigns}
      />
    </Suspense>
  );
}

export default HomePage;
