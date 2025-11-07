import { query } from '../db.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const PROXY_API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5173';

// Fetches stats for a given set of posts, handling token refresh internally.
async function fetchStatsWithRefresh(fetch, userId, initialAccessToken, postsByAuthor) {
    const internalApiHeaders = {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET,
    };

    const callProxy = (action, payload, token) => {
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
            // 🎯 ORGANIZAÇÃO: Retorna o array de posts junto com a promessa para manter o contexto de falha de lote
            const response = await callProxy('getShareStatistics', { authorUrn, shareUrns: urns }, token);
            // Retorna um objeto que contém a resposta e a lista de posts do lote
            return [{
                postsInBatch: posts, // Lista de {id, urn} do lote
                response: response
            }];
        } else {
            // 🎯 MEMBRO: Múltiplas chamadas. Retorna o ID/URN junto com a promessa
            const fetchPromises = posts.map(post => {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 35);

                const payload = {
                    ugcPostUrn: post.urn,
                    queryType: 'TOTAL',
                    aggregation: 'TOTAL',
                    dateRange: {
                        start: { day: startDate.getUTCDate(), month: startDate.getUTCMonth() + 1, year: startDate.getUTCFullYear() },
                        end: { day: endDate.getUTCDate(), month: endDate.getUTCMonth() + 1, year: endDate.getUTCFullYear() }
                    }
                };

                // Retorna um objeto com o contexto (ID, URN) e a promessa
                return { id: post.id, urn: post.urn, promise: callProxy('getMemberPostStatistics', payload, token) };
            });

            // Aguarda todas as promessas e anexa a resposta ao objeto de contexto
            const results = await Promise.all(fetchPromises.map(p => p.promise));
            return results.map((res, index) => ({
                id: fetchPromises[index].id,
                urn: fetchPromises[index].urn,
                response: res
            }));
        }
    };

    let allResults = [];
    let currentAccessToken = initialAccessToken;

    for (const [authorUrn, posts] of Object.entries(postsByAuthor)) {
        // posts agora é um array de objetos que contêm {id, urn, response} ou {postsInBatch, response}
        let responsesWithContext = await processAuthor(authorUrn, posts, currentAccessToken);

        // responsesToCheck verifica se precisamos de refresh, pegando o objeto Response de dentro
        const responsesToCheck = responsesWithContext.map(item => item.response);

        const needsRefresh = responsesToCheck.some(res => res.status === 401);

        if (needsRefresh) {
            console.log(`Token expired for user ${userId}. Refreshing...`);
            const refreshResponse = await fetch(`${PROXY_API_BASE_URL}/api/linkedin-proxy`, {
                method: 'POST',
                headers: internalApiHeaders,
                body: JSON.stringify({ action: 'refreshTokenInternal', userId }),
            });

            if (!refreshResponse.ok) {
                console.warn(`Could not refresh token for user ${userId}, they may have revoked access. Skipping their posts.`);
                continue;
            }

            const { accessToken: newAccessToken } = await refreshResponse.json();
            currentAccessToken = newAccessToken;
            console.log(`Token refreshed for user ${userId}. Retrying stat collection for ${authorUrn}...`);
            await delay(1000);

            // Tenta novamente
            responsesWithContext = await processAuthor(authorUrn, posts, newAccessToken);
        }

        // allResults é agora uma lista de objetos que contêm o contexto (ID/URN) e a resposta
        allResults.push(...responsesWithContext);
    }

    return allResults;
}


