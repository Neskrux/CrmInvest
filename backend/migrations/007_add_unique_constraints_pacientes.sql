-- Migração 007: Adicionar constraints únicos na tabela pacientes
-- Execute este arquivo no SQL Editor do Supabase

-- Adicionar constraint único para telefone (apenas números)
-- Primeiro, normalizar todos os telefones existentes para apenas números
UPDATE pacientes 
SET telefone = REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')
WHERE telefone IS NOT NULL;

-- Remover constraints existentes se houver (para evitar erro)
DO $$ 
BEGIN
    -- Remover constraint de telefone se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pacientes_telefone_unique' 
        AND table_name = 'pacientes'
    ) THEN
        ALTER TABLE pacientes DROP CONSTRAINT pacientes_telefone_unique;
    END IF;
    
    -- Remover constraint de CPF se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pacientes_cpf_unique' 
        AND table_name = 'pacientes'
    ) THEN
        ALTER TABLE pacientes DROP CONSTRAINT pacientes_cpf_unique;
    END IF;
END $$;

-- Adicionar constraint único para telefone
ALTER TABLE pacientes ADD CONSTRAINT pacientes_telefone_unique UNIQUE (telefone);

-- Adicionar constraint único para CPF
ALTER TABLE pacientes ADD CONSTRAINT pacientes_cpf_unique UNIQUE (cpf);

-- Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_pacientes_telefone_unique ON pacientes(telefone);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf_unique ON pacientes(cpf);

-- Verificar se há duplicatas antes de aplicar as constraints
-- (Execute estas queries separadamente para verificar)

-- Verificar telefones duplicados:
-- SELECT telefone, COUNT(*) as total
-- FROM pacientes 
-- WHERE telefone IS NOT NULL 
-- GROUP BY telefone 
-- HAVING COUNT(*) > 1;

-- Verificar CPFs duplicados:
-- SELECT cpf, COUNT(*) as total
-- FROM pacientes 
-- WHERE cpf IS NOT NULL 
-- GROUP BY cpf 
-- HAVING COUNT(*) > 1;
