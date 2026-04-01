import { query } from '../db.js';

async function getGeminiConfig(userId) {
  const { rows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [userId]);
  const settings = rows[0]?.settings_data || {};
  return {
    apiKey: settings.gemini_api_key,
    model: settings.gemini_model || 'gemini-1.5-pro'
  };
}

async function callGemini(config, prompt) {
  const model = config.model.replace('models/', '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return JSON.parse(text);
}

export async function processDiscoverySession(sessionId) {
  try {
    // 1. Get session data
    const sessionResult = await query('SELECT * FROM linkedin_discovery_sessions WHERE id = $1', [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) return;

    const geminiConfig = await getGeminiConfig(session.user_id);
    if (!geminiConfig.apiKey) {
      console.error(`Gemini API key not found for user ${session.user_id}`);
      await updateSessionStatus(sessionId, 'error');
      return;
    }

    await updateSessionStatus(sessionId, 'searching');

    // 2. Expand search strategy using Gemini
    console.log(`[Worker] Expanding search strategy for session ${sessionId}...`);
    const extractionPrompt = `
      Você é um especialista em Growth e Social Selling no LinkedIn.
      Seu objetivo é expandir o alcance da descoberta de posts relevantes baseando-se no conteúdo abaixo.

      Post publicado pelo usuário:
      "${session.source_post_content}"

      Gere uma estratégia de busca em JSON organizada em duas ondas (específica e ampla) para garantir volume:
      {
        "onda_1_especifica": [],        // hashtags e termos MUITO específicos (ex: "IAparaFinanças", "GestãoContábilDigital")
        "onda_2_ampla": [],             // hashtags e termos ÂNCORA de alto volume (ex: "IA", "ERP", "Finanças", "Tecnologia")
        "hashtags_en": [],              // termos em inglês para ampliar o alcance global
        "audiencia": {
          "cargos": [],
          "setores": [],
          "senioridade": ""
        }
      }

      Instruções importantes:
      1. A onda 2 deve conter termos curtos e genéricos que garantam que SEMPRE encontraremos algo.
      2. Inclua variações em inglês na lista "hashtags_en".
      3. Forneça pelo menos 15-20 termos no total.
    `;

    const extractedData = await callGemini(geminiConfig, extractionPrompt);
    await query(
      'UPDATE linkedin_discovery_sessions SET extracted_hashtags = $1 WHERE id = $2',
      [JSON.stringify(extractedData), sessionId]
    );

    // 3. New flow: Stop here and await external search
    console.log(`[Worker] Search strategy generated for session ${sessionId}. Awaiting external search.`);
    await updateSessionStatus(sessionId, 'awaiting_external_search');

  } catch (error) {
    console.error('Worker Error:', error);
    await updateSessionStatus(sessionId, 'error');
  }
}

async function updateSessionStatus(sessionId, status) {
  await query('UPDATE linkedin_discovery_sessions SET status = $1, updated_at = NOW() WHERE id = $2', [status, sessionId]);
}

export async function generateCommentForPost(postId, userId) {
  try {
    // 1. Get post and session data
    const postResult = await query(
      `SELECT p.*, s.source_post_content, s.user_id
       FROM linkedin_discovered_posts p
       JOIN linkedin_discovery_sessions s ON p.session_id = s.id
       WHERE p.id = $1`,
      [postId]
    );
    const post = postResult.rows[0];
    if (!post) throw new Error('Post not found');

    const geminiConfig = await getGeminiConfig(userId);
    if (!geminiConfig.apiKey) throw new Error('Gemini API key not found');

    // 2. Get persona data
    const personaResult = await query(
      'SELECT * FROM personas WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    const persona = personaResult.rows[0]?.persona_data || { name: 'Profissional', cargo: 'Especialista', setor: 'Tecnologia', voz: 'Profissional e amigável' };

    // 3. Generate comment using Gemini
    console.log(`[Worker] Generating comment for post ${postId}...`);
    const generationPrompt = `
      Você é ${persona.name || 'um profissional'}, ${persona.cargo || 'especialista'} na área de ${persona.setor || 'negócios'}.
      Tom de voz: ${persona.voz || 'Profissional e autêntico'}

      Seu contexto (post que você publicou recentemente):
      "${post.source_post_content}"

      Post de ${post.post_author_name} que você quer comentar:
      "${post.post_content}"

      Gere um comentário para este post que:
      1. Seja autêntico e agregue valor ao debate.
      2. Se for um post de "debate" ou "complementar", use sua experiência descrita no seu contexto para enriquecer a discussão.
      3. Se o post for apenas vagamente relacionado (relevância média), encontre um ponto de contato criativo e profissional.
      4. Convide ao diálogo com uma pergunta ou insight.
      5. Tenha entre 3 e 6 linhas.
      6. NÃO mencione explicitamente seu próprio post ("como eu disse no meu post..."), apenas use o conhecimento dele.
      7. Use linguagem natural, humana e profissional, sem excessos de emojis.

      Tipo de relação detectada: ${post.relation_type}
      - "complementar": expanda ou valide o ponto com sua experiência.
      - "debate": ofereça uma perspectiva diferente ou complementar, sempre respeitosamente e visando o aprendizado mútuo.
      - "caso_de_uso": traga um exemplo prático ou cenário onde isso se aplica.
      - "tendencia": conecte com contexto de mercado mais amplo.

      Retorne apenas o texto do comentário, sem aspas ou formatação extra.
    `;

    // We don't use response_mime_type: "application/json" here because we want plain text
    const model = geminiConfig.model.replace('models/', '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiConfig.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: generationPrompt }] }]
      })
    });

    if (!response.ok) throw new Error(`Gemini API error: ${await response.text()}`);
    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) throw new Error('Failed to generate comment text');

    // 4. Save to database
    const insertResult = await query(
      `INSERT INTO linkedin_generated_comments
       (user_id, discovered_post_id, generated_text, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [userId, postId, generatedText]
    );

    return insertResult.rows[0];
  } catch (error) {
    console.error('Error generating comment:', error);
    throw error;
  }
}
