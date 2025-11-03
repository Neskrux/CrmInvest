-- Script para verificar e limpar boletos do fechamento 143
-- Use este script para verificar quantos boletos existem e limpar se necessário

-- ============================================
-- 1. VERIFICAR BOLETOS DO FECHAMENTO 143
-- ============================================

-- Ver todos os boletos do fechamento 143
SELECT 
    id,
    numero_documento,
    nosso_numero,
    parcela_numero,
    valor,
    data_vencimento,
    status,
    situacao,
    erro_criacao,
    created_at
FROM boletos_caixa
WHERE fechamento_id = 143
ORDER BY parcela_numero ASC, created_at DESC;

-- Contar boletos por status
SELECT 
    status,
    COUNT(*) as total
FROM boletos_caixa
WHERE fechamento_id = 143
GROUP BY status;

-- Contar boletos com e sem erro
SELECT 
    CASE 
        WHEN erro_criacao IS NOT NULL THEN 'COM ERRO'
        ELSE 'SEM ERRO'
    END as tipo,
    COUNT(*) as total
FROM boletos_caixa
WHERE fechamento_id = 143
GROUP BY tipo;

-- Ver boletos duplicados (mesmo nosso_numero)
SELECT 
    nosso_numero,
    COUNT(*) as quantidade,
    STRING_AGG(numero_documento, ', ') as documentos
FROM boletos_caixa
WHERE fechamento_id = 143
    AND nosso_numero IS NOT NULL
GROUP BY nosso_numero
HAVING COUNT(*) > 1;

-- ============================================
-- 2. LIMPAR BOLETOS DO FECHAMENTO 143
-- ============================================

-- OPÇÃO 1: Limpar TODOS os boletos do fechamento 143
-- CUIDADO: Isso vai deletar TODOS os boletos!
-- DELETE FROM boletos_caixa WHERE fechamento_id = 143;

-- OPÇÃO 2: Limpar apenas boletos com erro
-- DELETE FROM boletos_caixa 
-- WHERE fechamento_id = 143 
--   AND erro_criacao IS NOT NULL;

-- OPÇÃO 3: Limpar boletos duplicados (manter apenas o mais recente de cada numero_documento)
-- DELETE FROM boletos_caixa
-- WHERE id IN (
--     SELECT id
--     FROM (
--         SELECT id,
--                ROW_NUMBER() OVER (
--                    PARTITION BY numero_documento 
--                    ORDER BY created_at DESC
--                ) as rn
--         FROM boletos_caixa
--         WHERE fechamento_id = 143
--     ) t
--     WHERE rn > 1
-- );

-- OPÇÃO 4: Limpar boletos antigos (anteriores a uma data específica)
-- DELETE FROM boletos_caixa
-- WHERE fechamento_id = 143
--   AND created_at < '2025-11-04 00:00:00';

-- ============================================
-- 3. VERIFICAR APÓS LIMPEZA
-- ============================================

-- Verificar quantos boletos restam
SELECT COUNT(*) as total_restante
FROM boletos_caixa
WHERE fechamento_id = 143;

-- Ver boletos restantes
SELECT 
    id,
    numero_documento,
    nosso_numero,
    parcela_numero,
    status
FROM boletos_caixa
WHERE fechamento_id = 143
ORDER BY parcela_numero ASC;

