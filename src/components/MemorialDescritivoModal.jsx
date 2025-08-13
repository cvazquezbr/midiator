import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  Grid,
  Paper,
  Chip,
  Container,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Stack
} from '@mui/material';
import {
    Close as CloseIcon,
    Print as PrintIcon,
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useIsMobile } from '../hooks/use-mobile';
import { useTheme } from '@mui/material/styles';

const CodeBlock = ({ children }) => (
  <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#2d2d2d', color: '#f8f8f2', overflowX: 'auto', my: 2 }}>
    <pre><code>{children}</code></pre>
  </Paper>
);

const SectionTitle = ({ variant, component, children }) => {
    const theme = useTheme();
    const styles = {
        'h1': { mb: theme.spacing(6) },
        'h2': { mb: theme.spacing(4), mt: theme.spacing(6) },
        'h3': { mb: theme.spacing(3), mt: theme.spacing(4) },
        'h4': { mb: theme.spacing(2), mt: theme.spacing(3) },
    }
    return (
        <Typography variant={variant} component={component} sx={styles[component]}>
            {children}
        </Typography>
    )
};


const MemorialDescritivoModal = ({ open, onClose }) => {
  const isMobile = useIsMobile();
  const theme = useTheme();

  const handlePrint = () => {
    const printSection = document.querySelector('.printable-section');
    if (printSection) {
      const parent = printSection.parentElement;
      parent.style.overflow = 'visible'; // Needed for printing dialog content
      window.print();
      parent.style.overflow = 'auto';
    } else {
      toast.error('Não foi possível encontrar a seção para impressão.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Especificações de Design - Memorial Descritivo
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
              }
              .no-print {
                display: none;
              }
            }
          `}
        </style>
        <Container maxWidth="md" sx={{ py: 6 }}>
            <SectionTitle variant="h3" component="h1">Especificações de Design - Memorial Descritivo tech.fattocs</SectionTitle>

            <SectionTitle variant="h4" component="h2">1. Hierarquia Visual e Tipografia</SectionTitle>
            <Typography variant="body1" sx={{mb: theme.spacing(3)}}>
                A hierarquia visual e a tipografia são fundamentais para garantir a clareza, legibilidade e consistência do conteúdo. Utilizamos o sistema de tipografia do Material-UI para padronizar os estilos de texto em toda a aplicação.
            </Typography>

            <SectionTitle variant="h5" component="h3">1.1 Sistema de Títulos (MUI Typography)</SectionTitle>
            <Typography variant="body1" sx={{mb: theme.spacing(2)}}>
                A seguir, a hierarquia principal de títulos e suas respectivas variantes no MUI:
            </Typography>
            <List dense>
                <ListItem><ListItemText primary='H1: variant="h3" (32px) - Título do documento' /></ListItem>
                <ListItem><ListItemText primary='H2: variant="h4" (24px) - Seções principais (1. Introdução, 2. Desenvolvimento, etc.)' /></ListItem>
                <ListItem><ListItemText primary='H3: variant="h5" (20px) - Subseções (2.1. Persona, 2.2. Autor, etc.)' /></ListItem>
                <ListItem><ListItemText primary='H4: variant="h6" (18px) - Subseções específicas (Nome, Posição/Cargo, etc.)' /></ListItem>
                <ListItem><ListItemText primary='Corpo: variant="body1" (16px) - Texto corrido' /></ListItem>
                <ListItem><ListItemText primary='Destaque: variant="subtitle1" (16px, weight: 500) - Informações importantes' /></ListItem>
            </List>

            <SectionTitle variant="h5" component="h3">1.2 Espaçamento Vertical</SectionTitle>
            <List dense>
                <ListItem><ListItemText primary='Entre seções principais: marginBottom: theme.spacing(6) (48px)' /></ListItem>
                <ListItem><ListItemText primary='Entre subseções: marginBottom: theme.spacing(4) (32px)' /></ListItem>
                <ListItem><ListItemText primary='Entre parágrafos: marginBottom: theme.spacing(3) (24px)' /></ListItem>
                <ListItem><ListItemText primary='Entre título e conteúdo: marginBottom: theme.spacing(2) (16px)' /></ListItem>
            </List>

            <SectionTitle variant="h4" component="h2">2. Layout e Grid System</SectionTitle>
            <SectionTitle variant="h5" component="h3">2.1 Container Principal</SectionTitle>
            <CodeBlock>{`<Container maxWidth="md" sx={{ py: 6 }}>
  // Largura máxima: 960px
  // Padding vertical: 48px
</Container>`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">2.2 Margens e Espaçamento</SectionTitle>
            <List dense>
                <ListItem><ListItemText primary='Margens laterais mínimas: 24px em mobile, 48px em desktop' /></ListItem>
                <ListItem><ListItemText primary='Largura de linha ideal: 65-75 caracteres (aproximadamente 600-700px)' /></ListItem>
                <ListItem><ListItemText primary='Espaçamento interno dos cards: padding: theme.spacing(3) (24px)' /></ListItem>
            </List>

            <SectionTitle variant="h5" component="h3">2.3 Breakpoints Responsivos</SectionTitle>
            <CodeBlock>{`// Mobile: 0-599px
// Tablet: 600-959px
// Desktop: 960px+`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">3. Componentes e Estrutura</SectionTitle>
            <SectionTitle variant="h5" component="h3">3.1 Cards para Organização de Conteúdo</SectionTitle>
            <CodeBlock>{`<Card elevation={1} sx={{ mb: 4, borderRadius: 2 }}>
  <CardContent sx={{ p: 3 }}>
    // Conteúdo da seção
  </CardContent>
</Card>`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">3.2 Persona Section - Layout Especial</SectionTitle>
            <CodeBlock>{`<Grid container spacing={3}>
  <Grid item xs={12} md={6}>
    // Informações básicas (Nome, Posição, Segmento)
  </Grid>
  <Grid item xs={12} md={6}>
    // Responsabilidades e características
  </Grid>
</Grid>`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">3.3 Chips para Tags e Categorias</SectionTitle>
            <CodeBlock>{`<Chip
  label="Tecnologia"
  variant="outlined"
  size="small"
  sx={{ mr: 1, mb: 1 }}
/>`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">4. Sistema de Cores (Implementação MUI)</SectionTitle>
            <SectionTitle variant="h5" component="h3">4.1 Paleta Customizada</SectionTitle>
            <CodeBlock>{`const theme = createTheme({
  palette: {
    primary: {
      main: '#0077B6', // Azul principal
      light: '#33A3D1',
      dark: '#005A8A'
    },
    secondary: {
      main: '#2A363B', // Cinza escuro
      light: '#4A565B',
      dark: '#1A262B'
    },
    background: {
      default: '#FFFFFF',
      paper: '#FAFAFA'
    },
    success: {
      main: '#D6DBB2' // Verde claro para destaques positivos
    },
    text: {
      primary: '#2A363B',
      secondary: '#A8A29E'
    }
  }
});`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">4.2 Aplicação das Cores</SectionTitle>
            <List dense>
                <ListItem><ListItemText primary='Títulos principais: color: primary.main' /></ListItem>
                <ListItem><ListItemText primary='Texto corpo: color: text.primary' /></ListItem>
                <ListItem><ListItemText primary='Texto secundário: color: text.secondary' /></ListItem>
                <ListItem><ListItemText primary='Cards de destaque: backgroundColor: background.paper' /></ListItem>
                <ListItem><ListItemText primary='Divisores: borderColor: divider' /></ListItem>
            </List>

            <SectionTitle variant="h4" component="h2">5. Melhores Práticas de Legibilidade</SectionTitle>
            <SectionTitle variant="h5" component="h3">5.1 Contraste e Acessibilidade</SectionTitle>
             <List dense>
                <ListItem><ListItemText primary='Ratio mínimo: 4.5:1 para texto normal, 3:1 para texto grande' /></ListItem>
                <ListItem><ListItemText primary='Implementar: useTheme() para consistência' /></ListItem>
                <ListItem><ListItemText primary='Testar com: Wave, axe-core para validação de acessibilidade' /></ListItem>
            </List>

            <SectionTitle variant="h5" component="h3">5.2 Linha de Base Tipográfica</SectionTitle>
            <CodeBlock>{`typography: {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h3: {
    lineHeight: 1.2,
    letterSpacing: '-0.02em'
  },
  h4: {
    lineHeight: 1.35,
    letterSpacing: '-0.01em'
  },
  body1: {
    lineHeight: 1.6,
    letterSpacing: '0.01em'
  }
}`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">6. Componentes Específicos</SectionTitle>
            <SectionTitle variant="h5" component="h3">6.1 Seção de Dores e Desafios</SectionTitle>
            <CodeBlock>{`<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">Estratégicos</Typography>
  </AccordionSummary>
  <AccordionDetails>
    // Lista de itens
  </AccordionDetails>
</Accordion>`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">6.2 Lista de Informações</SectionTitle>
            <CodeBlock>{`<List dense>
  <ListItem>
    <ListItemIcon>
      <ChevronRightIcon fontSize="small" />
    </ListItemIcon>
    <ListItemText primary="Item da lista" />
  </ListItem>
</List>`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">6.3 Destaque de Informações Importantes</SectionTitle>
            <CodeBlock>{`<Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
  <AlertTitle>Mentalidade e Valores</AlertTitle>
  Texto de destaque sobre a persona
</Alert>`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">7. Layout Responsivo</SectionTitle>
            <SectionTitle variant="h5" component="h3">7.1 Mobile First</SectionTitle>
            <CodeBlock>{`<Stack
  direction={{ xs: 'column', md: 'row' }}
  spacing={3}
  alignItems={{ xs: 'stretch', md: 'flex-start' }}
>`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">7.2 Ajustes por Breakpoint</SectionTitle>
            <CodeBlock>{`sx={{
  fontSize: { xs: '0.875rem', md: '1rem' },
  padding: { xs: 2, md: 3 },
  margin: { xs: 1, md: 2 }
}}`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">8. Estados de Interação</SectionTitle>
            <SectionTitle variant="h5" component="h3">8.1 Hover e Focus</SectionTitle>
            <CodeBlock>{`sx={{
  '&:hover': {
    backgroundColor: 'action.hover',
    transition: 'background-color 0.2s ease'
  },
  '&:focus': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: '2px'
  }
}}`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">9. Performance e Otimização</SectionTitle>
            <SectionTitle variant="h5" component="h3">9.1 Lazy Loading para Seções</SectionTitle>
            <CodeBlock>{`// Implementar Intersection Observer para seções longas
const [isVisible, setIsVisible] = useState(false);`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">9.2 Memoização de Componentes</SectionTitle>
            <CodeBlock>{`const PersonaCard = memo(({ data }) => {
  // Componente otimizado
});`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">10. Implementação Sugerida</SectionTitle>
            <SectionTitle variant="h5" component="h3">10.1 Estrutura de Componentes</SectionTitle>
            <CodeBlock>{`/components
  /MemorialDescritivo
    - Header.jsx
    - PersonaSection.jsx
    - AuthorSection.jsx
    - ContentSection.jsx
    - ColorPalette.jsx
    - index.jsx
  /common
    - SectionCard.jsx
    - InfoChip.jsx
    - CategoryAccordion.jsx`}</CodeBlock>

            <SectionTitle variant="h5" component="h3">10.2 Theme Provider Setup</SectionTitle>
            <CodeBlock>{`// App.js ou _app.js
<ThemeProvider theme={customTheme}>
  <CssBaseline />
  <MemorialDescritivo />
</ThemeProvider>`}</CodeBlock>

            <SectionTitle variant="h4" component="h2">11. Checklist de Validação</SectionTitle>
            <List dense>
                <ListItem><ListItemText primary='Hierarquia visual clara e consistente' /></ListItem>
                <ListItem><ListItemText primary='Espaçamentos uniformes usando theme.spacing()' /></ListItem>
                <ListItem><ListItemText primary='Contraste adequado (mínimo 4.5:1)' /></ListItem>
                <ListItem><ListItemText primary='Layout responsivo funcional' /></ListItem>
                <ListItem><ListItemText primary='Navegação acessível via teclado' /></ListItem>
                <ListItem><ListItemText primary='Performance otimizada' /></ListItem>
                <ListItem><ListItemText primary='Componentes reutilizáveis' /></ListItem>
                <ListItem><ListItemText primary='Paleta de cores aplicada consistentemente' /></ListItem>
                <ListItem><ListItemText primary='Tipografia seguindo as especificações' /></ListItem>
                <ListItem><ListItemText primary='Estados de hover/focus implementados' /></ListItem>
            </List>
        </Container>
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
