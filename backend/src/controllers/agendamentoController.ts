import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, Agendamento, CreateAgendamentoRequest, UpdateAgendamentoRequest } from '../types';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Controller para listar agendamentos
export const listAgendamentos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/agendamentos - Usuário:', {
      id: req.user.id,
      tipo: req.user.tipo,
      nome: req.user.nome
    });

    // Parâmetros de query para filtros
    const { 
      clinica_id, 
      consultor_id, 
      paciente_id, 
      status, 
      data_inicio, 
      data_fim,
      page = '1',
      limit = '50'
    } = req.query;

    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, email, telefone),
        consultores(nome, email),
        clinicas(nome, cidade, estado)
      `)
      .order('data_agendamento', { ascending: true })
      .order('horario', { ascending: true });

    // Aplicar filtros baseados no tipo de usuário
    if (req.user.tipo === 'clinica') {
      // Clínica vê apenas seus agendamentos
      query = query.eq('clinica_id', req.user.id);
    } else if (req.user.tipo === 'consultor') {
      // Consultor vê seus agendamentos
      query = query.eq('consultor_id', req.user.id);
    } else if (req.user.tipo === 'empresa') {
      // Empresa vê agendamentos de seus consultores
      const { data: consultores } = await supabase
        .from('consultores')
        .select('id')
        .eq('empresa_id', req.user.id);

      const consultorIds = consultores ? consultores.map(c => c.id) : [];
      
      if (consultorIds.length > 0) {
        query = query.in('consultor_id', consultorIds);
      } else {
        query = query.eq('id', '0'); // Condição que nunca será verdadeira
      }
    }
    // Admin vê todos os agendamentos

    // Aplicar filtros adicionais
    if (clinica_id) {
      query = query.eq('clinica_id', clinica_id);
    }
    if (consultor_id) {
      query = query.eq('consultor_id', consultor_id);
    }
    if (paciente_id) {
      query = query.eq('paciente_id', paciente_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (data_inicio) {
      query = query.gte('data_agendamento', data_inicio);
    }
    if (data_fim) {
      query = query.lte('data_agendamento', data_fim);
    }

    // Paginação
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar agendamentos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar agendamentos' 
      });
      return;
    }

    console.log(`✅ Retornando ${data?.length || 0} agendamentos`);

    res.json({
      success: true,
      agendamentos: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para criar agendamento
export const createAgendamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { 
      paciente_id, 
      clinica_id, 
      consultor_id,
      data_agendamento,
      horario,
      status = 'agendado',
      observacoes
    }: CreateAgendamentoRequest = req.body;

    // Validações básicas
    if (!paciente_id || !clinica_id || !data_agendamento || !horario) {
      res.status(400).json({ 
        success: false, 
        error: 'Paciente, clínica, data e horário são obrigatórios' 
      });
      return;
    }

    // Verificar se paciente existe
    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .select('id, nome')
      .eq('id', paciente_id)
      .single();

    if (pacienteError || !paciente) {
      res.status(400).json({ 
        success: false, 
        error: 'Paciente não encontrado' 
      });
      return;
    }

    // Verificar se clínica existe
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('id, nome')
      .eq('id', clinica_id)
      .single();

    if (clinicaError || !clinica) {
      res.status(400).json({ 
        success: false, 
        error: 'Clínica não encontrada' 
      });
      return;
    }

    // Verificar se consultor existe (se fornecido)
    let consultorId = consultor_id || req.user.id;
    if (consultor_id) {
      const { data: consultor, error: consultorError } = await supabase
        .from('consultores')
        .select('id, nome')
        .eq('id', consultor_id)
        .single();

      if (consultorError || !consultor) {
        res.status(400).json({ 
          success: false, 
          error: 'Consultor não encontrado' 
        });
        return;
      }
    }

    // Verificar conflito de horário
    const { data: conflito } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('data_agendamento', data_agendamento)
      .eq('horario', horario)
      .neq('status', 'cancelado')
      .limit(1);

    if (conflito && conflito.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Já existe um agendamento neste horário para esta clínica' 
      });
      return;
    }

    // Preparar dados do agendamento
    const agendamentoData: Partial<Agendamento> = {
      paciente_id,
      clinica_id,
      consultor_id: consultorId,
      data_agendamento: new Date(data_agendamento),
      horario,
      status
    };

    if (observacoes !== undefined) {
      agendamentoData.observacoes = observacoes;
    }

    const { data, error } = await supabase
      .from('agendamentos')
      .insert([agendamentoData])
      .select();

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar agendamento' 
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso',
      agendamento: data[0]
    });

  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter agendamento específico
export const getAgendamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, email, telefone),
        consultores(nome, email),
        clinicas(nome, cidade, estado)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar agendamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar agendamento' 
      });
      return;
    }

    if (!data) {
      res.status(404).json({ 
        success: false, 
        error: 'Agendamento não encontrado' 
      });
      return;
    }

    // Verificar permissões de acesso
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todos
      req.user.id === data.consultor_id || // Próprio consultor
      req.user.id === data.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && data.consultor_id && 
       await verificarConsultorDaEmpresa(data.consultor_id, req.user.id)); // Empresa vê agendamentos de seus consultores

    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    res.json({
      success: true,
      agendamento: data
    });

  } catch (error) {
    console.error('Erro ao obter agendamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar agendamento
export const updateAgendamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      paciente_id, 
      clinica_id, 
      consultor_id,
      data_agendamento,
      horario,
      status, 
      observacoes
    }: UpdateAgendamentoRequest = req.body;

    // Verificar se o agendamento existe
    const { data: agendamentoExistente, error: checkError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !agendamentoExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Agendamento não encontrado' 
      });
      return;
    }

    // Verificar permissões de edição
    const podeEditar = 
      req.user.tipo === 'admin' || // Admin pode editar todos
      req.user.id === agendamentoExistente.consultor_id || // Próprio consultor
      req.user.id === agendamentoExistente.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && agendamentoExistente.consultor_id && 
       await verificarConsultorDaEmpresa(agendamentoExistente.consultor_id, req.user.id)); // Empresa pode editar agendamentos de seus consultores

    if (!podeEditar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: Partial<Agendamento> = {};
    
    if (paciente_id !== undefined) updateData.paciente_id = paciente_id;
    if (clinica_id !== undefined) updateData.clinica_id = clinica_id;
    if (consultor_id !== undefined) updateData.consultor_id = consultor_id;
    if (data_agendamento !== undefined) updateData.data_agendamento = new Date(data_agendamento);
    if (horario !== undefined) updateData.horario = horario;
    if (status !== undefined) updateData.status = status;
    if (observacoes !== undefined) updateData.observacoes = observacoes;

    // Se está mudando data/horário/clínica, verificar conflito
    if ((data_agendamento || horario || clinica_id) && 
        (data_agendamento !== agendamentoExistente.data_agendamento || 
         horario !== agendamentoExistente.horario || 
         clinica_id !== agendamentoExistente.clinica_id)) {
      
      const { data: conflito } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('clinica_id', clinica_id || agendamentoExistente.clinica_id)
        .eq('data_agendamento', data_agendamento || agendamentoExistente.data_agendamento)
        .eq('horario', horario || agendamentoExistente.horario)
        .neq('status', 'cancelado')
        .neq('id', id)
        .limit(1);

      if (conflito && conflito.length > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Já existe um agendamento neste horário para esta clínica' 
        });
        return;
      }
    }

    // Atualizar agendamento
    const { data, error } = await supabase
      .from('agendamentos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar agendamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar agendamento' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Agendamento atualizado com sucesso',
      agendamento: data[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para cancelar agendamento
export const cancelAgendamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar se o agendamento existe
    const { data: agendamentoExistente, error: checkError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !agendamentoExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Agendamento não encontrado' 
      });
      return;
    }

    // Verificar permissões
    const podeCancelar = 
      req.user.tipo === 'admin' || // Admin pode cancelar todos
      req.user.id === agendamentoExistente.consultor_id || // Próprio consultor
      req.user.id === agendamentoExistente.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && agendamentoExistente.consultor_id && 
       await verificarConsultorDaEmpresa(agendamentoExistente.consultor_id, req.user.id)); // Empresa pode cancelar agendamentos de seus consultores

    if (!podeCancelar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Verificar se já está cancelado
    if (agendamentoExistente.status === 'cancelado') {
      res.status(400).json({ 
        success: false, 
        error: 'Agendamento já está cancelado' 
      });
      return;
    }

    // Atualizar status para cancelado
    const updateData: Partial<Agendamento> = {
      status: 'cancelado'
    };

    if (motivo) {
      updateData.observacoes = agendamentoExistente.observacoes 
        ? `${agendamentoExistente.observacoes}\n[CANCELADO] ${motivo}`
        : `[CANCELADO] ${motivo}`;
    }

    const { data, error } = await supabase
      .from('agendamentos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao cancelar agendamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao cancelar agendamento' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Agendamento cancelado com sucesso',
      agendamento: data[0]
    });

  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
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
