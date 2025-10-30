-- Adicionar campos de login para pacientes na tabela pacientes
-- Execute este script no banco de dados Supabase/PostgreSQL

-- 1. Adicionar campo email_login (VARCHAR, UNIQUE, nullable)
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS email_login VARCHAR(255) UNIQUE;

-- 2. Adicionar campo senha_hash (VARCHAR, nullable)
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);

-- 3. Adicionar campo tem_login (BOOLEAN, default false)
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS tem_login BOOLEAN DEFAULT false;

-- 4. Adicionar campo login_ativo (BOOLEAN, default false)
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS login_ativo BOOLEAN DEFAULT false;

-- 5. Adicionar campo ultimo_login (TIMESTAMP, nullable)
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;

-- 6. Criar índice para busca rápida por email_login (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_pacientes_email_login ON pacientes(email_login);

-- 7. Criar índice para busca rápida por pacientes com login ativo (opcional)
CREATE INDEX IF NOT EXISTS idx_pacientes_login_ativo ON pacientes(login_ativo) WHERE login_ativo = true;

-- Verificar se os campos foram criados corretamente
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'pacientes' 
-- AND column_name IN ('email_login', 'senha_hash', 'tem_login', 'login_ativo', 'ultimo_login')
-- ORDER BY column_name;

