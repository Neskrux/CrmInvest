-- 🔐 CRIAR TABELA DE USUÁRIOS ADMIN E USUÁRIO PADRÃO
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela de usuários admin
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  tipo TEXT DEFAULT 'admin',
  ativo BOOLEAN DEFAULT TRUE,
  consultor_id INTEGER REFERENCES consultores(id),
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);

-- 3. Inserir usuário admin padrão
-- Senha: admin123 (hash bcrypt)
INSERT INTO usuarios (nome, email, senha, tipo, ativo) VALUES
('Administrador', 'admin@investmoneysa.com.br', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true)
ON CONFLICT (email) DO UPDATE SET
  senha = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  ativo = true;

-- 4. Comentários explicativos
COMMENT ON TABLE usuarios IS 'Tabela de usuários administradores do sistema';
COMMENT ON COLUMN usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN usuarios.email IS 'Email do usuário para login';
COMMENT ON COLUMN usuarios.senha IS 'Hash da senha do usuário';
COMMENT ON COLUMN usuarios.tipo IS 'Tipo do usuário (admin)';
COMMENT ON COLUMN usuarios.ativo IS 'Se o usuário está ativo no sistema';
COMMENT ON COLUMN usuarios.consultor_id IS 'ID do consultor associado (se aplicável)';
COMMENT ON COLUMN usuarios.ultimo_login IS 'Data e hora do último login';

-- 5. Verificar se o usuário foi criado
SELECT id, nome, email, tipo, ativo, created_at 
FROM usuarios 
WHERE email = 'admin@investmoneysa.com.br';

-- 6. Configurar RLS (Row Level Security) se necessário
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 7. Criar política de acesso (opcional)
-- CREATE POLICY "Usuários podem ver apenas seus próprios dados" ON usuarios
--   FOR SELECT USING (auth.uid() = id::text);

-- 8. Registrar migração
INSERT INTO schema_migrations (version, description) VALUES
('014', 'Criar tabela de usuários admin e usuário padrão')
ON CONFLICT (version) DO NOTHING;

-- 9. Mostrar resultado
SELECT 'USUÁRIO ADMIN CRIADO COM SUCESSO!' as status,
       'Email: admin@investmoneysa.com.br' as login,
       'Senha: admin123' as senha_padrao; 