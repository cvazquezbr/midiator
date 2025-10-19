import React from 'react';
import { Box, Typography, Button, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Você também pode registrar o erro em um serviço de relatórios de erro
    console.error("ErrorBoundary pegou um erro:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleCopyToClipboard = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorDetails = `
--- ERRO CAPTURADO ---
Mensagem: ${error.toString()}

--- STACK DO ERRO ---
${error.stack}

--- STACK DO COMPONENTE ---
${errorInfo ? errorInfo.componentStack : 'Não disponível.'}
    `;
    navigator.clipboard.writeText(errorDetails.trim());
  };

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback personalizada
      return (
        <Box sx={{ p: 2, m: 'auto', maxWidth: '900px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper elevation={3} sx={{ p: 3, width: '100%' }}>
            <Typography variant="h5" color="error" gutterBottom>
              Oops! Algo deu errado na aplicação.
            </Typography>
            <Typography variant="body1" gutterBottom>
              Um erro inesperado ocorreu, o que impediu o carregamento desta parte da aplicação. Tente recarregar a página. Se o problema persistir, os detalhes técnicos abaixo podem ajudar a diagnosticar o problema.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 3 }}>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
              >
                Recarregar a Página
              </Button>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={this.handleCopyToClipboard}
                disabled={!this.state.error}
              >
                Copiar Detalhes do Erro
              </Button>
            </Box>

            {this.state.error && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Ver Detalhes Técnicos</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ maxHeight: '300px', overflowY: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    <strong>Erro:</strong> {this.state.error.toString()}
                  </Typography>
                  <hr style={{ margin: '16px 0' }} />
                  {this.state.errorInfo && (
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      <strong>Stack de Componentes:</strong>
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
