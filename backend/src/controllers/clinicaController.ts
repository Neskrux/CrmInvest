import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, Clinica, CreateClinicaRequest, UpdateClinicaRequest } from '../types';
import { getSocketService } from '../services/socketService';
import { formatarRespostaAPI, formatarErroAPI } from '../utils';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para normalizar email
const normalizarEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

// Controller para listar clínicas
export const listClinicas = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/clinicas - Usuário:', {
      id: req.user.id,
      tipo: req.user.tipo,
      nome: req.user.nome
    });

    let query = supabase
      .from('clinicas')
      .select('*')
      .order('nome');

    // Se for consultor freelancer (não tem as duas permissões), filtrar apenas clínicas atribuídas a ele
    // Consultores internos (com pode_ver_todas_novas_clinicas=true E podealterarstatus=true) veem todas as clínicas
    if (req.user.tipo === 'consultor') {
      console.log('👨‍💼 Consultor acessando clínicas:', {
        consultor_id: req.user.id,
        consultor_nome: req.user.nome,
        pode_ver_todas_novas_clinicas: req.user.pode_ver_todas_novas_clinicas,
        podealterarstatus: req.user.podealterarstatus
      });

      // Consultores internos veem todas as clínicas
      if (req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true) {
        console.log('✅ Consultor interno - vendo todas as clínicas');
        // Não aplicar filtro - ver todas
      } else {
        console.log('🔒 Consultor freelancer - filtrando clínicas');
        // Filtrar apenas clínicas atribuídas ao consultor
        query = query.eq('consultor_id', req.user.id);
      }
    }
    // Admin vê todas as clínicas
    else if (req.user.tipo === 'admin') {
      console.log('👑 Admin - vendo todas as clínicas');
      // Não aplicar filtro - ver todas
    }
    // Empresa vê clínicas de seus consultores
    else if (req.user.tipo === 'empresa') {
      console.log('🏢 Empresa acessando clínicas:', {
        empresa_id: req.user.id,
        empresa_nome: req.user.nome
      });
      
      // Buscar consultores da empresa
      const { data: consultores, error: consultoresError } = await supabase
        .from('consultores')
        .select('id')
        .eq('empresa_id', req.user.id);

      if (consultoresError) {
        console.error('Erro ao buscar consultores da empresa:', consultoresError);
        res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar consultores' 
        });
        return;
      }

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      if (consultorIds.length > 0) {
        // Filtrar clínicas dos consultores da empresa
        query = query.in('consultor_id', consultorIds);
      } else {
        // Se não tem consultores, retornar array vazio
        query = query.eq('id', '0'); // Condição que nunca será verdadeira
      }
    }
    // Clínica vê apenas seus próprios dados
    else if (req.user.tipo === 'clinica') {
      console.log('🏥 Clínica acessando seus dados:', {
        clinica_id: req.user.id,
        clinica_nome: req.user.nome
      });
      query = query.eq('id', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar clínicas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar clínicas' 
      });
      return;
    }

    console.log(`✅ Retornando ${data?.length || 0} clínicas`);

    res.json({
      success: true,
      clinicas: data || []
    });

  } catch (error) {
    console.error('Erro ao listar clínicas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para criar clínica
export const createClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Verificar permissões - apenas admin ou consultor interno pode criar clínicas
    if (req.user.tipo !== 'admin' && 
        !(req.user.tipo === 'consultor' && 
          req.user.pode_ver_todas_novas_clinicas === true && 
          req.user.podealterarstatus === true)) {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores ou consultores internos podem criar clínicas' 
      });
      return;
    }

    const { 
      nome, 
      email, 
      telefone, 
      endereco,
      cidade,
      estado,
      cep,
      status = 'ativa',
      consultor_id
    }: CreateClinicaRequest = req.body;

    // Validações básicas
    if (!nome || !email || !telefone) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome, email e telefone são obrigatórios' 
      });
      return;
    }

    // Normalizar email
    const emailNormalizado = normalizarEmail(email);

    // Verificar se email já existe
    const { data: emailExistente } = await supabase
      .from('clinicas')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailExistente && emailExistente.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Este email já está cadastrado!' 
      });
      return;
    }

    // Preparar dados da clínica
    const clinicaData: Partial<Clinica> = {
      nome,
      email: emailNormalizado,
      telefone,
      ...(endereco && { endereco }),
      ...(cidade && { cidade }),
      ...(estado && { estado }),
      ...(cep && { cep }),
      status
    };
    
    if (consultor_id !== undefined) {
      clinicaData.consultor_id = consultor_id;
    } else if (req.user.tipo === 'consultor') {
      clinicaData.consultor_id = req.user.id;
    }

    const { data, error } = await supabase
      .from('clinicas')
      .insert([clinicaData])
      .select();

    if (error) {
      console.error('Erro ao criar clínica:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar clínica' 
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Clínica criada com sucesso',
      clinica: data[0]
    });

  } catch (error) {
    console.error('Erro ao criar clínica:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter clínica específica
export const getClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('clinicas')
      .select(`
        *,
        consultores(nome, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar clínica:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar clínica' 
      });
      return;
    }

    if (!data) {
      res.status(404).json({ 
        success: false, 
        error: 'Clínica não encontrada' 
      });
      return;
    }

    // Verificar permissões de acesso
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todas
      req.user.id === data.consultor_id || // Próprio consultor
      req.user.id === data.id || // Própria clínica
      (req.user.tipo === 'empresa' && data.consultor_id && 
       await verificarConsultorDaEmpresa(data.consultor_id, req.user.id)); // Empresa vê clínicas de seus consultores

    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    res.json({
      success: true,
      clinica: data
    });

  } catch (error) {
    console.error('Erro ao obter clínica:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar clínica
export const updateClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { id } = req.params;
    const { 
      nome, 
      email, 
      telefone, 
      endereco,
      cidade,
      estado,
      cep,
      status,
      consultor_id
    }: UpdateClinicaRequest = req.body;

    // Verificar se a clínica existe
    const { data: clinicaExistente, error: checkError } = await supabase
      .from('clinicas')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !clinicaExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Clínica não encontrada' 
      });
      return;
    }

    // Verificar permissões de edição
    const podeEditar = 
      req.user.tipo === 'admin' || // Admin pode editar todas
      req.user.id === clinicaExistente.consultor_id || // Próprio consultor
      req.user.id === clinicaExistente.id || // Própria clínica
      (req.user.tipo === 'empresa' && clinicaExistente.consultor_id && 
       await verificarConsultorDaEmpresa(clinicaExistente.consultor_id, req.user.id)); // Empresa pode editar clínicas de seus consultores

    if (!podeEditar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: Partial<Clinica> = {};
    
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) {
      const emailNormalizado = email.toLowerCase().trim();
      
      // Verificar se o novo email já existe em outra clínica
      const { data: emailExistente } = await supabase
        .from('clinicas')
        .select('id')
        .eq('email', emailNormalizado)
        .neq('id', id)
        .limit(1);

      if (emailExistente && emailExistente.length > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Este email já está sendo usado por outra clínica' 
        });
        return;
      }
      
      updateData.email = emailNormalizado;
    }
    if (telefone !== undefined) updateData.telefone = telefone;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (cidade !== undefined) updateData.cidade = cidade;
    if (estado !== undefined) updateData.estado = estado;
    if (cep !== undefined) updateData.cep = cep;
    if (status !== undefined) updateData.status = status;
    if (consultor_id !== undefined) updateData.consultor_id = consultor_id;

    // Atualizar clínica
    const { data, error } = await supabase
      .from('clinicas')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar clínica:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar clínica' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Clínica atualizada com sucesso',
      clinica: data[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar clínica:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter estatísticas da clínica
export const getClinicaStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { id } = req.params;

    // Verificar se a clínica existe e se o usuário tem acesso
    const { data: clinica, error: checkError } = await supabase
      .from('clinicas')
      .select('id, nome, consultor_id')
      .eq('id', id)
      .single();

    if (checkError || !clinica) {
      res.status(404).json({ 
        success: false, 
        error: 'Clínica não encontrada' 
      });
      return;
    }

    // Verificar permissões de acesso
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todas
      req.user.id === clinica.consultor_id || // Próprio consultor
      req.user.id === clinica.id || // Própria clínica
      (req.user.tipo === 'empresa' && clinica.consultor_id && 
       await verificarConsultorDaEmpresa(clinica.consultor_id, req.user.id)); // Empresa vê clínicas de seus consultores

    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Buscar estatísticas
    const [pacientesResult, agendamentosResult, fechamentosResult] = await Promise.all([
      // Total de pacientes da clínica
      supabase
        .from('pacientes')
        .select('id', { count: 'exact' })
        .eq('clinica_id', id),
      
      // Total de agendamentos da clínica
      supabase
        .from('agendamentos')
        .select('id', { count: 'exact' })
        .eq('clinica_id', id),
      
      // Total de fechamentos da clínica
      supabase
        .from('fechamentos')
        .select('id, valor_fechado', { count: 'exact' })
        .eq('clinica_id', id)
    ]);

    const totalPacientes = pacientesResult.count || 0;
    const totalAgendamentos = agendamentosResult.count || 0;
    const totalFechamentos = fechamentosResult.count || 0;
    const valorTotalFechamentos = fechamentosResult.data?.reduce((sum, f) => sum + (f.valor_fechado || 0), 0) || 0;

    res.json({
      success: true,
      stats: {
        clinica_id: id,
        clinica_nome: clinica.nome,
        total_pacientes: totalPacientes,
        total_agendamentos: totalAgendamentos,
        total_fechamentos: totalFechamentos,
        valor_total_fechamentos: valorTotalFechamentos
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas da clínica:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Função auxiliar para verificar se um consultor pertence a uma empresa
const verificarConsultorDaEmpresa = async (consultorId: string, empresaId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('consultores')
      .select('id')
      .eq('id', consultorId)
      .eq('empresa_id', empresaId)
      .limit(1);

    return !!(data && data.length > 0);
  } catch (error) {
    console.error('Erro ao verificar consultor da empresa:', error);
    return false;
  }
};

// ===== FUNCIONALIDADES DE NOVAS CLÍNICAS =====

// Controller para listar novas clínicas
export const listNovasClinicas = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    console.log('🔍 GET /api/clinicas/novas - Usuário:', {
      id: req.user.id,
      tipo: req.user.tipo,
      nome: req.user.nome
    });

    let query = supabase
      .from('novas_clinicas')
      .select(`
        *,
        consultores(nome, email, empresas(nome))
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    if (req.user.tipo === 'consultor') {
      // Consultores freelancers veem apenas suas próprias clínicas
      if (!(req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true)) {
        query = query.eq('criado_por_consultor_id', req.user.id);
      }
      // Consultores internos veem todas (não aplicar filtro)
    } else if (req.user.tipo === 'empresa') {
      // Empresa vê clínicas de seus consultores OU cadastradas diretamente pela empresa
      query = query.or(`empresa_id.eq.${req.user.id},criado_por_consultor_id.in.(${await getConsultorIdsDaEmpresa(req.user.id)})`);
    }
    // Admin vê todas (não aplicar filtro)

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar novas clínicas:', error);
      res.status(500).json(formatarErroAPI('Erro ao buscar novas clínicas', 500));
      return;
    }

    // Formatar dados para incluir informações do consultor e empresa
    const formattedData = data?.map(clinica => ({
      ...clinica,
      consultor_nome: clinica.consultores?.nome,
      empresa_id: clinica.empresa_id || clinica.consultores?.empresa_id || null,
      empresa_nome: clinica.consultores?.empresas?.nome || null
    })) || [];

    console.log(`✅ Retornando ${formattedData.length} novas clínicas`);

    res.json(formatarRespostaAPI(formattedData, 'Novas clínicas listadas com sucesso'));

  } catch (error) {
    console.error('Erro ao listar novas clínicas:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// Controller para criar nova clínica
export const createNovaClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    const { 
      nome, 
      cnpj, 
      responsavel, 
      endereco, 
      bairro, 
      cidade, 
      estado, 
      nicho, 
      telefone, 
      email, 
      status = 'tem_interesse', 
      observacoes 
    } = req.body;

    // Validações básicas
    if (!nome || !telefone) {
      res.status(400).json(formatarErroAPI('Nome e telefone são obrigatórios', 400));
      return;
    }

    // Normalizar telefone e CNPJ
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cnpjNumeros = cnpj ? cnpj.replace(/\D/g, '') : '';

    // Verificar se telefone já existe
    if (telefoneNumeros) {
      const { data: telefoneExistente } = await supabase
        .from('novas_clinicas')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .limit(1);

      if (telefoneExistente && telefoneExistente.length > 0) {
        const clinicaExistente = telefoneExistente[0];
        if (clinicaExistente) {
          const dataCadastro = new Date(clinicaExistente.created_at).toLocaleDateString('pt-BR');
          res.status(400).json(formatarErroAPI(
            `Este número de telefone já está cadastrado para ${clinicaExistente.nome} (cadastrado em ${dataCadastro}).`, 
            400
          ));
          return;
        }
      }
    }

    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;

    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json() as any[];
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
        // Continua sem coordenadas se falhar
      }
    }

    // Preparar dados para inserção
    const clinicaData = {
      nome,
      cnpj: cnpjNumeros,
      responsavel,
      endereco,
      bairro,
      cidade,
      estado,
      nicho,
      telefone: telefoneNumeros,
      email,
      status,
      observacoes,
      latitude,
      longitude,
      criado_por_consultor_id: req.user.tipo === 'consultor' ? req.user.id : null,
      empresa_id: req.user.tipo === 'empresa' ? req.user.id : null,
      tipo_origem: 'aprovada'
    };

    const { data, error } = await supabase
      .from('novas_clinicas')
      .insert([clinicaData])
      .select();

    if (error) {
      console.error('Erro ao criar nova clínica:', error);
      res.status(500).json(formatarErroAPI('Erro ao criar nova clínica', 500));
      return;
    }

    console.log('✅ Nova clínica cadastrada com sucesso:', {
      id: data[0].id,
      nome: data[0].nome,
      cidade: data[0].cidade,
      estado: data[0].estado
    });

    // Enviar notificação via Socket.IO
    try {
      const socketService = getSocketService();
      socketService.sendToAdmins({
        type: 'system',
        title: '🏥 Nova Clínica Cadastrada',
        message: `Nova clínica ${data[0].nome} cadastrada em ${data[0].cidade}/${data[0].estado}`,
        data: {
          clinicaId: data[0].id,
          nome: data[0].nome,
          cidade: data[0].cidade,
          estado: data[0].estado,
          telefone: data[0].telefone,
          email: data[0].email,
          nicho: data[0].nicho,
          status: data[0].status,
          observacoes: data[0].observacoes,
          criado_por_consultor_id: data[0].criado_por_consultor_id,
          created_at: data[0].created_at
        }
      });
    } catch (socketError) {
      console.error('❌ Erro ao enviar notificação Socket.IO:', socketError);
    }

    res.status(201).json(formatarRespostaAPI({
      id: data[0].id,
      clinica: data[0]
    }, 'Nova clínica cadastrada com sucesso'));

  } catch (error) {
    console.error('Erro ao criar nova clínica:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// Controller para atualizar nova clínica
export const updateNovaClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    // Apenas admin pode editar novas clínicas
    if (req.user.tipo !== 'admin') {
      res.status(403).json(formatarErroAPI('Apenas administradores podem editar novas clínicas', 403));
      return;
    }

    const { id } = req.params;
    const { 
      nome, 
      cnpj, 
      responsavel, 
      endereco, 
      bairro, 
      cidade, 
      estado, 
      nicho, 
      telefone, 
      email, 
      status, 
      observacoes 
    } = req.body;

    // Normalizar telefone e CNPJ
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cnpjNumeros = cnpj ? cnpj.replace(/\D/g, '') : '';

    // Verificar se telefone já existe (excluindo a própria clínica)
    if (telefoneNumeros) {
      const { data: telefoneExistente } = await supabase
        .from('novas_clinicas')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .neq('id', id)
        .limit(1);

      if (telefoneExistente && telefoneExistente.length > 0) {
        const clinicaExistente = telefoneExistente[0];
        if (clinicaExistente) {
          const dataCadastro = new Date(clinicaExistente.created_at).toLocaleDateString('pt-BR');
          res.status(400).json(formatarErroAPI(
            `Este número de telefone já está cadastrado para ${clinicaExistente.nome} (cadastrado em ${dataCadastro}).`, 
            400
          ));
          return;
        }
      }
    }

    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;

    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json() as any[];
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
        // Continua sem coordenadas se falhar
      }
    }

    // Preparar dados para atualização
    const clinicaData = {
      ...(nome !== undefined && { nome }),
      ...(cnpjNumeros !== undefined && { cnpj: cnpjNumeros }),
      ...(responsavel !== undefined && { responsavel }),
      ...(endereco !== undefined && { endereco }),
      ...(bairro !== undefined && { bairro }),
      ...(cidade !== undefined && { cidade }),
      ...(estado !== undefined && { estado }),
      ...(nicho !== undefined && { nicho }),
      ...(telefoneNumeros !== undefined && { telefone: telefoneNumeros }),
      ...(email !== undefined && { email }),
      ...(status !== undefined && { status }),
      ...(observacoes !== undefined && { observacoes }),
      ...(latitude !== null && { latitude }),
      ...(longitude !== null && { longitude })
    };

    const { data, error } = await supabase
      .from('novas_clinicas')
      .update(clinicaData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar nova clínica:', error);
      res.status(500).json(formatarErroAPI('Erro ao atualizar nova clínica', 500));
      return;
    }

    if (!data || data.length === 0) {
      res.status(404).json(formatarErroAPI('Nova clínica não encontrada', 404));
      return;
    }

    console.log('✅ Nova clínica atualizada com sucesso:', {
      id: data[0].id,
      nome: data[0].nome,
      cidade: data[0].cidade,
      estado: data[0].estado
    });

    res.json(formatarRespostaAPI({
      clinica: data[0]
    }, 'Nova clínica atualizada com sucesso'));

  } catch (error) {
    console.error('Erro ao atualizar nova clínica:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// Controller para aprovar clínica (mover de novas_clinicas para clinicas)
export const aprovarClinica = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    // Apenas admin pode aprovar clínicas
    if (req.user.tipo !== 'admin') {
      res.status(403).json(formatarErroAPI('Apenas administradores podem aprovar clínicas', 403));
      return;
    }

    const { id } = req.params;

    // Verificar se a clínica ainda está disponível
    const { data: clinicaAtual, error: checkError } = await supabase
      .from('novas_clinicas')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !clinicaAtual) {
      res.status(404).json(formatarErroAPI('Nova clínica não encontrada', 404));
      return;
    }

    if (clinicaAtual.consultor_id !== null) {
      res.status(400).json(formatarErroAPI('Esta clínica já foi aprovada', 400));
      return;
    }

    // Mover a clínica da tabela novas_clinicas para clinicas
    const clinicaParaMover = {
      nome: clinicaAtual.nome,
      endereco: clinicaAtual.endereco,
      bairro: clinicaAtual.bairro,
      cidade: clinicaAtual.cidade,
      estado: clinicaAtual.estado,
      nicho: clinicaAtual.nicho,
      telefone: clinicaAtual.telefone,
      email: clinicaAtual.email,
      status: 'em_analise',
      em_analise: true,
      consultor_id: clinicaAtual.criado_por_consultor_id,
      empresa_id: clinicaAtual.empresa_id,
      tipo_origem: 'aprovada'
    };

    // Inserir na tabela clinicas
    const { data: clinicaInserida, error: insertError } = await supabase
      .from('clinicas')
      .insert([clinicaParaMover])
      .select();

    if (insertError) {
      console.error('Erro ao inserir clínica aprovada:', insertError);
      res.status(500).json(formatarErroAPI('Erro ao aprovar clínica', 500));
      return;
    }

    console.log('✅ Clínica movida para análise com sucesso! ID:', clinicaInserida[0]?.id);

    // Remover da tabela novas_clinicas
    const { error: deleteError } = await supabase
      .from('novas_clinicas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao remover da tabela novas_clinicas:', deleteError);
      // Não falhar a operação, pois a clínica já foi movida
    }

    // Enviar notificação via Socket.IO
    try {
      const socketService = getSocketService();
      socketService.sendToAdmins({
        type: 'system',
        title: '✅ Clínica Aprovada',
        message: `Clínica ${clinicaAtual.nome} foi aprovada e movida para análise`,
        data: {
          clinicaId: clinicaInserida[0]?.id,
          nome: clinicaAtual.nome,
          cidade: clinicaAtual.cidade,
          estado: clinicaAtual.estado,
          consultor_id: clinicaAtual.criado_por_consultor_id
        }
      });
    } catch (socketError) {
      console.error('❌ Erro ao enviar notificação Socket.IO:', socketError);
    }

    res.json(formatarRespostaAPI({
      clinica: clinicaInserida[0],
      message: 'Clínica aprovada e movida para análise com sucesso'
    }, 'Clínica aprovada com sucesso'));

  } catch (error) {
    console.error('Erro ao aprovar clínica:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// Função auxiliar para obter IDs dos consultores de uma empresa
const getConsultorIdsDaEmpresa = async (empresaId: string): Promise<string> => {
  try {
    const { data: consultores } = await supabase
      .from('consultores')
      .select('id')
      .eq('empresa_id', empresaId);

    return consultores ? consultores.map(c => c.id).join(',') : '';
  } catch (error) {
    console.error('Erro ao buscar consultores da empresa:', error);
    return '';
  }
};
