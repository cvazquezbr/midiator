import React from 'react';
import { Box } from '@mui/material';
import './SoundWaveAnimation.css';

const SoundWaveAnimation = ({ progress }) => {
  const bars = Array.from({ length: 50 }, (_, i) => i);
  const activeBars = Math.floor((progress / 100) * 50);

  return (
    <Box className="sound-wave-container">
      {bars.map((_, index) => (
        <Box
          key={index}
          className={`sound-wave-bar ${index < activeBars ? 'active' : ''}`}
          style={{
            animationDelay: `${index * 0.1}s`,
            animationPlayState: index < activeBars ? 'running' : 'paused',
          }}
        />
      ))}
    </Box>
  );
};

export default SoundWaveAnimation;
