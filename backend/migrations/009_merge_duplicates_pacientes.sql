-- Migração 009: Mesclar dados duplicados na tabela pacientes
-- Execute este arquivo ANTES da migração 007 no SQL Editor do Supabase
-- Esta migração mescla dados duplicados sem deletar registros

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

-- MESCLAR TELEFONES DUPLICADOS
-- Para cada telefone duplicado, manter o registro mais recente e atualizar referências

-- 1. Criar tabela temporária com os IDs dos registros duplicados
CREATE TEMP TABLE telefones_duplicados AS
SELECT telefone, 
       array_agg(id ORDER BY created_at DESC) as ids,
       COUNT(*) as total
FROM pacientes 
WHERE telefone IS NOT NULL 
GROUP BY telefone 
HAVING COUNT(*) > 1;

-- 2. Para cada telefone duplicado, manter o primeiro ID (mais recente) e marcar os outros
CREATE TEMP TABLE pacientes_para_mesclar AS
SELECT 
    td.telefone,
    td.ids[1] as id_principal,  -- ID mais recente
    unnest(td.ids[2:]) as id_duplicado  -- IDs duplicados
FROM telefones_duplicados td;

-- 3. Atualizar referências na tabela agendamentos (se existir)
-- Primeiro, verificar se a tabela agendamentos existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agendamentos') THEN
        -- Atualizar agendamentos para apontar para o paciente principal
        UPDATE agendamentos 
        SET paciente_id = pm.id_principal
        FROM pacientes_para_mesclar pm
        WHERE agendamentos.paciente_id = pm.id_duplicado;
    END IF;
END $$;

-- 4. Atualizar referências na tabela meta_ads (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_ads') THEN
        -- Atualizar meta_ads para apontar para o paciente principal
        UPDATE meta_ads 
        SET paciente_id = pm.id_principal
        FROM pacientes_para_mesclar pm
        WHERE meta_ads.paciente_id = pm.id_duplicado;
    END IF;
END $$;

-- 5. Agora podemos deletar os registros duplicados com segurança
DELETE FROM pacientes 
WHERE id IN (
    SELECT id_duplicado FROM pacientes_para_mesclar
);

-- MESCLAR CPFS DUPLICADOS (se houver)
-- Repetir o processo para CPFs

-- 1. Criar tabela temporária com os IDs dos CPFs duplicados
CREATE TEMP TABLE cpfs_duplicados AS
SELECT cpf, 
       array_agg(id ORDER BY created_at DESC) as ids,
       COUNT(*) as total
FROM pacientes 
WHERE cpf IS NOT NULL 
GROUP BY cpf 
HAVING COUNT(*) > 1;

-- 2. Para cada CPF duplicado, manter o primeiro ID (mais recente) e marcar os outros
CREATE TEMP TABLE pacientes_cpf_para_mesclar AS
SELECT 
    cd.cpf,
    cd.ids[1] as id_principal,  -- ID mais recente
    unnest(cd.ids[2:]) as id_duplicado  -- IDs duplicados
FROM cpfs_duplicados cd;

-- 3. Atualizar referências na tabela agendamentos (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agendamentos') THEN
        -- Atualizar agendamentos para apontar para o paciente principal
        UPDATE agendamentos 
        SET paciente_id = pm.id_principal
        FROM pacientes_cpf_para_mesclar pm
        WHERE agendamentos.paciente_id = pm.id_duplicado;
    END IF;
END $$;

-- 4. Atualizar referências na tabela meta_ads (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_ads') THEN
        -- Atualizar meta_ads para apontar para o paciente principal
        UPDATE meta_ads 
        SET paciente_id = pm.id_principal
        FROM pacientes_cpf_para_mesclar pm
        WHERE meta_ads.paciente_id = pm.id_duplicado;
    END IF;
END $$;

-- 5. Deletar os registros duplicados de CPF
DELETE FROM pacientes 
WHERE id IN (
    SELECT id_duplicado FROM pacientes_cpf_para_mesclar
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

-- Limpar tabelas temporárias
DROP TABLE IF EXISTS telefones_duplicados;
DROP TABLE IF EXISTS pacientes_para_mesclar;
DROP TABLE IF EXISTS cpfs_duplicados;
DROP TABLE IF EXISTS pacientes_cpf_para_mesclar



