import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const TermsOfService = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Termos de Serviço
        </Typography>
        <Typography variant="body1" paragraph>
          Ao acessar ao site, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você не concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Uso de Licença
        </Typography>
        <Typography variant="body1" paragraph>
          É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:
        </Typography>
        <ul>
          <li>modificar ou copiar os materiais;</li>
          <li>usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
          <li>tentar descompilar ou fazer engenharia reversa de qualquer software contido no site;</li>
          <li>remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
          <li>transferir os materiais para outra pessoa ou 'espelhe' os materiais em qualquer outro servidor.</li>
        </ul>
        <Typography variant="body1" paragraph>
          Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por nós a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrónico ou impresso.
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Isenção de responsabilidade
        </Typography>
        <Typography variant="body1" paragraph>
          Os materiais no site são fornecidos 'como estão'. Não oferecemos garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.
        </Typography>
        <Typography variant="body1" paragraph>
          Além disso, não garantimos ou fazemos qualquer representação relativa à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Limitações
        </Typography>
        <Typography variant="body1" paragraph>
          Em nenhum caso o site ou seus fornecedores serão responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais no site, mesmo que o site ou um representante autorizado do site tenha sido notificado oralmente ou por escrito da possibilidade de tais danos. Como algumas jurisdições não permitem limitações em garantias implícitas, ou limitações de responsabilidade por danos conseqüentes ou incidentais, essas limitações podem não se aplicar a você.
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Precisão dos materiais
        </Typography>
        <Typography variant="body1" paragraph>
          Os materiais exibidos no site podem incluir erros técnicos, tipográficos ou fotográficos. O site não garante que qualquer material em seu site seja preciso, completo ou atual. O site pode fazer alterações nos materiais contidos em seu site a qualquer momento, sem aviso prévio. No entanto, o site não se compromete a atualizar os materiais.
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Links
        </Typography>
        <Typography variant="body1" paragraph>
          O site não analisou todos os sites vinculados ao seu site e não é responsável pelo conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por parte do site. O uso de qualquer site vinculado é por conta e risco do usuário.
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Modificações
        </Typography>
        <Typography variant="body1" paragraph>
          O site pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Lei aplicável
        </Typography>
        <Typography variant="body1" paragraph>
          Estes termos e condições são regidos e interpretados de acordo com as leis do nosso país e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.
        </Typography>
      </Box>
    </Container>
  );
};

export default TermsOfService;
