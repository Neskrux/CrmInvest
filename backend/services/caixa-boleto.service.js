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
    // Configurações da API Caixa (Sandbox por padrão - credenciais fornecidas são de Sandbox)
    // Para Produção, é necessário ter credenciais diferentes da Caixa
    this.CAIXA_API_KEY = process.env.CAIXA_API_KEY || null; // Sem valor padrão - deve vir do .env
    this.CAIXA_CLIENT_ID = process.env.CAIXA_CLIENT_ID || 'cli-ext-41267440000197-1';
    this.CAIXA_CLIENT_SECRET = process.env.CAIXA_CLIENT_SECRET || '90b11321-8363-477d-bf16-8ccf1963916d';
    
    // URLs - Por padrão usa Sandbox (ambiente de desenvolvimento/testes)
    // Sandbox: https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
    // Produção: https://loginservicos.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token
    // NOTA: As credenciais fornecidas (Client ID e Secret) são do ambiente Sandbox
    this.CAIXA_TOKEN_URL = process.env.CAIXA_TOKEN_URL || 'https://logindes.caixa.gov.br/auth/realms/internet/protocol/openid-connect/token';
    
    // Base URL da API conforme manual técnico:
    // Sandbox: https://api.caixa.gov.br:8443/sandbox/<api_path>
    // Produção: https://api.caixa.gov.br:8443/<api_path>
    // NOTA: Se não especificado, usa Sandbox (com /sandbox/ no path)
    const usarProducao = process.env.CAIXA_USAR_PRODUCAO === 'true';
    
    // Se CAIXA_API_BASE_URL foi definido manualmente, verificar se tem /sandbox/
    const baseUrlManual = process.env.CAIXA_API_BASE_URL || process.env.CAIXA_BASE_URL;
    
    if (baseUrlManual && !baseUrlManual.includes('/sandbox/') && !usarProducao) {
      console.warn(`⚠️ AVISO: CAIXA_API_BASE_URL definido sem /sandbox/ mas não está em produção!`);
      console.warn(`   URL atual: ${baseUrlManual}`);
      console.warn(`   Deveria ser: ${baseUrlManual.replace('/cobranca-bancaria', '/sandbox/cobranca-bancaria')}`);
      console.warn(`   OU definir CAIXA_USAR_PRODUCAO=true se realmente for produção`);
    }
    
    this.CAIXA_API_BASE_URL = baseUrlManual || 
      (usarProducao 
        ? 'https://api.caixa.gov.br:8443/cobranca-bancaria'  // Produção
        : 'https://api.caixa.gov.br:8443/sandbox/cobranca-bancaria'); // Sandbox
    
    // Log do ambiente configurado
    if (this.CAIXA_API_BASE_URL.includes('/sandbox/')) {
      console.log(`🌐 Ambiente Caixa: SANDBOX (URL: ${this.CAIXA_API_BASE_URL})`);
    } else {
      console.log(`🌐 Ambiente Caixa: PRODUÇÃO (URL: ${this.CAIXA_API_BASE_URL})`);
      if (!usarProducao) {
        console.warn(`⚠️ ATENÇÃO: Usando PRODUÇÃO mas CAIXA_USAR_PRODUCAO não está definido como 'true'!`);
      }
    }
    
    // Debug: Log da API Key carregada (apenas primeiros e últimos caracteres)
    const apiKeyPartial = this.CAIXA_API_KEY ? `${this.CAIXA_API_KEY.substring(0, 5)}...${this.CAIXA_API_KEY.substring(this.CAIXA_API_KEY.length - 5)}` : 'NÃO CONFIGURADA';
    console.log(`🔑 CAIXA_API_KEY carregada: ${apiKeyPartial}`);
    
    // Validação da API Key
    if (this.CAIXA_API_KEY) {
      // Remover espaços em branco no início/fim (pode causar problemas)
      this.CAIXA_API_KEY = this.CAIXA_API_KEY.trim();
      
      // Validar formato esperado (deve começar com 'l' e ter 38 caracteres)
      const expectedFormat = /^l[a-f0-9]{37}$/i;
      const expectedLength = 38;
      
      if (this.CAIXA_API_KEY.length !== expectedLength) {
        console.error(`🔴 ERRO: CAIXA_API_KEY tem ${this.CAIXA_API_KEY.length} caracteres, mas deveria ter ${expectedLength}!`);
        console.error(`   API Key no .env está INCOMPLETA ou tem caracteres extras.`);
        console.error(`   Primeiros 15 chars: ${this.CAIXA_API_KEY.substring(0, 15)}...`);
        console.error(`   Últimos 5 chars: ...${this.CAIXA_API_KEY.substring(this.CAIXA_API_KEY.length - 5)}`);
        console.error(`   Valor completo esperado: l777123839e09849f9a0d5a3d972d35e6e (38 chars)`);
        console.error(`   Verifique se não há espaços ou caracteres faltando no arquivo .env`);
      } else if (!expectedFormat.test(this.CAIXA_API_KEY)) {
        console.warn(`⚠️ CAIXA_API_KEY formato pode estar incorreto. Formato esperado: l seguido de 37 caracteres hexadecimais`);
        console.warn(`   Valor atual (primeiros 20 chars): ${this.CAIXA_API_KEY.substring(0, 20)}...`);
        console.warn(`   Primeiro caractere: "${this.CAIXA_API_KEY.charAt(0)}" (deve ser "l")`);
      } else {
        console.log(`✅ CAIXA_API_KEY formato válido (length: ${this.CAIXA_API_KEY.length})`);
      }
    }
    
    // Cache de token (com reutilização)
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // ID do beneficiário (configurável por empresa_id)
    // Pode ser fornecido como "0374/1242669" (agência/código) ou apenas "1242669" (código)
    // IMPORTANTE: Conforme Swagger, o parâmetro na URL deve ser "integer", não string com barra
    // Portanto, sempre extrair apenas o código numérico para usar na URL
    const beneficiarioRaw = process.env.CAIXA_ID_BENEFICIARIO || null;
    
    if (beneficiarioRaw) {
      if (beneficiarioRaw.includes('/')) {
        // Extrair apenas o código numérico após a barra
        this.ID_BENEFICIARIO = beneficiarioRaw.split('/')[1].trim();
        console.log(`📋 Extraindo código do beneficiário: ${beneficiarioRaw} -> ${this.ID_BENEFICIARIO}`);
      } else {
        // Já está no formato numérico
        this.ID_BENEFICIARIO = beneficiarioRaw.trim();
      }
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
      // IMPORTANTE: Limite rigoroso da Caixa - SSO aceita apenas 1 requisição/IP/minuto
      if (this.lastTokenRequest && Date.now() - this.lastTokenRequest < this.MIN_TOKEN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_TOKEN_REQUEST_INTERVAL - (Date.now() - this.lastTokenRequest);
        console.log(`⏳ Aguardando ${Math.ceil(waitTime / 1000)}s para respeitar rate limit da Caixa (1 req/min)...`);
        await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // +1s de margem de segurança
      }

      console.log('🔐 Obtendo token de acesso da Caixa...');

      if (!this.CAIXA_API_KEY) {
        throw new Error('CAIXA_API_KEY não configurada. Configure no arquivo .env');
      }

      // Garantir que a API Key não tem espaços antes de usar (definir antes do try para estar disponível no catch)
      const apiKeyForToken = this.CAIXA_API_KEY.trim();

      // Preparar parâmetros da requisição de token
      const tokenParams = {
        grant_type: 'client_credentials',
        client_id: this.CAIXA_CLIENT_ID,
        client_secret: this.CAIXA_CLIENT_SECRET
      };
      
      // Adicionar scope apenas se explicitamente configurado no .env
      // Não enviar 'openid' por padrão - deixar a Caixa decidir
      if (process.env.CAIXA_SCOPE) {
        tokenParams.scope = process.env.CAIXA_SCOPE;
        console.log(`📋 Usando scope configurado: ${process.env.CAIXA_SCOPE}`);
      }
      
      // Serializar como string URL-encoded (formato correto para OAuth2)
      const bodyParams = new URLSearchParams(tokenParams).toString();
      
      console.log('🔐 Parâmetros do token request:', {
        grant_type: tokenParams.grant_type,
        client_id: tokenParams.client_id,
        client_secret: tokenParams.client_secret ? '***' : undefined,
        scope: tokenParams.scope || 'não enviado',
        token_url: this.CAIXA_TOKEN_URL,
        'apikey (primeiros 10 chars)': apiKeyForToken.substring(0, 10),
        'apikey length': apiKeyForToken.length,
        'apikey primeiro char': `"${apiKeyForToken.charAt(0)}"`
      });
      
      let response;
      let tentativas = 0;
      const maxTentativas = 3;
      
      while (tentativas < maxTentativas) {
        try {
          response = await axios.post(
            this.CAIXA_TOKEN_URL,
            bodyParams, // Enviar como string, não como objeto URLSearchParams
                {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apikey': apiKeyForToken,  // Formato correto conforme manual técnico MO 38.431 da Caixa
                    'User-Agent': 'CrmInvest/1.0' // Evitar bloqueio anti-bot
                  },
              timeout: 30000,
              validateStatus: function (status) {
                // Aceitar qualquer status para poder tratar manualmente
                return status >= 200 && status < 600;
              }
            }
          );
          
          // Verificar se a resposta foi bem-sucedida
          if (response.status >= 200 && response.status < 300) {
            break; // Sucesso, sair do loop
          } else {
            // Resposta com erro HTTP, tratar como erro
            const error = new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
            error.response = response;
            throw error;
          }
        } catch (error) {
          tentativas++;
          
          // Log do erro para debug
          if (tentativas === 1) {
            console.log(`⚠️ Erro na tentativa ${tentativas} de obter token:`, {
              message: error.message,
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data
            });
          }
          
          // Se for erro 429 (Too Many Requests), aguardar e tentar novamente
          if (error.response?.status === 429 && tentativas < maxTentativas) {
            const waitTime = this.MIN_TOKEN_REQUEST_INTERVAL * tentativas; // Backoff exponencial
            console.log(`⚠️ Rate limit 429 detectado. Aguardando ${Math.ceil(waitTime / 1000)}s antes de tentar novamente (tentativa ${tentativas}/${maxTentativas})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // Se não for 429 ou esgotou tentativas, lançar erro
          throw error;
        }
      }

      // Verificar se response foi definido (se todas as tentativas falharam, pode estar undefined)
      if (!response) {
        throw new Error('Nenhuma resposta recebida da API após todas as tentativas');
      }

      // Log da resposta completa para debug
      console.log('📋 Resposta da API de token:', {
        status: response?.status,
        statusText: response?.statusText,
        hasData: !!response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : [],
        dataPreview: response?.data ? JSON.stringify(response.data).substring(0, 200) : 'sem dados'
      });

      if (response && response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Calcular expiração (padrão: 3600 segundos, menos 60 segundos de margem)
        const expiresIn = (response.data.expires_in || 3600) - 60;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
        
        console.log('✅ Token obtido com sucesso. Expira em:', expiresIn, 'segundos');
        this.lastTokenRequest = Date.now();
        
        return this.accessToken;
      } else {
        // Log detalhado do que foi retornado
        const errorDetails = {
          responseExists: !!response,
          dataExists: !!response?.data,
          responseData: response?.data,
          responseStatus: response?.status,
          responseStatusText: response?.statusText,
          responseHeaders: response?.headers
        };
        
        console.error('❌ Resposta da API não contém access_token:', errorDetails);
        
        // Criar erro mais informativo
        const errorMessage = response?.data?.error_description || 
                            response?.data?.error || 
                            response?.data?.message ||
                            JSON.stringify(response?.data) ||
                            'Token não retornado na resposta';
        
        const error = new Error(`Erro ao obter token: ${errorMessage}`);
        // Adicionar dados da resposta ao erro para facilitar debug
        error.response = response;
        throw error;
      }
    } catch (error) {
      // Garantir que apiKeyForToken está definida para uso no catch (caso o erro ocorra antes da linha 142)
      const apiKeyForToken = this.CAIXA_API_KEY ? this.CAIXA_API_KEY.trim() : null;
      
      // Log detalhado do erro
      console.error('❌ Erro ao obter token da Caixa:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        'API Key usada (primeiros 10 chars)': apiKeyForToken ? apiKeyForToken.substring(0, 10) : 'NÃO DISPONÍVEL',
        'Token URL': this.CAIXA_TOKEN_URL,
        'Client ID': this.CAIXA_CLIENT_ID
      });
      
      // Tratar erros específicos da API Key
      if (error.response?.status === 400 || error.response?.status === 401) {
        const errorData = error.response?.data;
        const errorMessage = typeof errorData === 'string' ? errorData : errorData?.error_description || errorData?.mensagem || errorData?.error;
        
        if (errorMessage && (
          errorMessage.toLowerCase().includes('api key') ||
          errorMessage.toLowerCase().includes('apikey') ||
          errorMessage.toLowerCase().includes('chave') ||
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('não encontrada') ||
          errorMessage.toLowerCase().includes('inválida')
        )) {
          console.error('🔴 ERRO DE API KEY DETECTADO!');
          console.error('   Verificações necessárias:');
          if (apiKeyForToken) {
            console.error(`   1. API Key no .env: ${apiKeyForToken.substring(0, 15)}... (length: ${apiKeyForToken.length})`);
            console.error(`   2. Primeiro caractere: "${apiKeyForToken.charAt(0)}" (deve ser "l")`);
          } else {
            console.error(`   1. API Key: NÃO CONFIGURADA`);
          }
          console.error(`   3. Client ID: ${this.CAIXA_CLIENT_ID}`);
          console.error(`   4. Ambiente: ${this.CAIXA_TOKEN_URL.includes('logindes') ? 'SANDBOX' : 'PRODUÇÃO'}`);
          console.error(`   5. A API Key está vinculada ao Client ID no ambiente da Caixa?`);
          console.error(`   6. A API Key está ativa e autorizada?`);
          
          throw new Error(`API Key inválida ou não reconhecida pela Caixa. Verifique: 1) Se a API Key está correta no .env (deve começar com "l"), 2) Se está vinculada ao Client ID ${this.CAIXA_CLIENT_ID}, 3) Se está ativa no ambiente ${this.CAIXA_TOKEN_URL.includes('logindes') ? 'SANDBOX' : 'PRODUÇÃO'}. Erro da Caixa: ${errorMessage}`);
        }
      }
      
      if (error.response?.status === 429) {
        throw new Error(`Rate limit excedido na API Caixa. Aguarde 1 minuto antes de tentar novamente. Limite: 1 requisição/IP/minuto para SSO.`);
      }
      
      if (error.response?.status === 401) {
        const errorData = error.response?.data;
        const errorDescription = typeof errorData === 'string' ? errorData : errorData?.error_description || errorData?.error;
        
        if (errorDescription && errorDescription.includes('INVALID_CREDENTIALS')) {
          throw new Error(`Credenciais inválidas. Verifique se está usando as credenciais corretas para o ambiente ${this.CAIXA_TOKEN_URL.includes('logindes') ? 'SANDBOX' : 'PRODUÇÃO'}. Client ID: ${this.CAIXA_CLIENT_ID}`);
        }
      }
      
      throw new Error(`Erro ao autenticar na API Caixa: ${error.response?.data?.error_description || error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Fazer requisição autenticada para API Caixa
   */
  async makeAuthenticatedRequest(method, endpoint, data = null) {
    // Garantir que a API Key está disponível antes de usar no catch
    const apiKeyToSend = this.CAIXA_API_KEY ? this.CAIXA_API_KEY.trim() : null;
    
    try {
      if (!this.CAIXA_API_KEY) {
        throw new Error('CAIXA_API_KEY não configurada. Configure no arquivo .env');
      }
      
      const token = await this.getAccessToken();
      
      const config = {
        method,
        url: `${this.CAIXA_API_BASE_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': apiKeyToSend,  // Formato correto conforme manual técnico MO 38.431 da Caixa
          'User-Agent': 'CrmInvest/1.0' // Evitar bloqueio anti-bot (valores genéricos como "curl" são bloqueados)
        },
        timeout: 30000
      };
      
      // Debug: Log dos headers e API Key completa para verificação
      // IMPORTANTE: Verificar se apikey está sendo enviado corretamente
      
      console.log(`📤 Headers da requisição:`, {
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
        'Content-Type': config.headers['Content-Type'],
        'apikey (primeiros 15 chars)': apiKeyToSend ? apiKeyToSend.substring(0, 15) : 'NÃO DISPONÍVEL',
        'apikey (últimos 5 chars)': apiKeyToSend ? apiKeyToSend.substring(apiKeyToSend.length - 5) : 'NÃO DISPONÍVEL',
        'API Key length': apiKeyToSend ? apiKeyToSend.length : 0,
        'API Key primeiro caractere': apiKeyToSend ? `"${apiKeyToSend.charAt(0)}"` : 'NÃO DISPONÍVEL',
        'API Key formatada corretamente': apiKeyToSend === 'l777123839e09849f9a0d5a3d972d35e6e' ? 'SIM' : 'VERIFICAR',
        'URL completa': `${this.CAIXA_API_BASE_URL}${endpoint}`,
        'Client ID': this.CAIXA_CLIENT_ID,
        'Ambiente': this.CAIXA_API_BASE_URL.includes('/sandbox/') ? 'SANDBOX' : 'PRODUÇÃO'
      });
      
      // Garantir que o header apikey está sendo enviado sem espaços
      if (apiKeyToSend) {
        config.headers['apikey'] = apiKeyToSend;
      }

      if (data) {
        config.data = data;
      }

      // Tentar fazer requisição com retry para erro 429
      let tentativas = 0;
      const maxTentativas = 3;
      
      while (tentativas < maxTentativas) {
        try {
          const response = await axios(config);
          return response.data;
        } catch (error) {
          tentativas++;
          
          // Se for erro 429 (Too Many Requests), aguardar e tentar novamente
          if (error.response?.status === 429 && tentativas < maxTentativas) {
            const waitTime = 2000 * tentativas; // Backoff: 2s, 4s, 6s
            console.log(`⚠️ Rate limit 429 na API. Aguardando ${waitTime / 1000}s antes de tentar novamente (tentativa ${tentativas}/${maxTentativas})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // Se não for 429 ou esgotou tentativas, lançar erro
          throw error;
        }
      }
    } catch (error) {
      // Log detalhado do erro
      console.error('❌ Erro na requisição para API Caixa:', {
        endpoint,
        method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        'URL completa': `${this.CAIXA_API_BASE_URL}${endpoint}`,
        'API Key (primeiros 10 chars)': apiKeyToSend ? apiKeyToSend.substring(0, 10) : 'NÃO DISPONÍVEL',
        'Ambiente': this.CAIXA_API_BASE_URL.includes('/sandbox/') ? 'SANDBOX' : 'PRODUÇÃO'
      });
      
      // Tratar erros específicos da API Key
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        
        // Verificar se é erro BK076 (formatação JSON) ou erro de API Key
        if (errorData?.integracao?.codigo === 'BK076') {
          console.error('🔴 ERRO BK076: Formatação da mensagem inválida');
          console.error('   Verifique: 1) Formato JSON do payload, 2) Tipos de dados (CPF/CNPJ/CEP como integer), 3) Estrutura do payload');
          throw new Error(`Erro BK076: Formatação da mensagem inválida. ${errorData?.integracao?.mensagem || ''}`);
        }
        
        // Tratar erros negociais (ex: código de juros inválido)
        if (errorData?.negocial && Array.isArray(errorData.negocial) && errorData.negocial.length > 0) {
          const erroNegocial = errorData.negocial[0];
          const codigoRetorno = erroNegocial.codigo_retorno;
          const mensagemRetorno = erroNegocial.mensagem_retorno;
          
          console.error(`🔴 ERRO NEGOCIAL detectado:`);
          console.error(`   Origem: ${erroNegocial.origem}`);
          console.error(`   Código: ${codigoRetorno}`);
          console.error(`   Mensagem: ${mensagemRetorno}`);
          
          // Erro específico: CODIGO JUROS INVALIDO
          if (mensagemRetorno && mensagemRetorno.includes('CODIGO JUROS INVALIDO')) {
            console.error('   ⚠️ O campo juros_mora é obrigatório no payload!');
            console.error('   Solução: Incluir juros_mora com tipo="ISENTO" quando não há juros');
            throw new Error(`Erro: ${mensagemRetorno}. Campo juros_mora é obrigatório no payload, mesmo quando não há juros. Use tipo="ISENTO"`);
          }
          
          throw new Error(`Erro negocial da Caixa: ${mensagemRetorno} (Código: ${codigoRetorno})`);
        }
        
        // Verificar se a mensagem indica problema com API Key
        const errorMessage = typeof errorData === 'string' ? errorData : 
          errorData?.integracao?.mensagem || 
          errorData?.mensagem || 
          errorData?.error_description || 
          errorData?.error || '';
        
        if (errorMessage && (
          errorMessage.toLowerCase().includes('api key') ||
          errorMessage.toLowerCase().includes('apikey') ||
          errorMessage.toLowerCase().includes('chave') ||
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('não encontrada') ||
          errorMessage.toLowerCase().includes('inválida')
        )) {
          console.error('🔴 ERRO DE API KEY DETECTADO na requisição API!');
          console.error('   Verificações necessárias:');
          if (apiKeyToSend) {
            console.error(`   1. API Key enviada: ${apiKeyToSend.substring(0, 15)}... (length: ${apiKeyToSend.length})`);
            console.error(`   2. Primeiro caractere: "${apiKeyToSend.charAt(0)}" (deve ser "l")`);
          } else {
            console.error(`   1. API Key: NÃO CONFIGURADA`);
          }
          console.error(`   3. Header apikey está sendo enviado corretamente?`);
          console.error(`   4. Client ID: ${this.CAIXA_CLIENT_ID}`);
          console.error(`   5. Ambiente: ${this.CAIXA_API_BASE_URL.includes('/sandbox/') ? 'SANDBOX' : 'PRODUÇÃO'}`);
          console.error(`   6. A API Key está vinculada ao Client ID no ambiente da Caixa?`);
          
          throw new Error(`API Key inválida ou não reconhecida pela Caixa na requisição da API. Verifique: 1) Se a API Key está correta no .env, 2) Se está vinculada ao Client ID, 3) Se está ativa no ambiente correto. Erro: ${errorMessage}`);
        }
      }
      
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
        descricao,
        cnpj_beneficiario // CNPJ da empresa beneficiária (obrigatório conforme manual)
      } = dadosBoleto;

      if (!id_beneficiario) {
        throw new Error('ID do beneficiário é obrigatório');
      }

      // Preparar payload conforme documentação da API Caixa v4
      // O Swagger mostra que o payload deve estar dentro de "dados_cadastrais"
      // IMPORTANTE: Conforme manual técnico MO 38.431, o CNPJ do beneficiário é obrigatório em dados_cadastrais
      const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // IMPORTANTE: A data de juros DEVE SER MAIOR que a data de vencimento (requisito da Caixa)
      // Adicionar 1 dia à data de vencimento para a data dos juros
      const dataVencimentoObj = new Date(data_vencimento);
      const dataJurosObj = new Date(dataVencimentoObj);
      dataJurosObj.setDate(dataJurosObj.getDate() + 1); // Próximo dia após o vencimento
      const dataJuros = dataJurosObj.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const dadosCadastrais = {
        numero_documento: numero_documento || `BOL-${Date.now()}`,
        data_vencimento: data_vencimento, // Formato: YYYY-MM-DD
        valor: parseFloat(valor),
        tipo_especie: 4, // 4 = Duplicata de serviço (padrão)
        flag_aceite: 'N', // Não aceite (padrão)
        data_emissao: hoje,
        valor_abatimento: 0,
        codigo_moeda: 9, // 9 = Real brasileiro (BRL) - obrigatório conforme manual
        // OBRIGATÓRIO: Campo juros_mora deve estar presente
        // Configuração: 8% de juros mensal (conforme solicitado)
        // Para TAXA_MENSAL, usar campo "percentual" (não "valor")
        // IMPORTANTE: data de juros DEVE SER MAIOR que data de vencimento
        juros_mora: {
          tipo: 'TAXA_MENSAL', // Taxa mensal aplicada sobre o valor do título
          data: dataJuros, // Data a partir da qual os juros serão aplicados (1 dia após vencimento)
          percentual: 8.00 // 8% de juros mensal
        },
        // Multa: 10% aplicada após o vencimento
        // Estrutura conforme Swagger: data (obrigatória) + percentual ou valor
        multa: {
          data: data_vencimento, // Data a partir da qual a multa será aplicada (data de vencimento)
          percentual: 10.00 // 10% de multa
        },
        // Pós-vencimento: configurar devolução após 10 dias
        pos_vencimento: {
          acao: 'DEVOLVER', // Devolver o boleto após o prazo
          numero_dias: 10 // Prazo de 10 dias após o vencimento
        },
        pagador: {
          pessoa_fisica: {
            cpf: parseInt(pagador_cpf.replace(/\D/g, ''), 10), // Converter para inteiro
            nome: pagador_nome.substring(0, 40) // Máximo 40 caracteres
          }
        }
      };

      // Adicionar CNPJ do beneficiário conforme manual técnico (obrigatório)
      // Conforme manual: "Informar o CPF ou CNPJ cadastrado para convênio do beneficiário na CAIXA"
      if (cnpj_beneficiario) {
        const cnpjNumeros = cnpj_beneficiario.replace(/\D/g, ''); // Remover formatação
        if (cnpjNumeros.length === 14) {
          dadosCadastrais.cnpj = parseInt(cnpjNumeros, 10); // Converter para inteiro (int64)
          console.log(`📋 CNPJ do beneficiário adicionado ao payload: ${cnpjNumeros}`);
        } else {
          console.warn(`⚠️ CNPJ do beneficiário inválido (${cnpjNumeros.length} dígitos). Esperado: 14 dígitos`);
        }
      } else {
        console.warn('⚠️ CNPJ do beneficiário não fornecido. Pode causar erro na API Caixa.');
      }

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

      // A resposta da API vem em dados_cadastrais e dados_complementares
      const dadosCadastrais = response.dados_cadastrais || response;
      const dadosComplementares = response.dados_complementares || response;

      return {
        nosso_numero: dadosCadastrais.nosso_numero || dadosComplementares.nosso_numero,
        numero_documento: dadosCadastrais.numero_documento,
        codigo_barras: dadosComplementares.codigo_barras || '',
        linha_digitavel: dadosComplementares.linha_digitavel || '',
        url: dadosComplementares.url || '',
        qrcode: dadosComplementares.qrcode || null,
        url_qrcode: dadosComplementares.url_qrcode || null,
        valor: dadosCadastrais.valor,
        valor_pago: dadosCadastrais.valor_pago || 0,
        data_vencimento: dadosCadastrais.data_vencimento,
        data_emissao: dadosCadastrais.data_emissao,
        data_hora_pagamento: dadosCadastrais.data_hora_pagamento || null,
        situacao: dadosCadastrais.situacao || 'EM ABERTO'
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

