require('dotenv').config();
const axios = require('axios');

/**
 * Serviço para integração com API Caixa - Gestão de Boletos
 * 
 * Responsável por:
 * - Autenticação OAuth2 (obter e gerenciar token)
 * - Criar boletos na Caixa
 * - Consultar boletos na Caixa
 * - Atualizar status de boletos
 */

class CaixaBoletoService {
  constructor() {
    // Configurações da API Caixa (Sandbox)
    this.CAIXA_API_KEY = process.env.CAIXA_API_KEY || null; // Sem valor padrão - deve vir do .env
    this.CAIXA_CLIENT_ID = process.env.CAIXA_CLIENT_ID || 'cli-ext-41267440000197-1';
    this.CAIXA_CLIENT_SECRET = process.env.CAIXA_CLIENT_SECRET || '90b11321-8363-477d-bf16-8ccf1963916d';
    
    // URLs (Sandbox) - Suporta ambos os nomes de variável
    this.CAIXA_TOKEN_URL = process.env.CAIXA_TOKEN_URL || 'https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token';
    this.CAIXA_API_BASE_URL = process.env.CAIXA_API_BASE_URL || process.env.CAIXA_BASE_URL || 'https://api.caixa.gov.br:8443/cobranca-bancaria';
    
    // Debug: Log da API Key carregada (apenas primeiros e últimos caracteres)
    const apiKeyPartial = this.CAIXA_API_KEY ? `${this.CAIXA_API_KEY.substring(0, 5)}...${this.CAIXA_API_KEY.substring(this.CAIXA_API_KEY.length - 5)}` : 'NÃO CONFIGURADA';
    console.log(`🔑 CAIXA_API_KEY carregada: ${apiKeyPartial}`);
    
    // Cache de token (com reutilização)
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // ID do beneficiário (configurável por empresa_id)
    // Pode ser fornecido como "0374/1242669" (agência/código) ou apenas "1242669" (código)
    // A API usa apenas o código numérico (parte após a barra)
    const beneficiarioRaw = process.env.CAIXA_ID_BENEFICIARIO || null;
    if (beneficiarioRaw) {
      // Se tem barra, pegar apenas a parte após a barra (código do beneficiário)
      this.ID_BENEFICIARIO = beneficiarioRaw.includes('/') 
        ? beneficiarioRaw.split('/')[1].trim() 
        : beneficiarioRaw.trim();
    } else {
      this.ID_BENEFICIARIO = null;
    }
    
    // Rate limiting
    this.lastTokenRequest = null;
    this.MIN_TOKEN_REQUEST_INTERVAL = 60000; // 1 minuto (limite da Caixa)
  }

