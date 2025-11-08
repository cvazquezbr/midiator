import React, { useState, useRef, useEffect } from 'react';
import {
  Typography, Box, Button, Card, CardContent, Grid, IconButton,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';
import { toast } from 'sonner';

import PageEditor from './PageEditor'; // O editor de página individual
import { useCampaign } from '../context/CampaignContext';
import './PageGenerator.css';

const newPageTemplate = {
  record: { 'Título': 'Nova Página' },
  customPageTemplate: {
    backgroundColor: '#FFFFFF',
    images: [],
    texts: [],
    shapes: [],
  },
};

const PageSetEditor = ({ name, pageSetData, onNameChange, onPageSetDataChange, pendingAssets, onPendingAssetsChange }) => {
  const { campaignState, addPendingAsset } = useCampaign();
  const [editingPageIndex, setEditingPageIndex] = useState(null);
  const gridRef = useRef(null);

  const pages = pageSetData?.pages || [];

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
      ...newPageTemplate,
      index: pages.length,
    };
    onPageSetDataChange({
      ...pageSetData,
      pages: [...pages, newPage],
    });
    toast.success('Nova página adicionada.');
  };

  const handleDeletePage = (indexToDelete) => {
    if (window.confirm('Tem certeza que deseja excluir esta página?')) {
      const updatedPages = pages.filter((_, index) => index !== indexToDelete)
                                .map((page, index) => ({ ...page, index }));
      onPageSetDataChange({
        ...pageSetData,
        pages: updatedPages,
      });
      toast.success('Página excluída.');
    }
  };

  const handleOpenEditor = (index) => {
    setEditingPageIndex(index);
  };

  const handleCloseEditor = () => {
    setEditingPageIndex(null);
  };

  const handleSaveChangesFromEditor = (modifiedPageData) => {
    const updatedPages = pages.map((page, index) =>
      index === modifiedPageData.index ? modifiedPageData : page
    );
    onPageSetDataChange({
      ...pageSetData,
      pages: updatedPages,
    });
  };

  const pageToEdit = (editingPageIndex !== null) ? pages[editingPageIndex] : null;

  // Define um template base vazio, já que PageSets são independentes
  const baseTemplate = {
      pageTemplate: {},
      fieldPositions: {},
      fieldStyles: {},
      brandElements: []
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{name || 'Conjunto de Páginas'}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNewPage}>
          Adicionar Nova Página
        </Button>
      </Box>

      {pages.length > 0 ? (
        <div ref={gridRef} className="grid">
          <div className="grid-sizer"></div>
          {pages.map((page, index) => (
            <div className="grid-item" key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" noWrap sx={{ mb: 1 }}>
                    {page.record?.['Título'] || `Página ${index + 1}`}
                  </Typography>
                  <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', backgroundColor: '#f0f0f0' }}>
                    <Typography sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'text.secondary' }}>
                      Preview
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
                    <IconButton size="small" onClick={() => handleOpenEditor(index)}><Edit /></IconButton>
                    <IconButton size="small" onClick={() => handleDeletePage(index)}><Delete /></IconButton>
                  </Box>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          Nenhuma página neste conjunto. Adicione uma para começar.
        </Typography>
      )}

      {pageToEdit && (
        <PageEditor
          open={editingPageIndex !== null}
          onClose={handleCloseEditor}
          pageData={pageToEdit}
          baseTemplate={baseTemplate}
          onSave={handleSaveChangesFromEditor}
          aspectRatio={campaignState.aspectRatio || '1 / 1'}
          originalImageSize={{ width: 1080, height: 1080 }}
          addPendingAsset={addPendingAsset}
        />
      )}
    </Box>
  );
};

export default PageSetEditor;
