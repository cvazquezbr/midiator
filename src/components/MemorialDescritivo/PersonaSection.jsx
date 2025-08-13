import React from 'react';
import { Typography, Box, Grid, List, ListItem, ListItemIcon, ListItemText, Chip } from '@mui/material';
import SectionCard from '../common/SectionCard';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const DetailItem = ({ title, value }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  const renderValue = () => {
    if (Array.isArray(value)) {
      // Check if it's a list of strings to be rendered as chips
      if (value.every(item => typeof item === 'string' && !item.includes(' '))) {
         return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {value.map((item, index) => (
              <Chip key={index} label={item.trim()} />
            ))}
          </Box>
        );
      }
      // Otherwise, render as a list
      return (
        <List dense sx={{ p: 0 }}>
          {value.map((item, index) => (
            <ListItem key={index} sx={{ p: 0 }}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1, color: 'primary.main' }}>
                <ChevronRightIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      );
    }
    // Render simple string value
    return <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{value}</Typography>;
  };

  return (
    <Grid item xs={12} md={6}>
        <Box>
            <Typography variant="h6" component="h4" color="primary.main" sx={{ mb: 1 }}>
                {title}
            </Typography>
            <Box sx={{
                borderLeft: '3px solid',
                borderColor: 'primary.light',
                pl: 2,
            }}>
                {renderValue()}
            </Box>
        </Box>
    </Grid>
  );
};


const PersonaSection = ({ persona }) => {
  if (!persona || Object.keys(persona).length === 0) {
    return null;
  }

  // Create a more readable title from a camelCase key
  const formatTitle = (key) => {
    const result = key.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  return (
    <SectionCard>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        Persona
      </Typography>
      <Grid container spacing={4}>
        {Object.entries(persona).map(([key, value]) => (
          <DetailItem
            key={key}
            title={formatTitle(key)}
            value={value}
          />
        ))}
      </Grid>
    </SectionCard>
  );
};

export default PersonaSection;
