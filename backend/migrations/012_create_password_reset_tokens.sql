-- Criar tabela para tokens de redefinição de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Comentários
COMMENT ON TABLE password_reset_tokens IS 'Tabela para armazenar tokens de redefinição de senha';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'ID do usuário que solicitou a redefinição';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token único para redefinição de senha';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Data e hora de expiração do token';
COMMENT ON COLUMN password_reset_tokens.used IS 'Indica se o token já foi utilizado';
