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
} from '@mui/material';
import { Language, Publish } from '@mui/icons-material';
import { publishToWordPress } from '../utils/wordpressAPI';

const WordpressPublisher = ({ campaignContent, conteudoFormatado, generatedImagesData }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingStatus, setPublishingStatus] = useState('');
  const [publishedPostUrl, setPublishedPostUrl] = useState(null);

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishingStatus('Iniciando publicação...');
    setPublishedPostUrl(null);

    try {
      // Validar se os dados necessários estão presentes
      if (!campaignContent || !conteudoFormatado || !generatedImagesData || generatedImagesData.length === 0) {
        throw new Error('Dados da campanha ou imagens não estão disponíveis. Volte para as etapas anteriores.');
      }

      // Pegar a primeira imagem da lista de imagens geradas
      const firstImage = generatedImagesData[0];
      if (!firstImage || !firstImage.blob) {
        throw new Error('A primeira imagem gerada não contém um blob válido.');
      }

      const campaignData = {
        campaignContent,
        conteudoFormatado,
        imageBlob: firstImage.blob, // Passando o blob da imagem
      };

      setPublishingStatus('Publicando no WordPress... Isso pode levar um momento.');
      const post = await publishToWordPress(campaignData);

      setPublishingStatus(`Post "${post.title.rendered}" criado como rascunho com sucesso!`);
      setPublishedPostUrl(post.link);

    } catch (error) {
      console.error('Erro ao publicar no WordPress:', error);
      setPublishingStatus(`Erro ao publicar: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Publish />
          Publicar no WordPress
        </Typography>

        <Typography variant="body1" sx={{ mb: 3 }}>
          Esta ação enviará o conteúdo gerado para o seu site WordPress como um novo post em rascunho.
          A primeira imagem da lista de "Imagens Geradas" será usada como a imagem destacada do post.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            color="secondary"
            startIcon={<Language />}
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? 'Publicando...' : 'Publicar Post no WordPress'}
          </Button>
        </Box>

        {isPublishing && <LinearProgress sx={{ my: 2 }} />}

        {publishingStatus && (
          <Alert
            severity={publishedPostUrl ? "success" : (publishingStatus.startsWith('Erro') ? 'error' : 'info')}
            sx={{ mt: 3 }}
          >
            {publishingStatus}
            {publishedPostUrl && (
              <MuiLink href={publishedPostUrl} target="_blank" rel="noopener" sx={{ display: 'block', mt: 1 }}>
                Visualizar rascunho do post
              </MuiLink>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default WordpressPublisher;
