-- Migração 006: Sistema de Integração WhatsApp
-- Cria tabelas para integração com WhatsApp Business API

-- Tabela de configurações do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_configuracoes (
  id SERIAL PRIMARY KEY,
  instancia_id TEXT UNIQUE NOT NULL,
  token_acesso TEXT NOT NULL,
  webhook_url TEXT,
  webhook_verify_token TEXT,
  numero_telefone TEXT NOT NULL,
  nome_empresa TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de conversas WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversas (
  id SERIAL PRIMARY KEY,
  configuracao_id INTEGER REFERENCES whatsapp_configuracoes(id),
  numero_contato TEXT NOT NULL,
  nome_contato TEXT,
  ultima_mensagem_at TIMESTAMP,
  status TEXT DEFAULT 'ativa', -- ativa, arquivada, bloqueada
  paciente_id INTEGER REFERENCES pacientes(id), -- Link opcional com paciente existente
  consultor_id INTEGER REFERENCES consultores(id), -- Consultor responsável
  tags TEXT[], -- Tags para categorização
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(configuracao_id, numero_contato)
);

-- Tabela de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id SERIAL PRIMARY KEY,
  conversa_id INTEGER REFERENCES whatsapp_conversas(id),
  mensagem_id TEXT UNIQUE NOT NULL, -- ID da mensagem no WhatsApp
  tipo TEXT NOT NULL, -- text, image, audio, video, document, location, etc.
  conteudo TEXT, -- Conteúdo da mensagem
  midia_url TEXT, -- URL da mídia se aplicável
  midia_tipo TEXT, -- Tipo da mídia
  midia_nome TEXT, -- Nome do arquivo
  direcao TEXT NOT NULL, -- inbound (recebida) ou outbound (enviada)
  status TEXT DEFAULT 'enviada', -- enviada, entregue, lida, falhou
  timestamp_whatsapp TIMESTAMP NOT NULL, -- Timestamp da mensagem no WhatsApp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de automações WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_automatizacoes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  trigger_tipo TEXT NOT NULL, -- mensagem_recebida, palavra_chave, horario, status_paciente
  trigger_config JSONB, -- Configuração específica do trigger
  acao_tipo TEXT NOT NULL, -- enviar_mensagem, criar_lead, atualizar_status
  acao_config JSONB, -- Configuração específica da ação
  ativo BOOLEAN DEFAULT TRUE,
  prioridade INTEGER DEFAULT 0, -- Prioridade de execução
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de logs de automações
CREATE TABLE IF NOT EXISTS whatsapp_automatizacao_logs (
  id SERIAL PRIMARY KEY,
  automatizacao_id INTEGER REFERENCES whatsapp_automatizacoes(id),
  conversa_id INTEGER REFERENCES whatsapp_conversas(id),
  mensagem_id INTEGER REFERENCES whatsapp_mensagens(id),
  status TEXT NOT NULL, -- sucesso, erro, ignorado
  resultado TEXT, -- Resultado da execução
  erro_detalhes TEXT, -- Detalhes do erro se houver
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_numero ON whatsapp_conversas(numero_contato);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_paciente ON whatsapp_conversas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_conversa ON whatsapp_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_timestamp ON whatsapp_mensagens(timestamp_whatsapp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_automatizacoes_ativo ON whatsapp_automatizacoes(ativo);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_whatsapp_configuracoes_updated_at 
    BEFORE UPDATE ON whatsapp_configuracoes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversas_updated_at 
    BEFORE UPDATE ON whatsapp_conversas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_automatizacoes_updated_at 
    BEFORE UPDATE ON whatsapp_automatizacoes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão (será atualizada via API)
INSERT INTO whatsapp_configuracoes (instancia_id, token_acesso, numero_telefone, nome_empresa)
VALUES ('default', 'seu_token_aqui', '5511999999999', 'CRM System')
ON CONFLICT (instancia_id) DO NOTHING;

-- Inserir algumas automações padrão (DESATIVADAS por padrão)
INSERT INTO whatsapp_automatizacoes (nome, descricao, trigger_tipo, trigger_config, acao_tipo, acao_config, prioridade, ativo) VALUES
('Boas-vindas', 'Mensagem automática de boas-vindas para novos contatos', 'mensagem_recebida', 
 '{"primeira_mensagem": true}', 'enviar_mensagem', 
 '{"mensagem": "Olá! Bem-vindo(a) ao nosso atendimento. Como posso ajudá-lo(a) hoje?"}', 1, false),

('Palavra-chave Agendamento', 'Detecta interesse em agendamento', 'palavra_chave', 
 '{"palavras": ["agendar", "consulta", "marcar", "horário"]}', 'enviar_mensagem', 
 '{"mensagem": "Perfeito! Vou te ajudar com o agendamento. Qual tipo de tratamento você tem interesse?"}', 2, false),

('Criar Lead Automático', 'Cria lead automaticamente para novos contatos', 'mensagem_recebida', 
 '{"primeira_mensagem": true}', 'criar_lead', 
 '{"tipo_tratamento": "Estético", "status": "lead", "observacoes": "Lead criado automaticamente via WhatsApp"}', 3, false);
