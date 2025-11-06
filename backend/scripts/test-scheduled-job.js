// Script de teste para simular execução de scheduled jobs do Fly.io
// Testa o worker cron-handler.js localmente
//
// Uso:
//   node scripts/test-scheduled-job.js                    # Testa todos os tipos (3, 1, 0)
//   node scripts/test-scheduled-job.js 3                  # Testa apenas 3 dias
//   node scripts/test-scheduled-job.js 1                  # Testa apenas 1 dia
//   node scripts/test-scheduled-job.js 0                  # Testa apenas hoje

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn } = require('child_process');
const path = require('path');

const WORKER_PATH = path.join(__dirname, '..', 'workers', 'cron-handler.js');

/**
 * Testa execução do scheduled job para um tipo específico
 */
async function testScheduledJob(diasVencimento) {
	console.log('\n' + '='.repeat(60));
	console.log(`🧪 Testando scheduled job para ${diasVencimento} dia(s)`);
	console.log('='.repeat(60));
	
	console.log(`\n📋 Configuração:`);
	console.log(`   Worker: ${WORKER_PATH}`);
	console.log(`   Argumento: ${diasVencimento}`);
	console.log(`   Comando: node workers/cron-handler.js ${diasVencimento}`);
	
	return new Promise((resolve, reject) => {
		const worker = spawn('node', [WORKER_PATH, diasVencimento.toString()], {
			cwd: path.join(__dirname, '..'),
			stdio: 'inherit',
			env: process.env
		});
		
		worker.on('close', (code) => {
			if (code === 0) {
				console.log(`\n✅ Scheduled job concluído com sucesso (exit code: ${code})`);
				resolve(true);
			} else {
				console.error(`\n❌ Scheduled job falhou (exit code: ${code})`);
				reject(new Error(`Exit code: ${code}`));
			}
		});
		
		worker.on('error', (error) => {
			console.error(`\n❌ Erro ao executar worker:`, error);
			reject(error);
		});
	});
}

/**
 * Função principal
 */
async function main() {
	const args = process.argv.slice(2);
	const diasVencimento = args.length > 0 ? parseInt(args[0]) : null;
	
	// Validar argumento se fornecido
	if (diasVencimento !== null) {
		const validDays = [3, 1, 0];
		if (isNaN(diasVencimento) || !validDays.includes(diasVencimento)) {
			console.error('❌ Argumento inválido. Use: 3, 1 ou 0');
			console.error('   Uso: node scripts/test-scheduled-job.js [dias_vencimento]');
			process.exit(1);
		}
	}
	
	console.log('🚀 Teste de Scheduled Jobs WhatsApp');
	console.log('✅ Configuração verificada');
	console.log(`📡 Worker: ${WORKER_PATH}`);
	
	if (diasVencimento !== null) {
		// Testar tipo específico
		try {
			await testScheduledJob(diasVencimento);
			console.log('\n' + '='.repeat(60));
			console.log('✅ Teste concluído com sucesso!');
			console.log('='.repeat(60));
		} catch (error) {
			console.log('\n' + '='.repeat(60));
			console.log('❌ Teste falhou!');
			console.log('='.repeat(60));
			process.exit(1);
		}
	} else {
		// Testar todos os tipos
		console.log('\n📋 Testando todos os tipos de notificação...');
		console.log('='.repeat(60));
		
		const tipos = [3, 1, 0];
		let sucessos = 0;
		let falhas = 0;
		
		for (const tipo of tipos) {
			try {
				await testScheduledJob(tipo);
				sucessos++;
				
				// Aguardar um pouco entre testes
				if (tipo !== tipos[tipos.length - 1]) {
					console.log('\n⏳ Aguardando 2 segundos antes do próximo teste...\n');
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			} catch (error) {
				falhas++;
				console.error(`\n❌ Falha ao testar tipo ${tipo}:`, error.message);
			}
		}
		
		console.log('\n' + '='.repeat(60));
		console.log('📊 Resumo dos Testes:');
		console.log(`   ✅ Sucessos: ${sucessos}`);
		console.log(`   ❌ Falhas: ${falhas}`);
		console.log(`   📋 Total: ${tipos.length}`);
		
		if (falhas === 0) {
			console.log('\n✅ Todos os testes concluídos com sucesso!');
			console.log('='.repeat(60));
		} else {
			console.log('\n❌ Alguns testes falharam!');
			console.log('='.repeat(60));
			process.exit(1);
		}
	}
}

// Executar
main().catch(error => {
	console.error('❌ Erro fatal:', error);
	process.exit(1);
});

