-- Verificar status de freelancers no banco de dados
-- Este script identifica usuários que podem estar com configurações incorretas

-- 1. Verificar todos os consultores e seu status de freelancer
SELECT
    id,
    nome,
    tipo,
    is_freelancer,
    email,
    CASE
        WHEN tipo = 'consultor' AND is_freelancer = true THEN '✅ Freelancer Correto'
        WHEN tipo = 'consultor' AND is_freelancer = false THEN '❌ Consultor sem freelancer'
        WHEN tipo = 'admin' AND is_freelancer = true THEN '🚨 ADMIN COM FREELANCER (PROBLEMA!)'
        WHEN tipo = 'admin' AND is_freelancer = false THEN '✅ Admin sem freelancer'
        WHEN tipo = 'empresa' AND is_freelancer = true THEN '⚠️ Empresa com freelancer'
        ELSE '❓ Outros casos'
    END as status_analise
FROM consultores
ORDER BY tipo, is_freelancer;

-- 2. Verificar se há usuários na tabela 'usuarios' também
SELECT
    'TABELA USUARIOS' as tabela,
    id,
    nome,
    email,
    tipo,
    CASE
        WHEN tipo = 'admin' THEN 'Admin'
        WHEN tipo = 'consultor' THEN 'Consultor'
        WHEN tipo = 'empresa' THEN 'Empresa'
        ELSE tipo
    END as tipo_formatado
FROM usuarios
WHERE tipo IN ('admin', 'consultor', 'empresa')
ORDER BY tipo;

-- 3. Contagem por tipo e status
SELECT
    tipo,
    is_freelancer,
    COUNT(*) as quantidade,
    GROUP_CONCAT(nome) as usuarios
FROM consultores
GROUP BY tipo, is_freelancer
ORDER BY tipo, is_freelancer;
