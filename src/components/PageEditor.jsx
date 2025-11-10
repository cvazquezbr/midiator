import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, TextField,
} from '@mui/material';
import { toast } from 'sonner';
import { safeDeepClone } from '../lib/utils';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import ImageManager from './ImageManager';
import { useCampaign } from '../context/CampaignContext';

const PageEditor = ({
  open,
  onClose,
  pageData: initialPageData,
  baseTemplate, // Used to create a NEW page
  onSave,
  aspectRatio,
  originalImageSize,
  onOpenImageGallery,
}) => {
  const [pageData, setPageData] = useState(null);
  const [editorState, setEditorState] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const { campaignSwatches } = useCampaign();

  useEffect(() => {
    if (open && initialPageData) {
      const data = safeDeepClone(initialPageData);

      // Ensure essential structures exist
      if (!data.customPageTemplate) {
        data.customPageTemplate = safeDeepClone(baseTemplate.pageTemplate);
      }
      if (!data.record) {
        data.record = {};
      }

      setPageData(data);

      // Prioritize page-specific styles, fallback to base template
      const initialState = {
        pageTemplate: data.customPageTemplate,
        fieldPositions: data.customFieldPositions || baseTemplate.fieldPositions || {},
        fieldStyles: data.customFieldStyles || baseTemplate.fieldStyles || {},
        brandElements: data.customBrandElements || baseTemplate.brandElements || [],
        csvData: [data.record],
      };
      setEditorState(initialState);
    }
  }, [open, initialPageData, baseTemplate]);

  const handleRecordChange = (e) => {
    const { name, value } = e.target;
    setPageData(prev => ({
      ...prev,
      record: {
        ...prev.record,
        [name]: value,
      },
    }));
  };

  const handleSave = () => {
    if (!editorState.pageTemplate) {
      toast.error("Template de página não encontrado. Não é possível salvar.");
      return;
    }

    // Save all editor state changes back to the page data object
    const finalData = {
      ...pageData,
      customPageTemplate: editorState.pageTemplate,
      customFieldPositions: editorState.fieldPositions,
      customFieldStyles: editorState.fieldStyles,
      customBrandElements: editorState.brandElements,
    };
    onSave(finalData);
    onClose();
  };

  const recordFields = useMemo(() => {
    return pageData?.record ? Object.keys(pageData.record) : [];
  }, [pageData]);

  if (!open || !editorState) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Editar Página</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recordFields.map(field => (
                <TextField
                  key={field}
                  label={field}
                  name={field}
                  value={pageData.record[field] || ''}
                  onChange={handleRecordChange}
                  fullWidth
                />
              ))}
              <ImageManager
                pageTemplate={editorState.pageTemplate}
                onPageTemplateChange={(newTemplate) => setEditorState(prev => ({ ...prev, pageTemplate: newTemplate }))}
                onOpenImageGallery={onOpenImageGallery}
                aspectRatio={aspectRatio}
              />
              <FormattingPanel
                 editorState={editorState}
                 onEditorStateChange={setEditorState}
                 campaignSwatches={campaignSwatches}
                 imageSwatches={[]}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
             <FieldPositioner
                editorState={editorState}
                setEditorState={setEditorState}
                aspectRatio={aspectRatio}
                record={pageData.record}
                originalImageSize={originalImageSize}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
              />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Salvar Página</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PageEditor;
