// Sistema de fallback para WhatsApp quando não funciona no Fly.io
const { createClient } = require('@supabase/supabase-js');

class WhatsAppFallback {
  constructor() {
    this.isAvailable = false;
    this.reason = 'WhatsApp Web não disponível no Fly.io';
  }

  // Simular conexão para não quebrar o frontend
  async connect() {
    console.log('⚠️ WhatsApp Web não disponível no Fly.io');
    console.log('💡 Use a API do WhatsApp Business ou webhook externo');
    
    // Salvar status no banco
    await this.updateStatus('unavailable', this.reason);
    
    return {
      success: false,
      message: 'WhatsApp Web não disponível no Fly.io. Use a API do WhatsApp Business.',
      alternative: 'Configure webhook externo ou use WhatsApp Business API'
    };
  }

  // Simular desconexão
  async disconnect() {
    console.log('⚠️ WhatsApp Web não estava conectado');
    return { success: true, message: 'WhatsApp Web não estava conectado' };
  }

  // Simular envio de mensagem
  async sendMessage(phone, message) {
    console.log(`⚠️ WhatsApp Web não disponível. Mensagem para ${phone}: ${message}`);
    return {
      success: false,
      message: 'WhatsApp Web não disponível no Fly.io',
      alternative: 'Use a API do WhatsApp Business'
    };
  }

  // Atualizar status no banco
  async updateStatus(status, reason) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      await supabase
        .from('whatsapp_configuracoes')
        .upsert({
          instancia_id: 'whatsapp_web',
          status_conexao: status,
          qr_code: null,
          ativo: false,
          motivo_erro: reason,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }

  // Verificar se está disponível
  isWhatsAppAvailable() {
    return this.isAvailable;
  }

  // Verificar se cliente está funcional (compatibilidade)
  async isClientFunctional() {
    return false;
  }

  // Obter status
  getStatus() {
    return {
      connected: false,
      isConnected: false,
      status: 'unavailable',
      qrCode: null,
      reason: this.reason,
      alternative: 'Use WhatsApp Business API ou webhook externo'
    };
  }
}

module.exports = WhatsAppFallback;
