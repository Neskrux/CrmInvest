-- Script para adicionar colunas de armazenamento das fotos da validação biométrica
-- Selfie e Documento (RG) serão salvos no Supabase Storage e as URLs no banco

DO $$
BEGIN
    -- Adicionar coluna selfie_biometrica_url se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'selfie_biometrica_url'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN selfie_biometrica_url VARCHAR(500);
        COMMENT ON COLUMN pacientes.selfie_biometrica_url IS 'URL da selfie capturada durante a validação biométrica (armazenada no Supabase Storage)';
        RAISE NOTICE '✅ Coluna "selfie_biometrica_url" criada na tabela "pacientes"';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna "selfie_biometrica_url" já existe na tabela "pacientes"';
    END IF;
    
    -- Adicionar coluna documento_biometrica_url se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'documento_biometrica_url'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN documento_biometrica_url VARCHAR(500);
        COMMENT ON COLUMN pacientes.documento_biometrica_url IS 'URL da foto do documento (RG) capturada durante a validação biométrica (armazenada no Supabase Storage)';
        RAISE NOTICE '✅ Coluna "documento_biometrica_url" criada na tabela "pacientes"';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna "documento_biometrica_url" já existe na tabela "pacientes"';
    END IF;
    
    -- Verificar se comprovante_residencia_url existe (caso não tenha sido criada antes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pacientes' AND column_name = 'comprovante_residencia_url'
    ) THEN
        ALTER TABLE pacientes ADD COLUMN comprovante_residencia_url VARCHAR(500);
        COMMENT ON COLUMN pacientes.comprovante_residencia_url IS 'URL do comprovante de residência do paciente (armazenado no Supabase Storage)';
        RAISE NOTICE '✅ Coluna "comprovante_residencia_url" criada na tabela "pacientes"';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna "comprovante_residencia_url" já existe na tabela "pacientes"';
    END IF;
END $$;

-- Verificar estrutura das colunas criadas
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pacientes' 
AND column_name IN (
    'selfie_biometrica_url', 
    'documento_biometrica_url', 
    'comprovante_residencia_url',
    'biometria_aprovada',
    'biometria_aprovada_em'
)
ORDER BY column_name;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migração concluída!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Colunas criadas/verificadas:';
    RAISE NOTICE '   - selfie_biometrica_url: URL da selfie da validação biométrica';
    RAISE NOTICE '   - documento_biometrica_url: URL da foto do RG da validação biométrica';
    RAISE NOTICE '   - comprovante_residencia_url: URL do comprovante de residência';
    RAISE NOTICE '';
    RAISE NOTICE '💾 Todas as fotos serão armazenadas no Supabase Storage (bucket: documentos)';
    RAISE NOTICE '   Estrutura: documentos/pacientes/{paciente_id}/{tipo}_{timestamp}.jpg';
END $$;

