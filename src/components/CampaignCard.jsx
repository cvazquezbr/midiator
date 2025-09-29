import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Delete as DeleteIcon, Image as ImageIcon } from '@mui/icons-material';

const CampaignCard = ({ campaign, onEditCampaign, onDeleteCampaign, isCoverFlowActive }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // The campaign object from the list view now contains a `pageUrls` array.
  // We use the first URL for the preview.
  const previewImageUrl = campaign.pageUrls && campaign.pageUrls.length > 0 ? campaign.pageUrls[0] : null;

  // Configurações responsivas para diferentes tamanhos de tela
  const getResponsiveStyles = () => {
    if (isXs) {
      return {
        aspectRatio: '3 / 4',
        minHeight: '280px',
        maxHeight: '320px',
        titleVariant: 'subtitle1',
        iconSize: 40,
        contentPadding: 1.5,
      };
    } else if (isSm) {
      return {
        aspectRatio: '3.5 / 4.5',
        minHeight: '320px',
        maxHeight: '380px',
        titleVariant: 'h6',
        iconSize: 50,
        contentPadding: 2,
      };
    } else {
      return {
        aspectRatio: '4 / 5',
        minHeight: '360px',
        maxHeight: '420px',
        titleVariant: 'h6',
        iconSize: 60,
        contentPadding: 2,
      };
    }
  };

  const styles = getResponsiveStyles();

  return (
    <Card
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: isCoverFlowActive ? 'pointer' : 'default',
        transform: isCoverFlowActive ? 'scale(1.05)' : 'scale(0.92)',
        boxShadow: isCoverFlowActive ? 12 : 4,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        aspectRatio: styles.aspectRatio,
        minHeight: styles.minHeight,
        maxHeight: styles.maxHeight,
        borderRadius: 2,
        overflow: 'hidden',
        '&:hover': {
          transform: isCoverFlowActive ? 'scale(1.08)' : 'scale(0.95)',
          boxShadow: isCoverFlowActive ? 16 : 6,
        },
        // Melhor contraste para texto sobre imagem
        '&::before': previewImageUrl ? {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          zIndex: 1,
          pointerEvents: 'none',
        } : {},
      }}
      onClick={() => isCoverFlowActive && onEditCampaign(campaign)}
    >
      <CardMedia
        sx={{
          flexGrow: 1,
          backgroundColor: 'grey.200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        image={previewImageUrl}
      >
        {!previewImageUrl && (
          <ImageIcon 
            sx={{ 
              fontSize: styles.iconSize, 
              color: 'grey.500',
              opacity: 0.7,
            }} 
          />
        )}
      </CardMedia>
      
      <CardContent 
        sx={{ 
          p: styles.contentPadding,
          position: previewImageUrl ? 'absolute' : 'relative',
          bottom: previewImageUrl ? 0 : 'auto',
          left: previewImageUrl ? 0 : 'auto',
          right: previewImageUrl ? 0 : 'auto',
          zIndex: 2,
          background: previewImageUrl ? 'transparent' : 'background.paper',
          minHeight: isXs ? '60px' : '70px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography
          variant={styles.titleVariant}
          component="h2"
          title={campaign.name}
          sx={{
            fontWeight: 600,
            color: previewImageUrl ? 'white' : 'text.primary',
            textShadow: previewImageUrl ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {campaign.name}
        </Typography>
      </CardContent>

      {/* Botão de delete melhorado */}
      {isCoverFlowActive && (
        <CardActions
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 3,
          }}
        >
          <IconButton
            aria-label="delete"
            size={isXs ? "small" : "medium"}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCampaign(campaign.id, campaign.name);
            }}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.8)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <DeleteIcon fontSize={isXs ? "small" : "medium"} />
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
};

export default CampaignCard;