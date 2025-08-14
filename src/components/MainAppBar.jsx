import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Settings,
  MoreVert,
  Brightness4,
  Brightness7,
  Edit,
  Download as DownloadIcon,
  FileUpload as FileUploadIcon,
  Menu as MenuIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
const MainAppBar = ({
  darkMode,
  setDarkMode,
  setShowSetupModal,
  onMenuClick,
  isMobile,
  handleMenuOpen,
  handleMenuClose,
  anchorElMenu,
  setShowCampaignStandardsModal,
  setShowMemorialDescritivoModal,
  handleSaveTemplateClick,
  handleLoadTemplateClick,
  loadStateInputRef,
  handleLoadStateFromFile,
}) => {
  return (
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
          <img src="/logo.svg" alt="Midiator Logo" style={{ height: '40px' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 1 } }}>
          <Tooltip title={darkMode ? 'Alternar para modo claro' : 'Alternar para modo escuro'}>
            <IconButton
              onClick={() => setDarkMode(!darkMode)}
              sx={{ color: 'white' }}
              aria-label="toggle-dark-mode"
            >
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Configurações">
            <IconButton
              onClick={() => setShowSetupModal(true)}
              sx={{ color: 'white' }}
              aria-label="Configurações"
            >
              <Settings />
            </IconButton>
          </Tooltip>
          <Tooltip title="Mais ações">
            <IconButton
              onClick={handleMenuOpen}
              sx={{ color: 'white' }}
              aria-label="Mais ações"
            >
              <MoreVert />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorElMenu}
            open={Boolean(anchorElMenu)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { setShowCampaignStandardsModal(true); handleMenuClose(); }}>
              <Edit sx={{ mr: 1 }} />
              Padrões de Campanha
            </MenuItem>
            <MenuItem onClick={() => { setShowMemorialDescritivoModal(true); handleMenuClose(); }}>
              <ArticleIcon sx={{ mr: 1 }} />
              Memorial Descritivo
            </MenuItem>
            <MenuItem onClick={handleSaveTemplateClick}>
              <DownloadIcon sx={{ mr: 1 }} />
              Salvar Campanha
            </MenuItem>
            <MenuItem onClick={handleLoadTemplateClick}>
              <FileUploadIcon sx={{ mr: 1 }} />
              Carregar Campanha
            </MenuItem>
          </Menu>
          <input
            type="file"
            hidden
            accept=".json,.midiator"
            onChange={handleLoadStateFromFile}
            ref={loadStateInputRef}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default MainAppBar;
