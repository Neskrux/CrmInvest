-- Script para resetar o paciente Richard De Couto como se fosse o primeiro login
-- Use este script antes de testar o fluxo de cadastro completo

-- 1. Criar colunas se não existirem (com verificação)
DO $$
BEGIN
    -- Criar coluna data_nascimento se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'data_nascimento'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN data_nascimento DATE;
        RAISE NOTICE 'Coluna "data_nascimento" criada';
    END IF;
    
    -- Criar coluna comprovante_residencia_url se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'comprovante_residencia_url'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN comprovante_residencia_url VARCHAR(500);
        RAISE NOTICE 'Coluna "comprovante_residencia_url" criada';
    END IF;
    
    -- Criar coluna contrato_servico_url se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'contrato_servico_url'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN contrato_servico_url VARCHAR(500);
        RAISE NOTICE 'Coluna "contrato_servico_url" criada';
    END IF;
END $$;

-- 2. Resetar validação biométrica
UPDATE pacientes 
SET 
    biometria_aprovada = false,
    biometria_aprovada_em = NULL,
    biometria_erro = NULL
WHERE email_login = 'richard.decouto@grupoim.com.br';

-- 3. Limpar campos do cadastro completo (step-by-step)
UPDATE pacientes 
SET 
    cpf = NULL,
    data_nascimento = NULL,
    comprovante_residencia_url = NULL,
    contrato_servico_url = NULL
WHERE email_login = 'richard.decouto@grupoim.com.br';

-- 4. Verificar resultado
SELECT 
    id,
    nome,
    email_login,
    biometria_aprovada,
    biometria_aprovada_em,
    cpf,
    data_nascimento,
    comprovante_residencia_url,
    contrato_servico_url,
    tem_login,
    login_ativo
FROM pacientes 
WHERE email_login = 'richard.decouto@grupoim.com.br';

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '✅ Paciente Richard De Couto resetado para primeiro login!';
    RAISE NOTICE '📋 Campos resetados:';
    RAISE NOTICE '   - Biometria: false';
    RAISE NOTICE '   - CPF: NULL';
    RAISE NOTICE '   - Data de Nascimento: NULL';
    RAISE NOTICE '   - Comprovante de Residência: NULL';
    RAISE NOTICE '   - Contrato de Serviço: NULL';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Login mantido ativo para testes';
END $$;

