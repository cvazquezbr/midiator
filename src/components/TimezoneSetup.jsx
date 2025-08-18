import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Typography, Box } from '@mui/material';

// A curated list of common timezones for the user to select from.
const timezones = [
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
  { value: 'America/New_York', label: 'Nova Iorque (UTC-4)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-5)' },
  { value: 'America/Denver', label: 'Denver (UTC-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-7)' },
  { value: 'Europe/London', label: 'Londres (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (UTC+9)' },
  { value: 'UTC', label: 'UTC' },
];

const TimezoneSetup = () => {
  // Default to 'America/Sao_Paulo' as requested.
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  // On component mount, load the saved timezone from localStorage.
  useEffect(() => {
    const savedTimezone = localStorage.getItem('user_timezone');
    if (savedTimezone) {
      setTimezone(savedTimezone);
    } else {
      // If no timezone is saved, set the default one in localStorage.
      localStorage.setItem('user_timezone', 'America/Sao_Paulo');
    }
  }, []);

  const handleChange = (event) => {
    const newTimezone = event.target.value;
    setTimezone(newTimezone);
    // Persist the new selection to localStorage immediately.
    localStorage.setItem('user_timezone', newTimezone);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configuração de Fuso Horário
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Selecione o fuso horário de referência para os seus agendamentos. Todos os horários de postagem serão baseados nesta configuração.
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="timezone-select-label">Fuso Horário</InputLabel>
        <Select
          labelId="timezone-select-label"
          id="timezone-select"
          value={timezone}
          label="Fuso Horário"
          onChange={handleChange}
        >
          {timezones.map((tz) => (
            <MenuItem key={tz.value} value={tz.value}>
              {tz.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default TimezoneSetup;
