// Fallback simples para quando o WhatsApp Web não estiver disponível
class WhatsAppFallback {
  constructor() {
    this.isConnected = false;
    console.log('WhatsApp Fallback initialized - modo offline');
  }

  async initialize() {
    console.log('WhatsApp Fallback: Modo offline ativado');
    this.isConnected = false;
    return false;
  }

  async sendMessage(number, message) {
    console.log(`WhatsApp Fallback: Mensagem não enviada (modo offline)`);
    console.log(`Para: ${number}`);
    console.log(`Mensagem: ${message}`);
    throw new Error('WhatsApp não está conectado. Por favor, tente novamente mais tarde.');
  }

  async sendMedia(number, media, caption) {
    console.log(`WhatsApp Fallback: Mídia não enviada (modo offline)`);
    console.log(`Para: ${number}`);
    console.log(`Legenda: ${caption}`);
    throw new Error('WhatsApp não está conectado. Por favor, tente novamente mais tarde.');
  }

  async getState() {
    return 'DISCONNECTED';
  }

  async logout() {
    console.log('WhatsApp Fallback: Logout (modo offline)');
    return true;
  }

  async destroy() {
    console.log('WhatsApp Fallback: Destruído (modo offline)');
    return true;
  }

  getQRCode() {
    return null;
  }

  isReady() {
    return false;
  }
}

module.exports = WhatsAppFallback;
