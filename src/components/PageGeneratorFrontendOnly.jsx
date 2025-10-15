import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import ProgressModal from './ProgressModal';
import {
  Box, Button, Typography, Card, CardContent, Grid, LinearProgress, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, TextField, Tooltip, CircularProgress, Divider,
} from '@mui/material';
import {
  Download, Close, Image as ImageIcon, CloudUpload, Google, Edit, SwapHoriz, Share, AutoAwesomeOutlined as GeminiIcon, SettingsBackupRestore, Delete,
} from '@mui/icons-material';
import PageEditor from './PageEditor';
import { createFolder, uploadFile, createSpreadsheet } from '../utils/googleApi';
import { drawAndComposeImage, dataURLtoBlob } from '../utils/imageComposer';
import { generateCampaignImage } from '../utils/generationHandlers.js';
import PageGenerationService from '../services/PageGenerationService.js';
import { createNewImageElement } from '../utils/elementFactory';
import { useUserAuth } from '../context/UserAuthContext';
import { useCampaign } from '../context/CampaignContext';
import { safeDeepClone } from '../lib/utils';

const PageGeneratorFrontendOnly = ({
  colorPalette,
  initialGeneratedPagesData: initialGeneratedPagesDataProp,
  onThumbnailRecordTextUpdate,
  originalImageSize,
  fontScale = 1,
  aspectRatio,
  onPagesUpdate,
  onOpenImageGallery,
  imagePalette,
}) => {
  const {
    csvData,
    fieldPositions,
    fieldStyles,
    brandElements,
    pageTemplate,
    pendingAssets,
    addPendingAsset,
    removePendingAsset,
  } = useCampaign();

  const [generatedPages, setGeneratedPages] = useState(initialGeneratedPagesDataProp || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const isCancelledRef = useRef(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [editingGeneratedPageIndex, setEditingGeneratedPageIndex] = useState(null);
  const [showGeneratedPageEditor, setShowGeneratedPageEditor] = useState(false);
  const [pageTemplateForEditor, setPageTemplateForEditor] = useState(null);
  const { googleAccessToken } = useUserAuth();
  const isGoogleDriveConnected = !!googleAccessToken;
  const [projectName, setProjectName] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [replacingImageIndex, setReplacingImageIndex] = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const individualImageInputRef = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setGeneratedPages(initialGeneratedPagesDataProp || []);
  }, [initialGeneratedPagesDataProp]);

  useEffect(() => {
    if (onPagesUpdate) {
      onPagesUpdate(generatedPages);
    }
  }, [generatedPages, onPagesUpdate]);

  const handleGenerateSinglePage = async (record, index, fontScale = 1) => {
    const imagePrompt = record.prompt_imagem_carrossel;
    let pageUpdateData = {};

    const pageData = generatedPages.find(p => p.index === index) || {};
    const effectiveBrandElements = pageData?.customBrandElements || brandElements;
    const effectiveFieldPositions = pageData?.customFieldPositions || fieldPositions;
    const effectiveFieldStyles = pageData?.customFieldStyles || fieldStyles;
    let effectivePageTemplate = pageData?.customPageTemplate || pageTemplate;

    if (imagePrompt && imagePrompt.trim() !== '') {
      try {
        let sourceStyle = { x: 0, y: 0, width: 100, height: 100, zIndex: -1, objectFit: 'cover' };
        if (effectivePageTemplate.images?.[0]) {
          const { id, src, ...style } = effectivePageTemplate.images[0];
          sourceStyle = style;
        }

        const oldImage = (effectivePageTemplate.images || [])[0];
        const base64Data = await generateCampaignImage({ prompt: imagePrompt, aspectRatio, colors: colorPalette });
        if (!base64Data) throw new Error("A IA não conseguiu gerar a imagem.");

        if (oldImage && oldImage.src && oldImage.src.startsWith('blob:')) {
          removePendingAsset(oldImage.src);
        }

        const blob = dataURLtoBlob(base64Data);
        const blobUrl = addPendingAsset(blob);

        const newImage = { ...createNewImageElement(blobUrl), ...sourceStyle, visible: true };
        const finalImages = [newImage, ...(effectivePageTemplate.images || []).slice(1)];
        const tempPageTemplate = { ...effectivePageTemplate, images: finalImages };

        effectivePageTemplate = tempPageTemplate;
        pageUpdateData.customPageTemplate = tempPageTemplate;
      } catch (error) {
        const errorMessage = error.message || "Um erro desconhecido ocorreu.";
        toast.error(`Falha ao gerar imagem para o post #${index + 1}: ${errorMessage}`);
      }
    }

    try {
      const finalPageData = await PageGenerationService.generatePageImage({
        record,
        index,
        campaignContext: {
          brandElements: effectiveBrandElements,
          fieldPositions: effectiveFieldPositions,
          fieldStyles: effectiveFieldStyles,
          aspectRatio,
          pageTemplate: effectivePageTemplate,
          fontScale,
          pendingAssets,
        }
      });

      const { blob } = finalPageData;
      const tempUrl = addPendingAsset(blob);
      if (!tempUrl) throw new Error("Failed to create managed URL for final page image.");

      const newPageDataObject = {
        ...pageData,
        ...finalPageData,
        ...pageUpdateData,
        url: tempUrl,
        dataUrl: null,
      };
      delete newPageDataObject.blob;

      toast.success(`Página #${index + 1} gerada.`);
      return newPageDataObject;
    } catch (error) {
      console.error(`Error during page generation for post ${index + 1}:`, error);
      toast.error(error.message);
      return null;
    }
  };

  const regenerateSinglePage = async (index, record, pageTemplateToUse, positionsToUse, stylesToUse, elementsToUse = brandElements, fontScale = 1) => {
    if (!pageTemplateToUse || !record || !positionsToUse || !stylesToUse || !fontsLoaded) {
      throw new Error('Pré-requisitos para regeneração não atendidos.');
    }
    return drawAndComposeImage({
      record, index, pageTemplate: pageTemplateToUse, brandElements: elementsToUse, fieldPositions: positionsToUse, fieldStyles: stylesToUse, fontScale, aspectRatio, pendingAssets,
    });
  };

  useEffect(() => {
    const loadFonts = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Erro ao carregar fontes:', error);
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    if (generatedPages && generatedPages.length > 0 && fontsLoaded) {
      const regenerateMissingThumbnails = async () => {
        const pagesToRegenerate = generatedPages.filter(img => img.record && !img.url);
        if (pagesToRegenerate.length === 0) return;

        const promises = pagesToRegenerate.map(pageData =>
          regenerateSinglePage(
            pageData.index,
            pageData.record,
            pageData.customPageTemplate || pageTemplate,
            pageData.customFieldPositions || fieldPositions,
            pageData.customFieldStyles || fieldStyles,
            pageData.customBrandElements !== undefined ? pageData.customBrandElements : brandElements,
            pageData.fontScale || 1,
          ).catch(error => {
            console.error(`[Thumbnail-Regen] Failed for index ${pageData.index}:`, error);
            return pageData;
          })
        );

        const regeneratedPagesData = await Promise.all(promises);
        const finalPages = generatedPages.map(originalPage => {
          const regenerated = regeneratedPagesData.find(r => r.index === originalPage.index);
          return regenerated ? { ...originalPage, ...regenerated } : originalPage;
        });

        if (JSON.stringify(finalPages) !== JSON.stringify(generatedPages)) {
          setGeneratedPages(finalPages);
        }
      };
      regenerateMissingThumbnails();
    }
  }, [fontsLoaded, generatedPages, pageTemplate, fieldPositions, fieldStyles, brandElements, aspectRatio, pendingAssets]);


  const generatePages = async () => {
    if (isGenerating) return;
    if (generatedPages.some(img => img.url)) {
      handleRegenerateAll();
      return;
    }
    if (!pageTemplate?.images?.length && !pageTemplate?.backgroundColor && !pageTemplate.gradient) {
      return toast.error('Por favor, defina um fundo (imagem ou cor) para a campanha.');
    }
    if (csvData.length === 0) {
      return toast.error('Por favor, carregue um arquivo CSV com os dados para gerar as páginas.');
    }
    if (!fontsLoaded) {
      return toast.warning('Aguardando carregamento das fontes. Tente novamente em alguns segundos.');
    }

    setIsGenerating(true);
    setShowProgressModal(true);
    setProgress(0);
    isCancelledRef.current = false;

    const newPagesData = [...generatedPages];
    for (let i = 0; i < csvData.length; i++) {
      if (isCancelledRef.current) break;
      const record = csvData[i];
      const newPage = await handleGenerateSinglePage(record, i, fontScale);
      if (newPage) {
        newPagesData[i] = newPage;
      }
      setProgress(p => p + 1);
    }

    setGeneratedPages(newPagesData);
    setIsGenerating(false);
    setShowProgressModal(false);
  };

  const handleRegenerateAll = async () => {
    setShowProgressModal(true);
    setIsGenerating(true);
    setProgress(0);
    isCancelledRef.current = false;

    const newPagesData = [...generatedPages];
    for (let i = 0; i < csvData.length; i++) {
      if (isCancelledRef.current) break;
      const record = csvData[i];
      const pageData = generatedPages.find(p => p.index === i) || {};
      const fontScaleToUse = pageData?.fontScale || 1;
      const newPage = await handleGenerateSinglePage(record, i, fontScaleToUse);
      if (newPage) {
        newPagesData[i] = newPage;
      }
      setProgress(p => p + 1);
    }
    setGeneratedPages(newPagesData);
    setIsGenerating(false);
    setShowProgressModal(false);
  };

  const handleCancelGeneration = () => { isCancelledRef.current = true; };

  const handleResetPage = async (index) => {
    const pageToReset = generatedPages.find(img => img.index === index);
    if (pageToReset) {
      try {
        const newPageData = await regenerateSinglePage(index, pageToReset.record, pageTemplate, fieldPositions, fieldStyles, brandElements, fontScale);
        setGeneratedPages(currentPages => currentPages.map(p => (p.index === index ? { ...p, ...newPageData, customFieldPositions: null, customFieldStyles: null, customBrandElements: null, customPageTemplate: null, fontScale } : p)));
        toast.success(`Página #${index + 1} resetada para o modelo padrão.`);
      } catch (error) {
        toast.error(`Não foi possível resetar a página: ${error.message}`);
      }
    } else {
      toast.error("Não foi possível encontrar os dados da página para resetar.");
    }
  };

  const downloadPage = async (pageData) => {
    if (!pageData?.url) return toast.error('Não há dados de página para baixar.');
    const url = pageData.url;
    try {
      const blobToDownload = url.startsWith('blob:') ? pendingAssets[url] : url.startsWith('data:') ? dataURLtoBlob(url) : await fetch(`/api/asset-proxy?url=${encodeURIComponent(url)}`).then(res => res.ok ? res.blob() : null);
      if (!blobToDownload) throw new Error('Não foi possível obter os dados da imagem como Blob.');
      const tempDownloadUrl = URL.createObjectURL(blobToDownload);
      const link = document.createElement('a');
      link.href = tempDownloadUrl;
      link.download = pageData.filename || 'pagina.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(tempDownloadUrl);
    } catch (error) {
      console.error(`[downloadPage] Falha ao baixar a página ${pageData.filename}:`, error);
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
        await navigator.share({ files: [file], title: 'Compartilhar Página', text: `Confira: ${pageData.filename}` });
      } else {
        toast.error('Seu navegador não suporta compartilhamento de arquivos.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') toast.error('Ocorreu um erro ao tentar compartilhar a página.');
    }
  };

  const downloadAllPages = async () => {
    for (const [index, pageData] of generatedPages.entries()) {
      try {
        await new Promise(resolve => setTimeout(resolve, index * 250));
        await downloadPage(pageData);
      } catch (error) {
        console.error(`Falha ao enfileirar o download para a página ${index + 1}:`, error);
        toast.error(`Falha no download da página ${index + 1}.`);
      }
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedPreview(null);
  };

  const handleOpenGeneratedPageEditor = (pageFromClosure, index) => {
    if (!pageFromClosure?.record) return toast.error("Não é possível editar uma página sem dados.");
    const finalTemplate = { ...pageTemplate, ...(pageFromClosure.customPageTemplate || {}) };
    finalTemplate.images = [...(finalTemplate.images || [])];
    setPageTemplateForEditor(finalTemplate);
    setEditingGeneratedPageIndex(index);
    setShowGeneratedPageEditor(true);
  };

  const handleCloseGeneratedPageEditor = () => {
    setShowGeneratedPageEditor(false);
    setEditingGeneratedPageIndex(null);
    setPageTemplateForEditor(null);
  };

  const handleSaveIndividualModifications = async (modifiedPageData) => {
    const { index: pageIndex } = modifiedPageData;
    handleCloseGeneratedPageEditor();
    try {
      const newPageImageData = await regenerateSinglePage(pageIndex, modifiedPageData.record, modifiedPageData.customPageTemplate, modifiedPageData.customFieldPositions, modifiedPageData.customFieldStyles, modifiedPageData.customBrandElements, 1);
      setGeneratedPages(currentPages => currentPages.map(page => page.index !== pageIndex ? page : { ...page, ...newPageImageData, record: modifiedPageData.record, customFieldPositions: modifiedPageData.customFieldPositions, customFieldStyles: modifiedPageData.customFieldStyles, customBrandElements: modifiedPageData.customBrandElements, customPageTemplate: modifiedPageData.customPageTemplate, fontScale: 1 }));
      if (onThumbnailRecordTextUpdate) onThumbnailRecordTextUpdate(pageIndex, modifiedPageData.record);
    } catch (error) {
      toast.error(`Falha ao regenerar a página: ${error.message}`);
    }
  };

  const handleReplacePageClick = (index) => {
    setReplacingImageIndex(index);
    individualImageInputRef.current?.click();
  };

  const handleIndividualImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (file && replacingImageIndex !== null) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const newImageUrl = e.target.result;
        const pageToUpdate = generatedPages.find(img => img.index === replacingImageIndex);
        if (pageToUpdate) {
          const templateToUpdate = pageToUpdate.customPageTemplate || pageTemplate;
          const newImageElement = { ...createNewImageElement(newImageUrl), zIndex: -1 };
          const updatedTemplate = { ...templateToUpdate, images: [newImageElement, ...templateToUpdate.images.slice(1)] };
          try {
            const newPageData = await regenerateSinglePage(replacingImageIndex, pageToUpdate.record, updatedTemplate, pageToUpdate.customFieldPositions || fieldPositions, pageToUpdate.customFieldStyles || fieldStyles, pageToUpdate.customBrandElements || brandElements, pageToUpdate.fontScale || 1);
            setGeneratedPages(currentPages => currentPages.map(p => p.index === replacingImageIndex ? { ...p, ...newPageData, customPageTemplate: updatedTemplate } : p));
          } catch (error) {
            toast.error(`Falha ao substituir o fundo da página: ${error.message}`);
          }
        }
      };
      reader.readAsDataURL(file);
    }
    if (individualImageInputRef.current) individualImageInputRef.current.value = "";
    setReplacingImageIndex(null);
  };

  const uploadToGoogleDrive = async () => {
    if (!projectName.trim()) return toast.error('Por favor, digite um nome para o projeto.');
    if (generatedPages.length === 0) return toast.error('Nenhuma página foi gerada ainda.');
    if (!isGoogleDriveConnected) return toast.error('Conexão com Google não está ativa.');
    setIsUploadingToDrive(true);
    setDriveResult(null);
    try {
      const folder = await createFolder(projectName);
      const contentFolder = await createFolder('Conteúdo', folder.id);
      const uploadResults = [];
      const sheetData = [];
      const allHeaders = Array.from(new Set(generatedPages.flatMap(p => Object.keys(p.record))));
      for (const pageData of generatedPages) {
        try {
          const blob = dataURLtoBlob(pageData.dataUrl);
          const result = await uploadFile(blob, pageData.filename, contentFolder.id);
          uploadResults.push({ filename: pageData.filename, success: true, fileId: result.id });
          sheetData.push([pageData.index + 1, `https://drive.google.com/file/d/${result.id}/view?usp=sharing`, ...allHeaders.map(h => pageData.record[h] || '')]);
        } catch (error) {
          uploadResults.push({ filename: pageData.filename, success: false, error: error.message });
        }
      }
      if (sheetData.length > 0) await createSpreadsheet(`Relação de Arquivos - ${projectName}`, [['Nº', 'Link', ...allHeaders], ...sheetData], contentFolder.id);
      setDriveResult({ folderId: folder.id, uploads: uploadResults, successCount: uploadResults.filter(r => r.success).length, totalCount: uploadResults.length });
    } catch (error) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const pageToEdit = generatedPages.find(p => p.index === editingGeneratedPageIndex);

  useEffect(() => {
    if (editingGeneratedPageIndex !== null) {
      const updatedPageData = generatedPages.find(p => p.index === editingGeneratedPageIndex);
      if (updatedPageData) {
        const finalTemplate = { ...pageTemplate, ...(updatedPageData.customPageTemplate || {}) };
        finalTemplate.images = [...(finalTemplate.images || [])];
        setPageTemplateForEditor(finalTemplate);
      }
    }
  }, [generatedPages, editingGeneratedPageIndex, pageTemplate]);

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom><ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Geração de Páginas</Typography>
          {!fontsLoaded && <Alert severity="info" sx={{ mb: 2 }}>Carregando fontes...</Alert>}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={generatedPages.some(img => img.url) ? 4 : 12}>
              <Button variant="contained" color="primary" onClick={generatePages} disabled={isGenerating || !fontsLoaded} startIcon={<ImageIcon />} fullWidth>
                {generatedPages.some(img => img.url) ? 'Regerar páginas' : 'Gerar Páginas'}
              </Button>
            </Grid>
            {generatedPages.some(img => img.url) && (
              <>
                <Grid item xs={12} sm={4}>
                  <Button variant="outlined" onClick={downloadAllPages} startIcon={<Download />} fullWidth>
                    Download Todas ({generatedPages.filter(img => img.url).length})
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)} startIcon={<Delete />} fullWidth>
                    Excluir Todas
                  </Button>
                </Grid>
              </>
            )}
          </Grid>

          {isGenerating && <Box sx={{ mt: 2 }}><LinearProgress /><Typography variant="body2" sx={{ mt: 1 }}>Gerando páginas...</Typography></Box>}

          <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent><Typography>Tem certeza que deseja excluir todas as páginas geradas? Esta ação não pode ser desfeita.</Typography></DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
              <Button onClick={() => { setGeneratedPages([]); setShowDeleteConfirm(false); }} color="error">Excluir</Button>
            </DialogActions>
          </Dialog>

          {generatedPages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom><Google sx={{ mr: 1, verticalAlign: 'middle' }} />Integração Google Drive</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}><TextField fullWidth label="Nome do Projeto" value={projectName} onChange={(e) => setProjectName(e.target.value)} /></Grid>
                <Grid item xs={12} md={6}>
                  <Tooltip title={!isGoogleDriveConnected ? "Conecte sua conta Google para ativar" : ""}>
                    <span>
                      <Button variant="contained" color="secondary" onClick={uploadToGoogleDrive} disabled={isUploadingToDrive || !isGoogleDriveConnected} startIcon={<CloudUpload />} fullWidth>
                        {isUploadingToDrive ? 'Enviando...' : 'Enviar para Google Drive'}
                      </Button>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
              {isUploadingToDrive && <Box sx={{ mt: 2 }}><LinearProgress /><Typography variant="body2" sx={{ mt: 1 }}>Enviando...</Typography></Box>}
              {driveResult && <Alert severity={driveResult.successCount === driveResult.totalCount ? "success" : "warning"} sx={{ mt: 2 }}>Upload concluído: {driveResult.successCount}/{driveResult.totalCount} arquivos enviados.</Alert>}
            </Box>
          )}

          {generatedPages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>Páginas Geradas ({generatedPages.length})</Typography>
              <Grid container spacing={2}>
                {generatedPages.map((pageData, index) => (
                  <Grid item xs={12} sm={6} md={4} key={pageData.index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip label={`#${index + 1}`} size="small" color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>{pageData.filename}</Typography>
                        </Box>
                        <Box sx={{ position: 'relative', width: '100%', height: 'auto', aspectRatio: aspectRatio ? String(aspectRatio).replace(':', ' / ') : '1 / 1', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'background.paper', borderRadius: 1, mb: 1, boxShadow: 3, cursor: 'pointer', p: 1, '&:hover img': { transform: 'scale(1.03)' }, '&:hover': { boxShadow: 6 }, transition: 'all 0.3s' }} onClick={() => handleOpenGeneratedPageEditor(pageData, pageData.index)}>
                          <img src={pageData.url} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', opacity: regeneratingIndex === index ? 0.5 : 1, }} />
                          {regeneratingIndex === index && <CircularProgress size={40} sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-20px', marginLeft: '-20px' }} />}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
                          <Tooltip title="Regerar com IA"><IconButton size="small" onClick={async () => { setRegeneratingIndex(index); try { const newPage = await handleGenerateSinglePage(pageData.record, pageData.index, pageData.fontScale || 1); if (newPage) setGeneratedPages(current => current.map(p => p.index === index ? newPage : p)); } finally { setRegeneratingIndex(null); } }} disabled={regeneratingIndex !== null}><GeminiIcon /></IconButton></Tooltip>
                          <Tooltip title="Resetar"><IconButton size="small" onClick={() => handleResetPage(pageData.index)}><SettingsBackupRestore /></IconButton></Tooltip>
                          <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenGeneratedPageEditor(pageData, pageData.index)}><Edit /></IconButton></Tooltip>
                          <Tooltip title="Substituir Fundo"><IconButton size="small" onClick={() => handleReplacePageClick(pageData.index)}><SwapHoriz /></IconButton></Tooltip>
                          <Tooltip title="Download"><IconButton size="small" onClick={() => downloadPage(pageData)}><Download /></IconButton></Tooltip>
                          <Tooltip title="Compartilhar"><IconButton size="small" onClick={() => handleShare(pageData)}><Share /></IconButton></Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onClose={closePreview} maxWidth="lg" fullWidth>
        <DialogTitle>Preview<IconButton onClick={closePreview} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton></DialogTitle>
        <DialogContent>{selectedPreview && <Box sx={{ textAlign: 'center' }}><img src={selectedPreview.url} alt={selectedPreview.filename} style={{ maxWidth: '100%', maxHeight: '70vh' }} /></Box>}</DialogContent>
        <DialogActions><Button onClick={() => downloadPage(selectedPreview)} startIcon={<Download />}>Download</Button><Button onClick={closePreview}>Fechar</Button></DialogActions>
      </Dialog>

      {pageToEdit && (
        <PageEditor
          key={editingGeneratedPageIndex}
          open={showGeneratedPageEditor}
          onClose={handleCloseGeneratedPageEditor}
          pageData={safeDeepClone(pageToEdit)}
          onSave={handleSaveIndividualModifications}
          colorPalette={colorPalette}
          imagePalette={imagePalette}
          aspectRatio={aspectRatio}
          originalImageSize={originalImageSize}
          onOpenImageGallery={() => onOpenImageGallery(editingGeneratedPageIndex)}
          editedPageTemplate={pageTemplateForEditor}
          setEditedPageTemplate={setPageTemplateForEditor}
          addPendingAsset={addPendingAsset}
          pendingAssets={pendingAssets}
        />
      )}

      <input type="file" accept="image/*" style={{ display: 'none' }} ref={individualImageInputRef} onChange={handleIndividualImageUpload} />
      <ProgressModal open={showProgressModal} progress={progress} total={csvData.length} onCancel={handleCancelGeneration} title="Gerando Páginas" progressText={`Gerando ${progress}/${csvData.length}...`} />
    </Box>
  );
};

export default PageGeneratorFrontendOnly;