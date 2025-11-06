// Controller para notificações de boletos via WhatsApp
const { sendBoletoNotification, isSandboxMode } = require('../services/whatsapp.service');
const { supabaseAdmin } = require('../config/database');
const { sendWithRetry, isCriticalError } = require('../services/whatsapp-retry.service');
const { notifyAdminOnCriticalError, notifyAdminOnHighErrorRate } = require('../services/whatsapp-alerts.service');

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

		if (boletosError) {
			throw boletosError;
		}

		if (!boletos || boletos.length === 0) {
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

/**
 * Envia notificações automáticas via Fly.io Scheduled Jobs com controle de duplicidade
 * 
 * Esta função é chamada internamente pelo worker cron-handler.js executado pelos
 * scheduled jobs do Fly.io. Não é mais acessível via HTTP externo.
 * 
 * Os scheduled jobs executam diariamente às 08:00 (America/Sao_Paulo):
 * - boleto-3-dias: chama com dias_vencimento = 3
 * - boleto-1-dia: chama com dias_vencimento = 1
 * - boleto-hoje: chama com dias_vencimento = 0
 * 
 * @param {Object} req - Objeto request (pode ser simulado pelo worker)
 * @param {Object} res - Objeto response (pode ser simulado pelo worker)
 */
async function enviarNotificacoesCron(req, res) {
	let criticalError = null;
	
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

		// Mapear dias para template_type e campo de flag
		const templateMap = {
			3: { template: 'BOLETO_VENCE_3_DIAS', flag: 'notificado_3_dias' },
			1: { template: 'BOLETO_VENCE_1_DIA', flag: 'notificado_1_dia' },
			0: { template: 'BOLETO_VENCE_HOJE', flag: 'notificado_hoje' }
		};
		const { template: templateType, flag: flagField } = templateMap[dias_vencimento];

		// Calcular data de vencimento
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);
		const dataVencimento = new Date(hoje);
		dataVencimento.setDate(hoje.getDate() + dias_vencimento);
		
		// Formatar data para query (YYYY-MM-DD)
		const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];
		
		// Formatar data de hoje para comparação (YYYY-MM-DD)
		const hojeStr = hoje.toISOString().split('T')[0];

		console.log(`📅 [CRON] Processando notificações para ${dias_vencimento} dia(s) - Data vencimento: ${dataVencimentoStr}`);

		// Buscar boletos vencendo na data especificada
		// JOIN com pacientes para obter nome e telefone
		// Filtro: data_vencimento correto + situacao EM ABERTO + telefone válido
		const { data: boletos, error: boletosError } = await supabaseAdmin
			.from('boletos_caixa')
			.select(`
				id,
				paciente_id,
				data_vencimento,
				valor,
				${flagField},
				pacientes!inner(id, nome, telefone)
			`)
			.eq('data_vencimento', dataVencimentoStr)
			.eq('situacao', 'EM ABERTO') // Apenas boletos não pagos
			.not('pacientes.telefone', 'is', null)
			.not('pacientes.telefone', 'eq', '');

		if (boletosError) {
			throw boletosError;
		}

		if (!boletos || boletos.length === 0) {
			console.log(`ℹ️ [CRON] Nenhum boleto encontrado vencendo em ${dias_vencimento} dia(s)`);
			return res.status(200).json({
				success: true,
				message: `Nenhum boleto encontrado vencendo em ${dias_vencimento} dia(s)`,
				data: {
					template_type: templateType,
					dias_vencimento,
					total_encontrados: 0,
					total_enviados: 0,
					total_erros: 0,
					resultados: [],
					erros: []
				}
			});
		}

		console.log(`✅ [CRON] Encontrados ${boletos.length} boleto(s) para notificar`);

		// Agrupar boletos por paciente para evitar spam
		// Um paciente com múltiplos boletos na mesma data recebe UMA mensagem apenas
		const boletosPorPaciente = {};
		
		for (const boleto of boletos) {
			const paciente = boleto.pacientes;
			
			if (!paciente || !paciente.telefone) {
				console.log(`⏭️ [CRON] Boleto ${boleto.id} sem paciente ou telefone, pulando`);
				continue;
			}

			const pacienteId = paciente.id;
			
			if (!boletosPorPaciente[pacienteId]) {
				boletosPorPaciente[pacienteId] = {
					paciente: paciente,
					boletos: [],
					flagValue: null // Pegar a flag do primeiro boleto
				};
			}

			boletosPorPaciente[pacienteId].boletos.push(boleto);
			
			// Se algum boleto já foi notificado hoje, marcar o paciente
			const flagValue = boleto[flagField];
			if (flagValue) {
				const flagDate = new Date(flagValue).toISOString().split('T')[0];
				if (flagDate === hojeStr && !boletosPorPaciente[pacienteId].jaNotificadoHoje) {
					boletosPorPaciente[pacienteId].jaNotificadoHoje = true;
				}
			}
		}

		// Filtrar pacientes que ainda não foram notificados hoje
		const pacientesParaNotificar = Object.values(boletosPorPaciente).filter(pacienteData => {
			if (pacienteData.jaNotificadoHoje) {
				console.log(`⏭️ [CRON] Paciente ${pacienteData.paciente.id} já notificado hoje, pulando`);
				return false;
			}
			return true;
		});

		console.log(`📋 [CRON] Após agrupamento e filtro de duplicidade: ${pacientesParaNotificar.length} paciente(s) para notificar`);

		// Enviar notificações para cada paciente (uma mensagem por paciente, mesmo com múltiplos boletos)
		const resultados = [];
		const erros = [];
		const agora = new Date().toISOString();

		for (const pacienteData of pacientesParaNotificar) {
			const paciente = pacienteData.paciente;
			const boletosPaciente = pacienteData.boletos;

			try {
				// Calcular total de boletos e valores
				const totalBoletos = boletosPaciente.length;
				const valorTotal = boletosPaciente.reduce((sum, b) => sum + (parseFloat(b.valor) || 0), 0);
				const primeiroBoleto = boletosPaciente[0];

				// Preparar variáveis da mensagem
				const variables = {
					nome: paciente.nome || 'Cliente',
					valor: valorTotal > 0 ? `R$ ${valorTotal.toFixed(2)}` : '',
					vencimento: primeiroBoleto.data_vencimento || ''
				};

				// Enviar com retry automático (UMA mensagem por paciente)
				const result = await sendWithRetry(
					() => sendBoletoNotification({
						to: paciente.telefone,
						templateType: templateType,
						variables
					}),
					{
						maxRetries: parseInt(process.env.WHATSAPP_RETRY_MAX_ATTEMPTS || '2', 10),
						delayMs: parseInt(process.env.WHATSAPP_RETRY_DELAY_MS || '1000', 10),
						onRetry: (attempt, error) => {
							console.log(`🔄 [CRON] Retry ${attempt} para paciente ${paciente.id}:`, error.message);
						}
					}
				);

				// Atualizar flag em TODOS os boletos do paciente após envio bem-sucedido
				const boletoIds = boletosPaciente.map(b => b.id);
				const { error: updateError } = await supabaseAdmin
					.from('boletos_caixa')
					.update({ [flagField]: agora })
					.in('id', boletoIds);

				if (updateError) {
					console.error(`⚠️ [CRON] Erro ao atualizar flags dos boletos do paciente ${paciente.id}:`, updateError);
				}

				resultados.push({
					paciente_id: paciente.id,
					paciente_nome: paciente.nome,
					total_boletos: totalBoletos,
					valor_total: valorTotal,
					boletos_ids: boletoIds,
					data_vencimento: primeiroBoleto.data_vencimento,
					sid: result.sid,
					status: result.status
				});

				console.log(`✅ [CRON] Notificação enviada para paciente ${paciente.id} (${paciente.nome}) - ${totalBoletos} boleto(s)`);

				// Aguardar entre envios apenas no Sandbox
				if (isSandboxMode()) {
					await new Promise(resolve => setTimeout(resolve, 3100));
				}
			} catch (error) {
				console.error(`❌ [CRON] Erro ao enviar para paciente ${paciente.id}:`, error.message);
				
				erros.push({
					paciente_id: paciente.id,
					paciente_nome: paciente.nome,
					total_boletos: boletosPaciente.length,
					boletos_ids: boletosPaciente.map(b => b.id),
					error: error.message,
					code: error.code || null
				});

				// Verificar se é erro crítico
				if (!criticalError && isCriticalError(error)) {
					criticalError = error;
				}
			}
		}

		// Notificar admin sobre erros críticos
		if (criticalError) {
			await notifyAdminOnCriticalError(criticalError, {
				dias_vencimento,
				total_pacientes: pacientesParaNotificar.length,
				total_boletos: boletos.length,
				total_erros: erros.length
			});
		}

		// Notificar admin sobre alta taxa de erros
		await notifyAdminOnHighErrorRate({
			total_encontrados: pacientesParaNotificar.length,
			total_enviados: resultados.length,
			total_erros: erros.length,
			dias_vencimento
		});

		const totalBoletosProcessados = resultados.reduce((sum, r) => sum + (r.total_boletos || 1), 0) + 
		                                   erros.reduce((sum, e) => sum + (e.total_boletos || 1), 0);

		const summary = {
			template_type: templateType,
			dias_vencimento,
			total_boletos_encontrados: boletos.length,
			total_pacientes_encontrados: Object.keys(boletosPorPaciente).length,
			total_pacientes_processados: pacientesParaNotificar.length,
			total_pacientes_enviados: resultados.length,
			total_boletos_processados: totalBoletosProcessados,
			total_erros: erros.length,
			resultados,
			erros
		};

		console.log(`📊 [CRON] Resumo: ${resultados.length} paciente(s) notificado(s) (${totalBoletosProcessados} boleto(s)), ${erros.length} erro(s) de ${pacientesParaNotificar.length} processado(s) (${boletos.length} boleto(s) encontrado(s))`);

		return res.status(200).json({
			success: true,
			data: summary
		});
	} catch (error) {
		console.error('❌ [CRON] Erro crítico ao processar notificações:', error);
		
		// Notificar admin sobre erro crítico
		const errorContext = {
			dias_vencimento: req.body?.dias_vencimento || null,
			total_boletos: 0,
			total_erros: 1
		};
		
		await notifyAdminOnCriticalError(error, errorContext);

		return res.status(500).json({
			success: false,
			error: error.message || 'Erro ao processar notificações automáticas',
			code: error.code || null
		});
	}
}

module.exports = {
	enviarNotificacaoBoleto,
	enviarNotificacoesAutomaticas,
	enviarNotificacoesCron
};