-- Migration 016: Adicionar colunas de status de aprovação dos documentos
-- Permite que o admin aprove/reprove documentos enviados pelas clínicas

ALTER TABLE clinicas 
ADD COLUMN IF NOT EXISTS doc_cartao_cnpj_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_contrato_social_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_alvara_sanitario_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_balanco_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_comprovante_endereco_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_dados_bancarios_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_socios_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_certidao_resp_tecnico_aprovado BOOLEAN,
ADD COLUMN IF NOT EXISTS doc_resp_tecnico_aprovado BOOLEAN;

-- Comentários para documentação
COMMENT ON COLUMN clinicas.doc_cartao_cnpj_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_contrato_social_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_alvara_sanitario_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_balanco_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_comprovante_endereco_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_dados_bancarios_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_socios_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_certidao_resp_tecnico_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';
COMMENT ON COLUMN clinicas.doc_resp_tecnico_aprovado IS 'Status de aprovação: null=em análise, true=aprovado, false=reprovado';

