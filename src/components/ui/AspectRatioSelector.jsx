import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography, Tooltip, FormControl, FormLabel } from '@mui/material';

const AspectRatioSelector = ({ value, onChange }) => {
  const handleAlignment = (event, newAlignment) => {
    // A ToggleButtonGroup pode retornar null se o botão clicado já estiver ativo.
    // Garantimos que um valor seja sempre passado para o callback onChange.
    if (newAlignment !== null) {
      // O onChange em Campaign.jsx e PageSetEditor.jsx espera um evento ou um valor direto.
      // Para manter a compatibilidade, passamos um objeto simulando o evento de um <Select>.
      onChange({ target: { value: newAlignment } });
    }
  };

  const options = [
    {
      value: '1:1',
      label: 'Quadrado (1:1)',
      width: 36,
      height: 36,
    },
    {
      value: '4:5',
      label: 'Retrato (4:5)',
      width: 28.8,
      height: 36,
    },
    {
      value: '16:9',
      label: 'Paisagem (16:9)',
      width: 48,
      height: 27,
    },
  ];

  return (
    <FormControl component="fieldset">
      <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.75rem' }}>Razão de Aspecto</FormLabel>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleAlignment}
        aria-label="seleção de razão de aspecto"
      >
        {options.map((option) => (
          <Tooltip title={option.label} key={option.value} placement="top">
            <ToggleButton
              value={option.value}
              aria-label={option.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 56, // Altura padrão dos botões do MUI
              }}
            >
              <Box
                sx={{
                  width: option.width,
                  height: option.height,
                  bgcolor: 'action.disabledBackground',
                  borderRadius: '2px',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              />
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </FormControl>
  );
};

export default AspectRatioSelector;
