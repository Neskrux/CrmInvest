-- Migração para criar tabela de novas clínicas (missões diárias)
-- Execute este arquivo no SQL Editor do Supabase

-- Criar tabela de novas clínicas
CREATE TABLE IF NOT EXISTS novas_clinicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  status TEXT DEFAULT 'tem_interesse',
  observacoes TEXT,
  consultor_id INTEGER REFERENCES consultores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_consultor_id ON novas_clinicas (consultor_id);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_status ON novas_clinicas (status);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_created_at ON novas_clinicas (created_at);
CREATE INDEX IF NOT EXISTS idx_novas_clinicas_telefone ON novas_clinicas (telefone);

-- Desabilitar RLS para simplificar (mesmo padrão das outras tabelas)
ALTER TABLE novas_clinicas DISABLE ROW LEVEL SECURITY;

-- Comentários para documentação
COMMENT ON TABLE novas_clinicas IS 'Tabela para armazenar clínicas encontradas durante as missões diárias dos consultores';
COMMENT ON COLUMN novas_clinicas.nome IS 'Nome da clínica encontrada';
COMMENT ON COLUMN novas_clinicas.telefone IS 'Telefone da clínica (apenas números)';
COMMENT ON COLUMN novas_clinicas.endereco IS 'Endereço completo da clínica';
COMMENT ON COLUMN novas_clinicas.status IS 'Status da clínica (tem_interesse, nao_tem_interesse)';
COMMENT ON COLUMN novas_clinicas.observacoes IS 'Observações sobre a clínica';
COMMENT ON COLUMN novas_clinicas.consultor_id IS 'ID do consultor que pegou a clínica (NULL = disponível)';
COMMENT ON COLUMN novas_clinicas.created_at IS 'Data e hora do cadastro';
