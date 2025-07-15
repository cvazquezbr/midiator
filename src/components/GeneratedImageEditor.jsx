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
  IconButton,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close } from '@mui/icons-material';
import FieldPositioner from './FieldPositioner'; // Reutilizar o FieldPositioner
import FormattingPanel from './FormattingPanel'; // Reutilizar o FormattingPanel
import FormattingDrawer from './FormattingDrawer'; // Importar o FormattingDrawer
import { Fab } from '@mui/material';
import { Edit } from '@mui/icons-material';

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
  // Ensure all properties from FormattingPanel's controls and rendering logic are here.
  // These are based on inspection of FormattingPanel.jsx and common text style properties.
};

const GeneratedImageEditor = ({
  open,
  onClose,
  imageData, // Contém a imagem de fundo (imageData.backgroundImageToEdit || globalBackgroundImage), csvRecord (imageData.record)
  globalCsvHeaders, // Todos os cabeçalhos CSV possíveis (para consistência do painel de formatação)
  initialFieldPositions, // Posições dos campos para esta imagem específica
  initialFieldStyles, // Estilos dos campos para esta imagem específica
  onSave, // Callback: (editedImageData) => void
  colorPalette, // Paleta de cores global
  globalBackgroundImage // Imagem de fundo global, como fallback
}) => {
  const [editedPositions, setEditedPositions] = useState({});
  const [editedStyles, setEditedStyles] = useState({});
  const [editedRecord, setEditedRecord] = useState(null); // State for the CSV record being edited
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null); // Estado para o campo selecionado internamente
  const [stylesAreInitialized, setStylesAreInitialized] = useState(false); // New state for initialization tracking
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  const handleInternalFieldSelection = useCallback((fieldToSelect) => {
    setSelectedFieldInternal(fieldToSelect);
  }, []); // setSelectedFieldInternal is stable

  const handleFieldPositionerCsvDataUpdate = useCallback((updatedDataArray) => {
    if (updatedDataArray && updatedDataArray.length > 0) {
      setEditedRecord(updatedDataArray[0]);
    }
  }, []); // setEditedRecord is stable

  useEffect(() => {
    // Diagnostic logs from previous session removed.
    // The console.log for imageData was already commented and can remain as such if desired for future debugging, or removed.
    // For this cleanup, we ensure active diagnostic logs are removed.

    if (imageData && initialFieldPositions && initialFieldStyles) {
      setSelectedFieldInternal(null);
      setEditedPositions(JSON.parse(JSON.stringify(initialFieldPositions)));
      setEditedRecord(JSON.parse(JSON.stringify(imageData.record))); // Initialize editedRecord

      // Initialize editedStyles
      const newEditedStyles = {};
      // Iterate over all possible headers to ensure FormattingPanel has complete style info
      // and that FieldPositioner receives a style object for every field it might render.
      globalCsvHeaders.forEach(field => {
        newEditedStyles[field] = {
          ...COMPLETE_DEFAULT_STYLE, // Start with all defaults defined in GeneratedImageEditor
          ...(initialFieldStyles && initialFieldStyles[field] ? initialFieldStyles[field] : {}), // Override with specific styles for this field from prop
        };
      });
      setEditedStyles(newEditedStyles);
      setStylesAreInitialized(true); // Mark styles as initialized and ready for rendering children
    } else {
      // If essential data is missing, ensure we are not in an initialized state.
      setStylesAreInitialized(false); 
    }
  }, [imageData, initialFieldPositions, initialFieldStyles, globalCsvHeaders]); // Added globalCsvHeaders

  if (!imageData) {
    return null;
  }

  const handleSave = () => {
    onSave({
      ...imageData, // Mantém outros dados da imagem original (index etc.)
      record: editedRecord, // Passa o record atualizado
      fieldPositions: editedPositions,
      fieldStyles: editedStyles,
    });
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
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth scroll="body">
      <DialogTitle>
        Editar Imagem Gerada #{imageData.index + 1}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!stylesAreInitialized ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <Typography>Carregando estilos...</Typography>
          </Box>
        ) : !currentBackgroundImageForEditor ? (
          <Typography>Imagem de fundo não disponível para edição.</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={isLargeScreen ? 8 : 12}>
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
                showFormattingPanel={isLargeScreen}
                onCsvDataUpdate={handleFieldPositionerCsvDataUpdate} // Use memoized handler
              />
            </Grid>
            {isLargeScreen && (
              <Grid item xs={12} md={4}>
                <FormattingPanel
                  selectedField={selectedFieldInternal} // Usar o estado interno
                  fieldStyles={editedStyles}
                  setFieldStyles={setEditedStyles}
                  fieldPositions={editedPositions}
                  setFieldPositions={setEditedPositions}
                  csvHeaders={editorCsvHeaders}
                />
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar Alterações na Imagem
        </Button>
      </DialogActions>
      {!isLargeScreen && (
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
          />
        </>
      )}
    </Dialog>
  );
};

export default GeneratedImageEditor;
