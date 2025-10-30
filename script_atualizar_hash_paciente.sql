-- Script para atualizar o hash da senha do paciente de teste
-- Use este script se o hash atual não estiver funcionando
-- 
-- IMPORTANTE: Execute primeiro o script Node.js para gerar um novo hash:
-- cd backend
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('123456', 10).then(hash => console.log('Hash:', hash));"
--
-- Depois copie o hash gerado e substitua 'SEU_HASH_AQUI' abaixo

-- Atualizar hash da senha do paciente de teste
UPDATE pacientes 
SET 
  senha_hash = 'SEU_HASH_AQUI',  -- Cole o hash gerado aqui
  tem_login = true,
  login_ativo = true
WHERE email_login = 'paciente.teste@email.com';

-- Verificar se foi atualizado
SELECT 
  id,
  nome,
  email_login,
  tem_login,
  login_ativo,
  LENGTH(senha_hash) as hash_length
FROM pacientes 
WHERE email_login = 'paciente.teste@email.com';

