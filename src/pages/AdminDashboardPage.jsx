import React, { useState, useEffect, useCallback } from 'react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box, Button, Container, Typography, Paper, CircularProgress, Alert,
  IconButton, Tabs, Tab, AppBar, Card, CardContent, CardActions, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Delete as DeleteIcon, Edit as EditIcon, PlayCircleOutline as PlayCircleOutlineIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import VercelBlobAdmin from '../components/VercelBlobAdmin';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

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
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
    if (tabValue === 0) {
      fetchUsers();
    }
  }, [fetchUsers, tabValue]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the user "${name}"? This action cannot be undone.`)) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || 'User deleted successfully.');
          fetchUsers();
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
      <Paper sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h4" component="h1">Administração</Typography>
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>
        </Box>
        <AppBar position="static" color="default">
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="inherit"
            variant="fullWidth"
            aria-label="admin dashboard tabs"
          >
            <Tab label="Usuários" id="admin-tab-0" aria-controls="admin-tabpanel-0" />
            <Tab label="Jobs" id="admin-tab-1" aria-controls="admin-tabpanel-1" />
            <Tab label="Mídias" id="admin-tab-2" aria-controls="admin-tabpanel-2" />
          </Tabs>
        </AppBar>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>User Management</Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box sx={{ width: '100%' }}>
              {isMobile ? (
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {users.map((user) => (
                    <Card key={user.id} variant="outlined">
                      <CardContent>
                        <Typography variant="h6" component="div" noWrap>{user.name}</Typography>
                        <Typography sx={{ mb: 1.5 }} color="text.secondary" noWrap>{user.email}</Typography>
                        <Typography variant="body2">ID: {user.id}</Typography>
                        <Typography variant="body2">Role: {user.role}</Typography>
                      </CardContent>
                      <CardActions>
                        <IconButton onClick={() => handleEdit(user)} aria-label="edit">
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(user.id, user.name)}
                          aria-label="delete"
                          disabled={user.id === adminUser.sub}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  ))}
                </Box>
              ) : (
                <DataGrid
                  rows={users}
                  columns={columns}
                  autoHeight
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  checkboxSelection
                  disableSelectionOnClick
                />
              )}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Manual Job Triggers</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleRunScheduler}
              disabled={isSchedulerRunning}
              startIcon={isSchedulerRunning ? <CircularProgress size={20} color="inherit" /> : <PlayCircleOutlineIcon />}
            >
              {isSchedulerRunning ? 'Running...' : 'Run Scheduler'}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleRunAnalytics}
              disabled={isAnalyticsRunning}
              startIcon={isAnalyticsRunning ? <CircularProgress size={20} color="inherit" /> : <PlayCircleOutlineIcon />}
            >
              {isAnalyticsRunning ? 'Running...' : 'Run Analytics'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <VercelBlobAdmin />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminDashboardPage;