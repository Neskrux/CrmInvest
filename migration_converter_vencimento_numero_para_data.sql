-- ============================================
-- MIGRATION: Converter vencimento de número para data completa
-- ============================================
-- Este script converte dados antigos de vencimento que foram salvos como 
-- número (dia do mês: 1-31) para data completa (YYYY-MM-DD)
-- Execute este script no Supabase SQL Editor

-- IMPORTANTE: Este script altera o tipo da coluna de INTEGER para DATE
-- Execute em etapas para garantir que tudo funcione corretamente

-- ============================================
-- ETAPA 1: Verificar dados existentes
-- ============================================

-- 1. Verificar quantos registros precisam ser convertidos
SELECT 
  COUNT(*) as total_para_converter,
  empresa_id,
  pg_typeof(vencimento) as tipo_atual
FROM fechamentos
WHERE vencimento IS NOT NULL 
  AND empresa_id = 3
GROUP BY empresa_id, pg_typeof(vencimento);

-- 2. Ver alguns exemplos de dados
SELECT 
  id,
  paciente_id,
  data_fechamento,
  vencimento,
  empresa_id,
  pg_typeof(vencimento) as tipo_atual
FROM fechamentos
WHERE empresa_id = 3
  AND vencimento IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- ETAPA 2: Criar coluna temporária para conversão
-- ============================================

-- Adicionar coluna temporária do tipo DATE
ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS vencimento_temp DATE;

-- ============================================
-- ETAPA 3: Converter números para datas na coluna temporária
-- ============================================

-- Converter números (1-31) para datas completas
UPDATE fechamentos
SET vencimento_temp = CASE 
  -- Se o dia já passou este mês, usar próximo mês
  WHEN vencimento::integer < EXTRACT(DAY FROM data_fechamento) 
  THEN (DATE_TRUNC('month', data_fechamento) + INTERVAL '1 month' + INTERVAL '1 day' * (vencimento::integer - 1))::date
  -- Se ainda não passou, usar mesmo mês
  ELSE (DATE_TRUNC('month', data_fechamento) + INTERVAL '1 day' * (vencimento::integer - 1))::date
END
WHERE vencimento IS NOT NULL 
  AND vencimento::integer BETWEEN 1 AND 31
  AND empresa_id = 3;

-- ============================================
-- ETAPA 4: Remover coluna antiga e renomear temporária
-- ============================================

-- Remover coluna antiga (INTEGER)
ALTER TABLE fechamentos DROP COLUMN IF EXISTS vencimento;

-- Renomear coluna temporária para o nome original
ALTER TABLE fechamentos RENAME COLUMN vencimento_temp TO vencimento;

-- ============================================
-- ETAPA 5: Verificar resultado final
-- ============================================

-- Verificar se a conversão funcionou
SELECT 
  id,
  paciente_id,
  data_fechamento,
  vencimento,
  empresa_id,
  pg_typeof(vencimento) as tipo_atual,
  CASE 
    WHEN vencimento IS NULL THEN 'NULL'
    ELSE 'Data válida: ' || vencimento::text
  END as status
FROM fechamentos
WHERE empresa_id = 3
ORDER BY created_at DESC
LIMIT 20;

