-- Migração 008: Limpar dados duplicados na tabela pacientes
-- Execute este arquivo ANTES da migração 007 no SQL Editor do Supabase

-- Primeiro, normalizar todos os telefones para apenas números
UPDATE pacientes 
SET telefone = REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')
WHERE telefone IS NOT NULL;

-- Normalizar CPFs para apenas números
UPDATE pacientes 
SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL;

-- Verificar telefones duplicados
SELECT 'TELEFONES DUPLICADOS:' as tipo, telefone, COUNT(*) as total
FROM pacientes 
WHERE telefone IS NOT NULL 
GROUP BY telefone 
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- Verificar CPFs duplicados
SELECT 'CPFS DUPLICADOS:' as tipo, cpf, COUNT(*) as total
FROM pacientes 
WHERE cpf IS NOT NULL 
GROUP BY cpf 
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- Remover registros duplicados mantendo apenas o mais recente
-- Para telefones duplicados
DELETE FROM pacientes 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY telefone ORDER BY created_at DESC) as rn
        FROM pacientes 
        WHERE telefone IS NOT NULL
    ) t 
    WHERE t.rn > 1
);

-- Para CPFs duplicados
DELETE FROM pacientes 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY cpf ORDER BY created_at DESC) as rn
        FROM pacientes 
        WHERE cpf IS NOT NULL
    ) t 
    WHERE t.rn > 1
);

-- Verificar se ainda há duplicados (deve retornar 0 registros)
SELECT 'VERIFICAÇÃO FINAL - TELEFONES:' as tipo, telefone, COUNT(*) as total
FROM pacientes 
WHERE telefone IS NOT NULL 
GROUP BY telefone 
HAVING COUNT(*) > 1;

SELECT 'VERIFICAÇÃO FINAL - CPFS:' as tipo, cpf, COUNT(*) as total
FROM pacientes 
WHERE cpf IS NOT NULL 
GROUP BY cpf 
HAVING COUNT(*) > 1;

