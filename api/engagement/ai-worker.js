import { query } from '../db.js';
import { handleSearchPostsByHashtag } from '../linkedin-proxy.js';

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

// This is a simplified version of what would be a background worker
// In a real Vercel environment, this could be a cron job or a background function

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

    // 2. Extract hashtags using Gemini
    console.log(`[Worker] Extracting hashtags for session ${sessionId}...`);
    const extractionPrompt = `
      Dado o seguinte post publicado no LinkedIn:
      "${session.source_post_content}"

      Extraia no formato JSON:
      {
        "hashtags_primarias": [],       // máx 5, ordenadas por relevância
        "hashtags_secundarias": [],     // máx 10
        "palavras_chave": [],           // termos semânticos centrais
        "temas": [],                    // temas conceituais (ex: "liderança", "IA generativa")
        "audiencia": {
          "cargos": [],
          "setores": [],
          "senioridade": ""
        }
      }
    `;

    const extractedData = await callGemini(geminiConfig, extractionPrompt);
    await query(
      'UPDATE linkedin_discovery_sessions SET extracted_hashtags = $1 WHERE id = $2',
      [JSON.stringify(extractedData), sessionId]
    );

    // 3. Discovery of posts
    const linkedinToken = await getLinkedinAccessToken(session.user_id);
    if (!linkedinToken) {
      console.error(`LinkedIn access token not found for user ${session.user_id}`);
      await updateSessionStatus(sessionId, 'error');
      return;
    }

    const allHashtags = [
      ...(extractedData.hashtags_primarias || []),
      ...(extractedData.hashtags_secundarias || [])
    ].slice(0, 10); // Limit to 10 hashtags total for discovery

    console.log(`[Worker] Searching posts for hashtags: ${allHashtags.join(', ')}`);

    const discoveredPostsMap = new Map();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch user's URN to avoid self-engagement
    let userUrn = null;
    try {
      const mockReq = { body: { accessToken: linkedinToken } };
      let profileData;
      const mockRes = {
        status: () => ({ json: (data) => { profileData = data; } }),
        json: (data) => { profileData = data; }
      };
      const { handleGetProfile } = await import('../linkedin-proxy.js');
      await handleGetProfile(mockReq, mockRes);
      if (profileData?.id) {
        userUrn = `urn:li:person:${profileData.id}`;
      }
    } catch (err) {
      console.warn('Could not fetch user profile for self-engagement filter:', err);
    }

    for (const hashtag of allHashtags) {
      try {
        const mockReq = {
          body: {
            accessToken: linkedinToken,
            hashtag: hashtag.startsWith('#') ? hashtag.substring(1) : hashtag,
            count: 20
          }
        };

        let searchData;
        const mockResponse = {
          status: (code) => ({
            json: (data) => { searchData = data; return mockResponse; }
          }),
          json: (data) => { searchData = data; return mockResponse; }
        };

        await handleSearchPostsByHashtag(mockReq, mockResponse);

        if (searchData && searchData.elements) {
          for (const post of searchData.elements) {
            const publishedAt = new Date(post.publishedAt);
            if (publishedAt < sevenDaysAgo) continue;

            // Filter out self-engagement
            if (userUrn && post.author === userUrn) continue;

            if (!discoveredPostsMap.has(post.id)) {
              discoveredPostsMap.set(post.id, post);
            }
          }
        }
      } catch (err) {
        console.error(`Error searching for hashtag ${hashtag}:`, err);
      }
    }

    const candidatePosts = Array.from(discoveredPostsMap.values()).slice(0, 50);
    console.log(`[Worker] Scoring ${candidatePosts.length} candidate posts.`);

    // 4. Score posts using Gemini in batch
    let scoredPosts = [];
    if (candidatePosts.length > 0) {
      const scoringPrompt = `
        Você é um especialista em marketing de conteúdo B2B.

        Post original publicado pelo usuário:
        "${session.source_post_content}"

        Palavras-chave e temas centrais: ${allHashtags.join(', ')}

        Avalie cada post candidato abaixo e retorne um JSON com:
        {
          "scores": [
            {
              "post_id": "",
              "relevancia": 0-100,       // afinidade temática com o post original
              "oportunidade": 0-100,     // potencial de engajamento/visibilidade
              "justificativa": "",        // 1 frase explicando o score
              "tipo_relacao": ""         // "complementar" | "debate" | "caso_de_uso" | "tendencia"
            }
          ]
        }

        Posts candidatos:
        ${candidatePosts.map(p => `ID: ${p.id}\nConteúdo: ${p.commentary?.text || ''}\n---`).join('\n')}
      `;

      const scoringData = await callGemini(geminiConfig, scoringPrompt);

      // Merge scores back to post data
      scoredPosts = candidatePosts.map(p => {
        const scoreInfo = scoringData.scores?.find(s => s.post_id === p.id);
        if (!scoreInfo) return null;

        const finalScore = Math.round((scoreInfo.relevancia * 0.6) + (scoreInfo.oportunidade * 0.4));

        return {
          ...p,
          relevance_score: scoreInfo.relevancia,
          opportunity_score: scoreInfo.oportunidade,
          final_score: finalScore,
          relation_type: scoreInfo.tipo_relacao,
          score_justification: scoreInfo.justificativa
        };
      }).filter(p => p !== null && p.final_score >= 40); // Slightly lower threshold for saving to DB, frontend can filter more
    }

    // 5. Save to database
    if (scoredPosts.length > 0) {
      for (const p of scoredPosts) {
        await query(
          `INSERT INTO linkedin_discovered_posts
           (session_id, linkedin_post_id, post_content, post_author_name, post_author_urn, post_url, post_published_at, relevance_score, opportunity_score, final_score, relation_type, score_justification)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (linkedin_post_id, session_id) DO NOTHING`,
          [
            sessionId,
            p.id,
            p.commentary?.text,
            p.author, // We don't have author name yet, might need another API call or Gemini to guess
            p.author,
            `https://www.linkedin.com/feed/update/${p.id}`,
            p.publishedAt,
            p.relevance_score,
            p.opportunity_score,
            p.final_score,
            p.relation_type,
            p.score_justification
          ]
        );
      }
      await updateSessionStatus(sessionId, 'ready');
    } else {
      console.log(`[Worker] No relevant posts found for session ${sessionId}.`);
      await updateSessionStatus(sessionId, 'completed');
    }
  } catch (error) {
    console.error('Worker Error:', error);
    await updateSessionStatus(sessionId, 'error');
  }
}

async function getLinkedinAccessToken(userId) {
  const { rows } = await query('SELECT linkedin_access_token FROM users WHERE id = $1', [userId]);
  return rows[0]?.linkedin_access_token;
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

      Você acabou de publicar no LinkedIn:
      "${post.source_post_content}"

      E encontrou o seguinte post de ${post.post_author_name}:
      "${post.post_content}"

      Gere um comentário para este post que:
      1. Seja autêntico e agregue valor ao debate
      2. Faça uma conexão natural com sua perspectiva (sem forçar autopromoção)
      3. Convide ao diálogo com uma pergunta ou insight
      4. Tenha entre 3 e 6 linhas
      5. NÃO mencione explicitamente seu próprio post
      6. Use linguagem natural e profissional, sem excessos de emojis

      Tipo de relação detectada: ${post.relation_type}
      - "complementar": expanda ou valide o ponto com sua experiência
      - "debate": ofereça uma perspectiva complementar, respeitosamente
      - "caso_de_uso": traga um exemplo prático
      - "tendencia": conecte com contexto de mercado mais amplo

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
