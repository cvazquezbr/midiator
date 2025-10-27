import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import styles from './RecordCard.module.css';

const RecordCard = ({ registro, colunas, onEditar, onExcluir, darkMode }) => {
  const containerClasses = `${styles.card} ${darkMode ? styles.darkMode : ''}`;

  return (
    <Card className={containerClasses} variant="outlined">
      <CardContent className={styles.cardContent}>
        <Box className={styles.cardHeader}>
          <Typography variant="h6" component="div" className={styles.title}>
            {registro['Título'] || registro[colunas[0]] || `Registro #${registro.id}`}
          </Typography>
          <Box className={styles.actions}>
            <Tooltip title="Editar">
              <IconButton onClick={() => onEditar(registro)} size="small">
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir">
              <IconButton onClick={() => onExcluir(registro)} size="small">
                <Delete />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box className={styles.fieldsContainer}>
          {colunas.map((coluna) => {
            // Não renderiza o título novamente se ele já foi usado no cabeçalho
            if (coluna === 'Título' && registro['Título']) return null;
            // Garante que temos um valor para exibir
            const valor = registro[coluna] || '-';
            return (
              <Box key={coluna} className={styles.field}>
                <Typography variant="caption" className={styles.fieldName}>
                  {coluna}
                </Typography>
                <Typography variant="body2" className={styles.fieldValue}>
                  {String(valor)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

RecordCard.propTypes = {
  registro: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    Título: PropTypes.string,
  }).isRequired,
  colunas: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEditar: PropTypes.func.isRequired,
  onExcluir: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

RecordCard.defaultProps = {
  darkMode: false,
};

export default RecordCard;
