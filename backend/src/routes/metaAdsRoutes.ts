import { Router } from 'express';
import { 
  testConnection,
  getTokenInfo,
  renewToken,
  getCampaigns,
  getCampaignInsights,
  getCampaignLeads,
  getRegionalInsights,
  getDetailedInsights,
  syncCampaignData,
  getAdSets,
  getAdvancedMetrics
} from '../controllers/metaAdsController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de Meta Ads requerem autenticação
router.use(authenticateToken);

// Testar conexão com Meta Ads API
router.get('/test', testConnection as AuthenticatedHandler);

// Informações do token
router.get('/token-info', getTokenInfo as AuthenticatedHandler);

// Renovar token
router.post('/renew-token', renewToken as AuthenticatedHandler);

// Listar campanhas
router.get('/campaigns', getCampaigns as AuthenticatedHandler);

// Sincronizar dados de campanhas
router.post('/sync-campaigns', syncCampaignData as AuthenticatedHandler);

// Insights de campanha específica
router.get('/campaigns/:campaignId/insights', getCampaignInsights as AuthenticatedHandler);

// Leads de campanha específica
router.get('/campaigns/:campaignId/leads', getCampaignLeads as AuthenticatedHandler);

// Insights regionais de campanha específica
router.get('/campaigns/:campaignId/regional-insights', getRegionalInsights as AuthenticatedHandler);

// Insights detalhados por cidade de campanha específica
router.get('/campaigns/:campaignId/detailed-insights', getDetailedInsights as AuthenticatedHandler);

// Adsets de campanha específica
router.get('/campaigns/:campaignId/adsets', getAdSets as AuthenticatedHandler);

// Métricas avançadas (apenas admin)
router.get('/advanced-metrics', getAdvancedMetrics as AuthenticatedHandler);

export default router;
