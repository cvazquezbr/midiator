-- SQL script to populate the 'prompts' table.
-- This script is idempotent. If a prompt with the same name already exists, it will be updated.

-- Prompt: generateCampaignContent
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateCampaignContent',
  'Generates the main content for a LinkedIn campaign post.',
  '
  Você deve gerar conteúdo para posts no LinkedIn.
    {personaPromptSection}
    Emissor (Autor): {autorString}
    Formato: {formato}
    Problema: {problema}
    Solução: {solucao}
    {instrucoes}

Gere uma resposta JSON com os seguintes campos: "titulo" (string), "conteudo" (string), "cta" (string), e "hashtags" (string, separadas por vírgula). A resposta deve ser apenas o JSON.'
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateCampaignImagePrompt
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateCampaignImagePrompt',
  'Generates a detailed text prompt for an image generation model (e.g., DALL-E) to create a campaign background image.',
  '
      Você é um diretor de arte. Sua tarefa é criar um prompt de texto detalhado para um modelo de geração de imagem (como DALL-E ou Midjourney).
      O prompt deve descrever uma imagem de fundo visualmente atraente e conceitual para um post de rede social, sobre a qual os campos de texto serão sobrepostos.

      CONTEÚDO DO POST:
      Título: "{titulo}"
      Conteúdo: "{conteudo}"

      INFORMAÇÕES DA MARCA:
      {autorString}

      REGRAS PARA O PROMPT GERADO:
      1.  O prompt deve ser em inglês, para máxima compatibilidade com os modelos de imagem.
      2.  A imagem a ser gerada NÃO DEVE CONTER NENHUM TEXTO, LETRAS OU NÚMEROS. O prompt deve reforçar isso.
      3.  O prompt deve ser puramente descritivo, focando em elementos visuais, estilo, cores e composição.
      4.  A composição do prompt deve considerar a razão de aspecto final da imagem, que será de {aspectRatio}. Por exemplo, um prompt para uma imagem 16:9 (paisagem) pode descrever uma cena mais ampla, enquanto um 4:5 (retrato) pode focar em um elemento mais central e vertical.
      5.  O prompt deve resultar em uma imagem que tenha áreas mais limpas ou abstratas, adequadas para a sobreposição de texto.
      6.  O prompt deve ser uma única string de texto.

      Exemplo de um bom prompt para uma imagem 1:1 (quadrada):
      "A vibrant, abstract background with swirling gradients of blue and gold, representing the flow of data and innovation, with a soft, clean area for text overlay. The style should be elegant and professional. NO TEXT, NO LETTERS, NO NUMBERS."

      Gere apenas o texto do prompt, sem nenhuma outra explicação ou formatação.
    '
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateCampaignImage
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateCampaignImage',
  'Generates the final prompt sent to the image generation API, combining the image prompt with color and aspect ratio constraints.',
  '
    {prompt}
    {colorPalettePrompt}
    The aspect ratio of the image must be {aspectRatio}.
  '
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateFormattedContent
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateFormattedContent',
  'Formats post content into HTML for a WordPress blog.',
  '
      Com o objetivo de gerar um post de blog no WordPress corporativo, Formatar o texto a seguir observando o padrão com HTML.
      Considere que o conteúdo gerado já estará embutido em uma página no contexto de seu BODY.
      Elabore o HTML para melhor estruturar o texto, facilitar a leitura, hierarquizar a informação conforme a importância.
      O primeiro nível de Header que deve ser utilizado é o H3, já há H1 e H2 no contexto no qual o texto produzido se insere.
      Elabore um resumo com os três pontos chave no texto de entrada e apresente o resumo com caixas de destaque logo no início.
      ATENÇÃO aos campos que requeiram escape como aspas. Adicionalmente, o uso de &quot; é válido em HTML mas causa problemas em JSON. Atenção para evitar quebras de linha no conteúdo HTML e caracteres especiais não escapados.
      Segue o texto:

      Título: {titulo}
      Conteúdo: {conteudo}
      CTA: {cta}
    '
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateFollowupPlan
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateFollowupPlan',
  'Generates a sequence plan for follow-up posts based on a main piece of content.',
  'Você é um estrategista de marketing de conteúdo. Sua tarefa é criar um plano para {neededQuantity} novos posts sequenciais no LinkedIn, baseados em um conteúdo principal e complementando os posts já existentes.

