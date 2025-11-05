// Script de teste para enviar mensagens WhatsApp
// Execute com: node scripts/test-whatsapp.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sendWhatsAppText, sendWhatsAppTemplate, sendBoletoNotification } = require('../services/whatsapp.service');

async function testEnvioSimples() {
	console.log('\n📱 Testando envio de mensagem simples...\n');
	
	try {
		const result = await sendWhatsAppText({
			to: '+554199196790', // Substitua pelo seu número
			body: 'Teste de mensagem via script! ' + new Date().toLocaleString('pt-BR')
		});
		
		console.log('✅ Mensagem enviada com sucesso!');
		console.log('📊 Resultado:', {
			sid: result.sid,
			status: result.status,
			to: result.to,
			from: result.from,
			dateCreated: result.dateCreated
		});
		
		return result;
	} catch (error) {
		console.error('❌ Erro ao enviar mensagem:', error.message);
		
		if (error.code === 63015) {
			console.error('⚠️  O número não está no Sandbox. Envie "join <seu-codigo-sandbox>" primeiro.');
		} else if (error.code === 63016) {
			console.error('⚠️  Limite de taxa excedido. Aguarde 3 segundos entre mensagens.');
		} else if (error.code === 63007) {
			console.error('⚠️  Template de mensagem inválido.');
		} else {
			console.error('💥 Erro completo:', error);
		}
		
		throw error;
	}
}

async function testEnvioTemplate() {
	console.log('\n📱 Testando envio de mensagem com template...\n');
	
	try {
		const result = await sendWhatsAppTemplate({
			to: '+554199196790', // Substitua pelo seu número
			contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', // Appointment Reminder
			variables: {
				'1': new Date().toLocaleDateString('pt-BR'),
				'2': new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
			}
		});
		
		console.log('✅ Template enviado com sucesso!');
		console.log('📊 Resultado:', {
			sid: result.sid,
			status: result.status,
			to: result.to,
			from: result.from,
			dateCreated: result.dateCreated
		});
		
		return result;
	} catch (error) {
		console.error('❌ Erro ao enviar template:', error.message);
		
		if (error.code === 63015) {
			console.error('⚠️  O número não está no Sandbox. Envie "join <seu-codigo-sandbox>" primeiro.');
		} else if (error.code === 63016) {
			console.error('⚠️  Limite de taxa excedido. Aguarde 3 segundos entre mensagens.');
		} else if (error.code === 63007) {
			console.error('⚠️  Template de mensagem inválido.');
		} else {
			console.error('💥 Erro completo:', error);
		}
		
		throw error;
	}
}

async function testBoletoNotification() {
	console.log('\n📱 Testando notificação de boleto...\n');
	
	try {
		const result = await sendBoletoNotification({
			to: '+554199196790', // Substitua pelo seu número
			templateType: 'BOLETO_VENCE_3_DIAS'
		});
		
		console.log('✅ Notificação de boleto enviada com sucesso!');
		console.log('📊 Resultado:', {
			sid: result.sid,
			status: result.status,
			to: result.to,
			from: result.from,
			dateCreated: result.dateCreated
		});
		
		return result;
	} catch (error) {
		console.error('❌ Erro ao enviar notificação de boleto:', error.message);
		
		if (error.code === 63015) {
			console.error('⚠️  O número não está no Sandbox. Envie "join <seu-codigo-sandbox>" primeiro.');
		} else if (error.code === 63016) {
			console.error('⚠️  Limite de taxa excedido. Aguarde 3 segundos entre mensagens.');
		} else if (error.code === 63058) {
			console.error('⚠️  Destinatário não está inscrito no Sandbox.');
			console.error('   Envie "join <seu-codigo-sandbox>" novamente para +14155238886');
		} else {
			console.error('💥 Erro completo:', error);
		}
		
		throw error;
	}
}

async function main() {
	console.log('🚀 Iniciando testes de WhatsApp...\n');
	
	// Verificar configuração
	if (String(process.env.TWILIO_ENABLED || '').toLowerCase() !== 'true') {
		console.error('❌ TWILIO_ENABLED não está configurado como "true"');
		console.error('   Configure no arquivo .env: TWILIO_ENABLED=true');
		process.exit(1);
	}
	
	if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
		console.error('❌ TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN não configurados');
		console.error('   Configure no arquivo .env');
		process.exit(1);
	}
	
	if (!process.env.TWILIO_WHATSAPP_NUMBER) {
		console.error('❌ TWILIO_WHATSAPP_NUMBER não configurado');
		console.error('   Configure no arquivo .env: TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886');
		process.exit(1);
	}
	
	console.log('✅ Configuração verificada');
	console.log('📱 Número WhatsApp:', process.env.TWILIO_WHATSAPP_NUMBER);
	
	// Verificar argumentos da linha de comando
	const args = process.argv.slice(2);
	const testType = args[0] || 'simple';
	
	try {
		if (testType === 'template' || testType === 't') {
			await testEnvioTemplate();
		} else if (testType === 'boleto' || testType === 'b') {
			await testBoletoNotification();
		} else {
			await testEnvioSimples();
		}
		
		console.log('\n✅ Teste concluído com sucesso!\n');
		process.exit(0);
	} catch (error) {
		console.error('\n❌ Teste falhou!\n');
		process.exit(1);
	}
}

// Executar se chamado diretamente
if (require.main === module) {
	main();
}

module.exports = {
	testEnvioSimples,
	testEnvioTemplate,
	testBoletoNotification
};

