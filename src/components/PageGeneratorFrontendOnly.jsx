import React, { useState, useRef, useEffect } from 'react';
import ProgressModal from './ProgressModal';
import {
  Box, Button, Typography, Card, CardContent, Grid, LinearProgress, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, TextField, Tooltip, CircularProgress, Divider,
} from '@mui/material';
import {
  Download, Close, Image, CloudUpload, Google, Edit, SwapHoriz, Share, AutoAwesomeOutlined as GeminiIcon, SettingsBackupRestore, Delete, AutoFixHigh,
} from '@mui/icons-material';
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';
import './PageGenerator.css';
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
  const [pageToSave, setPageToSave] = useState(null);
  const gridRef = useRef(null);

  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingPromptIndex, setEditingPromptIndex] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');

  useEffect(() => {
    if (!pageToSave) return;

    const performSave = async () => {
      try {
        const { pageTemplate: customPageTemplate, ...restOfModifiedData } = pageToSave;

        const regenContext = {
          ...campaignState,
          record: restOfModifiedData.csvData[0],
          index: restOfModifiedData.index,
          pageTemplate: customPageTemplate,
          brandElements: restOfModifiedData.brandElements,
          fieldPositions: restOfModifiedData.fieldPositions,
          fieldStyles: restOfModifiedData.fieldStyles,
          fontScale: 1,
        };

        if (!regenContext.pageTemplate || !regenContext.record) {
          toast.error("Dados da página ou template ausentes. Não foi possível salvar.");
          return;
        }

        const newPageImageData = await regenerateSinglePage(regenContext);
        const managedUrl = addPendingAsset(newPageImageData.blob);

        if (!managedUrl) {
          toast.error('Falha ao registrar a imagem da página modificada.');
          return;
        }

        setCampaignState(current => ({
          ...current,
          generatedPagesData: current.generatedPagesData.map(page => {
            if (page.index !== restOfModifiedData.index) return page;
            return {
              ...page,
              record: restOfModifiedData.csvData[0],
              customPageTemplate,
              customBrandElements: restOfModifiedData.brandElements,
              customFieldPositions: restOfModifiedData.fieldPositions,
              customFieldStyles: restOfModifiedData.fieldStyles,
              url: managedUrl,
              filename: newPageImageData.filename,
              blob: undefined,
              dataUrl: null,
            };
          }),
        }));

        toast.success(`Página #${pageToSave.index + 1} salva.`);
      } catch (error) {
        console.error('[PageGenerator] Erro ao salvar modificações da página:', error);
        toast.error(`Falha ao regenerar a página: ${error.message}`);
      } finally {
        setPageToSave(null);
      }
    };

    performSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageToSave]);

  useEffect(() => {
    if (gridRef.current) {
      const msnry = new Masonry(gridRef.current, {
        itemSelector: '.grid-item',
        columnWidth: '.grid-sizer',
        percentPosition: true,
      });

      imagesLoaded(gridRef.current).on('progress', () => {
        msnry.layout();
      });
    }
  }, [generatedPagesData]);

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

  const handleUploadToDrive = async () => {
    if (!googleAccessToken || generatedPagesData.length === 0 || !projectName) {
      toast.error('Pré-requisitos para upload não atendidos.');
      return;
    }

    setIsUploadingToDrive(true);
    setDriveResult(null);
    toast.info('Iniciando exportação para o Google Drive...');

    try {
      const projectFolder = await createFolder(projectName);
      if (!projectFolder?.id) throw new Error('Não foi possível criar a pasta do projeto.');
      toast.success(`Pasta do projeto "${projectName}" criada.`);

      const pagesFolder = await createFolder('paginas', projectFolder.id);
      if (!pagesFolder?.id) throw new Error('Não foi possível criar a subpasta de páginas.');

      const uploadedFileNames = {};

      for (let i = 0; i < generatedPagesData.length; i++) {
        const pageData = generatedPagesData[i];
        toast.info(`Fazendo upload da página ${i + 1}/${generatedPagesData.length}...`);

        let blob;
        if (pageData.url.startsWith('blob:')) {
          blob = pendingAssets[pageData.url];
        } else if (pageData.url.startsWith('data:')) {
          blob = dataURLtoBlob(pageData.url);
        } else {
          const response = await fetch(`/api/asset-proxy?url=${encodeURIComponent(pageData.url)}`);
          if (!response.ok) throw new Error(`Falha ao buscar a imagem da página ${i + 1}`);
          blob = await response.blob();
        }

        if (blob) {
          const uploadedFile = await uploadFile(blob, pageData.filename, pagesFolder.id);
          uploadedFileNames[pageData.index] = uploadedFile.name;
        } else {
          uploadedFileNames[pageData.index] = 'ERRO: BLOB NÃO ENCONTRADO';
        }
      }

      toast.info('Criando planilha de controle...');
      const spreadsheetData = [
        ['imagem', ...csvData[0] ? Object.keys(csvData[0]) : []],
        ...csvData.map((row, index) => [
          uploadedFileNames[index] || '',
          ...Object.values(row)
        ])
      ];

      const spreadsheet = await createSpreadsheet(
        `controle_${projectName}`,
        spreadsheetData,
        projectFolder.id
      );

      setDriveResult({
        folderUrl: `https://drive.google.com/drive/folders/${projectFolder.id}`,
        spreadsheetUrl: spreadsheet.spreadsheetUrl,
      });

      toast.success('Exportação para o Google Drive concluída com sucesso!');

    } catch (error) {
      console.error('Falha na exportação para o Google Drive:', error);
      toast.error(`Erro na exportação: ${error.message}`);
    } finally {
      setIsUploadingToDrive(false);
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

  const handleSaveIndividualModifications = (modifiedPageData) => {
    handleCloseGeneratedPageEditor();
    setPageToSave(modifiedPageData);
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

  const handleOpenPromptEditor = (index) => {
    const pageData = generatedPagesData.find(p => p.index === index);
    if (pageData && pageData.record) {
      setCurrentPrompt(pageData.record.prompt_imagem_carrossel || '');
      setEditingPromptIndex(index);
      setIsPromptEditorOpen(true);
    } else {
      toast.error("Não foi possível encontrar os dados da página para editar o prompt.");
    }
  };

  const handleClosePromptEditor = () => {
    setIsPromptEditorOpen(false);
    setEditingPromptIndex(null);
    setCurrentPrompt('');
  };

  const handleSavePrompt = () => {
    if (editingPromptIndex === null) {
      toast.error("Nenhuma página selecionada para salvar o prompt.");
      return;
    }

    const updatedGeneratedPagesData = generatedPagesData.map((page) => {
      if (page.index === editingPromptIndex) {
        return {
          ...page,
          record: {
            ...page.record,
            prompt_imagem_carrossel: currentPrompt,
          },
        };
      }
      return page;
    });

    const updatedCsvData = csvData.map((record, index) => {
      if (index === editingPromptIndex) {
        return {
          ...record,
          prompt_imagem_carrossel: currentPrompt,
        };
      }
      return record;
    });

    setCampaignState({
      generatedPagesData: updatedGeneratedPagesData,
      csvData: updatedCsvData,
    });

    toast.success("Prompt atualizado com sucesso!");
    handleClosePromptEditor();
  };

  const pageToEdit = (generatedPagesData || []).find(p => p.index === editingGeneratedPageIndex);

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom><Image sx={{ mr: 1, verticalAlign: 'middle' }} />Páginas</Typography>
          {!fontsLoaded && <Alert severity="info" sx={{ mb: 2 }}>Carregando fontes...</Alert>}
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
              <div ref={gridRef} className="grid">
                <div className="grid-sizer" />
                {generatedPagesData.map((pageData, index) => (
                  <div className="grid-item" key={pageData.index}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: String(aspectRatio || '1/1').replace(':', ' / '),
                        cursor: 'pointer',
                        overflow: 'hidden',
                        '&:hover .overlay': {
                          opacity: 1,
                        },
                        '&:hover img': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      <img
                        src={pageData.url}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: regeneratingIndex === index ? 0.5 : 1,
                          transition: 'transform 0.3s ease-in-out',
                        }}
                      />
                      {regeneratingIndex === index && <CircularProgress size={40} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-20px', ml: '-20px', zIndex: 2 }} />}

                      <Box
                        className="overlay"
                        onClick={() => handleOpenGeneratedPageEditor(pageData.index)}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          p: 1,
                          opacity: 0,
                          transition: 'opacity 0.3s ease-in-out',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip label={`#${index + 1}`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white', mr: 1 }} />
                          <Typography variant="body2" noWrap>
                            {pageData.record?.Título || 'Página sem título'}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                          {[
                            { title: 'Regerar com IA', icon: <GeminiIcon />, action: (e) => { e.stopPropagation(); (async () => { setRegeneratingIndex(index); await handleGenerateSinglePage(pageData.record, pageData.index, pageData.fontScale || 1); setRegeneratingIndex(null); })(); }, disabled: regeneratingIndex !== null },
                            { title: 'Editar Prompt de Imagem', icon: <AutoFixHigh />, action: (e) => { e.stopPropagation(); handleOpenPromptEditor(pageData.index); } },
                            { title: 'Resetar', icon: <SettingsBackupRestore />, action: (e) => { e.stopPropagation(); handleResetPage(pageData.index); } },
                            { title: 'Editar', icon: <Edit />, action: (e) => { e.stopPropagation(); handleOpenGeneratedPageEditor(pageData.index); } },
                            { title: 'Substituir Fundo', icon: <SwapHoriz />, action: (e) => { e.stopPropagation(); handleReplacePageClick(pageData.index); } },
                            { title: 'Download', icon: <Download />, action: (e) => { e.stopPropagation(); downloadPage(pageData); } },
                            { title: 'Compartilhar', icon: <Share />, action: (e) => { e.stopPropagation(); handleShare(pageData); } },
                          ].map(item => (
                            <Tooltip title={item.title} key={item.title}>
                              <span>
                                <IconButton size="small" onClick={item.action} disabled={item.disabled} sx={{ color: 'white' }}>
                                  {item.icon}
                                </IconButton>
                              </span>
                            </Tooltip>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </div>
                ))}
              </div>
            </Box>
          )}
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
          {generatedPagesData.some(img => img.url) && (
            <Box sx={{ mt: 2, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom><Google sx={{ mr: 1, verticalAlign: 'middle' }} />Exportar para Google Drive</Typography>
              <TextField
                label="Nome do Projeto no Drive"
                variant="outlined"
                fullWidth
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                sx={{ mb: 1 }}
                disabled={isUploadingToDrive}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleUploadToDrive}
                disabled={!googleAccessToken || isUploadingToDrive || !projectName}
                startIcon={isUploadingToDrive ? <CircularProgress size={20} /> : <CloudUpload />}
                fullWidth
              >
                {isUploadingToDrive ? 'Exportando...' : 'Exportar Páginas e Planilha'}
              </Button>
              {!googleAccessToken && <Alert severity="warning" sx={{ mt: 1 }}>Faça login com o Google para habilitar a exportação.</Alert>}
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
          baseTemplate={{
            pageTemplate,
            fieldPositions,
            fieldStyles,
            brandElements,
            csvHeaders: campaignState.csvHeaders, // Pass the headers
          }}
          onSave={handleSaveIndividualModifications}
          aspectRatio={aspectRatio}
          originalImageSize={originalImageSize}
          onOpenImageGallery={() => onOpenImageGallery(editingGeneratedPageIndex)}
          addPendingAsset={addPendingAsset}
          csvData={csvData}
          currentPreviewIndex={editingGeneratedPageIndex}
        />
      )}
      <input type="file" accept="image/*" style={{ display: 'none' }} ref={individualImageInputRef} onChange={handleIndividualImageUpload} />
      <Dialog open={isPromptEditorOpen} onClose={handleClosePromptEditor} fullWidth maxWidth="sm">
        <DialogTitle>Editar Prompt de Imagem</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Prompt"
            type="text"
            fullWidth
            multiline
            rows={8}
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePromptEditor}>Cancelar</Button>
          <Button onClick={handleSavePrompt} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
      <ProgressModal open={showProgressModal} progress={progress} total={csvData.length} onCancel={handleCancelGeneration} title="Gerando Páginas" />
      <Dialog open={!!driveResult} onClose={() => setDriveResult(null)}>
        <DialogTitle>Exportação para Google Drive Concluída</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Seus arquivos foram exportados com sucesso.</Typography>
          <Button variant="contained" href={driveResult?.folderUrl} target="_blank" fullWidth sx={{ mb: 1 }}>
            Abrir Pasta de Páginas
          </Button>
          <Button variant="contained" href={driveResult?.spreadsheetUrl} target="_blank" fullWidth>
            Abrir Planilha de Controle
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDriveResult(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PageGeneratorFrontendOnly;
