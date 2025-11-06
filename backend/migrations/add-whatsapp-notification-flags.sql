-- Migration: Adicionar flags de notificação WhatsApp na tabela pacientes
-- Data: 2025-11-04
-- Descrição: Adiciona colunas para controlar duplicidade de envio de notificações

-- Adicionar colunas de timestamp para rastrear quando cada tipo de notificação foi enviada
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS notificado_3_dias TIMESTAMP,
ADD COLUMN IF NOT EXISTS notificado_1_dia TIMESTAMP,
ADD COLUMN IF NOT EXISTS notificado_hoje TIMESTAMP;

-- Índices para melhor performance nas queries que buscam pacientes não notificados
-- Esses índices aceleram a busca por pacientes com vencimento específico que ainda não foram notificados
CREATE INDEX IF NOT EXISTS idx_pacientes_vencimento_3_dias 
ON pacientes(vencimento) WHERE notificado_3_dias IS NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_vencimento_1_dia 
ON pacientes(vencimento) WHERE notificado_1_dia IS NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_vencimento_hoje 
ON pacientes(vencimento) WHERE notificado_hoje IS NULL;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN pacientes.notificado_3_dias IS 'Data/hora da última notificação de boleto vencendo em 3 dias';
COMMENT ON COLUMN pacientes.notificado_1_dia IS 'Data/hora da última notificação de boleto vencendo em 1 dia';
COMMENT ON COLUMN pacientes.notificado_hoje IS 'Data/hora da última notificação de boleto vencendo hoje';

