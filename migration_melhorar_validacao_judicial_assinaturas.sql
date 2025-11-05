-- ============================================
-- MIGRATION: Melhorar Validação Judicial de Assinaturas Digitais
-- ============================================
-- Este script adiciona campos adicionais na tabela documentos_assinados
-- para melhorar a validade jurídica e rastreabilidade das assinaturas
-- ============================================

-- Adicionar campo timestamp_confiavel (TSA - Timestamp Confiável)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='timestamp_confiavel') THEN
        ALTER TABLE documentos_assinados ADD COLUMN timestamp_confiavel TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN documentos_assinados.timestamp_confiavel IS 'Timestamp certificado por TSA (Time Stamping Authority) para validação temporal confiável';
        RAISE NOTICE 'Coluna "timestamp_confiavel" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "timestamp_confiavel" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo ip_assinatura (IP do signatário)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='ip_assinatura') THEN
        ALTER TABLE documentos_assinados ADD COLUMN ip_assinatura VARCHAR(45);
        COMMENT ON COLUMN documentos_assinados.ip_assinatura IS 'Endereço IP do signatário no momento da assinatura';
        RAISE NOTICE 'Coluna "ip_assinatura" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "ip_assinatura" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo dispositivo_info (Informações do dispositivo)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='dispositivo_info') THEN
        ALTER TABLE documentos_assinados ADD COLUMN dispositivo_info JSONB;
        COMMENT ON COLUMN documentos_assinados.dispositivo_info IS 'Informações do dispositivo usado para assinar (user-agent, sistema operacional, navegador, etc.)';
        RAISE NOTICE 'Coluna "dispositivo_info" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "dispositivo_info" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo hash_anterior (Hash do documento antes da assinatura)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='hash_anterior') THEN
        ALTER TABLE documentos_assinados ADD COLUMN hash_anterior VARCHAR(40);
        COMMENT ON COLUMN documentos_assinados.hash_anterior IS 'Hash SHA1 do documento original antes da assinatura (para comparação)';
        RAISE NOTICE 'Coluna "hash_anterior" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "hash_anterior" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo auditoria_log (Log completo de eventos)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='auditoria_log') THEN
        ALTER TABLE documentos_assinados ADD COLUMN auditoria_log JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN documentos_assinados.auditoria_log IS 'Log completo de eventos relacionados ao documento (criação, validações, downloads, etc.)';
        RAISE NOTICE 'Coluna "auditoria_log" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "auditoria_log" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo certificado_digital_id (ID do certificado digital ICP-Brasil)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='certificado_digital_id') THEN
        ALTER TABLE documentos_assinados ADD COLUMN certificado_digital_id VARCHAR(255);
        COMMENT ON COLUMN documentos_assinados.certificado_digital_id IS 'ID do certificado digital ICP-Brasil usado para assinar (se aplicável)';
        RAISE NOTICE 'Coluna "certificado_digital_id" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "certificado_digital_id" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo tsa_token (Token do Timestamp Confiável)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='tsa_token') THEN
        ALTER TABLE documentos_assinados ADD COLUMN tsa_token TEXT;
        COMMENT ON COLUMN documentos_assinados.tsa_token IS 'Token do serviço TSA (Time Stamping Authority) que certifica o timestamp da assinatura';
        RAISE NOTICE 'Coluna "tsa_token" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "tsa_token" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo validade_juridica (Nível de validade jurídica)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='validade_juridica') THEN
        ALTER TABLE documentos_assinados ADD COLUMN validade_juridica VARCHAR(20) DEFAULT 'simples';
        COMMENT ON COLUMN documentos_assinados.validade_juridica IS 'Nível de validade jurídica: simples, avancada, icp_brasil';
        RAISE NOTICE 'Coluna "validade_juridica" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "validade_juridica" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo integridade_verificada (Última verificação de integridade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='integridade_verificada') THEN
        ALTER TABLE documentos_assinados ADD COLUMN integridade_verificada TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN documentos_assinados.integridade_verificada IS 'Data/hora da última verificação de integridade do documento';
        RAISE NOTICE 'Coluna "integridade_verificada" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "integridade_verificada" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Adicionar campo integridade_status (Status da integridade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documentos_assinados' AND column_name='integridade_status') THEN
        ALTER TABLE documentos_assinados ADD COLUMN integridade_status VARCHAR(20) DEFAULT 'nao_verificado';
        COMMENT ON COLUMN documentos_assinados.integridade_status IS 'Status da integridade: nao_verificado, integro, alterado';
        RAISE NOTICE 'Coluna "integridade_status" adicionada à tabela "documentos_assinados".';
    ELSE
        RAISE NOTICE 'Coluna "integridade_status" já existe na tabela "documentos_assinados".';
    END IF;
END $$;

-- Criar índices para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_documentos_assinados_timestamp_confiavel 
ON documentos_assinados(timestamp_confiavel);

CREATE INDEX IF NOT EXISTS idx_documentos_assinados_certificado_digital_id 
ON documentos_assinados(certificado_digital_id);

CREATE INDEX IF NOT EXISTS idx_documentos_assinados_validade_juridica 
ON documentos_assinados(validade_juridica);

CREATE INDEX IF NOT EXISTS idx_documentos_assinados_integridade_status 
ON documentos_assinados(integridade_status);

-- Comentários finais
COMMENT ON TABLE documentos_assinados IS 'Armazena informações sobre documentos assinados digitalmente com campos para validação judicial robusta';

