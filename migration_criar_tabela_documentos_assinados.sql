-- Migration: Criar tabela documentos_assinados
-- Execute este script no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS documentos_assinados (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  assinante VARCHAR(255) NOT NULL,
  documento VARCHAR(20) NOT NULL,
  hash_sha1 VARCHAR(40) NOT NULL UNIQUE,
  chave_validacao VARCHAR(50) NOT NULL UNIQUE,
  data_assinatura TIMESTAMP NOT NULL DEFAULT NOW(),
  usuario_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chave_validacao ON documentos_assinados(chave_validacao);
CREATE INDEX IF NOT EXISTS idx_hash_sha1 ON documentos_assinados(hash_sha1);

-- Comentários das colunas
COMMENT ON TABLE documentos_assinados IS 'Armazena informações sobre documentos assinados digitalmente';
COMMENT ON COLUMN documentos_assinados.hash_sha1 IS 'Hash SHA1 único do documento assinado';
COMMENT ON COLUMN documentos_assinados.chave_validacao IS 'Chave única para validação pública do documento';
COMMENT ON COLUMN documentos_assinados.usuario_id IS 'ID do usuário que assinou o documento (opcional)';

