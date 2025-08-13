import React from 'react';
import { Typography, Box, Paper, Grid, Tooltip, Chip } from '@mui/material';
import SectionCard from '../common/SectionCard';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const ColorPalette = ({ colors }) => {
  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <SectionCard>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        Paleta de Cores
      </Typography>
      <Grid container spacing={3}>
        {colors.map((color, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  backgroundColor: color.hex,
                  borderRadius: '50%',
                  mb: 1,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  display: 'inline-block',
                }}
              />
              <Typography variant="h6" component="h4" sx={{ fontWeight: 'bold' }}>
                {color.name || 'Cor'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {color.hex} | {color.rgb}
              </Typography>
              <Chip label={color.role || 'N/A'} size="small" sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                Justificativa
                <Tooltip title={color.justification || 'Sem justificativa.'}>
                  <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </SectionCard>
  );
};

export default ColorPalette;
