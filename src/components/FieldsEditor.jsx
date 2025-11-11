import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, IconButton, Box, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const FieldsEditor = ({ open, onClose, fields, onSave }) => {
  const [localFields, setLocalFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');

  useEffect(() => {
    if (open) {
      // Initialize with a copy of the fields prop
      setLocalFields([...fields]);
    }
  }, [open, fields]);

  const handleAddField = () => {
    if (newFieldName && !localFields.includes(newFieldName)) {
      setLocalFields([...localFields, newFieldName]);
      setNewFieldName('');
    }
  };

  const handleDeleteField = (fieldToDelete) => {
    setLocalFields(localFields.filter(field => field !== fieldToDelete));
  };

  const handleSave = () => {
    onSave(localFields);
    onClose();
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(localFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocalFields(items);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Editar Campos do Conjunto</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Defina os campos de texto e imagem que cada página neste conjunto terá.
          Use nomes como 'Título', 'Corpo', 'ImagemPrincipal'.
        </Typography>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="fields">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {localFields.map((field, index) => (
                  <Draggable key={field} draggableId={field} index={index}>
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}
                      >
                        <Typography sx={{ flexGrow: 1 }}>{field}</Typography>
                        <IconButton onClick={() => handleDeleteField(field)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <TextField
            label="Novo Nome do Campo"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddField()}
            fullWidth
            variant="outlined"
            size="small"
          />
          <IconButton onClick={handleAddField} color="primary">
            <AddIcon />
          </IconButton>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Salvar Campos</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldsEditor;