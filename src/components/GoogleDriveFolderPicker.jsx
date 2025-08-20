import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Typography,
  TextField,
  Box,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import { Folder, Close } from '@mui/icons-material';
import { listFolders, createFolder } from '../utils/googleApi';

const GoogleDriveFolderPicker = ({ open, onClose, onSelectFolder, googleAccessToken, setGoogleAccessToken }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');

  const fetchFolders = async () => {
    if (!googleAccessToken) {
      setError('Acesso ao Google Drive não autorizado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const folderList = await listFolders(googleAccessToken, setGoogleAccessToken);
      setFolders(folderList);
    } catch (err) {
      setError(`Falha ao buscar pastas: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFolders();
      setSelectedFolder(null);
      setNewFolderName('');
    }
  }, [open]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Por favor, insira um nome para a nova pasta.');
      return;
    }
    if (!googleAccessToken) {
      setError('Acesso ao Google Drive não autorizado.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const newFolder = await createFolder(newFolderName.trim(), null, googleAccessToken, setGoogleAccessToken);
      onSelectFolder(newFolder);
      onClose();
    } catch (err) {
      setError(`Falha ao criar pasta: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedFolder) {
      onSelectFolder(selectedFolder);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Selecionar ou Criar Pasta no Google Drive
        <IconButton aria-label="close" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Typography color="error" gutterBottom>{error}</Typography>}

        <Typography variant="subtitle1" gutterBottom>Pastas Existentes</Typography>
        <Box sx={{ position: 'relative', minHeight: '200px', border: '1px solid #ddd', borderRadius: 1, mb: 3 }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
              <CircularProgress />
            </Box>
          )}
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {!loading && folders.length === 0 && (
              <ListItem>
                <ListItemText primary="Nenhuma pasta encontrada ou você precisa fazer login." />
              </ListItem>
            )}
            {folders.map((folder) => (
              <ListItem
                button
                key={folder.id}
                selected={selectedFolder && selectedFolder.id === folder.id}
                onClick={() => setSelectedFolder(folder)}
              >
                <ListItemIcon>
                  <Folder />
                </ListItemIcon>
                <ListItemText primary={folder.name} secondary={`ID: ${folder.id}`} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Typography variant="subtitle1" gutterBottom>Criar Nova Pasta</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            label="Nome da Nova Pasta"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ flexGrow: 1, mr: 1 }}
            disabled={loading}
          />
          <Button onClick={handleCreateFolder} variant="contained" disabled={loading || !newFolderName.trim()}>
            Criar
          </Button>
        </Box>

      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSelect} variant="contained" disabled={!selectedFolder || loading}>
          Selecionar Pasta
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDriveFolderPicker;
