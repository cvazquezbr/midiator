import React from 'react';
import {
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Image as ImageIcon } from '@mui/icons-material';

const CampaignCard = ({ campaign, onEditCampaign, onDeleteCampaign, onHover, isFeatured, position, zIndex }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const hasImages = campaign.pageUrls && campaign.pageUrls.length > 0;
  // For the top gallery, we just show the first image as a static preview.
  const displayedImageUrl = hasImages ? campaign.pageUrls[0] : null;

  return (
    <Box
      onMouseEnter={() => {
        setIsHovered(true);
        if (onHover) onHover(campaign);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEditCampaign(campaign)} // The whole card is clickable to edit
      sx={{
        position: 'absolute', // Necessary for layering in the 3D space
        width: { xs: '60%', sm: '40%', md: '320px' },
        height: 'auto',
        aspectRatio: '1 / 1', // Maintain aspect ratio as requested
        transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        transform: `translateX(${position * 40}%) rotateY(${position * -50}deg) scale(${isFeatured ? 1 : 0.6})`,
        opacity: isFeatured ? 1 : 0.4,
        zIndex: isFeatured ? 20 : zIndex, // Use passed zIndex, but give featured card highest priority
        cursor: 'pointer',
        '&:hover': {
          transform: `translateX(${position * 35}%) rotateY(${position * -45}deg) scale(${isFeatured ? 1.05 : 0.65})`,
          zIndex: 30, // Ensure hovered card is always on top
          opacity: 1,
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          borderRadius: '8px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundImage: displayedImageUrl ? `url(${displayedImageUrl})` : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          // The reflection effect
          WebkitBoxReflect: 'below 5px linear-gradient(transparent, transparent, rgba(0,0,0,0.4))',
        }}
      >
        {!displayedImageUrl && (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'grey.900', borderRadius: '8px' }}>
            <ImageIcon sx={{ fontSize: 60, color: 'grey.700' }} />
          </Box>
        )}

        {/* Title overlay */}
        <Box
          sx={{
            p: 1.5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0))',
            borderRadius: '0 0 8px 8px',
            opacity: isHovered || isFeatured ? 1 : 0.8,
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
      </Box>
        {/* Action buttons appear on hover */}
        {isHovered && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              zIndex: 30, // Ensure buttons are on top
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
  );
};

export default CampaignCard;