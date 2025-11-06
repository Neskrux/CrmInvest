// Serviço de integração com Twilio WhatsApp
// Este módulo é autocontido e só é ativado quando TWILIO_ENABLED=true.
// Não interfere em outros serviços do backend.
const twilio = require('twilio');
const { formatTemplate, templates } = require('../config/whatsapp-templates');

const isTwilioEnabled = String(process.env.TWILIO_ENABLED || '').toLowerCase() === 'true';
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // ex: whatsapp:+14176703588
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID; // Opcional, para produção

// Detecção de ambiente
const twilioMode = process.env.TWILIO_MODE?.toLowerCase();
const isSandboxNumber = whatsappFromNumber && whatsappFromNumber.includes('+14155238886');

/**
 * Detecta se está em modo Sandbox
 * @returns {boolean} true se estiver em Sandbox
 */
function isSandbox() {
	if (twilioMode === 'sandbox') return true;
	if (twilioMode === 'production') return false;
	return isSandboxNumber; // Auto-detecta pelo número
}

/**
 * Detecta se está em modo Sandbox (wrapper)
 * @returns {boolean} true se estiver em Sandbox
 */
function isSandboxMode() {
	return isSandbox();
}

/**
 * Detecta se está em modo Produção
 * @returns {boolean} true se estiver em Produção
 */
function isProductionMode() {
	return !isSandbox();
}

// Variáveis para uso interno
const _isProductionMode = isProductionMode();
const _isSandboxMode = isSandboxMode();

// Instancia o client apenas quando habilitado e com credenciais, evitando
// qualquer efeito colateral em ambientes onde o Twilio não é usado
const client = isTwilioEnabled && accountSid && authToken
	? twilio(accountSid, authToken)
	: null;

function ensureConfigured() {
	if (!isTwilioEnabled) throw new Error('Twilio está desabilitado (TWILIO_ENABLED=false).');
	if (!client) throw new Error('Twilio não configurado (verifique SID e AUTH TOKEN).');
	
	// Em produção, validar MessagingServiceSid ou número
	if (_isProductionMode) {
		if (!messagingServiceSid && !whatsappFromNumber) {
			throw new Error('Em produção, configure TWILIO_MESSAGING_SERVICE_SID ou TWILIO_WHATSAPP_NUMBER.');
		}
	} else {
		// Em Sandbox, número é obrigatório
		if (!whatsappFromNumber) {
			throw new Error('Número WhatsApp de origem ausente (TWILIO_WHATSAPP_NUMBER).');
		}
	}
}

/**
 * Obtém URL de status callback configurada
 * @returns {string|null} URL do status callback ou null
 */
function getStatusCallbackUrl() {
	// Usar URL específica se configurada
	if (process.env.TWILIO_WHATSAPP_STATUS_CALLBACK_URL) {
		return process.env.TWILIO_WHATSAPP_STATUS_CALLBACK_URL;
	}
	
	// Fallback: usar webhook URL + /status
	if (process.env.TWILIO_WHATSAPP_WEBHOOK_URL) {
		const baseUrl = process.env.TWILIO_WHATSAPP_WEBHOOK_URL.replace(/\/$/, '');
		return `${baseUrl}/api/whatsapp/status`;
	}
	
	return null;
}

/**
 * Normaliza número de telefone para formato E.164 usado pelo Twilio WhatsApp
 * Formato E.164: +[código do país][número] (ex: +5511999999999 para Brasil)
 * Documentação Twilio: https://www.twilio.com/docs/glossary/what-e164
 * 
 * @param {string} to - Número de telefone (pode estar em vários formatos)
 * @returns {string} Número formatado como whatsapp:+[E.164]
 */
