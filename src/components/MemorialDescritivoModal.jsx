import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import {
    Close as CloseIcon,
    Print as PrintIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useIsMobile } from '../hooks/use-mobile';
import MemorialDescritivo from './MemorialDescritivo'; // Import the new main component

const MemorialDescritivoModal = ({ open, onClose, campaignData }) => {
  const isMobile = useIsMobile();

  const handlePrint = () => {
    const printSection = document.querySelector('.printable-section');
    if (printSection) {
      const parent = printSection.parentElement;
      // Temporarily adjust styles for printing dialog content
      const originalOverflow = parent.style.overflow;
      parent.style.overflow = 'visible';

      window.print();

      // Restore original styles
      parent.style.overflow = originalOverflow;
    } else {
      toast.error('Não foi possível encontrar a seção para impressão.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Memorial Descritivo da Campanha
        <IconButton onClick={onClose} className="no-print">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className="printable-section">
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
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .printable-section h4 {
                break-after: avoid;
              }
              .printable-section .MuiPaper-root, .printable-section .MuiBox-root {
                 break-inside: avoid;
              }
              .no-print {
                display: none;
              }
            }
          `}
        </style>
        <MemorialDescritivo campaignData={campaignData} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }} className="no-print">
        <Button onClick={handlePrint} startIcon={<PrintIcon />}>
          Imprimir / Salvar PDF
        </Button>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemorialDescritivoModal;
