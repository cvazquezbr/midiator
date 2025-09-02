import React, { useState, useEffect, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Container, Typography, Paper, CircularProgress, Alert, IconButton } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import fetchWithAuth from '../utils/fetchWithAuth';
import PromptEditModal from '../components/PromptEditModal';

const PromptsPage = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch the light version of prompts for the list view
      const data = await fetchWithAuth('/api/prompts');
      setPrompts(data);
    } catch (err) {
      setError(err.message);
      toast.error(`Error fetching prompts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleAdd = () => {
    setSelectedPrompt(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (prompt) => {
    try {
        // Fetch the full prompt data before editing
        const fullPrompt = await fetchWithAuth(`/api/prompts/${prompt.id}`);
        setSelectedPrompt(fullPrompt);
        setIsModalOpen(true);
    } catch (err) {
        toast.error(`Failed to fetch prompt details: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the prompt "${name}"?`)) {
      try {
        await fetchWithAuth(`/api/prompts/${id}`, { method: 'DELETE' });
        toast.success(`Prompt "${name}" deleted successfully.`);
        fetchPrompts(); // Refresh the list
      } catch (err) {
        toast.error(`Failed to delete prompt: ${err.message}`);
      }
    }
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    fetchPrompts();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPrompt(null);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 350 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => handleEdit(params.row)} aria-label="edit">
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDelete(params.row.id, params.row.name)}
            aria-label="delete"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="lg">
      <Paper sx={{ my: 4, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">Prompt Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add New Prompt
          </Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ height: '70vh', width: '100%' }}>
            <DataGrid
              rows={prompts}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
            />
          </Box>
        )}
      </Paper>
      {isModalOpen && (
        <PromptEditModal
          open={isModalOpen}
          onClose={handleModalClose}
          onSave={handleModalSave}
          prompt={selectedPrompt}
        />
      )}
    </Container>
  );
};

export default PromptsPage;
