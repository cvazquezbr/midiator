import { query } from '../db.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const PROXY_API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5173';

// Fetches stats for a given set of posts, handling token refresh internally.
// Fetches stats for a given set of posts, handling token refresh internally.
// NOTA: Esta função pressupõe que as variáveis 'query', 'delay' e 'PROXY_API_BASE_URL' estão definidas no escopo.
async function fetchStatsWithRefresh(fetch, userId, initialAccessToken, postsByAuthor) {
    const internalApiHeaders = {
        'Content-Type': 'application/json',
        // Assumindo que 'INTERNAL_API_SECRET' é usado para autenticar no seu proxy interno
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET,
    };

    const callProxy = (action, payload, token) => {
        // PROXY_API_BASE_URL deve estar definido externamente
        return fetch(`${PROXY_API_BASE_URL}/api/linkedin-proxy`, {
            method: 'POST',
            headers: internalApiHeaders,
            body: JSON.stringify({
                action,
                accessToken: token,
                payload,
            }),
        });
    };

    const processAuthor = async (authorUrn, posts, token) => {
        if (authorUrn.includes(':organization:')) {
            const urns = posts.map(p => p.urn);
            // Organização: Chamada única em lote (organizationalEntityShareStatistics)
            // 'getShareStatistics' deve mapear para o endpoint correto no proxy
            return callProxy('getShareStatistics', { authorUrn, shareUrns: urns }, token);
        } else {
            // Membro (Pessoa): Múltiplas chamadas (memberCreatorPostAnalytics)
            // Corrigido para rodar em paralelo usando Promise.all para otimização
            const fetchPromises = posts.map(post => {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 90);

                // Payload para analytics de membro (um post por chamada)
                const payload = {
                    ugcPostUrn: post.urn,
                    queryType: 'TOTAL',
                    aggregation: 'TOTAL',
                    dateRange: {
                        // Usando métodos UTC e corrigindo o mês (+1)
                        start: {
                            day: startDate.getUTCDate(),
                            month: startDate.getUTCMonth() + 1,
                            year: startDate.getUTCFullYear()
                        },
                        end: {
                            day: endDate.getUTCDate(),
                            month: endDate.getUTCMonth() + 1,
                            year: endDate.getUTCFullYear()
                        }
                    }
                };
                // 'getMemberPostStatistics' deve mapear para o endpoint correto no proxy
                return callProxy('getMemberPostStatistics', payload, token);
            });

            // Executa todas as chamadas de membro em paralelo
            return Promise.all(fetchPromises);
        }
    };

    let allResults = [];
    let currentAccessToken = initialAccessToken;

    for (const [authorUrn, posts] of Object.entries(postsByAuthor)) {
        let responseOrResponses = await processAuthor(authorUrn, posts, currentAccessToken);

        // Padroniza a resposta para verificação de 401
        const isSingleResponse = !Array.isArray(responseOrResponses);
        const responses = isSingleResponse ? [responseOrResponses] : responseOrResponses;

        // Verifica se o token expirou (401 Unauthorized)
        const needsRefresh = responses.some(res => res.status === 401);

        if (needsRefresh) {
            console.log(`Token expired for user ${userId}. Refreshing...`);
            const refreshResponse = await fetch(`${PROXY_API_BASE_URL}/api/linkedin-proxy`, {
                method: 'POST',
                headers: internalApiHeaders,
                // 'refreshTokenInternal' deve buscar o refresh_token no DB, renovar o token e atualizar o DB
                body: JSON.stringify({ action: 'refreshTokenInternal', userId }),
            });

            if (!refreshResponse.ok) {
                console.warn(`Could not refresh token for user ${userId}, they may have revoked access. Skipping their posts.`);
                continue;
            }

            const { accessToken: newAccessToken } = await refreshResponse.json();
            currentAccessToken = newAccessToken; // Atualiza o token para futuras chamadas
            console.log(`Token refreshed for user ${userId}. Retrying stat collection for ${authorUrn}...`);
            await delay(1000); // Pequeno delay antes de tentar novamente

            // Tenta novamente a coleta com o novo token
            responseOrResponses = await processAuthor(authorUrn, posts, newAccessToken);
        }

        allResults.push(responseOrResponses);
    }

    // Achata o array de respostas para retornar uma lista linear
    return allResults.flat();
}


