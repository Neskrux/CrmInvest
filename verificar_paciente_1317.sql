-- Verificar dados do paciente 1317
SELECT 
    id,
    nome,
    cpf,
    data_nascimento,
    comprovante_residencia_url,
    contrato_servico_url,
    biometria_aprovada,
    created_at
FROM pacientes
WHERE id = 1317;

-- Verificar se tem fechamento
SELECT 
    id,
    paciente_id,
    contrato_arquivo,
    contrato_nome_original,
    created_at
FROM fechamentos
WHERE paciente_id = 1317
ORDER BY created_at DESC
LIMIT 1;

-- Mostrar valores exatos (sem formatação)
SELECT 
    id,
    LENGTH(COALESCE(cpf, '')) as cpf_length,
    cpf as cpf_valor,
    CASE 
        WHEN cpf IS NULL THEN 'NULL'
        WHEN cpf = '' THEN 'VAZIO'
        ELSE 'PREENCHIDO'
    END as cpf_status,
    data_nascimento as data_nascimento_valor,
    CASE 
        WHEN data_nascimento IS NULL THEN 'NULL'
        ELSE 'PREENCHIDO'
    END as data_nascimento_status,
    LENGTH(COALESCE(comprovante_residencia_url, '')) as comprovante_length,
    comprovante_residencia_url as comprovante_valor,
    CASE 
        WHEN comprovante_residencia_url IS NULL THEN 'NULL'
        WHEN comprovante_residencia_url = '' THEN 'VAZIO'
        ELSE 'PREENCHIDO'
    END as comprovante_status
FROM pacientes
WHERE id = 1317;
