-- ============================================
-- ATUALIZAR HASH DA SENHA DO PACIENTE DE TESTE
-- ============================================
-- Use este script se o login não estiver funcionando
-- 
-- Hash gerado em: 2025-10-30
-- Senha: 123456
-- Hash completo (60 caracteres): $2b$10$/dWalrm4hHvE9DFd7.PXaeKpAtnRxuVWAdT3BNqgNSFn65fI5DSMi
--
-- ⚠️ PROBLEMA DETECTADO: Hash estava com apenas 13 caracteres (truncado)
-- Este script corrige o hash para o valor completo

-- Verificar hash atual antes de atualizar
SELECT 
  id,
  nome,
  email_login,
  LENGTH(senha_hash) as hash_length_atual,
  senha_hash as hash_atual,
  tem_login,
  login_ativo
FROM pacientes 
WHERE email_login = 'paciente.teste@email.com';

-- Atualizar hash da senha com o valor completo
UPDATE pacientes 
SET 
  senha_hash = '$2b$10$/dWalrm4hHvE9DFd7.PXaeKpAtnRxuVWAdT3BNqgNSFn65fI5DSMi',
  tem_login = true,
  login_ativo = true
WHERE email_login = 'paciente.teste@email.com';

-- Verificar se foi atualizado corretamente (deve mostrar 60 caracteres)
SELECT 
  id,
  nome,
  email_login,
  tem_login,
  login_ativo,
  LENGTH(senha_hash) as hash_length,
  LEFT(senha_hash, 20) as hash_preview_inicio,
  RIGHT(senha_hash, 20) as hash_preview_fim
FROM pacientes 
WHERE email_login = 'paciente.teste@email.com';

-- ============================================
-- CREDENCIAIS DE TESTE
-- ============================================
-- Email: paciente.teste@email.com
-- Senha: 123456
-- 
-- ⚠️ IMPORTANTE: Se o hash_length ainda mostrar menos de 60 caracteres,
-- verifique se o campo senha_hash está definido como VARCHAR(255) ou maior
-- Execute: ALTER TABLE pacientes ALTER COLUMN senha_hash TYPE VARCHAR(255);
-- ============================================

