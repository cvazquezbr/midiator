import React, { useState, useRef, useEffect } from 'react';
import ProgressModal from './ProgressModal';
import {
  Box, Button, Typography, Card, CardContent, Grid, LinearProgress, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, TextField, Tooltip, CircularProgress, Divider,
} from '@mui/material';
import {
  Download, Close, Image, CloudUpload, Google, Edit, SwapHoriz, Share, AutoAwesomeOutlined as GeminiIcon, SettingsBackupRestore, Delete,
} from '@mui/icons-material';
import PageEditor from './PageEditor';
import { createFolder, uploadFile, createSpreadsheet } from '../utils/googleApi';
import { drawAndComposeImage, dataURLtoBlob } from '../utils/imageComposer';
import { createNewImageElement } from '../utils/elementFactory';
import { useUserAuth } from '../context/UserAuthContext';
import { useCampaign } from '../context/CampaignContext';
import { safeDeepClone } from '../lib/utils';
import { toast } from 'sonner';

const PageGeneratorFrontendOnly = ({
  originalImageSize,
  handleGenerateSinglePage,
  aspectRatio,
  onOpenImageGallery,
}) => {
  const { campaignState, setCampaignState, addPendingAsset } = useCampaign();
  const {
    csvData,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    generatedPagesData,
    pendingAssets,
  } = campaignState;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const isCancelledRef = useRef(false);
  const [editingGeneratedPageIndex, setEditingGeneratedPageIndex] = useState(null);
  const [showGeneratedPageEditor, setShowGeneratedPageEditor] = useState(false);
  const { googleAccessToken } = useUserAuth();
  const [projectName, setProjectName] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const individualImageInputRef = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await document.fonts.ready;
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Erro ao carregar fontes:', error);
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    if (generatedPagesData && generatedPagesData.length > 0 && fontsLoaded) {
      const regenerateMissingThumbnails = async () => {
        const pagesToRegenerate = generatedPagesData.filter(img => img.record && !img.url);
        if (pagesToRegenerate.length === 0) return;

        const pagePromises = generatedPagesData.map(pageData => {
          if (pageData.url || !pagesToRegenerate.some(r => r.index === pageData.index)) {
            return Promise.resolve(pageData);
          }
          const regenContext = {
            ...campaignState,
            record: pageData.record,
            index: pageData.index,
            pageTemplate: pageData.customPageTemplate || pageTemplate,
            brandElements: pageData.customBrandElements !== undefined ? pageData.customBrandElements : brandElements,
            fieldPositions: pageData.customFieldPositions || fieldPositions,
            fieldStyles: pageData.customFieldStyles || fieldStyles,
            fontScale: pageData.fontScale || 1,
            pendingAssets: pendingAssets,
          };
          return drawAndComposeImage(regenContext).catch(error => {
            console.error(`[Thumbnail-Regen] Failed for index ${pageData.index}:`, error);
            return pageData;
          });
        });

        const regeneratedResults = await Promise.all(pagePromises);
        const newGeneratedPagesData = generatedPagesData.map((originalPage, index) => {
          const result = regeneratedResults[index];
          return result !== originalPage ? { ...originalPage, ...result } : originalPage;
        });

        if (JSON.stringify(newGeneratedPagesData) !== JSON.stringify(generatedPagesData)) {
          setCampaignState({ generatedPagesData: newGeneratedPagesData });
        }
      };
      regenerateMissingThumbnails();
    }
  }, [generatedPagesData, fontsLoaded, campaignState, pageTemplate, brandElements, fieldPositions, fieldStyles, setCampaignState]);

  const generatePages = async () => {
    if (isGenerating) return;
    if (generatedPagesData.some(img => img.url)) {
      handleRegenerateAll();
      return;
    }
    if (!pageTemplate?.images?.length && !pageTemplate.backgroundColor && !pageTemplate.gradient) {
      toast.error('Por favor, defina um fundo para a campanha.');
      return;
    }
    if (csvData.length === 0) {
      toast.error('Por favor, carregue os dados para gerar as páginas.');
      return;
    }
    if (!fontsLoaded) {
      toast.info('Aguardando fontes. Tente novamente.');
      return;
    }
    setIsGenerating(true);
    setShowProgressModal(true);
    setProgress(0);
    isCancelledRef.current = false;

    const pagePromises = csvData.filter(Boolean).map((record, i) => {
      if (isCancelledRef.current) return Promise.resolve(null);
      const recordWithTitle = { ...record, Título: "CADU" || '' };
      return drawAndComposeImage({ ...campaignState, record: recordWithTitle, index: i, pendingAssets })
        .then(pageData => { setProgress(p => p + 1); return pageData; })
        .catch(error => { toast.error(`Erro ao gerar página ${i}: ${error.message}`); return null; });
    });

    try {
      const pages = (await Promise.all(pagePromises)).filter(Boolean);
      if (!isCancelledRef.current) setCampaignState({ generatedPagesData: pages });
    } catch (error) {
      toast.error(`Erro geral na geração de páginas: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setShowProgressModal(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!handleGenerateSinglePage) {
      toast.error("A função de regeneração não está disponível.");
      return;
    }
    setShowProgressModal(true);
    setIsGenerating(true);
    setProgress(0);
    isCancelledRef.current = false;
    const validCsvData = csvData.filter(Boolean);
    for (let i = 0; i < validCsvData.length; i++) {
      if (isCancelledRef.current) break;
      const record = validCsvData[i];
      const pageData = generatedPagesData.find(p => p.index === i);
      await handleGenerateSinglePage(record, i, pageData?.fontScale || 1);
      setProgress(p => p + 1);
    }
    setIsGenerating(false);
    setShowProgressModal(false);
  };

  const handleCancelGeneration = () => { isCancelledRef.current = true; };

  const regenerateSinglePage = async (pageDataForRegen) => {
    if (!pageDataForRegen.pageTemplate || !pageDataForRegen.record || !fontsLoaded) {
      throw new Error('Pré-requisitos para regeneração não atendidos.');
    }
    // Ensure pendingAssets is passed through for regeneration.
    return drawAndComposeImage({ ...pageDataForRegen, pendingAssets });
  };

  const handleResetPage = async (index) => {
    const pageToReset = generatedPagesData.find(img => img.index === index);
    if (pageToReset) {
      try {
        const regenContext = {
          ...campaignState, record: pageToReset.record, index, pageTemplate, brandElements, fieldPositions, fieldStyles, fontScale: 1,
        };
        const newPageData = await regenerateSinglePage(regenContext);
        setCampaignState(current => ({
          generatedPagesData: current.generatedPagesData.map(p => p.index === index ? { ...p, ...newPageData, customFieldPositions: null, customFieldStyles: null, customBrandElements: null, customPageTemplate: null, fontScale: 1 } : p)
        }));
      } catch (error) {
        toast.error(`Não foi possível resetar a página: ${error.message}`);
      }
    } else {
      toast.error("Dados da página não encontrados para resetar.");
    }
  };

  const downloadPage = async (pageData) => {
    if (!pageData?.url) { toast.error('Não há dados para baixar.'); return; }
    try {
      let blobToDownload = null;
      if (pageData.url.startsWith('blob:')) {
        blobToDownload = pendingAssets[pageData.url] || await (await fetch(pageData.url)).blob();
      } else if (pageData.url.startsWith('data:')) {
        blobToDownload = dataURLtoBlob(pageData.url);
      } else {
        const response = await fetch(`/api/asset-proxy?url=${encodeURIComponent(pageData.url)}`);
        if (!response.ok) throw new Error(`Falha ao buscar o recurso: ${response.statusText}`);
        blobToDownload = await response.blob();
      }
      if (!blobToDownload) throw new Error('Não foi possível obter o Blob da imagem.');
      const tempUrl = URL.createObjectURL(blobToDownload);
      const link = document.createElement('a');
      link.href = tempUrl;
      link.download = pageData.filename || 'pagina.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(tempUrl);
    } catch (error) {
      toast.error(`Falha ao baixar a página: ${error.message}`);
    }
  };

  const handleShare = async (pageData) => {
    if (!pageData?.url) return;
    try {
      const response = await fetch(pageData.url);
      const blob = await response.blob();
      const file = new File([blob], pageData.filename, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Compartilhar Página' });
      } else {
        toast.error('Seu navegador não suporta compartilhamento de arquivos.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') toast.error('Erro ao compartilhar a página.');
    }
  };

  const downloadAllPages = async () => {
    for (const [index, pageData] of generatedPagesData.entries()) {
      await new Promise(resolve => setTimeout(resolve, index * 250));
      downloadPage(pageData);
    }
  };

  const handleOpenGeneratedPageEditor = (pageIndex) => {
    const pageToEdit = generatedPagesData.find(p => p.index === pageIndex);
    if (!pageToEdit?.record) {
      toast.error("Não é possível editar esta página, dados corrompidos.");
      return;
    }
    setEditingGeneratedPageIndex(pageIndex);
    setShowGeneratedPageEditor(true);
  };

  const handleCloseGeneratedPageEditor = () => {
    setShowGeneratedPageEditor(false);
    setEditingGeneratedPageIndex(null);
  };

  const handleSaveIndividualModifications = async (modifiedPageData) => {
    handleCloseGeneratedPageEditor();
    try {
      const regenContext = {
        ...campaignState,
        record: modifiedPageData.record,
        index: modifiedPageData.index,
        pageTemplate: modifiedPageData.customPageTemplate,
        brandElements: modifiedPageData.customBrandElements,
        fieldPositions: modifiedPageData.customFieldPositions,
        fieldStyles: modifiedPageData.customFieldStyles,
        fontScale: 1,
      };
      const newPageImageData = await regenerateSinglePage(regenContext);
      setCampaignState(current => ({
        generatedPagesData: current.generatedPagesData.map(page =>
          page.index !== modifiedPageData.index ? page : {
            ...page, ...newPageImageData, ...modifiedPageData, fontScale: 1,
          }
        )
      }));
      toast.success(`Página #${modifiedPageData.index + 1} salva.`);
    } catch (error) {
      toast.error(`Falha ao regenerar a página: ${error.message}`);
    }
  };

  const handleReplacePageClick = (index) => {
    setEditingGeneratedPageIndex(index); // Use editing index to know which page to update
    if (individualImageInputRef.current) {
      individualImageInputRef.current.click();
    }
  };

  const handleIndividualImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && editingGeneratedPageIndex !== null) {
      const tempUrl = addPendingAsset(file);
      const pageToUpdate = generatedPagesData.find(img => img.index === editingGeneratedPageIndex);
      if (pageToUpdate) {
        const templateToUpdate = pageToUpdate.customPageTemplate || pageTemplate;
        const newImageElement = { ...createNewImageElement(tempUrl), zIndex: -1 };
        const updatedTemplate = { ...templateToUpdate, images: [newImageElement, ...templateToUpdate.images.slice(1)] };
        const regenContext = {
          ...campaignState,
          record: pageToUpdate.record,
          index: editingGeneratedPageIndex,
          pageTemplate: updatedTemplate,
          brandElements: pageToUpdate.customBrandElements || brandElements,
          fieldPositions: pageToUpdate.customFieldPositions || fieldPositions,
          fieldStyles: pageToUpdate.customFieldStyles || fieldStyles,
          fontScale: pageToUpdate.fontScale || 1,
        };
        regenerateSinglePage(regenContext)
          .then(newPageData => {
            setCampaignState(current => ({
              generatedPagesData: current.generatedPagesData.map(p =>
                p.index === editingGeneratedPageIndex ? { ...p, ...newPageData, customPageTemplate: updatedTemplate } : p
              )
            }));
          })
          .catch(error => toast.error(`Falha ao substituir fundo: ${error.message}`));
      }
    }
    if (individualImageInputRef.current) individualImageInputRef.current.value = "";
    setEditingGeneratedPageIndex(null);
  };

  const pageToEdit = (generatedPagesData || []).find(p => p.index === editingGeneratedPageIndex);

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom><Image sx={{ mr: 1, verticalAlign: 'middle' }} />Geração de Páginas</Typography>
          {!fontsLoaded && <Alert severity="info" sx={{ mb: 2 }}>Carregando fontes...</Alert>}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={generatedPagesData.some(img => img.url) ? 4 : 12}>
              <Button variant="contained" color="primary" onClick={generatePages} disabled={isGenerating || !fontsLoaded} startIcon={<Image />} fullWidth>
                {generatedPagesData.some(img => img.url) ? 'Regerar páginas' : 'Gerar Páginas'}
              </Button>
            </Grid>
            {generatedPagesData.some(img => img.url) && (
              <>
                <Grid item xs={12} sm={4}><Button variant="outlined" onClick={downloadAllPages} startIcon={<Download />} fullWidth>Download Todas</Button></Grid>
                <Grid item xs={12} sm={4}><Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)} startIcon={<Delete />} fullWidth>Excluir Todas</Button></Grid>
              </>
            )}
          </Grid>
          {isGenerating && <Box sx={{ mt: 2 }}><LinearProgress /></Box>}
          <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent><Typography>Tem certeza que deseja excluir todas as páginas geradas?</Typography></DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
              <Button onClick={() => { setCampaignState({ generatedPagesData: [] }); setShowDeleteConfirm(false); }} color="error">Excluir</Button>
            </DialogActions>
          </Dialog>
          {generatedPagesData.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} /><Typography variant="h6" gutterBottom>Páginas Geradas ({generatedPagesData.length})</Typography>
              <Grid container spacing={2}>
                {generatedPagesData.map((pageData, index) => {
                  if (!pageData.record) {
                    console.error("PageData sem 'record' encontrado no índice:", index, pageData);
                    return null;
                  }
                  return (
                  <Grid item xs={12} sm={6} md={4} key={pageData.index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}><Chip label={`#${index + 1}`} size="small" /><Typography variant="body2" noWrap sx={{ flexGrow: 1, ml:1 }}>{pageData.filename}</Typography></Box>
                        <Box
                          sx={{ position: 'relative', width: '100%', aspectRatio: String(aspectRatio || '1/1').replace(':', ' / '), cursor: 'pointer' }}
                          onClick={() => handleOpenGeneratedPageEditor(pageData.index)}
                        >
                          <img src={pageData.url} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: regeneratingIndex === index ? 0.5 : 1 }} />
                          {regeneratingIndex === index && <CircularProgress size={40} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-20px', ml: '-20px' }} />}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1, mt: 1 }}>
                           <Tooltip title="Regerar com IA"><IconButton size="small" onClick={async () => { setRegeneratingIndex(index); await handleGenerateSinglePage(pageData.record, pageData.index, pageData.fontScale || 1); setRegeneratingIndex(null); }} disabled={regeneratingIndex !== null}><GeminiIcon /></IconButton></Tooltip>
                           <Tooltip title="Resetar"><IconButton size="small" onClick={() => handleResetPage(pageData.index)}><SettingsBackupRestore /></IconButton></Tooltip>
                           <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenGeneratedPageEditor(pageData.index)}><Edit /></IconButton></Tooltip>
                           <Tooltip title="Substituir Fundo"><IconButton size="small" onClick={() => handleReplacePageClick(pageData.index)}><SwapHoriz /></IconButton></Tooltip>
                           <Tooltip title="Download"><IconButton size="small" onClick={() => downloadPage(pageData)}><Download /></IconButton></Tooltip>
                           <Tooltip title="Compartilhar"><IconButton size="small" onClick={() => handleShare(pageData)}><Share /></IconButton></Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
      {pageToEdit && (
        <PageEditor
          key={editingGeneratedPageIndex}
          open={showGeneratedPageEditor}
          onClose={handleCloseGeneratedPageEditor}
          pageData={safeDeepClone(pageToEdit)}
          onSave={handleSaveIndividualModifications}
          aspectRatio={aspectRatio}
          originalImageSize={originalImageSize}
          onOpenImageGallery={() => onOpenImageGallery(editingGeneratedPageIndex)}
          addPendingAsset={addPendingAsset}
        />
      )}
      <input type="file" accept="image/*" style={{ display: 'none' }} ref={individualImageInputRef} onChange={handleIndividualImageUpload} />
      <ProgressModal open={showProgressModal} progress={progress} total={csvData.length} onCancel={handleCancelGeneration} title="Gerando Páginas" />
    </Box>
  );
};

export default PageGeneratorFrontendOnly;
