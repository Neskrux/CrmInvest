// Script de verificação de configuração WhatsApp
// Execute com: node scripts/verify-whatsapp-config.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { isSandboxMode, isProductionMode } = require('../services/whatsapp.service');
const { templates } = require('../config/whatsapp-templates');

async function verifyConfiguration() {
	console.log('🔍 Verificando configuração WhatsApp...\n');
	
	const errors = [];
	const warnings = [];
	const info = [];
	
	// 1. Verificar variáveis básicas
	console.log('📋 Variáveis de Ambiente:');
	
	if (String(process.env.TWILIO_ENABLED || '').toLowerCase() !== 'true') {
		errors.push('TWILIO_ENABLED não está configurado como "true"');
	} else {
		console.log('  ✅ TWILIO_ENABLED: true');
	}
	
	if (!process.env.TWILIO_ACCOUNT_SID) {
		errors.push('TWILIO_ACCOUNT_SID não configurado');
	} else {
		console.log(`  ✅ TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`);
	}
	
	if (!process.env.TWILIO_AUTH_TOKEN) {
		errors.push('TWILIO_AUTH_TOKEN não configurado');
	} else {
		console.log(`  ✅ TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN.substring(0, 10)}...`);
	}
	
	// 2. Detectar ambiente
	console.log('\n🌍 Ambiente Detectado:');
	const isSandbox = isSandboxMode();
	const isProduction = isProductionMode();
	
	if (isSandbox) {
		console.log('  ⚠️  Modo: SANDBOX');
		warnings.push('Executando em modo Sandbox');
	} else {
		console.log('  ✅ Modo: PRODUÇÃO');
	}
	
	if (process.env.TWILIO_MODE) {
		console.log(`  ℹ️  TWILIO_MODE configurado: ${process.env.TWILIO_MODE}`);
	} else {
		console.log('  ℹ️  TWILIO_MODE não configurado (auto-detectado)');
	}
	
	// 3. Verificar configuração de número/Messaging Service
	console.log('\n📱 Configuração de Envio:');
	
	if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
		console.log(`  ✅ Messaging Service: ${process.env.TWILIO_MESSAGING_SERVICE_SID.substring(0, 10)}...`);
		info.push('Usando Messaging Service (recomendado para produção)');
	} else {
		warnings.push('TWILIO_MESSAGING_SERVICE_SID não configurado');
	}
	
	if (process.env.TWILIO_WHATSAPP_NUMBER) {
		console.log(`  ✅ Número WhatsApp: ${process.env.TWILIO_WHATSAPP_NUMBER}`);
	} else if (!process.env.TWILIO_MESSAGING_SERVICE_SID) {
		errors.push('TWILIO_WHATSAPP_NUMBER ou TWILIO_MESSAGING_SERVICE_SID deve estar configurado');
	}
	
	// 4. Verificar webhooks
	console.log('\n🔗 Webhooks:');
	
	if (process.env.TWILIO_WHATSAPP_WEBHOOK_URL) {
		console.log(`  ✅ Webhook URL: ${process.env.TWILIO_WHATSAPP_WEBHOOK_URL}`);
	} else {
		warnings.push('TWILIO_WHATSAPP_WEBHOOK_URL não configurado');
	}
	
	if (process.env.TWILIO_WHATSAPP_STATUS_CALLBACK_URL) {
		console.log(`  ✅ Status Callback URL: ${process.env.TWILIO_WHATSAPP_STATUS_CALLBACK_URL}`);
	} else {
		console.log('  ℹ️  Status Callback URL: será gerado automaticamente do WEBHOOK_URL');
	}
	
	// 5. Verificar templates
	console.log('\n📝 Templates:');
	
	const templateKeys = ['BOLETO_VENCE_3_DIAS', 'BOLETO_VENCE_1_DIA', 'BOLETO_VENCE_HOJE'];
	templateKeys.forEach(key => {
		const template = templates[key];
		if (!template) {
			errors.push(`Template ${key} não encontrado`);
			return;
		}
		
		if (template.contentSid) {
			console.log(`  ✅ ${key}: Content SID configurado (${template.contentSid.substring(0, 10)}...)`);
			if (template.useSimpleText) {
				warnings.push(`Template ${key}: useSimpleText ainda está true, mas contentSid está configurado`);
			}
		} else {
			console.log(`  ⚠️  ${key}: Content SID não configurado (usando mensagem simples)`);
			if (isProduction) {
				warnings.push(`Template ${key}: Content SID não configurado - em produção, use templates aprovados para números novos`);
			}
		}
		
		if (!template.body) {
			warnings.push(`Template ${key}: campo 'body' não configurado`);
		}
		
		if (!template.variables || template.variables.length === 0) {
			warnings.push(`Template ${key}: campo 'variables' não configurado`);
		}
	});
	
	// 6. Testar conectividade (opcional)
	console.log('\n🔌 Conectividade:');
	console.log('  ⏭️  Pulando teste de conectividade (não implementado)');
	console.log('  ℹ️  Para testar envio real, use: node scripts/test-whatsapp.js');
	
	// 7. Resumo
	console.log('\n' + '='.repeat(50));
	console.log('📊 RESUMO DA VERIFICAÇÃO\n');
	
	if (errors.length === 0) {
		console.log('✅ Nenhum erro encontrado!');
	} else {
		console.log(`❌ ${errors.length} erro(s) encontrado(s):`);
		errors.forEach((error, index) => {
			console.log(`   ${index + 1}. ${error}`);
		});
	}
	
	if (warnings.length > 0) {
		console.log(`\n⚠️  ${warnings.length} aviso(s):`);
		warnings.forEach((warning, index) => {
			console.log(`   ${index + 1}. ${warning}`);
		});
	}
	
	if (info.length > 0) {
		console.log(`\nℹ️  Informações:`);
		info.forEach((info, index) => {
			console.log(`   ${index + 1}. ${info}`);
		});
	}
	
	console.log('\n' + '='.repeat(50));
	
	if (errors.length > 0) {
		console.log('\n❌ Configuração incompleta. Corrija os erros acima.');
		process.exit(1);
	} else {
		console.log('\n✅ Configuração válida!');
		process.exit(0);
	}
}

// Executar se chamado diretamente
if (require.main === module) {
	verifyConfiguration().catch(error => {
		console.error('\n❌ Erro ao verificar configuração:', error);
		process.exit(1);
	});
}

module.exports = {
	verifyConfiguration
};


