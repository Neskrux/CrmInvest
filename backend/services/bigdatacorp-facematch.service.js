require('dotenv').config();
const axios = require('axios');

/**
 * Serviço para integração com API BigDataCorp - Facematch (Comparação Biométrica de Faces)
 * 
 * Responsável por:
 * - Comparar duas imagens (selfie e documento) para validação biométrica
 * - Retornar resultado da comparação (match ou no match)
 * - Tratar erros da API BigDataCorp
 */

class BigDataCorpFacematchService {
  constructor() {
    // Configurações da API BigDataCorp
    this.BIGDATACORP_API_URL = process.env.BIGDATACORP_API_URL || 'https://app.bigdatacorp.com.br/bigid/biometrias/facematch';
    this.BIGDATACORP_TOKEN = process.env.BIGDATACORP_TOKEN || null;
    this.BIGDATACORP_API_KEY = process.env.BIGDATACORP_API_KEY || null;
    
    // Timeout para requisições (30 segundos)
    this.TIMEOUT = 30000;
    
    // Log de configuração (sem mostrar o token completo por segurança)
    if (this.BIGDATACORP_TOKEN) {
      const tokenPreview = this.BIGDATACORP_TOKEN.substring(0, 20) + '...';
      console.log('✅ [BIGDATACORP] Token configurado:', tokenPreview);
      console.log('   URL:', this.BIGDATACORP_API_URL);
    } else if (this.BIGDATACORP_API_KEY) {
      const keyPreview = this.BIGDATACORP_API_KEY.substring(0, 20) + '...';
      console.log('✅ [BIGDATACORP] API Key configurada:', keyPreview);
      console.log('   URL:', this.BIGDATACORP_API_URL);
    } else {
      console.warn('⚠️ AVISO: BIGDATACORP_TOKEN ou BIGDATACORP_API_KEY não configurado no .env');
      console.warn('   A validação biométrica não funcionará até que seja configurado.');
    }
  }

