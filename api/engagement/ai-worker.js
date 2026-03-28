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

    // 3. Discovery of posts
    const linkedinToken = await getLinkedinAccessToken(session.user_id);
    if (!linkedinToken) {
      console.error(`LinkedIn access token not found for user ${session.user_id}`);
      await updateSessionStatus(sessionId, 'error');
      return;
    }

    const discoveredPostsMap = new Map();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Increased window to 30 days

    // Search logic in waves
    const waves = [
      [...(extractedData.onda_1_especifica || []), ...(extractedData.hashtags_en || [])],
      [...(extractedData.onda_2_ampla || [])]
    ];

    let totalDiscovered = 0;

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

    // Google Discovery Fallback (Since LinkedIn 404ed the hashtag endpoint)
    console.log(`[Worker] Using Google Search fallback for discovery...`);

    // Prioritize user-specific settings for Google Search
    const { rows: settingsRows } = await query('SELECT settings_data FROM settings WHERE user_id = $1', [session.user_id]);
    const userSettings = settingsRows[0]?.settings_data || {};

    const googleSearchApiKey = userSettings.google_search_api_key || process.env.GOOGLE_SEARCH_API_KEY;
    const googleSearchCx = userSettings.google_search_cx || process.env.GOOGLE_SEARCH_CX;

    const keySource = userSettings.google_search_api_key ? 'User Settings' : 'Environment';
    const cxSource = userSettings.google_search_cx ? 'User Settings' : 'Environment';

    if (!googleSearchApiKey || !googleSearchCx) {
      console.warn(`[Worker] Google Search credentials missing (Key: ${googleSearchApiKey ? 'OK' : 'MISSING'}, CX: ${googleSearchCx ? 'OK' : 'MISSING'}). Falling back to LinkedIn API anyway.`);
    } else {
      const maskedKey = googleSearchApiKey.substring(0, 4) + '...' + googleSearchApiKey.substring(googleSearchApiKey.length - 4);
      const maskedCx = googleSearchCx.substring(0, 4) + '...' + googleSearchCx.substring(googleSearchCx.length - 4);
      console.log(`[Worker] Google Search credentials from ${keySource}/${cxSource} (Key: ${maskedKey}, CX: ${maskedCx})`);
    }

    const allDiscoveryTerms = waves.flat().filter((v, i, a) => a.indexOf(v) === i);

    for (const term of allDiscoveryTerms.slice(0, 15)) {
      const slugifiedTerm = slugify(term);
      try {
        if (googleSearchApiKey && googleSearchCx) {
          // Use the spaced/cleaned term for Google as it's more likely to match natural language indexing
          const gTerm = slugifiedTerm || term;
          console.log(`[Worker] Searching Google for term: "${gTerm}" (Original: "${term}")`);
          const gQuery = `(site:linkedin.com/posts OR site:linkedin.com/pulse) ${gTerm}`;
          const url = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleSearchCx}&q=${encodeURIComponent(gQuery)}`;
          const maskedUrl = url.replace(googleSearchApiKey, '***').replace(googleSearchCx, '***');

          try {
            console.log(`[Worker] Requesting Google API: ${maskedUrl}`);
            const gRes = await fetch(url);
            const gResText = await gRes.text();
            let gData;
            try {
              gData = JSON.parse(gResText);
            } catch (e) {
              console.error(`[Worker] Google Search returned non-JSON response (Status ${gRes.status}):`, gResText);
              continue;
            }

            if (!gRes.ok) {
              console.error(`[Worker] Google Search API error ${gRes.status}:`, JSON.stringify(gData, null, 2));
            } else if (gData.items && gData.items.length > 0) {
              console.log(`[Worker] Google found ${gData.items.length} potential posts for "${term}"`);
              for (const item of gData.items) {
                const extraction = extractLinkedinUrn(item.link);
                if (!extraction) {
                  console.log(`[Worker] Google Result skipped: URL format not recognized (${item.link})`);
                  continue;
                }
                if (extraction.commentable === false) {
                  console.log(`[Worker] Google Result skipped: Not commentable via API (Pulse) (${item.link})`);
                  continue;
                }

                const urn = extraction.urn;

                if (!discoveredPostsMap.has(urn)) {
                  console.log(`[Worker] Google Discovery: Found post ${urn} for term "${term}"`);
                  discoveredPostsMap.set(urn, {
                    id: urn,
                    link: item.link,
                    commentary: { text: item.snippet },
                    author: 'Unknown (via Google)',
                    author_name: item.title?.split(' | ')[0]?.split(' - ')[0] || 'Autor no LinkedIn',
                    publishedAt: new Date().toISOString()
                  });
                  totalDiscovered++;
                }
              }
            } else {
              console.log(`[Worker] Google Search returned 0 results for "${term}" (Full data: ${JSON.stringify(gData)})`);
            }
          } catch (googleErr) {
            console.error(`[Worker] Fatal error during Google Search fetch for "${term}":`, googleErr);
          }
        }

        // If Google fails or we want to try LinkedIn anyway (maybe it's a temporary 404?)
        const formatsToTry = [term, slugifiedTerm, `urn:li:hashtag:${slugifiedTerm}`];
        for (const searchTerm of formatsToTry) {
          const mockReq = { body: { accessToken: linkedinToken, hashtag: searchTerm, count: 10 } };
          let searchData, statusCode = 200;
          const mockRes = {
            status: (code) => { statusCode = code; return { json: (d) => { searchData = d; return mockRes; } }; },
            json: (d) => { searchData = d; return mockRes; }
          };

          await handleSearchPostsByHashtag(mockReq, mockRes);
          if (statusCode === 200 && searchData?.elements?.length > 0) {
            console.log(`[Worker] LinkedIn unexpectedly returned ${searchData.elements.length} results for "${searchTerm}"`);
            for (const post of searchData.elements) {
              const extraction = extractLinkedinUrn(post.id.startsWith('urn:li:') ? post.id : `https://www.linkedin.com/feed/update/${post.id}`);
              const urn = extraction?.urn || post.id;
              if (!discoveredPostsMap.has(urn)) {
                discoveredPostsMap.set(urn, { ...post, id: urn });
                totalDiscovered++;
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error during term "${term}" discovery:`, err);
      }
      if (totalDiscovered >= 40) break;
    }

    const candidatePosts = Array.from(discoveredPostsMap.values()).slice(0, 50);

    // [Enrichment Step]
    const postsToEnrich = candidatePosts.slice(0, 30);
    const globalTimeout = 300000; // 300s
    const startTime = Date.now();
    let enrichedCount = 0;

    console.log(`[Worker] Enriching ${postsToEnrich.length} candidate posts via Open Graph...`);

    for (let i = 0; i < postsToEnrich.length; i += 5) {
      if (Date.now() - startTime > globalTimeout) {
        console.warn('[Worker] Enrichment timed out, proceeding with what we have.');
        break;
      }

      const batch = postsToEnrich.slice(i, i + 5);
      const results = await Promise.allSettled(batch.map(async (p) => {
        if (p.commentary.text && p.commentary.text.length >= 200) return;

        const ogData = await fetchOpenGraphData(p.link);
        if (ogData.description && ogData.description.length > (p.commentary.text?.length || 0)) {
          let newText = ogData.description;
          if (ogData.title) {
            newText = `${ogData.title}\n\n${ogData.description}`;
          }
          p.commentary.text = newText;
          enrichedCount++;
        }

        // Author name enrichment
        if (ogData.author) {
          p.author_name = ogData.author;
        } else if (ogData.siteName && ogData.siteName !== 'LinkedIn') {
          p.author_name = ogData.siteName;
        } else if (ogData.title && ogData.title.includes(' on LinkedIn')) {
          // Fallback: extract from title "Name on LinkedIn: Title"
          const namePart = ogData.title.split(' on LinkedIn')[0];
          if (namePart) p.author_name = namePart;
        }
      }));

      if (i + 5 < postsToEnrich.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`[Worker] Enriched ${enrichedCount}/${postsToEnrich.length} posts successfully. Scoring ${candidatePosts.length} candidates.`);

    // 4. Score posts using Gemini in batch
    let scoredPosts = [];
    if (candidatePosts.length > 0) {
      const scoringPrompt = `
        Você é um especialista em marketing de conteúdo B2B e Social Selling.

        Post original publicado pelo usuário:
        "${session.source_post_content}"

        Palavras-chave e temas centrais: ${waves.flat().join(', ')}

        Avalie cada post candidato abaixo. Valorizamos a diversidade de opiniões, incluindo posts que tragam contrapontos ou perspectivas complementares.
        Aceitamos posts com relevância moderada se eles oferecerem uma boa oportunidade de debate.

        Retorne um JSON com:
        {
          "scores": [
            {
              "post_id": "",
              "relevancia": 0-100,       // afinidade temática com o post original ou temas correlatos
              "oportunidade": 0-100,     // potencial de engajamento/visibilidade/debate
              "justificativa": "",        // 1 frase explicando o score
              "tipo_relacao": "",         // "complementar" | "debate" | "caso_de_uso" | "tendencia"
              "autor_nome": ""           // Tente identificar o nome do autor pelo conteúdo se possível, ou deixe vazio
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
          score_justification: scoreInfo.justificativa,
          author_name: scoreInfo.autor_nome || 'Autor no LinkedIn'
        };
      }).filter(p => p !== null && p.final_score >= 25); // Lower threshold to allow "mornos" as requested
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
          p.author_name,
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

async function fetchOpenGraphData(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
      },
      signal: controller.signal
    });

    if (!response.ok) return {};

    const html = await response.text();

    // Simple regex extraction to avoid heavy dependencies
    const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1];
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1];
    const ogSiteName = html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i)?.[1];
    const authorMeta = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)?.[1];

    // Clean up entities
    const decode = (str) => str?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#39;/g, "'")?.replace(/&lt;/g, '<')?.replace(/&gt;/g, '>');

    return {
      description: decode(ogDescription),
      title: decode(ogTitle),
      siteName: decode(ogSiteName),
      author: decode(authorMeta)
    };
  } catch (err) {
    return {};
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractLinkedinUrn(url) {
  // 1. Check for Pulse (not commentable via API)
  if (url.includes('/pulse/')) {
    return { urn: url, commentable: false };
  }

  // 2. Check for explicit URN in URL (feed/update/urn:li:...)
  const urnMatch = url.match(/urn:li:(activity|ugcPost):([0-9]+)/);
  if (urnMatch) {
    return { urn: urnMatch[0], commentable: true };
  }

  // 3. Check for activity ID in /posts/ format (e.g. activity-7234567890)
  const activityMatch = url.match(/activity-([0-9]+)/);
  if (activityMatch) {
    return { urn: `urn:li:activity:${activityMatch[1]}`, commentable: true };
  }

  return null;
}

function slugify(text) {
  if (!text) return '';
  // Convert CamelCase to spaced text for better searching
  const spacedText = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spacedText
    .toString()
    .normalize('NFD')                   // separate accents from letters
    .replace(/[\u0300-\u036f]/g, '')   // remove accents
    .replace(/[^\w\s-]/g, '')          // remove non-word chars
    .replace(/[\s-]+/g, ' ')           // replace hyphens/multiple spaces with single space
    .trim();
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
