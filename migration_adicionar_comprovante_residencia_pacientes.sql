-- Script para garantir que a coluna comprovante_residencia_url existe na tabela pacientes

DO $$
BEGIN
    -- Verificar e criar coluna comprovante_residencia_url se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'comprovante_residencia_url'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN comprovante_residencia_url VARCHAR(500);
        COMMENT ON COLUMN pacientes.comprovante_residencia_url IS 'URL do comprovante de residência do paciente';
        RAISE NOTICE '✅ Coluna "comprovante_residencia_url" criada na tabela "pacientes"';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna "comprovante_residencia_url" já existe na tabela "pacientes"';
    END IF;
END $$;

-- Verificar estrutura
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pacientes' 
AND column_name IN ('comprovante_residencia_url', 'data_nascimento', 'contrato_servico_url')
ORDER BY column_name;


