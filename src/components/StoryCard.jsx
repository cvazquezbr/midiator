import React, { useState } from 'react';
import { Card, Typography, Box, IconButton, CircularProgress } from '@mui/material';
import { Download, Share } from '@mui/icons-material';
import { generateStoryImage } from '../utils/storyCardGenerator';

const StoryCard = ({ imageData, onShare }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Getting title, description, footer from imageData.record
  const recordValues = Object.values(imageData.record || {});
  const title = recordValues[0] || '';
  const description = recordValues[1] || '';
  const footer = recordValues[2] || '';

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const dataUrl = await generateStoryImage({
        backgroundImageUrl: imageData.backgroundImage,
        title,
        description,
        footer,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `story_${imageData.filename || `image_${imageData.index}`}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download story image:', error);
      alert('Ocorreu um erro ao gerar a imagem para download.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    // This is passed from the parent component.
    // The parent's handleShare function expects the original imageData object.
    if (onShare) {
      onShare(imageData);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        // Aspect ratio 9:16, using padding-top trick
        position: 'relative',
        height: 0,
        paddingTop: '177.77%', // 16 / 9 * 100
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundImage: `url(${imageData.backgroundImage || '/placeholder.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          p: 2,
          color: 'white', // Default text color, assuming dark backgrounds
          textShadow: '1px 1px 3px rgba(0,0,0,0.7)', // Basic text shadow for readability
        }}
      >
        <Box>
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
          <Typography variant="body1">
            {description}
          </Typography>
        </Box>

        <Typography variant="caption">
          {footer}
        </Typography>
      </Box>

      {/* Action buttons overlayed at the bottom */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <IconButton
          size="small"
          onClick={handleDownload}
          title="Download Story"
          disabled={isDownloading}
          sx={{ backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' }, color: 'white' }}
        >
          {isDownloading ? <CircularProgress size={20} color="inherit" /> : <Download />}
        </IconButton>
        <IconButton
          size="small"
          onClick={handleShare}
          title="Compartilhar Story"
          sx={{ backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)'}, color: 'white' }}
        >
          <Share />
        </IconButton>
      </Box>
    </Card>
  );
};

export default StoryCard;
