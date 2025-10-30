-- ============================================
-- SCRIPT PARA CRIAR PACIENTE DE TESTE COM LOGIN
-- ============================================
-- Execute este script APÓS executar a migration de adicionar campos de login
-- 
-- ⚠️ IMPORTANTE: Ajuste os valores abaixo conforme seu ambiente:
-- - empresa_id: ID da empresa (provavelmente 3 para testes)
-- - clinica_id: ID de uma clínica existente no seu sistema
-- - email_login: Email único para o paciente
-- 
-- Credenciais de teste:
-- Email: paciente.teste@email.com
-- Senha: 123456
-- ============================================

-- Inserir paciente de teste com login
INSERT INTO pacientes (
  nome,
  telefone,
  cpf,
  email,
  tipo_tratamento,
  status,
  cidade,
  estado,
  empresa_id,
  clinica_id,
  cadastrado_por_clinica,
  -- Campos de login
  email_login,
  senha_hash,
  tem_login,
  login_ativo,
  created_at
) VALUES (
  'Paciente Teste',                              -- nome
  '11999999999',                                 -- telefone (apenas números)
  '12345678901',                                 -- cpf (apenas números)
  'paciente.teste@email.com',                    -- email
  'odontologico',                                -- tipo_tratamento
  'fechado',                                     -- status (paciente aprovado)
  'São Paulo',                                   -- cidade
  'SP',                                          -- estado
  3,                                             -- empresa_id (AJUSTE conforme necessário)
  (SELECT id FROM clinicas LIMIT 1),             -- clinica_id (pega a primeira clínica disponível)
  true,                                          -- cadastrado_por_clinica
  -- Campos de login
  'paciente.teste@email.com',                    -- email_login (deve ser único)
  '$2b$10$/dWalrm4hHvE9DFd7.PXaeKpAtnRxuVWAdT3BNqgNSFn65fI5DSMi', -- senha_hash (senha: 123456) - Hash atualizado
  true,                                          -- tem_login
  true,                                          -- login_ativo
  NOW()                                          -- created_at
) ON CONFLICT (email_login) DO UPDATE 
SET 
  nome = EXCLUDED.nome,
  telefone = EXCLUDED.telefone,
  senha_hash = EXCLUDED.senha_hash,
  tem_login = EXCLUDED.tem_login,
  login_ativo = EXCLUDED.login_ativo
RETURNING id, nome, email_login, tem_login, login_ativo;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Verifique se o paciente foi criado:
SELECT 
  id,
  nome,
  email_login,
  tem_login,
  login_ativo,
  empresa_id,
  clinica_id,
  status
FROM pacientes 
WHERE email_login = 'paciente.teste@email.com';

-- ============================================
-- CREDENCIAIS DE TESTE
-- ============================================
-- Email: paciente.teste@email.com
-- Senha: 123456
-- 
-- ⚠️ IMPORTANTE: Este é um paciente de TESTE
-- Altere a senha e email antes de usar em produção!
-- ============================================

