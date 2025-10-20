const { supabase, supabaseAdmin } = require('../config/database');
const { normalizarEmail } = require('../utils/helpers');

// Constantes
const STATUS_COM_EVIDENCIA = {
  pacientes: ['nao_existe', 'nao_tem_interesse', 'nao_reconhece', 'nao_responde', 'sem_clinica', 'nao_passou_cpf', 'nao_tem_outro_cpf', 'cpf_reprovado'],
  agendamentos: ['nao_compareceu', 'nao_fechou'],
  fechamentos: ['nao_aprovado']
};

const STATUS_NOVOS_LEADS = ['lead', 'sem_primeiro_contato'];
const STATUS_NEGATIVOS = ['nao_existe', 'nao_tem_interesse', 'nao_reconhece', 'nao_responde', 'sem_clinica', 'nao_passou_cpf', 'nao_tem_outro_cpf', 'cpf_reprovado'];

// GET /api/pacientes - Listar pacientes
const getAllPacientes = async (req, res) => {
  try {
    console.log('🔍 GET /api/pacientes - Usuário:', {
      id: req.user.id,
      tipo: req.user.tipo,
      nome: req.user.nome
    });
    
    const statusExcluir = [...STATUS_NOVOS_LEADS, ...STATUS_NEGATIVOS];
    
    // Verificar se é freelancer (consultor sem as duas permissões)
    const isFreelancer = req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true);
    
    let query = supabaseAdmin
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `);
    
    // Para freelancers, não excluir nenhum status (mostrar todos os pacientes atribuídos)
    // Para outros usuários, excluir status que devem aparecer apenas em Novos Leads e Negativas
    if (!isFreelancer) {
      query = query.not('status', 'in', `(${statusExcluir.join(',')})`);
    }
    
    query = query.order('created_at', { ascending: false });

    // Se for clínica, buscar pacientes que têm agendamentos nesta clínica OU foram cadastrados por ela
    if (req.user.tipo === 'clinica') {
      console.log('🏥 Clínica acessando pacientes:', {
        clinica_id: req.user.id,
        clinica_nome: req.user.nome
      });
      
      // Buscar pacientes com agendamentos nesta clínica
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', req.user.id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos ? agendamentos.map(a => a.paciente_id).filter(id => id !== null) : [];
      
      // Combinar: pacientes com agendamentos na clínica OU cadastrados pela clínica
      const conditions = [`clinica_id.eq.${req.user.id}`];
      
      if (pacienteIds.length > 0) {
        conditions.push(`id.in.(${pacienteIds.join(',')})`);
      }
      
      // Aplicar filtro OR
      query = query.or(conditions.join(','));
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar pacientes atribuídos a ele OU vinculados através de agendamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os pacientes
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      // Buscar pacientes com agendamentos deste consultor
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos.map(a => a.paciente_id);
      
      // Combinar: pacientes atribuídos diretamente OU com agendamentos
      const conditions = [`consultor_id.eq.${req.user.id}`];
      
      if (pacienteIds.length > 0) {
        conditions.push(`id.in.(${pacienteIds.join(',')})`);
      }
      
      // Aplicar filtro OR
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/pacientes - Listar pacientes para dashboard
const getDashboardPacientes = async (req, res) => {
  try {
    const statusExcluir = [...STATUS_NOVOS_LEADS, ...STATUS_NEGATIVOS];
    
    // Verificar se é freelancer (consultor sem as duas permissões)
    const isFreelancer = req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true);
    
    let query = supabaseAdmin
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `);
    
    // Para freelancers, não excluir nenhum status (mostrar todos os pacientes atribuídos)
    // Para outros usuários, excluir status que devem aparecer apenas em Novos Leads e Negativas
    if (!isFreelancer) {
      query = query.not('status', 'in', `(${statusExcluir.join(',')})`);
    }
    
    query = query.order('created_at', { ascending: false });

    // Se for consultor freelancer (não tem as duas permissões), filtrar pacientes atribuídos a ele OU vinculados através de agendamentos OU fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os pacientes
    if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
      // Buscar pacientes com agendamentos deste consultor
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (agendError) throw agendError;

      // Buscar pacientes com fechamentos deste consultor
      const { data: fechamentos, error: fechError } = await supabaseAdmin
        .from('fechamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.id);

      if (fechError) throw fechError;

      const pacienteIdsAgendamentos = agendamentos.map(a => a.paciente_id);
      const pacienteIdsFechamentos = fechamentos.map(f => f.paciente_id);
      
      // Combinar todos os IDs únicos
      const todosPacienteIds = [...new Set([...pacienteIdsAgendamentos, ...pacienteIdsFechamentos])];
      
      // Combinar: pacientes atribuídos diretamente OU com agendamentos OU fechamentos
      const conditions = [`consultor_id.eq.${req.user.id}`];
      
      if (todosPacienteIds.length > 0) {
        conditions.push(`id.in.(${todosPacienteIds.join(',')})`);
      }
      
      // Aplicar filtro OR
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/pacientes - Criar paciente
const createPaciente = async (req, res) => {
  try {
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id, cidade, estado, cadastrado_por_clinica, clinica_id } = req.body;
    
    // Normalizar telefone e CPF (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Verificar se CPF já existe
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('cpf', cpfNumeros)
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    
    // Lógica de diferenciação: se tem consultor = paciente, se não tem = lead
    const statusFinal = status || (consultorId ? 'paciente' : 'lead');
    
    // Se é clínica criando paciente, definir valores específicos
    const isClinica = req.user.tipo === 'clinica';
    let finalClinicaId = clinica_id;
    let finalCadastradoPorClinica = cadastrado_por_clinica || false;
    
    if (isClinica) {
      finalClinicaId = req.user.clinica_id || req.user.id;
      finalCadastradoPorClinica = true;
    }
    
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .insert([{ 
        nome, 
        telefone: telefoneNumeros, // Usar telefone normalizado
        cpf: cpfNumeros, // Usar CPF normalizado
        tipo_tratamento, 
        status: statusFinal, // Usar status diferenciado
        observacoes,
        consultor_id: consultorId,
        cidade,
        estado,
        clinica_id: finalClinicaId,
        cadastrado_por_clinica: finalCadastradoPorClinica
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Paciente cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/pacientes/:id - Atualizar paciente
const updatePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id, cidade, estado, cadastrado_por_clinica, clinica_id } = req.body;
    
    // Verificar se é consultor freelancer - freelancers não podem editar pacientes completamente
    if (req.user.tipo === 'consultor' && req.user.podealterarstatus !== true) {
      return res.status(403).json({ error: 'Você não tem permissão para editar pacientes.' });
    }
    
    // Se é clínica, verificar se está editando um paciente próprio
    if (req.user.tipo === 'clinica') {
      const { data: paciente, error: fetchError } = await supabaseAdmin
        .from('pacientes')
        .select('cadastrado_por_clinica, clinica_id')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Clínica só pode editar pacientes que ela mesma cadastrou
      if (!paciente.cadastrado_por_clinica || paciente.clinica_id !== (req.user.clinica_id || req.user.id)) {
        return res.status(403).json({ error: 'Você só pode editar pacientes cadastrados pela sua clínica.' });
      }
    }
    
    // Normalizar telefone e CPF (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe em outro paciente
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .neq('id', id) // Excluir o paciente atual
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Verificar se CPF já existe em outro paciente
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('cpf', cpfNumeros)
        .neq('id', id) // Excluir o paciente atual
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    // Converter consultor_id para null se não fornecido
    const consultorId = consultor_id && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;
    
    // Lógica de diferenciação: se tem consultor = paciente, se não tem = lead
    // Mas só aplica se o status não foi explicitamente definido
    const statusFinal = status || (consultorId ? 'paciente' : 'lead');
    
    // Se é clínica editando, manter os campos específicos
    const updateData = {
      nome, 
      telefone: telefoneNumeros, // Usar telefone normalizado
      cpf: cpfNumeros, // Usar CPF normalizado
      tipo_tratamento, 
      status: statusFinal, // Usar status diferenciado
      observacoes,
      consultor_id: consultorId,
      cidade,
      estado
    };
    
    // Se tem informações de clínica, incluir
    if (cadastrado_por_clinica !== undefined) {
      updateData.cadastrado_por_clinica = cadastrado_por_clinica;
    }
    if (clinica_id !== undefined) {
      updateData.clinica_id = clinica_id;
    }
    
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Paciente atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/pacientes/:id/status - Atualizar status do paciente
const updateStatusPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, evidencia_id } = req.body;
    
    // Verificar se é consultor freelancer - freelancers não podem alterar status
    if (req.user.tipo === 'consultor' && req.user.podealterarstatus !== true) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar o status dos pacientes.' });
    }
    
    // Buscar dados do paciente primeiro
    const { data: paciente, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (pacienteError) throw pacienteError;
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // VALIDAR SE STATUS REQUER EVIDÊNCIA
    if (STATUS_COM_EVIDENCIA.pacientes.includes(status)) {
      if (!evidencia_id) {
        return res.status(400).json({ 
          error: 'Este status requer envio de evidência (print)!',
          requer_evidencia: true 
        });
      }
      
      // Verificar se a evidência existe e pertence a este paciente
      const { data: evidencia, error: evidenciaError } = await supabaseAdmin
        .from('historico_status_evidencias')
        .select('*')
        .eq('id', evidencia_id)
        .eq('tipo', 'paciente')
        .eq('registro_id', parseInt(id))
        .eq('status_novo', status)
        .single();
      
      if (evidenciaError || !evidencia) {
        return res.status(400).json({ error: 'Evidência inválida ou não encontrada!' });
      }
      
      console.log('✅ Evidência validada:', evidencia.id);
    }

    // Atualizar status do paciente
    const { error } = await supabaseAdmin
      .from('pacientes')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    // Automação do pipeline
    if (status === 'fechado') {
      // Atualizar status do agendamento para "fechado"
      await supabaseAdmin
        .from('agendamentos')
        .update({ status: 'fechado' })
        .eq('paciente_id', id);

      // Verificar se já existe fechamento
      const { data: fechamentoExistente } = await supabaseAdmin
        .from('fechamentos')
        .select('id')
        .eq('paciente_id', id)
        .single();

      if (!fechamentoExistente) {
        // Buscar agendamento relacionado
        const { data: agendamento } = await supabaseAdmin
          .from('agendamentos')
          .select('*')
          .eq('paciente_id', id)
          .single();

        // Criar fechamento automaticamente
        await supabaseAdmin
          .from('fechamentos')
          .insert({
            paciente_id: id,
            consultor_id: paciente.consultor_id,
            clinica_id: agendamento?.clinica_id || null,
            agendamento_id: agendamento?.id || null,
            valor_fechado: 0,
            data_fechamento: new Date().toISOString().split('T')[0],
            tipo_tratamento: paciente.tipo_tratamento,
            forma_pagamento: 'A definir',
            observacoes: 'Fechamento criado automaticamente pelo pipeline',
            aprovado: 'pendente'
          });
      }
    }

    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/pacientes/:id - Excluir paciente (apenas admin)
const deletePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar se o usuário é admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('tipo')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    if (user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir pacientes.' });
    }
    
    // Excluir agendamentos relacionados primeiro
    await supabaseAdmin
      .from('agendamentos')
      .delete()
      .eq('paciente_id', id);
    
    // Excluir fechamentos relacionados
    await supabaseAdmin
      .from('fechamentos')
      .delete()
      .eq('paciente_id', id);
    
    // Excluir o paciente
    const { error } = await supabaseAdmin
      .from('pacientes')
      .delete()
      .eq('id', id);
      
    if (error) throw error;

    res.json({ message: 'Paciente e registros relacionados excluídos com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir paciente:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/novos-leads - Listar novos leads
const getNovosLeads = async (req, res) => {
  try {
    // Buscar leads com status = 'lead' e 'sem_primeiro_contato' (prospecção ativa)
    const { data: novosLeads, error } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .in('status', STATUS_NOVOS_LEADS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    console.log('🔍 Novos leads (status: lead, sem_primeiro_contato):', novosLeads?.length || 0);
    
    res.json(novosLeads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/leads-negativos - Listar leads negativos
const getLeadsNegativos = async (req, res) => {
  try {
    // Buscar pacientes com status negativos
    const { data: leadsNegativos, error } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .in('status', STATUS_NEGATIVOS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    console.log('🔍 Leads negativos (status:', STATUS_NEGATIVOS.join(', '), '):', leadsNegativos?.length || 0);
    
    res.json(leadsNegativos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/novos-leads/:id/aprovar - Aprovar lead (muda status de 'lead' para 'em_conversa')
const aprovarLead = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('✅ Aprovando lead:', id);
    
    // Verificar se o lead existe e tem status 'lead'
    const { data: pacienteAtual, error: checkError } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;
    
    if (!pacienteAtual) {
      return res.status(404).json({ error: 'Lead não encontrado!' });
    }
    
    if (pacienteAtual.status !== 'lead') {
      return res.status(400).json({ error: 'Este lead já foi processado!' });
    }

    // Mudar status de 'lead' para 'em_conversa'
    const { error } = await supabaseAdmin
      .from('pacientes')
      .update({ status: 'em_conversa' })
      .eq('id', id);

    if (error) throw error;
    
    console.log('✅ Lead aprovado com sucesso! ID:', id);
    
    // Emitir evento Socket.IO para atualizar contagem de leads
    if (req.io) {
      console.log('📢 Lead aprovado - atualizando contagem via Socket.IO');
      // Função updateLeadCount será chamada pelo server.js
    }
    
    res.json({ message: 'Lead aprovado com sucesso! Status alterado para "em_conversa".' });
  } catch (error) {
    console.error('❌ Erro ao aprovar lead:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/novos-leads/:id/pegar - Pegar lead (atribuir a um consultor)
const pegarLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { consultor_id } = req.body;
    
    // Verificar se o lead ainda está disponível
    const { data: pacienteAtual, error: checkError } = await supabaseAdmin
      .from('pacientes')
      .select('consultor_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (pacienteAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Este lead já foi atribuído a outro consultor!' });
    }

    // Determinar qual consultor_id usar
    let consultorIdParaAtribuir;
    
    if (consultor_id) {
      // Se foi fornecido consultor_id no body (admin escolhendo consultor)
      consultorIdParaAtribuir = consultor_id;
    } else if (req.user.consultor_id) {
      // Se o usuário tem consultor_id (consultor normal)
      consultorIdParaAtribuir = req.user.consultor_id;
    } else {
      // Se não tem consultor_id e não foi fornecido no body
      return res.status(400).json({ error: 'É necessário especificar um consultor para atribuir o lead!' });
    }

    // Atribuir o lead ao consultor
    const { error } = await supabaseAdmin
      .from('pacientes')
      .update({ consultor_id: consultorIdParaAtribuir })
      .eq('id', id);

    if (error) throw error;
    
    // Emitir evento Socket.IO para atualizar contagem de leads
    if (req.io) {
      console.log('📢 Lead atribuído - atualizando contagem via Socket.IO');
      // Função updateLeadCount será chamada pelo server.js
    }
    
    res.json({ message: 'Lead atribuído com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/novos-leads/:id - Excluir lead (apenas admin)
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Status permitidos para exclusão (Novos Leads + Negativas)
    const statusPermitidos = [...STATUS_NOVOS_LEADS, ...STATUS_NEGATIVOS];
    
    // Verificar se o lead existe
    const { data: pacienteAtual, error: checkError } = await supabaseAdmin
      .from('pacientes')
      .select('consultor_id, nome, status')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (!pacienteAtual) {
      return res.status(404).json({ error: 'Lead não encontrado!' });
    }
    
    // Verificar se o lead tem status permitido para exclusão
    if (!statusPermitidos.includes(pacienteAtual.status)) {
      return res.status(400).json({ error: 'Apenas leads com status permitido podem ser excluídos desta forma!' });
    }

    // Excluir o lead (independente de ter consultor_id ou não)
    const { error } = await supabaseAdmin
      .from('pacientes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    console.log('✅ Lead excluído com sucesso! ID:', id, 'Nome:', pacienteAtual.nome, 'Status:', pacienteAtual.status);
    
    // Emitir evento Socket.IO para atualizar contagem de leads
    if (req.io) {
      console.log('📢 Lead excluído - atualizando contagem via Socket.IO');
      // Função updateLeadCount será chamada pelo server.js
    }
    
    res.json({ message: 'Lead excluído com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao excluir lead:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/novos-leads/:id/status - Atualizar status de novo lead
const updateStatusLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('🔧 PUT /api/novos-leads/:id/status recebido');
    console.log('🔧 ID do lead:', id);
    console.log('🔧 Novo status:', status);
    console.log('🔧 Usuário autenticado:', req.user);
    
    // Verificar se o status é válido (usando os mesmos status da tela de pacientes)
    const statusValidos = [
      'lead', 'em_conversa', 'cpf_aprovado', 'cpf_reprovado', 'nao_passou_cpf',
      'nao_tem_outro_cpf', 'nao_existe', 'nao_tem_interesse', 'nao_reconhece',
      'nao_responde', 'sem_clinica', 'agendado', 'compareceu', 'fechado',
      'nao_fechou', 'nao_compareceu', 'reagendado'
    ];
    if (!status || !statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido! Status válidos: ' + statusValidos.join(', ') });
    }
    
    // Verificar permissões: admin ou consultor com permissão
    const podeAlterarStatus = req.user.tipo === 'admin' || 
      (req.user.tipo === 'consultor' && req.user.podealterarstatus === true);
    
    if (!podeAlterarStatus) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar o status de leads!' });
    }
    
    // Verificar se o lead existe
    const { data: leadAtual, error: checkError } = await supabaseAdmin
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('❌ Erro ao buscar lead:', checkError);
      return res.status(404).json({ error: 'Lead não encontrado!' });
    }
    
    if (!leadAtual) {
      return res.status(404).json({ error: 'Lead não encontrado!' });
    }
    
    console.log('✅ Lead encontrado:', leadAtual.nome);
    
    // Atualizar o status do lead
    const { data: leadAtualizado, error: updateError } = await supabaseAdmin
      .from('pacientes')
      .update({ status: status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar status:', updateError);
      throw updateError;
    }
    
    console.log('✅ Status atualizado com sucesso!');
    
    res.json({ 
      message: 'Status atualizado com sucesso!',
      lead: leadAtualizado
    });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/leads/cadastro - Cadastro público de lead
const cadastroPublicoLead = async (req, res) => {
  try {
    console.log('📝 Cadastro de lead recebido:', req.body);
    let { nome, telefone, cpf, tipo_tratamento, observacoes, cidade, estado, ref_consultor } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios!' });
    }
    
    // Validar nome (mínimo 2 caracteres)
    if (nome.trim().length < 2) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres!' });
    }
    
    // Validar telefone (formato básico)
    const telefoneRegex = /^[\(\)\s\-\+\d]{10,15}$/;
    if (!telefoneRegex.test(telefone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Telefone inválido!' });
    }
    
    // Normalizar telefone (remover formatação)
    const telefoneNumeros = telefone.replace(/\D/g, '');
    
    // Verificar se telefone já existe
    const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome, created_at')
      .eq('telefone', telefoneNumeros)
      .limit(1);

    if (telefoneError) {
      console.error('❌ Erro ao verificar telefone:', telefoneError);
      throw telefoneError;
    }
    
    if (telefoneExistente && telefoneExistente.length > 0) {
      const pacienteExistente = telefoneExistente[0];
      const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
      console.log('❌ Telefone já cadastrado:', { 
        telefone: telefoneNumeros, 
        paciente: pacienteExistente.nome,
        dataCadastro: dataCadastro 
      });
      return res.status(400).json({ 
        error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}). Por favor, verifique os dados.` 
      });
    }
    
    // Normalizar CPF (remover formatação)
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Verificar se CPF já existe
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('cpf', cpfNumeros)
        .limit(1);

      if (cpfError) {
        console.error('❌ Erro ao verificar CPF:', cpfError);
        throw cpfError;
      }
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        console.log('❌ CPF já cadastrado:', { 
          cpf: cpfNumeros, 
          paciente: pacienteExistente.nome,
          dataCadastro: dataCadastro 
        });
        return res.status(400).json({ 
          error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}). Por favor, verifique os dados.` 
        });
      }
    }
    
    // Buscar consultor pelo código de referência se fornecido
    let consultorId = null;
    if (ref_consultor && ref_consultor.trim() !== '') {
      console.log('🔍 Buscando consultor pelo código de referência:', ref_consultor);
      
      const { data: consultorData, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id, nome, codigo_referencia, ativo')
        .eq('codigo_referencia', ref_consultor.trim())
        .eq('ativo', true)
        .single();
      
      if (consultorError) {
        console.error('❌ Erro ao buscar consultor:', consultorError);
        console.error('❌ Detalhes do erro:', {
          message: consultorError.message,
          details: consultorError.details,
          hint: consultorError.hint,
          code: consultorError.code
        });
        // Não falhar o cadastro se não encontrar o consultor, apenas logar o erro
      } else if (consultorData) {
        consultorId = consultorData.id;
        console.log('✅ Consultor encontrado:', { 
          id: consultorData.id, 
          nome: consultorData.nome,
          codigo_referencia: consultorData.codigo_referencia,
          ativo: consultorData.ativo
        });
      } else {
        console.log('⚠️ Consultor não encontrado para o código:', ref_consultor);
      }
    } else {
      console.log('ℹ️ Nenhum código de referência fornecido');
    }
    
    // Inserir lead/paciente
    console.log('💾 Inserindo lead com consultor_id:', consultorId);
    
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .insert([{ 
        nome: nome.trim(), 
        telefone: telefoneNumeros, // Usar telefone normalizado (apenas números)
        cpf: cpfNumeros,
        tipo_tratamento: tipo_tratamento || null,
        status: 'lead', 
        observacoes: observacoes || null,
        cidade: cidade ? cidade.trim() : null,
        estado: estado ? estado.trim() : null,
        consultor_id: consultorId // Atribuir ao consultor se encontrado pelo código de referência
      }])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir lead:', error);
      throw error;
    }
    
    console.log('✅ Lead cadastrado com sucesso:', {
      id: data[0].id,
      nome: data[0].nome,
      consultor_id: data[0].consultor_id,
      status: data[0].status
    });
    
    // Emitir evento Socket.IO para notificar admins sobre novo lead
    if (req.io) {
      console.log('📢 Emitindo evento new-lead via Socket.IO');
      req.io.to('lead-notifications').emit('new-lead', {
        leadId: data[0].id,
        nome: data[0].nome,
        telefone: data[0].telefone,
        tipo_tratamento: data[0].tipo_tratamento,
        cidade: data[0].cidade,
        estado: data[0].estado,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar contagem de leads para admins
      // Função updateLeadCount será chamada pelo server.js
    }
    
    res.json({ 
      id: data[0].id, 
      message: 'Cadastro realizado com sucesso! Entraremos em contato em breve.',
      nome: nome.trim()
    });
  } catch (error) {
    console.error('Erro no cadastro de lead:', error);
    res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
  }
};

module.exports = {
  getAllPacientes,
  getDashboardPacientes,
  createPaciente,
  updatePaciente,
  updateStatusPaciente,
  deletePaciente,
  getNovosLeads,
  getLeadsNegativos,
  aprovarLead,
  pegarLead,
  deleteLead,
  updateStatusLead,
  cadastroPublicoLead
};

