import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import './GeminiTutorial.css';

const GeminiTutorial = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Como obter sua Chave da API Gemini (Google AI Studio)
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div className="tutorial-container">
          <ol>
            <li>
              <strong>Acesse o Google AI Studio:</strong>
              <p>
                Visite o site{' '}
                <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
                  Google AI Studio
                </a>{' '}
                e faça login com sua conta do Google.
              </p>
              <div className="image-placeholder">
                [Screenshot of Google AI Studio login page]
              </div>
            </li>
            <li>
              <strong>Crie uma nova chave de API:</strong>
              <p>
                No menu à esquerda, clique em <strong>"Get API key"</strong>.
              </p>
              <div className="image-placeholder">
                [Screenshot of "Get API key" button]
              </div>
            </li>
            <li>
              <strong>Copie sua chave:</strong>
              <p>
                Na janela que aparecer, clique em <strong>"Create API key"</strong>. Sua chave será gerada.
                Clique no botão para copiar a chave para a área de transferência.
              </p>
              <div className="image-placeholder">
                [Screenshot of "Create API key" button and the generated key]
              </div>
            </li>
            <li>
              <strong>Cole a chave na aplicação:</strong>
              <p>
                Volte para esta página e cole a chave copiada no campo "Chave da API Gemini".
              </p>
            </li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GeminiTutorial;