// The main scheduler logic for collecting analytics
export async function handleRunAnalyticsCollector(request, response) {
    const fetch = (await import('node-fetch')).default;
    console.log('Analytics collector run initiated...');
    let processedCount = 0;
    let failedCount = 0;
    let apiFailedCount = 0;
    let failingUrns = []; // Array para armazenar os URNs que falham

    try {

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { rows: posts } = await query(
            `SELECT ls.id, ls.linkedin_post_id AS urn, ls.user_id, ls.post_content->>'authorUrn' as author_urn, u.linkedin_access_token
             FROM linkedin_schedules ls
             JOIN users u ON ls.user_id = u.id
             WHERE ls.status = 'published' AND ls.scheduled_at >= $1 AND ls.linkedin_post_id IS NOT NULL AND u.linkedin_access_token IS NOT NULL`,
            [thirtyDaysAgo]
        );

        if (posts.length === 0) {
            return response.status(200).json({ message: 'No published posts in the last 30 days to analyze.' });
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

                const statResponsesWithContext = await fetchStatsWithRefresh(fetch, userId, userData.accessToken, postsByAuthor);

                // ITERAÇÃO FINAL: Cada "item" tem agora {id, urn, response} (para Membro) ou {postsInBatch, response} (para Organização)
                for (const item of statResponsesWithContext) {
                    const res = item.response;
                    const isOrganizationBatch = !!item.postsInBatch; // É um objeto de lote de organização

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        apiFailedCount++;

                        // 🎯 LOGGING FINAL PARA IDENTIFICAR URNs FALHOS
                        if (isOrganizationBatch) {
                            // Se o LOTE falhar, assumimos que TODOS os URNs daquele lote estão falhando permanentemente.
                            const failedBatchUrns = item.postsInBatch.map(p => p.urn);
                            failingUrns.push(...failedBatchUrns);
                            console.error(`--- FALHA DE LOTE DE ORGANIZAÇÃO (404/Batch Failed) ---`);
                            console.error(`Status: ${res.status}, URNs no Lote: ${failedBatchUrns.join(', ')}`);
                            console.error(`Corpo: ${JSON.stringify(errorData)}`);
                            console.error(`-----------------------------------------------------`);
                        } else {
                            // Falha individual (Membro)
                            failingUrns.push(item.urn);
                            console.error(`--- FALHA INDIVIDUAL (404/Resource Not Found) ---`);
                            console.error(`Status: ${res.status}, URN Falho: ${item.urn}, ID no DB: ${item.id}`);
                            console.error(`Corpo: ${JSON.stringify(errorData)}`);
                            console.error(`-----------------------------------------------`);
                        }

                        continue;
                    }

                    // Processamento de sucesso (o mesmo de antes)
                    const data = await res.json();
                    const statsList = data.elements || [data];

                    for (const stat of statsList) {
                        const urn = stat.share || stat.ugcPost || stat.post || data.urn;
                        let statsData = stat.totalShareStatistics;

                        // Lógica para lidar com diferentes estruturas de analytics
                        if (!statsData && (stat.totalImpressions || stat.reactionSummaries || stat.clicks)) {
                            statsData = {
                                impressionCount: stat.totalImpressions?.count || 0, likeCount: stat.reactionSummaries?.LIKE || 0,
                                commentCount: stat.totalComments?.count || 0, shareCount: stat.totalReshares?.count || 0,
                                clickCount: stat.totalClicks?.count || 0, engagement: stat.engagementRate?.rate || 0,
                            };
                        }

                        if (!urn || !statsData) { console.warn('Skipping stat object without URN or statistics:', stat); continue; }

                        // Para post de Organização (lote), precisamos encontrar o post pelo URN no DB
                        const post = userData.posts.find(p => p.urn === urn);
                        if (!post) { console.warn(`Could not find matching post in our DB for URN: ${urn}`); continue; }

                        const { impressionCount = 0, likeCount = 0, commentCount = 0, shareCount = 0, clickCount = 0, engagement = 0 } = statsData;

                        await query(
                            `INSERT INTO linkedin_post_analytics
                             (publication_id, snapshot_date, impression_count, click_count, like_count, comment_count, share_count, engagement)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                             ON CONFLICT (publication_id, snapshot_date) DO UPDATE SET
                                 impression_count = EXCLUDED.impression_count, click_count = EXCLUDED.click_count,
                                 like_count = EXCLUDED.like_count, comment_count = EXCLUDED.comment_count,
                                 share_count = EXCLUDED.share_count, engagement = EXCLUDED.engagement, updated_at = NOW()`,
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

        const summary = `Analytics collector finished. Processed: ${processedCount}, Failed Batches: ${failedCount}. Individual API Failures: ${apiFailedCount}.`;
        console.log(summary);

        // RESULTADO FINAL: Lista de todos os URNs que falharam nesta rodada (9 URNs)
        if (failingUrns.length > 0) {
            console.log("-----------------------------------------------");
            console.log(`LISTA FINAL DE URNs COM FALHA PERMANENTE (404):`);
            console.log(failingUrns.join(',\n'));
            console.log("-----------------------------------------------");
        }

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