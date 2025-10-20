const express = require('express');
const router = express.Router();
const metaAdsController = require('../controllers/meta-ads.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Rotas de Meta Ads

// === META ADS PRICING ===

// GET /api/meta-ads/pricing - Listar pricing
router.get('/meta-ads/pricing', authenticateToken, requireAdmin, metaAdsController.getPricing);

// POST /api/meta-ads/pricing - Criar pricing
router.post('/meta-ads/pricing', authenticateToken, requireAdmin, metaAdsController.createPricing);

// PUT /api/meta-ads/pricing/:id - Atualizar pricing
router.put('/meta-ads/pricing/:id', authenticateToken, requireAdmin, metaAdsController.updatePricing);

// === META ADS LEADS ===

// GET /api/meta-ads/leads - Listar leads do Meta Ads
router.get('/meta-ads/leads', authenticateToken, metaAdsController.getLeads);

// POST /api/meta-ads/leads - Criar lead do Meta Ads
router.post('/meta-ads/leads', authenticateToken, metaAdsController.createLead);

// === META ADS API INTEGRATION ===

// GET /api/meta-ads/test-connection - Testar conexão com Meta Ads API
router.get('/meta-ads/test-connection', authenticateToken, requireAdmin, metaAdsController.testConnection);

// GET /api/meta-ads/token-status - Verificar status do token
router.get('/meta-ads/token-status', authenticateToken, requireAdmin, metaAdsController.getTokenStatus);

// POST /api/meta-ads/extend-token - Renovar token
router.post('/meta-ads/extend-token', authenticateToken, requireAdmin, metaAdsController.extendToken);

// GET /api/meta-ads/campaigns - Buscar campanhas
router.get('/meta-ads/campaigns', authenticateToken, requireAdmin, metaAdsController.getCampaigns);

// GET /api/meta-ads/campaign/:id/adsets - Buscar Ad Sets de uma campanha
router.get('/meta-ads/campaign/:id/adsets', authenticateToken, requireAdmin, metaAdsController.getAdSets);

// GET /api/meta-ads/campaign/:id/insights - Buscar insights de uma campanha
router.get('/meta-ads/campaign/:id/insights', authenticateToken, requireAdmin, metaAdsController.getCampaignInsights);

// POST /api/meta-ads/sync-campaigns - Sincronizar campanhas
router.post('/meta-ads/sync-campaigns', authenticateToken, requireAdmin, metaAdsController.syncCampaigns);

// GET /api/meta-ads/regional-insights - Buscar insights regionais
router.get('/meta-ads/regional-insights', authenticateToken, requireAdmin, metaAdsController.getRegionalInsights);

// GET /api/meta-ads/real-time-insights - Buscar insights em tempo real
router.get('/meta-ads/real-time-insights', authenticateToken, requireAdmin, metaAdsController.getRealTimeInsights);

// GET /api/meta-ads/advanced-metrics - Buscar métricas avançadas
router.get('/meta-ads/advanced-metrics', authenticateToken, requireAdmin, metaAdsController.getAdvancedMetrics);

module.exports = router;

