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
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Audiotrack,
  LinkedIn,
  AutoAwesome,
  Language,
  AccountCircle,
} from '@mui/icons-material';
import { toast } from 'sonner';

import { IANA_TIMEZONES } from '../lib/timezones';
import GeminiAuthSetup from './GeminiAuthSetup';
import GoogleCloudTTSAuth from './GoogleCloudTTSAuth';
import WordpressAuthSetup from './WordpressAuthSetup';
import LinkedinAuthSetup from './LinkedinAuthSetup';
import { saveSettingsToDb, loadSettingsFromDb } from '../utils/credentialsManager';

const CREDENTIAL_KEYS = {
  GEMINI: 'gemini_api_key',
  GOOGLE_TTS: 'googleCloudTTSCredentials',
  LINKEDIN: 'linkedinConfig',
  WORDPRESS: 'wordpressConfig',
  TIMEZONE: 'user_timezone',
};

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
      {value === index && <Box sx={{ p: 3, width: '100%', height: '100%' }}>{children}</Box>}
    </div>
  );
}

const GeneralSettings = ({ timezone, onTimezoneChange }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>General Settings</Typography>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="timezone-select-label">Your Timezone</InputLabel>
        <Select
          labelId="timezone-select-label"
          value={timezone}
          label="Your Timezone"
          onChange={(e) => onTimezoneChange(e.target.value)}
        >
          {IANA_TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          This timezone will be used to correctly schedule your posts.
        </Typography>
      </FormControl>
    </Box>
  );
};

const SetupModal = ({ open, onClose, onBeforeLinkedinRedirect }) => {
  const isMobile = useIsMobile();
  const [tabIndex, setTabIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      loadSettingsFromDb()
        .then(data => {
          setSettings(data || {});
        })
        .catch(error => {
          toast.error(`Failed to load settings: ${error.message}`);
          setSettings({}); // Reset to empty on error
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open]);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettingsToDb(settings);
      toast.success('Settings saved successfully to your account!');
      onClose();
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const a11yProps = (index) => ({
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <>
        <Tabs
          orientation={isMobile ? 'horizontal' : 'vertical'}
          variant="scrollable"
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="Configuration tabs"
          sx={{
            borderRight: isMobile ? 0 : 1,
            borderBottom: isMobile ? 1 : 0,
            borderColor: 'divider',
            minWidth: isMobile ? 'auto' : 200,
          }}
        >
          <Tab icon={<AccountCircle />} iconPosition="start" label="Geral" sx={{ justifyContent: 'flex-start' }} {...a11yProps(0)} />
          <Tab icon={<AutoAwesome />} iconPosition="start" label="Gemini" sx={{ justifyContent: 'flex-start' }} {...a11yProps(1)} />
          <Tab icon={<Audiotrack />} iconPosition="start" label="Cloud TTS" sx={{ justifyContent: 'flex-start' }} {...a11yProps(2)} />
          <Tab icon={<Language />} iconPosition="start" label="WordPress" sx={{ justifyContent: 'flex-start' }} {...a11yProps(3)} />
          <Tab icon={<LinkedIn />} iconPosition="start" label="LinkedIn" sx={{ justifyContent: 'flex-start' }} {...a11yProps(4)} />
        </Tabs>
        <TabPanel value={tabIndex} index={0}>
          <GeneralSettings
            timezone={settings[CREDENTIAL_KEYS.TIMEZONE] || 'UTC'}
            onTimezoneChange={(value) => handleSettingChange(CREDENTIAL_KEYS.TIMEZONE, value)}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <GeminiAuthSetup
            apiKey={settings[CREDENTIAL_KEYS.GEMINI] || ''}
            onApiKeyChange={(value) => handleSettingChange(CREDENTIAL_KEYS.GEMINI, value)}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <GoogleCloudTTSAuth
             credentials={settings[CREDENTIAL_KEYS.GOOGLE_TTS] || ''}
             onCredentialsChange={(value) => handleSettingChange(CREDENTIAL_KEYS.GOOGLE_TTS, value)}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={3}>
          <WordpressAuthSetup
            config={settings[CREDENTIAL_KEYS.WORDPRESS] || {}}
            onConfigChange={(value) => handleSettingChange(CREDENTIAL_KEYS.WORDPRESS, value)}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={4}>
          <LinkedinAuthSetup
             onBeforeRedirect={onBeforeLinkedinRedirect}
             config={settings[CREDENTIAL_KEYS.LINKEDIN] || {}}
             onConfigChange={(value) => handleSettingChange(CREDENTIAL_KEYS.LINKEDIN, value)}
           />
        </TabPanel>
      </>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Configurações
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', p: 0, minHeight: '500px', flexDirection: isMobile ? 'column' : 'row' }}>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        >
          {isSaving ? 'Salvando...' : 'Salvar na Nuvem'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetupModal;
