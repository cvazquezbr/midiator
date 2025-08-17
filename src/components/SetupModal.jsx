import React, { useState } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Audiotrack,
  LinkedIn,
  AutoAwesome,
  DriveFolderUpload,
  Language,
} from '@mui/icons-material';
import { toast } from 'sonner';

import GeminiAuthSetup from './GeminiAuthSetup';
import GoogleDriveAuthModal from './GoogleDriveAuthModal';
import GoogleCloudTTSAuth from './GoogleCloudTTSAuth';
import WordpressAuthSetup from './WordpressAuthSetup';
import LinkedinAuthSetup from './LinkedinAuthSetup';

// The old file-based manager is replaced with the new DB-based one.
import { saveSettingsToDb } from '../utils/credentialsManager';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, width: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SetupModal = ({ open, onClose, onBeforeLinkedinRedirect }) => {
  const isMobile = useIsMobile();
  const [value, setValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettingsToDb();
      toast.success('Settings saved successfully to your account!');
    } catch (error) {
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
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
          <Tab icon={<AutoAwesome />} iconPosition="start" label="Gemini" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(0)} />
          <Tab icon={<DriveFolderUpload />} iconPosition="start" label="Google Drive" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}{...a11yProps(1)} />
          <Tab icon={<Audiotrack />} iconPosition="start" label="Cloud TTS" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}{...a11yProps(2)} />
          <Tab icon={<Language />} iconPosition="start" label="WordPress" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(3)} />
          <Tab icon={<LinkedIn />} iconPosition="start" label="LinkedIn" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}{...a11yProps(4)} />
        </Tabs>
        <TabPanel value={value} index={0}>
          <GeminiAuthSetup />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <GoogleDriveAuthModal />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <GoogleCloudTTSAuth />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <WordpressAuthSetup />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <LinkedinAuthSetup onBeforeRedirect={onBeforeLinkedinRedirect} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        >
          {isSaving ? 'Salvando...' : 'Salvar na Nuvem'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetupModal;
