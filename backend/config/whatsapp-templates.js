// Configuração de templates WhatsApp
// Templates pré-configurados para diferentes tipos de notificações

const templates = {
	// Templates de notificação de boletos
	BOLETO_VENCE_3_DIAS: {
		name: 'boleto_vence_3_dias',
		message: 'Seu boleto vence em 3 dias.', // Fallback para mensagem simples
		body: 'Olá {{1}}, seu boleto vence em 3 dias. Caso já tenha efetuado o pagamento, desconsidere esta mensagem.', // Template aprovado Twilio
		contentSid: null, // Será configurado quando o template for aprovado no Twilio
		useSimpleText: true, // Mudar para false quando contentSid for configurado
		variables: ['nome'] // Mapeamento: {{1}} = nome
	},
	
	BOLETO_VENCE_1_DIA: {
		name: 'boleto_vence_1_dia',
		message: 'Seu boleto vence em 1 dia.', // Fallback
		body: 'Olá {{1}}, seu boleto vence em 1 dia. Caso já tenha efetuado o pagamento, desconsidere esta mensagem.', // Template aprovado
		contentSid: null,
		useSimpleText: true,
		variables: ['nome'] // Mapeamento: {{1}} = nome
	},
	
	BOLETO_VENCE_HOJE: {
		name: 'boleto_vence_hoje',
		message: 'Seu boleto vence hoje!', // Fallback
		body: 'Olá {{1}}, seu boleto vence hoje. Caso já tenha efetuado o pagamento, desconsidere esta mensagem.', // Template aprovado
		contentSid: null,
		useSimpleText: true,
		variables: ['nome'] // Mapeamento: {{1}} = nome
	},
	
	// Template genérico (pode ser usado para outros casos)
	GENERIC: {
		name: 'generic',
		message: null, // Deve ser fornecido dinamicamente
		contentSid: null,
		useSimpleText: true
	}
};

/**
 * Obtém template por nome
 * @param {string} templateName - Nome do template
 * @returns {Object|null} Template ou null se não encontrado
 */
function getTemplate(templateName) {
	const template = Object.values(templates).find(t => t.name === templateName);
	if (!template) {
		console.warn(`⚠️ Template "${templateName}" não encontrado`);
		return null;
	}
	return template;
}

/**
 * Formata mensagem de template com variáveis
 * Suporta templates aprovados Twilio ({{1}}, {{2}}) e mensagens simples ({nome})
 * @param {string} templateName - Nome do template
 * @param {Object} variables - Variáveis para substituir no template
 * @returns {string|null} Mensagem formatada ou null se template não encontrado
 */
function formatTemplate(templateName, variables = {}) {
	const template = getTemplate(templateName);
	if (!template) {
		return null;
	}
	
	// Prioridade: body (template aprovado Twilio) > message (fallback)
	const templateText = template.body || template.message;
	if (!templateText) {
		return null;
	}
	
	let message = templateText;
	
	// Se tem variáveis definidas no template (formato Twilio {{1}}, {{2}})
	if (template.variables && template.variables.length > 0 && variables) {
		// Mapear variáveis do formato nosso {nome: "João"} para formato Twilio {{1}}
		// Exemplo: variables = {nome: "João"} → substituir {{1}} por "João"
		template.variables.forEach((varName, index) => {
			const twilioPlaceholder = `{{${index + 1}}}`; // {{1}}, {{2}}, etc.
			const value = variables[varName] || '';
			// Substituir todas as ocorrências do placeholder
			message = message.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), value);
		});
	} else if (variables && Object.keys(variables).length > 0) {
		// Fallback: substituir variáveis básicas {chave} por valor
		Object.keys(variables).forEach(key => {
			const regex = new RegExp(`\\{${key}\\}`, 'g');
			message = message.replace(regex, variables[key] || '');
		});
	}
	
	return message;
}

module.exports = {
	templates,
	getTemplate,
	formatTemplate
};


