-- Adicionar campo cidade na tabela pacientes
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS cidade TEXT;

-- Criar índice para melhorar performance nas consultas por cidade
CREATE INDEX IF NOT EXISTS idx_pacientes_cidade ON pacientes(cidade); 