CONTEÚDO PRINCIPAL:
Tema: "{titulo}"
Detalhes: "{conteudo}"

PERSONA-ALVO:
{personaString}

AUTOR:
{autorString}
{existingPostsString}
ESTRUTURA DA SEQUÊNCIA (AIDA):
1.  **Atenção:** Gancho impactante (dado, insight contraintuitivo).
2.  **Interesse:** Conexão com problema/oportunidade da persona.
3.  **Desejo:** Apresentação da transformação/benefício da solução.
4.  **Ação:** CTA direto para o conteúdo principal.

INSTRUÇÕES:
-   Crie um plano para exatamente {neededQuantity} novos posts.
-   Para cada post, defina um título curto e chamativo.
-   Defina o "coração do prompt" que será usado para gerar o conteúdo completo em uma etapa posterior.
-   O "coração do prompt" deve ser uma instrução clara e concisa para um redator, incluindo o tipo de gancho, o ângulo e a emoção a ser evocada.
-   Varie os formatos e gatilhos para cada etapa do funil AIDA, evitando as etapas já cobertas nos posts existentes.

FORMATO DE RESPOSTA:
Retorne um array JSON com a seguinte estrutura. Não inclua markdown ou qualquer outro texto fora do JSON.

```json
[
  {
    "post_numero": 1,
    "etapa_aida": "Atenção",
    "tipo_gancho": "Estatística Surpreendente",
    "titulo_sugerido": "O Erro Silencioso que Sabota 70% dos Projetos de TI",
    "coracao_prompt": "Comece com a estatística mais chocante que você encontrar sobre o fracasso de projetos de software devido à má gestão. Crie um senso de urgência e curiosidade.",
    "cta_sugerido": "Descubra a causa nº 1 de falhas em projetos.",
    "hashtags_sugeridas": ["#gestaodeprojetos", "#liderancatecnica"]
  }
]
```
'
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateFollowupPosts
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateFollowupPosts',
  'Generates the content for a single follow-up post based on a plan.',
  '
Você é um especialista em copywriting para o LinkedIn. Sua tarefa é escrever um post impactante e informativo.

PERSONA-ALVO:
{personaString}

AUTOR DO POST:
{autorString}

TEMA CENTRAL (do conteúdo principal):
"{titulo}"

TÍTULO DO POST:
"{titulo_sugerido}"

INSTRUÇÃO CRIATIVA (Coração do Prompt):
"{coracao_prompt}"

REGRAS:
- Use o TÍTULO DO POST como o título do seu texto.
- O corpo do post deve ter **pelo menos {MIN_CONTENT_LENGTH} caracteres**.
- O corpo do post deve ser estruturado em **até três parágrafos**.
- Separe os parágrafos com uma linha em branco.
- O tom deve ser profissional, mas conversacional.
- Use até 2 emojis relevantes.
- O texto final NÃO deve conter hashtags.
- O texto final NÃO deve conter um CTA, ele será adicionado depois.

FORMATO DE RESPOSTA:
Retorne um objeto JSON com as chaves "titulo_post" e "conteudo_post".

