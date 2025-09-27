import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Image as ImageIcon } from '@mui/icons-material';

const CampaignCard = ({ campaign, onLoadCampaign, onEditCampaign, onDeleteCampaign }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const intervalRef = useRef(null);

  const hasImages = campaign.pageUrls && campaign.pageUrls.length > 0;

  const startCarousel = () => {
    if (hasImages && campaign.pageUrls.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % campaign.pageUrls.length);
      }, 800); // Change image every 800ms
    }
  };

  const stopCarousel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentImageIndex(0); // Reset to the first image
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const displayedImageUrl = hasImages ? campaign.pageUrls[currentImageIndex] : null;

  return (
    <Card
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={startCarousel}
      onMouseLeave={stopCarousel}
      raised={!!intervalRef.current}
    >
      <Box sx={{ cursor: 'pointer', position: 'relative' }} onClick={() => onLoadCampaign(campaign.id)}>
        {displayedImageUrl ? (
          <CardMedia
            component="img"
            sx={{ height: 194, objectFit: 'cover' }}
            image={displayedImageUrl}
            alt={`Preview of ${campaign.name}`}
          />
        ) : (
          <Box
            sx={{
              height: 194,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'grey.200',
            }}>
            <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
          </Box>
        )}
        {hasImages && campaign.pageUrls.length > 1 && (
           <Box sx={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '4px',
            }}>
                {campaign.pageUrls.map((_, index) => (
                    <Box
                        key={index}
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: currentImageIndex === index ? 'primary.main' : 'rgba(255, 255, 255, 0.7)',
                            transition: 'background-color 0.3s',
                        }}
                    />
                ))}
            </Box>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="h2" noWrap title={campaign.name}>
          {campaign.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Atualizada em: {new Date(campaign.updated_at).toLocaleString()}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <IconButton aria-label="edit" onClick={() => onEditCampaign(campaign)}>
          <EditIcon />
        </IconButton>
        <IconButton aria-label="delete" onClick={() => onDeleteCampaign(campaign.id, campaign.name)}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default CampaignCard;