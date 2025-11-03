-- Script para resetar a validação biométrica do paciente Richard Decouto Pinheiro
-- Isso forçará ele a passar pela validação biométrica novamente no próximo login

-- Visualizar o status atual do Richard
SELECT 
    id,
    nome,
    cpf,
    email_login,
    tem_login,
    login_ativo,
    biometria_aprovada,
    biometria_aprovada_em,
    biometria_erro
FROM pacientes 
WHERE id = 1229 OR nome LIKE '%Richard Decouto%';

-- Resetar a validação biométrica
UPDATE pacientes 
SET 
    biometria_aprovada = false,
    biometria_aprovada_em = NULL,
    biometria_erro = NULL
WHERE id = 1229;

-- Confirmar a alteração
SELECT 
    id,
    nome,
    biometria_aprovada,
    biometria_aprovada_em,
    biometria_erro
FROM pacientes 
WHERE id = 1229;

-- Opcional: Se quiser resetar TODOS os pacientes para teste
-- UPDATE pacientes 
-- SET 
--     biometria_aprovada = false,
--     biometria_aprovada_em = NULL,
--     biometria_erro = NULL
-- WHERE tem_login = true;
