import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, Lead, CreateLeadRequest, UpdateLeadRequest } from '../types';
import { getSocketService } from '../services/socketService';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Controller para listar leads
export const listLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/leads - Usuário:', {
      id: req.user.id,
      tipo: req.user.tipo,
      nome: req.user.nome
    });

    // Parâmetros de query para filtros
    const { 
      consultor_id, 
      clinica_id, 
      status, 
      fonte,
      data_inicio, 
      data_fim,
      page = '1',
      limit = '50'
    } = req.query;

    let query = supabase
      .from('leads')
      .select(`
        *,
        consultores(nome, email),
        clinicas(nome, cidade, estado)
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    if (req.user.tipo === 'consultor') {
      // Consultor vê seus leads
      query = query.eq('consultor_id', req.user.id);
    } else if (req.user.tipo === 'clinica') {
      // Clínica vê leads atribuídos a ela
      query = query.eq('clinica_id', req.user.id);
    } else if (req.user.tipo === 'empresa') {
      // Empresa vê leads de seus consultores
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
    // Admin vê todos os leads

    // Aplicar filtros adicionais
    if (consultor_id) {
      query = query.eq('consultor_id', consultor_id);
    }
    if (clinica_id) {
      query = query.eq('clinica_id', clinica_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (fonte) {
      query = query.eq('fonte', fonte);
    }
    if (data_inicio) {
      query = query.gte('created_at', data_inicio);
    }
    if (data_fim) {
      query = query.lte('created_at', data_fim);
    }

    // Paginação
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar leads:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar leads' 
      });
      return;
    }

    console.log(`✅ Retornando ${data?.length || 0} leads`);

    res.json({
      success: true,
      leads: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para capturar lead (público - sem autenticação)
export const capturarLead = async (req: any, res: Response): Promise<void> => {
  try {
    const { 
      nome, 
      email, 
      telefone,
      clinica_id,
      consultor_id,
      fonte = 'landing_page',
      observacoes,
      utm_source,
      utm_medium,
      utm_campaign
    }: CreateLeadRequest = req.body;

    // Validações básicas
    if (!nome || !email || !telefone) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome, email e telefone são obrigatórios' 
      });
      return;
    }

    // Normalizar email
    const emailNormalizado = email.toLowerCase().trim();

    // Verificar se email já existe
    const { data: emailExistente } = await supabase
      .from('leads')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailExistente && emailExistente.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Este email já foi cadastrado como lead!' 
      });
      return;
    }

    // Verificar se consultor existe (se fornecido)
    let consultorId = consultor_id;
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

    // Verificar se clínica existe (se fornecida)
    let clinicaId = clinica_id;
    if (clinica_id) {
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
    }

    // Preparar dados do lead
    const leadData: Partial<Lead> = {
      nome,
      email: emailNormalizado,
      telefone,
      status: 'novo',
      fonte,
      ...(observacoes && { observacoes }),
      ...(utm_source && { utm_source }),
      ...(utm_medium && { utm_medium }),
      ...(utm_campaign && { utm_campaign })
    };

    if (consultorId) {
      leadData.consultor_id = consultorId;
    }
    if (clinicaId) {
      leadData.clinica_id = clinicaId;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select();

    if (error) {
      console.error('Erro ao capturar lead:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao capturar lead' 
      });
      return;
    }

    // Enviar notificação via Socket.IO
    try {
      const socketService = getSocketService();
      socketService.notifyNewLead(data[0]);
      console.log(`📢 Notificação de novo lead enviada: ${data[0].nome}`);
    } catch (socketError) {
      console.error('❌ Erro ao enviar notificação Socket.IO:', socketError);
      // Não falhar a operação se a notificação falhar
    }

    res.status(201).json({
      success: true,
      message: 'Lead capturado com sucesso',
      lead: data[0]
    });

  } catch (error) {
    console.error('Erro ao capturar lead:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para criar lead (autenticado)
export const createLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { 
      nome, 
      email, 
      telefone,
      clinica_id,
      consultor_id,
      fonte = 'manual',
      observacoes,
      utm_source,
      utm_medium,
      utm_campaign
    }: CreateLeadRequest = req.body;

    // Validações básicas
    if (!nome || !email || !telefone) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome, email e telefone são obrigatórios' 
      });
      return;
    }

    // Normalizar email
    const emailNormalizado = email.toLowerCase().trim();

    // Verificar se email já existe
    const { data: emailExistente } = await supabase
      .from('leads')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailExistente && emailExistente.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Este email já foi cadastrado como lead!' 
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

    // Verificar se clínica existe (se fornecida)
    let clinicaId = clinica_id;
    if (clinica_id) {
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
    }

    // Preparar dados do lead
    const leadData: Partial<Lead> = {
      nome,
      email: emailNormalizado,
      telefone,
      status: 'novo',
      fonte,
      ...(observacoes && { observacoes }),
      ...(utm_source && { utm_source }),
      ...(utm_medium && { utm_medium }),
      ...(utm_campaign && { utm_campaign })
    };

    if (consultorId) {
      leadData.consultor_id = consultorId;
    }
    if (clinicaId) {
      leadData.clinica_id = clinicaId;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select();

    if (error) {
      console.error('Erro ao criar lead:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar lead' 
      });
      return;
    }

    // Enviar notificação via Socket.IO
    try {
      const socketService = getSocketService();
      socketService.notifyNewLead(data[0]);
      console.log(`📢 Notificação de novo lead enviada: ${data[0].nome}`);
    } catch (socketError) {
      console.error('❌ Erro ao enviar notificação Socket.IO:', socketError);
      // Não falhar a operação se a notificação falhar
    }

    res.status(201).json({
      success: true,
      message: 'Lead criado com sucesso',
      lead: data[0]
    });

  } catch (error) {
    console.error('Erro ao criar lead:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter lead específico
export const getLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      .from('leads')
      .select(`
        *,
        consultores(nome, email),
        clinicas(nome, cidade, estado)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar lead:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar lead' 
      });
      return;
    }

    if (!data) {
      res.status(404).json({ 
        success: false, 
        error: 'Lead não encontrado' 
      });
      return;
    }

    // Verificar permissões de acesso
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todos
      req.user.id === data.consultor_id || // Próprio consultor
      req.user.id === data.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && data.consultor_id && 
       await verificarConsultorDaEmpresa(data.consultor_id, req.user.id)); // Empresa vê leads de seus consultores

    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    res.json({
      success: true,
      lead: data
    });

  } catch (error) {
    console.error('Erro ao obter lead:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar lead
export const updateLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      clinica_id,
      consultor_id,
      status,
      observacoes,
      utm_source,
      utm_medium,
      utm_campaign
    }: UpdateLeadRequest = req.body;

    // Verificar se o lead existe
    const { data: leadExistente, error: checkError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !leadExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Lead não encontrado' 
      });
      return;
    }

    // Verificar permissões de edição
    const podeEditar = 
      req.user.tipo === 'admin' || // Admin pode editar todos
      req.user.id === leadExistente.consultor_id || // Próprio consultor
      req.user.id === leadExistente.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && leadExistente.consultor_id && 
       await verificarConsultorDaEmpresa(leadExistente.consultor_id, req.user.id)); // Empresa pode editar leads de seus consultores

    if (!podeEditar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: Partial<Lead> = {};
    
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) {
      const emailNormalizado = email.toLowerCase().trim();
      
      // Verificar se o novo email já existe em outro lead
      const { data: emailExistente } = await supabase
        .from('leads')
        .select('id')
        .eq('email', emailNormalizado)
        .neq('id', id)
        .limit(1);

      if (emailExistente && emailExistente.length > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Este email já está sendo usado por outro lead' 
        });
        return;
      }
      
      updateData.email = emailNormalizado;
    }
    if (telefone !== undefined) updateData.telefone = telefone;
    if (clinica_id !== undefined) updateData.clinica_id = clinica_id;
    if (consultor_id !== undefined) updateData.consultor_id = consultor_id;
    if (status !== undefined) updateData.status = status;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (utm_source !== undefined) updateData.utm_source = utm_source;
    if (utm_medium !== undefined) updateData.utm_medium = utm_medium;
    if (utm_campaign !== undefined) updateData.utm_campaign = utm_campaign;

    // Atualizar lead
    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar lead:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar lead' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Lead atualizado com sucesso',
      lead: data[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para converter lead em paciente
export const converterLeadEmPaciente = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      clinica_id,
      consultor_id,
      observacoes
    } = req.body;

    // Verificar se o lead existe
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      res.status(404).json({ 
        success: false, 
        error: 'Lead não encontrado' 
      });
      return;
    }

    // Verificar permissões
    const podeConverter = 
      req.user.tipo === 'admin' || // Admin pode converter todos
      req.user.id === lead.consultor_id || // Próprio consultor
      req.user.id === lead.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && lead.consultor_id && 
       await verificarConsultorDaEmpresa(lead.consultor_id, req.user.id)); // Empresa pode converter leads de seus consultores

    if (!podeConverter) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Verificar se já existe paciente com este email
    const { data: pacienteExistente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', lead.email)
      .limit(1);

    if (pacienteExistente && pacienteExistente.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Já existe um paciente cadastrado com este email' 
      });
      return;
    }

    // Criar paciente a partir do lead
    const pacienteData = {
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      status: 'novo' as const,
      observacoes: observacoes || lead.observacoes,
      consultor_id: consultor_id || lead.consultor_id || req.user.id,
      clinica_id: clinica_id || lead.clinica_id
    };

    const { data: paciente, error: pacienteError } = await supabase
      .from('pacientes')
      .insert([pacienteData])
      .select();

    if (pacienteError) {
      console.error('Erro ao criar paciente:', pacienteError);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao converter lead em paciente' 
      });
      return;
    }

    // Atualizar lead para "convertido"
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        status: 'convertido',
        observacoes: lead.observacoes ? `${lead.observacoes}\n[CONVERTIDO] Convertido em paciente` : '[CONVERTIDO] Convertido em paciente'
      })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao atualizar lead:', updateError);
      // Não falhar a operação por causa disso
    }

    res.json({
      success: true,
      message: 'Lead convertido em paciente com sucesso',
      lead: { ...lead, status: 'convertido' },
      paciente: paciente[0]
    });

  } catch (error) {
    console.error('Erro ao converter lead:', error);
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
