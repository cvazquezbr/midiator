import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useIsMobile } from '../hooks/use-mobile';
import FieldPositioner from './FieldPositioner'; // Reutilizar o FieldPositioner
import FormattingPanel from './FormattingPanel'; // Reutilizar o FormattingPanel
import FormattingDrawer from './FormattingDrawer'; // Importar o FormattingDrawer
import { Fab } from '@mui/material';
import { Edit } from '@mui/icons-material';
import TextEditorDialog from './TextEditorDialog';

// Define a comprehensive default style object
const COMPLETE_DEFAULT_STYLE = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  textAlign: 'left',
  verticalAlign: 'top',
  lineHeightMultiplier: 1.2, // Consistent with rendering logic in ImageGeneratorFrontendOnly
  textStroke: false,
  strokeColor: '#ffffff',
  strokeWidth: 2,
  textShadow: false,
  shadowColor: '#000000',
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  // Box properties
  backgroundColor: 'rgba(0,0,0,0)',
  borderColor: '#000000',
  borderWidth: 0,
  borderRadius: 0,
  padding: 5,
  backgroundOpacity: 0,
};

const GeneratedPageEditor = ({
  open,
  onClose,
  imageData, // Contém a imagem de fundo (imageData.backgroundImageToEdit || globalBackgroundImage), csvRecord (imageData.record)
  globalCsvHeaders, // Todos os cabeçalhos CSV possíveis (para consistência do painel de formatação)
  initialFieldPositions, // Posições dos campos para esta imagem específica
  initialFieldStyles, // Estilos dos campos para esta imagem específica
  onSave, // Callback: (editedImageData) => void
  colorPalette, // Paleta de cores global
  globalBackgroundImage, // Imagem de fundo global, como fallback
  originalImageSize,
  imageFilters, // Adicionado
  brandElements,
  standardsColors
}) => {
  const [editedPositions, setEditedPositions] = useState({});
  const [editedStyles, setEditedStyles] = useState({});
  const [editedBrandElements, setEditedBrandElements] = useState([]);
  const [editedRecord, setEditedRecord] = useState(null); // State for the CSV record being edited
  const [fontScale, setFontScale] = useState(1);
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null); // Estado para o campo selecionado internamente
  const [stylesAreInitialized, setStylesAreInitialized] = useState(false); // New state for initialization tracking
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const isMobile = useIsMobile();

  const handleOpenHtmlEditor = (fieldId) => {
    setEditingField(fieldId);
  };

  // Local state for image filters and toggles
  const defaultFilters = { brightness: 100, contrast: 100, saturate: 100, blur: 0, opacity: 100 };
  const [editedImageFilters, setEditedImageFilters] = useState(imageFilters || defaultFilters);

  const handleInternalFieldSelection = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect);
  }, []); // setSelectedFieldInternal is stable

  const handleFieldPositionerCsvDataUpdate = useCallback((updatedDataArray) => {
    if (updatedDataArray && updatedDataArray.length > 0) {
      setEditedRecord(updatedDataArray[0]);
    }
  }, []); // setEditedRecord is stable

  const handleDeselectField = () => {
    setSelectedFieldInternal(null);
  };

  useEffect(() => {
    if (open && imageData && initialFieldPositions && initialFieldStyles) {
      const brands = JSON.parse(JSON.stringify(imageData.customBrandElements || brandElements || []));

      const positions = JSON.parse(JSON.stringify(initialFieldPositions));
      // Defensively add filters to brand elements
      brands.forEach(el => {
        if (!el.filters) {
          el.filters = {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            blur: 0,
            opacity: 100,
          };
        }
      });

      // Use a set to track assigned z-indices and find the max
      const zIndices = new Set();
      Object.values(positions).forEach(p => { if (p.zIndex !== undefined) zIndices.add(p.zIndex); });
      brands.forEach(b => { if (b.zIndex !== undefined) zIndices.add(b.zIndex); });
      let zIndexCounter = zIndices.size > 0 ? Math.max(...zIndices) + 1 : 0;

      // Assign zIndex to text fields if they don't have one
      globalCsvHeaders.forEach(header => {
        if (!positions[header]) positions[header] = {};
        if (positions[header].zIndex === undefined) {
          positions[header].zIndex = zIndexCounter++;
        }
      });

      // Assign zIndex to brand elements if they don't have one
      brands.forEach(el => {
        if (el.zIndex === undefined) {
          el.zIndex = zIndexCounter++;
        }
      });

      setEditedPositions(positions);
      setEditedBrandElements(brands);
      setEditedRecord(JSON.parse(JSON.stringify(imageData.record)));

      // Simplified style initialization, as props are now pre-merged
      const newEditedStyles = {};
      globalCsvHeaders.forEach(field => {
        newEditedStyles[field] = {
          ...COMPLETE_DEFAULT_STYLE,
          ...(initialFieldStyles?.[field] || {}),
        };
      });
      setEditedStyles(newEditedStyles);
      setStylesAreInitialized(true);

      setEditedImageFilters(imageFilters || defaultFilters);
      setFontScale(imageData.fontScale || 1); // Initialize font scale from imageData
    } else {
      setStylesAreInitialized(false);
    }
  }, [open, imageData, initialFieldPositions, initialFieldStyles, globalCsvHeaders, imageFilters, brandElements]);

  if (!imageData) {
    return null;
  }

  const handleSave = () => {
    // Construct a new object explicitly to avoid propagating stale props from imageData
    const savedData = {
      // Core identifiers from the original imageData that should not change
      index: imageData.index,
      blob: imageData.blob,
      url: imageData.url,
      filename: imageData.filename,

      // The state that was actually edited in this component
      record: editedRecord,
      fieldPositions: editedPositions,
      fieldStyles: editedStyles,
      brandElements: editedBrandElements,
      imageFilters: editedImageFilters, // Pass back the edited filters
      fontScale: fontScale,

      // Explicitly set the background image that was used for editing
      backgroundImage: currentBackgroundImageForEditor,
    };
    onSave(savedData);
    onClose();
  };

  // Determina a imagem de fundo a ser usada no editor
  // Prioriza uma imagem de fundo específica da imageData (se existir, ex: após substituição individual)
  // Caso contrário, usa a imagem de fundo global.
  const currentBackgroundImageForEditor = imageData.backgroundImage || globalBackgroundImage;

  // Os cabeçalhos CSV para este editor devem ser os da linha específica sendo editada.
  // FieldPositioner e FormattingPanel esperam uma lista de todos os cabeçalhos para popular seletores, etc.
  // mas o preview de dados em FieldPositioner usará o imageData.record
  const editorCsvHeaders = globalCsvHeaders;
  // Use editedRecord for the preview data if it's available
  const editorCsvData = editedRecord ? [editedRecord] : (imageData ? [imageData.record] : []);

  // Log state before passing to FieldPositioner // LOGS REMOVED
  // if (stylesAreInitialized && currentBackgroundImageForEditor) {
  //   console.log("GeneratedImageEditor -- Passing to FieldPositioner -- editedPositions:", JSON.stringify(editedPositions, null, 2));
  //   console.log("GeneratedImageEditor -- Passing to FieldPositioner -- editedStyles:", JSON.stringify(editedStyles, null, 2));
  // }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="paper" fullScreen={isMobile}>
      <DialogTitle>
        Editar Página Gerada #{imageData.index + 1}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ overflowY: 'auto' }}>
        {!stylesAreInitialized ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <Typography>Carregando estilos...</Typography>
          </Box>
        ) : !currentBackgroundImageForEditor ? (
          <Typography>Imagem de fundo não disponível para edição.</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={isMobile ? 12 : 8}>
              <FieldPositioner
                backgroundImage={currentBackgroundImageForEditor}
                csvHeaders={editorCsvHeaders} // Headers relevantes para esta imagem
                fieldPositions={editedPositions}
                setFieldPositions={setEditedPositions}
                fieldStyles={editedStyles}
                setFieldStyles={setEditedStyles}
                csvData={editorCsvData} // Dados CSV desta imagem para preview
                colorPalette={colorPalette}
                onSelectFieldExternal={handleInternalFieldSelection} // Use memoized handler
                onCsvDataUpdate={handleFieldPositionerCsvDataUpdate} // Use memoized handler
                originalImageSize={originalImageSize}
                imageFilters={editedImageFilters}
                onFontScaleChange={setFontScale}
                brandElements={editedBrandElements}
                setBrandElements={setEditedBrandElements}
                currentPreviewIndex={0}
              />
            </Grid>
            {!isMobile && (
              <Grid item xs={12} md={4}>
                <FormattingPanel
                  selectedField={selectedFieldInternal} // Usar o estado interno
                  fieldStyles={editedStyles}
                  setFieldStyles={setEditedStyles}
                  fieldPositions={editedPositions}
                  setFieldPositions={setEditedPositions}
                  csvHeaders={editorCsvHeaders}
                  imageFilters={editedImageFilters}
                  setImageFilters={setEditedImageFilters}
                  brandElements={editedBrandElements}
                  setBrandElements={setEditedBrandElements}
                  onDeselectField={handleDeselectField}
                  onOpenHtmlEditor={handleOpenHtmlEditor}
                  fontScale={fontScale}
                  standardsColors={standardsColors || colorPalette}
                />
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar Alterações na Página
        </Button>
      </DialogActions>
      {isMobile && (
        <>
          <Fab
            color="primary"
            aria-label="edit"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setIsDrawerOpen(true)}
            disabled={!selectedFieldInternal}
          >
            <Edit />
          </Fab>
          <FormattingDrawer
            open={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            selectedField={selectedFieldInternal}
            fieldStyles={editedStyles}
            setFieldStyles={setEditedStyles}
            fieldPositions={editedPositions}
            setFieldPositions={setEditedPositions}
            csvHeaders={editorCsvHeaders}
            onOpenHtmlEditor={handleOpenHtmlEditor}
            imageFilters={editedImageFilters}
            setImageFilters={setEditedImageFilters}
            brandElements={editedBrandElements}
            setBrandElements={setEditedBrandElements}
            fontScale={fontScale}
            standardsColors={standardsColors || colorPalette}
          />
        </>
      )}
      <TextEditorDialog
        open={editingField !== null}
        title={`Editar Conteúdo de "${editingField}"`}
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

export default GeneratedPageEditor;
