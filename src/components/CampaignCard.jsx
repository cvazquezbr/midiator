import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Image as ImageIcon } from '@mui/icons-material';

const CampaignCard = ({ campaign, onEditCampaign, onDeleteCampaign, onHover, isFeatured, position }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const intervalRef = useRef(null);

  const hasImages = campaign.pageUrls && campaign.pageUrls.length > 0;

  const startCarousel = () => {
    if (onHover) {
      onHover(campaign);
    }
    setIsHovered(true);
    if (hasImages && campaign.pageUrls.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex(prevIndex => (prevIndex + 1) % campaign.pageUrls.length);
      }, 800);
    }
  };

  const stopCarousel = () => {
    setIsHovered(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentImageIndex(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const displayedImageUrl = hasImages ? campaign.pageUrls[currentImageIndex] : null;

  return (
    <Box
      onMouseEnter={startCarousel}
      onMouseLeave={stopCarousel}
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: '240px', md: '280px' },
        maxWidth: { xs: '170px', sm: '240px', md: '280px' },
        flexShrink: 0,
        transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
        transform: `translateX(${position * 35}%) rotateY(${position * 50}deg) scale(${isFeatured ? 1 : 0.7})`,
        opacity: isFeatured ? 1 : 0.3,
        zIndex: isFeatured ? 10 : 1,
        '&:hover': {
          transform: `translateX(${position * 30}%) rotateY(${position * 45}deg) scale(${isFeatured ? 1.05 : 0.75})`,
          zIndex: 20,
          opacity: 1,
        },
      }}
    >
      <Box
        onClick={() => onEditCampaign(campaign)}
        sx={{
          width: '100%',
          height: { xs: '225px', sm: '270px', md: '330px' },
          backgroundColor: '#000',
          borderRadius: '8px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundImage: displayedImageUrl ? `url(${displayedImageUrl})` : 'none',
          cursor: 'pointer',
          position: 'relative',
          // The reflection effect using the simpler webkit property
          '-webkit-box-reflect': 'below 5px linear-gradient(transparent, transparent, rgba(0,0,0,0.4))',
        }}
      >
        {!displayedImageUrl && (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'grey.900', borderRadius: '8px' }}>
            <ImageIcon sx={{ fontSize: 60, color: 'grey.700' }} />
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1.5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0))',
            borderRadius: '0 0 8px 8px',
            opacity: isHovered ? 1 : 0.8,
            transition: 'opacity 0.3s ease',
          }}
        >
          <Typography
            variant="h6"
            component="h2"
            noWrap
            title={campaign.name}
            sx={{ color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {campaign.name}
          </Typography>
        </Box>

        {isHovered && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <IconButton
              aria-label="edit"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEditCampaign(campaign);
              }}
              sx={{ backgroundColor: 'rgba(0,0,0,0.6)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.9)'}, color: '#fff' }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="delete"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCampaign(campaign.id, campaign.name);
              }}
              sx={{ backgroundColor: 'rgba(0,0,0,0.6)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.9)'}, color: '#fff' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CampaignCard;