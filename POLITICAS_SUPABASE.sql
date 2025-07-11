-- Políticas corretas para o bucket 'contratos' no Supabase Storage

-- 1. Política para permitir upload via service role
CREATE POLICY "Service role pode fazer upload" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'contratos');

-- 2. Política para permitir download via service role  
CREATE POLICY "Service role pode fazer download" ON storage.objects
FOR SELECT TO service_role
USING (bucket_id = 'contratos');

-- 3. Política para permitir deletar via service role
CREATE POLICY "Service role pode deletar" ON storage.objects
FOR DELETE TO service_role
USING (bucket_id = 'contratos');

-- 4. Política para permitir atualizar via service role
CREATE POLICY "Service role pode atualizar" ON storage.objects
FOR UPDATE TO service_role
USING (bucket_id = 'contratos')
WITH CHECK (bucket_id = 'contratos');

-- IMPORTANTE: Execute essas políticas no SQL Editor do Supabase
-- Vá em: SQL Editor > New Query > Cole o código acima > Run 