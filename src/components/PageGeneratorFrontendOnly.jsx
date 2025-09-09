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
} from '@mui/icons-material';
import PageEditor from './PageEditor';
import { createFolder, uploadFile, createSpreadsheet } from '../utils/googleApi';
import { drawAndComposeImage, dataURLtoBlob, wrapTextInArea, applyTextEffects, drawTextWithEffects } from '../utils/imageComposer';
import { useUserAuth } from '../context/UserAuthContext';
import { useCampaign } from '../context/CampaignContext';

const PageGeneratorFrontendOnly = ({
  colorPalette,
  initialGeneratedPagesData,
  onThumbnailRecordTextUpdate,
  originalImageSize,
  onBrandElementsChange,
  fontScale = 1,
  standardsColors,
  handleGenerateSinglePage,
  aspectRatio,
  handleImageUpload, // New prop
  onChangeBackgroundImage, // New prop
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
  const { googleAccessToken } = useUserAuth();
  const isGoogleDriveConnected = !!googleAccessToken;
  const [projectName, setProjectName] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const [replacingImageIndex, setReplacingImageIndex] = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const individualImageInputRef = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
        fontScale: 1,
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

  const regenerateSinglePage = async (index, record, pageTemplateToUse, positionsToUse, stylesToUse, elementsToUse = brandElements, fontScale = 1) => {
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
          fontScale
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
              fontScale: 1,
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

  const downloadPage = (pageData) => {
    const link = document.createElement('a');
    link.href = pageData.url;
    link.download = pageData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const downloadAllPages = () => {
    initialGeneratedPagesData.forEach((pageData, index) => {
      setTimeout(() => downloadPage(pageData), index * 100);
    });
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedPreview(null);
  };

  const handleOpenGeneratedPageEditor = (pageFromClosure, index) => {
    setEditingGeneratedPageIndex(index);
    setShowGeneratedPageEditor(true);
  };

  const handleCloseGeneratedPageEditor = () => {
    setShowGeneratedPageEditor(false);
    setEditingGeneratedPageIndex(null);
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
        modifiedPageData.fontScale
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
          const newImageElement = {
            id: `img_${Date.now()}`,
            src: newImageUrl,
            x: 0, y: 0, width: 100, height: 100,
            zIndex: -1,
          };

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
              pageToUpdate.fontScale || 1
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

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom><ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Geração de Páginas</Typography>
          {!fontsLoaded && <Alert severity="info" sx={{ mb: 2 }}>Carregando fontes...</Alert>}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Button variant="contained" color="primary" onClick={generatePages} disabled={isGenerating || !fontsLoaded} startIcon={<ImageIcon />} fullWidth>
                {initialGeneratedPagesData.some(img => img.url) ? 'Regerar páginas' : 'Gerar Páginas'}
              </Button>
            </Grid>
            {initialGeneratedPagesData.some(img => img.url) && (
              <Grid item xs={12} md={6}>
                <Button variant="outlined" onClick={downloadAllPages} startIcon={<Download />} fullWidth>
                  Download Todas ({initialGeneratedPagesData.filter(img => img.url).length})
                </Button>
              </Grid>
            )}
          </Grid>

          {isGenerating && <Box sx={{ mt: 2 }}><LinearProgress /><Typography variant="body2" sx={{ mt: 1 }}>Gerando páginas...</Typography></Box>}

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
                              maxWidth: '100%',
                              maxHeight: '150px',
                              objectFit: 'contain',
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
          open={showGeneratedPageEditor}
          onClose={handleCloseGeneratedPageEditor}
          pageData={pageToEdit}
          onSave={handleSaveIndividualModifications}
          colorPalette={colorPalette}
          standardsColors={standardsColors}
          aspectRatio={aspectRatio}
          originalImageSize={originalImageSize}
          onChangeBackgroundImage={onChangeBackgroundImage}
        />
      )}

      <input type="file" accept="image/*" style={{ display: 'none' }} ref={individualImageInputRef} onChange={handleIndividualImageUpload} />
      <ProgressModal open={showProgressModal} progress={progress} total={csvData.length} onCancel={handleCancelGeneration} title="Gerando Páginas" progressText={`Gerando ${progress}/${csvData.length}...`} />
    </Box>
  );
};

export default PageGeneratorFrontendOnly;
