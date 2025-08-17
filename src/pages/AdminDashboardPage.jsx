import React, { useState, useEffect, useCallback } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Container, Typography, Paper, CircularProgress, Alert, IconButton } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { toast } from 'sonner';

// For now, the edit functionality will be a placeholder.
// A full implementation would require a modal or a separate edit page.
const handleEdit = (user) => {
  alert(`Edit functionality for user ${user.name} (ID: ${user.id}) is not yet implemented.`);
};

const AdminDashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>
        </Box>
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>User Management</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ height: '70vh', width: '100%' }}>
            <DataGrid
              rows={users}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              checkboxSelection
              disableSelectionOnClick
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AdminDashboardPage;
