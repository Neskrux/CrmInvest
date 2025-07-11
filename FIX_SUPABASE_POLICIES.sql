-- EXECUTE ESTE SQL NO SUPABASE AGORA!

-- 1. Desabilitar RLS temporariamente para criar as políticas
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- 2. Deletar políticas antigas se existirem
DROP POLICY IF EXISTS "service_role_upload" ON storage.objects;
DROP POLICY IF EXISTS "service_role_select" ON storage.objects;
DROP POLICY IF EXISTS "service_role_delete" ON storage.objects;
DROP POLICY IF EXISTS "Service role pode fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role pode fazer download" ON storage.objects;
DROP POLICY IF EXISTS "Service role pode deletar" ON storage.objects;

-- 3. Habilitar RLS novamente
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Criar política que permite TUDO para service_role
CREATE POLICY "Allow service role full access" ON storage.objects
FOR ALL 
TO service_role
USING (bucket_id = 'contratos')
WITH CHECK (bucket_id = 'contratos');

-- 5. Verificar se o bucket existe e está configurado corretamente
UPDATE storage.buckets 
SET public = false 
WHERE id = 'contratos';

-- 6. Se o bucket não existir, criar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contratos', 'contratos', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING; 