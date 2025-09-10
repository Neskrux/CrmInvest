const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Limpar conversas inválidas do WhatsApp
async function cleanupWhatsAppConversas() {
  try {
    console.log('🧹 Iniciando limpeza de conversas WhatsApp...');
    
    // 1. Remover conversas com numero_contato nulo
    const { data: conversasNulas, error: errorNulas } = await supabase
      .from('whatsapp_conversas')
      .delete()
      .is('numero_contato', null);
    
    if (errorNulas) {
      console.error('❌ Erro ao remover conversas com número nulo:', errorNulas);
    } else {
      console.log('✅ Conversas com número nulo removidas');
    }
    
    // 2. Remover mensagens órfãs (sem conversa válida)
    // Primeiro, buscar IDs de conversas válidas
    const { data: conversasValidas } = await supabase
      .from('whatsapp_conversas')
      .select('id');
    
    const idsValidos = conversasValidas?.map(c => c.id) || [];
    
    if (idsValidos.length > 0) {
      const { data: mensagensOrfas, error: errorMensagens } = await supabase
        .from('whatsapp_mensagens')
        .delete()
        .not('conversa_id', 'in', `(${idsValidos.join(',')})`);
      
      if (errorMensagens) {
        console.error('❌ Erro ao remover mensagens órfãs:', errorMensagens);
      } else {
        console.log('✅ Mensagens órfãs removidas');
      }
    } else {
      console.log('ℹ️ Nenhuma conversa válida encontrada, pulando limpeza de mensagens');
    }
    
    // 3. Contar conversas restantes
    const { count: totalConversas } = await supabase
      .from('whatsapp_conversas')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalMensagens } = await supabase
      .from('whatsapp_mensagens')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Limpeza concluída:`);
    console.log(`   - Conversas restantes: ${totalConversas}`);
    console.log(`   - Mensagens restantes: ${totalMensagens}`);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar limpeza se chamado diretamente
if (require.main === module) {
  cleanupWhatsAppConversas();
}

module.exports = cleanupWhatsAppConversas;
