const fs = require('fs');
const path = require('path');

// Limpar sessões antigas do WhatsApp Web
function cleanupWhatsAppSessions() {
  try {
    const sessionPath = path.join(__dirname, '..', '.wwebjs_auth');
    
    if (fs.existsSync(sessionPath)) {
      console.log('🧹 Limpando sessões antigas do WhatsApp Web...');
      
      // Remover diretório de sessão
      fs.rmSync(sessionPath, { recursive: true, force: true });
      
      console.log('✅ Sessões antigas removidas com sucesso!');
    } else {
      console.log('ℹ️ Nenhuma sessão antiga encontrada.');
    }
  } catch (error) {
    console.error('❌ Erro ao limpar sessões:', error.message);
  }
}

// Executar limpeza se chamado diretamente
if (require.main === module) {
  cleanupWhatsAppSessions();
}

module.exports = cleanupWhatsAppSessions;
