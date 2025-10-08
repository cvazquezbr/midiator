import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'sonner';

// The path is now relative to the new location of the stub
import BriefingWizard, { emptyBriefingWizardData } from '../../src/components/BriefingWizard';

// A basic theme to ensure MUI components render correctly.
const theme = createTheme();

const BriefingWizardStub = () => {
  const [briefingData, setBriefingData] = useState(emptyBriefingWizardData);

  const handleDataChange = (updater) => {
    if (typeof updater === 'function') {
      setBriefingData(updater);
    } else {
      // This handles direct object updates
      setBriefingData(prev => ({ ...prev, ...updater }));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BriefingWizard
        open={true}
        onClose={() => console.log('Close button clicked')}
        onSave={() => console.log('Save button clicked', briefingData)}
        briefingData={briefingData}
        onBriefingDataChange={handleDataChange}
        initialStep={2} // Start directly on the "Guia da Marca" step
      />
      <Toaster richColors />
    </ThemeProvider>
  );
};

export default BriefingWizardStub;