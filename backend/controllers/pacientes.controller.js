const { supabase, supabaseAdmin } = require('../config/database');
const { normalizarEmail } = require('../utils/helpers');
const { criarMovimentacaoLeadAtribuido } = require('./movimentacoes.controller');

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
        empreendimentos(nome, cidade, estado)
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
    // Se for admin, parceiro ou consultor interno, buscar pacientes da empresa (com empresa_id OU consultores da empresa)
    else if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
              (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      console.log('🏢 Admin/Parceiro acessando pacientes:', {
        empresa_id: req.user.empresa_id,
        usuario_nome: req.user.nome,
        tipo: req.user.tipo
      });
      
      // Buscar consultores da empresa
      const { data: consultores, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id')
        .eq('empresa_id', req.user.empresa_id);

      if (consultorError) throw consultorError;

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      // Criar condições: pacientes com empresa_id da empresa OU pacientes dos consultores da empresa
      const conditions = [];
      
      // Condição 1: Pacientes com empresa_id da empresa (leads diretos)
      conditions.push(`empresa_id.eq.${req.user.empresa_id}`);
      
      // Condição 2: Pacientes dos consultores da empresa (se houver consultores)
      if (consultorIds.length > 0) {
        conditions.push(`consultor_id.in.(${consultorIds.join(',')})`);
      }
      
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
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
    
    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(p => p.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(p => p.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(p => p.consultor_interno_id).filter(Boolean))];
    
    const allConsultoresIds = [...new Set([...consultoresIds, ...sdrIds, ...consultorInternoIds])];
    
    let consultoresNomes = {};
    if (allConsultoresIds.length > 0) {
      const { data: consultoresData } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', allConsultoresIds);
      
      consultoresNomes = consultoresData?.reduce((acc, c) => {
        acc[c.id] = c.nome;
        return acc;
      }, {}) || {};
    }
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: consultoresNomes[paciente.consultor_id] || null,
      sdr_nome: consultoresNomes[paciente.sdr_id] || null,
      consultor_interno_nome: consultoresNomes[paciente.consultor_interno_id] || null,
      empreendimento_nome: paciente.empreendimentos?.nome,
      empreendimento_cidade: paciente.empreendimentos?.cidade,
      empreendimento_estado: paciente.empreendimentos?.estado
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
        empreendimentos(nome, cidade, estado)
      `);
    
    // Para freelancers, não excluir nenhum status (mostrar todos os pacientes atribuídos)
    // Para outros usuários, excluir status que devem aparecer apenas em Novos Leads e Negativas
    if (!isFreelancer) {
      query = query.not('status', 'in', `(${statusExcluir.join(',')})`);
    }
    
    query = query.order('created_at', { ascending: false });

    // Se for admin, parceiro ou consultor interno, filtrar pacientes da empresa (com empresa_id OU consultores da empresa)
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      // Buscar consultores da empresa
      const { data: consultores, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id')
        .eq('empresa_id', req.user.empresa_id);

      if (consultorError) throw consultorError;

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      // Criar condições: pacientes com empresa_id da empresa OU pacientes dos consultores da empresa
      const conditions = [];
      
      // Condição 1: Pacientes com empresa_id da empresa (leads diretos)
      conditions.push(`empresa_id.eq.${req.user.empresa_id}`);
      
      // Condição 2: Pacientes dos consultores da empresa (se houver consultores)
      if (consultorIds.length > 0) {
        conditions.push(`consultor_id.in.(${consultorIds.join(',')})`);
      }
      
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
    }
    // Se for consultor freelancer (não tem as duas permissões), filtrar pacientes atribuídos a ele OU vinculados através de agendamentos OU fechamentos
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todos os pacientes
    else if (req.user.tipo === 'consultor' && !(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
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
    
    // Buscar nomes dos consultores separadamente
    const consultoresIds = [...new Set(data.map(p => p.consultor_id).filter(Boolean))];
    const sdrIds = [...new Set(data.map(p => p.sdr_id).filter(Boolean))];
    const consultorInternoIds = [...new Set(data.map(p => p.consultor_interno_id).filter(Boolean))];
    
    const allConsultoresIds = [...new Set([...consultoresIds, ...sdrIds, ...consultorInternoIds])];
    
    let consultoresNomes = {};
    if (allConsultoresIds.length > 0) {
      const { data: consultoresData } = await supabaseAdmin
        .from('consultores')
        .select('id, nome')
        .in('id', allConsultoresIds);
      
      consultoresNomes = consultoresData?.reduce((acc, c) => {
        acc[c.id] = c.nome;
        return acc;
      }, {}) || {};
    }
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: consultoresNomes[paciente.consultor_id] || null,
      sdr_nome: consultoresNomes[paciente.sdr_id] || null,
      consultor_interno_nome: consultoresNomes[paciente.consultor_interno_id] || null,
      empreendimento_nome: paciente.empreendimentos?.nome,
      empreendimento_cidade: paciente.empreendimentos?.cidade,
      empreendimento_estado: paciente.empreendimentos?.estado
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/pacientes - Criar paciente
const createPaciente = async (req, res) => {
  try {
    const { nome, telefone, email, cpf, tipo_tratamento, status, observacoes, consultor_id, cidade, estado, cadastrado_por_clinica, clinica_id, grau_parentesco, tratamento_especifico } = req.body;
    
    // Normalizar telefone e CPF (remover formatação)
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Verificar se telefone já existe na mesma empresa
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at, empresa_id')
        .eq('telefone', telefoneNumeros)
        .eq('empresa_id', req.user.empresa_id)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: 'Telefone já cadastrado',
          message: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} nesta empresa (cadastrado em ${dataCadastro}). Verifique se o número está correto ou entre em contato com o administrador.`,
          field: 'telefone',
          existingPatient: pacienteExistente.nome,
          registrationDate: dataCadastro
        });
      }
    }
    
    // Verificar se CPF já existe na mesma empresa
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at, empresa_id')
        .eq('cpf', cpfNumeros)
        .eq('empresa_id', req.user.empresa_id)
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: 'CPF já cadastrado',
          message: `Este CPF já está cadastrado para ${pacienteExistente.nome} nesta empresa (cadastrado em ${dataCadastro}). Verifique se o CPF está correto ou entre em contato com o administrador.`,
          field: 'cpf',
          existingPatient: pacienteExistente.nome,
          registrationDate: dataCadastro
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
        email,
        cpf: cpfNumeros, // Usar CPF normalizado
        tipo_tratamento, 
        status: statusFinal, // Usar status diferenciado
        observacoes,
        consultor_id: consultorId,
        cidade,
        estado,
        clinica_id: finalClinicaId,
        cadastrado_por_clinica: finalCadastradoPorClinica,
        grau_parentesco,
        tratamento_especifico,
        empresa_id: req.user.empresa_id // Adicionar empresa_id do usuário que está criando
      }])
      .select();

    if (error) throw error;
    
    // Não registrar movimentação aqui - será registrada quando um SDR pegar o lead
    
    res.json({ id: data[0].id, message: 'Paciente cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/pacientes/:id - Atualizar paciente
const updatePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, cpf, tipo_tratamento, status, observacoes, consultor_id, sdr_id, cidade, estado, cadastrado_por_clinica, clinica_id, grau_parentesco, tratamento_especifico } = req.body;
    
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
    
    // Verificar se telefone já existe em outro paciente da mesma empresa
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at, empresa_id')
        .eq('telefone', telefoneNumeros)
        .eq('empresa_id', req.user.empresa_id)
        .neq('id', id) // Excluir o paciente atual
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: 'Telefone já cadastrado',
          message: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} nesta empresa (cadastrado em ${dataCadastro}). Verifique se o número está correto ou entre em contato com o administrador.`,
          field: 'telefone',
          existingPatient: pacienteExistente.nome,
          registrationDate: dataCadastro
        });
      }
    }
    
    // Verificar se CPF já existe em outro paciente da mesma empresa
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at, empresa_id')
        .eq('cpf', cpfNumeros)
        .eq('empresa_id', req.user.empresa_id)
        .neq('id', id) // Excluir o paciente atual
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: 'CPF já cadastrado',
          message: `Este CPF já está cadastrado para ${pacienteExistente.nome} nesta empresa (cadastrado em ${dataCadastro}). Verifique se o CPF está correto ou entre em contato com o administrador.`,
          field: 'cpf',
          existingPatient: pacienteExistente.nome,
          registrationDate: dataCadastro
        });
      }
    }
    
    // VALIDAÇÃO: Verificar se lead já foi capturado por outro SDR
    if (sdr_id && consultor_id === undefined) {
      // Buscar dados atuais do paciente para verificar se já tem sdr_id
      const { data: pacienteAtual, error: fetchError } = await supabaseAdmin
        .from('pacientes')
        .select('consultor_id, sdr_id')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Se o lead já tem sdr_id, não permitir nova captura
      if (pacienteAtual.sdr_id !== null) {
        return res.status(400).json({ 
          error: 'Este lead já foi capturado por outro SDR.',
          message: 'O lead já foi atribuído a um SDR e não pode ser capturado novamente.'
        });
      }
    }
    
    // Converter consultor_id para null se não fornecido, mas só se foi explicitamente fornecido
    const consultorId = consultor_id !== undefined && consultor_id !== '' ? 
      (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : 
      (consultor_id === '' ? null : undefined); // Se não foi fornecido, não alterar
    
    // Lógica de diferenciação: se tem consultor = paciente, se não tem = lead
    // Mas só aplica se o status não foi explicitamente definido
    let statusFinal;
    if (status) {
      // Se status foi explicitamente fornecido (ex: 'em conversa' do SDR), usar ele
      statusFinal = status;
    } else if (consultorId) {
      // Se tem consultor_id mas não tem status explícito, usar 'paciente'
      statusFinal = 'paciente';
    } else {
      // Se não tem nem status nem consultor_id, usar 'lead'
      statusFinal = 'lead';
    }
    
    console.log('🔍 DEBUG updatePaciente - Status final:', {
      statusRecebido: status,
      consultorId: consultorId,
      sdrId: sdr_id,
      statusFinal: statusFinal
    });
    
    // Se é clínica editando, manter os campos específicos
    const updateData = {
      nome, 
      telefone: telefoneNumeros, // Usar telefone normalizado
      email,
      cpf: cpfNumeros, // Usar CPF normalizado
      tipo_tratamento, 
      status: statusFinal, // Usar status diferenciado
      observacoes,
      sdr_id: sdr_id || null, // Adicionar suporte para sdr_id
      cidade,
      estado,
      grau_parentesco,
      tratamento_especifico,
      empresa_id: req.user.empresa_id // Atualizar empresa_id do usuário que está editando
    };
    
    // Só incluir consultor_id se foi explicitamente fornecido
    if (consultor_id !== undefined) {
      updateData.consultor_id = consultorId;
    }
    
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
            // Para incorporadora (empresa_id = 5), usar empreendimento_id em vez de clinica_id
            clinica_id: req.user.empresa_id === 5 ? null : (agendamento?.clinica_id || null),
            empreendimento_id: req.user.empresa_id === 5 ? (paciente.empreendimento_id || null) : null,
            agendamento_id: agendamento?.id || null,
            valor_fechado: 0,
            data_fechamento: new Date().toISOString().split('T')[0],
            tipo_tratamento: req.user.empresa_id === 5 ? null : paciente.tipo_tratamento,
            forma_pagamento: 'A definir',
            observacoes: 'Fechamento criado automaticamente pelo pipeline',
            aprovado: 'aprovado', // Para fechamentos automáticos, sempre aprovado
            empresa_id: req.user.empresa_id
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
    console.log('🔍 GET /api/novos-leads - Usuário:', {
      tipo: req.user.tipo,
      empresa_id: req.user.empresa_id
    });
    
    let query = supabaseAdmin
      .from('pacientes')
      .select('*')
      .in('status', STATUS_NOVOS_LEADS)
      .order('created_at', { ascending: false });
    
    // Se for admin, parceiro ou consultor interno, filtrar pacientes da empresa (com empresa_id OU consultores da empresa)
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      console.log('🏢 Filtrando novos leads da empresa ID:', req.user.empresa_id);
      
      // Buscar consultores da empresa
      const { data: consultores, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id')
        .eq('empresa_id', req.user.empresa_id);

      if (consultorError) throw consultorError;

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      // Criar condições: pacientes com empresa_id da empresa OU pacientes dos consultores da empresa
      const conditions = [];
      
      // Condição 1: Pacientes com empresa_id da empresa (leads diretos)
      conditions.push(`empresa_id.eq.${req.user.empresa_id}`);
      
      // Condição 2: Pacientes dos consultores da empresa (se houver consultores)
      if (consultorIds.length > 0) {
        conditions.push(`consultor_id.in.(${consultorIds.join(',')})`);
      }
      
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
    }
    
    const { data: novosLeads, error } = await query;

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
    console.log('🔍 GET /api/leads-negativos - Usuário:', {
      tipo: req.user.tipo,
      empresa_id: req.user.empresa_id
    });
    
    let query = supabaseAdmin
      .from('pacientes')
      .select('*')
      .in('status', STATUS_NEGATIVOS)
      .order('created_at', { ascending: false });
    
    // Se for admin, parceiro ou consultor interno, filtrar pacientes da empresa (com empresa_id OU consultores da empresa)
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) || 
        (req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true && req.user.empresa_id)) {
      console.log('🏢 Filtrando leads negativos da empresa ID:', req.user.empresa_id);
      
      // Buscar consultores da empresa
      const { data: consultores, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id')
        .eq('empresa_id', req.user.empresa_id);

      if (consultorError) throw consultorError;

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      // Criar condições: pacientes com empresa_id da empresa OU pacientes dos consultores da empresa
      const conditions = [];
      
      // Condição 1: Pacientes com empresa_id da empresa (leads diretos)
      conditions.push(`empresa_id.eq.${req.user.empresa_id}`);
      
      // Condição 2: Pacientes dos consultores da empresa (se houver consultores)
      if (consultorIds.length > 0) {
        conditions.push(`consultor_id.in.(${consultorIds.join(',')})`);
      }
      
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        query = query.eq('id', 0); // Força resultado vazio
      }
    }
    
    const { data: leadsNegativos, error } = await query;

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

    // Mudar status de 'lead' para 'em_conversa' e atribuir ao SDR se for consultor interno
    const updateData = { status: 'em_conversa' };
    
    // Se o usuário é um consultor interno (não freelancer), atribuir como SDR
    if (req.user.tipo === 'consultor' && !req.user.is_freelancer) {
      updateData.sdr_id = req.user.id;
      console.log('🔍 Atribuindo lead ao SDR:', req.user.id);
    }
    
    const { error } = await supabaseAdmin
      .from('pacientes')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    
    console.log('✅ Lead aprovado com sucesso! ID:', id);
    
    // Registrar movimentação se foi atribuído a um SDR
    if (req.user.tipo === 'consultor' && !req.user.is_freelancer) {
      try {
        await criarMovimentacaoLeadAtribuido(id, req.user.id, req.user);
        console.log('✅ Movimentação de lead aprovado e atribuído registrada');
      } catch (movimentacaoError) {
        console.error('⚠️ Erro ao registrar movimentação:', movimentacaoError);
        // Não falhar a operação principal se houver erro na movimentação
      }
    }
    
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
    
    console.log('🔍 DEBUG pegarLead:', {
      pacienteId: id,
      consultor_id,
      userId: req.user?.id,
      userTipo: req.user?.tipo
    });
    
    // Verificar se o lead ainda está disponível (sdr_id deve ser null)
    const { data: pacienteAtual, error: checkError } = await supabaseAdmin
      .from('pacientes')
      .select('consultor_id, sdr_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    console.log('🔍 DEBUG paciente atual:', pacienteAtual);

    if (pacienteAtual.sdr_id !== null) {
      return res.status(400).json({ error: 'Este lead já foi atribuído a outro SDR!' });
    }

    // Determinar qual ID usar para sdr_id
    let sdrIdParaAtribuir;
    
    if (consultor_id) {
      // Se foi fornecido consultor_id no body (admin escolhendo consultor)
      sdrIdParaAtribuir = consultor_id;
    } else if (req.user.id) {
      // Usar o ID do usuário que está pegando o lead
      sdrIdParaAtribuir = req.user.id;
    } else {
      // Se não tem ID do usuário
      return res.status(400).json({ error: 'Erro: ID do usuário não encontrado!' });
    }

    console.log('🔍 DEBUG sdrIdParaAtribuir:', sdrIdParaAtribuir);

    // Atribuir o lead ao SDR e atualizar status para 'em_conversa'
    console.log('🔍 DEBUG atualizando paciente:', { id, sdr_id: sdrIdParaAtribuir, status: 'em_conversa' });
    
    const { error } = await supabaseAdmin
      .from('pacientes')
      .update({ 
        sdr_id: sdrIdParaAtribuir,
        status: 'em_conversa'  // Mudar status de 'lead' para 'em_conversa' quando atribuído
      })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar sdr_id:', error);
      throw error;
    }
    
    console.log('✅ Lead atribuído e status atualizado com sucesso!');
    
    // Registrar movimentação de lead atribuído
    try {
      await criarMovimentacaoLeadAtribuido(id, sdrIdParaAtribuir, req.user);
      console.log('✅ Movimentação de lead atribuído registrada');
    } catch (movimentacaoError) {
      console.error('⚠️ Erro ao registrar movimentação:', movimentacaoError);
      // Não falhar a operação principal se houver erro na movimentação
    }
    
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
    let { nome, telefone, email, cpf, tipo_tratamento, empreendimento_id, observacoes, cidade, estado, grau_parentesco, ref_consultor, origem_formulario } = req.body;
    console.log('👥 Grau de parentesco:', grau_parentesco);
    
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
    
    // Buscar consultor pelo código de referência se fornecido
    let consultorId = null;
    if (ref_consultor && ref_consultor.trim() !== '') {
      console.log('🔍 Buscando consultor pelo código de referência:', ref_consultor);
      
      const { data: consultorData, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id, nome, codigo_referencia, ativo, empresa_id')
        .eq('codigo_referencia', ref_consultor.trim())
        .eq('ativo', true)
        .single();
      
      if (consultorError) {
        console.error('❌ Erro ao buscar consultor:', consultorError);
      } else if (consultorData) {
        consultorId = consultorData.id;
        console.log('✅ Consultor encontrado:', {
          id: consultorData.id,
          nome: consultorData.nome,
          codigo_referencia: consultorData.codigo_referencia,
          empresa_id: consultorData.empresa_id,
          ativo: consultorData.ativo
        });
      } else {
        console.log('⚠️ Consultor não encontrado para o código:', ref_consultor);
      }
    } else {
      console.log('ℹ️ Nenhum código de referência fornecido');
    }
    
    // Determinar empresa_id baseado na origem do lead
    // PRIORIDADE 1: Se tem consultor_id (freelancer), usar empresa_id do consultor
    // PRIORIDADE 2: Se é CapturaClientes, usar empresa_id=5 (Incorporadora)
    // PRIORIDADE 3: Se é CapturaLead, usar empresa_id=3 (Outra empresa)
    
    let empresaId = 3; // Padrão: Outra empresa
    
    // Se tem consultor_id, buscar empresa_id do consultor
    if (consultorId) {
      const { data: consultorData } = await supabaseAdmin
        .from('consultores')
        .select('empresa_id')
        .eq('id', consultorId)
        .single();
      
      if (consultorData && consultorData.empresa_id) {
        empresaId = consultorData.empresa_id;
        console.log('👤 Lead de freelancer - usando empresa_id do consultor:', empresaId);
      }
    }
    
    // Se não tem consultor_id, determinar pela origem do formulário
    if (!consultorId) {
      const userAgent = req.headers['user-agent'] || '';
      const referer = req.headers.referer || '';
      const origin = req.headers.origin || '';
      
      const isCapturaClientes = 
        origem_formulario === 'captura-clientes' ||
        referer.includes('/captura-clientes') || 
        referer.includes('captura-clientes') ||
        origin.includes('/captura-clientes') ||
        origin.includes('captura-clientes') ||
        userAgent.includes('CapturaClientes') ||
        (referer.includes('clientes') && !referer.includes('captura-lead'));
      
      empresaId = isCapturaClientes ? 5 : 3;
      console.log('📝 Lead direto - determinando empresa_id pela origem:', empresaId);
    }
    
    console.log('🏢 Empresa_id final determinado:', {
      consultorId: consultorId,
      origem_formulario: origem_formulario,
      empresaIdFinal: empresaId,
      origem: consultorId ? `Freelancer (empresa_id=${empresaId})` : 
             empresaId === 5 ? 'CapturaClientes (Incorporadora - empresa_id=5)' : 
             'CapturaLead (Outra empresa - empresa_id=3)'
    });
    
    const { data: telefoneExistente, error: telefoneError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome, created_at, empresa_id')
      .eq('telefone', telefoneNumeros)
      .eq('empresa_id', empresaId)
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
        error: 'Telefone já cadastrado',
        message: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} nesta empresa (cadastrado em ${dataCadastro}). Verifique se o número está correto ou entre em contato com o administrador.`,
        field: 'telefone',
        existingPatient: pacienteExistente.nome,
        registrationDate: dataCadastro
      });
    }
    
    // Normalizar CPF (remover formatação)
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Verificar se CPF já existe na mesma empresa
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabaseAdmin
        .from('pacientes')
        .select('id, nome, created_at, empresa_id')
        .eq('cpf', cpfNumeros)
        .eq('empresa_id', empresaId)
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
          error: 'CPF já cadastrado',
          message: `Este CPF já está cadastrado para ${pacienteExistente.nome} nesta empresa (cadastrado em ${dataCadastro}). Verifique se o CPF está correto ou entre em contato com o administrador.`,
          field: 'cpf',
          existingPatient: pacienteExistente.nome,
          registrationDate: dataCadastro
        });
      }
    }
    
    
    // Inserir lead/paciente
    console.log('💾 Inserindo lead com consultor_id:', consultorId, 'e empresa_id:', empresaId);
    
    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .insert([{ 
        nome: nome.trim(), 
        telefone: telefoneNumeros, // Usar telefone normalizado (apenas números)
        email: email ? email.trim() : null,
        cpf: cpfNumeros,
        tipo_tratamento: tipo_tratamento || null,
        empreendimento_id: empreendimento_id || null, // ID do empreendimento de interesse
        status: 'lead', 
        observacoes: observacoes || null,
        cidade: cidade ? cidade.trim() : null,
        estado: estado ? estado.trim() : null,
        grau_parentesco: grau_parentesco || null, // Grau de parentesco do indicador
        consultor_id: consultorId, // Atribuir ao consultor se encontrado pelo código de referência
        empresa_id: empresaId // Incorporadora (5) ou Outra empresa (3) baseado no formulário
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
      console.log('📢 [SOCKET.IO] Emitindo evento new-lead para admins:', {
        leadId: data[0].id,
        nome: data[0].nome,
        telefone: data[0].telefone,
        cidade: data[0].cidade,
        estado: data[0].estado,
        timestamp: new Date().toISOString(),
        room: 'lead-notifications'
      });
      
      req.io.to('lead-notifications').emit('new-lead', {
        leadId: data[0].id,
        nome: data[0].nome,
        telefone: data[0].telefone,
        tipo_tratamento: data[0].tipo_tratamento,
        cidade: data[0].cidade,
        estado: data[0].estado,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [SOCKET.IO] Evento new-lead enviado para grupo lead-notifications');
      
      // Atualizar contagem de leads para admins
      // Função updateLeadCount será chamada pelo server.js
    } else {
      console.log('⚠️ [SOCKET.IO] Socket.IO não disponível - evento new-lead não enviado');
    }
    
    // Emitir evento Socket.IO para notificar incorporadora sobre novo lead
    // APENAS se for da incorporadora (empresa_id = 5)
    if (req.io && data[0].empresa_id === 5) {
      console.log('📢 [SOCKET.IO] Emitindo evento new-lead-incorporadora:', {
        leadId: data[0].id,
        nome: data[0].nome,
        cidade: data[0].cidade,
        estado: data[0].estado,
        consultorId: consultorId,
        empresa_id: data[0].empresa_id,
        origem: consultorId ? `Freelancer (empresa_id=${empresaId})` : 
               empresaId === 5 ? 'CapturaClientes (Incorporadora - empresa_id=5)' : 
               'CapturaLead (Outra empresa - empresa_id=3)',
        timestamp: new Date().toISOString(),
        room: 'incorporadora-notifications'
      });
      
      // Buscar dados do consultor/SDR se existir
      let consultorData = null;
      if (consultorId) {
        const { data: consultorResult } = await supabaseAdmin
          .from('consultores')
          .select('nome, foto_url')
          .eq('id', consultorId)
          .single();
        
        consultorData = consultorResult;
        console.log('👤 [SOCKET.IO] Dados do consultor/SDR encontrados:', {
          consultorId: consultorId,
          nome: consultorData?.nome || 'N/A',
          temFoto: !!consultorData?.foto_url
        });
      } else {
        console.log('ℹ️ [SOCKET.IO] Lead sem consultor atribuído - notificação será enviada mesmo assim');
      }

      req.io.to('incorporadora-notifications').emit('new-lead-incorporadora', {
        leadId: data[0].id,
        nome: data[0].nome,
        telefone: data[0].telefone,
        cidade: data[0].cidade,
        estado: data[0].estado,
        empreendimento_id: data[0].empreendimento_id,
        consultor_nome: consultorData?.nome || 'Sem consultor',
        consultor_foto: consultorData?.foto_url || null,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ [SOCKET.IO] Evento new-lead-incorporadora enviado para grupo incorporadora-notifications');
    } else {
      console.log('⚠️ [SOCKET.IO] Evento new-lead-incorporadora não enviado:', {
        temSocketIO: !!req.io,
        empresaId: data[0].empresa_id,
        origem: consultorId ? `Freelancer (empresa_id=${empresaId})` : 
               empresaId === 5 ? 'CapturaClientes (Incorporadora - empresa_id=5)' : 
               'CapturaLead (Outra empresa - empresa_id=3)',
        motivo: !req.io ? 'Socket.IO não disponível' : 
                data[0].empresa_id !== 5 ? 'Não é incorporadora - lead vai para empresa_id=3' : 'Desconhecido'
      });
    }
    
    res.json({ 
      id: data[0].id, 
      message: 'Cadastro realizado com sucesso! Entraremos em contato em breve.',
      nome: nome.trim()
    });
  } catch (error) {
    console.error('❌ Erro no cadastro de lead:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Erro interno do servidor. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

