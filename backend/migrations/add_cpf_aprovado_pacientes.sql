-- Migração para adicionar campo cpf_aprovado na tabela pacientes
-- Data: 2025-01-28
-- Descrição: Adiciona campo booleano cpf_aprovado para controlar se o CPF do paciente foi aprovado

-- Adicionar campo cpf_aprovado (BOOLEAN com default FALSE)
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS cpf_aprovado BOOLEAN DEFAULT FALSE;

-- Comentário na coluna para documentação
COMMENT ON COLUMN pacientes.cpf_aprovado IS 'Indica se o CPF do paciente foi aprovado (TRUE) ou não (FALSE). Default: FALSE';

-- Criar um índice para melhorar performance em consultas por cpf_aprovado
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf_aprovado ON pacientes(cpf_aprovado);

-- Log da migração
INSERT INTO migrations_log (migration_name, applied_at, description) 
VALUES ('add_cpf_aprovado_pacientes', NOW(), 'Adicionar campo cpf_aprovado na tabela pacientes')
ON CONFLICT (migration_name) DO NOTHING; 