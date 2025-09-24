-- Este script popula a tabela linkedin_post_analytics com dados de teste para um conjunto específico de publicações.
-- Os dados são gerados para Março de 2024 para facilitar a identificação e exclusão posterior.

-- A Common Table Expression (CTE) 'daily_impressions' gera uma linha para cada dia de Março de 2024 para cada post publicado.
WITH daily_impressions AS (
    SELECT
        p.id AS publication_id,
        s.snapshot_date,
        -- Gera um número aleatório de impressões diárias entre 100 e 5000 para simular a variação.
        (100 + random() * 4900)::int AS impression_count
    FROM
        -- Gera uma série de datas para todo o mês de Março de 2024.
        generate_series('2024-03-01'::date, '2024-03-31'::date, '1 day') AS s(snapshot_date),
        -- IDs das publicações publicadas que devem receber dados de teste.
        (VALUES (25), (102), (103), (104), (105), (106), (108), (109)) AS p(id)
)
-- Insere os dados gerados na tabela de analytics.
INSERT INTO linkedin_post_analytics (
    publication_id,
    snapshot_date,
    impression_count,
    click_count,
    like_count,
    comment_count,
    share_count,
    engagement
)
SELECT
    publication_id,
    snapshot_date,
    impression_count,
    -- As métricas a seguir são geradas como uma porcentagem aleatória das impressões para manter a proporcionalidade.
    (impression_count * (random() * 0.04 + 0.01))::int AS click_count,      -- CTR entre 1% e 5%
    (impression_count * (random() * 0.03 + 0.005))::int AS like_count,     -- Taxa de likes entre 0.5% e 3.5%
    (impression_count * (random() * 0.005 + 0.001))::int AS comment_count, -- Taxa de comentários entre 0.1% e 0.6%
    (impression_count * (random() * 0.002))::int AS share_count,           -- Taxa de compartilhamentos até 0.2%
    (0.01 + random() * 0.09)::real AS engagement                          -- Taxa de engajamento entre 1% e 10%
FROM
    daily_impressions
-- Se um registro para uma publicação em um dia específico já existir, não faz nada.
-- Isso torna o script seguro para ser executado várias vezes sem gerar duplicatas.
ON CONFLICT (publication_id, snapshot_date) DO NOTHING;

-- Exemplo de como excluir esses dados de teste posteriormente:
-- DELETE FROM linkedin_post_analytics WHERE snapshot_date >= '2024-03-01' AND snapshot_date <= '2024-03-31';