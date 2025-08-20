-- Tabela para armazenar mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  remote_jid TEXT NOT NULL,
  contact_name TEXT,
  contact_number TEXT,
  message TEXT,
  message_type TEXT DEFAULT 'text',
  timestamp TIMESTAMP DEFAULT NOW(),
  is_from_me BOOLEAN DEFAULT FALSE,
  media_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices separadamente para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON whatsapp_messages (remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages (timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_number ON whatsapp_messages (contact_number);

-- Adicionar colunas cidade e estado na tabela pacientes se não existirem
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS estado TEXT;

-- Adicionar consultor_id na tabela pacientes se não existir
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS consultor_id INTEGER REFERENCES consultores(id);

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';
