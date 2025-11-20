import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile.js';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Audiotrack,
  LinkedIn,
  AutoAwesome,
  Image,
  DriveFolderUpload,
  Language,
  AccountCircle,
} from '@mui/icons-material';
import { toast } from 'sonner';

import { IANA_TIMEZONES } from '../lib/timezones';
import GeminiAuthSetup from './GeminiAuthSetup';
import VertexAIAuthSetup from './VertexAIAuthSetup';
import GoogleCloudTTSAuth from './GoogleCloudTTSAuth';
import WordpressAuthSetup from './WordpressAuthSetup';
import LinkedinAuthSetup from './LinkedinAuthSetup';

// The old file-based manager is replaced with the new DB-based one.
import { useSettings } from '../context/SettingsContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ width: '100%', height: '100%', overflowY: 'auto' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, width: '100%', height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const GeneralSettings = () => {
  const { settings, updateSetting } = useSettings();
  const timezone = settings.user_timezone || 'UTC';

  const handleTimezoneChange = (event, newValue) => {
    if (newValue) {
      updateSetting('user_timezone', newValue);
      toast.info(`Timezone set to ${newValue}. This will be saved with your other settings.`);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        General Settings
      </Typography>
      <Autocomplete
        options={IANA_TIMEZONES}
        value={timezone}
        onChange={handleTimezoneChange}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Your Timezone"
            fullWidth
            sx={{ mt: 2 }}
          />
        )}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        This timezone will be used to correctly schedule your posts.
      </Typography>
    </Box>
  );
};


const SetupModal = ({ open, onClose, initialTab = 0 }) => {
  const isMobile = useIsMobile();
  const [value, setValue] = useState(initialTab);
  const { settings, saveSettings, isLoading } = useSettings();
  const [initialSettings, setInitialSettings] = useState(null);

  useEffect(() => {
    setValue(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (open && settings) {
      // Deep copy to prevent reference issues
      setInitialSettings(JSON.parse(JSON.stringify(settings)));
    }
  }, [open, settings]);

  const hasUnsavedChanges = () => {
    if (!initialSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSave = async () => {
    try {
      await saveSettings();
      onClose();
    } catch (error) {
      // Error is already toasted in the context
    }
  };

  const handleSaveForRedirect = async () => {
    if (hasUnsavedChanges()) {
      const userConfirmed = window.confirm("You have unsaved changes. Do you want to save them before proceeding?");
      if (userConfirmed) {
        await saveSettings();
        return true; // Indicate that settings were saved and it's safe to proceed.
      } else {
        // User chose not to save, but we can still proceed with the redirect.
        // The unsaved changes will be lost as per standard web behavior.
        return true;
      }
    }
    return true; // No unsaved changes, safe to proceed.
  };

  const a11yProps = (index) => {
    return {
      id: `vertical-tab-${index}`,
      'aria-controls': `vertical-tabpanel-${index}`,
    };
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Configurações
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', p: 0, minHeight: '500px', flexDirection: isMobile ? 'column' : 'row' }}>
        <Tabs
          orientation={isMobile ? 'horizontal' : 'vertical'}
          variant="scrollable"
          value={value}
          onChange={handleChange}
          aria-label="Configuration tabs"
          sx={{
            borderRight: isMobile ? 0 : 1,
            borderBottom: isMobile ? 1 : 0,
            borderColor: 'divider',
            minWidth: isMobile ? 'auto' : 200,
          }}
        >
          <Tab icon={<AccountCircle />} iconPosition="start" label="Geral" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(0)} />
          <Tab icon={<AutoAwesome />} iconPosition="start" label="Geração de Texto (Gemini)" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(1)} />
          <Tab icon={<Image />} iconPosition="start" label="Geração de Imagem (Vertex AI)" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(2)} />
          <Tab icon={<Audiotrack />} iconPosition="start" label="Cloud TTS" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}{...a11yProps(3)} />
          <Tab icon={<Language />} iconPosition="start" label="WordPress" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(4)} />
          <Tab icon={<LinkedIn />} iconPosition="start" label="LinkedIn" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}{...a11yProps(5)} />
        </Tabs>
        <TabPanel value={value} index={0}>
          <GeneralSettings />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <GeminiAuthSetup />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <VertexAIAuthSetup />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <GoogleCloudTTSAuth />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <WordpressAuthSetup />
        </TabPanel>
        <TabPanel value={value} index={5}>
          <LinkedinAuthSetup onBeforeRedirect={handleSaveForRedirect} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        >
          {isLoading ? 'Salvando...' : 'Salvar na Nuvem'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetupModal;
