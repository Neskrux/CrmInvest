const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const STORAGE_BUCKET = 'clinicas-documentos';

async function setupStorage() {
  try {
    console.log('🚀 Configurando Supabase Storage...');
    
    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      return;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${STORAGE_BUCKET}' já existe`);
    } else {
      console.log(`📦 Criando bucket '${STORAGE_BUCKET}'...`);
      
      // Criar o bucket
      const { data, error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: true, // Permitir acesso público aos arquivos
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/jpg',
          'image/png'
        ],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (error) {
        console.error('❌ Erro ao criar bucket:', error);
        return;
      }
      
      console.log('✅ Bucket criado com sucesso:', data);
    }
    
    // Configurar políticas de acesso (se necessário)
    console.log('🔐 Configurando políticas de acesso...');
    
    // Política para permitir leitura pública
    const { error: policyError } = await supabaseAdmin.rpc('create_storage_policy', {
      bucket_name: STORAGE_BUCKET,
      policy_name: 'Public read access',
      policy_definition: 'true',
      policy_check: 'true',
      policy_roles: 'public'
    });
    
    if (policyError) {
      console.log('⚠️ Aviso: Não foi possível configurar política automaticamente:', policyError.message);
      console.log('📝 Configure manualmente no painel do Supabase:');
      console.log(`   - Bucket: ${STORAGE_BUCKET}`);
      console.log('   - Política: Permitir leitura pública');
    } else {
      console.log('✅ Políticas de acesso configuradas');
    }
    
    console.log('🎉 Configuração do Supabase Storage concluída!');
    console.log(`📁 Bucket: ${STORAGE_BUCKET}`);
    console.log('🌐 URLs públicas: Habilitadas');
    console.log('📄 Tipos permitidos: PDF, DOC, DOCX, JPG, JPEG, PNG');
    console.log('📏 Tamanho máximo: 10MB');
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error);
  }
}

setupStorage();
