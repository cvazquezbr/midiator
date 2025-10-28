import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    TextField,
    CircularProgress,
    Alert,
    IconButton,
    Grid,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const RevisaoTextoModal = ({
    textoOriginal,
    onFechar,
    onSalvar,
    open,
}) => {
    const [sugestao, setSugestao] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        const fetchSugestao = async () => {
            setCarregando(true);
            setErro(null);
            try {
                const response = await fetch('/api/revisar-texto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ texto: textoOriginal }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Falha ao obter sugestão da IA.');
                }

                const data = await response.json();
                setSugestao(data.textoRevisado);
            } catch (error) {
                setErro(error.message);
            } finally {
                setCarregando(false);
            }
        };

        if (open && textoOriginal) {
            fetchSugestao();
        }
    }, [open, textoOriginal]);

    const handleSalvar = () => {
        onSalvar(sugestao);
    };

    return (
        <Dialog open={open} onClose={onFechar} fullWidth maxWidth="md">
            <DialogTitle>
                Revisão de Texto
                <IconButton
                    aria-label="close"
                    onClick={onFechar}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>Texto Original</Typography>
                        <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 1, minHeight: 200, backgroundColor: '#f5f5f5' }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{textoOriginal}</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>Sugestão de Revisão</Typography>
                        {carregando ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                                <CircularProgress />
                            </Box>
                        ) : erro ? (
                            <Alert severity="error">{erro}</Alert>
                        ) : (
                            <TextField
                                multiline
                                rows={8}
                                value={sugestao}
                                onChange={(e) => setSugestao(e.target.value)}
                                variant="outlined"
                                fullWidth
                            />
                        )}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onFechar}>Cancelar</Button>
                <Button onClick={handleSalvar} variant="contained" disabled={carregando}>
                    Aceitar Sugestão
                </Button>
            </DialogActions>
        </Dialog>
    );
};

RevisaoTextoModal.propTypes = {
    textoOriginal: PropTypes.string.isRequired,
    onFechar: PropTypes.func.isRequired,
    onSalvar: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
};

export default RevisaoTextoModal;