```json
{
  "titulo_post": "O título do post gerado aqui...",
  "conteudo_post": "O conteúdo do post gerado aqui..."
}
```
'
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateCommonSolutions
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateCommonSolutions',
  'Generates a list of common solutions for a given problem and persona.',
  '
    Com base na seguinte descrição de Persona, Autor e no Problema apresentado, gere uma lista de 3 a 4 ideias de soluções ou propostas de campanha que o Autor poderia oferecer.

    PERSONA:
    {personaString}

    AUTOR:
    {autorString}

    PROBLEMA:
    "{problema}"

    REGRAS:
    1.  Cada item da lista deve ser uma string única contendo um texto completo sobre a solução.
    2.  Inicie cada string com um título curto em negrito (usando markdown **Título da Solução**).
    3.  Após o título, descreva a solução em um ou dois parágrafos concisos.
    4.  O texto deve ser prático e direto, focando em como a solução resolve o problema para a persona.
    5.  A resposta DEVE ser um array JSON de strings.

    FORMATO DE RESPOSTA (APENAS O JSON):
    ```json
    [
      "**Título da Solução 1**\\nDescrição detalhada da solução em um ou dois parágrafos...",
      "**Título da Solução 2**\\nDescrição detalhada da solução em um ou dois parágrafos..."
    ]
    ```
  '
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateCommonProblems
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateCommonProblems',
  'Generates a list of common problems for a given persona and author.',
  '
    Com base na seguinte descrição de Persona e Autor, gere uma lista de 3 a 4 problemas ou necessidades comuns que essa persona provavelmente enfrenta em relação ao que o autor oferece.

    PERSONA:
    {personaString}

    AUTOR:
    {autorString}

    REGRAS:
    1.  Cada item da lista deve ser uma string única contendo um texto completo sobre o problema.
    2.  Inicie cada string com um título curto em negrito (usando markdown **Título**).
    3.  Após o título, descreva o problema em um ou dois parágrafos concisos.
    4.  O texto deve ser prático e direto, focando na "dor" ou necessidade da persona.
    5.  A resposta DEVE ser um array JSON de strings.

    FORMATO DE RESPOSTA (APENAS O JSON):
    ```json
    [
      "**Título do Problema 1**\\nDescrição detalhada do problema em um ou dois parágrafos...",
      "**Título do Problema 2**\\nDescrição detalhada do problema em um ou dois parágrafos..."
    ]
    ```
  '
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateIAContent
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateIAContent',
  'Generates content for an Instagram carousel from a base text.',
  'A partir do TEXTO BASE fornecido abaixo, gere conteúdo para um carrossel de Instagram com {promptNumRecords} elementos.

TEXTO BASE:
{promptText}

INSTRUÇÕES DE FORMATAÇÃO DA SAÍDA (MUITO IMPORTANTE):
A SUA RESPOSTA DEVE CONTER *APENAS E SOMENTE* UM BLOCO DE TEXTO FORMATADO COMO CSV, SEM NENHUM TEXTO ADICIONAL ANTES OU DEPOIS DO BLOCO CSV.
O BLOCO CSV DEVE SER DELIMITADO EXATAMENTE POR TRÊS CRASE SEGUIDAS E A PALAVRA "csv" (```csv) NO INÍCIO, E TRÊS CRASE SEGUIDAS (```) NO FINAL.
DENTRO DO BLOCO CSV:
- O delimitador de campo DEVE ser PONTO E VÍRGULA (;).
- CADA CAMPO, incluindo o cabeçalho, DEVE ser OBRIGATORIAMENTE envolvido por ASPAS DUPLAS ("").
- A primeira linha DEVE ser o cabeçalho: "Titulo";"Texto Principal";"Ponte para o Próximo";"prompt_imagem_carrossel"
- TODAS as {promptNumRecords} linhas de dados subsequentes DEVEM seguir a mesma estrutura de 4 colunas.
- NÃO inclua explicações ou qualquer texto fora do bloco ```csv ... ```.

