require('dotenv').config();
const axios = require('axios');

/**
 * Serviço para integração com Z-API - Envio de mensagens WhatsApp
 * 
 * Responsável por:
 * - Enviar mensagens de texto via WhatsApp
 * - Formatar mensagens de boletos
 */

class ZApiService {
  constructor() {
    // Configurações da Z-API
    this.ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || '3EA1639B5B0B1232D93E6EB14D89919B';
    this.ZAPI_TOKEN = process.env.ZAPI_TOKEN || '9523E7ADA86EB32A2CF9C074';
    // Client-Token pode ser diferente do token da URL
    this.ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || this.ZAPI_TOKEN;
    this.ZAPI_BASE_URL = `https://api.z-api.io/instances/${this.ZAPI_INSTANCE_ID}/token/${this.ZAPI_TOKEN}`;
  }

  /**
   * Verificar status da instância Z-API
   * @returns {Promise<Object>} Status da instância
   */
  async verificarStatusInstancia() {
    try {
      const url = `${this.ZAPI_BASE_URL.replace('/send-text', '')}/status`;
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.ZAPI_CLIENT_TOKEN && this.ZAPI_CLIENT_TOKEN !== this.ZAPI_TOKEN 
            ? this.ZAPI_CLIENT_TOKEN 
            : this.ZAPI_TOKEN
        },
        timeout: 10000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [Z-API] Erro ao verificar status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Erro ao verificar status'
      };
    }
  }

  /**
   * Enviar mensagem de texto via WhatsApp
   * @param {string} phone - Número do telefone (formato: 5511999999999)
   * @param {string} message - Mensagem a ser enviada
   * @returns {Promise<Object>} Resposta da API
   */
  async enviarMensagemTexto(phone, message) {
    try {
      // Validar telefone
      if (!phone) {
        throw new Error('Telefone é obrigatório');
      }

      // Remover caracteres não numéricos e garantir formato correto
      const phoneClean = phone.replace(/\D/g, '');
      
      // Se não começar com 55 (código do Brasil), adicionar
      const phoneFormatted = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;

      if (phoneFormatted.length < 12 || phoneFormatted.length > 13) {
        throw new Error('Telefone inválido. Deve ter entre 12 e 13 dígitos (incluindo código do país)');
      }

      // Validar mensagem
      if (!message || message.trim().length === 0) {
        throw new Error('Mensagem é obrigatória');
      }

      const url = `${this.ZAPI_BASE_URL}/send-text`;
      
      const payload = {
        phone: phoneFormatted,
        message: message.trim()
      };

      console.log('📤 [Z-API] Enviando mensagem:', {
        phone: phoneFormatted,
        messageLength: message.length,
        url: url.replace(this.ZAPI_TOKEN, '***'),
        clientTokenConfigured: !!this.ZAPI_CLIENT_TOKEN,
        clientTokenLength: this.ZAPI_CLIENT_TOKEN?.length || 0
      });

      // Configurar headers - Tentar primeiro sem Client-Token
      // Algumas versões da Z-API não precisam do Client-Token quando o token está na URL
      let headers = {
        'Content-Type': 'application/json'
      };
      
      // Tentar com Client-Token apenas se ZAPI_CLIENT_TOKEN estiver configurado e for diferente
      // Se o erro for "not allowed", significa que precisa configurar no painel da Z-API
      if (this.ZAPI_CLIENT_TOKEN && this.ZAPI_CLIENT_TOKEN !== this.ZAPI_TOKEN) {
        headers['Client-Token'] = this.ZAPI_CLIENT_TOKEN;
        console.log('📤 [Z-API] Usando Client-Token separado');
      } else {
        console.log('📤 [Z-API] Tentando sem Client-Token (token já está na URL)');
      }

      const response = await axios.post(url, payload, {
        headers: headers,
        timeout: 30000
      });

      console.log('✅ [Z-API] Mensagem enviada com sucesso:', response.data);

      // IMPORTANTE: A API pode retornar sucesso mesmo que a mensagem não seja entregue
      // Isso acontece quando a instância não está conectada ao WhatsApp
      // Verificar se há informações sobre o status de entrega
      const zaapId = response.data?.zaapId || response.data?.id;
      const messageId = response.data?.messageId || response.data?.id;
      
      if (zaapId || messageId) {
        console.log('⚠️ [Z-API] Mensagem aceita pela API. Verifique se a instância está conectada ao WhatsApp.');
        console.log('📋 [Z-API] ZaapId:', zaapId);
        console.log('📋 [Z-API] MessageId:', messageId);
      }

      return {
        success: true,
        data: response.data,
        message: 'Mensagem enviada com sucesso',
        zaapId: zaapId,
        messageId: messageId,
        warning: 'A mensagem foi aceita pela API. Verifique se a instância está conectada ao WhatsApp no painel da Z-API.'
      };

    } catch (error) {
      console.error('❌ [Z-API] Erro ao enviar mensagem:', error.response?.data || error.message);
      
      // Extrair mensagem de erro mais específica
      let errorMessage = 'Erro ao enviar mensagem';
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        details: error.response?.data || null
      };
    }
  }

  /**
   * Formatar mensagem de boleto para envio
   * @param {Object} boleto - Dados do boleto
   * @param {Object} paciente - Dados do paciente
   * @returns {string} Mensagem formatada
   */
  formatarMensagemBoleto(boleto, paciente) {
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(boleto.valor || 0);

    const dataVencimento = boleto.data_vencimento 
      ? new Date(boleto.data_vencimento).toLocaleDateString('pt-BR')
      : 'Não informado';

    const nossoNumero = boleto.nosso_numero || 'N/A';
    const linhaDigitavel = boleto.linha_digitavel || 'N/A';

    const mensagem = `🔔 *Lembrete de Pagamento*

Olá, ${paciente?.nome || 'Cliente'}!

Você possui um boleto pendente de pagamento:

📋 *Detalhes do Boleto:*
• Valor: ${valorFormatado}
• Vencimento: ${dataVencimento}
• Nosso Número: ${nossoNumero}

💳 *Linha Digitável:*
${linhaDigitavel}

⚠️ *Importante:* Por favor, efetue o pagamento até a data de vencimento para evitar juros e multa.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe InvestMoney`;

    return mensagem;
  }

  /**
   * Enviar mensagem de boleto para paciente
   * @param {Object} boleto - Dados do boleto
   * @param {Object} paciente - Dados do paciente (deve conter telefone)
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarMensagemBoleto(boleto, paciente) {
    try {
      if (!paciente?.telefone) {
        throw new Error('Telefone do paciente não encontrado');
      }

      const mensagem = this.formatarMensagemBoleto(boleto, paciente);
      const resultado = await this.enviarMensagemTexto(paciente.telefone, mensagem);

      return resultado;
    } catch (error) {
      console.error('❌ [Z-API] Erro ao enviar mensagem de boleto:', error);
      return {
        success: false,
        error: error.message || 'Erro ao enviar mensagem de boleto'
      };
    }
  }
}

module.exports = new ZApiService();

