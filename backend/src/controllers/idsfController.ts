import { Response } from 'express';
import { IDSFService } from '../services/idsfService';
import { AuthenticatedRequest } from '../types';

// Instância do serviço IDSF
const idsfService = new IDSFService();

// Controller para testar conexão com IDSF API
export const testConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/idsf/test - Testando conexão');

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada. Entre em contato com developers@idsf.com.br' 
      });
      return;
    }

    const result = await idsfService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Conexão com IDSF estabelecida com sucesso',
        data: result.data
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        message: 'Falha na conexão com IDSF',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao testar conexão IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno no teste de conexão' 
    });
  }
};

// Controller para buscar informações de uma clínica no IDSF
export const getClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { cnpj } = req.params;

    console.log(`🔍 GET /api/idsf/clinica/${cnpj}`);

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada' 
      });
      return;
    }

    const result = await idsfService.getClinica(cnpj!);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Dados da clínica obtidos com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status || 400).json({
        success: false,
        message: 'Erro ao buscar dados da clínica',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao buscar clínica no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar clínica' 
    });
  }
};

// Controller para enviar dados de uma clínica para o IDSF
export const createClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const clinicaData = req.body;

    console.log('📝 POST /api/idsf/clinica');

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada' 
      });
      return;
    }

    const result = await idsfService.createClinica(clinicaData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Clínica cadastrada no IDSF com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status || 400).json({
        success: false,
        message: 'Erro ao cadastrar clínica no IDSF',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao cadastrar clínica no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao cadastrar clínica' 
    });
  }
};

// Controller para atualizar dados de uma clínica no IDSF
export const updateClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { cnpj } = req.params;
    const clinicaData = req.body;

    console.log(`📝 PUT /api/idsf/clinica/${cnpj}`);

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada' 
      });
      return;
    }

    const result = await idsfService.updateClinica(cnpj!, clinicaData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Dados da clínica atualizados no IDSF com sucesso',
        clinica: result.data
      });
    } else {
      res.status(result.status || 400).json({
        success: false,
        message: 'Erro ao atualizar dados da clínica no IDSF',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao atualizar clínica no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao atualizar clínica' 
    });
  }
};

// Controller para buscar status de financiamento
export const getFinanciamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { cnpj } = req.params;

    console.log(`🔍 GET /api/idsf/financiamento/${cnpj}`);

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada' 
      });
      return;
    }

    const result = await idsfService.getFinanciamento(cnpj!);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Status do financiamento obtido com sucesso',
        financiamento: result.data
      });
    } else {
      res.status(result.status || 400).json({
        success: false,
        message: 'Erro ao buscar status do financiamento',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao buscar financiamento no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar financiamento' 
    });
  }
};

// Controller para solicitar financiamento
export const createFinanciamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const financiamentoData = req.body;

    console.log('📝 POST /api/idsf/financiamento');

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada' 
      });
      return;
    }

    const result = await idsfService.createFinanciamento(financiamentoData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Solicitação de financiamento enviada com sucesso',
        financiamento: result.data
      });
    } else {
      res.status(result.status || 400).json({
        success: false,
        message: 'Erro ao solicitar financiamento',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao solicitar financiamento no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao solicitar financiamento' 
    });
  }
};

// Controller para buscar documentos necessários
export const getDocumentosNecessarios = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { tipo } = req.params;

    console.log(`🔍 GET /api/idsf/documentos-necessarios/${tipo}`);

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada' 
      });
      return;
    }

    const result = await idsfService.getDocumentosNecessarios(tipo!);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Lista de documentos obtida com sucesso',
        documentos: result.data
      });
    } else {
      res.status(result.status || 400).json({
        success: false,
        message: 'Erro ao buscar lista de documentos',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao buscar documentos no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar documentos' 
    });
  }
};

// Controller para verificar status de análise
export const getAnalise = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { cnpj } = req.params;

    console.log(`🔍 GET /api/idsf/analise/${cnpj}`);

    if (!idsfService.isConfigured()) {
      res.status(500).json({ 
        success: false, 
        error: 'IDSF API Key não configurada' 
      });
      return;
    }

    const result = await idsfService.getAnalise(cnpj!);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Status da análise obtido com sucesso',
        analise: result.data
      });
    } else {
      res.status(result.status || 400).json({
        success: false,
        message: 'Erro ao buscar status da análise',
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro ao buscar análise no IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar análise' 
    });
  }
};

// Controller para validar CNPJ
export const validateCNPJ = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cnpj } = req.params;

    console.log(`🔍 GET /api/idsf/validate-cnpj/${cnpj}`);

    const isValid = idsfService.validateCNPJ(cnpj!);
    const formattedCNPJ = idsfService.formatCNPJ(cnpj!);
    const cleanCNPJ = idsfService.cleanCNPJ(cnpj!);

    res.json({
      success: true,
      data: {
        cnpj: cleanCNPJ,
        formatted: formattedCNPJ,
        valid: isValid
      }
    });

  } catch (error: any) {
    console.error('Erro ao validar CNPJ:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao validar CNPJ' 
    });
  }
};

// Controller para obter configuração da IDSF
export const getConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/idsf/config');

    const config = idsfService.getConfig();
    
    res.json({
      success: true,
      data: config
    });

  } catch (error: any) {
    console.error('Erro ao obter configuração IDSF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao obter configuração' 
    });
  }
};
