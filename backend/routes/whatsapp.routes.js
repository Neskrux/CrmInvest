// Rotas de WhatsApp
// Este arquivo registra apenas endpoints específicos do WhatsApp (Sandbox Twilio)
// e é montado sob /api/whatsapp, não interferindo nas outras rotas.
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const whatsappNotificacoesController = require('../controllers/whatsapp-notificacoes.controller');
const { authenticateToken } = require('../middleware/auth');
const { validateTwilioWebhook } = require('../middleware/twilioWebhook');
const { webhookLimiter, whatsappSandboxLimiter, whatsappProductionLimiter } = require('../middleware/rateLimiter');
const { isSandboxMode } = require('../services/whatsapp.service');

// Selecionar rate limiter baseado no ambiente
const getWhatsAppRateLimiter = () => {
	return isSandboxMode() ? whatsappSandboxLimiter : whatsappProductionLimiter;
};

// Middleware de debug temporário
const debugMiddleware = (req, res, next) => {
	console.log('🔍 [DEBUG] Webhook recebido:', {
		method: req.method,
		path: req.path,
		url: req.url,
		headers: Object.keys(req.headers),
		hasBody: !!req.body,
		bodyKeys: req.body ? Object.keys(req.body) : []
	});
	next();
};

// Webhook público do Twilio (WhatsApp Sandbox/Business)
// Protegido por validação de assinatura X-Twilio-Signature e rate limiting
// Validação habilitada em produção, desabilitada em desenvolvimento
const webhookMiddleware = process.env.NODE_ENV === 'production' 
	? [webhookLimiter, validateTwilioWebhook, whatsappController.webhook]
	: [debugMiddleware, webhookLimiter, whatsappController.webhook]; // Debug apenas em dev

router.post('/webhook', ...webhookMiddleware);

// Status callback público do Twilio (atualizações de status de mensagens)
// PÚBLICO - Não requer autenticação (Twilio chama diretamente)
// Skip autenticação mesmo se houver middleware global
router.post('/status', webhookLimiter, (req, res, next) => {
	// Log para debug
	if (process.env.NODE_ENV === 'development') {
		console.log('📊 [STATUS CALLBACK] Requisição recebida:', {
			method: req.method,
			path: req.path,
			headers: Object.keys(req.headers),
			hasBody: !!req.body
		});
	}
	next();
}, whatsappController.statusCallback);

// Envio manual/protegido
// Protegido por auth e rate limiting (condicional: Sandbox ou Produção)
router.post('/send', authenticateToken, getWhatsAppRateLimiter(), whatsappController.sendMessage);

// Envio com template (business-initiated)
// Protegido por auth e rate limiting (condicional: Sandbox ou Produção)
router.post('/send-template', authenticateToken, getWhatsAppRateLimiter(), whatsappController.sendTemplate);

// Notificações de boletos
// Protegido por auth e rate limiting (condicional: Sandbox ou Produção)
router.post('/notificacoes/boleto', authenticateToken, getWhatsAppRateLimiter(), whatsappNotificacoesController.enviarNotificacaoBoleto);
router.post('/notificacoes/boletos/automaticas', authenticateToken, whatsappNotificacoesController.enviarNotificacoesAutomaticas);

module.exports = router;