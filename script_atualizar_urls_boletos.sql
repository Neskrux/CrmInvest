-- ============================================
-- SCRIPT: Atualizar URLs de boletos com IPs internos
-- ============================================
-- Este script atualiza as URLs dos boletos que estão com IPs internos
-- para a URL pública da Caixa
-- ============================================

-- Verificar quantos boletos têm URLs com IP interno
SELECT COUNT(*) as total_com_ip_interno
FROM boletos_caixa
WHERE url LIKE '%10.116.82.66%'
   OR url LIKE '%172.%'
   OR url LIKE '%192.168%';

-- Atualizar URLs de boletos com IP interno para URL pública
UPDATE boletos_caixa
SET url = REPLACE(
    REPLACE(
        REPLACE(url, 
            'https://10.116.82.66:8010', 
            'https://boletoonline.caixa.gov.br'
        ),
        'http://10.116.82.66:8010',
        'https://boletoonline.caixa.gov.br'
    ),
    '10.116.82.66:8010',
    'boletoonline.caixa.gov.br'
)
WHERE url LIKE '%10.116.82.66%';

-- Verificar resultados
SELECT 
    id,
    numero_documento,
    nosso_numero,
    url,
    data_vencimento,
    valor
FROM boletos_caixa
WHERE fechamento_id IN (
    SELECT DISTINCT fechamento_id 
    FROM boletos_caixa 
    WHERE url LIKE '%boletoonline.caixa.gov.br%'
)
ORDER BY id DESC
LIMIT 10;

-- Mostrar estatísticas após atualização
SELECT 
    CASE 
        WHEN url LIKE '%boletoonline.caixa.gov.br%' THEN 'URL Pública'
        WHEN url LIKE '%10.116.82.66%' THEN 'IP Interno'
        WHEN url IS NULL THEN 'Sem URL'
        ELSE 'Outro'
    END as tipo_url,
    COUNT(*) as quantidade
FROM boletos_caixa
GROUP BY tipo_url;
