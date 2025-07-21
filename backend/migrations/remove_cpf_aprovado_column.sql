-- Migração para remover a coluna cpf_aprovado da tabela pacientes
-- Execute esta migração no Supabase SQL Editor

-- Remover a coluna cpf_aprovado da tabela pacientes
ALTER TABLE pacientes DROP COLUMN IF EXISTS cpf_aprovado;

-- Opcional: Confirmar que a coluna foi removida
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'pacientes'; 