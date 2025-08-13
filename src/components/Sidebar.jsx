import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  FileUpload,
  Image as ImageIcon,
  Settings,
  Palette,
  Check,
  ChevronRight,
} from '@mui/icons-material';

const StepIndicator = ({ step, isActive, isCompleted, onClick }) => {
  const Icon = step.icon;
  return (
    <ListItem
      button
      onClick={onClick}
      sx={{
        borderRadius: 3,
        mb: 1,
        background: isActive
          ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
          : isCompleted
            ? 'rgba(34, 197, 94, 0.1)'
            : 'transparent',
        color: isActive ? 'white' : 'inherit',
        '&:hover': {
          backgroundColor: isActive ? undefined : 'rgba(139, 92, 246, 0.1)',
        },
        transition: 'all 0.3s ease',
        px: 2,
        py: 1.5,
      }}
    >
      <ListItemIcon
        sx={{
          color: isActive ? 'white' : isCompleted ? '#22c55e' : 'inherit',
          minWidth: 40,
        }}
      >
        {isCompleted && !isActive ? <Check /> : <Icon />}
      </ListItemIcon>
      <ListItemText
        primary={step.label}
        secondary={step.description}
        primaryTypographyProps={{
          sx: {
            fontWeight: isActive ? 600 : 500,
            fontSize: '0.95rem',
          },
        }}
        secondaryTypographyProps={{
          sx: {
            color: isActive ? 'rgba(255,255,255,0.8)' : 'text.secondary',
            fontSize: '0.75rem',
          },
        }}
      />
      {isActive && <ChevronRight sx={{ color: 'white' }} />}
    </ListItem>
  );
};

const Sidebar = ({
  sidebarOpen,
  darkMode,
  steps,
  activeStep,
  csvData,
  backgroundImage,
  visibleFields,
  totalFields,
  styledFields,
  variant,
  onClose,
  onStepClick,
}) => {
  const drawerWidth = 320;

  const handleStepClick = (index) => {
    onStepClick(index);
  };

  return (
    <Drawer
      variant={variant}
      anchor="left"
      open={sidebarOpen}
      onClose={onClose}
      sx={{
        width: variant === 'persistent' && sidebarOpen ? drawerWidth : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          mt: { xs: 0, sm: 8 },
          borderRight: '1px solid',
          borderColor: 'divider',
          background: darkMode ? '#1e293b' : '#ffffff',
          height: { xs: '100%', sm: 'calc(100% - 64px)' },
          top: { xs: 0, sm: 64 },
        },
      }}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
    >
      <Box sx={{ p: 3, mt: { xs: 8, sm: 0 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Etapas do Processo
        </Typography>
        <List sx={{ p: 0 }}>
          {steps.map((step, index) => (
            <StepIndicator
              key={index}
              step={step}
              isActive={activeStep === index}
              isCompleted={index < activeStep}
              onClick={() => handleStepClick(index)}
            />
          ))}
        </List>

        <Box sx={{ mt: 4, display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Status do Projeto
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Chip
              icon={<FileUpload />}
              label={`${csvData.length} registros`}
              color={csvData.length > 0 ? 'success' : 'default'}
              variant={csvData.length > 0 ? 'filled' : 'outlined'}
              size="small"
            />
            <Chip
              icon={<ImageIcon />}
              label="Imagem de fundo"
              color={backgroundImage ? 'success' : 'default'}
              variant={backgroundImage ? 'filled' : 'outlined'}
              size="small"
            />
            <Chip
              icon={<Settings />}
              label={`${visibleFields}/${totalFields} campos`}
              color={visibleFields > 0 ? 'info' : 'default'}
              variant="filled"
              size="small"
            />
            <Chip
              icon={<Palette />}
              label={`${styledFields} estilos`}
              color={styledFields > 0 ? 'secondary' : 'default'}
              variant="filled"
              size="small"
            />
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
