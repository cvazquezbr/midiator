import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/use-mobile.js';
import isEqual from 'lodash.isequal';
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
  DriveFolderUpload,
  Language,
  AccountCircle,
} from '@mui/icons-material';
import { toast } from 'sonner';

import { IANA_TIMEZONES } from '../lib/timezones';
import GeminiAuthSetup from './GeminiAuthSetup';
import GoogleCloudTTSAuth from './GoogleCloudTTSAuth';
import WordpressAuthSetup from './WordpressAuthSetup';
import LinkedinAuthSetup from './LinkedinAuthSetup';
import UnsavedChangesDialog from './UnsavedChangesDialog';

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


const SetupModal = ({ open, onClose }) => {
  const isMobile = useIsMobile();
  const [value, setValue] = useState(0);
  const { settings, saveSettings, isLoading } = useSettings();
  const [initialSettings, setInitialSettings] = useState(null);

  useEffect(() => {
    if (open) {
      // Create a deep copy of the settings when the modal opens.
      setInitialSettings(JSON.parse(JSON.stringify(settings)));
    } else {
      // Reset when modal closes
      setInitialSettings(null);
    }
  }, [open]);

  const isDirty = !isEqual(initialSettings, settings);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [redirectAction, setRedirectAction] = useState(null);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSave = async () => {
    try {
      await saveSettings();
      // After saving, the state is no longer dirty relative to the new baseline
      setInitialSettings(JSON.parse(JSON.stringify(settings)));
      return true; // Indicate success
    } catch (error) {
      // Error is already toasted in the context
      return false; // Indicate failure
    }
  };

  const handleConnectWithLinkedIn = (connectFn) => {
    if (isDirty) {
      setRedirectAction(() => connectFn);
      setShowUnsavedDialog(true);
    } else {
      connectFn();
    }
  };

  const handleCloseConfirmation = () => {
    setShowUnsavedDialog(false);
    setRedirectAction(null);
  };

  const handleConfirmDiscard = () => {
    if (redirectAction) {
      redirectAction();
    }
    handleCloseConfirmation();
  };

  const handleConfirmSave = async () => {
    const success = await handleSave();
    if (success && redirectAction) {
      redirectAction();
    }
    handleCloseConfirmation();
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
          <Tab icon={<AutoAwesome />} iconPosition="start" label="Gemini" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(1)} />
          <Tab icon={<Audiotrack />} iconPosition="start" label="Cloud TTS" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}{...a11yProps(2)} />
          <Tab icon={<Language />} iconPosition="start" label="WordPress" sx={{ justifyContent: 'flex-start', textAlign: 'left' }} {...a11yProps(3)} />
          <Tab icon={<LinkedIn />} iconPosition="start" label="LinkedIn" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}{...a11yProps(4)} />
        </Tabs>
        <TabPanel value={value} index={0}>
          <GeneralSettings />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <GeminiAuthSetup />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <GoogleCloudTTSAuth />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <WordpressAuthSetup />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <LinkedinAuthSetup onConnect={handleConnectWithLinkedIn} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        <Button
          variant="contained"
          onClick={async () => {
            const success = await handleSave();
            if (success) {
              toast.success("Configurações salvas!");
              onClose();
            }
          }}
          disabled={isLoading || !isDirty}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        >
          {isLoading ? 'Salvando...' : 'Salvar na Nuvem'}
        </Button>
      </DialogActions>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onClose={handleCloseConfirmation}
        onConfirmDiscard={handleConfirmDiscard}
        onConfirmSave={handleConfirmSave}
      />
    </Dialog>
  );
};

export default SetupModal;
