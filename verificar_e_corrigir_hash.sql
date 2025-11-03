-- ============================================
-- VERIFICAR E CORRIGIR TAMANHO DO CAMPO senha_hash
-- ============================================
-- Execute este script se o hash ainda estiver sendo truncado

-- Verificar tamanho atual do campo
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pacientes' 
AND column_name = 'senha_hash';

-- Se o campo não for VARCHAR(255) ou maior, alterar para VARCHAR(255)
-- (Descomente a linha abaixo se necessário)
-- ALTER TABLE pacientes ALTER COLUMN senha_hash TYPE VARCHAR(255);

-- ============================================
-- ATUALIZAR HASH COMPLETO
-- ============================================
UPDATE pacientes 
SET 
  senha_hash = '$2b$10$/dWalrm4hHvE9DFd7.PXaeKpAtnRxuVWAdT3BNqgNSFn65fI5DSMi',
  tem_login = true,
  login_ativo = true
WHERE email_login = 'paciente.teste@email.com';

-- Verificar resultado
SELECT 
  id,
  nome,
  email_login,
  LENGTH(senha_hash) as hash_length,
  LEFT(senha_hash, 10) || '...' || RIGHT(senha_hash, 10) as hash_preview
FROM pacientes 
WHERE email_login = 'paciente.teste@email.com';

