import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  VpnKey,
  CloudQueue,
  Audiotrack,
  Language,
  SaveAlt as SaveAltIcon,
  FileUpload as FileUploadIcon,
  Security,
  LinkedIn,
} from '@mui/icons-material';
import GoogleIcon from '@mui/icons-material/Google';
import { toast } from 'sonner';

import GeminiAuthSetup from './GeminiAuthSetup';
import GoogleDriveAuthModal from './GoogleDriveAuthModal';
import GoogleCloudTTSAuth from './GoogleCloudTTSAuth';
import WordpressAuthSetup from './WordpressAuthSetup';
import LinkedinAuthSetup from './LinkedinAuthSetup';
import PasswordDialog from './PasswordDialog';

import { saveCredentialsToFile, loadCredentialsFromFile } from '../utils/credentialsManager';

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
  const [value, setValue] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordDialogAction, setPasswordDialogAction] = useState(null); // 'save' or 'load'
  const [credentialsPassword, setCredentialsPassword] = useState('');
  const loadCredentialsInputRef = useRef(null);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSaveCredentialsClick = () => {
    setPasswordDialogAction('save');
    setShowPasswordDialog(true);
  };

  const handleLoadCredentialsClick = () => {
    setPasswordDialogAction('load');
    setShowPasswordDialog(true);
  };

  const handlePasswordConfirm = async (password) => {
    setShowPasswordDialog(false);
    if (passwordDialogAction === 'save') {
      try {
        await saveCredentialsToFile(password);
        toast.success('Arquivo de credenciais salvo com sucesso!');
      } catch (error) {
        toast.error(`Erro ao salvar credenciais: ${error.message}`);
      }
    } else if (passwordDialogAction === 'load') {
      setCredentialsPassword(password);
      loadCredentialsInputRef.current.click();
    }
  };

  const handleLoadCredentialsFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && credentialsPassword) {
      try {
        await loadCredentialsFromFile(file, credentialsPassword);
        toast.success('Credenciais carregadas com sucesso! A página será recarregada.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        toast.error(`Erro ao carregar credenciais: ${error.message}`);
      } finally {
        setCredentialsPassword('');
        if (loadCredentialsInputRef.current) {
          loadCredentialsInputRef.current.value = '';
        }
      }
    }
  };

  const a11yProps = (index) => {
      return {
          id: `vertical-tab-${index}`,
          'aria-controls': `vertical-tabpanel-${index}`,
      };
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Configurações
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', p: 0, minHeight: '500px' }}>
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={value}
            onChange={handleChange}
            aria-label="Vertical tabs example"
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              minWidth: 200,
            }}
          >
            <Tab icon={<GoogleIcon />} label="Gemini" {...a11yProps(0)} />
            <Tab icon={<CloudQueue />} label="Google Drive" {...a11yProps(1)} />
            <Tab icon={<Audiotrack />} label="Cloud TTS" {...a11yProps(2)} />
            <Tab icon={<Language />} label="WordPress" {...a11yProps(3)} />
            <Tab icon={<LinkedIn />} label="LinkedIn" {...a11yProps(4)} />
            <Tab icon={<Security />} label="Credenciais" {...a11yProps(5)} />
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
          <TabPanel value={value} index={5}>
            <Typography variant="h6" gutterBottom>Gerenciar Credenciais</Typography>
            <Typography variant="body2" gutterBottom>
              Salve todas as suas configurações de API em um único arquivo criptografado ou carregue um arquivo existente.
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveAltIcon />}
                onClick={handleSaveCredentialsClick}
              >
                Salvar Credenciais
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileUploadIcon />}
                onClick={handleLoadCredentialsClick}
              >
                Carregar Credenciais
              </Button>
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>
      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={handlePasswordConfirm}
        title={passwordDialogAction === 'save' ? 'Salvar Credenciais' : 'Carregar Credenciais'}
        description={
          passwordDialogAction === 'save'
            ? 'Digite uma senha para criptografar o arquivo de credenciais.'
            : 'Digite a senha para descriptografar o arquivo de credenciais.'
        }
      />
      <input
        type="file"
        hidden
        accept=".midiatorsetup"
        onChange={handleLoadCredentialsFileChange}
        ref={loadCredentialsInputRef}
      />
    </>
  );
};

export default SetupModal;
