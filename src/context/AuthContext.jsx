import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import googleDriveAPI from '../utils/googleDriveAPI';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);

  const checkGoogleDriveConnection = useCallback(() => {
    const connected = googleDriveAPI.isUserSignedIn();
    setIsGoogleDriveConnected(connected);
    return connected;
  }, []);

  useEffect(() => {
    checkGoogleDriveConnection();
  }, [checkGoogleDriveConnection]);

  const connectGoogleDrive = async () => {
    const apiKey = localStorage.getItem('google_drive_api_key');
    const clientId = localStorage.getItem('google_drive_client_id');

    if (!apiKey || !clientId) {
      toast.error("API Key e Client ID do Google Drive não configurados.");
      return false;
    }

    try {
      if (!googleDriveAPI.isInitialized) {
        toast.info('Inicializando API do Google...');
        await googleDriveAPI.initialize(apiKey, clientId);
      }

      if (!googleDriveAPI.isUserSignedIn()) {
        toast.info('Aguardando login com o Google...');
        await googleDriveAPI.signIn();
      }

      checkGoogleDriveConnection();
      toast.success('Conexão com Google Drive bem-sucedida!');
      return true;

    } catch (err) {
      console.error("Erro ao conectar com Google Drive:", err);
      toast.error(`Falha na conexão: ${err.message}`);
      checkGoogleDriveConnection();
      return false;
    }
  };

  const disconnectGoogleDrive = async () => {
    try {
      await googleDriveAPI.signOut();
      checkGoogleDriveConnection();
      toast.info('Desconectado do Google Drive.');
    } catch (err) {
      console.error("Erro ao desconectar do Google Drive:", err);
      toast.error(`Falha ao desconectar: ${err.message}`);
    }
  };

  const value = {
    isGoogleDriveConnected,
    connectGoogleDrive,
    disconnectGoogleDrive,
    checkGoogleDriveConnection,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
