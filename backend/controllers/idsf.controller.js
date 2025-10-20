const idsfService = require('../services/idsf.service');

// GET /api/idsf/test-connection - Testar conexão com IDSF
const testConnection = async (req, res) => {
  try {
    if (!idsfService.isConfigured()) {
      return res.status(500).json({ 
        success: false,
        error: 'IDSF API Key não configurada. Entre em contato com developers@idsf.com.br' 
      });
    }

    const result = await idsfService.testConnection();
    
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
};

// GET /api/idsf/clinica/:cnpj - Buscar informações de uma clínica no IDSF
const getClinica = async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    const result = await idsfService.getClinica(cnpj);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Dados da clínica obtidos com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status || 500).json({
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
};

// POST /api/idsf/clinica - Enviar dados de uma clínica para o IDSF
const createClinica = async (req, res) => {
  try {
    const clinicaData = req.body;
    
    const result = await idsfService.createClinica(clinicaData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Clínica cadastrada no IDSF com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status || 500).json({
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
};

// PUT /api/idsf/clinica/:cnpj - Atualizar dados de uma clínica no IDSF
const updateClinica = async (req, res) => {
  try {
    const { cnpj } = req.params;
    const clinicaData = req.body;
    
    const result = await idsfService.updateClinica(cnpj, clinicaData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Dados da clínica atualizados no IDSF com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status || 500).json({
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
};

// GET /api/idsf/financiamento/:cnpj - Buscar status de financiamento
const getFinanciamento = async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    const result = await idsfService.getFinanciamento(cnpj);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Status do financiamento obtido com sucesso',
        financiamento: result.data
      });
    } else {
      res.status(result.status || 500).json({
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
};

// POST /api/idsf/financiamento - Solicitar financiamento
const createFinanciamento = async (req, res) => {
  try {
    const financiamentoData = req.body;
    
    const result = await idsfService.createFinanciamento(financiamentoData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Solicitação de financiamento enviada com sucesso',
        financiamento: result.data
      });
    } else {
      res.status(result.status || 500).json({
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
};

// GET /api/idsf/documentos-necessarios/:tipo - Buscar documentos necessários
const getDocumentosNecessarios = async (req, res) => {
  try {
    const { tipo } = req.params;
    
    const result = await idsfService.getDocumentosNecessarios(tipo);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Lista de documentos obtida com sucesso',
        documentos: result.data
      });
    } else {
      res.status(result.status || 500).json({
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
};

// GET /api/idsf/analise/:cnpj - Verificar status de análise
const getAnalise = async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    const result = await idsfService.getAnalise(cnpj);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Status da análise obtido com sucesso',
        analise: result.data
      });
    } else {
      res.status(result.status || 500).json({
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
};

module.exports = {
  testConnection,
  getClinica,
  createClinica,
  updateClinica,
  getFinanciamento,
  createFinanciamento,
  getDocumentosNecessarios,
  getAnalise
};

