-- Migração 006: Adicionar campos cidade e estado na tabela pacientes
-- Execute este arquivo no SQL Editor do Supabase

-- Adicionar campos na tabela pacientes
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pacientes_cidade ON pacientes(cidade);
CREATE INDEX IF NOT EXISTS idx_pacientes_estado ON pacientes(estado);
CREATE INDEX IF NOT EXISTS idx_pacientes_cidade_estado ON pacientes(cidade, estado);

