import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Divider,
} from '@mui/material';
import {
  Settings,
  Brightness4,
  Brightness7,
  Edit,
  Menu as MenuIcon,
  Article as ArticleIcon,
  Logout,
  AdminPanelSettings,
  AccountCircle,
  Save as SaveIcon,
  People as PeopleIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';

const MainAppBar = ({
  darkMode,
  setDarkMode,
  onShowPersonas,
  onShowCampaigns,
  onMenuClick,
  isMobile,
  // other props that might be passed from the old HomePage
  setShowSetupModal,
  setShowCampaignStandardsModal,
  setShowMemorialDescritivoModal,
  onSaveCampaign,
  onLoadCampaign,
}) => {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);

  const handleUserMenu = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 2, // Ensure AppBar is above the drawer
        background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }}
    >
      <Toolbar>
        <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Midiator
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* These buttons might be specific to campaign view, but we keep them for now */}
          <Tooltip title="Salvar Campanha">
            <IconButton onClick={onSaveCampaign} sx={{ color: 'white' }}><SaveIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Configurações">
            <IconButton onClick={() => setShowSetupModal(true)} sx={{ color: 'white' }}><Settings /></IconButton>
          </Tooltip>

          <Tooltip title="Opções do Usuário">
            <IconButton onClick={handleUserMenu} sx={{ color: 'white' }}>
              <AccountCircle />
            </IconButton>
          </Tooltip>
          <Menu
            id="user-menu-appbar"
            anchorEl={userMenuAnchorEl}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(userMenuAnchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" noWrap>{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { onShowCampaigns(); handleUserMenuClose(); }}>
              <HomeIcon sx={{ mr: 1 }} />
              Campanhas
            </MenuItem>
            <MenuItem onClick={() => { onShowPersonas(); handleUserMenuClose(); }}>
              <PeopleIcon sx={{ mr: 1 }} />
              Personas
            </MenuItem>
            <MenuItem onClick={() => { setShowCampaignStandardsModal(true); handleUserMenuClose(); }}>
              <Edit sx={{ mr: 1 }} />
              Padrões de Campanha
            </MenuItem>
             <MenuItem onClick={() => { setShowMemorialDescritivoModal(true); handleUserMenuClose(); }}>
              <ArticleIcon sx={{ mr: 1 }} />
              Memorial Descritivo
            </MenuItem>
            <MenuItem onClick={() => { setDarkMode(!darkMode); handleUserMenuClose(); }}>
              {darkMode ? <Brightness7 sx={{ mr: 1 }} /> : <Brightness4 sx={{ mr: 1 }} />}
              {darkMode ? 'Modo Claro' : 'Modo Escuro'}
            </MenuItem>
            {user?.role === 'admin' && (
              <MenuItem onClick={() => { navigate('/admin/users'); handleUserMenuClose(); }}>
                <AdminPanelSettings sx={{ mr: 1 }} />
                Admin Dashboard
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default MainAppBar;
