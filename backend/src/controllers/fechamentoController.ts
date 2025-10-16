import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, Fechamento, CreateFechamentoRequest, UpdateFechamentoRequest } from '../types';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Controller para listar fechamentos
export const listFechamentos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/fechamentos - Usuário:', {
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
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, email, telefone),
        consultores(nome, email),
        clinicas(nome, cidade, estado)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    if (req.user.tipo === 'clinica') {
      // Clínica vê apenas seus fechamentos
      query = query.eq('clinica_id', req.user.id);
    } else if (req.user.tipo === 'consultor') {
      // Consultor vê seus fechamentos
      query = query.eq('consultor_id', req.user.id);
    } else if (req.user.tipo === 'empresa') {
      // Empresa vê fechamentos de seus consultores
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
    // Admin vê todos os fechamentos

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
      query = query.gte('data_fechamento', data_inicio);
    }
    if (data_fim) {
      query = query.lte('data_fechamento', data_fim);
    }

    // Paginação
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar fechamentos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar fechamentos' 
      });
      return;
    }

    console.log(`✅ Retornando ${data?.length || 0} fechamentos`);

    res.json({
      success: true,
      fechamentos: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Erro ao listar fechamentos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para criar fechamento
export const createFechamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      valor_fechado,
      data_fechamento,
      status = 'pendente',
      observacoes,
      tipo_contrato,
      arquivo_contrato
    }: CreateFechamentoRequest = req.body;

    // Validações básicas
    if (!paciente_id || !clinica_id || !valor_fechado || !data_fechamento) {
      res.status(400).json({ 
        success: false, 
        error: 'Paciente, clínica, valor e data são obrigatórios' 
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

    // Verificar se já existe fechamento para este paciente nesta clínica
    const { data: fechamentoExistente } = await supabase
      .from('fechamentos')
      .select('id')
      .eq('paciente_id', paciente_id)
      .eq('clinica_id', clinica_id)
      .eq('status', 'aprovado')
      .limit(1);

    if (fechamentoExistente && fechamentoExistente.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Já existe um fechamento aprovado para este paciente nesta clínica' 
      });
      return;
    }

    // Preparar dados do fechamento
    const fechamentoData: Partial<Fechamento> = {
      paciente_id,
      clinica_id,
      consultor_id: consultorId,
      valor_fechado: parseFloat(valor_fechado.toString()),
      data_fechamento: new Date(data_fechamento),
      status,
      ...(observacoes && { observacoes }),
      ...(tipo_contrato && { tipo_contrato }),
      ...(arquivo_contrato && { arquivo_contrato })
    };

    const { data, error } = await supabase
      .from('fechamentos')
      .insert([fechamentoData])
      .select();

    if (error) {
      console.error('Erro ao criar fechamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar fechamento' 
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Fechamento criado com sucesso',
      fechamento: data[0]
    });

  } catch (error) {
    console.error('Erro ao criar fechamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter fechamento específico
export const getFechamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, email, telefone),
        consultores(nome, email),
        clinicas(nome, cidade, estado)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar fechamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar fechamento' 
      });
      return;
    }

    if (!data) {
      res.status(404).json({ 
        success: false, 
        error: 'Fechamento não encontrado' 
      });
      return;
    }

    // Verificar permissões de acesso
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todos
      req.user.id === data.consultor_id || // Próprio consultor
      req.user.id === data.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && data.consultor_id && 
       await verificarConsultorDaEmpresa(data.consultor_id, req.user.id)); // Empresa vê fechamentos de seus consultores

    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    res.json({
      success: true,
      fechamento: data
    });

  } catch (error) {
    console.error('Erro ao obter fechamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar fechamento
export const updateFechamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      valor_fechado,
      data_fechamento,
      status, 
      observacoes,
      tipo_contrato,
      arquivo_contrato
    }: UpdateFechamentoRequest = req.body;

    // Verificar se o fechamento existe
    const { data: fechamentoExistente, error: checkError } = await supabase
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !fechamentoExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Fechamento não encontrado' 
      });
      return;
    }

    // Verificar permissões de edição
    const podeEditar = 
      req.user.tipo === 'admin' || // Admin pode editar todos
      req.user.id === fechamentoExistente.consultor_id || // Próprio consultor
      req.user.id === fechamentoExistente.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && fechamentoExistente.consultor_id && 
       await verificarConsultorDaEmpresa(fechamentoExistente.consultor_id, req.user.id)); // Empresa pode editar fechamentos de seus consultores

    if (!podeEditar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: Partial<Fechamento> = {};
    
    if (paciente_id !== undefined) updateData.paciente_id = paciente_id;
    if (clinica_id !== undefined) updateData.clinica_id = clinica_id;
    if (consultor_id !== undefined) updateData.consultor_id = consultor_id;
    if (valor_fechado !== undefined) updateData.valor_fechado = parseFloat(valor_fechado.toString());
    if (data_fechamento !== undefined) updateData.data_fechamento = new Date(data_fechamento);
    if (status !== undefined) updateData.status = status;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (tipo_contrato !== undefined) updateData.tipo_contrato = tipo_contrato;
    if (arquivo_contrato !== undefined) updateData.arquivo_contrato = arquivo_contrato;

    // Atualizar fechamento
    const { data, error } = await supabase
      .from('fechamentos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar fechamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar fechamento' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Fechamento atualizado com sucesso',
      fechamento: data[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar fechamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para aprovar fechamento
export const aprovarFechamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Apenas admin pode aprovar fechamentos
    if (req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores podem aprovar fechamentos' 
      });
      return;
    }

    const { id } = req.params;
    const { observacoes_aprovacao } = req.body;

    // Verificar se o fechamento existe
    const { data: fechamentoExistente, error: checkError } = await supabase
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !fechamentoExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Fechamento não encontrado' 
      });
      return;
    }

    // Verificar se já está aprovado
    if (fechamentoExistente.status === 'aprovado') {
      res.status(400).json({ 
        success: false, 
        error: 'Fechamento já está aprovado' 
      });
      return;
    }

    // Atualizar status para aprovado
    const updateData: Partial<Fechamento> = {
      status: 'aprovado'
    };

    if (observacoes_aprovacao) {
      updateData.observacoes = fechamentoExistente.observacoes 
        ? `${fechamentoExistente.observacoes}\n[APROVADO] ${observacoes_aprovacao}`
        : `[APROVADO] ${observacoes_aprovacao}`;
    }

    const { data, error } = await supabase
      .from('fechamentos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao aprovar fechamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao aprovar fechamento' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Fechamento aprovado com sucesso',
      fechamento: data[0]
    });

  } catch (error) {
    console.error('Erro ao aprovar fechamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para rejeitar fechamento
export const rejeitarFechamento = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Apenas admin pode rejeitar fechamentos
    if (req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores podem rejeitar fechamentos' 
      });
      return;
    }

    const { id } = req.params;
    const { motivo_rejeicao } = req.body;

    if (!motivo_rejeicao) {
      res.status(400).json({ 
        success: false, 
        error: 'Motivo da rejeição é obrigatório' 
      });
      return;
    }

    // Verificar se o fechamento existe
    const { data: fechamentoExistente, error: checkError } = await supabase
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !fechamentoExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Fechamento não encontrado' 
      });
      return;
    }

    // Verificar se já está rejeitado
    if (fechamentoExistente.status === 'rejeitado') {
      res.status(400).json({ 
        success: false, 
        error: 'Fechamento já está rejeitado' 
      });
      return;
    }

    // Atualizar status para rejeitado
    const updateData: Partial<Fechamento> = {
      status: 'rejeitado',
      observacoes: fechamentoExistente.observacoes 
        ? `${fechamentoExistente.observacoes}\n[REJEITADO] ${motivo_rejeicao}`
        : `[REJEITADO] ${motivo_rejeicao}`
    };

    const { data, error } = await supabase
      .from('fechamentos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao rejeitar fechamento:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao rejeitar fechamento' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Fechamento rejeitado com sucesso',
      fechamento: data[0]
    });

  } catch (error) {
    console.error('Erro ao rejeitar fechamento:', error);
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
