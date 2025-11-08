import React, {
  useState, useEffect, useMemo,
} from 'react';
import {
  Box, Button, Typography, Grid, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip, Alert, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  DriveFileRenameOutline as DriveFileRenameOutlineIcon,
} from '@mui/icons-material';
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';
import { useCampaign } from '../context/CampaignContext';
import { safeDeepClone } from '../lib/utils';
import PageEditor from './PageEditor';
import { getDimensionsFromAspectRatio } from '../utils/imageComposer';

const DEFAULT_IMAGE_SIZE = { width: 720, height: 720 };

const PageSetEditor = ({
  pageSet,
  onPageSetChange,
  onOpenImageGallery,
  isSaving,
}) => {
  const { campaignState, addPendingAsset } = useCampaign();
  const [editingPage, setEditingPage] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState(pageSet.name || '');

  const gridRef = React.useRef();

  const pages = useMemo(() => pageSet?.page_set_data?.pages || [], [pageSet]);
  const aspectRatio = useMemo(() => pageSet?.page_set_data?.aspectRatio || '1:1', [pageSet]);

  const imageSize = useMemo(() => getDimensionsFromAspectRatio(aspectRatio) || DEFAULT_IMAGE_SIZE, [aspectRatio]);

  useEffect(() => {
    if (gridRef.current && pages.length > 0) {
      const msnry = new Masonry(gridRef.current, {
        itemSelector: '.grid-item',
        columnWidth: '.grid-sizer',
        percentPosition: true,
      });

      imagesLoaded(gridRef.current).on('progress', () => {
        msnry.layout();
      });
    }
  }, [pages]);

  const handleAddNewPage = () => {
    const newPage = {
      index: pages.length > 0 ? Math.max(...pages.map(p => p.index)) + 1 : 0,
      record: { Título: `Nova Página ${pages.length + 1}` },
      url: null, // No initial image
      customPageTemplate: {
        backgroundColor: '#FFFFFF',
        elements: [],
        images: [],
      },
      // Ensure all other custom fields are initialized
      customBrandElements: campaignState.brandElements,
      customFieldPositions: campaignState.fieldPositions,
      customFieldStyles: campaignState.fieldStyles,
      fontScale: 1,
    };
    setEditingPage(newPage);
    setIsEditorOpen(true);
  };

  const handleEditPage = (page) => {
    setEditingPage(page);
    setIsEditorOpen(true);
  };

  const handleSavePage = (editedPageData) => {
    const { pageTemplate: customPageTemplate, ...restOfModifiedData } = editedPageData;

    const finalPageData = {
      ...restOfModifiedData,
      customPageTemplate,
    };

    const newPages = [...pages];
    const existingIndex = newPages.findIndex(p => p.index === finalPageData.index);

    if (existingIndex > -1) {
      newPages[existingIndex] = finalPageData;
    } else {
      newPages.push(finalPageData);
    }

    onPageSetChange({
      ...pageSet,
      page_set_data: {
        ...pageSet.page_set_data,
        pages: newPages,
      },
    });

    setIsEditorOpen(false);
    setEditingPage(null);
  };

  const handleDeletePage = () => {
    if (pageToDelete === null) return;
    const newPages = pages.filter(p => p.index !== pageToDelete.index);
    onPageSetChange({
      ...pageSet,
      page_set_data: {
        ...pageSet.page_set_data,
        pages: newPages,
      },
    });
    setPageToDelete(null);
  };

  const handleRename = () => {
    onPageSetChange({ ...pageSet, name: newName });
    setIsRenameDialogOpen(false);
  };

  const handleAspectRatioChange = (event) => {
    const newAspectRatio = event.target.value;
    onPageSetChange({
      ...pageSet,
      page_set_data: {
        ...pageSet.page_set_data,
        pages: pageSet?.page_set_data?.pages || [],
        aspectRatio: newAspectRatio,
      },
    });
  };

  if (!pageSet) {
    return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
            <ImageIcon sx={{ fontSize: 60, color: 'grey.400' }} />
            <Typography variant="h6" color="text.secondary">
                Selecione ou crie um conjunto de páginas para começar.
            </Typography>
        </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5">
                {pageSet.name}
              </Typography>
              <IconButton onClick={() => { setNewName(pageSet.name); setIsRenameDialogOpen(true); }} size="small">
                <DriveFileRenameOutlineIcon />
              </IconButton>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNewPage}
            >
              Adicionar Página
            </Button>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="aspect-ratio-label">Proporção</InputLabel>
                <Select
                  labelId="aspect-ratio-label"
                  value={aspectRatio}
                  label="Proporção"
                  onChange={handleAspectRatioChange}
                  disabled={isSaving}
                >
                  <MenuItem value="1:1">Quadrado (1:1)</MenuItem>
                  <MenuItem value="4:5">Retrato (4:5)</MenuItem>
                  <MenuItem value="16:9">Paisagem (16:9)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>


          {pages.length === 0 ? (
             <Alert severity="info" sx={{ mt: 2 }}>
                Este conjunto de páginas está vazio. Clique em "Adicionar Página" para começar a criar.
            </Alert>
          ) : (
            <div ref={gridRef} className="grid">
              <div className="grid-sizer"></div>
              {pages.map((page) => (
                <div className="grid-item" key={page.index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" noWrap gutterBottom>
                        {page.record?.Título || `Página ${page.index}`}
                      </Typography>
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: String(aspectRatio).replace(':', ' / '),
                          backgroundColor: '#f0f0f0',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        {page.url ? (
                          <img
                            src={page.url}
                            alt={`Preview ${page.index}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                            </Box>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => handleEditPage(page)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" onClick={() => setPageToDelete(page)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isEditorOpen && (
        <PageEditor
          open={isEditorOpen}
          onClose={() => { setIsEditorOpen(false); setEditingPage(null); }}
          pageData={safeDeepClone(editingPage)}
          baseTemplate={{
            pageTemplate: editingPage.customPageTemplate,
            fieldPositions: editingPage.customFieldPositions,
            fieldStyles: editingPage.customFieldStyles,
            brandElements: editingPage.customBrandElements,
          }}
          onSave={handleSavePage}
          aspectRatio={aspectRatio}
          originalImageSize={imageSize}
          onOpenImageGallery={() => onOpenImageGallery(editingPage.index)}
          addPendingAsset={addPendingAsset}
        />
      )}

      <Dialog open={!!pageToDelete} onClose={() => setPageToDelete(null)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja excluir esta página?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPageToDelete(null)}>Cancelar</Button>
          <Button onClick={handleDeletePage} color="error">Excluir</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)}>
        <DialogTitle>Renomear Conjunto de Páginas</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Novo nome"
            type="text"
            fullWidth
            variant="standard"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRenameDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleRename}>Renomear</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PageSetEditor;