// The main scheduler logic for collecting analytics
export async function handleRunAnalyticsCollector(request, response) {
    const fetch = (await import('node-fetch')).default;
    console.log('Analytics collector run initiated...');
    let processedCount = 0;
    let failedCount = 0;

    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const { rows: posts } = await query(
            `SELECT ls.id, ls.linkedin_post_id AS urn, ls.user_id, ls.post_content->>'authorUrn' as author_urn, u.linkedin_access_token
             FROM linkedin_schedules ls
             JOIN users u ON ls.user_id = u.id
             WHERE ls.status = 'published' AND ls.scheduled_at >= $1 AND ls.linkedin_post_id IS NOT NULL AND u.linkedin_access_token IS NOT NULL`,
            [threeMonthsAgo]
        );

        if (posts.length === 0) {
            return response.status(200).json({ message: 'No published posts in the last 3 months to analyze.' });
        }

        const postsByUser = posts.reduce((acc, post) => {
            if (!acc[post.user_id]) {
                acc[post.user_id] = { accessToken: post.linkedin_access_token, posts: [] };
            }
            acc[post.user_id].posts.push({ id: post.id, urn: post.urn, author_urn: post.author_urn });
            return acc;
        }, {});

        const snapshotDate = new Date().toISOString().split('T')[0];

        for (const [userId, userData] of Object.entries(postsByUser)) {
            try {
                const postsByAuthor = userData.posts.reduce((acc, post) => {
                    if (post.author_urn && post.urn) {
                        if (!acc[post.author_urn]) acc[post.author_urn] = [];
                        acc[post.author_urn].push({ id: post.id, urn: post.urn });
                    }
                    return acc;
                }, {});

                const statResponses = await fetchStatsWithRefresh(fetch, userId, userData.accessToken, postsByAuthor);

                for (const res of statResponses) {
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        console.error(`Failed to fetch stats for a batch. Status: ${res.status}, Body: ${JSON.stringify(errorData)}`);
                        continue;
                    }

                    const data = await res.json();
                    const statsList = data.elements || [data];

                    for (const stat of statsList) {
                        const urn = stat.share || stat.ugcPost || stat.post || data.urn;
                        let statsData = stat.totalShareStatistics;

                        // Handle the different structure from member analytics
                        if (!statsData && (stat.totalImpressions || stat.reactionSummaries || stat.clicks)) {
                            statsData = {
                                impressionCount: stat.totalImpressions?.count || 0,
                                likeCount: stat.reactionSummaries?.LIKE || 0,
                                commentCount: stat.totalComments?.count || 0,
                                shareCount: stat.totalReshares?.count || 0,
                                clickCount: stat.totalClicks?.count || 0,
                                engagement: stat.engagementRate?.rate || 0,
                            };
                        }

                        if (!urn || !statsData) {
                            console.warn('Skipping stat object without URN or statistics:', stat);
                            continue;
                        }

                        const post = userData.posts.find(p => p.urn === urn);
                        if (!post) {
                            console.warn(`Could not find matching post in our DB for URN: ${urn}`);
                            continue;
                        }

                        const {
                            impressionCount = 0,
                            likeCount = 0,
                            commentCount = 0,
                            shareCount = 0,
                            clickCount = 0,
                            engagement = 0
                        } = statsData;

                        await query(
                            `INSERT INTO linkedin_post_analytics
                             (publication_id, snapshot_date, impression_count, click_count, like_count, comment_count, share_count, engagement)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                             ON CONFLICT (publication_id, snapshot_date) DO UPDATE SET
                                impression_count = EXCLUDED.impression_count,
                                click_count = EXCLUDED.click_count,
                                like_count = EXCLUDED.like_count,
                                comment_count = EXCLUDED.comment_count,
                                share_count = EXCLUDED.share_count,
                                engagement = EXCLUDED.engagement,
                                updated_at = NOW()`,
                            [post.id, snapshotDate, impressionCount, clickCount, likeCount, commentCount, shareCount, engagement]
                        );
                        processedCount++;
                    }
                }
            } catch (error) {
                failedCount++;
                console.error(`Failed to process analytics for user ${userId}. Error: ${error.message}`);
            }
        }

        const summary = `Analytics collector finished. Processed: ${processedCount}, Failed Batches: ${failedCount}.`;
        console.log(summary);
        return response.status(200).json({ message: summary });

    } catch (error) {
        console.error('Critical error in analytics collector run:', error);
        return response.status(500).json({ error: 'Internal Server Error during analytics collector run' });
    }
}

// Main handler for the cron job endpoint
export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('Unauthorized cron request for analytics. Mismatched or missing secret.');
        return response.status(401).json({ error: 'Unauthorized' });
    }

    return handleRunAnalyticsCollector(request, response);
}