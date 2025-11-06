// Worker para executar notificações WhatsApp via Fly.io Scheduled Jobs
// Este arquivo é executado diretamente pelos scheduled jobs do Fly.io
// Uso: node workers/cron-handler.js <dias_vencimento>
// Exemplo: node workers/cron-handler.js 3

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { enviarNotificacoesCron } = require('../controllers/whatsapp-notificacoes.controller');

/**
 * Handler principal para scheduled jobs
 */
async function main() {
	const diasVencimento = parseInt(process.argv[2]);
	
	// Validar argumento
	const validDays = [3, 1, 0];
	if (isNaN(diasVencimento) || !validDays.includes(diasVencimento)) {
		console.error('❌ [SCHEDULED JOB] Argumento inválido. Use: 3, 1 ou 0');
		console.error('   Uso: node workers/cron-handler.js <dias_vencimento>');
		process.exit(1);
	}
	
	console.log(`🚀 [SCHEDULED JOB] Iniciando notificações para ${diasVencimento} dia(s)`);
	console.log(`📅 [SCHEDULED JOB] Timestamp: ${new Date().toISOString()}`);
	
	// Criar objetos req/res simulados para compatibilidade com Express
	const req = {
		body: { dias_vencimento: diasVencimento },
		method: 'POST',
		path: '/internal/scheduled-job',
		headers: {}
	};
	
	let hasResponded = false;
	const res = {
		status: (code) => ({
			json: (data) => {
				if (hasResponded) return;
				hasResponded = true;
				
				if (code >= 200 && code < 300) {
					console.log(`✅ [SCHEDULED JOB] Concluído com sucesso (status ${code})`);
					console.log(`📊 [SCHEDULED JOB] Resultado:`, JSON.stringify(data, null, 2));
					process.exit(0);
				} else {
					console.error(`❌ [SCHEDULED JOB] Erro (status ${code}):`, JSON.stringify(data, null, 2));
					process.exit(1);
				}
			}
		}),
		json: (data) => {
			if (hasResponded) return;
			hasResponded = true;
			console.log(`✅ [SCHEDULED JOB] Concluído com sucesso`);
			console.log(`📊 [SCHEDULED JOB] Resultado:`, JSON.stringify(data, null, 2));
			process.exit(0);
		}
	};
	
	try {
		await enviarNotificacoesCron(req, res);
		
		// Se a função não chamou res.json() ou res.status().json(), tratar como sucesso
		if (!hasResponded) {
			console.log(`✅ [SCHEDULED JOB] Concluído (sem resposta explícita)`);
			process.exit(0);
		}
	} catch (error) {
		console.error('❌ [SCHEDULED JOB] Erro não tratado:', error);
		console.error('❌ [SCHEDULED JOB] Stack:', error.stack);
		process.exit(1);
	}
}

// Executar handler
main();

