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
  Folder as FolderIcon,
  Save as SaveIcon,
  FolderOpen as FolderOpenIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import PersonaManagementModal from './PersonaManagementModal'; // Import the new modal

const MainAppBar = ({
  darkMode,
  setDarkMode,
  setShowSetupModal,
  onMenuClick,
  isMobile,
  setShowCampaignStandardsModal,
  setShowMemorialDescritivoModal,
  onSaveCampaign,
  onLoadCampaign,
}) => {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [personaModalOpen, setPersonaModalOpen] = useState(false); // State for the new modal

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

  const handleOpenPersonaModal = () => {
    setPersonaModalOpen(true);
    handleUserMenuClose();
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={onMenuClick}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 1 } }}>
            <Tooltip title="Salvar Campanha">
              <IconButton onClick={onSaveCampaign} sx={{ color: 'white' }} aria-label="Salvar Campanha">
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Configurações">
              <IconButton onClick={() => setShowSetupModal(true)} sx={{ color: 'white' }} aria-label="Configurações">
                <Settings />
              </IconButton>
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
              <MenuItem onClick={() => { setDarkMode(!darkMode); handleUserMenuClose(); }}>
                {darkMode ? <Brightness7 sx={{ mr: 1 }} /> : <Brightness4 sx={{ mr: 1 }} />}
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
              </MenuItem>
              <MenuItem onClick={handleOpenPersonaModal}>
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
              {user?.role === 'admin' && (
                <MenuItem onClick={() => { navigate('/admin/users'); handleUserMenuClose(); }}>
                  <AdminPanelSettings sx={{ mr: 1 }} />
                  Admin Dashboard
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      {/* Render the modal, controlled by the new state */}
      <PersonaManagementModal open={personaModalOpen} onClose={() => setPersonaModalOpen(false)} />
    </>
  );
};

export default MainAppBar;
