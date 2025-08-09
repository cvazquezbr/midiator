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
} from '@mui/material';
import { Folder } from '@mui/icons-material';
import googleDriveAPI from '../utils/googleDriveAPI';

const GoogleDriveFolderPicker = ({ open, onClose, onSelectFolder }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');

  const fetchFolders = async () => {
    setLoading(true);
    setError('');
    try {
      if (!googleDriveAPI.isUserSignedIn()) {
        // This is a fallback, the user should be signed in to open the picker.
        setError('You must be signed in to Google to browse folders.');
        setLoading(false);
        return;
      }
      const folderList = await googleDriveAPI.listFolders();
      setFolders(folderList);
    } catch (err) {
      setError(`Failed to fetch folders: ${err.message}`);
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
      setError('Please enter a name for the new folder.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const newFolder = await googleDriveAPI.createFolder(newFolderName.trim());
      setFolders((prevFolders) => [newFolder, ...prevFolders]);
      setSelectedFolder(newFolder);
      setNewFolderName('');
    } catch (err) {
      setError(`Failed to create folder: ${err.message}`);
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
      <DialogTitle>Select or Create a Google Drive Folder</DialogTitle>
      <DialogContent dividers>
        {error && <Typography color="error" gutterBottom>{error}</Typography>}

        <Typography variant="subtitle1" gutterBottom>Existing Folders</Typography>
        <Box sx={{ position: 'relative', minHeight: '200px', border: '1px solid #ddd', borderRadius: 1, mb: 3 }}>
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
              <CircularProgress />
            </Box>
          )}
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {!loading && folders.length === 0 && (
              <ListItem>
                <ListItemText primary="No folders found or you might need to sign in." />
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

        <Typography variant="subtitle1" gutterBottom>Create New Folder</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            label="New Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ flexGrow: 1, mr: 1 }}
            disabled={loading}
          />
          <Button onClick={handleCreateFolder} variant="contained" disabled={loading || !newFolderName.trim()}>
            Create
          </Button>
        </Box>

      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSelect} variant="contained" disabled={!selectedFolder || loading}>
          Select Folder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDriveFolderPicker;
