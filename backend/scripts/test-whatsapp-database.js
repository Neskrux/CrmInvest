// Script de teste para WhatsApp usando DADOS REAIS do banco de dados
// Simula 100% o uso real da API
// 
// Uso:
//   node scripts/test-whatsapp-database.js                              # Usa primeiro paciente com telefone
//   node scripts/test-whatsapp-database.js 123                           # Usa paciente ID 123
//   node scripts/test-whatsapp-database.js 123 BOLETO_VENCE_1_DIA        # Com template específico
//   node scripts/test-whatsapp-database.js list                          # Lista pacientes com telefone

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sendBoletoNotification } = require('../services/whatsapp.service');
const { supabaseAdmin } = require('../config/database');

/**
 * Lista pacientes com telefone válido
 */
async function listarPacientes() {
	console.log('\n🔍 Buscando pacientes com telefone válido...\n');
	
	try {
		const { data: pacientes, error } = await supabaseAdmin
			.from('pacientes')
			.select('id, nome, telefone, vencimento, valor_parcela')
			.not('telefone', 'is', null)
			.not('telefone', 'eq', '')
			.limit(10)
			.order('id', { ascending: false });
		
		if (error) {
			throw error;
		}
		
		if (!pacientes || pacientes.length === 0) {
			console.log('⚠️  Nenhum paciente com telefone encontrado.');
			return;
		}
		
		console.log(`✅ Encontrados ${pacientes.length} paciente(s):\n`);
		pacientes.forEach((paciente, index) => {
			const telefoneOculto = paciente.telefone ? `***${paciente.telefone.slice(-4)}` : 'Sem telefone';
			console.log(`${index + 1}. ID: ${paciente.id} | Nome: ${paciente.nome || 'N/A'} | Telefone: ${telefoneOculto}`);
			console.log(`   Vencimento: ${paciente.vencimento || 'N/A'} | Valor: ${paciente.valor_parcela || 'N/A'}\n`);
		});
		
		console.log('\n💡 Use: node scripts/test-whatsapp-database.js <id> para testar com um paciente específico');
	} catch (error) {
		console.error('❌ Erro ao listar pacientes:', error.message);
		throw error;
	}
}

/**
 * Testa notificação de boleto usando dados REAIS do banco de dados
 * Simula 100% o uso real da API
 */
