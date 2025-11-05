// Controller para notificações de boletos via WhatsApp
const { sendBoletoNotification, isSandboxMode } = require('../services/whatsapp.service');
const { supabaseAdmin } = require('../config/database');

/**
 * Envia notificação de boleto para um paciente específico
 * POST /api/whatsapp/notificacoes/boleto
 */
async function enviarNotificacaoBoleto(req, res) {
	try {
		const { paciente_id, template_type } = req.body || {};
		
		if (!paciente_id || !template_type) {
			return res.status(400).json({
				success: false,
				error: 'Parâmetros inválidos',
				message: 'Campos "paciente_id" e "template_type" são obrigatórios'
			});
		}

		// Validar template_type
		const validTemplateTypes = ['BOLETO_VENCE_3_DIAS', 'BOLETO_VENCE_1_DIA', 'BOLETO_VENCE_HOJE'];
		if (!validTemplateTypes.includes(template_type)) {
			return res.status(400).json({
				success: false,
				error: 'Tipo de template inválido',
				message: `Use um dos seguintes: ${validTemplateTypes.join(', ')}`
			});
		}

		// Buscar dados do paciente
		const { data: paciente, error: pacienteError } = await supabaseAdmin
			.from('pacientes')
			.select('id, nome, telefone, vencimento, valor_parcela')
			.eq('id', paciente_id)
			.single();

		if (pacienteError || !paciente) {
			return res.status(404).json({
				success: false,
				error: 'Paciente não encontrado'
			});
		}

		if (!paciente.telefone) {
			return res.status(400).json({
				success: false,
				error: 'Paciente sem telefone',
				message: 'O paciente não possui número de telefone cadastrado'
			});
		}

		// Preparar variáveis para o template (pode ser expandido no futuro)
		const variables = {
			nome: paciente.nome || 'Cliente',
			valor: paciente.valor_parcela ? `R$ ${parseFloat(paciente.valor_parcela).toFixed(2)}` : '',
			vencimento: paciente.vencimento || ''
		};

		// Enviar notificação
		const result = await sendBoletoNotification({
			to: paciente.telefone,
			templateType: template_type,
			variables
		});

		// Log da notificação enviada
		console.log(`✅ Notificação de boleto enviada:`, {
			paciente_id,
			template_type,
			sid: result.sid,
			status: result.status
		});

		return res.status(200).json({
			success: true,
			data: {
				...result,
				paciente_nome: paciente.nome,
				template_type
			}
		});
	} catch (error) {
		console.error('Erro ao enviar notificação de boleto:', error);
		
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
			error: error.message || 'Erro ao enviar notificação',
			code: error.code || null
		});
	}
}

/**
 * Envia notificações automáticas para todos os boletos que vencem em X dias
 * POST /api/whatsapp/notificacoes/boletos/automaticas
 */
async function enviarNotificacoesAutomaticas(req, res) {
	try {
		const { dias_vencimento } = req.body || {};
		
		// Validar dias_vencimento (deve ser 3, 1 ou 0)
		const validDays = [3, 1, 0];
		if (!validDays.includes(dias_vencimento)) {
			return res.status(400).json({
				success: false,
				error: 'Dias de vencimento inválido',
				message: 'Use 3 (3 dias), 1 (1 dia) ou 0 (hoje)'
			});
		}

		// Mapear dias para template_type
		const templateMap = {
			3: 'BOLETO_VENCE_3_DIAS',
			1: 'BOLETO_VENCE_1_DIA',
			0: 'BOLETO_VENCE_HOJE'
		};
		const templateType = templateMap[dias_vencimento];

		// Calcular data de vencimento
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);
		const dataVencimento = new Date(hoje);
		dataVencimento.setDate(hoje.getDate() + dias_vencimento);
		
		// Formatar data para query (YYYY-MM-DD)
		const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];

		// Buscar pacientes com boletos vencendo na data especificada
		const { data: pacientes, error: pacientesError } = await supabaseAdmin
			.from('pacientes')
			.select('id, nome, telefone, vencimento, valor_parcela')
			.eq('vencimento', dataVencimentoStr)
			.not('telefone', 'is', null)
			.not('telefone', 'eq', '');

		if (pacientesError) {
			throw pacientesError;
		}

		if (!pacientes || pacientes.length === 0) {
			return res.status(200).json({
				success: true,
				message: `Nenhum boleto encontrado vencendo em ${dias_vencimento} dia(s)`,
				data: {
					total_encontrados: 0,
					total_enviados: 0,
					erros: []
				}
			});
		}

		// Enviar notificações para cada paciente
		const resultados = [];
		const erros = [];

		for (const paciente of pacientes) {
			try {
				const variables = {
					nome: paciente.nome || 'Cliente',
					valor: paciente.valor_parcela ? `R$ ${parseFloat(paciente.valor_parcela).toFixed(2)}` : '',
					vencimento: paciente.vencimento || ''
				};

				const result = await sendBoletoNotification({
					to: paciente.telefone,
					templateType: templateType,
					variables
				});

				resultados.push({
					paciente_id: paciente.id,
					paciente_nome: paciente.nome,
					sid: result.sid,
					status: result.status
				});

				// Aguardar 3 segundos entre envios apenas no Sandbox
				if (isSandboxMode()) {
					await new Promise(resolve => setTimeout(resolve, 3100));
				}
			} catch (error) {
				erros.push({
					paciente_id: paciente.id,
					paciente_nome: paciente.nome,
					error: error.message,
					code: error.code
				});
			}
		}

		console.log(`✅ Notificações automáticas processadas:`, {
			template_type: templateType,
			total_encontrados: pacientes.length,
			total_enviados: resultados.length,
			total_erros: erros.length
		});

		return res.status(200).json({
			success: true,
			data: {
				template_type: templateType,
				dias_vencimento,
				total_encontrados: pacientes.length,
				total_enviados: resultados.length,
				total_erros: erros.length,
				resultados,
				erros
			}
		});
	} catch (error) {
		console.error('Erro ao enviar notificações automáticas:', error);
		return res.status(500).json({
			success: false,
			error: error.message || 'Erro ao processar notificações automáticas'
		});
	}
}

module.exports = {
	enviarNotificacaoBoleto,
	enviarNotificacoesAutomaticas
};


