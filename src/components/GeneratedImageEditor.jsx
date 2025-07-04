import React, { useState, useEffect, useRef } from 'react';
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
import FieldPositioner from './FieldPositioner'; // Reutilizar o FieldPositioner
import FormattingPanel from './FormattingPanel'; // Reutilizar o FormattingPanel

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
  const [displayedEditorImageSize, setDisplayedEditorImageSize] = useState({ width: 0, height: 0 });
  const [selectedFieldInternal, setSelectedFieldInternal] = useState(null); // Estado para o campo selecionado internamente

  useEffect(() => {
    if (imageData) {
      setSelectedFieldInternal(null); // Reseta o campo selecionado ao abrir/mudar imagem
      // Deep copy para evitar mutações diretas do estado pai
      setEditedPositions(JSON.parse(JSON.stringify(initialFieldPositions)));
      setEditedStyles(JSON.parse(JSON.stringify(initialFieldStyles)));
    }
  }, [imageData, initialFieldPositions, initialFieldStyles]);

  if (!imageData) return null;

  const handleSave = () => {
    onSave({
      ...imageData, // Mantém outros dados da imagem original (index, record, etc.)
      fieldPositions: editedPositions, // Posições atualizadas
      fieldStyles: editedStyles, // Estilos atualizados
      // Se a imagem de fundo foi alterada DENTRO deste editor (funcionalidade futura), atualizar aqui também
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
  const editorCsvData = [imageData.record]; // FieldPositioner espera um array de dados

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
        {currentBackgroundImageForEditor ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <FieldPositioner
                backgroundImage={currentBackgroundImageForEditor}
                csvHeaders={editorCsvHeaders} // Headers relevantes para esta imagem
                fieldPositions={editedPositions}
                setFieldPositions={setEditedPositions}
                fieldStyles={editedStyles}
                setFieldStyles={setEditedStyles}
                csvData={editorCsvData} // Dados CSV desta imagem para preview
                onImageDisplayedSizeChange={setDisplayedEditorImageSize} // Para o editor interno
                colorPalette={colorPalette}
                onSelectFieldExternal={setSelectedFieldInternal} // Atualizar o estado interno
                showFormattingPanel={false} // Adicionado para não duplicar o painel
              />
            </Grid>
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
          </Grid>
        ) : (
          <Typography>Imagem de fundo não disponível para edição.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar Alterações na Imagem
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GeneratedImageEditor;
