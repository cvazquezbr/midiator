import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  IconButton
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import FieldPositioner from './FieldPositioner';
import FormattingPanel from './FormattingPanel';
import FormattingDrawer from './FormattingDrawer';
import { Fab } from '@mui/material';
import TextEditorDialog from './TextEditorDialog';
import { createNewImageElement } from '../utils/elementFactory';
import { usePageData } from '../hooks/usePageData';
import { useCampaign } from '../context/CampaignContext';

const COMPLETE_DEFAULT_STYLE = {
  fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
  textDecoration: 'none', color: '#000000', textAlign: 'left', verticalAlign: 'top',
  lineHeightMultiplier: 1.2, textStroke: false, strokeColor: '#ffffff', strokeWidth: 2,
  textShadow: false, shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
  backgroundColor: 'rgba(0,0,0,0)', borderColor: '#000000', borderWidth: 0,
  borderRadius: 0, padding: 5, backgroundOpacity: 0,
};

const PageEditor = ({
  open,
  onClose,
  pageData,
  onSave,
  colorPalette,
  originalImageSize,
  standardsColors,
  aspectRatio,
  onChangeBackgroundImage,
}) => {
  const { csvHeaders } = useCampaign();
  const pageDataFromHook = usePageData(pageData?.index);

  const [editedPositions, setEditedPositions] = useState(null);
  const [editedStyles, setEditedStyles] = useState(null);
  const [editedBrandElements, setEditedBrandElements] = useState(null);
  const [editedRecord, setEditedRecord] = useState(null);
  const [editedPageTemplate, setEditedPageTemplate] = useState(null);
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [modalFontScale, setModalFontScale] = useState(1);
  const isMobile = useIsMobile();

  const handleOpenHtmlEditor = (fieldId) => {
    setEditingField(fieldId);
  };

  const handleInternalFieldSelection = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect);
  }, []);

  const handleLocalImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        const newImage = createNewImageElement(imageUrl);
        setEditedPageTemplate(prevTemplate => ({
            ...prevTemplate,
            images: [...(prevTemplate.images || []), newImage],
        }));
    };
    reader.readAsDataURL(file);
  };

  const handleFieldPositionerCsvDataUpdate = useCallback((updatedDataArray) => {
    if (updatedDataArray && updatedDataArray.length > 0) {
      setEditedRecord(updatedDataArray[0]);
    }
  }, []);

  useEffect(() => {
    if (open && pageData) {
      const {
        effectiveFieldPositions,
        effectiveFieldStyles,
        effectiveBrandElements,
        effectivePageTemplate,
        record,
      } = pageDataFromHook;

      setEditedPositions(JSON.parse(JSON.stringify(effectiveFieldPositions)));
      setEditedBrandElements(JSON.parse(JSON.stringify(effectiveBrandElements)));
      setEditedRecord(JSON.parse(JSON.stringify(record)));
      setEditedPageTemplate(JSON.parse(JSON.stringify(effectivePageTemplate)));

      const newEditedStyles = {};
      (csvHeaders || []).forEach(field => {
        newEditedStyles[field] = { ...COMPLETE_DEFAULT_STYLE, ...(effectiveFieldStyles[field] || {}) };
      });
      setEditedStyles(newEditedStyles);
    } else if (!open) {
      // Reset state when dialog is closed to ensure it's fresh on next open
      setEditedPositions(null);
      setEditedStyles(null);
      setEditedBrandElements(null);
      setEditedRecord(null);
      setEditedPageTemplate(null);
      setSelectedFieldInternal(null);
    }
  }, [open, pageData, pageDataFromHook, csvHeaders]);

  if (!open || !pageData || !editedPageTemplate) {
    // Render nothing or a loader until the state is initialized by the effect
    return null;
  }

  const handleSave = () => {
    const savedData = {
      ...pageData,
      record: editedRecord,
      customFieldPositions: editedPositions,
      customFieldStyles: editedStyles,
      customBrandElements: editedBrandElements,
      customPageTemplate: editedPageTemplate,
      fontScale: modalFontScale, // Pass the correct font scale on save
    };
    console.log('[PageEditor] handleSave called. Data being passed up:', savedData);
    onSave(savedData);
    onClose();
  };

  const editorCsvData = editedRecord ? [editedRecord] : (pageData ? [pageData.record] : []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="paper" fullScreen={isMobile}>
      <DialogTitle>
        Editar Página Gerada #{pageData.index + 1}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={2} sx={{ flexGrow: 1 }}>
          <Grid item xs={12} md={isMobile ? 12 : 8} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FieldPositioner
              aspectRatio={aspectRatio}
              csvHeaders={csvHeaders}
              fieldPositions={editedPositions}
              setFieldPositions={setEditedPositions}
              fieldStyles={editedStyles}
              setFieldStyles={setEditedStyles}
              csvData={editorCsvData}
              colorPalette={colorPalette}
              selectedField={selectedFieldInternal}
              setSelectedField={handleInternalFieldSelection}
              onCsvDataUpdate={handleFieldPositionerCsvDataUpdate}
              originalImageSize={originalImageSize}
              brandElements={editedBrandElements}
              setBrandElements={setEditedBrandElements}
              pageTemplate={editedPageTemplate}
              setPageTemplate={setEditedPageTemplate}
              currentPreviewIndex={0}
              onFontScaleChange={setModalFontScale} // Capture the scale from the preview
            />
          </Grid>
          {!isMobile && (
            <Grid item xs={12} md={4}>
              <FormattingPanel
                selectedField={selectedFieldInternal}
                setSelectedField={setSelectedFieldInternal}
                fieldStyles={editedStyles}
                setFieldStyles={setEditedStyles}
                fieldPositions={editedPositions}
                setFieldPositions={setEditedPositions}
                csvHeaders={csvHeaders}
                pageTemplate={editedPageTemplate}
                setPageTemplate={setEditedPageTemplate}
                brandElements={editedBrandElements}
                setBrandElements={setEditedBrandElements}
                onOpenHtmlEditor={handleOpenHtmlEditor}
                standardsColors={standardsColors || colorPalette}
                showImageLoaders={true}
                handleImageUpload={handleLocalImageUpload}
                onChangeBackgroundImage={onChangeBackgroundImage}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar Alterações</Button>
      </DialogActions>
      {isMobile && (
        <>
          <Fab color="primary" aria-label="edit" sx={{ position: 'fixed', bottom: 16, right: 16 }} onClick={() => setIsDrawerOpen(true)}><Edit /></Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            selectedField={selectedFieldInternal}
            setSelectedField={setSelectedFieldInternal}
            fieldStyles={editedStyles}
            setFieldStyles={setEditedStyles}
            fieldPositions={editedPositions}
            setFieldPositions={setEditedPositions}
            csvHeaders={csvHeaders}
            onOpenHtmlEditor={handleOpenHtmlEditor}
            pageTemplate={editedPageTemplate}
            setPageTemplate={setEditedPageTemplate}
            brandElements={editedBrandElements}
            setBrandElements={setEditedBrandElements}
            standardsColors={standardsColors || colorPalette}
            showImageLoaders={true}
            handleImageUpload={handleLocalImageUpload}
            onChangeBackgroundImage={onChangeBackgroundImage}
          />
        </>
      )}
      <TextEditorDialog
        open={editingField !== null}
        title={`Editar "${editingField}"`}
        content={editedRecord && editingField ? editedRecord[editingField] : ''}
        onSave={(newContent) => {
          if (editedRecord && editingField) {
            setEditedRecord(prev => ({ ...prev, [editingField]: newContent }));
          }
          setEditingField(null);
        }}
        onClose={() => setEditingField(null)}
      />
    </Dialog>
  );
};

export default PageEditor;
