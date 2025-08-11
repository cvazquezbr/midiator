import React from 'react';
import { Grid, Typography, ButtonBase } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const heatMapData = {
  // Segunda, Terça, Quarta, Quinta, Sexta, Sábado, Domingo
  '00:00': [0, 0, 0, 0, 0, 0, 0],
  '01:00': [0, 0, 0, 0, 0, 0, 0],
  '02:00': [0, 0, 0, 0, 0, 0, 0],
  '03:00': [0, 0, 0, 0, 0, 0, 0],
  '04:00': [0, 0, 0, 0, 0, 0, 0],
  '05:00': [0, 0, 0, 0, 0, 0, 0],
  '06:00': [0, 0, 0, 0, 0, 0, 0],
  '07:00': [0, 0, 0, 0, 0, 0, 0],
  '08:00': [0, 67, 67, 31, 0, 0, 0],
  '09:00': [33, 100, 100, 65, 33, 0, 0],
  '10:00': [26, 100, 100, 100, 0, 15, 9],
  '11:00': [26, 100, 100, 100, 0, 15, 9],
  '12:00': [26, 65, 65, 65, 0, 15, 9],
  '13:00': [0, 31, 31, 31, 0, 0, 0],
  '14:00': [33, 65, 65, 65, 33, 0, 0],
  '15:00': [0, 0, 0, 0, 0, 0, 0],
  '16:00': [0, 0, 0, 0, 0, 0, 0],
  '17:00': [0, 0, 0, 0, 0, 0, 0],
  '18:00': [0, 0, 0, 0, 0, 0, 0],
  '19:00': [0, 0, 0, 0, 0, 0, 0],
  '20:00': [0, 0, 0, 0, 0, 0, 0],
  '21:00': [0, 0, 0, 0, 0, 0, 0],
  '22:00': [0, 0, 0, 0, 0, 0, 0],
  '23:00': [0, 0, 0, 0, 0, 0, 0],
};

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const hours = Object.keys(heatMapData);

const getColor = (value) => {
  if (value === 0) return '#f0f0f0'; // Light grey for 0
  const intensity = value / 100;
  const hue = 0; // Red
  const saturation = 100;
  const lightness = 100 - (50 * intensity); // from 100 (white) down to 50 (red)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const TimeHeatMap = ({ selectedDate, selectedTime, onTimeSelect }) => {
  const selectedDay = selectedDate ? selectedDate.getDay() : -1; // Domingo = 0, Segunda = 1, ...

  return (
    <Grid container spacing={0.5}>
      {/* Header Row */}
      <Grid item xs={1.5} />
      {daysOfWeek.map((day, index) => (
        <Grid item xs={1.5} key={day} sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: selectedDay === index ? 'bold' : 'normal', color: selectedDay === index ? 'primary.main' : 'text.secondary' }}>
            {day}
          </Typography>
        </Grid>
      ))}

      {/* Data Rows */}
      {hours.map((hour) => (
        <React.Fragment key={hour}>
          <Grid item xs={1.5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption">{hour}</Typography>
          </Grid>
          {daysOfWeek.map((day, dayIndex) => {
            // Note: The provided data seems to be Monday-first, but getDay() is Sunday-first.
            // Let's adjust the index to match the data.
            // Data: Seg, Ter, Qua, Qui, Sex, Sab, Dom
            // getDay(): Dom(0), Seg(1), Ter(2), Qua(3), Qui(4), Sex(5), Sab(6)
            // Mapping: Dom -> 6, Seg -> 0, Ter -> 1, etc.
            const dataDayIndex = (dayIndex === 0) ? 6 : dayIndex - 1;
            const value = heatMapData[hour][dataDayIndex];
            const isSelected = selectedTime === hour;

            return (
              <Grid item xs={1.5} key={`${day}-${hour}`}>
                <ButtonBase
                  onClick={() => onTimeSelect(hour)}
                  sx={{
                    width: '100%',
                    height: '30px',
                    backgroundColor: getColor(value),
                    border: dayIndex === selectedDay ? '2px solid #1976d2' : '1px solid #ddd',
                    borderRadius: '4px',
                    opacity: value > 0 ? 1 : 0.5,
                    boxSizing: 'border-box',
                    ...(isSelected && {
                      border: '3px solid #000',
                      zIndex: 1
                    }),
                    '&:hover': {
                      border: '2px solid #000',
                      opacity: 1,
                    },
                  }}
                  disabled={value === 0}
                >
                  <Typography variant="caption" sx={{ color: value > 50 ? 'white' : 'black', fontWeight: 'bold' }}>
                    {value > 0 ? value : ''}
                  </Typography>
                </ButtonBase>
              </Grid>
            );
          })}
        </React.Fragment>
      ))}
    </Grid>
  );
};

export default TimeHeatMap;
