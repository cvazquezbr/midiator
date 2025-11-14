import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

const PaletteMenuItem = ({ palette }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
    <Typography sx={{ flexGrow: 1 }}>{palette.name}</Typography>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {(palette.colors || []).slice(0, 5).map((color, index) => (
        <Box
          key={index}
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: color.hex,
            border: '1px solid #ccc',
          }}
        />
      ))}
    </Box>
  </Box>
);

const PaletteSelector = ({
  palettes = [],
  value,
  onChange,
  label = "Paleta de Cores",
  disabled = false,
}) => {
  return (
    <FormControl fullWidth>
      <InputLabel id="palette-label">{label}</InputLabel>
      <Select
        labelId="palette-label"
        value={value}
        label={label}
        onChange={onChange}
        disabled={disabled}
      >
        <MenuItem value=""><em>Nenhuma</em></MenuItem>
        {palettes.map((palette) => (
          <MenuItem key={palette.id} value={palette.id}>
            <PaletteMenuItem palette={palette} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default PaletteSelector;
