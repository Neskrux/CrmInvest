-- ================================================
-- ATUALIZAÇÃO PARA CLÍNICAS CADASTRAREM PACIENTES
-- ================================================
-- Execute este código no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query
-- ================================================

-- Adicionar campo para identificar pacientes cadastrados pela clínica
ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS cadastrado_por_clinica BOOLEAN DEFAULT false;

-- Adicionar comentário explicativo
COMMENT ON COLUMN pacientes.cadastrado_por_clinica IS 'Indica se o paciente foi cadastrado diretamente pela clínica (true) ou pelo sistema normal (false)';

-- ================================================
-- IMPORTANTE: Este campo permite que as clínicas
-- cadastrem seus próprios pacientes e façam upload
-- de documentos através da interface do sistema
-- ================================================
