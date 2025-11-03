-- ============================================
-- SCRIPT: Verificar Boletos do Fechamento 143
-- ============================================
-- Execute este script no Supabase SQL Editor para verificar
-- quais boletos existem e identificar problemas
-- ============================================

-- ============================================
-- 1. LISTAR TODOS OS BOLETOS DO FECHAMENTO 143
-- ============================================
SELECT 
  id,
  fechamento_id,
  parcela_numero,
  numero_documento,
  nosso_numero,
  valor,
  data_vencimento,
  situacao,
  status,
  erro_criacao,
  created_at,
  CASE 
    WHEN erro_criacao IS NOT NULL THEN '❌ COM ERRO'
    WHEN nosso_numero IS NULL THEN '⚠️ SEM NOSSO NUMERO'
    ELSE '✅ OK'
  END as status_boleto
FROM boletos_caixa
WHERE fechamento_id = 143
ORDER BY parcela_numero NULLS LAST, id;

-- ============================================
-- 2. CONTAR BOLETOS POR PARCELA
-- ============================================
SELECT 
  parcela_numero,
  COUNT(*) as quantidade,
  STRING_AGG(DISTINCT numero_documento, ', ') as numeros_documento,
  STRING_AGG(DISTINCT nosso_numero::text, ', ') as numeros_nosso_numero,
  STRING_AGG(DISTINCT id::text, ', ') as ids
FROM boletos_caixa
WHERE fechamento_id = 143
GROUP BY parcela_numero
ORDER BY parcela_numero;

-- ============================================
-- 3. VERIFICAR DUPLICATAS DE numero_documento
-- ============================================
SELECT 
  numero_documento,
  COUNT(*) as quantidade,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(nosso_numero::text, ', ') as nosso_numero
FROM boletos_caixa
WHERE fechamento_id = 143
GROUP BY numero_documento
HAVING COUNT(*) > 1;

-- ============================================
-- 4. VERIFICAR DUPLICATAS DE nosso_numero
-- ============================================
SELECT 
  nosso_numero,
  COUNT(*) as quantidade,
  STRING_AGG(numero_documento, ', ') as numeros_documento,
  STRING_AGG(id::text, ', ') as ids
FROM boletos_caixa
WHERE fechamento_id = 143
  AND nosso_numero IS NOT NULL
GROUP BY nosso_numero
HAVING COUNT(*) > 1;

-- ============================================
-- 5. RESUMO GERAL
-- ============================================
SELECT 
  COUNT(*) as total_boletos,
  COUNT(DISTINCT parcela_numero) as parcelas_unicas,
  COUNT(DISTINCT numero_documento) as numeros_documento_unicos,
  COUNT(DISTINCT nosso_numero) as nosso_numero_unicos,
  SUM(CASE WHEN erro_criacao IS NOT NULL THEN 1 ELSE 0 END) as com_erro,
  SUM(CASE WHEN nosso_numero IS NULL THEN 1 ELSE 0 END) as sem_nosso_numero,
  SUM(CASE WHEN erro_criacao IS NULL AND nosso_numero IS NOT NULL THEN 1 ELSE 0 END) as boletos_ok
FROM boletos_caixa
WHERE fechamento_id = 143;

-- ============================================
-- 6. LISTAR BOLETOS QUE PODEM SER PROBLEMÁTICOS
-- ============================================
SELECT 
  id,
  parcela_numero,
  numero_documento,
  nosso_numero,
  valor,
  erro_criacao,
  created_at
FROM boletos_caixa
WHERE fechamento_id = 143
  AND (
    -- Boletos com erro
    erro_criacao IS NOT NULL
    -- Ou sem nosso_numero
    OR nosso_numero IS NULL
    -- Ou nosso_numero duplicado
    OR nosso_numero IN (
      SELECT nosso_numero 
      FROM boletos_caixa 
      WHERE fechamento_id = 143 
        AND nosso_numero IS NOT NULL
      GROUP BY nosso_numero 
      HAVING COUNT(*) > 1
    )
  )
ORDER BY parcela_numero NULLS LAST;

-- ============================================
-- 7. OPÇÃO PARA DELETAR TODOS OS BOLETOS DO FECHAMENTO 143
-- ============================================
-- DESCOMENTE APENAS SE QUISER DELETAR TODOS OS BOLETOS:
-- DELETE FROM boletos_caixa WHERE fechamento_id = 143;

-- ============================================
-- 8. OPÇÃO PARA DELETAR APENAS BOLETOS PROBLEMÁTICOS
-- ============================================
-- DESCOMENTE APENAS SE QUISER DELETAR APENAS OS PROBLEMÁTICOS:
-- DELETE FROM boletos_caixa
-- WHERE fechamento_id = 143
--   AND (
--     erro_criacao IS NOT NULL
--     OR nosso_numero IS NULL
--     OR nosso_numero IN (
--       SELECT nosso_numero 
--       FROM boletos_caixa 
--       WHERE fechamento_id = 143 
--         AND nosso_numero IS NOT NULL
--       GROUP BY nosso_numero 
--       HAVING COUNT(*) > 1
--     )
--   );

