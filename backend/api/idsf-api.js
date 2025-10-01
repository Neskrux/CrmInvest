const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Configurações da API IDSF
const IDSF_CONFIG = {
  baseUrl: process.env.IDSF_BASE_URL || 'https://api.idsf.com.br',
  apiKey: process.env.IDSF_API_KEY,
  timeout: 30000, // 30 segundos
  retryAttempts: 3
};

// Middleware para autenticação IDSF
const authenticateIDSF = async (req, res, next) => {
  try {
    if (!IDSF_CONFIG.apiKey) {
      return res.status(500).json({ 
        error: 'IDSF API Key não configurada. Entre em contato com developers@idsf.com.br' 
      });
    }
    
    // Adicionar headers de autenticação
    req.idsfHeaders = {
      'Authorization': `Bearer ${IDSF_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'CrmInvest/1.0'
    };
    
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação IDSF:', error);
    res.status(500).json({ error: 'Erro na autenticação com IDSF' });
  }
};

// Função para fazer requisições à API IDSF
const makeIDSFRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${IDSF_CONFIG.baseUrl}${endpoint}`,
      headers: {
        ...IDSF_CONFIG.defaultHeaders,
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

// Endpoint para testar conexão com IDSF
router.get('/test-connection', authenticateIDSF, async (req, res) => {
  try {
    const result = await makeIDSFRequest('GET', '/health', null, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Conexão com IDSF estabelecida com sucesso',
        data: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Falha na conexão com IDSF',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro no teste de conexão IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno no teste de conexão' 
    });
  }
});

// Endpoint para buscar informações de uma clínica no IDSF
router.get('/clinica/:cnpj', authenticateIDSF, async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    if (!cnpj || cnpj.length !== 14) {
      return res.status(400).json({ 
        error: 'CNPJ inválido. Deve conter 14 dígitos' 
      });
    }
    
    const result = await makeIDSFRequest('GET', `/clinicas/${cnpj}`, null, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Dados da clínica obtidos com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Erro ao buscar dados da clínica',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar clínica no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar clínica' 
    });
  }
});

// Endpoint para enviar dados de uma clínica para o IDSF
router.post('/clinica', authenticateIDSF, async (req, res) => {
  try {
    const clinicaData = req.body;
    
    // Validações básicas
    if (!clinicaData.cnpj || !clinicaData.razao_social) {
      return res.status(400).json({ 
        error: 'CNPJ e Razão Social são obrigatórios' 
      });
    }
    
    const result = await makeIDSFRequest('POST', '/clinicas', clinicaData, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Clínica cadastrada no IDSF com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Erro ao cadastrar clínica no IDSF',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro ao cadastrar clínica no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao cadastrar clínica' 
    });
  }
});

// Endpoint para atualizar dados de uma clínica no IDSF
router.put('/clinica/:cnpj', authenticateIDSF, async (req, res) => {
  try {
    const { cnpj } = req.params;
    const clinicaData = req.body;
    
    if (!cnpj || cnpj.length !== 14) {
      return res.status(400).json({ 
        error: 'CNPJ inválido. Deve conter 14 dígitos' 
      });
    }
    
    const result = await makeIDSFRequest('PUT', `/clinicas/${cnpj}`, clinicaData, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Dados da clínica atualizados no IDSF com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Erro ao atualizar dados da clínica no IDSF',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar clínica no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao atualizar clínica' 
    });
  }
});

// Endpoint para buscar status de financiamento
router.get('/financiamento/:cnpj', authenticateIDSF, async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    if (!cnpj || cnpj.length !== 14) {
      return res.status(400).json({ 
        error: 'CNPJ inválido. Deve conter 14 dígitos' 
      });
    }
    
    const result = await makeIDSFRequest('GET', `/financiamentos/${cnpj}`, null, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Status do financiamento obtido com sucesso',
        financiamento: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Erro ao buscar status do financiamento',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar financiamento no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar financiamento' 
    });
  }
});

// Endpoint para solicitar financiamento
router.post('/financiamento', authenticateIDSF, async (req, res) => {
  try {
    const financiamentoData = req.body;
    
    // Validações básicas
    if (!financiamentoData.cnpj || !financiamentoData.valor_solicitado) {
      return res.status(400).json({ 
        error: 'CNPJ e valor solicitado são obrigatórios' 
      });
    }
    
    const result = await makeIDSFRequest('POST', '/financiamentos', financiamentoData, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Solicitação de financiamento enviada com sucesso',
        financiamento: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Erro ao solicitar financiamento',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro ao solicitar financiamento no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao solicitar financiamento' 
    });
  }
});

// Endpoint para buscar documentos necessários
router.get('/documentos-necessarios/:tipo', authenticateIDSF, async (req, res) => {
  try {
    const { tipo } = req.params;
    
    const result = await makeIDSFRequest('GET', `/documentos/${tipo}`, null, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Lista de documentos obtida com sucesso',
        documentos: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Erro ao buscar lista de documentos',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar documentos no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar documentos' 
    });
  }
});

// Endpoint para verificar status de análise
router.get('/analise/:cnpj', authenticateIDSF, async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    if (!cnpj || cnpj.length !== 14) {
      return res.status(400).json({ 
        error: 'CNPJ inválido. Deve conter 14 dígitos' 
      });
    }
    
    const result = await makeIDSFRequest('GET', `/analises/${cnpj}`, null, req.idsfHeaders);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Status da análise obtido com sucesso',
        analise: result.data
      });
    } else {
      res.status(result.status).json({
        success: false,
        message: 'Erro ao buscar status da análise',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar análise no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar análise' 
    });
  }
});

module.exports = router;


