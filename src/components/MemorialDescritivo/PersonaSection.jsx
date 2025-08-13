import React from 'react';
import { Typography, Box, Grid, List, ListItem, ListItemIcon, ListItemText, Chip } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import parse from 'html-react-parser';

const DetailItem = ({ title, value, isHtml = false }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  const renderValue = () => {
    if (isHtml && typeof value === 'string') {
        return <Typography component="div" variant="body1">{parse(value)}</Typography>;
    }
    if (Array.isArray(value)) {
      if (value.every(item => typeof item === 'string' && !item.includes(' '))) {
         return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {value.map((item, index) => (
              <Chip key={index} label={item.trim()} />
            ))}
          </Box>
        );
      }
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
                 '& p, & li': { mb: 1.5 },
                 '& ul, & ol': { pl: 2.5 },
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

  const formatTitle = (key) => {
    const result = key.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const htmlFields = ['mentalidadeValores', 'contextoCultural', 'dores', 'necessidades', 'motivacoes', 'crencasLimitantes', 'sonhosAspiracoes', 'jornada'];

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Perfil da Persona
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        A persona é a representação do nosso cliente ideal. Entender profundamente seus desafios, motivações e características demográficas é o primeiro passo para criar uma comunicação que gere conexão e resultados. Tudo o que produzimos deve ser pensado para dialogar com esta pessoa.
      </Typography>
      <Grid container spacing={4}>
        {Object.entries(persona).map(([key, value]) => (
          <DetailItem
            key={key}
            title={formatTitle(key)}
            value={value}
            isHtml={htmlFields.includes(key)}
          />
        ))}
      </Grid>
    </Box>
  );
};

export default PersonaSection;