  /**
   * Compara duas imagens usando API BigDataCorp Facematch
   * @param {string} baseImageBase64 - Imagem base (RG/CNH) em base64 (sem prefixo data:image)
   * @param {string} matchImageBase64 - Imagem de comparação (selfie) em base64 (sem prefixo data:image)
   * @returns {Promise<{success: boolean, match: boolean, code: number, message: string}>}
   */
  async compararFaces(baseImageBase64, matchImageBase64) {
    try {
      // Validar se está configurado
      if (!this.BIGDATACORP_TOKEN && !this.BIGDATACORP_API_KEY) {
        throw new Error('BigDataCorp não está configurado. Verifique as variáveis de ambiente BIGDATACORP_TOKEN ou BIGDATACORP_API_KEY');
      }

      // Validar se as imagens foram fornecidas
      if (!baseImageBase64 || !matchImageBase64) {
        throw new Error('Ambas as imagens (base e match) são obrigatórias');
      }

      // Remover prefixo data:image se existir
      const base64Clean = (base64) => {
        if (base64.includes(',')) {
          return base64.split(',')[1];
        }
        return base64;
      };

      const baseImageClean = base64Clean(baseImageBase64);
      const matchImageClean = base64Clean(matchImageBase64);

      // Preparar payload conforme documentação BigDataCorp
      const payload = {
        Parameters: [
          `BASE_FACE_IMG=${baseImageClean}`,
          `MATCH_IMG=${matchImageClean}`
        ]
      };

      // Preparar headers
      const headers = {
        'Content-Type': 'application/json'
      };

      // Adicionar autenticação
      // BigDataCorp usa Bearer token no header Authorization
      if (this.BIGDATACORP_TOKEN) {
        headers['Authorization'] = `Bearer ${this.BIGDATACORP_TOKEN}`;
        console.log('🔐 [BIGDATACORP] Usando token para autenticação');
        console.log(`   Token preview: ${this.BIGDATACORP_TOKEN.substring(0, 30)}...`);
      } else if (this.BIGDATACORP_API_KEY) {
        headers['Authorization'] = `Bearer ${this.BIGDATACORP_API_KEY}`;
        console.log('🔐 [BIGDATACORP] Usando API Key para autenticação');
      } else {
        throw new Error('Token ou API Key não configurado');
      }

      console.log('🔐 [BIGDATACORP] Enviando requisição de comparação biométrica...');
      console.log(`   URL: ${this.BIGDATACORP_API_URL}`);
      console.log(`   Headers:`, { 
        'Content-Type': headers['Content-Type'],
        'Authorization': headers['Authorization'] ? `Bearer ${headers['Authorization'].substring(7, 37)}...` : 'NÃO CONFIGURADO'
      });
      console.log(`   Base image size: ${baseImageClean.length} chars`);
      console.log(`   Match image size: ${matchImageClean.length} chars`);

      // Fazer requisição
      const response = await axios.post(
        this.BIGDATACORP_API_URL,
        payload,
        {
          headers,
          timeout: this.TIMEOUT
        }
      );

      // Log completo da resposta para debug
      console.log(`📊 [BIGDATACORP] Resposta completa:`, JSON.stringify(response.data, null, 2));
      console.log(`📊 [BIGDATACORP] Status HTTP:`, response.status);
      console.log(`📊 [BIGDATACORP] Headers da resposta:`, response.headers);

      // Processar resposta - BigDataCorp usa ResultCode e ResultMessage
      const responseData = response.data || {};
      const code = responseData.ResultCode || responseData.resultCode || responseData.code || responseData.Code;
      const message = responseData.ResultMessage || responseData.resultMessage || responseData.message || responseData.Message;
      const similarity = responseData.EstimatedInfo?.Similarity || null;

      console.log(`📊 [BIGDATACORP] Resposta processada: Code ${code}, Message: ${message}`);
      if (similarity) {
        console.log(`📊 [BIGDATACORP] Similaridade: ${similarity}%`);
      }

      // Code 80 = Match confirmado
      if (code === 80) {
        console.log('✅ [BIGDATACORP] Match confirmado - Faces correspondem');
        console.log(`✅ [BIGDATACORP] Similaridade: ${similarity}%`);
        return {
          success: true,
          match: true,
          code: 80,
          message: 'Face picture match - Identidade validada com sucesso',
          similarity: similarity
        };
      }

      // Code -800 = No Match
      if (code === -800) {
        console.log('❌ [BIGDATACORP] No Match - Faces não correspondem');
        return {
          success: true,
          match: false,
          code: -800,
          message: 'The face pictures does not match - As faces não correspondem. Por favor, tente novamente.'
        };
      }

      // Outros códigos de erro
      console.error(`⚠️ [BIGDATACORP] Erro na validação: Code ${code}, Message: ${message}`);
      return {
        success: false,
        match: false,
        code: code,
        message: message || 'Erro na validação biométrica'
      };

    } catch (error) {
      console.error('❌ [BIGDATACORP] Erro ao comparar faces:', error.message);
      
      // Tratar erros específicos
      if (error.response) {
        // Erro da API
        const status = error.response.status;
        const data = error.response.data;
        
        console.error(`   Status: ${status}`);
        console.error(`   Data:`, data);

        // Erro 401/403 = Autenticação
        if (status === 401 || status === 403) {
          console.error('❌ [BIGDATACORP] Erro de autenticação (401/403)');
          console.error('   Status:', status);
          console.error('   Response data:', JSON.stringify(data, null, 2));
          console.error('   Token configurado?', !!this.BIGDATACORP_TOKEN || !!this.BIGDATACORP_API_KEY);
          console.error('   Token preview:', this.BIGDATACORP_TOKEN ? this.BIGDATACORP_TOKEN.substring(0, 50) + '...' : 'NÃO CONFIGURADO');
          
          return {
            success: false,
            match: false,
            code: -824,
            message: data?.message || data?.Message || 'Erro de autenticação. Verifique se o token BIGDATACORP_TOKEN está correto no arquivo .env e reinicie o servidor.'
          };
        }

        // Erro 400 = Bad Request
        if (status === 400) {
          return {
            success: false,
            match: false,
            code: -801,
            message: data?.message || 'Erro na requisição. Verifique se as imagens são válidas.'
          };
        }

        return {
          success: false,
          match: false,
          code: -999,
          message: data?.message || `Erro na API: ${status}`
        };
      }

      // Erro de rede ou timeout
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          match: false,
          code: -999,
          message: 'Timeout na requisição. Tente novamente.'
        };
      }

      return {
        success: false,
        match: false,
        code: -999,
        message: error.message || 'Erro ao conectar com serviço de validação biométrica'
      };
    }
  }

  /**
   * Verifica se o serviço está configurado corretamente
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.BIGDATACORP_TOKEN || this.BIGDATACORP_API_KEY);
  }

  /**
   * Valida se uma imagem em base64 é válida
   * @param {string} base64 - String base64 da imagem
   * @returns {boolean}
   */
  isValidBase64Image(base64) {
    if (!base64 || typeof base64 !== 'string') {
      return false;
    }

    // Remover prefixo se existir
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Verificar se é base64 válido
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(cleanBase64)) {
      return false;
    }

    // Verificar tamanho mínimo (uma imagem válida deve ter pelo menos alguns caracteres)
    if (cleanBase64.length < 100) {
      return false;
    }

    return true;
  }
}

// Exportar instância singleton
module.exports = new BigDataCorpFacematchService();
