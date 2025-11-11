import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, IconButton, Box, Typography, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';

const SUGGESTED_FIELDS = ["Título", "Texto Principal", "Ponte para o Próximo", "prompt_imagem_carrossel"];

const FieldsEditor = ({ open, onClose, fields, onSave }) => {
  const [localFields, setLocalFields] = useState([]);

  useEffect(() => {
    if (open) {
      // Ensure fields are objects with unique IDs for drag-and-drop
      const initializedFields = fields.map(field =>
        typeof field === 'string'
          ? { id: uuidv4(), name: field, type: 'text', quantity: 1, size: 100 }
          : { ...field, id: field.id || uuidv4() }
      );
      setLocalFields(initializedFields);
    }
  }, [open, fields]);

  const handleAddField = (name = '') => {
    const newField = {
      id: uuidv4(),
      name: name || `Novo Campo ${localFields.length + 1}`,
      type: 'text',
      quantity: 1,
      size: 100,
    };
    setLocalFields([...localFields, newField]);
  };

  const handleUpdateField = (id, updatedProp) => {
    setLocalFields(localFields.map(f => f.id === id ? { ...f, ...updatedProp } : f));
  };

  const handleDeleteField = (id) => {
    setLocalFields(localFields.filter(f => f.id !== id));
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Editar Campos do Conjunto</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Defina os campos que cada página neste conjunto terá. Arraste para reordenar.
        </Typography>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="fields">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {localFields.map((field, index) => (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px auto', gap: 1, alignItems: 'center', mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}
                      >
                        <TextField
                          value={field.name}
                          onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                          variant="outlined"
                          size="small"
                          label="Nome do Campo"
                        />
                        <FormControl size="small">
                          <InputLabel>Tipo</InputLabel>
                          <Select
                            value={field.type}
                            label="Tipo"
                            onChange={(e) => handleUpdateField(field.id, { type: e.target.value })}
                          >
                            <MenuItem value="text">Texto</MenuItem>
                            <MenuItem value="image">Imagem</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          type="number"
                          value={field.quantity}
                          onChange={(e) => handleUpdateField(field.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                          variant="outlined"
                          size="small"
                          label="Qtde"
                          inputProps={{ min: 1 }}
                        />
                         <TextField
                          type="number"
                          value={field.size}
                          onChange={(e) => handleUpdateField(field.id, { size: parseInt(e.target.value, 10) || 1 })}
                          variant="outlined"
                          size="small"
                          label="Tamanho"
                          inputProps={{ min: 1 }}
                          disabled={field.type !== 'text'}
                        />
                        <IconButton onClick={() => handleDeleteField(field.id)} size="small">
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

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button onClick={() => handleAddField()} startIcon={<AddIcon />}>
            Adicionar Campo Vazio
          </Button>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Adicionar Campo Sugerido</InputLabel>
            <Select
              label="Adicionar Campo Sugerido"
              onChange={(e) => handleAddField(e.target.value)}
              value=""
            >
              {SUGGESTED_FIELDS.map(name => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
