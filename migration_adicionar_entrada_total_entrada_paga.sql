-- ============================================
-- MIGRATION: Adicionar campos de Entrada Total e Entrada Paga
-- ============================================
-- Este script adiciona os campos entrada_total e entrada_paga na tabela fechamentos
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Adicionar coluna entrada_total
ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS entrada_total NUMERIC(10,2);

-- Adicionar coluna entrada_paga
ALTER TABLE fechamentos 
ADD COLUMN IF NOT EXISTS entrada_paga NUMERIC(10,2);

-- Adicionar comentários nas colunas
COMMENT ON COLUMN fechamentos.entrada_total IS 'Valor total da entrada do fechamento';
COMMENT ON COLUMN fechamentos.entrada_paga IS 'Valor da entrada paga até o momento';

-- Verificar se as colunas foram criadas
SELECT 
    column_name AS "Nome da Coluna",
    data_type AS "Tipo de Dados",
    is_nullable AS "Permite NULL",
    column_default AS "Valor Padrão"
FROM information_schema.columns 
WHERE table_name = 'fechamentos' 
    AND column_name IN ('entrada_total', 'entrada_paga')
ORDER BY column_name;

