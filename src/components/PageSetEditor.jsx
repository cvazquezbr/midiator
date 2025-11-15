import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, Typography, Grid, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip, Alert, FormControl, InputLabel, Select, MenuItem, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';
import { useMediaQuery, useTheme } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { safeDeepClone } from '../lib/utils';
import PageSetPageEditor from './PageSetPageEditor';
import FieldsEditor from './FieldsEditor';
import PaletteSelector from './PaletteSelector';
import AspectRatioSelector from './ui/AspectRatioSelector';

// Helper function to expand fields based on quantity
const expandFields = (fields) => {
  const expanded = [];
  fields.forEach(field => {
    if (field.quantity > 1) {
      for (let i = 1; i <= field.quantity; i++) {
        expanded.push({ ...field, name: `${field.name} ${i}` });
      }
    } else {
      expanded.push(field);
    }
  });
  return expanded;
};


const PageSetEditor = ({
  pageSet,
  onPageSetChange,
  isSaving,
  pendingAssets,
  onPendingAssetsChange,
  palettes = [],
  paletteColors,
}) => {
  const [editingPage, setEditingPage] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);
  const [isFieldsEditorOpen, setIsFieldsEditorOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const gridRef = React.useRef();

  const pages = useMemo(() => {
    const pagesData = pageSet?.page_set_data?.pages;
    return Array.isArray(pagesData) ? pagesData : [];
  }, [pageSet]);

  const fields = useMemo(() => {
    const fieldsData = pageSet?.page_set_data?.fields;
    return Array.isArray(fieldsData) ? fieldsData : [];
  }, [pageSet]);

  const expandedFieldNames = useMemo(() => expandFields(fields).map(f => f.name), [fields]);

  const aspectRatio = useMemo(() => pageSet?.page_set_data?.aspectRatio || '1:1', [pageSet]);

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
      record: {},
    };
    setEditingPage(newPage);
    setIsEditorOpen(true);
  };

  const handleEditPage = (page) => {
    setEditingPage(page);
    setIsEditorOpen(true);
  };

  const handleSavePage = ({ pageData, thumbnailBlob }) => {
    const newPages = [...pages];
    const existingIndex = newPages.findIndex(p => p.index === pageData.index);

    const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
    const updatedPageData = { ...pageData, thumbnailUrl };

    onPendingAssetsChange({ ...pendingAssets, [thumbnailUrl]: thumbnailBlob });

    if (existingIndex > -1) {
      newPages[existingIndex] = updatedPageData;
    } else {
      newPages.push(updatedPageData);
    }

    const currentPageSetData = pageSet.page_set_data || {};
    onPageSetChange({
      ...pageSet,
      page_set_data: {
        ...currentPageSetData,
        pages: newPages,
      },
    });

    setIsEditorOpen(false);
    setEditingPage(null);
  };

  const handleDeletePage = () => {
    if (pageToDelete === null) return;
    const newPages = pages.filter(p => p.index !== pageToDelete.index);
    const currentPageSetData = pageSet.page_set_data || {};
    onPageSetChange({
      ...pageSet,
      page_set_data: {
        ...currentPageSetData,
        pages: newPages,
      },
    });
    setPageToDelete(null);
  };

  const handleAspectRatioChange = (event) => {
    const newAspectRatio = event.target.value;
    const currentPageSetData = pageSet.page_set_data || {};
    onPageSetChange({
      ...pageSet,
      page_set_data: {
        ...currentPageSetData,
        aspectRatio: newAspectRatio,
      },
    });
  };

  const handleFieldsChange = (newFields) => {
    const currentPageSetData = pageSet.page_set_data || {};
    onPageSetChange({
      ...pageSet,
      page_set_data: {
        ...currentPageSetData,
        fields: newFields,
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
          <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome do Conjunto de Páginas"
                value={pageSet.name || ''}
                onChange={(e) => onPageSetChange({ ...pageSet, name: e.target.value })}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <AspectRatioSelector
                value={aspectRatio}
                onChange={handleAspectRatioChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <PaletteSelector
                palettes={palettes}
                value={pageSet.page_set_data?.palette_id || ''}
                onChange={(e) => {
                  const currentPageSetData = pageSet.page_set_data || {};
                  onPageSetChange({
                    ...pageSet,
                    page_set_data: {
                      ...currentPageSetData,
                      palette_id: e.target.value,
                    },
                  });
                }}
                disabled={isSaving}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>Campos Definidos</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  {fields.map((field) => <Chip key={field.id || field.name} label={`${field.name} (${field.quantity})`} />)}
                  <Button onClick={() => setIsFieldsEditorOpen(true)}>Editar Campos</Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNewPage}
              disabled={fields.length === 0}
            >
              Adicionar Página
            </Button>
          </Box>
          {fields.length === 0 && <Alert severity="warning">Defina os campos do conjunto de páginas antes de adicionar uma página.</Alert>}

          {pages.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Este conjunto de páginas está vazio. Clique em "Adicionar Página" para começar.
            </Alert>
          ) : (
            <Box sx={{ mt: 2 }}>
            {isMobile ? (
              <Swiper
                spaceBetween={10}
                slidesPerView={'auto'}
              >
                {pages.map((page) => (
                  <SwiperSlide key={page.index} style={{ width: '80%', maxWidth: '350px' }}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: String(aspectRatio).replace(':', ' / '),
                        cursor: 'pointer',
                        overflow: 'hidden',
                        backgroundColor: '#f0f0f0',
                        borderRadius: 1,
                        '&:hover .overlay': {
                          opacity: 1,
                        },
                        '&:hover img': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      {page.thumbnailUrl ? (
                        <img
                          src={page.thumbnailUrl}
                          alt={`Thumbnail for page ${page.index}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease-in-out',
                          }}
                        />
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                        </Box>
                      )}
                      <Box
                        className="overlay"
                        onClick={() => handleEditPage(page)}
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
                        <Typography variant="body2" noWrap>
                          {page.record?.Título || page.record?.title || `Página ${page.index}`}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Tooltip title="Editar">
                            <IconButton size="small" sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); handleEditPage(page); }}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); setPageToDelete(page); }}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div ref={gridRef} className="grid desktop-grid">
                <div className="grid-sizer" />
                {pages.map((page) => (
                  <div className="grid-item" key={page.index}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: String(aspectRatio).replace(':', ' / '),
                        cursor: 'pointer',
                        overflow: 'hidden',
                        backgroundColor: '#f0f0f0',
                        borderRadius: 1,
                        '&:hover .overlay': {
                          opacity: 1,
                        },
                        '&:hover img': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      {page.thumbnailUrl ? (
                        <img
                          src={page.thumbnailUrl}
                          alt={`Thumbnail for page ${page.index}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease-in-out',
                          }}
                        />
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                        </Box>
                      )}
                      <Box
                        className="overlay"
                        onClick={() => handleEditPage(page)}
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
                        <Typography variant="body2" noWrap>
                          {page.record?.Título || page.record?.title || `Página ${page.index}`}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Tooltip title="Editar">
                            <IconButton size="small" sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); handleEditPage(page); }}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); setPageToDelete(page); }}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </div>
                ))}
              </div>
            )}
            </Box>
          )}
        </CardContent>
      </Card>

      {isEditorOpen && (
        <PageSetPageEditor
          open={isEditorOpen}
          onClose={() => { setIsEditorOpen(false); setEditingPage(null); }}
          pageData={safeDeepClone(editingPage)}
          onSave={handleSavePage}
          aspectRatio={aspectRatio}
          pageSetFields={expandFields(fields)} // Pass the expanded fields to the editor
          editorType="pageSet"
          paletteColors={paletteColors}
        />
      )}

      <FieldsEditor
        open={isFieldsEditorOpen}
        onClose={() => setIsFieldsEditorOpen(false)}
        fields={fields}
        onSave={handleFieldsChange}
      />

      <Dialog open={!!pageToDelete} onClose={() => setPageToDelete(null)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent><Typography>Tem certeza que deseja excluir esta página?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setPageToDelete(null)}>Cancelar</Button>
          <Button onClick={handleDeletePage} color="error">Excluir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PageSetEditor;
