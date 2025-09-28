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
    <Box sx={{ perspective: '1000px', mb: '80%' /* Make space for reflection */ }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'transparent',
          boxShadow: 'none',
          transition: 'transform 0.3s ease',
          transform: intervalRef.current ? 'translateZ(20px)' : 'translateZ(0)',
          overflow: 'visible', // Allow reflection to be seen
        }}
        onMouseEnter={startCarousel}
        onMouseLeave={stopCarousel}
        raised={false}
      >
        <Box
          sx={{
            cursor: 'pointer',
            position: 'relative',
            '&::after': {
              content: '""',
              display: hasImages ? 'block' : 'none',
              position: 'absolute',
              bottom: '-100%',
              left: 0,
              right: 0,
              height: '100%',
              backgroundImage: `url(${displayedImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: 'scaleY(-1)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 70%)',
            }
          }}
          onClick={() => onLoadCampaign(campaign.id)}
        >
          {displayedImageUrl ? (
            <CardMedia
              component="img"
              sx={{
                height: 194,
                objectFit: 'cover',
                borderRadius: '8px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.25), 0 8px 8px rgba(0,0,0,0.22)',
                transition: 'box-shadow 0.3s ease',
                '&:hover': {
                  boxShadow: '0 14px 28px rgba(0,0,0,0.3), 0 10px 10px rgba(0,0,0,0.26)',
                }
              }}
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
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
              <ImageIcon sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.3)' }} />
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
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 2,
          opacity: intervalRef.current ? 1 : 0,
          transition: 'opacity 0.3s ease',
          borderRadius: '8px', // Match the image's border radius
        }}
      >
        <Typography variant="h6" component="h2" noWrap title={campaign.name}>
          {campaign.name}
        </Typography>
        <CardActions sx={{ justifyContent: 'flex-end', p: 0 }}>
          <IconButton aria-label="edit" sx={{ color: 'white' }} onClick={() => onEditCampaign(campaign)}>
            <EditIcon />
          </IconButton>
          <IconButton aria-label="delete" sx={{ color: 'white' }} onClick={() => onDeleteCampaign(campaign.id, campaign.name)}>
            <DeleteIcon />
          </IconButton>
        </CardActions>
      </Box>
    </Card>
  </Box>
  );
};

export default CampaignCard;