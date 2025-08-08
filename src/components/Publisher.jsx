import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Link as MuiLink,
  Grid,
  Divider,
} from '@mui/material';
import { Language, Publish, LinkedIn } from '@mui/icons-material';
import { publishToWordPress } from '../utils/wordpressAPI';
import { publishToLinkedIn } from '../utils/linkedinAPI';

const Publisher = ({ campaignContent, conteudoFormatado, generatedImagesData }) => {
  // State for WordPress
  const [isPublishingWp, setIsPublishingWp] = useState(false);
  const [publishingStatusWp, setPublishingStatusWp] = useState('');
  const [publishedPostUrlWp, setPublishedPostUrlWp] = useState(null);

  // State for LinkedIn
  const [isPublishingLi, setIsPublishingLi] = useState(false);
  const [publishingStatusLi, setPublishingStatusLi] = useState('');
  const [publishedPostUrlLi, setPublishedPostUrlLi] = useState(null);

  const validateData = () => {
    if (!campaignContent || !conteudoFormatado || !generatedImagesData || generatedImagesData.length === 0) {
      throw new Error('Dados da campanha ou imagens não estão disponíveis. Volte para as etapas anteriores.');
    }
    const firstImage = generatedImagesData[0];
    if (!firstImage || !firstImage.blob) {
      throw new Error('A primeira imagem gerada não contém um blob válido.');
    }
    return {
      campaignContent,
      conteudoFormatado,
      imageBlob: firstImage.blob,
    };
  };

  const handlePublishWordPress = async () => {
    setIsPublishingWp(true);
    setPublishingStatusWp('Iniciando publicação...');
    setPublishedPostUrlWp(null);

    try {
      const campaignData = validateData();
      setPublishingStatusWp('Publicando no WordPress... Isso pode levar um momento.');
      const post = await publishToWordPress(campaignData);
      setPublishingStatusWp(`Post "${post.title.rendered}" criado como rascunho com sucesso!`);
      setPublishedPostUrlWp(post.link);
    } catch (error) {
      console.error('Erro ao publicar no WordPress:', error);
      setPublishingStatusWp(`Erro ao publicar: ${error.message}`);
    } finally {
      setIsPublishingWp(false);
    }
  };

  const handlePublishLinkedIn = async () => {
    setIsPublishingLi(true);
    setPublishingStatusLi('Iniciando publicação...');
    setPublishedPostUrlLi(null);

    try {
      const campaignData = validateData();
      setPublishingStatusLi('Publicando no LinkedIn... Isso pode levar um momento.');
      const post = await publishToLinkedIn(campaignData);
      setPublishingStatusLi(`Post publicado no LinkedIn com sucesso!`);
      setPublishedPostUrlLi(post.link);
    } catch (error) {
      console.error('Erro ao publicar no LinkedIn:', error);
      setPublishingStatusLi(`Erro ao publicar: ${error.message}`);
    } finally {
      setIsPublishingLi(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Publish />
          Publicar Conteúdo
        </Typography>
        <Grid container spacing={4}>
          {/* WordPress Publisher */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="h6" gutterBottom>
                <Language sx={{ verticalAlign: 'middle', mr: 1 }} />
                WordPress
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Envia o conteúdo para o seu site WordPress como um post em rascunho. A primeira imagem gerada será usada como imagem destacada.
              </Typography>
              <Button
                variant="contained"
                size="large"
                color="secondary"
                onClick={handlePublishWordPress}
                disabled={isPublishingWp || isPublishingLi}
              >
                {isPublishingWp ? 'Publicando...' : 'Publicar no WordPress'}
              </Button>
              {isPublishingWp && <LinearProgress sx={{ my: 2 }} />}
              {publishingStatusWp && (
                <Alert
                  severity={publishedPostUrlWp ? 'success' : (publishingStatusWp.startsWith('Erro') ? 'error' : 'info')}
                  sx={{ mt: 2 }}
                >
                  {publishingStatusWp}
                  {publishedPostUrlWp && (
                    <MuiLink href={publishedPostUrlWp} target="_blank" rel="noopener" sx={{ display: 'block', mt: 1 }}>
                      Visualizar rascunho do post
                    </MuiLink>
                  )}
                </Alert>
              )}
            </Box>
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* LinkedIn Publisher */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="h6" gutterBottom>
                <LinkedIn sx={{ verticalAlign: 'middle', mr: 1 }} />
                LinkedIn
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Publica o conteúdo diretamente no LinkedIn usando a conta conectada. A primeira imagem gerada será usada no post.
              </Typography>
              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={handlePublishLinkedIn}
                disabled={isPublishingLi || isPublishingWp}
              >
                {isPublishingLi ? 'Publicando...' : 'Publicar no LinkedIn'}
              </Button>
              {isPublishingLi && <LinearProgress sx={{ my: 2 }} />}
              {publishingStatusLi && (
                <Alert
                  severity={publishedPostUrlLi ? 'success' : (publishingStatusLi.startsWith('Erro') ? 'error' : 'info')}
                  sx={{ mt: 2 }}
                >
                  {publishingStatusLi}
                  {publishedPostUrlLi && (
                    <MuiLink href={publishedPostUrlLi} target="_blank" rel="noopener" sx={{ display: 'block', mt: 1 }}>
                      Visualizar post no LinkedIn
                    </MuiLink>
                  )}
                </Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default Publisher;
