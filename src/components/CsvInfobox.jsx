import React, { useState } from 'react';
import { IconButton, Popover, Typography, Box, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const CsvInfobox = () => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'csv-infobox-popover' : undefined;

  return (
    <>
      <IconButton
        aria-describedby={id}
        onClick={handleClick}
        size="small"
        sx={{ ml: 0.5, color: 'text.secondary' }}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            p: 2,
            maxWidth: 350,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
          O que é um arquivo CSV?
        </Typography>
        <Typography variant="body2" paragraph>
          CSV (Comma-Separated Values) é um formato de arquivo de texto que armazena dados tabulares (números e texto) em formato de texto plano. Cada linha do arquivo é um registro de dados, e cada registro consiste em um ou mais campos, separados por vírgulas (ou outro delimitador, como ponto e vírgula).
        </Typography>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          Regras de Formatação para este App:
        </Typography>
        <List dense disablePadding>
          <ListItem sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary="Delimitador: Ponto e vírgula (;)." />
          </ListItem>
          <ListItem sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary="Cabeçalho: A primeira linha deve conter os nomes das colunas (ex: Titulo;Texto Principal;Ponte para o Próximo)." />
          </ListItem>
          <ListItem sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary="Codificação: UTF-8 (recomendado para suportar caracteres especiais)." />
          </ListItem>
          <ListItem sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary="Dados: Cada linha subsequente representa um post, com os campos na mesma ordem do cabeçalho." />
          </ListItem>
           <ListItem sx={{ pl: 0 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CheckCircleOutlineIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText primary='Aspas: Se um campo contiver o delimitador (ponto e vírgula), o campo inteiro deve ser envolto em aspas duplas (").' />
          </ListItem>
        </List>
         <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
          Exemplo de linha: <code>"✨ Novidade";"Texto com ; detalhe";"➡️ Próximo"</code>
        </Typography>
      </Popover>
    </>
  );
};

export default CsvInfobox;
