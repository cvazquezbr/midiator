import React from 'react';
import { Box, Typography, Button, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.log("--- ERROR BOUNDARY CAUGHT AN ERROR ---");
    console.error("ErrorBoundary -> error:", error);
    console.error("ErrorBoundary -> errorInfo:", errorInfo);
    console.log("--- END OF ERROR BOUNDARY ---");
  }

  handleCopy = () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
      Error: ${error?.toString()}
      Stack Trace: ${error?.stack}
      Component Stack: ${errorInfo?.componentStack}
    `;
    navigator.clipboard.writeText(errorDetails.trim());
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, m: 'auto', maxWidth: '800px', textAlign: 'center' }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" color="error" gutterBottom>
              Something went wrong.
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              We've encountered an unexpected error. Please try refreshing the page.
            </Typography>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Error Details</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ textAlign: 'left', whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', borderRadius: 1, p: 2, overflowX: 'auto' }}>
                <Typography variant="subtitle2"><strong>Error:</strong></Typography>
                <pre style={{ margin: 0 }}>{this.state.error?.toString()}</pre>

                <Typography variant="subtitle2" sx={{ mt: 2 }}><strong>Stack Trace:</strong></Typography>
                <pre style={{ margin: 0 }}>{this.state.error?.stack}</pre>

                {this.state.errorInfo && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}><strong>Component Stack:</strong></Typography>
                    <pre style={{ margin: 0 }}>{this.state.errorInfo.componentStack}</pre>
                  </>
                )}
              </AccordionDetails>
            </Accordion>

            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={this.handleCopy}
              sx={{ mt: 2 }}
            >
              Copy Details
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
