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
    if (typeof value === 'object' && value !== null) {
      return (
        <pre style={{ fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</Typography>;
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
  if (!persona || !persona.persona_data || Object.keys(persona.persona_data).length === 0) {
    return null;
  }

  const {
    nome,
    posicaoCargo,
    segmentoEmpresa,
    responsabilidadesChave,
    doresEstrategicos,
    doresOperacionais,
    doresPessoas,
    doresRegulatorios,
    gatilhosCompra,
    barreirasAdocao,
    mentalidadeValores,
    contextoCultural,
    description,
  } = persona.persona_data;

  const allDores = [
    ...(doresEstrategicos || []),
    ...(doresOperacionais || []),
    ...(doresPessoas || []),
    ...(doresRegulatorios || [])
  ];

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Perfil da Persona: {nome}
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        A persona é a representação do nosso cliente ideal. Entender profundamente seus desafios, motivações e características demográficas é o primeiro passo para criar uma comunicação que gere conexão e resultados. Tudo o que produzimos deve ser pensado para dialogar com esta pessoa.
      </Typography>
      <Grid container spacing={4}>
        <DetailItem title="Posição / Cargo" value={posicaoCargo} />
        <DetailItem title="Segmento da Empresa" value={segmentoEmpresa} />
        <DetailItem title="Responsabilidades Chave" value={responsabilidadesChave} />
        <DetailItem title="Dores e Desafios" value={allDores} />
        <DetailItem title="Gatilhos de Compra" value={gatilhosCompra} />
        <DetailItem title="Barreiras de Adoção" value={barreirasAdocao} />
        <DetailItem title="Mentalidade e Valores" value={mentalidadeValores} isHtml={true} />
        <DetailItem title="Contexto Cultural" value={contextoCultural} isHtml={true} />
        {description && <DetailItem title="Descrição (gerada por IA)" value={description} />}
      </Grid>
    </Box>
  );
};

export default PersonaSection;
