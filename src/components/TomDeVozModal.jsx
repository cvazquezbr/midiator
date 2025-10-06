import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Paper
} from '@mui/material';

const TONS_DE_VOZ_DATA = [
  { tom: 'Próximo e Humano', quando: 'Para criar vínculo emocional, campanhas de lifestyle, bem-estar, cuidado.', como: 'Empático, acolhedor, acessível.', exemplo: '“A gente sabe que sua rotina é corrida, por isso criamos essa solução rápida e prática.”' },
  { tom: 'Inspirador e Aspiracional', quando: 'Quando a marca quer elevar autoestima, estilo de vida ou conquistas.', como: 'Motivador, positivo, sonhador.', exemplo: '“Mais que um produto, é um convite para você viver sua melhor versão.”' },
  { tom: 'Didático e Prático', quando: 'Em instruções, briefings de UGC, passo a passo, orientações claras.', como: 'Objetivo, simples, direto.', exemplo: '“Passo 1: escolha o formato. Passo 2: grave em boa luz. Passo 3: suba seu vídeo na plataforma.”' },
  { tom: 'Cool e Descolado', quando: 'Para públicos jovens, moda, música, drinks, cultura pop.', como: 'Leve, divertido, atual.', exemplo: '“Tá liberado soltar a criatividade e mostrar seu estilo único. A gente quer ver a sua versão mais autêntica!”' },
  { tom: 'Profissional e Objetivo', quando: 'Em contextos mais sérios: saúde, finanças, B2B, campanhas institucionais.', como: 'Confiante, claro, responsável.', exemplo: '“Nosso compromisso é entregar qualidade com segurança. Participe e leve sua experiência ao próximo nível.”' },
];

const TomDeVozModal = ({ open, onClose, selectedTones, onSave }) => {
  const [localSelection, setLocalSelection] = React.useState(selectedTones);

  React.useEffect(() => {
    setLocalSelection(selectedTones);
  }, [open, selectedTones]);

  const handleToggle = (value) => {
    // If the clicked value is already selected, unselect it.
    // Otherwise, select it as the only one.
    const newSelection = localSelection.includes(value) ? [] : [value];
    setLocalSelection(newSelection);
  };

  const handleConfirm = () => {
    onSave(localSelection);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Selecione o Tom de Voz</DialogTitle>
      <DialogContent>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Tom de Voz</TableCell>
                <TableCell>Quando Usar</TableCell>
                <TableCell>Como Soa</TableCell>
                <TableCell>Exemplo de Frase</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {TONS_DE_VOZ_DATA.map((row) => (
                <TableRow key={row.tom} hover onClick={() => handleToggle(row.tom)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={localSelection.includes(row.tom)}
                    />
                  </TableCell>
                  <TableCell>{row.tom}</TableCell>
                  <TableCell>{row.quando}</TableCell>
                  <TableCell>{row.como}</TableCell>
                  <TableCell>{row.exemplo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained">Confirmar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TomDeVozModal;