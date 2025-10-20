const { supabaseAdmin } = require('../config/database');

// GET /api/metas - Buscar metas
const getMetas = async (req, res) => {
  // Verificar se é admin
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  
  try {
    const { mes, ano } = req.query;
    
    const mesAtual = mes || new Date().getMonth() + 1;
    const anoAtual = ano || new Date().getFullYear();
    
    const { data: metas, error } = await supabaseAdmin
      .from('metas')
      .select('*')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual);
    
    if (error) throw error;
    
    // Se não houver metas, criar metas padrão
    if (!metas || metas.length === 0) {
      const metasPadrao = [
        { tipo: 'clinicas_aprovadas', mes: mesAtual, ano: anoAtual, valor_meta: 50 },
        { tipo: 'valor_fechamentos', mes: mesAtual, ano: anoAtual, valor_meta: 500000 }
      ];
      
      const { data: novasMetas, error: insertError } = await supabaseAdmin
        .from('metas')
        .insert(metasPadrao)
        .select();
      
      if (insertError) throw insertError;
      
      res.json(novasMetas);
    } else {
      res.json(metas);
    }
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/metas/:id - Atualizar meta
const updateMeta = async (req, res) => {
  // Verificar se é admin
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  
  try {
    const { id } = req.params;
    const { valor_meta } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('metas')
      .update({ 
        valor_meta,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/metas/progresso - Buscar progresso das metas
const getProgressoMetas = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
      const hoje = new Date();
      // Permitir override de mês/ano via query params para testes
      // IMPORTANTE: Forçar para julho/2025 onde temos mais dados (10 fechamentos)
      const mesAtual = req.query.mes ? parseInt(req.query.mes) : 7; // Julho
      const anoAtual = req.query.ano ? parseInt(req.query.ano) : 2025; // 2025
    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1);
    const ultimoDia = new Date(anoAtual, mesAtual, 0);
    
    console.log('📊 Buscando metas - Período:', {
      mesAtual,
      anoAtual,
      primeiroDia: primeiroDia.toISOString(),
      ultimoDia: ultimoDia.toISOString()
    });
    
    // Buscar clínicas aprovadas no mês
    // Primeiro vamos buscar TODAS as clínicas para debug
    const { data: todasClinicas, error: errorTodasClinicas } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .limit(10);
    
    console.log('🔍 Amostra de clínicas (primeiras 10):', todasClinicas?.map(c => ({
      nome: c.nome,
      status: c.status,
      created_at: c.created_at
    })));
    
    // Buscar apenas clínicas APROVADAS
    const { data: clinicasAprovadas, error: errorClinicas } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .in('status', ['Aprovada', 'aprovada', 'APROVADA'])
      .gte('created_at', primeiroDia.toISOString())
      .lte('created_at', ultimoDia.toISOString())
      .order('created_at', { ascending: true});
    
    if (errorClinicas) throw errorClinicas;
    
    console.log('✅ Clínicas APROVADAS no período:', clinicasAprovadas?.length || 0);
    if (clinicasAprovadas && clinicasAprovadas.length > 0) {
      console.log('📊 Amostra de clínicas:', clinicasAprovadas.slice(0, 3).map(c => ({
        nome: c.nome,
        status: c.status,
        created_at: c.created_at
      })));
    }
    
    // Buscar fechamentos do mês
    const { data: fechamentos, error: errorFechamentos } = await supabaseAdmin
      .from('fechamentos')
      .select('*')
      .gte('data_fechamento', primeiroDia.toISOString().split('T')[0])
      .lte('data_fechamento', ultimoDia.toISOString().split('T')[0])
      .order('data_fechamento', { ascending: true });
    
    if (errorFechamentos) throw errorFechamentos;
    
    console.log('💰 Fechamentos encontrados:', fechamentos?.length || 0);
    console.log('📅 Período de busca:', {
      inicio: primeiroDia.toISOString().split('T')[0],
      fim: ultimoDia.toISOString().split('T')[0]
    });
    if (fechamentos && fechamentos.length > 0) {
      console.log('📊 Amostra de fechamentos:', fechamentos.slice(0, 3).map(f => ({
        paciente_id: f.paciente_id,
        data: f.data_fechamento,
        valor: f.valor_fechado,
        aprovado: f.aprovado
      })));
    }
    
    // Calcular semana do ano (para ramp-up)
    const getWeekOfYear = (date) => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };
    
    const semanaDoAno = getWeekOfYear(hoje);
    console.log('📅 Semana do ano:', semanaDoAno);
    
    // Agrupar por semana
    const progressoSemanal = {};
    
    // Determinar número de semanas no mês
    const getWeekNumber = (date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const dayOfMonth = date.getDate();
      const dayOfWeek = firstDay.getDay();
      const weekNumber = Math.ceil((dayOfMonth + dayOfWeek) / 7);
      console.log(`📅 Data: ${date.toISOString().split('T')[0]} -> Semana ${weekNumber}`);
      return weekNumber;
    };
    
    // Inicializar semanas do mês com ramp-up
    const semanasNoMes = Math.ceil((ultimoDia.getDate() + new Date(anoAtual, mesAtual - 1, 1).getDay()) / 7);
    
    // Calcular ramp-up EVOLUTIVO começando na semana 41
    // Novo plano: período de estabilização até semana 40, depois crescimento progressivo
    const calcularRampUp = (semanaDoMes) => {
      const metaSemanalPacientes = metaPacientes / 4; // 120 / 4 = 30 pacientes/semana
      const metaSemanalClinicas = metaClinicas / 4;   // 30 / 4 = 7.5 clínicas/semana
      
      if (semanaDoAno < 41) {
        // Antes da semana 41: período de estabilização (sem meta)
        return {
          pacientes: 0,
          clinicas: 0
        };
      } else if (semanaDoAno >= 41 && semanaDoAno <= 52) {
        // Semanas 41-52: crescimento progressivo de 25% a 100%
        // 12 semanas para evolução completa
        const semanasDesdeInicio = semanaDoAno - 41; // 0 a 11
        const percentualBase = 0.25; // Começa com 25% da meta
        const percentualCrescimento = 0.75; // Cresce 75% em 12 semanas
        const fator = percentualBase + (semanasDesdeInicio / 11) * percentualCrescimento;
        
        return {
          pacientes: Math.round(metaSemanalPacientes * Math.min(fator, 1)),
          clinicas: Math.round(metaSemanalClinicas * Math.min(fator, 1))
        };
      } else {
        // Após semana 52: mantém 100% da meta
        return {
          pacientes: Math.round(metaSemanalPacientes),
          clinicas: Math.round(metaSemanalClinicas)
        };
      }
    };
    
    for (let semana = 1; semana <= semanasNoMes; semana++) {
      const metasSemana = calcularRampUp(semana);
      
      progressoSemanal[`Semana ${semana}`] = {
        pacientes: 0,
        pacientesAcumulado: 0,
        clinicas: 0,
        clinicasAcumulado: 0,
        valorFechamentos: 0,
        valorAcumulado: 0,
        semanaNumero: semana,
        isAtual: false,
        metaSemanalPacientes: metasSemana.pacientes,
        metaSemanalClinicas: metasSemana.clinicas
      };
    }
    
    // Marcar semana atual
    const semanaAtual = getWeekNumber(hoje);
    if (progressoSemanal[`Semana ${semanaAtual}`]) {
      progressoSemanal[`Semana ${semanaAtual}`].isAtual = true;
    }
    
    // Processar clínicas por semana
    clinicasAprovadas.forEach(clinica => {
      const data = new Date(clinica.created_at);
      const semana = getWeekNumber(data);
      const chave = `Semana ${semana}`;
      if (progressoSemanal[chave]) {
        progressoSemanal[chave].clinicas++;
      }
    });
    
    // Processar fechamentos/pacientes por semana
    console.log('🔄 Processando fechamentos por semana...');
    fechamentos.forEach(fechamento => {
      const data = new Date(fechamento.data_fechamento);
      const semana = getWeekNumber(data);
      const chave = `Semana ${semana}`;
      if (progressoSemanal[chave]) {
        progressoSemanal[chave].pacientes++; // Cada fechamento é um paciente
        const valor = parseFloat(fechamento.valor_fechado || 0);
        progressoSemanal[chave].valorFechamentos += valor;
        console.log(`  ✅ Fechamento adicionado à ${chave}: ID ${fechamento.paciente_id} - R$ ${valor}`);
      } else {
        console.log(`  ⚠️ Semana ${semana} não encontrada no progressoSemanal`);
      }
    });
    
    // Calcular valores acumulados por semana
    let pacientesAcumulado = 0;
    let clinicasAcumulado = 0;
    let valorAcumulado = 0;
    Object.keys(progressoSemanal).sort((a, b) => {
      const numA = parseInt(a.replace('Semana ', ''));
      const numB = parseInt(b.replace('Semana ', ''));
      return numA - numB;
    }).forEach(semana => {
      pacientesAcumulado += progressoSemanal[semana].pacientes;
      clinicasAcumulado += progressoSemanal[semana].clinicas;
      valorAcumulado += progressoSemanal[semana].valorFechamentos;
      progressoSemanal[semana].pacientesAcumulado = pacientesAcumulado;
      progressoSemanal[semana].clinicasAcumulado = clinicasAcumulado;
      progressoSemanal[semana].valorAcumulado = valorAcumulado;
    });
    
    console.log('📈 Progresso Semanal:', progressoSemanal);
    
    // Buscar metas
    const { data: metas, error: errorMetas } = await supabaseAdmin
      .from('metas')
      .select('*')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual);
    
    if (errorMetas) throw errorMetas;
    
    // Metas fixas: 120 pacientes e 30 clínicas por mês
    const metaPacientes = metas?.find(m => m.tipo === 'pacientes_fechados')?.valor_meta || 120;
    const metaClinicas = metas?.find(m => m.tipo === 'clinicas_aprovadas')?.valor_meta || 30;
    const metaValor = metas?.find(m => m.tipo === 'valor_fechamentos')?.valor_meta || 500000;
    
    // Calcular totais
    const totalPacientes = fechamentos?.length || 0;
    const totalClinicas = clinicasAprovadas?.length || 0;
    
    res.json({
      progresso_semanal: progressoSemanal,
      totais: {
        pacientes_fechados: totalPacientes,
        clinicas_aprovadas: totalClinicas,
        valor_fechamentos: valorAcumulado
      },
      metas: {
        pacientes_fechados: metaPacientes,
        clinicas_aprovadas: metaClinicas,
        valor_fechamentos: metaValor
      },
      percentuais: {
        pacientes: (totalPacientes / metaPacientes * 100).toFixed(1),
        clinicas: (totalClinicas / metaClinicas * 100).toFixed(1),
        valor: (valorAcumulado / metaValor * 100).toFixed(1)
      },
      mes_atual: `${mesAtual}/${anoAtual}`,
      semana_do_ano: semanaDoAno
    });
    
  } catch (error) {
    console.error('Erro ao buscar progresso das metas:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMetas,
  updateMeta,
  getProgressoMetas
};

