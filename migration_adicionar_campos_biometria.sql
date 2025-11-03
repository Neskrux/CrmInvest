-- ============================================
-- SCRIPT: Adicionar Campos de Validação Biométrica
-- ============================================
-- Este script adiciona campos na tabela pacientes para controlar
-- a validação biométrica no primeiro login
-- ============================================

-- Adicionar campo biometria_aprovada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='biometria_aprovada') THEN
        ALTER TABLE pacientes ADD COLUMN biometria_aprovada BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN pacientes.biometria_aprovada IS 'Indica se a validação biométrica foi aprovada no primeiro login';
        RAISE NOTICE 'Coluna "biometria_aprovada" adicionada à tabela "pacientes".';
    ELSE
        RAISE NOTICE 'Coluna "biometria_aprovada" já existe na tabela "pacientes".';
    END IF;
END $$;

-- Adicionar campo biometria_aprovada_em
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='biometria_aprovada_em') THEN
        ALTER TABLE pacientes ADD COLUMN biometria_aprovada_em TIMESTAMP;
        COMMENT ON COLUMN pacientes.biometria_aprovada_em IS 'Data/hora da aprovação da validação biométrica';
        RAISE NOTICE 'Coluna "biometria_aprovada_em" adicionada à tabela "pacientes".';
    ELSE
        RAISE NOTICE 'Coluna "biometria_aprovada_em" já existe na tabela "pacientes".';
    END IF;
END $$;

-- Adicionar campo biometria_erro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='pacientes' AND column_name='biometria_erro') THEN
        ALTER TABLE pacientes ADD COLUMN biometria_erro TEXT;
        COMMENT ON COLUMN pacientes.biometria_erro IS 'Mensagem de erro da última tentativa de validação biométrica';
        RAISE NOTICE 'Coluna "biometria_erro" adicionada à tabela "pacientes".';
    ELSE
        RAISE NOTICE 'Coluna "biometria_erro" já existe na tabela "pacientes".';
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Verificar se as colunas foram criadas corretamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pacientes'
  AND column_name IN ('biometria_aprovada', 'biometria_aprovada_em', 'biometria_erro')
ORDER BY column_name;

-- ============================================
-- NOTAS
-- ============================================
-- 1. Todos os pacientes existentes terão biometria_aprovada = FALSE por padrão
-- 2. Pacientes novos também terão biometria_aprovada = FALSE até validarem
-- 3. Após validação bem-sucedida, biometria_aprovada será TRUE
-- 4. biometria_erro será preenchido apenas em caso de falha na validação
-- ============================================
