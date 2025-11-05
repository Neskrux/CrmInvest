// Controller de WhatsApp (Sandbox e Produção Twilio)
// Mantido isolado para não interferir nos demais controllers.
const { sendWhatsAppText, sendWhatsAppTemplate, isSandboxMode } = require('../services/whatsapp.service');

async function sendMessage(req, res) {
	try {
		const { to, body } = req.body || {};
		if (!to || !body) {
			return res.status(400).json({
				success: false,
				error: 'Parâmetros inválidos',
				message: 'Campos "to" e "body" são obrigatórios'
			});
		}

		// Validar tamanho máximo da mensagem (1600 caracteres)
		if (body && body.length > 1600) {
			return res.status(400).json({
				success: false,
				error: 'Mensagem muito longa',
				message: 'A mensagem deve ter no máximo 1600 caracteres'
			});
		}

		// Chama o serviço Twilio isolado; sem impacto em outras integrações
		const result = await sendWhatsAppText({ to, body });
		return res.status(200).json({ success: true, data: result });
	} catch (error) {
		console.error('Erro no envio WhatsApp:', error);
		
		// Tratamento específico de erros do Twilio
		if (error.code === 63015) {
			const errorMessage = isSandboxMode()
				? 'O destinatário precisa enviar "join <seu-codigo-sandbox>" para o número do Sandbox primeiro'
				: 'Número não está autorizado a receber mensagens';
			return res.status(400).json({ 
				success: false, 
				error: 'Número não autorizado',
				message: errorMessage
			});
		}
		
		if (error.code === 63016) {
			const errorMessage = isSandboxMode()
				? 'Sandbox permite apenas 1 mensagem a cada 3 segundos'
				: 'Limite de taxa excedido. Aguarde alguns segundos antes de tentar novamente';
			return res.status(429).json({ 
				success: false, 
				error: 'Limite de taxa excedido',
				message: errorMessage
			});
		}
		
		if (error.code === 63007) {
			return res.status(400).json({ 
				success: false, 
				error: 'Modelo de mensagem inválido',
				message: 'O modelo de mensagem não foi encontrado ou não está aprovado'
			});
		}
		
		if (error.code === 63058) {
			const errorMessage = isSandboxMode()
				? 'O destinatário precisa enviar "join <seu-codigo-sandbox>" novamente. A sessão do Sandbox expira em 3 dias.'
				: 'O destinatário não está autorizado a receber mensagens neste momento';
			return res.status(400).json({ 
				success: false, 
				error: 'Destinatário não autorizado',
				message: errorMessage
			});
		}

		return res.status(400).json({ 
			success: false, 
			error: error.message || 'Erro no envio',
			code: error.code || null
		});
	}
}

async function sendTemplate(req, res) {
	try {
		const { to, contentSid, variables, statusCallback } = req.body || {};
		
		if (!to || !contentSid) {
			return res.status(400).json({
				success: false,
				error: 'Parâmetros inválidos',
				message: 'Campos "to" e "contentSid" são obrigatórios'
			});
		}

		// Validar formato do contentSid (deve começar com H e ter ~30 caracteres)
		if (typeof contentSid !== 'string' || contentSid.trim().length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Content SID inválido',
				message: 'O contentSid deve ser uma string válida'
			});
		}

		// Chama o serviço Twilio com template
		const result = await sendWhatsAppTemplate({ to, contentSid, variables, statusCallback });
		return res.status(200).json({ success: true, data: result });
	} catch (error) {
		console.error('Erro no envio WhatsApp (template):', error);
		
		// Tratamento específico de erros do Twilio
		if (error.code === 63015) {
			const errorMessage = isSandboxMode()
				? 'O destinatário precisa enviar "join <seu-codigo-sandbox>" para o número do Sandbox primeiro'
				: 'Número não está autorizado a receber mensagens';
			return res.status(400).json({ 
				success: false, 
				error: 'Número não autorizado',
				message: errorMessage
			});
		}
		
		if (error.code === 63016) {
			const errorMessage = isSandboxMode()
				? 'Sandbox permite apenas 1 mensagem a cada 3 segundos'
				: 'Limite de taxa excedido. Aguarde alguns segundos antes de tentar novamente';
			return res.status(429).json({ 
				success: false, 
				error: 'Limite de taxa excedido',
				message: errorMessage
			});
		}
		
		if (error.code === 63007) {
			return res.status(400).json({ 
				success: false, 
				error: 'Modelo de mensagem inválido',
				message: 'O modelo de mensagem não foi encontrado ou não está aprovado'
			});
		}
		
		if (error.code === 63058) {
			const errorMessage = isSandboxMode()
				? 'O destinatário precisa enviar "join <seu-codigo-sandbox>" novamente. A sessão do Sandbox expira em 3 dias.'
				: 'O destinatário não está autorizado a receber mensagens neste momento';
			return res.status(400).json({ 
				success: false, 
				error: 'Destinatário não autorizado',
				message: errorMessage
			});
		}
		
		return res.status(400).json({ 
			success: false, 
			error: error.message || 'Erro no envio com template',
			code: error.code || null
		});
	}
}

async function webhook(req, res) {
	try {
		const { From, WaId, To, Body, MessageSid, NumMedia } = req.body || {};
		
		// Sanitizar dados sensíveis antes de logar
		// Truncar Body para 50 caracteres
		const sanitizedBody = Body && Body.length > 50 
			? `${Body.substring(0, 50)}...` 
			: Body || null;
		
		// Mascarar WaId (mostrar apenas últimos 4 dígitos)
		const sanitizedWaId = WaId 
			? `***${WaId.slice(-4)}` 
			: null;
		
		// Log sanitizado para depuração em Sandbox; não afeta performance das outras rotas
		console.log('WhatsApp IN', { 
			From, 
			WaId: sanitizedWaId, 
			To, 
			Body: sanitizedBody, 
			MessageSid, 
			NumMedia 
		});
		
		res.sendStatus(200);
		// Processamento assíncrono opcional pode continuar aqui
	} catch (error) {
		console.error('Erro no webhook WhatsApp:', error);
		// Retornar 500 para erros críticos em vez de sempre 200
		res.status(500).json({ 
			success: false, 
			error: 'Erro interno no processamento do webhook' 
		});
	}
}

async function statusCallback(req, res) {
	try {
		const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body || {};
		
		// Log sanitizado do status callback (sempre logar, mesmo em produção)
		console.log('📊 [WhatsApp Status Callback]', {
			MessageSid,
			MessageStatus,
			To,
			From: From ? `***${From.slice(-4)}` : null,
			ErrorCode,
			ErrorMessage,
			timestamp: new Date().toISOString()
		});
		
		// Processamento assíncrono opcional pode continuar aqui
		// Ex: Atualizar banco de dados, enviar notificação, etc.
		
		// Sempre retornar 200 OK para o Twilio
		res.status(200).json({ success: true });
	} catch (error) {
		console.error('❌ Erro no status callback WhatsApp:', error);
		// Sempre retornar 200 para evitar reenvios do Twilio
		res.status(200).json({ success: false, error: error.message });
	}
}

module.exports = {
	sendMessage,
	sendTemplate,
	webhook,
	statusCallback
};