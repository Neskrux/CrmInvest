-- ============================================
-- SCRIPT: Excluir boletos com erro do fechamento
-- ============================================
-- Este script exclui boletos que foram criados com erro
-- para permitir uma nova tentativa de geração

-- ============================================
-- OPÇÃO 1: Excluir por fechamento_id específico
-- ============================================
-- Substitua 143 pelo ID do seu fechamento
DELETE FROM boletos_caixa
WHERE fechamento_id = 143
  AND (erro_criacao IS NOT NULL OR nosso_numero IS NULL);
-- Se você quiser excluir TODOS os boletos deste fechamento (mesmo sem erro):
-- DELETE FROM boletos_caixa WHERE fechamento_id = 143;

-- ============================================
-- OPÇÃO 2: Verificar primeiro quais boletos serão excluídos
-- ============================================
-- Execute esta query ANTES de excluir para ver o que será deletado:
SELECT 
  id,
  fechamento_id,
  paciente_id,
  parcela_numero,
  numero_documento,
  valor,
  data_vencimento,
  nosso_numero,
  erro_criacao,
  created_at
FROM boletos_caixa
WHERE fechamento_id = 143
  AND (erro_criacao IS NOT NULL OR nosso_numero IS NULL)
ORDER BY parcela_numero;

-- ============================================
-- OPÇÃO 3: Excluir TODOS os boletos com erro "API Key não encontrada"
-- ============================================
-- CUIDADO: Isso excluirá TODOS os boletos com esse erro, independente do fechamento
DELETE FROM boletos_caixa
WHERE erro_criacao LIKE '%API Key não encontrada%';

-- ============================================
-- OPÇÃO 4: Verificar quantos boletos têm erro
-- ============================================
SELECT 
  COUNT(*) as total_com_erro,
  fechamento_id,
  COUNT(DISTINCT paciente_id) as pacientes_afetados
FROM boletos_caixa
WHERE erro_criacao IS NOT NULL
GROUP BY fechamento_id
ORDER BY total_com_erro DESC;

