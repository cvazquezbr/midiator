import React, { useState, useEffect } from 'react';
import { Grid, Typography, ButtonBase, Paper } from '@mui/material';

const heatMapData = {
    // Data provided by user
    '00:00': [0, 0, 0, 0, 0, 0, 0], '01:00': [0, 0, 0, 0, 0, 0, 0],
    '02:00': [0, 0, 0, 0, 0, 0, 0], '03:00': [0, 0, 0, 0, 0, 0, 0],
    '04:00': [0, 0, 0, 0, 0, 0, 0], '05:00': [0, 0, 0, 0, 0, 0, 0],
    '06:00': [0, 0, 0, 0, 0, 0, 0], '07:00': [0, 0, 0, 0, 0, 0, 0],
    '08:00': [0, 67, 67, 31, 0, 0, 0], '09:00': [33, 100, 100, 65, 33, 0, 0],
    '10:00': [26, 100, 100, 100, 0, 15, 9], '11:00': [26, 100, 100, 100, 0, 15, 9],
    '12:00': [26, 65, 65, 65, 0, 15, 9], '13:00': [0, 31, 31, 31, 0, 0, 0],
    '14:00': [33, 65, 65, 65, 33, 0, 0], '15:00': [0, 0, 0, 0, 0, 0, 0],
    '16:00': [0, 0, 0, 0, 0, 0, 0], '17:00': [0, 0, 0, 0, 0, 0, 0],
    '18:00': [0, 0, 0, 0, 0, 0, 0], '19:00': [0, 0, 0, 0, 0, 0, 0],
    '20:00': [0, 0, 0, 0, 0, 0, 0], '21:00': [0, 0, 0, 0, 0, 0, 0],
    '22:00': [0, 0, 0, 0, 0, 0, 0], '23:00': [0, 0, 0, 0, 0, 0, 0],
};

// Days of week for display: Dom, Seg, Ter, Qua, Qui, Sex, Sab
const displayDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Mapping from JS getDay() index (0=Sun) to our display and data order.
// Data order is Seg-Dom, so we map Sun to index 6.
const dayIndexMapping = [6, 0, 1, 2, 3, 4, 5]; // getDay() index -> data index

const hours = Object.keys(heatMapData);

const getColor = (value) => {
    if (value === 0) return '#e0e0e0'; // A slightly darker grey for zero values
    const intensity = value / 100;
    // Using a blue color scale this time for variety
    const h = 210; // Hue for blue
    const s = 100; // Saturation
    const l = 95 - (50 * intensity); // Lightness from 95% (very light blue) to 45% (deep blue)
    return `hsl(${h}, ${s}%, ${l}%)`;
};

const TimeHeatMap = ({ onScheduleChange }) => {
    // State to store the selected hour for each day of the week.
    // Key is the JS getDay() index (0=Sun, 1=Mon, ...).
    const [weeklySchedule, setWeeklySchedule] = useState({});

    const handleTimeSelect = (dayIndex, hour) => {
        const newSchedule = {
            ...weeklySchedule,
            [dayIndex]: hour,
        };
        setWeeklySchedule(newSchedule);
        if (onScheduleChange) {
            onScheduleChange(newSchedule);
        }
    };

    return (
        <Paper elevation={2} sx={{ p: 2, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <Typography variant="subtitle1" gutterBottom align="center">
                Defina o horário de postagem para cada dia da semana
            </Typography>
            <Grid container spacing={0.5} sx={{ mt: 1 }}>
                {/* Header Row */}
                <Grid item xs={1.5} />
                {displayDays.map((day) => (
                    <Grid item xs={1.5} key={day} sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
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
                        {displayDays.map((day, displayIndex) => {
                            // displayIndex is 0 for Sun, 1 for Mon, etc.
                            const dataIndex = dayIndexMapping[displayIndex];
                            const value = heatMapData[hour][dataIndex];
                            const isSelected = weeklySchedule[displayIndex] === hour;
                            const selectedColor = '#ffc107'; // Amber color for selection

                            return (
                                <Grid item xs={1.5} key={`${day}-${hour}`}>
                                    <ButtonBase
                                        onClick={() => handleTimeSelect(displayIndex, hour)}
                                        sx={{
                                            width: '100%',
                                            height: '30px',
                                            backgroundColor: isSelected ? selectedColor : getColor(value),
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            boxSizing: 'border-box',
                                            ...(isSelected && {
                                                border: '2px solid #b28704', // Darker amber border
                                                zIndex: 1,
                                            }),
                                            '&:hover': {
                                                border: `2px solid ${isSelected ? '#b28704' : '#1565c0'}`,
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: value > 60 ? 'white' : 'black',
                                                fontWeight: isSelected ? 'bold' : 'normal'
                                            }}>
                                            {value > 0 ? value : ''}
                                        </Typography>
                                    </ButtonBase>
                                </Grid>
                            );
                        })}
                    </React.Fragment>
                ))}
            </Grid>
        </Paper>
    );
};

export default TimeHeatMap;
