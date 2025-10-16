import { Response } from 'express';
import { MetaAdsService } from '../services/metaAdsService';
import { AuthenticatedRequest } from '../types';

// Instância do serviço Meta Ads
const metaAdsService = new MetaAdsService();

// Controller para testar conexão com Meta Ads API
export const testConnection = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 GET /api/meta-ads/test - Testando conexão');

    const result = await metaAdsService.testConnection();
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        campaignsCount: result.campaignsCount,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao testar conexão Meta Ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter informações do token
export const getTokenInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/meta-ads/token-info');

    const tokenInfo = await metaAdsService.getTokenInfo();
    const expirationInfo = await metaAdsService.checkTokenExpiration();
    
    res.json({
      success: true,
      data: {
        tokenInfo,
        expiration: expirationInfo
      }
    });

  } catch (error: any) {
    console.error('Erro ao obter informações do token:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para renovar token
export const renewToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔄 POST /api/meta-ads/renew-token');

    const result = await metaAdsService.extendToken();
    
    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: result
    });

  } catch (error: any) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para listar campanhas
export const getCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { status = 'ACTIVE' } = req.query;

    console.log('📊 GET /api/meta-ads/campaigns - Status:', status);

    const campaigns = await metaAdsService.getCampaigns(status as 'ACTIVE' | 'PAUSED' | 'ALL');
    
    res.json({
      success: true,
      data: campaigns
    });

  } catch (error: any) {
    console.error('Erro ao buscar campanhas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para obter insights de campanha
export const getCampaignInsights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { campaignId } = req.params;
    const { dateRange = 'last_30d' } = req.query;

    if (!campaignId) {
      res.status(400).json({ 
        success: false, 
        error: 'ID da campanha é obrigatório' 
      });
      return;
    }

    console.log(`📊 GET /api/meta-ads/campaigns/${campaignId}/insights - Range:`, dateRange);

    const insights = await metaAdsService.getCampaignInsights(campaignId, dateRange as string);
    
    res.json({
      success: true,
      data: insights
    });

  } catch (error: any) {
    console.error('Erro ao buscar insights da campanha:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para obter leads de campanha
export const getCampaignLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { campaignId } = req.params;
    const { dateRange = 'last_30d' } = req.query;

    if (!campaignId) {
      res.status(400).json({ 
        success: false, 
        error: 'ID da campanha é obrigatório' 
      });
      return;
    }

    console.log(`📊 GET /api/meta-ads/campaigns/${campaignId}/leads - Range:`, dateRange);

    const leads = await metaAdsService.getLeads(campaignId, dateRange as string);
    
    res.json({
      success: true,
      data: leads
    });

  } catch (error: any) {
    console.error('Erro ao buscar leads da campanha:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para obter insights regionais
export const getRegionalInsights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { campaignId } = req.params;
    const { dateRange = 'last_30d' } = req.query;

    if (!campaignId) {
      res.status(400).json({ 
        success: false, 
        error: 'ID da campanha é obrigatório' 
      });
      return;
    }

    console.log(`📊 GET /api/meta-ads/campaigns/${campaignId}/regional-insights - Range:`, dateRange);

    const regionalInsights = await metaAdsService.getCostPerLeadByRegion(campaignId, dateRange as string);
    
    res.json({
      success: true,
      data: regionalInsights
    });

  } catch (error: any) {
    console.error('Erro ao buscar insights regionais:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para obter insights detalhados por cidade
export const getDetailedInsights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { campaignId } = req.params;
    const { dateRange = 'last_30d' } = req.query;

    if (!campaignId) {
      res.status(400).json({ 
        success: false, 
        error: 'ID da campanha é obrigatório' 
      });
      return;
    }

    console.log(`📊 GET /api/meta-ads/campaigns/${campaignId}/detailed-insights - Range:`, dateRange);

    const detailedInsights = await metaAdsService.getDetailedInsightsByAdSet(campaignId, dateRange as string);
    
    res.json({
      success: true,
      data: detailedInsights
    });

  } catch (error: any) {
    console.error('Erro ao buscar insights detalhados:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para sincronizar dados de campanhas
export const syncCampaignData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { status = 'ACTIVE' } = req.query;

    console.log('🔄 POST /api/meta-ads/sync-campaigns - Status:', status);

    const campaignData = await metaAdsService.syncCampaignData(status as 'ACTIVE' | 'PAUSED' | 'ALL');
    
    res.json({
      success: true,
      message: 'Dados de campanhas sincronizados com sucesso',
      data: campaignData
    });

  } catch (error: any) {
    console.error('Erro ao sincronizar dados de campanhas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para obter adsets de uma campanha
export const getAdSets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { campaignId } = req.params;

    if (!campaignId) {
      res.status(400).json({ 
        success: false, 
        error: 'ID da campanha é obrigatório' 
      });
      return;
    }

    console.log(`📊 GET /api/meta-ads/campaigns/${campaignId}/adsets`);

    const adSets = await metaAdsService.getAdSets(campaignId);
    
    res.json({
      success: true,
      data: adSets
    });

  } catch (error: any) {
    console.error('Erro ao buscar adsets:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para obter métricas avançadas (apenas admin)
export const getAdvancedMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Apenas admin pode acessar métricas avançadas
    if (req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores podem acessar métricas avançadas' 
      });
      return;
    }

    const { dateRange = 'last_30d' } = req.query;
    
    console.log(`🔄 Buscando métricas avançadas APENAS campanhas ATIVAS para período: ${dateRange}`);
    
    const result = await metaAdsService.getAdvancedMetrics(dateRange as string);
    
    res.json({
      success: true,
      data: result.data,
      summary: result.summary
    });

  } catch (error: any) {
    console.error('Erro ao buscar métricas avançadas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};
