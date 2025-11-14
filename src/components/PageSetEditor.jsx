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
import { safeDeepClone } from '../lib/utils';
import PageSetPageEditor from './PageSetPageEditor';
import FieldsEditor from './FieldsEditor';

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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="palette-label">Paleta de Cores</InputLabel>
                <Select
                  labelId="palette-label"
                  value={pageSet.page_set_data?.palette_id || ''}
                  label="Paleta de Cores"
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
                >
                  <MenuItem value=""><em>Nenhuma</em></MenuItem>
                  {palettes.map((palette) => (
                    <MenuItem key={palette.id} value={palette.id}>{palette.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
            <div ref={gridRef} className="grid">
              <div className="grid-sizer" />
              {pages.map((page) => (
                <div className="grid-item" key={page.index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" noWrap gutterBottom>
                        {page.record?.Título || page.record?.title || `Página ${page.index}`}
                      </Typography>
                      <Box sx={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: String(aspectRatio).replace(':', ' / '),
                        backgroundColor: '#f0f0f0',
                        borderRadius: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {page.thumbnailUrl ? (
                          <img src={page.thumbnailUrl} alt={`Thumbnail for page ${page.index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => handleEditPage(page)}><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="Excluir"><IconButton size="small" onClick={() => setPageToDelete(page)}><DeleteIcon /></IconButton></Tooltip>
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
