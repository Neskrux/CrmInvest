-- Migração 007: Adicionar suporte a respostas de mensagens
-- Adiciona campos para suporte a respostas no WhatsApp

-- Adicionar colunas para suporte a respostas
ALTER TABLE whatsapp_mensagens 
ADD COLUMN IF NOT EXISTS mensagem_pai_id INTEGER REFERENCES whatsapp_mensagens(id),
ADD COLUMN IF NOT EXISTS mensagem_pai_conteudo TEXT,
ADD COLUMN IF NOT EXISTS mensagem_pai_autor TEXT;

-- Índice para performance de consultas de respostas
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_pai ON whatsapp_mensagens(mensagem_pai_id);

-- Comentários para documentação
COMMENT ON COLUMN whatsapp_mensagens.mensagem_pai_id IS 'ID da mensagem que está sendo respondida';
COMMENT ON COLUMN whatsapp_mensagens.mensagem_pai_conteudo IS 'Conteúdo da mensagem original (para exibição)';
COMMENT ON COLUMN whatsapp_mensagens.mensagem_pai_autor IS 'Autor da mensagem original (para exibição)';
