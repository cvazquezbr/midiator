import React from 'react';
import ImageStepUI from './ImageStepUI';

// This component is now a simple pass-through container.
// All logic has been moved to ImageStepUI to directly use the context.
const ImageStep = (props) => {
  return <ImageStepUI {...props} />;
};

export default ImageStep;