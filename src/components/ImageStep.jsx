import React, { useState } from 'react';
import ImageStepUI from './ImageStepUI';

const ImageStep = (props) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  // Note: currentPreviewIndex and setCurrentPreviewIndex are still passed from HomePage
  // as they are used by other components (like the TextEditorDialog).
  // This could be further refactored into the context if needed.
  const { aspectRatio, imagePalette, ...rest } = props;

  return (
    <ImageStepUI
      {...rest}
      imagePalette={imagePalette}
      isDrawerOpen={isDrawerOpen}
      setIsDrawerOpen={setIsDrawerOpen}
      isCropping={isCropping}
      setIsCropping={setIsCropping}
    />
  );
};

export default ImageStep;
