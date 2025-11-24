import React from 'react';
import { Typography, Box, Grid, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';

const GeneratedPagesSection = ({ pages, csvData }) => {
  if (!pages || pages.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
        Páginas Geradas e Conteúdo
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        A seguir estão as páginas finais geradas para a campanha, cada uma acompanhada do texto extraído do arquivo CSV correspondente.
      </Typography>
      <Grid container spacing={4}>
        {pages.map((page, index) => (
          <Grid item xs={12} key={index}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                Página {index + 1}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Imagem Gerada
                  </Typography>
                  {page.url ? (
                    <Box
                      component="img"
                      src={page.url}
                      alt={`Página gerada ${index + 1}`}
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      (Nenhuma imagem gerada para esta página)
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Dados do CSV
                  </Typography>
                  {csvData && csvData[index] ? (
                    <List dense>
                      {Object.entries(csvData[index]).map(([key, value]) => {
                        const isAudioObject = key === 'audio' && typeof value === 'object' && value !== null;
                        return (
                          <React.Fragment key={key}>
                            <ListItem sx={{ py: 0.5, alignItems: 'flex-start' }}>
                              <ListItemText
                                primary={key}
                                secondary={
                                  isAudioObject ? (
                                    <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                                      <Typography component="span" variant="body2">
                                        Rate: {value.rate ?? 'N/A'}
                                      </Typography>
                                      <Typography component="span" variant="body2">
                                        Source: {value.source ?? 'N/A'}
                                      </Typography>
                                      <Typography component="span" variant="body2">
                                        Duration: {value.duration ? `${value.duration.toFixed(2)}s` : 'N/A'}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    String(value)
                                  )
                                }
                                primaryTypographyProps={{ fontWeight: 'bold' }}
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        );
                      })}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      (Nenhum registro de CSV para esta página)
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default GeneratedPagesSection;
