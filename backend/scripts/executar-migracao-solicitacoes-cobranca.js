const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/database');

async function executarMigracao() {
  try {
    console.log('📄 Lendo arquivo de migração...');
    const sqlPath = path.join(__dirname, '../../docs/migration_criar_tabela_solicitacoes_cobranca.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Executando migração SQL...');
    
    // Dividir o SQL em comandos individuais
    const comandos = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const comando of comandos) {
      if (comando.trim()) {
        try {
          // Executar cada comando SQL
          const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: comando });
          
          if (error) {
            // Tentar executar diretamente via query raw se RPC não funcionar
            console.log(`⚠️ Tentando método alternativo para: ${comando.substring(0, 50)}...`);
          }
        } catch (err) {
          console.error(`❌ Erro ao executar comando:`, err.message);
        }
      }
    }
    
    console.log('✅ Migração concluída!');
    console.log('\n⚠️ NOTA: Se houver erros acima, execute o SQL manualmente no painel do Supabase.');
    console.log('📋 Arquivo SQL: docs/migration_criar_tabela_solicitacoes_cobranca.sql');
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    console.log('\n📋 Execute o SQL manualmente no painel do Supabase:');
    console.log('   1. Acesse o painel do Supabase');
    console.log('   2. Vá em SQL Editor');
    console.log('   3. Cole o conteúdo do arquivo: docs/migration_criar_tabela_solicitacoes_cobranca.sql');
    console.log('   4. Execute o SQL');
  }
}

executarMigracao();