function normalizeToWhatsApp(to) {
	if (!to) {
		throw new Error('Número de telefone não fornecido.');
	}

	// Remover prefixo whatsapp: se existir
	let cleaned = to.replace(/^whatsapp:/i, '');
	
	// Remover todos caracteres não numéricos exceto + no início
	const hasPlus = cleaned.startsWith('+');
	let numbersOnly = cleaned.replace(/\D/g, '');

	// Se já tem código de país (começa com +), usar como está
	if (hasPlus) {
		cleaned = '+' + numbersOnly;
	} else {
		// Números brasileiros: DDD (2 dígitos) + número (8 ou 9 dígitos)
		// Padrão: 11 dígitos (DDD + 9 dígitos) ou 10 dígitos (DDD + 8 dígitos)
		// DDDs brasileiros: 11-99 (excluindo 90-99 que são outros serviços)
		const isBrazilianNumber = /^[1-9][1-9]\d{8,9}$/.test(numbersOnly) && 
		                          (numbersOnly.length === 10 || numbersOnly.length === 11);
		
		if (isBrazilianNumber && !numbersOnly.startsWith('55')) {
			// Adicionar código do Brasil (55) conforme E.164
			cleaned = '+55' + numbersOnly;
		} else if (numbersOnly.length >= 10 && numbersOnly.length <= 15) {
			// Número internacional sem código de país detectado
			// Adicionar + assumindo que é um número válido
			cleaned = '+' + numbersOnly;
		} else {
			cleaned = numbersOnly;
		}
	}

	// Validar comprimento E.164 (mínimo 10 dígitos incluindo código do país)
	const numberLength = cleaned.replace(/\D/g, '').length;
	if (numberLength < 10 || numberLength > 15) {
		throw new Error(`Número de telefone inválido: deve ter entre 10 e 15 dígitos no formato E.164 (recebido: ${numberLength} dígitos).`);
	}

	// Validar formato E.164: deve começar com + seguido de dígitos
	if (!cleaned.startsWith('+')) {
		cleaned = '+' + cleaned;
	}

	// Validar que o número está no formato E.164 correto
	if (!/^\+\d{10,15}$/.test(cleaned)) {
		throw new Error(`Número de telefone em formato inválido. Use formato E.164: +[código país][número] (ex: +5511999999999). Recebido: ${to}`);
	}

	return `whatsapp:${cleaned}`;
}

async function sendWhatsAppText({ to, body, statusCallback }) {
	ensureConfigured();
	if (!to || !body) throw new Error('Parâmetros inválidos: to e body são obrigatórios.');

	try {
		const toFormatted = normalizeToWhatsApp(to);
		
		// Construir payload do envio
		const messageParams = {
			to: toFormatted,
			body: String(body).trim()
		};
		
		// Em produção, usar MessagingServiceSid se configurado
		if (_isProductionMode && messagingServiceSid) {
			messageParams.messagingServiceSid = messagingServiceSid;
		} else {
			// Fallback para número direto (Sandbox ou produção sem Messaging Service)
			if (!whatsappFromNumber) {
				throw new Error('Número WhatsApp de origem ausente (TWILIO_WHATSAPP_NUMBER).');
			}
			messageParams.from = whatsappFromNumber;
		}
		
		// Adicionar status callback se configurado
		const callbackUrl = statusCallback || getStatusCallbackUrl();
		if (callbackUrl) {
			messageParams.statusCallback = callbackUrl;
		}
		
		const message = await client.messages.create(messageParams);

		return {
			sid: message.sid,
			status: message.status,
			to: message.to,
			from: message.from || message.messagingServiceSid,
			body: message.body,
			dateCreated: message.dateCreated
		};
	} catch (error) {
		// Preservar código de erro do Twilio ao lançar exceção
		if (error.code) {
			const twilioError = new Error(error.message || 'Erro no envio via Twilio');
			twilioError.code = error.code;
			throw twilioError;
		}
		throw error;
	}
}

/**
 * Envia mensagem WhatsApp usando template aprovado (Content SID)
 * Necessário para mensagens business-initiated ou fora da janela de 24h
 * @param {Object} params - Parâmetros
 * @param {string} params.to - Número destino (ex: +5511999999999 ou whatsapp:+5511999999999)
 * @param {string} params.contentSid - Content SID do template (ex: Hxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
 * @param {Object} params.variables - Variáveis do template (ex: {"1":"CRM Invest","2":"123456"})
 * @param {string} [params.statusCallback] - URL opcional para status callback
 * @returns {Promise} Resultado do envio (com .sid, .status, etc)
 */
