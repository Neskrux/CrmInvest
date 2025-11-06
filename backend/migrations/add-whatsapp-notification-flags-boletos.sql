-- Migration: Adicionar flags de notificação WhatsApp na tabela boletos_caixa
-- Data: 2025-11-04
-- Descrição: Adiciona colunas para controlar duplicidade de envio de notificações por boleto
-- IMPORTANTE: Flags são por BOLETO, não por paciente (um paciente pode ter múltiplos boletos)

-- Adicionar colunas de timestamp para rastrear quando cada tipo de notificação foi enviada
ALTER TABLE boletos_caixa 
ADD COLUMN IF NOT EXISTS notificado_3_dias TIMESTAMP,
ADD COLUMN IF NOT EXISTS notificado_1_dia TIMESTAMP,
ADD COLUMN IF NOT EXISTS notificado_hoje TIMESTAMP;

-- Índices para melhor performance nas queries que buscam boletos não notificados
-- Filtram apenas boletos em aberto (não pagos)
CREATE INDEX IF NOT EXISTS idx_boletos_caixa_vencimento_3_dias 
ON boletos_caixa(data_vencimento) WHERE notificado_3_dias IS NULL AND situacao = 'EM ABERTO';

CREATE INDEX IF NOT EXISTS idx_boletos_caixa_vencimento_1_dia 
ON boletos_caixa(data_vencimento) WHERE notificado_1_dia IS NULL AND situacao = 'EM ABERTO';

CREATE INDEX IF NOT EXISTS idx_boletos_caixa_vencimento_hoje 
ON boletos_caixa(data_vencimento) WHERE notificado_hoje IS NULL AND situacao = 'EM ABERTO';

-- Comentários nas colunas para documentação
COMMENT ON COLUMN boletos_caixa.notificado_3_dias IS 'Data/hora da última notificação de boleto vencendo em 3 dias';
COMMENT ON COLUMN boletos_caixa.notificado_1_dia IS 'Data/hora da última notificação de boleto vencendo em 1 dia';
COMMENT ON COLUMN boletos_caixa.notificado_hoje IS 'Data/hora da última notificação de boleto vencendo hoje';

