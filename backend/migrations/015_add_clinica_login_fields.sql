-- Migration 015: Adicionar campos de login para clínicas
-- Permite que clínicas tenham acesso ao sistema com login próprio

-- Adicionar campos de autenticação na tabela clinicas
ALTER TABLE clinicas 
ADD COLUMN IF NOT EXISTS email_login VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP,
ADD COLUMN IF NOT EXISTS ativo_no_sistema BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS criado_por_admin_id INTEGER REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS data_criacao_acesso TIMESTAMP;

-- Criar índice para melhorar performance de login
CREATE INDEX IF NOT EXISTS idx_clinicas_email_login ON clinicas(email_login);
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo_sistema ON clinicas(ativo_no_sistema);

-- Adicionar campo na tabela usuarios para referenciar clínica
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_usuarios_clinica ON usuarios(clinica_id);

-- Comentários para documentação
COMMENT ON COLUMN clinicas.email_login IS 'Email usado para login da clínica no sistema';
COMMENT ON COLUMN clinicas.senha_hash IS 'Senha criptografada para acesso ao sistema';
COMMENT ON COLUMN clinicas.ultimo_acesso IS 'Data/hora do último acesso da clínica ao sistema';
COMMENT ON COLUMN clinicas.ativo_no_sistema IS 'Se a clínica tem acesso ativo ao sistema';
COMMENT ON COLUMN clinicas.criado_por_admin_id IS 'ID do admin que criou o acesso para a clínica';
COMMENT ON COLUMN clinicas.data_criacao_acesso IS 'Data/hora em que o acesso foi criado';
COMMENT ON COLUMN usuarios.clinica_id IS 'Referência à clínica (para usuários tipo clinica)';
