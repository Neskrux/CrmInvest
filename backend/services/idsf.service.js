const axios = require('axios');
require('dotenv').config();

// Configurações da API IDSF
const IDSF_CONFIG = {
  baseUrl: process.env.IDSF_BASE_URL || 'https://api.idsf.com.br',
  apiKey: process.env.IDSF_API_KEY,
  timeout: 30000, // 30 segundos
  retryAttempts: 3
};

// Função para fazer requisições à API IDSF
const makeIDSFRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${IDSF_CONFIG.baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${IDSF_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CrmInvest/1.0',
        ...headers
      },
      timeout: IDSF_CONFIG.timeout
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    console.log(`🔄 Fazendo requisição IDSF: ${method} ${config.url}`);
    
    const response = await axios(config);
    
    console.log(`✅ Resposta IDSF recebida: ${response.status}`);
    return {
      success: true,
      data: response.data,
      status: response.status,
      headers: response.headers
    };
    
  } catch (error) {
    console.error('❌ Erro na requisição IDSF:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

// Verificar se a API está configurada
const isConfigured = () => {
  return !!(IDSF_CONFIG.apiKey && IDSF_CONFIG.baseUrl);
};

// Testar conexão com IDSF
const testConnection = async () => {
  return await makeIDSFRequest('GET', '/health');
};

// Buscar informações de uma clínica
const getClinica = async (cnpj) => {
  if (!cnpj || cnpj.length !== 14) {
    return {
      success: false,
      error: 'CNPJ inválido. Deve conter 14 dígitos'
    };
  }
  
  return await makeIDSFRequest('GET', `/clinicas/${cnpj}`);
};

// Cadastrar clínica no IDSF
const createClinica = async (clinicaData) => {
  if (!clinicaData.cnpj || !clinicaData.razao_social) {
    return {
      success: false,
      error: 'CNPJ e Razão Social são obrigatórios'
    };
  }
  
  return await makeIDSFRequest('POST', '/clinicas', clinicaData);
};

// Atualizar dados de uma clínica
const updateClinica = async (cnpj, clinicaData) => {
  if (!cnpj || cnpj.length !== 14) {
    return {
      success: false,
      error: 'CNPJ inválido. Deve conter 14 dígitos'
    };
  }
  
  return await makeIDSFRequest('PUT', `/clinicas/${cnpj}`, clinicaData);
};

// Buscar status de financiamento
const getFinanciamento = async (cnpj) => {
  if (!cnpj || cnpj.length !== 14) {
    return {
      success: false,
      error: 'CNPJ inválido. Deve conter 14 dígitos'
    };
  }
  
  return await makeIDSFRequest('GET', `/financiamentos/${cnpj}`);
};

// Solicitar financiamento
const createFinanciamento = async (financiamentoData) => {
  if (!financiamentoData.cnpj || !financiamentoData.valor_solicitado) {
    return {
      success: false,
      error: 'CNPJ e valor solicitado são obrigatórios'
    };
  }
  
  return await makeIDSFRequest('POST', '/financiamentos', financiamentoData);
};

// Buscar documentos necessários
const getDocumentosNecessarios = async (tipo) => {
  return await makeIDSFRequest('GET', `/documentos/${tipo}`);
};

// Verificar status de análise
const getAnalise = async (cnpj) => {
  if (!cnpj || cnpj.length !== 14) {
    return {
      success: false,
      error: 'CNPJ inválido. Deve conter 14 dígitos'
    };
  }
  
  return await makeIDSFRequest('GET', `/analises/${cnpj}`);
};

module.exports = {
  isConfigured,
  testConnection,
  getClinica,
  createClinica,
  updateClinica,
  getFinanciamento,
  createFinanciamento,
  getDocumentosNecessarios,
  getAnalise
};

