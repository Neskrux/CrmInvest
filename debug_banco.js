const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Credenciais do banco atual
const SUPABASE_URL = 'https://idicuetpukxjqripbpwa.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkaWN1ZXRwdWt4anFyaXBicHdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTIwMDczMSwiZXhwIjoyMDcwNzc2NzMxfQ.71IeNihVLi3Uj4Tx9b9-xB2XVqUqBZXimHspudv4Ex4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verificarEstrutura() {
  console.log('🔍 VERIFICANDO ESTRUTURA DO BANCO...');
  console.log('📥 URL:', SUPABASE_URL);
  console.log('');

  const tabelas = ['usuarios', 'clinicas', 'consultores', 'pacientes', 'agendamentos', 'fechamentos'];
  
  for (const tabela of tabelas) {
    try {
      const { data, error, count } = await supabase
        .from(tabela)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tabela}: ${error.message}`);
      } else {
        console.log(`✅ ${tabela}: ${count || 0} registros`);
      }
    } catch (error) {
      console.log(`❌ ${tabela}: Erro geral - ${error.message}`);
    }
  }
}

async function verificarUsuarios() {
  console.log('\n👤 VERIFICANDO USUÁRIOS E CREDENCIAIS...');
  
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*');
    
    if (error) {
      console.log('❌ Erro ao buscar usuários:', error.message);
      return;
    }
    
    if (!usuarios || usuarios.length === 0) {
      console.log('❌ PROBLEMA: Nenhum usuário encontrado na tabela usuarios!');
      console.log('');
      console.log('🔧 SOLUÇÃO: Vou criar o usuário admin padrão...');
      
      // Criar usuário admin
      const senhaHash = await bcrypt.hash('admin123', 10);
      
      const { data: novoUsuario, error: errorInsert } = await supabase
        .from('usuarios')
        .insert([
          {
            nome: 'Administrador',
            email: 'admin@crm.com',
            senha: senhaHash,
            tipo: 'admin',
            ativo: true
          }
        ])
        .select();
      
      if (errorInsert) {
        console.log('❌ Erro ao criar usuário admin:', errorInsert.message);
        return;
      }
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 Email: admin@crm.com');
      console.log('🔑 Senha: admin123');
      return;
    }
    
    console.log(`✅ Encontrados ${usuarios.length} usuários:`);
    
    for (const usuario of usuarios) {
      console.log(`  - ${usuario.nome} (${usuario.email}) - ${usuario.tipo} - ${usuario.ativo ? 'Ativo' : 'Inativo'}`);
      
      // Testar se a senha está hashada corretamente
      if (usuario.email === 'admin@crm.com') {
        try {
          const senhaCorreta = await bcrypt.compare('admin123', usuario.senha);
          console.log(`    🔑 Senha admin123: ${senhaCorreta ? '✅ Válida' : '❌ Inválida'}`);
          
          if (!senhaCorreta) {
            console.log('    🔧 Corrigindo senha do admin...');
            const novaSenhaHash = await bcrypt.hash('admin123', 10);
            
            const { error: updateError } = await supabase
              .from('usuarios')
              .update({ senha: novaSenhaHash })
              .eq('id', usuario.id);
            
            if (updateError) {
              console.log('    ❌ Erro ao corrigir senha:', updateError.message);
            } else {
              console.log('    ✅ Senha do admin corrigida!');
            }
          }
        } catch (error) {
          console.log(`    ❌ Erro ao verificar senha: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Erro geral ao verificar usuários:', error.message);
  }
}

async function verificarStorage() {
  console.log('\n📁 VERIFICANDO STORAGE...');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Erro ao listar buckets:', error.message);
      return;
    }
    
    console.log(`✅ Encontrados ${buckets.length} buckets:`);
    
    for (const bucket of buckets) {
      console.log(`  - ${bucket.name} (${bucket.public ? 'Público' : 'Privado'})`);
      
      // Verificar arquivos no bucket
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket.name)
        .list();
      
      if (filesError) {
        console.log(`    ❌ Erro ao listar arquivos: ${filesError.message}`);
      } else {
        console.log(`    📄 ${files.length} arquivos`);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro geral no Storage:', error.message);
  }
}

async function testarLogin() {
  console.log('\n🔐 TESTANDO LOGIN...');
  
  const email = 'admin@crm.com';
  const senha = 'admin123';
  
  console.log(`📧 Testando: ${email} / ${senha}`);
  
  try {
    // Buscar usuário
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('ativo', true);
    
    if (error) {
      console.log('❌ Erro ao buscar usuário:', error.message);
      return;
    }
    
    if (!usuarios || usuarios.length === 0) {
      console.log('❌ Usuário não encontrado ou inativo');
      return;
    }
    
    const usuario = usuarios[0];
    console.log('✅ Usuário encontrado:', usuario.nome);
    
    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    
    if (senhaValida) {
      console.log('✅ SENHA CORRETA! Login deve funcionar.');
    } else {
      console.log('❌ SENHA INCORRETA! Problema na hash da senha.');
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de login:', error.message);
  }
}

async function main() {
  console.log('🚀 DIAGNÓSTICO COMPLETO DO BANCO DE DADOS');
  console.log('==========================================');
  
  await verificarEstrutura();
  await verificarUsuarios();
  await verificarStorage();
  await testarLogin();
  
  console.log('\n📊 DIAGNÓSTICO CONCLUÍDO!');
  console.log('==========================================');
}

main().catch(console.error);
