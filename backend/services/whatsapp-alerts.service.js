// Serviço de alertas para notificar admin em falhas críticas
// Usa o serviço de email existente para enviar notificações

const transporter = require('../config/email');
const { isCriticalError } = require('./whatsapp-retry.service');

/**
 * Notifica admin sobre erro crítico nas notificações WhatsApp
 * @param {Error} error - Erro crítico ocorrido
 * @param {Object} context - Contexto adicional do erro
 * @param {string} context.dias_vencimento - Dias de vencimento (3, 1 ou 0)
 * @param {number} context.total_pacientes - Total de pacientes processados
 * @param {number} context.total_erros - Total de erros ocorridos
 * @returns {Promise<void>}
 */
async function notifyAdminOnCriticalError(error, context = {}) {
	try {
		const adminEmail = process.env.WHATSAPP_ADMIN_EMAIL;
		
		// Se não houver email configurado, apenas logar
		if (!adminEmail) {
			console.warn('⚠️ WHATSAPP_ADMIN_EMAIL não configurado. Erro crítico não será notificado por email.');
			console.error('❌ Erro crítico:', error);
			return;
		}
		
		// Verificar se é realmente um erro crítico
		if (!isCriticalError(error)) {
			console.log('ℹ️ Erro não é crítico, não notificando admin');
			return;
		}
		
		// Preparar assunto e corpo do email
		const subject = `🚨 Erro Crítico - Notificações WhatsApp (${context.dias_vencimento || 'N/A'} dias)`;
		
		const body = `
<h2>Erro Crítico no Sistema de Notificações WhatsApp</h2>

<p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>

<h3>Detalhes do Erro:</h3>
<ul>
	<li><strong>Mensagem:</strong> ${error.message || 'Erro desconhecido'}</li>
	<li><strong>Código:</strong> ${error.code || 'N/A'}</li>
	<li><strong>Status HTTP:</strong> ${error.status || 'N/A'}</li>
	<li><strong>Stack:</strong> <pre>${error.stack || 'N/A'}</pre></li>
</ul>

<h3>Contexto:</h3>
<ul>
	<li><strong>Dias de Vencimento:</strong> ${context.dias_vencimento || 'N/A'}</li>
	<li><strong>Total de Pacientes:</strong> ${context.total_pacientes || 'N/A'}</li>
	<li><strong>Total de Erros:</strong> ${context.total_erros || 'N/A'}</li>
</ul>

<p><strong>Ação Requerida:</strong> Verificar logs do sistema e status da API Twilio.</p>

<hr>
<p><small>Este é um email automático do sistema de notificações WhatsApp.</small></p>
		`;
		
		// Enviar email
		await transporter.sendMail({
			from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@crm.com',
			to: adminEmail,
			subject: subject,
			html: body
		});
		
		console.log(`✅ Admin notificado sobre erro crítico: ${adminEmail}`);
	} catch (emailError) {
		// Se falhar ao enviar email, pelo menos logar o erro crítico
		console.error('❌ Erro ao enviar notificação de admin:', emailError);
		console.error('❌ Erro crítico original:', error);
	}
}

/**
 * Notifica admin sobre resumo de execução com muitos erros
 * @param {Object} summary - Resumo da execução
 * @param {number} summary.total_encontrados - Total de pacientes encontrados
 * @param {number} summary.total_enviados - Total de notificações enviadas com sucesso
 * @param {number} summary.total_erros - Total de erros ocorridos
 * @param {number} summary.dias_vencimento - Dias de vencimento
 * @returns {Promise<void>}
 */
async function notifyAdminOnHighErrorRate(summary) {
	try {
		const adminEmail = process.env.WHATSAPP_ADMIN_EMAIL;
		
		if (!adminEmail) {
			return;
		}
		
		// Calcular taxa de erro
		const errorRate = summary.total_encontrados > 0 
			? (summary.total_erros / summary.total_encontrados) * 100 
			: 0;
		
		// Notificar apenas se taxa de erro for alta (> 50%)
		if (errorRate < 50) {
			return;
		}
		
		const subject = `⚠️ Alta Taxa de Erros - Notificações WhatsApp (${summary.dias_vencimento} dias)`;
		
		const body = `
<h2>Alerta: Alta Taxa de Erros nas Notificações WhatsApp</h2>

<p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>

<h3>Resumo da Execução:</h3>
<ul>
	<li><strong>Dias de Vencimento:</strong> ${summary.dias_vencimento}</li>
	<li><strong>Total Encontrados:</strong> ${summary.total_encontrados}</li>
	<li><strong>Total Enviados:</strong> ${summary.total_enviados}</li>
	<li><strong>Total de Erros:</strong> ${summary.total_erros}</li>
	<li><strong>Taxa de Erro:</strong> ${errorRate.toFixed(2)}%</li>
</ul>

<p><strong>Ação Recomendada:</strong> Verificar logs e status da API Twilio. Pode haver problema de conectividade ou configuração.</p>

<hr>
<p><small>Este é um email automático do sistema de notificações WhatsApp.</small></p>
		`;
		
		await transporter.sendMail({
			from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@crm.com',
			to: adminEmail,
			subject: subject,
			html: body
		});
		
		console.log(`✅ Admin notificado sobre alta taxa de erros: ${adminEmail}`);
	} catch (emailError) {
		console.error('❌ Erro ao enviar notificação de alta taxa de erros:', emailError);
	}
}

module.exports = {
	notifyAdminOnCriticalError,
	notifyAdminOnHighErrorRate
};

