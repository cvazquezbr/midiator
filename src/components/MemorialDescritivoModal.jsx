import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

const MemorialDescritivoModal = ({ open, onClose, personas }) => {
  const [selectedPersona, setSelectedPersona] = useState('');
  const [autor, setAutor] = useState('');
  const [formato, setFormato] = useState('');
  const [tonalidade, setTonalidade] = useState('');
  const [cores, setCores] = useState('');

  const handleGenerate = () => {
    // TODO: Implementar a lógica de geração do memorial
    console.log({
      selectedPersona,
      autor,
      formato,
      tonalidade,
      cores,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Gerar Memorial Descritivo</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Selecionar Persona</InputLabel>
          <Select
            value={selectedPersona}
            label="Selecionar Persona"
            onChange={(e) => setSelectedPersona(e.target.value)}
          >
            {personas.map((persona) => (
              <MenuItem key={persona.id} value={persona.id}>
                {persona.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Autor da Mensagem"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Formato da Mensagem</InputLabel>
          <Select
            value={formato}
            label="Formato da Mensagem"
            onChange={(e) => setFormato(e.target.value)}
          >
            <MenuItem value="Email de Vendas">Email de Vendas</MenuItem>
            <MenuItem value="Post de LinkedIn">Post de LinkedIn</MenuItem>
            <MenuItem value="Anúncio Digital">Anúncio Digital</MenuItem>
            <MenuItem value="Whitepaper">Whitepaper</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Instruções de Tonalidade"
          value={tonalidade}
          onChange={(e) => setTonalidade(e.target.value)}
          fullWidth
          multiline
          rows={3}
        />
        <TextField
          label="Paleta de Cores (códigos hex)"
          value={cores}
          onChange={(e) => setCores(e.target.value)}
          fullWidth
          placeholder="#FFFFFF, #000000, #FF0000"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleGenerate} variant="contained">
          Gerar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemorialDescritivoModal;
