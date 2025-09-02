-- Criar tabela para armazenar dados de autenticação do WhatsApp
-- Execute este script no SQL Editor do Supabase
-- A tabela whatsapp_messages já existe, criando apenas whatsapp_auth

CREATE TABLE IF NOT EXISTS whatsapp_auth (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_auth_key ON whatsapp_auth(key);

-- Adicionar RLS (Row Level Security) 
ALTER TABLE whatsapp_auth ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (necessário para o service_key funcionar)
CREATE POLICY "Allow all operations on whatsapp_auth" ON whatsapp_auth
FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE whatsapp_auth IS 'Tabela para armazenar dados de autenticação do WhatsApp em ambientes serverless';
COMMENT ON COLUMN whatsapp_auth.key IS 'Chave do arquivo de autenticação (ex: creds.json, app-state-sync-version.json)';
COMMENT ON COLUMN whatsapp_auth.data IS 'Dados de autenticação em formato JSON';

-- Verificar se a tabela foi criada corretamente
SELECT 'Tabela whatsapp_auth criada com sucesso!' as status;
