import React from 'react';
import { Box } from '@mui/material';

const Placeholder = ({
  placeholderDimensions,
  narrationVideoPosition,
  narrationVideoSize,
  imageContainerRef,
}) => {
  if (!placeholderDimensions.width || !imageContainerRef.current) {
    return null;
  }

  const width =
    (narrationVideoSize.width / imageContainerRef.current.offsetWidth) * 100;
  const height =
    (narrationVideoSize.height / imageContainerRef.current.offsetHeight) * 100;
  const bottom =
    (narrationVideoPosition.y / imageContainerRef.current.offsetHeight) * 100;
  const left =
    (narrationVideoPosition.x / imageContainerRef.current.offsetWidth) * 100;

  return (
    <Box
      sx={{
        position: 'absolute',
        width: `${width}%`,
        height: `${height}%`,
        border: '2px dashed white',
        bottom: `${bottom}%`,
        left: `${left}%`,
        boxSizing: 'border-box',
      }}
    />
  );
};

export default Placeholder;
