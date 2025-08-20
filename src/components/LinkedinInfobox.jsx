import React, { useState, useEffect } from 'react';
import { getLinkedInProfiles } from '../utils/linkedinAPI';
import {
  Alert,
  Box,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip
} from '@mui/material';
import { Person, Business } from '@mui/icons-material';

const LinkedinInfobox = ({ settings }) => {
  const [profiles, setProfiles] = useState({
    personal: null,
    organizations: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      if (settings?.linkedin?.accessToken) {
        try {
          setProfiles(prev => ({ ...prev, loading: true, error: null }));
          const data = await getLinkedInProfiles(settings.linkedin);
          setProfiles({
            personal: data.personal,
            organizations: data.organizations || [],
            loading: false,
            error: null
          });
        } catch (error) {
          console.error('Erro ao buscar perfis:', error);
          setProfiles(prev => ({
            ...prev,
            loading: false,
            error: error.message
          }));
        }
      } else {
        setProfiles(prev => ({ ...prev, loading: false, error: "Token de acesso do LinkedIn não encontrado. Conecte sua conta." }));
      }
    };

    fetchProfiles();
  }, [settings]);

  if (profiles.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando perfis LinkedIn...</Typography>
      </Box>
    );
  }

  if (profiles.error) {
    return (
      <Alert severity="error">
        Erro ao carregar perfis: {profiles.error}
      </Alert>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2, background: 'linear-gradient(to right, #eef2f3, #e0eafc)'}}>
      <Typography variant="h6" sx={{ mb: 2, color: '#0d47a1' }}>
        Perfis Conectados no LinkedIn
      </Typography>

      {/* Perfil Pessoal */}
      {profiles.personal && (
        <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar src={profiles.personal.profilePicture} sx={{ mr: 2, width: 48, height: 48 }}>
                <Person />
            </Avatar>
            <ListItemText
              primary={profiles.personal.name}
              secondary="Perfil Pessoal"
            />
             <Chip label="Conectado" color="success" size="small" />
          </Box>
        </Paper>
      )}

      {/* Páginas Empresariais */}
      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, color: '#1565c0' }}>
        Páginas Empresariais ({profiles.organizations.length})
      </Typography>

      {profiles.organizations.length > 0 ? (
        <List>
          {profiles.organizations.map((org) => (
            <ListItem key={org.id} component={Paper} variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                <ListItemIcon>
                    <Avatar src={org.logo} sx={{ bgcolor: 'primary.main' }}>
                        <Business />
                    </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={org.name}
                  secondary={`Função: ${org.role || 'Admin'}`}
                />
            </ListItem>
          ))}
        </List>
      ) : (
        <Alert severity="info">
            Nenhuma página empresarial encontrada ou você não tem permissão para acessá-las.
            Para gerenciar páginas, você precisa ser administrador no LinkedIn e ter as permissões corretas na sua aplicação de desenvolvedor.
        </Alert>
      )}
    </Paper>
  );
};

export default LinkedinInfobox;
