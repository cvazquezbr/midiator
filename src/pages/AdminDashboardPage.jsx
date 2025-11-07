import React, { useState, useEffect, useCallback } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Container, Typography, Paper, CircularProgress, Alert, IconButton } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, PlayCircleOutline as PlayCircleOutlineIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import VercelBlobAdmin from '../components/VercelBlobAdmin';

// For now, the edit functionality will be a placeholder.
// A full implementation would require a modal or a separate edit page.
const handleEdit = (user) => {
  alert(`Edit functionality for user ${user.name} (ID: ${user.id}) is not yet implemented.`);
};

const AdminDashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [isAnalyticsRunning, setIsAnalyticsRunning] = useState(false);
  const { user: adminUser, logout } = useUserAuth();
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
      toast.error(`Error fetching users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the user "${name}"? This action cannot be undone.`)) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || 'User deleted successfully.');
          fetchUsers(); // Refresh the list
        } else {
          toast.error(data.error || 'Failed to delete user.');
        }
      } catch (err) {
        toast.error('An error occurred while deleting the user.');
      }
    }
  };

  const handleRunScheduler = async () => {
    setIsSchedulerRunning(true);
    toast.info('Scheduler run initiated...');
    try {
      const res = await fetch('/api/schedule/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Scheduler run completed successfully.');
      } else {
        throw new Error(data.error || 'Failed to run scheduler');
      }
    } catch (err) {
      toast.error(`Scheduler run failed: ${err.message}`);
    } finally {
      setIsSchedulerRunning(false);
    }
  };

  const handleRunAnalytics = async () => {
    setIsAnalyticsRunning(true);
    toast.info('Analytics run initiated...');
    try {
      const res = await fetch('/api/schedule/run-analytics', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Analytics run completed successfully.');
      } else {
        throw new Error(data.error || 'Failed to run analytics');
      }
    } catch (err) {
      toast.error(`Analytics run failed: ${err.message}`);
    } finally {
      setIsAnalyticsRunning(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'role', headerName: 'Role', width: 100 },
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
            // Disable deleting the currently logged-in admin
            disabled={params.row.id === adminUser.sub}
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
          <Typography variant="h4" component="h1">Admin Dashboard</Typography>
          <Box>
            <Button
              variant="contained"
              sx={{ mr: 2 }}
              onClick={handleRunScheduler}
              disabled={isSchedulerRunning}
              startIcon={isSchedulerRunning ? <CircularProgress size={20} color="inherit" /> : <PlayCircleOutlineIcon />}
            >
              {isSchedulerRunning ? 'Running...' : 'Run Scheduler'}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              sx={{ mr: 2 }}
              onClick={handleRunAnalytics}
              disabled={isAnalyticsRunning}
              startIcon={isAnalyticsRunning ? <CircularProgress size={20} color="inherit" /> : <PlayCircleOutlineIcon />}
            >
              {isAnalyticsRunning ? 'Running...' : 'Run Analytics'}
            </Button>
            <Button variant="outlined" onClick={handleLogout}>Logout</Button>
          </Box>
        </Box>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>User Management</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ width: '100%' }}>
            <DataGrid
              rows={users}
              columns={columns}
              autoHeight
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              checkboxSelection
              disableSelectionOnClick
            />
          </Box>
        )}
      </Paper>
      <Paper sx={{ my: 4, p: 3 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Vercel Blob Management</Typography>
        <VercelBlobAdmin />
      </Paper>
    </Container>
  );
};

export default AdminDashboardPage;