async function testBoletoNotificationWithDatabase() {
	console.log('\n📱 Testando notificação de boleto COM DADOS REAIS DO BANCO...\n');
	
	try {
		// Pegar argumentos da linha de comando
		const args = process.argv.slice(2);
		const pacienteId = args[0] || null;
		const templateType = args[1] || 'BOLETO_VENCE_3_DIAS';
		
		// Validar template_type
		const validTemplateTypes = ['BOLETO_VENCE_3_DIAS', 'BOLETO_VENCE_1_DIA', 'BOLETO_VENCE_HOJE'];
		if (!validTemplateTypes.includes(templateType)) {
			throw new Error(`Template inválido. Use um dos seguintes: ${validTemplateTypes.join(', ')}`);
		}
		
		let paciente;
		
		if (pacienteId) {
			// Buscar paciente específico por ID
			console.log(`🔍 Buscando paciente ID: ${pacienteId}...`);
			const { data, error } = await supabaseAdmin
				.from('pacientes')
				.select('id, nome, telefone, vencimento, valor_parcela')
				.eq('id', pacienteId)
				.single();
			
			if (error) {
				throw new Error(`Erro ao buscar paciente: ${error.message}`);
			}
			
			if (!data) {
				throw new Error(`Paciente não encontrado com ID: ${pacienteId}`);
			}
			
			paciente = data;
		} else {
			// Buscar primeiro paciente com telefone válido
			console.log('🔍 Buscando primeiro paciente com telefone válido...');
			const { data, error } = await supabaseAdmin
				.from('pacientes')
				.select('id, nome, telefone, vencimento, valor_parcela')
				.not('telefone', 'is', null)
				.not('telefone', 'eq', '')
				.limit(1)
				.single();
			
			if (error) {
				throw new Error(`Erro ao buscar paciente: ${error.message}`);
			}
			
			if (!data) {
				throw new Error('Nenhum paciente com telefone encontrado no banco de dados.');
			}
			
			paciente = data;
		}
		
		console.log('\n✅ Paciente encontrado:');
		console.log('   ID:', paciente.id);
		console.log('   Nome:', paciente.nome || 'N/A');
		console.log('   Telefone:', paciente.telefone ? `***${paciente.telefone.slice(-4)}` : 'Sem telefone');
		console.log('   Vencimento:', paciente.vencimento || 'Não informado');
		console.log('   Valor Parcela:', paciente.valor_parcela ? `R$ ${parseFloat(paciente.valor_parcela).toFixed(2)}` : 'Não informado');
		
		if (!paciente.telefone) {
			throw new Error('Paciente não possui número de telefone cadastrado.');
		}
		
		// Validar formato do telefone (deve começar com +)
		let telefoneFormatado = paciente.telefone.trim();
		if (!telefoneFormatado.startsWith('+')) {
			// Se não começa com +, assumir que é brasileiro e adicionar +55
			if (telefoneFormatado.startsWith('55')) {
				telefoneFormatado = '+' + telefoneFormatado;
			} else if (telefoneFormatado.startsWith('0')) {
				telefoneFormatado = '+55' + telefoneFormatado.substring(1);
			} else {
				telefoneFormatado = '+55' + telefoneFormatado;
			}
		}
		
		// Preparar variáveis exatamente como o controller faz
		const variables = {
			nome: paciente.nome || 'Cliente',
			valor: paciente.valor_parcela ? `R$ ${parseFloat(paciente.valor_parcela).toFixed(2)}` : '',
			vencimento: paciente.vencimento || ''
		};
		
		console.log('\n📤 Enviando notificação com dados reais...');
		console.log('📋 Template:', templateType);
		console.log('📋 Variáveis:', variables);
		console.log('📱 Telefone formatado:', telefoneFormatado);
		
		// Enviar notificação (exatamente como o controller faz)
		const result = await sendBoletoNotification({
			to: telefoneFormatado,
			templateType: templateType,
			variables
		});
		
		console.log('\n✅ Notificação de boleto enviada com sucesso!');
		console.log('\n📊 Resultado:');
		console.log('   SID:', result.sid);
		console.log('   Status:', result.status);
		console.log('   Para:', result.to);
		console.log('   De:', result.from);
		console.log('   Criado em:', result.dateCreated);
		console.log('   Paciente ID:', paciente.id);
		console.log('   Paciente Nome:', paciente.nome);
		
		return result;
	} catch (error) {
		console.error('\n❌ Erro ao enviar notificação de boleto:', error.message);
		
		if (error.code === 63015) {
			console.error('\n⚠️  O número não está autorizado a receber mensagens.');
			console.error('   Em Sandbox: Envie "join <seu-codigo-sandbox>" primeiro.');
			console.error('   Em Produção: O número precisa estar na janela de 24h ou usar template aprovado.');
		} else if (error.code === 63016) {
			console.error('\n⚠️  Limite de taxa excedido.');
			console.error('   Em Sandbox: Aguarde 3 segundos entre mensagens.');
			console.error('   Em Produção: Aguarde alguns segundos antes de tentar novamente.');
		} else if (error.code === 63058) {
			console.error('\n⚠️  Destinatário não está inscrito no Sandbox.');
			console.error('   Envie "join <seu-codigo-sandbox>" novamente para o número do Sandbox.');
		} else if (error.code === 63007) {
			console.error('\n⚠️  Template de mensagem inválido.');
			console.error('   O template não foi encontrado ou não está aprovado.');
		} else {
			console.error('\n💥 Erro completo:', error);
		}
		
		throw error;
	}
}

async function main() {
	console.log('🚀 Teste de WhatsApp com Dados Reais do Banco\n');
	console.log('=' .repeat(60));
	
	// Verificar configuração
	if (String(process.env.TWILIO_ENABLED || '').toLowerCase() !== 'true') {
		console.error('\n❌ TWILIO_ENABLED não está configurado como "true"');
		console.error('   Configure no arquivo .env: TWILIO_ENABLED=true');
		process.exit(1);
	}
	
	if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
		console.error('\n❌ TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN não configurados');
		console.error('   Configure no arquivo .env');
		process.exit(1);
	}
	
	console.log('✅ Configuração verificada');
	console.log('📱 Modo:', process.env.TWILIO_MODE === 'production' ? 'PRODUÇÃO' : 'SANDBOX');
	console.log('=' .repeat(60));
	
	// Verificar argumentos da linha de comando
	const args = process.argv.slice(2);
	const comando = args[0];
	
	try {
		if (comando === 'list' || comando === 'l') {
			await listarPacientes();
		} else {
			await testBoletoNotificationWithDatabase();
		}
		
		console.log('\n' + '='.repeat(60));
		console.log('✅ Teste concluído com sucesso!\n');
		process.exit(0);
	} catch (error) {
		console.log('\n' + '='.repeat(60));
		console.error('❌ Teste falhou!\n');
		process.exit(1);
	}
}

// Executar se chamado diretamente
if (require.main === module) {
	main();
}

module.exports = {
	testBoletoNotificationWithDatabase,
	listarPacientes
};


