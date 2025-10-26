import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from '@mui/material';
import { Delete as DeleteIcon, Image as ImageIcon } from '@mui/icons-material';

const CampaignCard = ({ campaign, onEditCampaign, onDeleteCampaign, isCoverFlowActive }) => {
  // The campaign object from the list view now contains a `pageUrls` array.
  // We use the first URL for the preview.
  const previewImageUrl = campaign.pageUrls && campaign.pageUrls.length > 0 ? campaign.pageUrls[0] : null;

  return (
    <Card
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: isCoverFlowActive ? 'pointer' : 'default',
        transform: isCoverFlowActive ? 'scale(1.02)' : 'scale(0.95)',
        boxShadow: isCoverFlowActive ? 10 : 3,
        transition: 'transform 0.4s ease, box-shadow 0.4s ease',
        position: 'relative', // Needed to position the delete button
        aspectRatio: '4 / 5', // Set the desired aspect ratio
      }}
      // The whole card is clickable to edit, but only when active in the coverflow
      onClick={() => isCoverFlowActive && onEditCampaign(campaign)}
    >
      <CardMedia
        sx={{
          flexGrow: 1,
          backgroundColor: 'grey.200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        image={previewImageUrl}
      >
        {!previewImageUrl && <ImageIcon sx={{ fontSize: 60, color: 'grey.500' }} />}
      </CardMedia>
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="h6"
          component="h2"
          title={campaign.name}
        >
          {campaign.name}
        </Typography>
      </CardContent>

      {/* The delete button is only visible on the active (centered) card */}
      {isCoverFlowActive && (
        <CardActions
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}
        >
          <IconButton
            aria-label="delete"
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Prevent the card's onClick from firing
              onDeleteCampaign(campaign.id, campaign.name);
            }}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 0, 0, 0.7)',
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
};

export default CampaignCard;