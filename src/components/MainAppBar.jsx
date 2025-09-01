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
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';

const MainAppBar = ({
  darkMode,
  setDarkMode,
  onShowPersonas,
  onShowCampaigns,
  setShowSetupModal,
  setShowCampaignStandardsModal,
  setShowMemorialDescritivoModal,
  onMenuClick,
  isMobile,
  onSaveCampaign,
  onLoadCampaign,
  currentView,
  onPersonaMenuClick,
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
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {(currentView === 'personas' || (currentView === 'campaigns' && isMobile)) && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={currentView === 'personas' ? onPersonaMenuClick : onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {currentView === 'personas' ? 'Personas' : 'Midiator'}
        </Typography>

        <Tooltip title="Salvar Campanha">
          <IconButton color="inherit" onClick={onSaveCampaign}>
            <SaveIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Carregar Campanha">
          <IconButton color="inherit" onClick={onLoadCampaign}>
            <FolderOpenIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={darkMode ? 'Modo Claro' : 'Modo Escuro'}>
          <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Opções">
          <IconButton
            size="large"
            aria-label="opções do usuário"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleUserMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
        </Tooltip>

        <Menu
          id="menu-appbar"
          anchorEl={userMenuAnchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(userMenuAnchorEl)}
          onClose={handleUserMenuClose}
        >
          <MenuItem onClick={() => { handleUserMenuClose(); onShowCampaigns(); }}>
            <HomeIcon sx={{ mr: 1 }} />
            Campanhas
          </MenuItem>
          <MenuItem onClick={() => { handleUserMenuClose(); onShowPersonas(); }}>
            <PeopleIcon sx={{ mr: 1 }} />
            Personas
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { handleUserMenuClose(); setShowSetupModal(true); }}>
            <Settings sx={{ mr: 1 }} />
            Configurações
          </MenuItem>
          <MenuItem onClick={() => { handleUserMenuClose(); setShowCampaignStandardsModal(true); }}>
            <Edit sx={{ mr: 1 }} />
            Padrões de Campanha
          </MenuItem>
          <MenuItem onClick={() => { handleUserMenuClose(); setShowMemorialDescritivoModal(true); }}>
            <ArticleIcon sx={{ mr: 1 }} />
            Memorial Descritivo
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
      </Toolbar>
    </AppBar>
  );
};

export default MainAppBar;