  /**
   * Obter token de acesso OAuth2 (com cache e reutilização)
   */
  async getAccessToken() {
    try {
      // Verificar se temos um token válido
      if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 60000) {
        // Token ainda válido (com margem de 1 minuto)
        return this.accessToken;
      }

      // Verificar rate limit (1 request por minuto)
      if (this.lastTokenRequest && Date.now() - this.lastTokenRequest < this.MIN_TOKEN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_TOKEN_REQUEST_INTERVAL - (Date.now() - this.lastTokenRequest);
        console.log(`⏳ Aguardando ${Math.ceil(waitTime / 1000)}s para respeitar rate limit da Caixa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      console.log('🔐 Obtendo token de acesso da Caixa...');

      const response = await axios.post(
        this.CAIXA_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.CAIXA_CLIENT_ID,
          client_secret: this.CAIXA_CLIENT_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Calcular expiração (padrão: 3600 segundos, menos 60 segundos de margem)
        const expiresIn = (response.data.expires_in || 3600) - 60;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
        
        console.log('✅ Token obtido com sucesso. Expira em:', expiresIn, 'segundos');
        this.lastTokenRequest = Date.now();
        
        return this.accessToken;
      } else {
        throw new Error('Token não retornado na resposta');
      }
    } catch (error) {
      console.error('❌ Erro ao obter token da Caixa:', error.response?.data || error.message);
      throw new Error(`Erro ao autenticar na API Caixa: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Fazer requisição autenticada para API Caixa
   */
  async makeAuthenticatedRequest(method, endpoint, data = null) {
    try {
      const token = await this.getAccessToken();
      
      if (!this.CAIXA_API_KEY) {
        throw new Error('CAIXA_API_KEY não configurada. Configure no arquivo .env');
      }
      
      const config = {
        method,
        url: `${this.CAIXA_API_BASE_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-api-key': this.CAIXA_API_KEY  // Formato padrão em minúsculas
        },
        timeout: 30000
      };
      
      // Debug: Log dos headers e API Key completa para verificação
      console.log(`📤 Headers da requisição:`, {
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
        'Content-Type': config.headers['Content-Type'],
        'x-api-key': `${this.CAIXA_API_KEY.substring(0, 10)}...${this.CAIXA_API_KEY.substring(this.CAIXA_API_KEY.length - 5)}`,
        'API Key completa (primeiros 15 chars)': this.CAIXA_API_KEY.substring(0, 15),
        'API Key length': this.CAIXA_API_KEY.length,
        'API Key primeiro caractere': this.CAIXA_API_KEY.charAt(0)
      });

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('❌ Erro na requisição para API Caixa:', {
        endpoint,
        method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      throw error;
    }
  }

  /**
   * Criar boleto na Caixa
   * @param {Object} dadosBoleto - Dados do boleto
   * @returns {Object} Dados do boleto criado
   */
  async criarBoleto(dadosBoleto) {
    try {
      const {
        id_beneficiario,
        numero_documento,
        data_vencimento,
        valor,
        pagador_cpf,
        pagador_nome,
        pagador_cidade,
        pagador_uf,
        pagador_cep,
        pagador_logradouro,
        pagador_numero,
        pagador_bairro,
        pagador_complemento,
        instrucoes,
        descricao
      } = dadosBoleto;

      if (!id_beneficiario) {
        throw new Error('ID do beneficiário é obrigatório');
      }

      // Preparar payload conforme documentação da API Caixa v4
      // O Swagger mostra que o payload deve estar dentro de "dados_cadastrais"
      const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const dadosCadastrais = {
        numero_documento: numero_documento || `BOL-${Date.now()}`,
        data_vencimento: data_vencimento, // Formato: YYYY-MM-DD
        valor: parseFloat(valor),
        tipo_especie: 4, // 4 = Duplicata de serviço (padrão)
        flag_aceite: 'N', // Não aceite (padrão)
        data_emissao: hoje,
        valor_abatimento: 0,
        pagador: {
          pessoa_fisica: {
            cpf: parseInt(pagador_cpf.replace(/\D/g, ''), 10), // Converter para inteiro
            nome: pagador_nome.substring(0, 40) // Máximo 40 caracteres
          }
        }
      };

      // Adicionar endereço se fornecido
      if (pagador_logradouro && pagador_bairro && pagador_cidade && pagador_uf && pagador_cep) {
        // O Swagger não mostra campo "numero" separado - incluir no logradouro se fornecido
        let logradouroCompleto = pagador_logradouro;
        if (pagador_numero) {
          logradouroCompleto = `${pagador_logradouro}, ${pagador_numero}`;
        }
        
        dadosCadastrais.pagador.endereco = {
          logradouro: logradouroCompleto.substring(0, 40),
          bairro: pagador_bairro.substring(0, 15),
          cidade: pagador_cidade.substring(0, 15),
          uf: pagador_uf.substring(0, 2).toUpperCase(),
          cep: parseInt(pagador_cep.replace(/\D/g, ''), 10) // Converter para inteiro
        };
      }

      // Adicionar instruções se fornecido
      if (instrucoes) {
        dadosCadastrais.instrucoes = Array.isArray(instrucoes) ? instrucoes : [instrucoes];
      }

      // Adicionar descrição se fornecido
      if (descricao) {
        dadosCadastrais.descricao = descricao;
      }

      // Wrapper conforme Swagger: inclui_boleto_requisicao_v4_Mensagem
      const payload = {
        dados_cadastrais: dadosCadastrais
      };

      console.log('📤 Criando boleto na Caixa:', {
        id_beneficiario,
        numero_documento: dadosCadastrais.numero_documento,
        valor: dadosCadastrais.valor,
        vencimento: dadosCadastrais.data_vencimento,
        payload: JSON.stringify(payload, null, 2)
      });

      const response = await this.makeAuthenticatedRequest(
        'POST',
        `/v4/beneficiarios/${id_beneficiario}/boletos`,
        payload
      );

      console.log('✅ Boleto criado com sucesso:', response);

      // A resposta vem dentro de dados_complementares conforme Swagger
      const dadosComplementares = response.dados_complementares || response;

      return {
        nosso_numero: dadosComplementares.nosso_numero,
        codigo_barras: dadosComplementares.codigo_barras,
        linha_digitavel: dadosComplementares.linha_digitavel,
        url: dadosComplementares.url,
        qrcode: dadosComplementares.qrcode,
        url_qrcode: dadosComplementares.url_qrcode,
        numero_documento: dadosCadastrais.numero_documento
      };
    } catch (error) {
      console.error('❌ Erro ao criar boleto na Caixa:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Consultar boleto na Caixa
   * @param {String} id_beneficiario - ID do beneficiário
   * @param {BigInt} nosso_numero - Número do boleto na Caixa
   * @returns {Object} Dados do boleto
   */
  async consultarBoleto(id_beneficiario, nosso_numero) {
    try {
      console.log('🔍 Consultando boleto na Caixa:', { id_beneficiario, nosso_numero });

      const response = await this.makeAuthenticatedRequest(
        'GET',
        `/v4/beneficiarios/${id_beneficiario}/boletos/${nosso_numero}`
      );

      console.log('✅ Boleto consultado:', response);

      return {
        nosso_numero: response.nosso_numero,
        numero_documento: response.numero_documento,
        codigo_barras: response.codigo_barras,
        linha_digitavel: response.linha_digitavel,
        url: response.url,
        qrcode: response.qrcode,
        url_qrcode: response.url_qrcode,
        valor: response.valor,
        valor_pago: response.valor_pago || null,
        data_vencimento: response.data_vencimento,
        data_emissao: response.data_emissao,
        data_hora_pagamento: response.data_hora_pagamento || null,
        situacao: response.situacao || 'EM ABERTO'
      };
    } catch (error) {
      console.error('❌ Erro ao consultar boleto na Caixa:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Atualizar boleto na Caixa
   * @param {String} id_beneficiario - ID do beneficiário
   * @param {BigInt} nosso_numero - Número do boleto
   * @param {Object} dadosAtualizacao - Dados para atualizar
   */
  async atualizarBoleto(id_beneficiario, nosso_numero, dadosAtualizacao) {
    try {
      console.log('🔄 Atualizando boleto na Caixa:', { id_beneficiario, nosso_numero });

      const response = await this.makeAuthenticatedRequest(
        'PUT',
        `/v4/beneficiarios/${id_beneficiario}/boletos/${nosso_numero}`,
        dadosAtualizacao
      );

      console.log('✅ Boleto atualizado:', response);
      return response;
    } catch (error) {
      console.error('❌ Erro ao atualizar boleto na Caixa:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Baixar/Cancelar boleto na Caixa
   * @param {String} id_beneficiario - ID do beneficiário
   * @param {BigInt} nosso_numero - Número do boleto
   */
  async baixarBoleto(id_beneficiario, nosso_numero) {
    try {
      console.log('📥 Baixando boleto na Caixa:', { id_beneficiario, nosso_numero });

      const response = await this.makeAuthenticatedRequest(
        'POST',
        `/v2/beneficiarios/${id_beneficiario}/boletos/${nosso_numero}/baixar`
      );

      console.log('✅ Boleto baixado:', response);
      return response;
    } catch (error) {
      console.error('❌ Erro ao baixar boleto na Caixa:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Exportar instância singleton
module.exports = new CaixaBoletoService();

