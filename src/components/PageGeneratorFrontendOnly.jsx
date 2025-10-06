import React, { useState, useRef, useEffect } from 'react';
import ProgressModal from './ProgressModal';
import { containsHtml, renderHtmlToCanvas } from '../utils/htmlRenderer';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  Close,
  GetApp,
  Image as ImageIcon,
  CloudUpload,
  FolderOpen,
  TableChart,
  Google,
  Edit,
  SwapHoriz,
  Share,
  AutoAwesomeOutlined as GeminiIcon,
  SettingsBackupRestore,
  Delete,
} from '@mui/icons-material';
import PageEditor from './PageEditor';
import { createFolder, uploadFile, createSpreadsheet } from '../utils/googleApi';
import { drawAndComposeImage, dataURLtoBlob, wrapTextInArea, applyTextEffects, drawTextWithEffects } from '../utils/imageComposer';
import { createNewImageElement } from '../utils/elementFactory';
import { useUserAuth } from '../context/UserAuthContext';
import { useCampaign } from '../context/CampaignContext';
import { safeDeepClone } from '../lib/utils';

const PageGeneratorFrontendOnly = ({
  colorPalette,
  initialGeneratedPagesData,
  onThumbnailRecordTextUpdate,
  originalImageSize,
  onBrandElementsChange,
  fontScale = 1,
  handleGenerateSinglePage,
  aspectRatio,
  handleImageUpload, // New prop
  onOpenImageGallery,
  imagePalette,
  pendingAssets,
  addPendingAsset, 
}) => {
  const {
    csvData,
    fieldPositions,
    fieldStyles,
    csvHeaders,
    brandElements,
    pageTemplate,
    setGeneratedPagesData,
  } = useCampaign();
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
    const loadFonts = async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Erro ao carregar fontes:', error);
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    if (initialGeneratedPagesData && initialGeneratedPagesData.length > 0 && fontsLoaded) {
      const regenerateMissingThumbnails = async () => {
        const pagesToRegenerate = initialGeneratedPagesData.filter(img => img.record && !img.url);
        if (pagesToRegenerate.length === 0) return;

        const pagePromises = initialGeneratedPagesData.map(pageData => {
          if (pageData.url || !pagesToRegenerate.some(r => r.index === pageData.index)) {
            return Promise.resolve(pageData);
          }

          const positionsToUse = pageData.customFieldPositions || fieldPositions;
          const stylesToUse = pageData.customFieldStyles || fieldStyles;
          const elementsToUse = pageData.customBrandElements !== undefined ? pageData.customBrandElements : brandElements;
          const pageTemplateToUse = pageData.customPageTemplate || pageTemplate;

          return drawAndComposeImage({
            record: pageData.record,
            index: pageData.index,
            pageTemplate: pageTemplateToUse,
            brandElements: elementsToUse,
            fieldPositions: positionsToUse,
            fieldStyles: stylesToUse,
            fontScale: pageData.fontScale || 1,
            aspectRatio,
          }).catch(error => {
            console.error(`[Thumbnail-Regen] Failed to regenerate thumbnail for index ${pageData.index}:`, error);
            return pageData;
          });
        });

        const regeneratedPages = await Promise.all(pagePromises.map(async (promise, index) => {
          const newPageData = await promise;
          const originalPageData = initialGeneratedPagesData[index];
          if (newPageData === originalPageData) return originalPageData;
          return { ...originalPageData, ...newPageData };
        }));

        if (JSON.stringify(regeneratedPages) !== JSON.stringify(initialGeneratedPagesData)) {
          setGeneratedPagesData(regeneratedPages);
        }
      };
      regenerateMissingThumbnails();
    }
  }, [initialGeneratedPagesData, fontsLoaded, fieldPositions, fieldStyles, pageTemplate, brandElements, setGeneratedPagesData, aspectRatio]);

  const generatePages = async () => {
    if (isGenerating) return;
    if (initialGeneratedPagesData.some(img => img.url)) {
      handleRegenerateAll();
      return;
    }
    if (!pageTemplate?.images?.length && !pageTemplate?.backgroundColor && !pageTemplate.gradient) {
      alert('Por favor, defina um fundo (imagem ou cor) para a campanha.');
      return;
    }
    if (csvData.length === 0) {
      alert('Por favor, carregue um arquivo CSV com os dados para gerar as páginas.');
      return;
    }
    if (!fontsLoaded) {
      alert('Aguardando carregamento das fontes. Tente novamente em alguns segundos.');
      return;
    }
    setIsGenerating(true);
    setShowProgressModal(true);
    setProgress(0);
    isCancelledRef.current = false;

    const pagePromises = csvData.map((record, i) => {
      if (isCancelledRef.current) return Promise.resolve(null);
      return drawAndComposeImage({
        record,
        index: i,
        brandElements,
        fieldPositions,
        fieldStyles,
        fontScale,
        pageTemplate: pageTemplate,
        aspectRatio,
      })
      .then(pageData => {
        setProgress(p => p + 1);
        // Return only the essential page data.
        // Custom styles/positions will be added only when a user edits a specific page.
        return pageData;
      })
      .catch(error => {
        console.error(`Erro ao gerar página para o registro ${i}:`, error);
        alert(`Erro ao gerar página para o registro ${i}: ${error.message}`);
        return null;
      });
    });

    try {
      const pages = (await Promise.all(pagePromises)).filter(Boolean);
      if (!isCancelledRef.current) {
        setGeneratedPagesData(pages);
      }
    } catch (error) {
      console.error('Erro geral durante a geração de páginas em lote:', error);
      alert(`Ocorreu um erro geral durante a geração das páginas: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setShowProgressModal(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!handleGenerateSinglePage) {
      alert("A função de regeneração não está disponível.");
      return;
    }
    setShowProgressModal(true);
    setIsGenerating(true);
    setProgress(0);
    isCancelledRef.current = false;
    for (let i = 0; i < csvData.length; i++) {
      if (isCancelledRef.current) break;
      const record = csvData[i];
      const pageData = initialGeneratedPagesData.find(p => p.index === i);
      const fontScaleToUse = pageData?.fontScale || 1;
      await handleGenerateSinglePage(record, i, fontScaleToUse);
      setProgress(p => p + 1);
    }
    setIsGenerating(false);
    setShowProgressModal(false);
  };

  const handleCancelGeneration = () => { isCancelledRef.current = true; };

  const regenerateSinglePage = async (index, record, pageTemplateToUse, positionsToUse, stylesToUse, elementsToUse = brandElements, fontScale = 1, pendingAssets) => {
    if (!pageTemplateToUse || !record || !positionsToUse || !stylesToUse || !fontsLoaded) {
      console.error('Pré-requisitos para regeneração não atendidos.');
      throw new Error('Pré-requisitos para regeneração não atendidos.');
    }
    return drawAndComposeImage({
      record,
      index,
      pageTemplate: pageTemplateToUse,
      brandElements: elementsToUse,
      fieldPositions: positionsToUse,
      fieldStyles: stylesToUse,
      fontScale,
      aspectRatio,
      pendingAssets,
    });
  };

  const handleResetPage = async (index) => {
    const pageToReset = initialGeneratedPagesData.find(img => img.index === index);
    if (pageToReset) {
      try {
        const newPageData = await regenerateSinglePage(
          index,
          pageToReset.record,
          pageTemplate,
          fieldPositions,
          fieldStyles,
          brandElements,
          fontScale,
          pendingAssets
        );
        setGeneratedPagesData(currentPages => currentPages.map(p => {
          if (p.index === index) {
            // Reset custom fields and apply new generated data
            return {
              ...p,
              ...newPageData,
              customFieldPositions: null,
              customFieldStyles: null,
              customBrandElements: null,
              customPageTemplate: null,
              fontScale,
            };
          }
          return p;
        }));
      } catch (error) {
        alert(`Não foi possível resetar a página: ${error.message}`);
      }
    } else {
      alert("Não foi possível encontrar os dados da página para resetar.");
    }
  };

  const downloadPage = async (pageData) => {
    if (!pageData || !pageData.url) {
      toast.error('Não há dados de página para baixar.');
      return;
    }

    let blobToDownload = null;
    const url = pageData.url;

    try {
      if (url.startsWith('blob:')) {
        blobToDownload = pendingAssets[url];
        if (!blobToDownload) {
          // If not in pendingAssets, it might be a revoked URL from another session. Try fetching it.
          const response = await fetch(url);
          blobToDownload = await response.blob();
        }
      } else if (url.startsWith('data:')) {
        blobToDownload = dataURLtoBlob(url);
      } else {
        // For http(s) URLs, fetch it via the proxy to handle CORS
        const fetchUrl = `/api/asset-proxy?url=${encodeURIComponent(url)}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`Falha ao buscar o recurso: ${response.statusText}`);
        }
        blobToDownload = await response.blob();
      }

      if (!blobToDownload) {
        throw new Error('Não foi possível obter os dados da imagem como Blob.');
      }

      // Unified download mechanism
      const tempDownloadUrl = URL.createObjectURL(blobToDownload);
      const link = document.createElement('a');
      link.href = tempDownloadUrl;
      link.download = pageData.filename || 'pagina.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(tempDownloadUrl); // Clean up immediately

    } catch (error) {
      console.error(`[downloadPage] Falha ao baixar a página ${pageData.filename}:`, error);
      toast.error(`Falha ao baixar a página: ${error.message}`);
      // Fallback for the original URL just in case, for external URLs that might not need the proxy.
      const link = document.createElement('a');
      link.href = url;
      link.download = pageData.filename || 'pagina.png';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async (pageData) => {
    if (!pageData || !pageData.url) return;
    try {
      const response = await fetch(pageData.url);
      const blob = await response.blob();
      const file = new File([blob], pageData.filename, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Compartilhar Página', text: `Confira: ${pageData.filename}` });
      } else {
        alert('Seu navegador não suporta compartilhamento de arquivos.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Ocorreu um erro ao tentar compartilhar a página.');
      }
    }
  };

  const downloadAllPages = async () => {
    for (const [index, pageData] of initialGeneratedPagesData.entries()) {
      try {
        // Stagger downloads to avoid browser limitations/throttling
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
    if (!pageFromClosure || !pageFromClosure.record) {
      console.error("Attempted to edit a page with no record data:", pageFromClosure);
      alert("Não é possível editar esta página pois seus dados estão ausentes ou corrompidos.");
      return;
    }

    // Merge the base template with the custom page template to get the final version
    const finalTemplate = {
      ...pageTemplate, // Start with the global template
      ...(pageFromClosure.customPageTemplate || {}), // Override with custom properties
    };

    // Ensure the 'images' property is always a shallow-copied array
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
    console.log('[PageGenerator] handleSaveIndividualModifications received:', modifiedPageData);
    const { index: pageIndex } = modifiedPageData;
    handleCloseGeneratedPageEditor();
    try {
      const newPageImageData = await regenerateSinglePage(
        pageIndex,
        modifiedPageData.record,
        modifiedPageData.customPageTemplate, // Use the correct prop name
        modifiedPageData.customFieldPositions,
        modifiedPageData.customFieldStyles,
        modifiedPageData.customBrandElements,
        1, // Always use a scale of 1 for the final render, as per user feedback.
        pendingAssets
      );
      setGeneratedPagesData(currentPages =>
        currentPages.map(page => {
          if (page.index !== pageIndex) return page;
          // Persist the changes
          return {
            ...page, // Keep old data like blob, url
            ...newPageImageData, // Overwrite with new image data
            record: modifiedPageData.record,
            customFieldPositions: modifiedPageData.customFieldPositions,
            customFieldStyles: modifiedPageData.customFieldStyles,
            customBrandElements: modifiedPageData.customBrandElements,
            customPageTemplate: modifiedPageData.customPageTemplate,
            fontScale: 1, // Always save the scale as 1 for consistency.
          };
        })
      );
      if (onThumbnailRecordTextUpdate) {
        onThumbnailRecordTextUpdate(pageIndex, modifiedPageData.record);
      }
    } catch (error) {
      alert(`Falha ao regenerar a página: ${error.message}`);
    }
  };

  const handleReplacePageClick = (index) => {
    setReplacingImageIndex(index);
    if (individualImageInputRef.current) {
      individualImageInputRef.current.click();
    }
  };

  const handleIndividualImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && replacingImageIndex !== null) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const newImageUrl = e.target.result;
        const pageToUpdate = initialGeneratedPagesData.find(img => img.index === replacingImageIndex);
        if (pageToUpdate) {
          const templateToUpdate = pageToUpdate.customPageTemplate || pageTemplate;
          const newImageElement = createNewImageElement(newImageUrl);
          newImageElement.zIndex = -1; // Keep the background zIndex

          const updatedTemplate = {
            ...templateToUpdate,
            images: [newImageElement, ...templateToUpdate.images.slice(1)],
          };

          try {
            const newPageData = await regenerateSinglePage(
              replacingImageIndex,
              pageToUpdate.record,
              updatedTemplate,
              pageToUpdate.customFieldPositions || fieldPositions,
              pageToUpdate.customFieldStyles || fieldStyles,
              pageToUpdate.customBrandElements || brandElements,
              pageToUpdate.fontScale || 1,
              pendingAssets
            );
            setGeneratedPagesData(currentPages => currentPages.map(p => {
              if (p.index === replacingImageIndex) {
                return { ...p, ...newPageData, customPageTemplate: updatedTemplate };
              }
              return p;
            }));
          } catch (error) {
            alert(`Falha ao substituir o fundo da página: ${error.message}`);
          }
        }
      };
      reader.readAsDataURL(file);
    }
    if (individualImageInputRef.current) {
      individualImageInputRef.current.value = "";
    }
    setReplacingImageIndex(null);
  };

  const uploadToGoogleDrive = async () => {
    if (!projectName.trim()) {
      alert('Por favor, digite um nome para o projeto.');
      return;
    }
    if (initialGeneratedPagesData.length === 0) {
      alert('Nenhuma página foi gerada ainda.');
      return;
    }
    if (!isGoogleDriveConnected) {
      alert('Conexão com Google não está ativa.');
      return;
    }
    setIsUploadingToDrive(true);
    setDriveResult(null);
    try {
      const folder = await createFolder(projectName);
      const contentFolder = await createFolder('Conteúdo', folder.id);
      const uploadResults = [];
      const sheetData = [];
      const allHeaders = Array.from(new Set(initialGeneratedPagesData.flatMap(p => Object.keys(p.record))));

      for (const pageData of initialGeneratedPagesData) {
        try {
          const blob = dataURLtoBlob(pageData.dataUrl);
          const result = await uploadFile(blob, pageData.filename, contentFolder.id);
          uploadResults.push({ filename: pageData.filename, success: true, fileId: result.id });
          sheetData.push([pageData.index + 1, `https://drive.google.com/file/d/${result.id}/view?usp=sharing`, ...allHeaders.map(h => pageData.record[h] || '')]);
        } catch (error) {
          uploadResults.push({ filename: pageData.filename, success: false, error: error.message });
        }
      }

      if (sheetData.length > 0) {
        await createSpreadsheet(`Relação de Arquivos - ${projectName}`, [['Nº', 'Link', ...allHeaders], ...sheetData], contentFolder.id);
      }
      setDriveResult({ folderId: folder.id, uploads: uploadResults, successCount: uploadResults.filter(r => r.success).length, totalCount: uploadResults.length });
    } catch (error) {
      alert(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const pageToEdit = initialGeneratedPagesData.find(p => p.index === editingGeneratedPageIndex);

  useEffect(() => {
    // This effect synchronizes the editor's template with the parent's state.
    // When an image is added from the gallery, `initialGeneratedPagesData` changes.
    // This effect ensures the open `PageEditor` receives the updated template.
    if (editingGeneratedPageIndex !== null) {
      const updatedPageData = initialGeneratedPagesData.find(p => p.index === editingGeneratedPageIndex);
      if (updatedPageData) {
        const finalTemplate = {
          ...pageTemplate,
          ...(updatedPageData.customPageTemplate || {}),
        };
        finalTemplate.images = [...(finalTemplate.images || [])];

        // Update the state that is passed as a prop to the PageEditor
        setPageTemplateForEditor(finalTemplate);
      }
    }
  }, [initialGeneratedPagesData, editingGeneratedPageIndex, pageTemplate]);

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom><ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Geração de Páginas</Typography>
          {!fontsLoaded && <Alert severity="info" sx={{ mb: 2 }}>Carregando fontes...</Alert>}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={initialGeneratedPagesData.some(img => img.url) ? 4 : 12}>
              <Button variant="contained" color="primary" onClick={generatePages} disabled={isGenerating || !fontsLoaded} startIcon={<ImageIcon />} fullWidth>
                {initialGeneratedPagesData.some(img => img.url) ? 'Regerar páginas' : 'Gerar Páginas'}
              </Button>
            </Grid>
            {initialGeneratedPagesData.some(img => img.url) && (
              <>
                <Grid item xs={12} sm={4}>
                  <Button variant="outlined" onClick={downloadAllPages} startIcon={<Download />} fullWidth>
                    Download Todas ({initialGeneratedPagesData.filter(img => img.url).length})
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
            <DialogContent>
              <Typography>
                Tem certeza que deseja excluir todas as páginas geradas? Esta ação não pode ser desfeita.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
              <Button onClick={() => {
                setGeneratedPagesData([]);
                setShowDeleteConfirm(false);
              }} color="error">
                Excluir
              </Button>
            </DialogActions>
          </Dialog>

          {initialGeneratedPagesData.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom><Google sx={{ mr: 1, verticalAlign: 'middle' }} />Integração Google Drive</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Nome do Projeto" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </Grid>
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

          {initialGeneratedPagesData.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>Páginas Geradas ({initialGeneratedPagesData.length})</Typography>
              <Grid container spacing={2}>
                {initialGeneratedPagesData.map((pageData, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip label={`#${index + 1}`} size="small" color="primary" sx={{ mr: 1 }} />
                          <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>{pageData.filename}</Typography>
                        </Box>
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: 'auto',
                            aspectRatio: aspectRatio ? String(aspectRatio).replace(':', ' / ') : '1 / 1',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'background.paper',
                            borderRadius: 1,
                            mb: 1,
                            boxShadow: 3,
                            cursor: 'pointer',
                            p: 1,
                            '&:hover img': { transform: 'scale(1.03)' },
                            '&:hover': { boxShadow: 6 },
                            transition: 'all 0.3s'
                          }}
                          onClick={() => handleOpenGeneratedPageEditor(pageData, pageData.index)}
                        >
                          <img
                            src={pageData.url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.3s',
                              opacity: regeneratingIndex === index ? 0.5 : 1,
                            }}
                          />
                          {regeneratingIndex === index && (
                            <CircularProgress
                              size={40}
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-20px',
                                marginLeft: '-20px',
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
                           <Tooltip title="Regerar com IA">
                                <IconButton
                                    size="small"
                                    onClick={async () => {
                                        setRegeneratingIndex(index);
                                        try {
                                            await handleGenerateSinglePage(pageData.record, pageData.index, pageData.fontScale || 1);
                                        } finally {
                                            setRegeneratingIndex(null);
                                        }
                                    }}
                                    disabled={regeneratingIndex !== null}
                                >
                                    <GeminiIcon />
                                </IconButton>
                            </Tooltip>
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
