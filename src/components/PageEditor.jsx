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

const COMPLETE_DEFAULT_STYLE = {
  fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
  textDecoration: 'none', color: '#000000', textAlign: 'left', verticalAlign: 'top',
  lineHeightMultiplier: 1.2, textStroke: false, strokeColor: '#ffffff', strokeWidth: 2,
  textShadow: false, shadowColor: '#000000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2,
  backgroundColor: 'rgba(0,0,0,0)', borderColor: '#000000', borderWidth: 0,
  borderRadius: 0, padding: 5, backgroundOpacity: 0,
};

const defaultPageTemplate = {
  backgroundColor: '#FFFFFF',
  gradient: null,
  images: [],
};

const PageEditor = ({
  open,
  onClose,
  pageData,
  globalCsvHeaders,
  onSave,
  colorPalette,
  originalImageSize,
  brandElements,
  standardsColors,
  globalPageTemplate,
  aspectRatio,
}) => {
  const [editedPositions, setEditedPositions] = useState({});
  const [editedStyles, setEditedStyles] = useState({});
  const [editedBrandElements, setEditedBrandElements] = useState([]);
  const [editedRecord, setEditedRecord] = useState(null);
  const [editedPageTemplate, setEditedPageTemplate] = useState(defaultPageTemplate);
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const isMobile = useIsMobile();

  const handleOpenHtmlEditor = (fieldId) => {
    setEditingField(fieldId);
  };

  const handleInternalFieldSelection = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect);
  }, []);

  const handleFieldPositionerCsvDataUpdate = useCallback((updatedDataArray) => {
    if (updatedDataArray && updatedDataArray.length > 0) {
      setEditedRecord(updatedDataArray[0]);
    }
  }, []);

  useEffect(() => {
    if (open && pageData) {
      const initialPositions = pageData.customFieldPositions || pageData.fieldPositions || {};
      const initialStyles = pageData.customFieldStyles || pageData.fieldStyles || {};
      const initialBrandElements = pageData.customBrandElements || brandElements || [];
      const initialTemplate = pageData.customPageTemplate || globalPageTemplate || defaultPageTemplate;

      setEditedPositions(JSON.parse(JSON.stringify(initialPositions)));
      setEditedBrandElements(JSON.parse(JSON.stringify(initialBrandElements)));
      setEditedRecord(JSON.parse(JSON.stringify(pageData.record)));
      setEditedPageTemplate(JSON.parse(JSON.stringify(initialTemplate)));

      const newEditedStyles = {};
      (globalCsvHeaders || []).forEach(field => {
        newEditedStyles[field] = { ...COMPLETE_DEFAULT_STYLE, ...(initialStyles[field] || {}) };
      });
      setEditedStyles(newEditedStyles);

    }
  }, [open, pageData, globalCsvHeaders, brandElements, globalPageTemplate]);

  if (!pageData) return null;

  const handleSave = () => {
    const savedData = {
      ...pageData,
      record: editedRecord,
      customFieldPositions: editedPositions,
      customFieldStyles: editedStyles,
      customBrandElements: editedBrandElements,
      pageTemplate: editedPageTemplate, // Pass the edited template back
    };
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
              csvHeaders={globalCsvHeaders}
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
                csvHeaders={globalCsvHeaders}
                pageTemplate={editedPageTemplate}
                setPageTemplate={setEditedPageTemplate}
                brandElements={editedBrandElements}
                setBrandElements={setEditedBrandElements}
                onOpenHtmlEditor={handleOpenHtmlEditor}
                standardsColors={standardsColors || colorPalette}
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
            csvHeaders={globalCsvHeaders}
            onOpenHtmlEditor={handleOpenHtmlEditor}
            pageTemplate={editedPageTemplate}
            setPageTemplate={setEditedPageTemplate}
            brandElements={editedBrandElements}
            setBrandElements={setEditedBrandElements}
            standardsColors={standardsColors || colorPalette}
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
