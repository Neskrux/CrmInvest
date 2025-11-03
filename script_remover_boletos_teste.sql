-- ============================================
-- SCRIPT: Remover Boletos de Teste
-- ============================================
-- Este script permite remover boletos criados durante os testes
-- Execute no Supabase SQL Editor
-- ============================================

-- ============================================
-- OPÇÃO 1: Remover TODOS os boletos do fechamento 143
-- ============================================
-- Descomente a linha abaixo para excluir todos os boletos deste fechamento
DELETE FROM boletos_caixa
WHERE fechamento_id = 143;

-- ============================================
-- OPÇÃO 2: Verificar antes de excluir (RECOMENDADO)
-- ============================================
-- Execute esta query PRIMEIRO para ver quais boletos serão removidos:
SELECT 
  id,
  fechamento_id,
  paciente_id,
  parcela_numero,
  numero_documento,
  nosso_numero,
  valor,
  data_vencimento,
  situacao,
  status,
  erro_criacao,
  created_at
FROM boletos_caixa
WHERE fechamento_id = 143
ORDER BY parcela_numero;

-- ============================================
-- OPÇÃO 3: Remover apenas boletos com nosso_numero duplicado ou erro
-- ============================================
-- Remove apenas boletos que falharam ou têm problemas
DELETE FROM boletos_caixa
WHERE fechamento_id = 143
  AND (
    erro_criacao IS NOT NULL 
    OR nosso_numero IS NULL
    OR numero_documento LIKE 'FEC-143-%'
  );

-- ============================================
-- OPÇÃO 4: Remover TODOS os boletos de um paciente específico
-- ============================================
-- Substitua o ID do paciente abaixo
-- DELETE FROM boletos_caixa WHERE paciente_id = 123;

-- ============================================
-- OPÇÃO 5: Remover TODOS os boletos criados hoje (CUIDADO!)
-- ============================================
-- DELETE FROM boletos_caixa 
-- WHERE DATE(created_at) = CURRENT_DATE;

-- ============================================
-- OPÇÃO 6: Estatísticas antes de excluir
-- ============================================
-- Ver quantos boletos serão removidos
SELECT 
  COUNT(*) as total_boletos,
  COUNT(DISTINCT fechamento_id) as fechamentos,
  COUNT(DISTINCT paciente_id) as pacientes,
  MIN(created_at) as primeiro_boleto,
  MAX(created_at) as ultimo_boleto
FROM boletos_caixa
WHERE fechamento_id = 143;

