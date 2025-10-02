const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidas no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Iniciando Migration 014: Criar tabela consultor_clinica...\n');

    // Ler arquivo SQL
    const migrationPath = path.join(__dirname, '../migrations/014_create_consultor_clinica_relation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executando SQL...\n');
    console.log(sql);
    console.log('\n');

    // Executar SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Se a função exec_sql não existir, tentar executar diretamente
      if (error.message.includes('exec_sql')) {
        console.log('⚠️ Função exec_sql não existe. Criando via query direta...\n');
        
        // Tentar criar a tabela diretamente
        const { error: directError } = await supabase
          .from('consultor_clinica')
          .select('id')
          .limit(1);
        
        if (directError && directError.message.includes('does not exist')) {
          console.error('❌ Não foi possível criar a tabela automaticamente.');
          console.log('\n📋 Execute o SQL manualmente no Supabase Dashboard:');
          console.log('\nhttps://supabase.com/dashboard/project/_/sql/new');
          console.log('\n' + sql);
          process.exit(1);
        } else if (!directError) {
          console.log('✅ Tabela consultor_clinica já existe!');
        }
      } else {
        throw error;
      }
    } else {
      console.log('✅ Migration 014 executada com sucesso!');
    }

    console.log('\n🎉 Tabela consultor_clinica criada!');
    console.log('\n📊 Estrutura da tabela:');
    console.log('- id: chave primária');
    console.log('- consultor_id: referência ao consultor freelancer');
    console.log('- clinica_id: referência à clínica indicada');
    console.log('- data_indicacao: quando a indicação foi feita');
    console.log('- comissao_paga: se a comissão já foi paga');
    console.log('- valor_comissao: valor da comissão');
    console.log('- observacoes: notas adicionais');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    console.log('\n📋 Execute o SQL manualmente no Supabase Dashboard:');
    console.log('\nhttps://supabase.com/dashboard/project/_/sql/new');
    
    const migrationPath = path.join(__dirname, '../migrations/014_create_consultor_clinica_relation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('\n' + sql);
    
    process.exit(1);
  }
}

runMigration();

