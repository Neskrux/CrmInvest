-- Migration: Criar tabela para assinaturas digitais reutilizáveis do admin
-- Esta tabela armazena assinaturas digitais que podem ser reutilizadas para múltiplos documentos

DO $$ 
BEGIN
    -- Criar tabela de assinaturas reutilizáveis
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'assinaturas_admin'
    ) THEN
        CREATE TABLE assinaturas_admin (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            nome_admin VARCHAR(255) NOT NULL,
            documento_admin VARCHAR(50) NOT NULL, -- CPF ou CNPJ
            assinatura_base64 TEXT NOT NULL, -- Assinatura em base64
            assinatura_url VARCHAR(500), -- URL da assinatura salva (opcional)
            ativa BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(usuario_id, ativa) -- Apenas uma assinatura ativa por admin
        );
        
        CREATE INDEX idx_assinaturas_admin_usuario ON assinaturas_admin(usuario_id);
        CREATE INDEX idx_assinaturas_admin_ativa ON assinaturas_admin(ativa);
        
        RAISE NOTICE '✅ Tabela "assinaturas_admin" criada com sucesso';
    ELSE
        RAISE NOTICE 'ℹ️ Tabela "assinaturas_admin" já existe';
    END IF;
END $$;
