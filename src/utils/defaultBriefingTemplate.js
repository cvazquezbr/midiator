import { v4 as uuidv4 } from 'uuid';

export const defaultBriefingTemplate = {
  generalRules: `Aja como um Diretor de Criação especialista. Sua tarefa é analisar um "TEXTO BASE" de um briefing e reestruturá-lo completamente com base em um "MODELO DE REFERÊNCIA".

1.  **Leia o TEXTO BASE** e entenda o conteúdo de cada parte.
2.  **Use os TÍTULOS do MODELO DE REFERÊNCIA** como as chaves para o objeto "sections" na sua resposta JSON.
3.  **Preencha cada seção** no JSON com o conteúdo correspondente do TEXTO BASE. Se uma seção do modelo não tiver conteúdo correspondente no texto base, deixe o valor como uma string vazia ("").
4.  **Consolide o conteúdo:** Mova todo o conteúdo relevante do TEXTO BASE para as seções apropriadas definidas pelo MODELO. Não deixe conteúdo para trás. O conteúdo deve ser em HTML simples.
5.  **Crie Notas de Revisão:** Com base na sua análise, crie uma lista de 3 a 5 notas (em um array de strings) sobre o que foi alterado, o que pode ser melhorado ou o que estava faltando no briefing original.`,
  blocks: [
    {
      id: uuidv4(),
      title: 'Título da Missão',
      content: '## Título da Missão\n\n- [Defina um título claro e inspirador para a campanha.]',
      rules: 'O "Título da Missão" deve ser um nome curto e impactante para a campanha, extraído da ideia central do texto base.'
    },
    {
      id: uuidv4(),
      title: 'Saudação',
      content: '## Saudação\n\n- [Escreva uma saudação para a equipe, alinhada com o tom da campanha.]',
      rules: 'A "Saudação" é uma introdução amigável e motivacional para a equipe que lerá o briefing. Deve ser consistente com a marca.'
    },
    {
      id: uuidv4(),
      title: 'Entregas',
      content: '## Entregas\n\n- [Liste os materiais específicos que precisam ser criados.]',
      rules: 'Liste os "entregáveis" específicos mencionados no texto base, como "post para Instagram", "vídeo para TikTok", etc.'
    },
    {
      id: uuidv4(),
      title: 'Mensagem Principal',
      content: '## Mensagem Principal\n\n- [Descreva a mensagem central que a campanha deve comunicar.]',
      rules: 'A "Mensagem Principal" é a ideia central que a campanha deve comunicar. Resuma o ponto mais importante do briefing.'
    },
    {
      id: uuidv4(),
      title: 'CTA',
      content: '## CTA\n\n- [Defina a Call to Action (Chamada para Ação) principal.]',
      rules: 'A "CTA" (Call to Action) deve ser a ação que o público-alvo deve realizar, conforme descrito no texto base.'
    },
    {
      id: uuidv4(),
      title: 'Inspirações',
      content: '## Inspirações\n\n- [Inclua links ou referências a campanhas ou estilos que sirvam de inspiração.]',
      rules: 'Agrupe quaisquer links, referências ou menções a outras campanhas na seção "Inspirações".'
    },
    {
      id: uuidv4(),
      title: 'Próximos Passos',
      content: '## Próximos Passos\n\n- [Descreva as próximas etapas ou prazos.]',
      rules: 'Os "Próximos Passos" devem conter informações sobre prazos, datas ou as etapas seguintes do projeto.'
    },
    {
      id: uuidv4(),
      title: 'DOs',
      content: '## DOs\n\n- Manter o tom de voz da marca.\n- Usar a paleta de cores primárias.',
      rules: `**Regra Especial para DOs:**
- Identifique os itens de lista na seção "DOs" do **MODELO DE REFERÊNCIA**. Estes são os itens padrão.
- Identifique quaisquer diretrizes, regras ou sugestões no **TEXTO BASE** que funcionem como um "DO". Estes são os itens específicos do briefing.
- Na sua resposta JSON, para a seção "DOs", você deve combinar ambos.
- Para os itens que vieram do **MODELO**, use um marcador de lista padrão (ex: '<li>Item do Modelo</li>').
- Para os itens que você extraiu do **TEXTO BASE**, use um emoji para diferenciação: '<li>✅ Item específico do Briefing</li>'.
- O resultado final para "DOs" deve ser uma única string HTML contendo uma lista '<ul>'.`
    },
    {
      id: uuidv4(),
      title: "DON'Ts",
      content: "## DON'Ts\n\n- Não usar gírias.\n- Evitar imagens de banco de imagens genéricas.",
      rules: `**Regra Especial para DON'Ts:**
- Identifique os itens de lista na seção "DON'Ts" do **MODELO DE REFERÊNCIA**. Estes são os itens padrão.
- Identifique quaisquer diretrizes, regras ou sugestões no **TEXTO BASE** que funcionem como um "DON'T". Estes são os itens específicos do briefing.
- Na sua resposta JSON, para a seção "DON'Ts", você deve combinar ambos.
- Para os itens que vieram do **MODELO**, use um marcador de lista padrão (ex: '<li>Item do Modelo</li>').
- Para os itens que você extraiu do **TEXTO BASE**, use um emoji para diferenciação: '<li>❌ Item específico do Briefing</li>'.
- O resultado final para "DON'Ts" deve ser uma única string HTML contendo uma lista '<ul>'.`
    },
    {
      id: uuidv4(),
      title: 'Hashtags',
      content: '## Hashtags\n\n- [#hashtag1, #hashtag2]',
      rules: 'A seção "Hashtags" deve conter uma lista das hashtags a serem usadas na campanha.'
    }
  ]
};