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
  backgroundImage,
  fieldPositions,
  fieldStyles,
  csvHeaders,
  colorPalette,
  setGeneratedPagesData,
  initialGeneratedPagesData,
  onThumbnailRecordTextUpdate,
  originalImageSize,
  imageFilters,
  brandElements,
  onBrandElementsChange,
  fontScale = 1,
  standardsColors,
  handleGenerateSinglePage, // Nova prop
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const isCancelledRef = useRef(false);
  const [generatedPages, setGeneratedPages] = useState(initialGeneratedPagesData || []);
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
    if (setGeneratedPagesData) {
      setGeneratedPagesData(generatedPages);
    }
  }, [generatedPages, setGeneratedPagesData]);

  useEffect(() => {
    if (initialGeneratedPagesData) {
      if (initialGeneratedPagesData !== generatedPages) {
         setGeneratedPages(initialGeneratedPagesData);
      }
    } else {
      if (generatedPages.length > 0) {
        setGeneratedPages([]);
      }
    }
  }, [initialGeneratedPagesData]);

  // Effect for regenerating thumbnails on load
  useEffect(() => {
    if (initialGeneratedPagesData && initialGeneratedPagesData.length > 0 && fontsLoaded) {
      const regenerateMissingThumbnails = async () => {
        const pagesToRegenerate = initialGeneratedPagesData.filter(img => img.record && img.backgroundImage && !img.url);

        if (pagesToRegenerate.length === 0) return;

        console.log(`[Thumbnail-Regen] Found ${pagesToRegenerate.length} pages missing thumbnails. Regenerating...`);

        const pagePromises = initialGeneratedPagesData.map(pageData => {
          // If the URL already exists, or it's not an page we should regenerate, return it as is.
          if (pageData.url || !pagesToRegenerate.some(r => r.index === pageData.index)) {
            return Promise.resolve(pageData);
          }

          // Define parameters for regeneration, falling back to global props.
          const positionsToUse = pageData.customFieldPositions || fieldPositions;
          const stylesToUse = pageData.customFieldStyles || fieldStyles;
          const elementsToUse = pageData.customBrandElements !== undefined ? pageData.customBrandElements : brandElements;

          // Call the composition function to regenerate the merged page
          return composeSingleImage({
            record: pageData.record,
            index: pageData.index,
            itemBackgroundImage: pageData.backgroundImage,
            imageFilters: pageData.customImageFilters || imageFilters, // Use custom filters if available
            brandElements: elementsToUse,
            fieldPositions: positionsToUse,
            fieldStyles: stylesToUse,
            fontScale: pageData.fontScale || 1, // Use custom font scale if available
          }).catch(error => {
            console.error(`[Thumbnail-Regen] Failed to regenerate thumbnail for index ${pageData.index}:`, error);
            return pageData; // On error, return the original data to not lose it
          });
        });

        const regeneratedPages = await Promise.all(pagePromises.map(async (promise, index) => {
          const newPageData = await promise;
          const originalPageData = initialGeneratedPagesData[index];
          // If regeneration failed, newPageData might be the original data already.
          if (newPageData === originalPageData) {
            return originalPageData;
          }
          // Merge new data (url, blob) with old data (custom styles/positions)
          return { ...originalPageData, ...newPageData };
        }));

        // Update state only if there are actual changes
        if (JSON.stringify(regeneratedPages) !== JSON.stringify(generatedPages)) {
          setGeneratedPages(regeneratedPages);
          console.log('[Thumbnail-Regen] Successfully regenerated thumbnails and updated state.');
        }
      };

      regenerateMissingThumbnails();
    }
  }, [initialGeneratedPagesData, fontsLoaded, fieldPositions, fieldStyles, imageFilters, brandElements]);


  const generatePages = async () => {
    if (isGenerating) return;

    // Se já existem páginas, o botão funciona como "Regerar Tudo"
    if (generatedPages.some(img => img.url)) {
      handleRegenerateAll();
      return;
    }

    // Lógica original para gerar pela primeira vez
    if ((!backgroundImage && initialGeneratedPagesData.some(img => !img.backgroundImage)) || csvData.length === 0) {
      alert('Por favor, carregue um arquivo CSV e uma imagem de fundo global, ou garanta que todas as páginas tenham um fundo individual.');
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

      const initialPageDataItem = initialGeneratedPagesData.find(img => img.index === i);
      const itemBackgroundImage = initialPageDataItem?.backgroundImage || backgroundImage;

      return composeSingleImage({
        record,
        index: i,
        itemBackgroundImage,
        imageFilters,
        brandElements,
        fieldPositions,
        fieldStyles,
        fontScale,
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
        setGeneratedPages(pages);
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
    const pageToReset = generatedPages.find(img => img.index === index);
    if (pageToReset && backgroundImage) {
      // Use a cópia mais recente dos estilos/posições globais, não os customizados.
      regenerateSinglePage(
        index,
        pageToReset.record,
        backgroundImage, // Usando a imagem de fundo global
        fieldPositions, // Usando as posições de campo globais
        fieldStyles, // Usando os estilos de campo globais
        originalImageSize,
        brandElements,
        fontScale,
        imageFilters
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
    generatedPages.forEach((pageData, index) => {
      setTimeout(() => downloadPage(pageData), index * 100);
    });
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedPreview(null);
  };

  const handleOpenGeneratedPageEditor = (pageFromClosure, index) => {
    setEditingGeneratedPageIndex(index);
    const pageToEdit = generatedPages.find(img => img.index === index);
    if (!pageToEdit) {
      console.error(`[PGF] handleOpenGeneratedPageEditor: Could not find page in local 'generatedPages' state with index: ${index}.`);
      setShowGeneratedPageEditor(true);
      return;
    }
    setShowGeneratedPageEditor(true);
  };

  const handleCloseGeneratedPageEditor = () => {
    setShowGeneratedPageEditor(false);
    setEditingGeneratedPageIndex(null);
  };

  const handleSaveIndividualModifications = (modifiedPageData) => {
    const { index: pageIndex } = modifiedPageData;

    const updatedPages = generatedPages.map(img => {
      if (img.index !== pageIndex) {
        return img;
      }
      // BUG FIX: The root of the "disappearing background" bug on save was here.
      // `modifiedPageData` comes from the editor and does NOT have a `backgroundImage` property.
      // The spread `{ ...img, ...modifiedPageData }` was overwriting `img.backgroundImage`
      // with `undefined`.
      // The fix is to manually construct the new object, EXPLICITLY preserving the
      // `backgroundImage` from the existing state (`img`).
      return {
        ...img, // Keep blob, url, etc.
        record: modifiedPageData.record,
        backgroundImage: img.backgroundImage, // Keep the original background!
        // Apply modifications from the editor
        customFieldPositions: modifiedPageData.fieldPositions,
        customFieldStyles: modifiedPageData.fieldStyles,
        customBrandElements: modifiedPageData.brandElements,
        fontScale: modifiedPageData.fontScale,
      };
    });

    setGeneratedPages(updatedPages);

    if (onThumbnailRecordTextUpdate) {
      onThumbnailRecordTextUpdate(pageIndex, modifiedPageData.record);
    }

    const pageToRegenerate = updatedPages.find(im => im.index === pageIndex);

    if (pageToRegenerate) {
      // Explicitly define the parameters to be used for regeneration,
      // falling back to global props if custom ones don't exist.
      const bgToUse = pageToRegenerate.backgroundImage || backgroundImage;
      const positionsToUse = pageToRegenerate.customFieldPositions || fieldPositions;
      const stylesToUse = pageToRegenerate.customFieldStyles || fieldStyles;
      const elementsToUse = pageToRegenerate.customBrandElements !== undefined ? pageToRegenerate.customBrandElements : brandElements;
      const sizeToUse = pageToRegenerate.customOriginalImageSize || originalImageSize;

      regenerateSinglePage(
        pageIndex,
        pageToRegenerate.record,
        bgToUse,
        positionsToUse,
        stylesToUse,
        sizeToUse,
        elementsToUse,
        modifiedPageData.fontScale || 1,
        modifiedPageData.imageFilters || imageFilters
      );
    }
    handleCloseGeneratedPageEditor();
  };

  const regenerateSinglePage = async (index, record, currentBackgroundImage, positionsToUse, stylesToUse, customSize = null, elementsToUse = brandElements, fontScale = 1, customImageFilters = imageFilters) => {
    if (!currentBackgroundImage || !record || !positionsToUse || !stylesToUse || !fontsLoaded) {
      alert('Pré-requisitos para regeneração não atendidos. Fontes, dados ou configurações faltando.');
      return;
    }
    try {
      const newPageData = await composeSingleImage({
        record,
        index,
        itemBackgroundImage: currentBackgroundImage,
        imageFilters: customImageFilters,
        brandElements: elementsToUse,
        fieldPositions: positionsToUse,
        fieldStyles: stylesToUse,
        fontScale,
      });

      setGeneratedPages(prevPages => {
        const updatedPages = prevPages.map(img => {
          if (img.index === index) {
            // The new object from composeSingleImage contains the new url, blob, etc.
            // We merge it with the existing `img` data to preserve all fields,
            // especially the `backgroundImage` which might be lost otherwise.
            return {
              ...img,
              ...newPageData,
              customFieldPositions: positionsToUse,
              customFieldStyles: stylesToUse, // Persist the styles used for regeneration
              customBrandElements: elementsToUse,
              customOriginalImageSize: customSize,
              backgroundImage: currentBackgroundImage, // Explicitly preserve the background used for regeneration
            };
          }
          return img;
        });
        return updatedPages;
      });
    } catch (error) {
      console.error(`Erro na regeneração da página (índice ${index}):`, error);
      alert(`Erro na regeneração da página (índice ${index}): ${error.message}`);
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
      reader.onload = (e) => {
        const newBgUrl = e.target.result;
        const pageToUpdate = generatedPages.find(img => img.index === replacingImageIndex);
        if (pageToUpdate) {
          const img = new Image();
          img.onload = () => {
            const newSize = { width: img.width, height: img.height };
            regenerateSinglePage(replacingImageIndex, pageToUpdate.record, newBgUrl, pageToUpdate.customFieldPositions || fieldPositions, pageToUpdate.customFieldStyles || fieldStyles, newSize, pageToUpdate.customBrandElements || brandElements, fontScale);
          };
          img.onerror = () => {
            console.error('Failed to load the new background page to get its dimensions.');
            regenerateSinglePage(replacingImageIndex, pageToUpdate.record, newBgUrl, pageToUpdate.customFieldPositions || fieldPositions, pageToUpdate.customFieldStyles || fieldStyles, null, pageToUpdate.customBrandElements || brandElements, fontScale);
          };
          img.src = newBgUrl;
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
    if (generatedPages.length === 0) {
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
      const allHeaders = Array.from(new Set(generatedPages.flatMap(img => Object.keys(img.record))));

      for (let i = 0; i < generatedPages.length; i++) {
        const pageData = generatedPages[i];
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
                {generatedPages.some(img => img.url) ? 'Regerar páginas' : 'Gerar Páginas'}
              </Button>
            </Grid>

            {generatedPages.some(img => img.url) && (
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  onClick={downloadAllPages}
                  startIcon={<Download />}
                  fullWidth
                >
                  Download Todas ({generatedPages.filter(img => img.url).length})
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

          {generatedPages.length > 0 && (
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

          {generatedPages.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Páginas Geradas ({generatedPages.length})
              </Typography>

              <Grid container spacing={2}>
                {generatedPages.map((pageData, index) => (
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

      {console.log('[PageGeneratorFrontendOnly] rendering MemoizedPageEditor with props:', { showGeneratedPageEditor, generatedPages, editingGeneratedPageIndex, csvHeaders, fieldPositions, fieldStyles, brandElements, colorPalette, backgroundImage, originalImageSize, standardsColors, imageFilters })}
      <MemoizedPageEditor
        showGeneratedPageEditor={showGeneratedPageEditor}
        handleCloseGeneratedPageEditor={handleCloseGeneratedPageEditor}
        generatedPages={generatedPages}
        editingGeneratedPageIndex={editingGeneratedPageIndex}
        csvHeaders={csvHeaders}
        fieldPositions={fieldPositions}
        fieldStyles={fieldStyles}
        brandElements={brandElements}
        handleSaveIndividualModifications={handleSaveIndividualModifications}
        colorPalette={colorPalette}
        backgroundImage={backgroundImage}
        originalImageSize={originalImageSize}
        imageFilters={imageFilters}
        standardsColors={standardsColors}
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
