import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import PaletteReport from './PaletteReport';

const PaletteReportModal = ({ open, onClose, paletteData, onApplyPalette, briefing }) => {
  const handlePrint = () => {
    const printSection = document.querySelector('.printable-section');
    if (printSection) {
      window.print();
    } else {
      toast.error('Não foi possível encontrar a seção para impressão.');
    }
  };

  if (!paletteData || !briefing) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Memorial Descritivo da Paleta de Cores
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              .printable-section, .printable-section * {
                visibility: visible;
              }
              .printable-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .no-print {
                display: none;
              }
            }
          `}
        </style>
        <PaletteReport paletteData={paletteData} briefing={briefing} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }} className="no-print">
        <Button onClick={handlePrint} startIcon={<PrintIcon />}>
          Imprimir
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onApplyPalette();
            onClose();
          }}
        >
          Usar Esta Paleta
        </Button>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaletteReportModal;
