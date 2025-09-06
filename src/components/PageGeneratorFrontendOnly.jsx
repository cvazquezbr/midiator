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
  Tooltip
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
import MemoizedPageEditor from './MemoizedPageEditor';
import { createFolder, uploadFile, createSpreadsheet } from '../utils/googleApi';
import { composeSingleImage, dataURLtoBlob, wrapTextInArea, applyTextEffects, drawTextWithEffects } from '../utils/imageComposer';
import { useUserAuth } from '../context/UserAuthContext';

const PageGeneratorFrontendOnly = ({
  csvData,
  fieldPositions,
  fieldStyles,
  csvHeaders,
  colorPalette,
  setGeneratedPagesData,
  initialGeneratedPagesData,
  onThumbnailRecordTextUpdate,
  originalImageSize,
  brandElements,
  onBrandElementsChange,
  fontScale = 1,
  standardsColors,
  handleGenerateSinglePage, // Nova prop
  backgroundElement,
  aspectRatio,
}) => {
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
  const individualImageInputRef = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    console.log('[PageGeneratorFrontendOnly] PROPS RECEIVED', { fieldStyles, backgroundElement });
  }, [fieldStyles, backgroundElement]);

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

  // Effect for regenerating thumbnails on load
  useEffect(() => {
    if (initialGeneratedPagesData && initialGeneratedPagesData.length > 0 && fontsLoaded) {
      const regenerateMissingThumbnails = async () => {
        const pagesToRegenerate = initialGeneratedPagesData.filter(img => img.record && !img.url);

        if (pagesToRegenerate.length === 0) return;

        console.log(`[Thumbnail-Regen] Found ${pagesToRegenerate.length} pages missing thumbnails. Regenerating...`);

        const pagePromises = initialGeneratedPagesData.map(pageData => {
          if (pageData.url || !pagesToRegenerate.some(r => r.index === pageData.index)) {
            return Promise.resolve(pageData);
          }

          const positionsToUse = pageData.customFieldPositions || fieldPositions;
          const stylesToUse = pageData.customFieldStyles || fieldStyles;
          const elementsToUse = pageData.customBrandElements !== undefined ? pageData.customBrandElements : brandElements;

          // The source of truth for the background is the element object.
          // It may have a custom `src` if the user replaced the background for that specific page.
          const backgroundElementToUse = pageData.customBackgroundElement || backgroundElement;

          return composeSingleImage({
            record: pageData.record,
            index: pageData.index,
            backgroundElement: backgroundElementToUse,
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
          if (newPageData === originalPageData) {
            return originalPageData;
          }
          return { ...originalPageData, ...newPageData };
        }));

        if (JSON.stringify(regeneratedPages) !== JSON.stringify(initialGeneratedPagesData)) {
          setGeneratedPagesData(regeneratedPages);
          console.log('[Thumbnail-Regen] Successfully regenerated thumbnails and updated state.');
        }
      };

      regenerateMissingThumbnails();
    }
  }, [initialGeneratedPagesData, fontsLoaded, fieldPositions, fieldStyles, backgroundElement, brandElements, setGeneratedPagesData]);


  const generatePages = async () => {
    if (isGenerating) return;

    if (initialGeneratedPagesData.some(img => img.url)) {
      handleRegenerateAll();
      return;
    }

    if (!backgroundElement?.src) {
      alert('Por favor, carregue uma imagem de fundo global para a campanha.');
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

      // For the first generation, we only use the global background element.
      // Per-page customizations happen in the editor.
      return composeSingleImage({
        record,
        index: i,
        brandElements,
        fieldPositions,
        fieldStyles,
        fontScale,
        backgroundElement: backgroundElement, // Pass the global element
        aspectRatio,
      })
      .then(pageData => {
        setProgress(p => p + 1);
        // Persist the styles used for generation with the page data
        return {
          ...pageData,
          customFieldStyles: fieldStyles,
          customFieldPositions: fieldPositions,
        };
      })
      .catch(error => {
        console.error(`Erro ao gerar página para o registro ${i}:`, error);
        alert(`Erro ao gerar página para o registro ${i}: ${error.message}`);
        return null; // Retorna nulo para este item em caso de erro
      });
    });

    try {
      const pages = (await Promise.all(pagePromises)).filter(Boolean); // Filtra os nulos de erros ou cancelamentos
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
      await handleGenerateSinglePage(record, i);
      setProgress(p => p + 1);
    }

    setIsGenerating(false);
    setShowProgressModal(false);
  };

  const handleCancelGeneration = () => { isCancelledRef.current = true; };

  const handleResetPage = (index) => {
    const pageToReset = initialGeneratedPagesData.find(img => img.index === index);
    if (pageToReset && backgroundElement?.src) {
      // Use a cópia mais recente dos estilos/posições globais, não os customizados.
      regenerateSinglePage(
        index,
        pageToReset.record,
        backgroundElement, // Passa o elemento de fundo global
        fieldPositions, // Usando as posições de campo globais
        fieldStyles, // Usando os estilos de campo globais
        originalImageSize,
        brandElements,
        fontScale
      );
    } else {
      alert("Não foi possível resetar a página. A imagem de fundo principal não está disponível.");
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
    if (!pageData || !pageData.url) {
      alert('A página não está disponível para compartilhamento.');
      return;
    }
    try {
      const response = await fetch(pageData.url);
      const blob = await response.blob();
      const file = new File([blob], pageData.filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Compartilhar Página', text: `Confira a página: ${pageData.filename}` });
      } else {
        alert('Seu navegador não suporta o compartilhamento de arquivos.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Ocorreu um erro ao tentar compartilhar a página.');
        console.error("Share error:", error);
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
    const pageToEdit = initialGeneratedPagesData.find(img => img.index === index);
    if (!pageToEdit) {
      console.error(`[PGF] handleOpenGeneratedPageEditor: Could not find page in local 'initialGeneratedPagesData' state with index: ${index}.`);
      setShowGeneratedPageEditor(true);
      return;
    }
    setShowGeneratedPageEditor(true);
  };

  const handleCloseGeneratedPageEditor = () => {
    setShowGeneratedPageEditor(false);
    setEditingGeneratedPageIndex(null);
  };

  const handleSaveIndividualModifications = async (modifiedPageData) => {
    const { index: pageIndex } = modifiedPageData;
    handleCloseGeneratedPageEditor();

    try {
      const backgroundToUse = modifiedPageData.customBackgroundElement || backgroundElement;

      const newPageImageData = await regenerateSinglePage(
        pageIndex,
        modifiedPageData.record,
        backgroundToUse,
        modifiedPageData.fieldPositions,
        modifiedPageData.fieldStyles,
        null,
        modifiedPageData.brandElements,
        1
      );

      setGeneratedPagesData(currentPages =>
        currentPages.map(page => {
          if (page.index !== pageIndex) {
            return page;
          }
          return {
            ...page,
            record: modifiedPageData.record,
            customFieldPositions: modifiedPageData.fieldPositions,
            customFieldStyles: modifiedPageData.fieldStyles,
            customBrandElements: modifiedPageData.brandElements,
            fontScale: modifiedPageData.fontScale,
            customBackgroundElement: modifiedPageData.customBackgroundElement,
            ...newPageImageData,
          };
        })
      );

      if (onThumbnailRecordTextUpdate) {
        onThumbnailRecordTextUpdate(pageIndex, modifiedPageData.record);
      }
    } catch (error) {
      console.error(`Error during page regeneration for index ${pageIndex}:`, error);
      alert(`Failed to regenerate page: ${error.message}`);
    }
  };

  const regenerateSinglePage = async (index, record, backgroundElementToUse, positionsToUse, stylesToUse, customSize = null, elementsToUse = brandElements, fontScale = 1) => {
    if (!backgroundElementToUse?.src || !record || !positionsToUse || !stylesToUse || !fontsLoaded) {
      console.error('Pré-requisitos para regeneração não atendidos. Fontes, dados ou configurações faltando.');
      throw new Error('Pré-requisitos para regeneração não atendidos.');
    }
    // This function is now pure and returns the data, it does not set state.
    return composeSingleImage({
      record,
      index,
      backgroundElement: backgroundElementToUse,
      brandElements: elementsToUse,
      fieldPositions: positionsToUse,
      fieldStyles: stylesToUse,
      fontScale,
      aspectRatio,
    });
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
      reader.onload = (e) => {
        const newBgUrl = e.target.result;
        const pageToUpdate = initialGeneratedPagesData.find(img => img.index === replacingImageIndex);
        if (pageToUpdate) {
          // Clone the existing background element (custom or global) and just update the source.
          // This preserves all other properties like filters, shadows, etc.
          const baseElement = pageToUpdate.customBackgroundElement || backgroundElement;
          const newBackgroundElement = {
            ...baseElement,
            src: newBgUrl,
          };

          // Regenerate the page with the new background element object.
          regenerateSinglePage(
            replacingImageIndex,
            pageToUpdate.record,
            newBackgroundElement, // Pass the correct object
            pageToUpdate.customFieldPositions || fieldPositions,
            pageToUpdate.customFieldStyles || fieldStyles,
            null, // Let composer determine size from new image
            pageToUpdate.customBrandElements || brandElements,
            fontScale
          ).then(newlyGeneratedPage => {
             // After regeneration, update the state
             setGeneratedPagesData(currentPages => currentPages.map(p => {
               if (p.index === replacingImageIndex) {
                 // We need to merge the new URL/blob with the existing data,
                 // and critically, store the new custom background element.
                 return {
                   ...p,
                   ...newlyGeneratedPage,
                   customBackgroundElement: newBackgroundElement,
                 };
               }
               return p;
             }));
          }).catch(error => {
            console.error(`Error regenerating page ${replacingImageIndex} with new background:`, error);
            alert(`Falha ao substituir o fundo da página: ${error.message}`);
          });
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
    if (!googleAccessToken) {
      alert('Conexão com Google não está ativa. Por favor, faça login.');
      return;
    }
    if (isUploadingToDrive) return;

    setIsUploadingToDrive(true);
    setDriveResult(null);

    try {
      const folder = await createFolder(projectName, null, googleAccessToken);
      const contentFolder = await createFolder('Conteúdo', folder.id, googleAccessToken);

      const uploadResults = [];
      const sheetData = [];
      const allHeaders = Array.from(new Set(initialGeneratedPagesData.flatMap(img => Object.keys(img.record))));

      for (let i = 0; i < initialGeneratedPagesData.length; i++) {
        const pageData = initialGeneratedPagesData[i];
        try {
          const response = await fetch(pageData.dataUrl);
          const blob = await response.blob();
          const result = await uploadFile(blob, pageData.filename, contentFolder.id, googleAccessToken);
          uploadResults.push({ filename: pageData.filename, success: true, fileId: result.id });
          const row = [i + 1, `https://drive.google.com/file/d/${result.id}/view?usp=sharing`, ...allHeaders.map(header => pageData.record[header] || '')];
          sheetData.push(row);
        } catch (error) {
          uploadResults.push({ filename: pageData.filename, success: false, error: error.message });
        }
      }

      if (sheetData.length > 0) {
        const headers = ['Nº', 'Link do Arquivo', ...allHeaders];
        await createSpreadsheet(
          `Relação de Arquivos - ${projectName}`,
          [headers, ...sheetData],
          googleAccessToken,
          contentFolder.id
        );
      }

      setDriveResult({
        folderId: folder.id,
        folderName: projectName,
        uploads: uploadResults,
        successCount: uploadResults.filter(r => r.success).length,
        totalCount: uploadResults.length,
        contentFolderId: contentFolder.id
      });
    } catch (error) {
      console.error('Erro no upload para Google Drive:', error);
      alert(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Logic to determine props for the PageEditor
  const pageToEdit = initialGeneratedPagesData.find(p => p.index === editingGeneratedPageIndex);
  const editorPositions = pageToEdit?.customFieldPositions || fieldPositions;
  const editorStyles = pageToEdit?.customFieldStyles || fieldStyles;
  const editorBrandElements = pageToEdit?.customBrandElements !== undefined ? pageToEdit.customBrandElements : brandElements;
  const editorBackgroundElement = pageToEdit?.customBackgroundElement || backgroundElement;

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Geração de Páginas
          </Typography>

          {!fontsLoaded && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Carregando fontes... Aguarde antes de gerar as páginas.
            </Alert>
          )}

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                color="primary"
                onClick={generatePages}
                disabled={isGenerating || !fontsLoaded}
                startIcon={<ImageIcon />}
                fullWidth
              >
                {initialGeneratedPagesData.some(img => img.url) ? 'Regerar páginas' : 'Gerar Páginas'}
              </Button>
            </Grid>

            {initialGeneratedPagesData.some(img => img.url) && (
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  onClick={downloadAllPages}
                  startIcon={<Download />}
                  fullWidth
                >
                  Download Todas ({initialGeneratedPagesData.filter(img => img.url).length})
                </Button>
              </Grid>
            )}
          </Grid>

          {isGenerating && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Gerando páginas...
              </Typography>
            </Box>
          )}

          {initialGeneratedPagesData.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                <Google sx={{ mr: 1, verticalAlign: 'middle' }} />
                Integração Google Drive
              </Typography>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome do Projeto"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Certificados 2024"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Tooltip title={!isGoogleDriveConnected ? "Conecte-se ao Google Drive nas configurações para ativar esta opção" : ""}>
                    <span>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={uploadToGoogleDrive}
                        disabled={isUploadingToDrive || !isGoogleDriveConnected}
                        startIcon={<CloudUpload />}
                        fullWidth
                      >
                        {isUploadingToDrive ? 'Enviando...' : 'Enviar para Google Drive'}
                      </Button>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>

              {isUploadingToDrive && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Enviando para Google Drive...
                  </Typography>
                </Box>
              )}

              {driveResult && (
                <Alert
                  severity={driveResult.successCount === driveResult.totalCount ? "success" : "warning"}
                  sx={{ mt: 2 }}
                >
                  Upload concluído: {driveResult.successCount}/{driveResult.totalCount} arquivos enviados com sucesso.
                  {driveResult.successCount < driveResult.totalCount && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Alguns arquivos falharam no upload. Verifique sua conexão e tente novamente.
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>
          )}

          {initialGeneratedPagesData.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Páginas Geradas ({initialGeneratedPagesData.length})
              </Typography>

              <Grid container spacing={2}>
                {initialGeneratedPagesData.map((pageData, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                            {pageData.filename}
                          </Typography>
                        </Box>

<Box sx={{
                          width: '100%',
                          maxWidth: '100%',
                          height: 'auto',
                          maxHeight: '180px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '10px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          mb: 1,
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2), 0 6px 20px rgba(0, 0, 0, 0.19)',
                          cursor: 'pointer',
                          '&:hover img': {
                            transform: 'scale(1.03)',
                          },
                          '&:hover': {
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25), 0 10px 25px rgba(0, 0, 0, 0.22)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
                        }}
                        onClick={() => handleOpenGeneratedPageEditor(pageData, pageData.index)}
                        >
                          <img
                            key={index}
                            src={pageData.url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              display: 'block',
                              maxWidth: '100%',
                              maxHeight: '150px',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              transition: 'transform 0.3s ease-in-out',
                              boxShadow: 'inset 0 0 2px rgba(0,0,0,0.1)',
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
                           <Tooltip title="Regerar com IA">
                                <IconButton
                                    size="small"
                                    onClick={() => handleGenerateSinglePage(pageData.record, pageData.index)}
                                >
                                    <GeminiIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Resetar para Fundo Padrão">
                                <IconButton
                                    size="small"
                                    onClick={() => handleResetPage(pageData.index)}
                                >
                                    <SettingsBackupRestore />
                                </IconButton>
                            </Tooltip>
                          <Tooltip title="Editar Posições/Estilos">
                            <IconButton
                                size="small"
                                onClick={() => handleOpenGeneratedPageEditor(pageData, pageData.index)}
                            >
                                <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Substituir Fundo">
                            <IconButton
                                size="small"
                                onClick={() => handleReplacePageClick(pageData.index)}
                            >
                                <SwapHoriz />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                                size="small"
                                onClick={() => downloadPage(pageData)}
                            >
                                <Download />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Compartilhar">
                            <IconButton
                                size="small"
                                onClick={() => handleShare(pageData)}
                            >
                                <Share />
                            </IconButton>
                          </Tooltip>
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
        <DialogTitle>
          Preview - {selectedPreview?.filename}
          <IconButton onClick={closePreview} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedPreview && (
            <Box sx={{ textAlign: 'center' }}>
              <img src={selectedPreview.url} alt={selectedPreview.filename} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => downloadPage(selectedPreview)} startIcon={<Download />}>Download</Button>
          <Button onClick={closePreview}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {console.log('[PageGeneratorFrontendOnly] rendering PageEditor with props:', { showGeneratedPageEditor, initialGeneratedPagesData, editingGeneratedPageIndex, csvHeaders, fieldPositions, fieldStyles, brandElements, colorPalette, originalImageSize, standardsColors, backgroundElement })}
      <PageEditor
        open={showGeneratedPageEditor}
        onClose={handleCloseGeneratedPageEditor}
        pageData={pageToEdit}
        globalCsvHeaders={csvHeaders}
        initialFieldPositions={editorPositions}
        initialFieldStyles={editorStyles}
        brandElements={editorBrandElements}
        onSave={handleSaveIndividualModifications}
        colorPalette={colorPalette}
        originalImageSize={originalImageSize}
        standardsColors={standardsColors}
        globalBackgroundElement={editorBackgroundElement}
        aspectRatio={aspectRatio}
      />

      <input
        type="file"
        accept="image/png, image/jpeg"
        style={{ display: 'none' }}
        ref={individualImageInputRef}
        onChange={handleIndividualImageUpload}
      />
      <ProgressModal
        open={showProgressModal}
        progress={progress}
        total={csvData.length}
        onCancel={handleCancelGeneration}
        title="Gerando Páginas"
        progressText={`Gerando página ${progress} de ${csvData.length}...`}
      />
    </Box>
  );
};

export default PageGeneratorFrontendOnly;
