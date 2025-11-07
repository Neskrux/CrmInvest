-- Verificar se a assinatura do admin foi salva corretamente
SELECT 
    id,
    usuario_id,
    nome_admin,
    documento_admin,
    ativa,
    created_at,
    LENGTH(assinatura_base64) as tamanho_assinatura,
    SUBSTRING(assinatura_base64, 1, 50) as inicio_assinatura
FROM assinaturas_admin
WHERE usuario_id = 1;

-- Verificar se há alguma assinatura ativa
SELECT 
    id,
    usuario_id,
    nome_admin,
    ativa
FROM assinaturas_admin
WHERE ativa = true;
