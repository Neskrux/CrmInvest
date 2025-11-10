-- Migration: Adicionar campo para armazenar o hash SHA1 inicial do contrato
-- Este hash será gerado quando o contrato for enviado pela primeira vez e permanecerá o mesmo

DO $$ 
BEGIN
    -- Adicionar coluna para armazenar o hash SHA1 do contrato original
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fechamentos' 
        AND column_name = 'contrato_hash_sha1'
    ) THEN
        ALTER TABLE fechamentos 
        ADD COLUMN contrato_hash_sha1 VARCHAR(40);
        
        COMMENT ON COLUMN fechamentos.contrato_hash_sha1 IS 'Hash SHA1 do contrato original (gerado no primeiro upload)';
    END IF;
    
    -- Adicionar coluna para rastrear quando o hash foi gerado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fechamentos' 
        AND column_name = 'contrato_hash_criado_em'
    ) THEN
        ALTER TABLE fechamentos 
        ADD COLUMN contrato_hash_criado_em TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN fechamentos.contrato_hash_criado_em IS 'Data/hora em que o hash do contrato foi gerado';
    END IF;
    
    -- Criar índice para busca rápida por hash
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'fechamentos' 
        AND indexname = 'idx_fechamentos_contrato_hash'
    ) THEN
        CREATE INDEX idx_fechamentos_contrato_hash ON fechamentos(contrato_hash_sha1);
    END IF;
    
END $$;

-- Adicionar comentário explicativo
COMMENT ON TABLE fechamentos IS 'Tabela de fechamentos com rastreabilidade de contratos por hash SHA1';
