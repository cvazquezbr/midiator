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
} from '@mui/material';
import { Close as CloseIcon, Print as PrintIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { useIsMobile } from '../hooks/use-mobile';
import parse from 'html-react-parser';


const Section = ({ title, children, subtitle }) => (
    <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>
            {title}
        </Typography>
        {subtitle && <Typography variant="subtitle2" color="text.secondary" sx={{ mt: -1, mb: 2 }}>{subtitle}</Typography>}
        <Paper variant="outlined" sx={{ p: 3, backgroundColor: '#f9f9f9', color: 'black' }}>
            {children}
        </Paper>
    </Box>
);

const Field = ({ label, value, explanation }) => (
    <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>{label}</Typography>
        {explanation && <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>{explanation}</Typography>}
        <Box sx={{ mt: 1, p: 1.5, borderRadius: 1, border: '1px solid #eee' }}>
            {typeof value === 'string' && value.startsWith('<') ? parse(value) : <Typography variant="body2">{value || 'Não definido'}</Typography>}
        </Box>
    </Box>
);

const MemorialDescritivoModal = ({ open, onClose, campaignData }) => {
  const isMobile = useIsMobile();

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


  if (!campaignData) return null;

  const { persona = {}, autor = '', formato = '', instrucoes = '', colors = [], briefing = {} } = campaignData;

  const renderPersonaField = (label, value, explanation) => {
    let displayValue = 'Não definido';
    if (Array.isArray(value) && value.length > 0) {
      displayValue = value.join(', ');
    } else if (typeof value === 'string' && value) {
      displayValue = value;
    }

    return <Field label={label} value={displayValue} explanation={explanation} />;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Memorial Descritivo da Campanha
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
               .MuiPaper-outlined {
                border: 1px solid #ddd;
              }
            }
          `}
        </style>
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, fontFamily: 'serif' }}>
          {/* 1. Título e Introdução */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
              Memorial Descritivo de Campanha
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Este documento detalha os pilares estratégicos e criativos que orientarão a criação de conteúdo para a campanha.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 2. Introdução */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>1. Introdução</Typography>
            <Typography variant="body1" paragraph>
              O objetivo deste memorial é estabelecer um conjunto claro de diretrizes para garantir consistência, relevância e eficácia em todas as peças de conteúdo produzidas. A seguir, detalhamos a persona, a voz da marca, os formatos de conteúdo e as instruções criativas.
            </Typography>
          </Box>

          {/* 3. Desenvolvimento */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>2. Desenvolvimento</Typography>

          <Section title="2.1. Persona" subtitle="O perfil de cliente ideal que queremos alcançar.">
            {renderPersonaField("Nome", persona.nome, "A identificação clara e concisa do perfil.")}
            {renderPersonaField("Posição/Cargo", persona.posicaoCargo, "A função formal da persona na empresa.")}
            {renderPersonaField("Segmento da Empresa", persona.segmentoEmpresa, "A indústria ou setor de atuação da empresa.")}
            {renderPersonaField("Responsabilidades-Chave", persona.responsabilidadesChave, "As principais tarefas e áreas de atuação da persona.")}

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 3, mb: 1 }}>Dores e Desafios</Typography>
            {renderPersonaField("Estratégicos", persona.doresEstrategicos, "Problemas relacionados ao crescimento, concorrência e visão de longo prazo.")}
            {renderPersonaField("Operacionais", persona.doresOperacionais, "Obstáculos do dia a dia, como sistemas legados, custos e segurança.")}
            {renderPersonaField("Pessoas e Cultura", persona.doresPessoas, "Desafios com retenção de talentos, alinhamento de equipes e cultura organizacional.")}
            {renderPersonaField("Regulatórios e Métricas", persona.doresRegulatorios, "Questões de compliance, medição de ROI e prioridades conflitantes.")}

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 3, mb: 1 }}>Gatilhos e Barreiras</Typography>
            {renderPersonaField("Gatilhos de Compra", persona.gatilhosCompra, "Os fatores que levam a persona a procurar ativamente por uma solução.")}
            {renderPersonaField("Barreiras de Adoção", persona.barreirasAdocao, "Os obstáculos que podem impedir ou atrasar a decisão de compra.")}

            <Field label="Mentalidade e Valores" value={persona.mentalidadeValores || ''} explanation="A forma de pensar, os valores e a atitude da persona." />
            <Field label="Contexto Cultural" value={persona.contextoCultural || ''} explanation="O ambiente de trabalho e a cultura organizacional em que a persona está inserida." />
          </Section>

          <Section title="2.2. Autor (Voz da Marca)" subtitle="O tom, estilo e perspectiva que a marca usará.">
             <Box sx={{ mt: 1 }}>
                {autor ? parse(autor) : <Typography variant="body2">Não definido</Typography>}
             </Box>
          </Section>

          <Section title="2.3. Formato do Conteúdo" subtitle="A estrutura e o layout das peças de conteúdo.">
             <Box sx={{ mt: 1 }}>
                {formato ? parse(formato) : <Typography variant="body2">Não definido</Typography>}
             </Box>
          </Section>

          <Section title="2.4. Instruções Criativas" subtitle="Diretrizes detalhadas para a criação do conteúdo.">
             <Box sx={{ mt: 1 }}>
                {instrucoes ? parse(instrucoes) : <Typography variant="body2">Não definido</Typography>}
             </Box>
          </Section>

          <Section title="2.5. Briefing da Paleta de Cores" subtitle="Os parâmetros usados para a geração da paleta de cores com IA.">
            <Field label="Objetivo" value={briefing.objective} explanation="O principal objetivo da campanha (ex: Branding, Vendas)." />
            <Field label="Público-alvo" value={briefing.targetAudience} explanation="O grupo demográfico ou perfil de cliente que a campanha visa atingir." />
            <Field label="Mensagem Principal" value={briefing.mainMessage} explanation="A ideia central ou o sentimento que a campanha deve comunicar." />
            <Field label="Atmosfera Desejada" value={briefing.atmosphere} explanation="A sensação ou o ambiente que o design visual deve criar." />
            <Field label="Detalhes Adicionais" value={briefing.details} explanation="Quaisquer outras instruções, como cores proibidas ou obrigatórias." />
          </Section>

          <Section title="2.6. Paleta de Cores" subtitle="As cores que definem a identidade visual da campanha.">
            <Grid container spacing={2}>
              {colors.length > 0 ? colors.map((color, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Box sx={{ width: '100%', height: 80, borderRadius: 2, backgroundColor: color, mb: 1, border: '1px solid #ddd' }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{color}</Typography>
                  </Paper>
                </Grid>
              )) : <Typography variant="body2">Nenhuma cor definida.</Typography>}
            </Grid>
          </Section>

          {/* 4. Conclusão */}
           <Box sx={{ mt: 5 }}>
            <Typography variant="h5" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>3. Conclusão</Typography>
            <Typography variant="body1" paragraph>
              Este memorial serve como um guia fundamental para a criação de conteúdo coeso e impactante. A aderência a estas diretrizes garantirá que a comunicação da campanha seja consistente com a identidade da marca e ressoe de forma eficaz com a persona definida.
            </Typography>
          </Box>

        </Paper>
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