REQUISITOS PARA O CONTEÚDO DE CADA ELEMENTO (LINHA DO CSV):
1. **"Titulo"** (Coluna 1): Máximo de 4 palavras, curtas e impactantes.
2. **"Texto Principal"** (Coluna 2): Entre 120-180 caracteres, adaptado do TEXTO BASE, com uma pergunta retórica.
3. **"Ponte para o Próximo"** (Coluna 3): Máximo de 40 caracteres. Crie curiosidade para o próximo elemento. Para o último elemento, use este campo para uma Chamada para Ação (CTA) final, como "Gostou? Salve para mais!".
4. **"prompt_imagem_carrossel"** (Coluna 4): Um prompt detalhado EM INGLÊS para um modelo de IA de imagem (DALL-E, Midjourney). A imagem NÃO PODE CONTER TEXTO. O prompt deve descrever uma imagem de fundo conceitual e visualmente atraente.

ESTRUTURA NARRATIVA SUGERIDA:
- Elemento 1: Dado impactante ou pergunta instigante extraída do início do TEXTO BASE.
- Elementos intermediários: Desenvolver os pontos principais do TEXTO BASE.
- Último Elemento: CTA claro ou resumo conclusivo.

TOM DE VOZ:
- Empático e motivacional (use "você" e "vamos").
- Urgência controlada ("Agora você pode...").
- Toque de storytelling.

LEMBRE-SE: A estrutura do CSV é rígida. TODAS as {promptNumRecords} linhas devem ter exatamente 4 campos separados por ponto e vírgula e envoltos em aspas duas. Sua resposta final deve conter APENAS o bloco ```csv ... ``` com os dados.'
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();

-- Prompt: generateColorPalette
INSERT INTO prompts (name, description, prompt_text)
VALUES (
  'generateColorPalette',
  'Generates a 5-color palette based on a user briefing and color psychology.',
  'Crie uma paleta harmoniosa de 5 cores baseada no briefing abaixo, aplicando princípios da psicologia das cores na cultura ocidental.

**Briefing do Cliente:**
{briefing}

**Diretrizes de Psicologia das Cores (Cultura Ocidental):**
- Considere estas associações-chave:
  * **Vermelho:** Energia, paixão, urgência (comida, liquidações), perigo.
  * **Azul:** Confiança, segurança, calma, profissionalismo (bancos, saúde, tech).
  * **Verde:** Natureza, crescimento, sustentabilidade, saúde, tranquilidade.
  * **Amarelo:** Otimismo, criatividade, atenção (uso moderado), cautela.
  * **Roxo:** Luxo, criatividade, espiritualidade, realeza (beleza, artes).
  * **Laranja:** Entusiasmo, jovialidade, acessibilidade (diversão, calls-to-action).
  * **Rosa:** Feminilidade, ternura, compaixão (beleza, infantil).
  * **Preto:** Sofisticação, poder, elegância (luxo, moda).
  * **Branco:** Pureza, simplicidade, limpeza (saúde, minimalismo).
  * **Cinza:** Neutralidade, equilíbrio, modernidade (tecnologia, corporativo).
  * **Marrom:** Solidez, confiabilidade, natureza (orgânico, artesanal).
- Tons **pastéis** transmitem suavidade; **vibrantes** geram impacto.
- Evite combinações culturalmente negativas (ex: vermelho+puro preto = agressão/extremismo).

**Formato de Saída OBRIGATÓRIO:**
A resposta DEVE ser um único objeto JSON, sem nenhum texto ou formatação markdown (como ```json) antes ou depois. O JSON deve ter a seguinte estrutura:
{
  "palette": [
    {
      "hex": "#RRGGBB",
      "rgb": "RGB(R, G, B)",
      "name": "Nome da Cor",
      "role": "Primária | Secundária | Acento | Neutro Claro | Neutro Escuro",
      "justification": "Explicação psicológica em uma frase."
    }
  ],
  "harmony": "Nome da Harmonia (Análoga, Complementar, Triádica, etc.)"
}
'
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  prompt_text = EXCLUDED.prompt_text,
  updated_at = NOW();
