import { createTheme } from '@mui/material/styles';

// Temas atualizados com gradientes e cores modernas
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#8b5cf6', // Purple
    },
    secondary: {
      main: '#ec4899', // Pink
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e5e7eb',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#f1f5f9', // slate-100
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#8b5cf6', // primary.main
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#8b5cf6', // primary.main
          },
        }
      }
    }
  }
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a78bfa',
    },
    secondary: {
      main: '#f472b6',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1e293b', // background.paper
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#a78bfa', // primary.main
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#a78bfa', // primary.main
          },
        }
      }
    }
  }
});
