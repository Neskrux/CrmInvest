// Serviço de retry para envio de notificações WhatsApp
// Implementa retry automático com delay exponencial

/**
 * Executa uma função com retry automático
 * @param {Function} fn - Função assíncrona a ser executada
 * @param {Object} options - Opções de retry
 * @param {number} options.maxRetries - Número máximo de tentativas (padrão: 2)
 * @param {number} options.delayMs - Delay inicial em milissegundos (padrão: 1000)
 * @param {Function} options.onRetry - Callback chamado em cada retry (opcional)
 * @returns {Promise} Resultado da função ou erro após todas as tentativas
 */
async function sendWithRetry(fn, options = {}) {
	const maxRetries = options.maxRetries || parseInt(process.env.WHATSAPP_RETRY_MAX_ATTEMPTS || '2', 10);
	const delayMs = options.delayMs || parseInt(process.env.WHATSAPP_RETRY_DELAY_MS || '1000', 10);
	const onRetry = options.onRetry || (() => {});
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const result = await fn();
			
			// Log de sucesso se não foi na primeira tentativa
			if (attempt > 0) {
				console.log(`✅ Retry bem-sucedido na tentativa ${attempt + 1}`);
			}
			
			return result;
		} catch (error) {
			// Se esgotou todas as tentativas, lançar erro
			if (attempt === maxRetries) {
				console.error(`❌ Todas as ${maxRetries + 1} tentativas falharam`);
				throw error;
			}
			
			// Calcular delay exponencial (1s, 2s, 4s...)
			const delay = delayMs * Math.pow(2, attempt);
			
			console.warn(`⚠️ Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms...`, {
				error: error.message,
				code: error.code
			});
			
			// Chamar callback de retry se fornecido
			onRetry(attempt + 1, error, delay);
			
			// Aguardar antes de tentar novamente
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

/**
 * Verifica se um erro é crítico (requer notificação de admin)
 * @param {Error} error - Erro a ser verificado
 * @returns {boolean} true se o erro for crítico
 */
function isCriticalError(error) {
	// Erros críticos: problemas de infraestrutura, API indisponível, etc.
	const criticalCodes = [
		500, // Erro interno do servidor
		503, // Serviço indisponível
		504, // Gateway timeout
	];
	
	const criticalMessages = [
		'ECONNREFUSED',
		'ETIMEDOUT',
		'ENOTFOUND',
		'service unavailable',
		'internal server error',
	];
	
	// Verificar código HTTP
	if (error.status && criticalCodes.includes(error.status)) {
		return true;
	}
	
	// Verificar código do Twilio (erros de API)
	if (error.code && String(error.code).startsWith('5')) {
		return true;
	}
	
	// Verificar mensagem de erro
	const errorMessage = (error.message || '').toLowerCase();
	if (criticalMessages.some(msg => errorMessage.includes(msg))) {
		return true;
	}
	
	return false;
}

module.exports = {
	sendWithRetry,
	isCriticalError
};

