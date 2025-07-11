// Script de teste para verificar configuração do upload
require('dotenv').config();

console.log('=== TESTE DE CONFIGURAÇÃO DO UPLOAD ===\n');

// 1. Verificar variáveis de ambiente
console.log('1. VARIÁVEIS DE AMBIENTE:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurada' : '❌ NÃO configurada');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Configurada' : '❌ NÃO configurada');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Configurada' : '❌ NÃO configurada');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurada' : '❌ NÃO configurada');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// 2. Testar conexão com Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (supabaseUrl && supabaseServiceKey) {
  console.log('\n2. TESTE DE CONEXÃO COM SUPABASE:');
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Testar listagem de buckets
  supabaseAdmin.storage
    .listBuckets()
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Erro ao listar buckets:', error.message);
      } else {
        console.log('✅ Buckets encontrados:', data.map(b => b.name).join(', '));
      }
    });
  
  // Testar bucket contratos
  supabaseAdmin.storage
    .from('contratos')
    .list()
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Erro ao acessar bucket contratos:', error.message);
      } else {
        console.log('✅ Bucket contratos acessível. Arquivos:', data.length);
      }
    });
} else {
  console.log('\n❌ NÃO É POSSÍVEL TESTAR SUPABASE - VARIÁVEIS NÃO CONFIGURADAS');
}

console.log('\n3. INSTRUÇÕES:');
console.log('- Configure todas as variáveis no arquivo .env');
console.log('- No Vercel, adicione SUPABASE_SERVICE_KEY com a chave service_role do Supabase');
console.log('- Certifique-se de que o bucket "contratos" existe no Supabase Storage');
console.log('- Configure as políticas do bucket para permitir acesso via service_role'); 