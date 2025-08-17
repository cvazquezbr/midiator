import React, { useState, useEffect } from 'react';
import { Grid, Typography, ButtonBase, Paper, Box } from '@mui/material';
import chroma from 'chroma-js';

const heatMapData = {
    '00:00': [0, 0, 0, 0, 0, 0, 0],
    '01:00': [0, 0, 1, 1, 1, 1, 0],
    '02:00': [0, 1, 3, 5, 4, 3, 0],
    '03:00': [0, 1, 3, 5, 4, 3, 0],
    '04:00': [0, 1, 4, 5, 4, 3, 0],
    '05:00': [0, 1, 4, 6, 4, 3, 0],
    '06:00': [0, 2, 6, 6, 6, 4, 0],
    '07:00': [1, 4, 8, 7, 8, 4, 0],
    '08:00': [4, 7, 10, 9, 9, 5, 1],
    '09:00': [6, 8, 10, 9, 9, 5, 2],
    '10:00': [6, 8, 9, 9, 9, 5, 3],
    '11:00': [5, 7, 8, 8, 8, 5, 3],
    '12:00': [4, 5, 7, 7, 7, 4, 2],
    '13:00': [3, 4, 6, 6, 6, 4, 2],
    '14:00': [2, 4, 5, 6, 6, 3, 1],
    '15:00': [3, 4, 5, 6, 6, 3, 1],
    '16:00': [3, 4, 5, 5, 6, 3, 1],
    '17:00': [2, 3, 4, 4, 5, 2, 1],
    '18:00': [2, 3, 4, 4, 5, 2, 1],
    '19:00': [2, 3, 4, 4, 4, 2, 1],
    '20:00': [1, 2, 3, 3, 4, 2, 1],
    '21:00': [1, 2, 3, 3, 3, 1, 1],
    '22:00': [1, 1, 2, 2, 3, 1, 1],
    '23:00': [0, 1, 2, 2, 2, 1, 0],
};

// Days of week for display: Dom, Seg, Ter, Qua, Qui, Sex, Sab
const displayDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Mapping from JS getDay() index (0=Sun) to our display and data order.
// Data order is Seg-Dom, so we map Sun to index 6.
const dayIndexMapping = [6, 0, 1, 2, 3, 4, 5]; // getDay() index -> data index

const allHours = Object.keys(heatMapData);

const colorScale = chroma.scale(['#d73027', '#fee08b', '#1a9850']).domain([0, 5, 10]);

const getColor = (value) => {
    if (value === 0) return '#e0e0e0';
    return colorScale(value).hex();
};

const TimeHeatMap = ({ weeklySchedule = {}, onScheduleChange, startHour = 0, endHour = 23 }) => {
    const hours = allHours.filter(hour => {
        const h = parseInt(hour.split(':')[0], 10);
        return h >= startHour && h <= endHour;
    });

    const handleTimeSelect = (dayIndex, hour) => {
        const newSchedule = {
            ...weeklySchedule,
            [dayIndex]: hour,
        };
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
                            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{hour}</Typography>
                        </Grid>
                        {displayDays.map((day, displayIndex) => {
                            // displayIndex is 0 for Sun, 1 for Mon, etc.
                            const dataIndex = dayIndexMapping[displayIndex];
                            const value = heatMapData[hour][dataIndex];
                            const isSelected = weeklySchedule[displayIndex] === hour;
                            const selectedColor = '#ffc107'; // Amber color for selection
                            const bgColor = isSelected ? selectedColor : getColor(value);
                            const textColor = chroma(bgColor).luminance() > 0.4 ? 'black' : 'white';

                            return (
                                <Grid item xs={1.5} key={`${day}-${hour}`}>
                                    <ButtonBase
                                        onClick={() => handleTimeSelect(displayIndex, hour)}
                                        sx={{
                                            width: '100%',
                                            height: '22px', // Reduced height
                                            backgroundColor: bgColor,
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
                                                fontSize: '0.7rem', // Reduced font size
                                                color: textColor,
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
