-- ============================================
-- CONSULTAS: Verificar Rastreabilidade de Documentos Assinados
-- ============================================
-- Execute estas queries no Supabase SQL Editor para visualizar os dados de rastreabilidade

-- ============================================
-- 1. VER TODOS OS DOCUMENTOS ASSINADOS COM RASTREABILIDADE
-- ============================================
SELECT 
    id,
    nome AS "Nome do Documento",
    assinante AS "Assinado Por",
    documento AS "CPF/CNPJ",
    hash_sha1 AS "Hash SHA1 (Rastreabilidade)",
    LEFT(chave_validacao, 10) AS "Chave Validação",
    data_assinatura AS "Data de Assinatura",
    ip_assinatura AS "IP do Assinante",
    integridade_status AS "Status Integridade",
    validade_juridica AS "Validade Jurídica"
FROM documentos_assinados
ORDER BY data_assinatura DESC;

-- ============================================
-- 2. VER INFORMAÇÕES COMPLETAS DE UM DOCUMENTO ESPECÍFICO
-- ============================================
-- Substitua 'HASH_AQUI' pelo hash do documento que você quer verificar
SELECT 
    id,
    nome,
    assinante,
    documento,
    hash_sha1 AS "Hash de Rastreabilidade",
    chave_validacao AS "Chave de Validação",
    data_assinatura,
    ip_assinatura AS "IP do Assinante",
    dispositivo_info AS "Informações do Dispositivo",
    hash_anterior AS "Hash Anterior",
    auditoria_log AS "Log de Auditoria",
    integridade_status AS "Status",
    integridade_verificada AS "Última Verificação",
    validade_juridica AS "Validade Jurídica"
FROM documentos_assinados
WHERE hash_sha1 = 'HASH_AQUI';  -- Substitua pelo hash real

-- ============================================
-- 3. VER HISTÓRICO DE VALIDAÇÕES DE UM DOCUMENTO
-- ============================================
-- Extrai os eventos de auditoria de um documento específico
SELECT 
    id,
    nome,
    hash_sha1,
    jsonb_array_elements(auditoria_log) AS evento_auditoria
FROM documentos_assinados
WHERE hash_sha1 = 'HASH_AQUI'  -- Substitua pelo hash real
ORDER BY evento_auditoria->>'data' DESC;

-- ============================================
-- 4. VER DOCUMENTOS POR IP DE ASSINATURA
-- ============================================
SELECT 
    ip_assinatura AS "IP",
    COUNT(*) AS "Total de Documentos Assinados",
    MAX(data_assinatura) AS "Última Assinatura"
FROM documentos_assinados
WHERE ip_assinatura IS NOT NULL
GROUP BY ip_assinatura
ORDER BY COUNT(*) DESC;

-- ============================================
-- 5. VER DOCUMENTOS POR STATUS DE INTEGRIDADE
-- ============================================
SELECT 
    integridade_status AS "Status",
    COUNT(*) AS "Quantidade",
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM documentos_assinados), 2) AS "Percentual"
FROM documentos_assinados
GROUP BY integridade_status
ORDER BY COUNT(*) DESC;

-- ============================================
-- 6. VER DOCUMENTOS VERIFICADOS RECENTEMENTE
-- ============================================
SELECT 
    id,
    nome,
    hash_sha1 AS "Hash",
    integridade_status AS "Status",
    integridade_verificada AS "Verificado Em",
    (
        SELECT COUNT(*) 
        FROM jsonb_array_elements(auditoria_log) 
        WHERE value->>'tipo' LIKE '%validacao%'
    ) AS "Número de Validações"
FROM documentos_assinados
WHERE integridade_verificada IS NOT NULL
ORDER BY integridade_verificada DESC
LIMIT 20;

-- ============================================
-- 7. VER DISPOSITIVOS USADOS PARA ASSINAR
-- ============================================
SELECT 
    dispositivo_info->>'userAgent' AS "Navegador/Dispositivo",
    dispositivo_info->>'plataforma' AS "Plataforma",
    COUNT(*) AS "Quantidade de Assinaturas"
FROM documentos_assinados
WHERE dispositivo_info IS NOT NULL
GROUP BY dispositivo_info->>'userAgent', dispositivo_info->>'plataforma'
ORDER BY COUNT(*) DESC;

-- ============================================
-- 8. VERIFICAR SE UM DOCUMENTO FOI ALTERADO
-- ============================================
-- Compare o hash atual com o hash anterior
SELECT 
    id,
    nome,
    hash_sha1 AS "Hash Atual",
    hash_anterior AS "Hash Anterior",
    CASE 
        WHEN hash_anterior IS NOT NULL AND hash_sha1 != hash_anterior 
        THEN '⚠️ ALTERADO - Hash mudou!'
        WHEN hash_anterior IS NULL 
        THEN '✅ Hash Original'
        ELSE '✅ Hash Mantido'
    END AS "Status de Alteração"
FROM documentos_assinados
WHERE hash_anterior IS NOT NULL;

-- ============================================
-- 9. BUSCAR DOCUMENTO POR CHAVE DE VALIDAÇÃO
-- ============================================
-- Use isso quando alguém fornecer a chave de validação
SELECT 
    id,
    nome,
    assinante,
    documento,
    hash_sha1 AS "Hash Completo",
    chave_validacao AS "Chave Usada",
    data_assinatura,
    integridade_status,
    (SELECT COUNT(*) FROM jsonb_array_elements(auditoria_log)) AS "Total de Eventos"
FROM documentos_assinados
WHERE chave_validacao = 'CHAVE_AQUI';  -- Substitua pela chave real

-- ============================================
-- 10. RESUMO GERAL DO SISTEMA
-- ============================================
SELECT 
    COUNT(*) AS "Total de Documentos",
    COUNT(DISTINCT ip_assinatura) AS "IPs Únicos",
    COUNT(DISTINCT assinante) AS "Assinantes Únicos",
    COUNT(CASE WHEN integridade_status = 'integro' THEN 1 END) AS "Documentos Íntegros",
    COUNT(CASE WHEN integridade_status = 'alterado' THEN 1 END) AS "Documentos Alterados",
    COUNT(CASE WHEN integridade_status = 'nao_verificado' THEN 1 END) AS "Não Verificados",
    MAX(data_assinatura) AS "Última Assinatura",
    MAX(integridade_verificada) AS "Última Verificação"
FROM documentos_assinados;

