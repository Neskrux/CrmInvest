// Middleware para validar assinatura do Twilio webhook
// Valida X-Twilio-Signature para garantir que a requisição vem do Twilio
const twilio = require('twilio');

const validateTwilioWebhook = (req, res, next) => {
	try {
		const authToken = process.env.TWILIO_AUTH_TOKEN;
		
		if (!authToken) {
			console.warn('⚠️ TWILIO_AUTH_TOKEN não configurado. Validação de webhook desabilitada.');
			// Em desenvolvimento, permitir passar sem validação se não estiver configurado
			if (process.env.NODE_ENV === 'development') {
				return next();
			}
			return res.status(500).json({ 
				success: false, 
				error: 'Configuração de segurança ausente' 
			});
		}

		const signature = req.headers['x-twilio-signature'];
		
		if (!signature) {
			console.warn('⚠️ Webhook recebido sem assinatura X-Twilio-Signature');
			return res.status(403).json({ 
				success: false, 
				error: 'Assinatura ausente' 
			});
		}

		// Construir URL completa para validação
		const protocol = req.protocol || 'http';
		const host = req.get('host');
		const url = `${protocol}://${host}${req.originalUrl}`;

		// Validar assinatura usando Twilio
		const isValid = twilio.validateRequest(
			authToken,
			signature,
			url,
			req.body
		);

		if (!isValid) {
			console.warn('⚠️ Webhook recebido com assinatura inválida');
			return res.status(403).json({ 
				success: false, 
				error: 'Assinatura inválida' 
			});
		}

		// Assinatura válida, prosseguir
		next();
	} catch (error) {
		console.error('❌ Erro ao validar webhook Twilio:', error);
		return res.status(500).json({ 
			success: false, 
			error: 'Erro na validação do webhook' 
		});
	}
};

module.exports = {
	validateTwilioWebhook
};