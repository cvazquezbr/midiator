import React from 'react';
import { Typography, Box, Grid, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import SectionCard from '../common/SectionCard';
import CategoryAccordion from '../common/CategoryAccordion';
import InfoChip from '../common/InfoChip';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const renderValue = (value) => {
  if (Array.isArray(value)) {
    return (
      <List dense>
        {value.map((item, index) => (
          <ListItem key={index} sx={{ p: 0 }}>
            <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
              <ChevronRightIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={item} />
          </ListItem>
        ))}
      </List>
    );
  }
  if (typeof value === 'string' && value.includes(',')) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {value.split(',').map((item, index) => (
          <InfoChip key={index} label={item.trim()} />
        ))}
      </Box>
    );
  }
  return <Typography variant="body1">{value}</Typography>;
};

const PersonaSection = ({ persona }) => {
  if (!persona || Object.keys(persona).length === 0) {
    return null;
  }

  // Separate fields that should be accordions
  const accordionFields = {};
  const gridFields = {};

  Object.entries(persona).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      accordionFields[key] = value;
    } else {
      gridFields[key] = value;
    }
  });

  return (
    <SectionCard>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        Persona
      </Typography>

      <Grid container spacing={3}>
        {Object.entries(gridFields).map(([key, value]) => (
          <Grid item xs={12} md={6} key={key}>
            <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
              {key.replace(/_/g, ' ')}
            </Typography>
            {renderValue(value)}
          </Grid>
        ))}
      </Grid>

      {Object.keys(accordionFields).length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
            Dores, Desafios e Outros Detalhes
          </Typography>
          {Object.entries(accordionFields).map(([key, value]) => (
            <CategoryAccordion key={key} title={key.replace(/_/g, ' ')}>
              {renderValue(value)}
            </CategoryAccordion>
          ))}
        </Box>
      )}
    </SectionCard>
  );
};

export default PersonaSection;
