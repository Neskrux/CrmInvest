-- ================================================
-- CÓDIGO SQL PARA CONFIGURAR O SUPABASE STORAGE
-- ================================================
-- Execute este código no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query
-- ================================================

-- 1. Criar o bucket se não existir (via interface é melhor, mas aqui está o SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinicas-documentos',
  'clinicas-documentos', 
  true,
  52428800, -- 50MB (para suportar vídeos)
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/webm', 'video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Criar política para permitir leitura pública
CREATE POLICY "Permitir leitura pública de documentos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'clinicas-documentos');

-- 3. Criar política para permitir upload autenticado (via service key)
CREATE POLICY "Permitir upload via service key" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'clinicas-documentos');

-- 4. Criar política para permitir update autenticado
CREATE POLICY "Permitir update via service key" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'clinicas-documentos')
WITH CHECK (bucket_id = 'clinicas-documentos');

-- 5. Criar política para permitir delete autenticado
CREATE POLICY "Permitir delete via service key" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'clinicas-documentos');

-- ================================================
-- INSTRUÇÕES ALTERNATIVAS VIA INTERFACE
-- ================================================
-- Se preferir fazer via interface do Supabase:
-- 
-- 1. Acesse: Storage > New Bucket
--    - Nome: clinicas-documentos
--    - Public: ✓ (marcado)
--    - File size limit: 50MB
--    - Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/jpeg, image/jpg, image/png, video/mp4, video/avi, video/quicktime, video/x-ms-wmv, video/webm, video/x-matroska
--
-- 2. Após criar, clique no bucket > Policies
--    - New Policy > For full customization
--    - Policy name: Public Read
--    - Allowed operation: SELECT
--    - Target roles: anon, authenticated
--    - WITH CHECK expression: true
--    - USING expression: true
--
-- 3. Clique em Save
-- ================================================
