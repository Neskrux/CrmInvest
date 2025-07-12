-- 📁 CRIAR BUCKET DE CONTRATOS NO SUPABASE STORAGE
-- Execute este script no Supabase SQL Editor

-- 1. Criar bucket para contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos', 'contratos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Criar política para permitir upload de contratos (authenticated users)
CREATE POLICY "Authenticated users can upload contracts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contratos' AND
    auth.role() = 'authenticated'
  );

-- 3. Criar política para permitir download de contratos (authenticated users)
CREATE POLICY "Authenticated users can download contracts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contratos' AND
    auth.role() = 'authenticated'
  );

-- 4. Criar política para permitir deletar contratos (authenticated users)
CREATE POLICY "Authenticated users can delete contracts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contratos' AND
    auth.role() = 'authenticated'
  );

-- 5. Verificar se o bucket foi criado
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'contratos';

-- 6. Registrar migração
INSERT INTO schema_migrations (version, description) VALUES
('015', 'Criar bucket de contratos no Supabase Storage')
ON CONFLICT (version) DO NOTHING;

-- 7. Mostrar resultado
SELECT 'BUCKET DE CONTRATOS CRIADO COM SUCESSO!' as status,
       'Bucket ID: contratos' as bucket_info,
       'Público: false' as visibilidade; 