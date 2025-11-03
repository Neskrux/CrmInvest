-- Migration Simples: Adicionar campos de endereço na tabela pacientes
-- Execute este script no banco de dados para adicionar os campos de endereço

-- Adicionar coluna 'endereco' (rua/logradouro)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS endereco VARCHAR(255);

-- Adicionar coluna 'bairro'
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);

-- Adicionar coluna 'numero'
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS numero VARCHAR(20);

-- Adicionar coluna 'cep'
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS cep VARCHAR(8);

-- Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pacientes' 
AND column_name IN ('endereco', 'bairro', 'numero', 'cep')
ORDER BY column_name;

