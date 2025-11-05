-- ============================================
-- VERIFICAÇÃO: Estrutura da tabela documentos_assinados
-- ============================================
-- Execute este script para verificar se todos os campos foram criados corretamente

-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'documentos_assinados'
) AS tabela_existe;

-- Listar todos os campos da tabela
SELECT 
    column_name AS "Nome do Campo",
    data_type AS "Tipo de Dados",
    is_nullable AS "Permite NULL",
    column_default AS "Valor Padrão"
FROM information_schema.columns 
WHERE table_name = 'documentos_assinados'
ORDER BY ordinal_position;

-- Verificar campos específicos de rastreabilidade
SELECT 
    column_name AS "Campo",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'documentos_assinados' 
            AND column_name = 'ip_assinatura'
        ) THEN '✅ Existe'
        ELSE '❌ Não existe'
    END AS status
FROM (
    VALUES 
        ('ip_assinatura'),
        ('dispositivo_info'),
        ('hash_anterior'),
        ('auditoria_log'),
        ('integridade_status'),
        ('integridade_verificada'),
        ('validade_juridica')
) AS campos(campo)
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos_assinados' 
    AND column_name = campo
);

-- Contar total de campos
SELECT COUNT(*) AS "Total de Campos" 
FROM information_schema.columns 
WHERE table_name = 'documentos_assinados';

-- Verificar índices criados
SELECT 
    indexname AS "Nome do Índice",
    indexdef AS "Definição"
FROM pg_indexes 
WHERE tablename = 'documentos_assinados'
ORDER BY indexname;

