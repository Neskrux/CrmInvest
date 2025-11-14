-- ============================================
-- MIGRATION: Criar tabela metas_corretores
-- ============================================
-- Este script cria a tabela metas_corretores para armazenar metas de VGV e Entrada por corretor
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Criar tabela metas_corretores
CREATE TABLE IF NOT EXISTS metas_corretores (
  id SERIAL PRIMARY KEY,
  corretor_id INTEGER NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  meta_vgv NUMERIC(12,2) NOT NULL DEFAULT 1020000.00,
  meta_entrada NUMERIC(12,2) NOT NULL DEFAULT 150000.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(corretor_id, mes, ano)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_metas_corretores_corretor ON metas_corretores(corretor_id);
CREATE INDEX IF NOT EXISTS idx_metas_corretores_mes_ano ON metas_corretores(mes, ano);
CREATE INDEX IF NOT EXISTS idx_metas_corretores_empresa ON metas_corretores(corretor_id, mes, ano);

-- Adicionar comentários
COMMENT ON TABLE metas_corretores IS 'Armazena metas de VGV e Entrada por corretor por mês';
COMMENT ON COLUMN metas_corretores.meta_vgv IS 'Meta de VGV (Valor Geral de Venda) do corretor para o mês';
COMMENT ON COLUMN metas_corretores.meta_entrada IS 'Meta de Entrada do corretor para o mês';

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_metas_corretores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_metas_corretores_updated_at ON metas_corretores;
CREATE TRIGGER trigger_update_metas_corretores_updated_at
  BEFORE UPDATE ON metas_corretores
  FOR EACH ROW
  EXECUTE FUNCTION update_metas_corretores_updated_at();

-- Verificar se a tabela foi criada
SELECT 
    column_name AS "Nome da Coluna",
    data_type AS "Tipo de Dados",
    is_nullable AS "Permite NULL",
    column_default AS "Valor Padrão"
FROM information_schema.columns 
WHERE table_name = 'metas_corretores'
ORDER BY ordinal_position;

