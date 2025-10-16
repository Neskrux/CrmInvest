import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../types';
import { formatarRespostaAPI, formatarErroAPI } from '../utils';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do Supabase Admin
const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ===== DASHBOARD PRINCIPAL =====

// Controller para obter dados do dashboard principal
export const getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    // Obter data atual do sistema (dinâmica/real)
    const agora = new Date();
    const hoje = agora.getFullYear() + '-' + 
                 String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(agora.getDate()).padStart(2, '0');

    // Configurar filtros baseados no tipo de usuário
    const isConsultor = req.user.tipo === 'consultor';
    const isClinica = req.user.tipo === 'clinica';
    const consultorId = req.user.id;
    const clinicaId = req.user.clinica_id;

    // Buscar agendamentos de hoje
    let agendamentosQuery = supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', hoje);
    
    if (isClinica) {
      agendamentosQuery = agendamentosQuery.eq('clinica_id', clinicaId);
    } else if (isConsultor) {
      agendamentosQuery = agendamentosQuery.eq('consultor_id', consultorId);
    }

    const { data: agendamentosHoje, error: error1 } = await agendamentosQuery;
    if (error1) throw error1;

    // Buscar lembrados de hoje
    let lembradosQuery = supabase
      .from('agendamentos')
      .select('*')
      .eq('data_agendamento', hoje)
      .eq('lembrado', true);
    
    if (isClinica) {
      lembradosQuery = lembradosQuery.eq('clinica_id', clinicaId);
    } else if (isConsultor) {
      lembradosQuery = lembradosQuery.eq('consultor_id', consultorId);
    }

    const { data: lembradosHoje, error: error2 } = await lembradosQuery;
    if (error2) throw error2;

    // Buscar total de pacientes
    let pacientesQuery = supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true });

    // Para clínica, contar apenas pacientes com agendamentos nesta clínica
    if (isClinica) {
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', clinicaId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        pacientesQuery = pacientesQuery.in('id', pacienteIds);
      } else {
        pacientesQuery = pacientesQuery.eq('id', 0); // Força resultado vazio
      }
    }
    // Para consultor, contar apenas pacientes com agendamentos dele
    else if (isConsultor) {
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', consultorId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        pacientesQuery = pacientesQuery.in('id', pacienteIds);
      } else {
        pacientesQuery = pacientesQuery.eq('id', 0); // Força resultado vazio
      }
    }

    const { count: totalPacientes, error: error3 } = await pacientesQuery;
    if (error3) throw error3;

    // Buscar fechamentos
    let fechamentosQuery = supabaseAdmin
      .from('fechamentos')
      .select('*');
    
    if (isClinica) {
      // Para clínica, buscar fechamentos dos pacientes com agendamentos nesta clínica
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', clinicaId);

      if (agendError) throw agendError;

      const pacienteIds = [...new Set(agendamentos.map(a => a.paciente_id))];
      
      if (pacienteIds.length > 0) {
        fechamentosQuery = fechamentosQuery.in('paciente_id', pacienteIds);
      } else {
        fechamentosQuery = fechamentosQuery.eq('id', 0); // Força resultado vazio
      }
    }
    // Para consultor, buscar apenas seus fechamentos
    else if (isConsultor) {
      fechamentosQuery = fechamentosQuery.eq('consultor_id', consultorId);
    }

    const { data: fechamentos, error: error4 } = await fechamentosQuery;
    if (error4) throw error4;

    // Calcular estatísticas
    const totalFechamentos = fechamentos.length;
    const valorTotalFechamentos = fechamentos.reduce((sum, f) => sum + (f.valor_fechado || 0), 0);
    const fechamentosAprovados = fechamentos.filter(f => f.status === 'aprovado').length;
    const valorFechamentosAprovados = fechamentos
      .filter(f => f.status === 'aprovado')
      .reduce((sum, f) => sum + (f.valor_fechado || 0), 0);

    // Buscar agendamentos do mês atual
    const mesAtual = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0');
    let agendamentosMesQuery = supabase
      .from('agendamentos')
      .select('*')
      .gte('data_agendamento', mesAtual + '-01')
      .lt('data_agendamento', mesAtual + '-32');

    if (isClinica) {
      agendamentosMesQuery = agendamentosMesQuery.eq('clinica_id', clinicaId);
    } else if (isConsultor) {
      agendamentosMesQuery = agendamentosMesQuery.eq('consultor_id', consultorId);
    }

    const { data: agendamentosMes, error: error5 } = await agendamentosMesQuery;
    if (error5) throw error5;

    const totalAgendamentosMes = agendamentosMes.length;
    const agendamentosRealizados = agendamentosMes.filter(a => a.status === 'realizado').length;

    res.json(formatarRespostaAPI({
      hoje: hoje,
      agendamentos_hoje: agendamentosHoje.length,
      lembrados_hoje: lembradosHoje.length,
      total_pacientes: totalPacientes || 0,
      total_fechamentos: totalFechamentos,
      valor_total_fechamentos: valorTotalFechamentos,
      fechamentos_aprovados: fechamentosAprovados,
      valor_fechamentos_aprovados: valorFechamentosAprovados,
      total_agendamentos_mes: totalAgendamentosMes,
      agendamentos_realizados_mes: agendamentosRealizados
    }, 'Dashboard carregado com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// ===== DASHBOARD PACIENTES =====

// Controller para listar pacientes do dashboard
export const getDashboardPacientes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('🔍 GET /api/dashboard/pacientes - Usuário:', { id: req.user?.id, tipo: req.user?.tipo, nome: req.user?.nome });
    
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    let query = supabaseAdmin
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    if (req.user.tipo === 'consultor') {
      // Consultores veem apenas seus pacientes
      query = query.eq('consultor_id', req.user.id);
    } else if (req.user.tipo === 'clinica') {
      // Clínicas veem pacientes de seus agendamentos
      const { data: agendamentos, error: agendError } = await supabaseAdmin
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', req.user.id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos.map(a => a.paciente_id);
      if (pacienteIds.length > 0) {
        query = query.in('id', pacienteIds);
      } else {
        // Se não tem agendamentos, retornar array vazio
        query = query.eq('id', 'nonexistent');
      }
    }
    // Admin vê todos os pacientes (sem filtro adicional)

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro na query de pacientes:', error);
      throw error;
    }
    
    console.log(`✅ Retornando ${data?.length || 0} pacientes`);
    
    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formatarRespostaAPI(formattedData, 'Pacientes do dashboard carregados com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar pacientes do dashboard:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// ===== DASHBOARD AGENDAMENTOS =====

// Controller para listar agendamentos do dashboard
export const getDashboardAgendamentos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    let query = supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    // Aplicar filtros baseados no tipo de usuário
    if (req.user.tipo === 'consultor') {
      query = query.eq('consultor_id', req.user.id);
    } else if (req.user.tipo === 'clinica') {
      query = query.eq('clinica_id', req.user.id);
    }
    // Admin vê todos os agendamentos (sem filtro adicional)

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
      clinica_nome: agendamento.clinicas?.nome
    }));

    res.json(formatarRespostaAPI(formattedData, 'Agendamentos do dashboard carregados com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar agendamentos do dashboard:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// ===== DASHBOARD FECHAMENTOS =====

// Controller para listar fechamentos do dashboard
export const getDashboardFechamentos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    let query = supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    // Aplicar filtros baseados no tipo de usuário
    if (req.user.tipo === 'consultor') {
      query = query.eq('consultor_id', req.user.id);
    } else if (req.user.tipo === 'clinica') {
      query = query.eq('clinica_id', req.user.id);
    }
    // Admin vê todos os fechamentos (sem filtro adicional)

    const { data, error } = await query;

    if (error) throw error;

    // Reformatar dados para compatibilidade com frontend
    const formattedData = data.map(fechamento => {
      // NÃO gerar URL aqui - será gerada sob demanda quando o usuário clicar para baixar
      return {
        ...fechamento,
        paciente_nome: fechamento.pacientes?.nome,
        paciente_telefone: fechamento.pacientes?.telefone,
        paciente_cpf: fechamento.pacientes?.cpf,
        consultor_nome: fechamento.consultores?.nome,
        clinica_nome: fechamento.clinicas?.nome
      };
    });

    res.json(formatarRespostaAPI(formattedData, 'Fechamentos do dashboard carregados com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar fechamentos do dashboard:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// ===== DASHBOARD GERAIS (ADMIN) =====

// Controller para listar todos os pacientes (admin)
export const getDashboardGeraisPacientes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    // Apenas admin pode acessar dados gerais
    if (req.user.tipo !== 'admin') {
      res.status(403).json(formatarErroAPI('Apenas administradores podem acessar dados gerais', 403));
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formatarRespostaAPI(formattedData, 'Todos os pacientes carregados com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar todos os pacientes:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// Controller para listar todos os agendamentos (admin)
export const getDashboardGeraisAgendamentos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    // Apenas admin pode acessar dados gerais
    if (req.user.tipo !== 'admin') {
      res.status(403).json(formatarErroAPI('Apenas administradores podem acessar dados gerais', 403));
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    if (error) throw error;

    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
      clinica_nome: agendamento.clinicas?.nome
    }));

    res.json(formatarRespostaAPI(formattedData, 'Todos os agendamentos carregados com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar todos os agendamentos:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// Controller para listar todos os fechamentos (admin)
export const getDashboardGeraisFechamentos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    // Apenas admin pode acessar dados gerais
    if (req.user.tipo !== 'admin') {
      res.status(403).json(formatarErroAPI('Apenas administradores podem acessar dados gerais', 403));
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = data.map(fechamento => ({
      ...fechamento,
      paciente_nome: fechamento.pacientes?.nome,
      paciente_telefone: fechamento.pacientes?.telefone,
      paciente_cpf: fechamento.pacientes?.cpf,
      consultor_nome: fechamento.consultores?.nome,
      clinica_nome: fechamento.clinicas?.nome
    }));

    res.json(formatarRespostaAPI(formattedData, 'Todos os fechamentos carregados com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar todos os fechamentos:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};

// Controller para listar todas as clínicas (admin) - para gráfico de cidades no dashboard
export const getDashboardGeraisClinicas = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatarErroAPI('Token de autenticação não fornecido', 401));
      return;
    }

    // Apenas admin pode acessar dados gerais
    if (req.user.tipo !== 'admin') {
      res.status(403).json(formatarErroAPI('Apenas administradores podem acessar dados gerais', 403));
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json(formatarRespostaAPI(data, 'Todas as clínicas carregadas com sucesso'));

  } catch (error: any) {
    console.error('Erro ao carregar todas as clínicas:', error);
    res.status(500).json(formatarErroAPI('Erro interno do servidor', 500));
  }
};
