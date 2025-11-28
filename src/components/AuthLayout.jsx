import React from 'react';
import { Grid, Box, Paper, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Link } from 'react-router-dom';
import AuthBackgroundImage from '../assets/auth_background.png';
import LogoImage from '../assets/logo.png'; // Importa o novo logo

const AuthLayout = ({ children, title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      {/* Coluna da Imagem (visível apenas em telas médias e maiores) */}
      {!isMobile && (
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: `url(${AuthBackgroundImage})`, // Usa a imagem importada
            backgroundRepeat: 'no-repeat',
            backgroundColor: (t) =>
              t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Coluna do Formulário */}
      <Grid
        item
        xs={12}
        sm={8}
        md={5}
        component={Paper}
        elevation={6}
        square
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', // Centraliza o conteúdo verticalmente
        }}
      >
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo */}
          <Box sx={{ mb: 4 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <img src={LogoImage} alt="Logo" style={{ width: '150px', height: 'auto' }} />
            </Link>
          </Box>

          {/* Título da Página */}
          <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
            {title}
          </Typography>

          {/* Conteúdo do Formulário (children) */}
          {children}
        </Box>
      </Grid>
    </Grid>
  );
};

export default AuthLayout;