async function sendWhatsAppTemplate({ to, contentSid, variables, statusCallback }) {
	ensureConfigured();
	if (!to || !contentSid) {
		throw new Error('Parâmetros inválidos: "to" e "contentSid" são obrigatórios.');
	}

	// Validar variables (pode ser string JSON ou objeto)
	let contentVariables = null;
	if (variables) {
		if (typeof variables === 'string') {
			try {
				contentVariables = JSON.parse(variables);
			} catch (e) {
				throw new Error('Variáveis do template devem ser JSON válido.');
			}
		} else if (typeof variables === 'object') {
			contentVariables = variables;
		}
	}

	const toFormatted = normalizeToWhatsApp(to);
	
	// Construir payload do envio
	const messageParams = {
		to: toFormatted,
		contentSid: contentSid.trim()
	};
	
	// Em produção, usar MessagingServiceSid se configurado
	if (_isProductionMode && messagingServiceSid) {
		messageParams.messagingServiceSid = messagingServiceSid;
	} else {
		// Fallback para número direto (Sandbox ou produção sem Messaging Service)
		if (!whatsappFromNumber) {
			throw new Error('Número WhatsApp de origem ausente (TWILIO_WHATSAPP_NUMBER).');
		}
		messageParams.from = whatsappFromNumber;
	}

	// Adicionar contentVariables se fornecido
	if (contentVariables) {
		messageParams.contentVariables = JSON.stringify(contentVariables);
	}

	// Adicionar statusCallback se fornecido
	const callbackUrl = statusCallback || getStatusCallbackUrl();
	if (callbackUrl) {
		messageParams.statusCallback = callbackUrl;
	}

	try {
		const message = await client.messages.create(messageParams);

		// Log para observabilidade (sem dados sensíveis)
		console.log('[WhatsApp Template]', {
			to: toFormatted,
			contentSid,
			variablesKeys: contentVariables ? Object.keys(contentVariables).join(',') : 'none',
			sid: message.sid,
			status: message.status
		});

		return {
			sid: message.sid,
			status: message.status,
			to: message.to,
			from: message.from || message.messagingServiceSid,
			dateCreated: message.dateCreated
		};
	} catch (error) {
		// Preservar código de erro do Twilio ao lançar exceção
		if (error.code) {
			const twilioError = new Error(error.message || 'Erro no envio via Twilio');
			twilioError.code = error.code;
			throw twilioError;
		}
		throw error;
	}
}

/**
 * Envia notificação de boleto usando template pré-configurado
 * @param {Object} params - Parâmetros
 * @param {string} params.to - Número destino (ex: +5511999999999)
 * @param {string} params.templateType - Tipo de template: 'BOLETO_VENCE_3_DIAS', 'BOLETO_VENCE_1_DIA', 'BOLETO_VENCE_HOJE'
 * @param {Object} [params.variables] - Variáveis opcionais para o template (nome, valor, etc.)
 * @param {string} [params.statusCallback] - URL opcional para status callback
 * @returns {Promise} Resultado do envio (com .sid, .status, etc)
 */
async function sendBoletoNotification({ to, templateType, variables = {}, statusCallback }) {
	ensureConfigured();
	if (!to || !templateType) {
		throw new Error('Parâmetros inválidos: "to" e "templateType" são obrigatórios.');
	}

	// Validar tipo de template
	const validTemplateTypes = ['BOLETO_VENCE_3_DIAS', 'BOLETO_VENCE_1_DIA', 'BOLETO_VENCE_HOJE'];
	if (!validTemplateTypes.includes(templateType)) {
		throw new Error(`Tipo de template inválido. Use um dos seguintes: ${validTemplateTypes.join(', ')}`);
	}

	// Obter template
	const template = templates[templateType];
	if (!template) {
		throw new Error(`Template "${templateType}" não encontrado.`);
	}

	// Verificar se deve usar Content SID (template aprovado) ou mensagem simples
	if (template.contentSid && !template.useSimpleText) {
		// ============================================
		// TEMPLATE APROVADO TWILIO (Content API)
		// ============================================
		// Mapear variáveis para formato Twilio: {nome: "João"} → {"1": "João"}
		// Conforme documentação: https://www.twilio.com/docs/content/using-variables-with-content-api
		const twilioVariables = {};
		
		if (template.variables && template.variables.length > 0) {
			template.variables.forEach((varName, index) => {
				const twilioKey = String(index + 1); // "1", "2", "3", etc. (string)
				twilioVariables[twilioKey] = variables[varName] || '';
			});
		}
		
		// Enviar usando Content API (template aprovado)
		// contentVariables deve ser um objeto que será serializado para JSON pela Twilio
		return await sendWhatsAppTemplate({
			to,
			contentSid: template.contentSid,
			variables: twilioVariables, // Formato: {"1": "João", "2": "valor2"}
			statusCallback
		});
	} else {
		// ============================================
		// MENSAGEM SIMPLES (fallback - dentro da janela de 24h)
		// ============================================
		// Formatar mensagem do template com variáveis substituídas no texto
		const messageBody = formatTemplate(template.name, variables);
		if (!messageBody) {
			throw new Error(`Não foi possível formatar o template "${templateType}".`);
		}
		
		// Enviar mensagem simples (texto já formatado)
		return await sendWhatsAppText({
			to,
			body: messageBody, // Texto já com variáveis substituídas
			statusCallback
		});
	}
}

module.exports = {
	sendWhatsAppText,
	sendWhatsAppTemplate,
	sendBoletoNotification,
	isSandbox,
	isSandboxMode,
	isProductionMode
};


