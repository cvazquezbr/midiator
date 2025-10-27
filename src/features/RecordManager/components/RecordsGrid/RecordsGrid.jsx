import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Box, Typography } from '@mui/material';
import RecordCard from '../RecordCard/RecordCard';
import styles from './RecordsGrid.module.css';

const RecordsGrid = ({ registros, colunas, onEditar, onExcluir, darkMode }) => {
  if (!registros || registros.length === 0) {
    return (
      <Box className={styles.emptyState}>
        <Typography variant="h6" color="textSecondary">
          Nenhum registro encontrado.
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Clique em "Adicionar Novo Registro" para começar.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.gridContainer}>
      <Grid container spacing={3}>
        {registros.map((registro) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={registro.id}>
            <RecordCard
              registro={registro}
              colunas={colunas}
              onEditar={onEditar}
              onExcluir={onExcluir}
              darkMode={darkMode}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

RecordsGrid.propTypes = {
  registros: PropTypes.arrayOf(PropTypes.object).isRequired,
  colunas: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEditar: PropTypes.func.isRequired,
  onExcluir: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

RecordsGrid.defaultProps = {
  darkMode: false,
};

export default RecordsGrid;
