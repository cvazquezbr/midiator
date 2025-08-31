import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

function UnsavedChangesDialog({ open, onClose, onConfirmSave, onConfirmDiscard }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="unsaved-changes-dialog-title"
            aria-describedby="unsaved-changes-dialog-description"
        >
            <DialogTitle id="unsaved-changes-dialog-title">
                {"Alterações não salvas"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="unsaved-changes-dialog-description">
                    Você tem alterações que não foram salvas. Deseja salvar antes de continuar?
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="secondary">
                    Cancelar
                </Button>
                <Button onClick={onConfirmDiscard} color="error">
                    Descartar Alterações
                </Button>
                <Button onClick={onConfirmSave} variant="contained" autoFocus>
                    Salvar e Continuar
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default UnsavedChangesDialog;
