-- ============================================
-- SCRIPT: Remover Boletos de Teste
-- ============================================
-- Este script remove boletos criados durante os testes
-- Execute no Supabase SQL Editor
-- ============================================

-- ============================================
-- VISUALIZAR BOLETOS ANTES DE REMOVER (RECOMENDADO)
-- ============================================
-- Execute esta query primeiro para ver o que será deletado:

SELECT 
  bc.id,
  bc.fechamento_id,
  bc.paciente_id,
  bc.nosso_numero,
  bc.numero_documento,
  bc.valor,
  bc.data_vencimento,
  bc.data_criacao,
  p.nome as paciente_nome,
  f.id as fechamento_numero
FROM boletos_caixa bc
LEFT JOIN pacientes p ON bc.paciente_id = p.id
LEFT JOIN fechamentos f ON bc.fechamento_id = f.id
WHERE 
  -- Condições para identificar boletos de teste
  (
    -- Boletos do fechamento 143 (mencionado nos testes)
    bc.fechamento_id = 143
    
    -- OU boletos com erro de criação
    OR bc.erro_criacao IS NOT NULL
    
    -- OU boletos sem nosso_numero (falha na criação)
    OR bc.nosso_numero IS NULL
    
    -- OU boletos criados hoje (ajuste a data conforme necessário)
    OR DATE(bc.data_criacao) = CURRENT_DATE
    
    -- OU boletos do paciente Bruno Sandoval Ribeiro (teste)
    OR p.nome LIKE '%Bruno Sandoval%'
    
    -- OU boletos com valores específicos de teste
    OR bc.valor = 495.00
  )
ORDER BY bc.data_criacao DESC;

-- ============================================
-- OPÇÃO 1: Remover TODOS os boletos do fechamento 143
-- ============================================
-- Descomente para executar:

-- DELETE FROM boletos_caixa
-- WHERE fechamento_id = 143;

-- ============================================
-- OPÇÃO 2: Remover boletos com erro de criação
-- ============================================
-- Descomente para executar:

-- DELETE FROM boletos_caixa
-- WHERE erro_criacao IS NOT NULL;

-- ============================================
-- OPÇÃO 3: Remover boletos criados hoje
-- ============================================
-- Descomente para executar:

-- DELETE FROM boletos_caixa
-- WHERE DATE(data_criacao) = CURRENT_DATE;

-- ============================================
-- OPÇÃO 4: Remover boletos específicos por ID
-- ============================================
-- Substitua os IDs pelos boletos que deseja remover:

-- DELETE FROM boletos_caixa
-- WHERE id IN (1, 2, 3, 4, 5);

-- ============================================
-- OPÇÃO 5: Remover TODOS os boletos de teste de uma vez
-- ============================================
-- CUIDADO: Esta query remove vários boletos de uma vez
-- Descomente APENAS se tiver certeza:

-- DELETE FROM boletos_caixa
-- WHERE 
--   fechamento_id = 143
--   OR erro_criacao IS NOT NULL
--   OR nosso_numero IS NULL
--   OR DATE(data_criacao) = CURRENT_DATE
--   OR valor = 495.00;

-- ============================================
-- ESTATÍSTICAS APÓS REMOÇÃO
-- ============================================
-- Execute após deletar para verificar o resultado:

SELECT 
  COUNT(*) as total_boletos,
  COUNT(DISTINCT fechamento_id) as total_fechamentos,
  COUNT(DISTINCT paciente_id) as total_pacientes,
  MIN(data_criacao) as primeiro_boleto,
  MAX(data_criacao) as ultimo_boleto,
  SUM(CASE WHEN erro_criacao IS NOT NULL THEN 1 ELSE 0 END) as boletos_com_erro,
  SUM(CASE WHEN nosso_numero IS NULL THEN 1 ELSE 0 END) as boletos_sem_nosso_numero
FROM boletos_caixa;

-- ============================================
-- VERIFICAR BOLETOS RESTANTES
-- ============================================
-- Para ver os boletos que permaneceram:

SELECT 
  bc.id,
  bc.fechamento_id,
  bc.numero_documento,
  bc.nosso_numero,
  bc.valor,
  bc.data_vencimento,
  bc.situacao,
  p.nome as paciente_nome
FROM boletos_caixa bc
LEFT JOIN pacientes p ON bc.paciente_id = p.id
ORDER BY bc.id DESC
LIMIT 20;

-- ============================================
-- LIMPAR BOLETOS ÓRFÃOS
-- ============================================
-- Remove boletos cujo fechamento foi deletado:

-- DELETE FROM boletos_caixa
-- WHERE fechamento_id NOT IN (
--   SELECT id FROM fechamentos
-- );

-- ============================================
-- RESETAR SEQUÊNCIA DE IDS (OPCIONAL)
-- ============================================
-- Se quiser reiniciar a contagem de IDs:
-- CUIDADO: Só faça isso se a tabela estiver vazia!

-- TRUNCATE TABLE boletos_caixa RESTART IDENTITY;

