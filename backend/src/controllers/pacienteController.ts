import { Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, Paciente, CreatePacienteRequest, UpdatePacienteRequest } from '../types';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Controller para listar pacientes
export const listPacientes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('🔍 GET /api/pacientes - Usuário:', {
      id: req.user.id,
      tipo: req.user.tipo,
      nome: req.user.nome
    });

    let query = supabase
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    // Se for clínica, buscar pacientes que têm agendamentos nesta clínica OU foram cadastrados por ela
    if (req.user.tipo === 'clinica') {
      console.log('🏥 Clínica acessando pacientes:', {
        clinica_id: req.user.id,
        clinica_nome: req.user.nome
      });
      
      // Buscar pacientes com agendamentos nesta clínica
      const { data: agendamentos, error: agendError } = await supabase
        .from('agendamentos')
        .select('paciente_id')
        .eq('clinica_id', req.user.id);

      if (agendError) {
        console.error('Erro ao buscar agendamentos:', agendError);
        res.status(500).json({ 
          success: false, 
          error: 'Erro ao buscar agendamentos' 
        });
        return;
      }

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
    else if (req.user.tipo === 'consultor') {
      console.log('👨‍💼 Consultor acessando pacientes:', {
        consultor_id: req.user.id,
        consultor_nome: req.user.nome,
        pode_ver_todas_novas_clinicas: req.user.pode_ver_todas_novas_clinicas,
        podealterarstatus: req.user.podealterarstatus
      });

      // Consultores internos veem todos os pacientes
      if (req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true) {
        console.log('✅ Consultor interno - vendo todos os pacientes');
        // Não aplicar filtro - ver todos
      } else {
        console.log('🔒 Consultor freelancer - filtrando pacientes');
        
        // Buscar pacientes com agendamentos deste consultor
        const { data: agendamentos, error: agendError } = await supabase
          .from('agendamentos')
          .select('paciente_id')
          .eq('consultor_id', req.user.id);

        if (agendError) {
          console.error('Erro ao buscar agendamentos do consultor:', agendError);
          res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar agendamentos' 
          });
          return;
        }

        const pacienteIds = agendamentos ? agendamentos.map(a => a.paciente_id).filter(id => id !== null) : [];
        
        // Combinar: pacientes atribuídos ao consultor OU com agendamentos dele
        const conditions = [`consultor_id.eq.${req.user.id}`];
        
        if (pacienteIds.length > 0) {
          conditions.push(`id.in.(${pacienteIds.join(',')})`);
        }
        
        // Aplicar filtro OR
        query = query.or(conditions.join(','));
      }
    }
    // Admin vê todos os pacientes
    else if (req.user.tipo === 'admin') {
      console.log('👑 Admin - vendo todos os pacientes');
      // Não aplicar filtro - ver todos
    }
    // Empresa vê pacientes de seus consultores
    else if (req.user.tipo === 'empresa') {
      console.log('🏢 Empresa acessando pacientes:', {
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
        // Filtrar pacientes dos consultores da empresa
        query = query.in('consultor_id', consultorIds);
      } else {
        // Se não tem consultores, retornar array vazio
        query = query.eq('id', '0'); // Condição que nunca será verdadeira
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar pacientes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar pacientes' 
      });
      return;
    }

    console.log(`✅ Retornando ${data?.length || 0} pacientes`);

    res.json({
      success: true,
      pacientes: data || []
    });

  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para criar paciente
export const createPaciente = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      status = 'novo',
      observacoes,
      consultor_id,
      clinica_id
    }: CreatePacienteRequest = req.body;

    // Validações básicas
    if (!nome || !email || !telefone) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome, email e telefone são obrigatórios' 
      });
      return;
    }

    // Verificar se email já existe
    const { data: emailExistente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (emailExistente && emailExistente.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Este email já está cadastrado!' 
      });
      return;
    }

    // Preparar dados do paciente
    const pacienteData: Partial<Paciente> = {
      nome,
      email: email.toLowerCase().trim(),
      telefone,
      status,
      consultor_id: consultor_id || req.user.id // Se não especificado, usar o usuário atual
    };
    
    if (observacoes !== undefined) {
      pacienteData.observacoes = observacoes;
    }
    
    if (clinica_id !== undefined) {
      pacienteData.clinica_id = clinica_id;
    } else if (req.user.tipo === 'clinica') {
      pacienteData.clinica_id = req.user.id;
    }

    const { data, error } = await supabase
      .from('pacientes')
      .insert([pacienteData])
      .select();

    if (error) {
      console.error('Erro ao criar paciente:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar paciente' 
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Paciente criado com sucesso',
      paciente: data[0]
    });

  } catch (error) {
    console.error('Erro ao criar paciente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter paciente específico
export const getPaciente = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      .from('pacientes')
      .select(`
        *,
        consultores(nome, email),
        clinicas(nome, cidade, estado)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar paciente:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar paciente' 
      });
      return;
    }

    if (!data) {
      res.status(404).json({ 
        success: false, 
        error: 'Paciente não encontrado' 
      });
      return;
    }

    // Verificar permissões de acesso
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todos
      req.user.id === data.consultor_id || // Próprio consultor
      req.user.id === data.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && data.consultor_id && 
       await verificarConsultorDaEmpresa(data.consultor_id, req.user.id)); // Empresa vê pacientes de seus consultores

    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    res.json({
      success: true,
      paciente: data
    });

  } catch (error) {
    console.error('Erro ao obter paciente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar paciente
export const updatePaciente = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      status, 
      observacoes,
      consultor_id,
      clinica_id
    }: UpdatePacienteRequest = req.body;

    // Verificar se o paciente existe
    const { data: pacienteExistente, error: checkError } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !pacienteExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Paciente não encontrado' 
      });
      return;
    }

    // Verificar permissões de edição
    const podeEditar = 
      req.user.tipo === 'admin' || // Admin pode editar todos
      req.user.id === pacienteExistente.consultor_id || // Próprio consultor
      req.user.id === pacienteExistente.clinica_id || // Própria clínica
      (req.user.tipo === 'empresa' && pacienteExistente.consultor_id && 
       await verificarConsultorDaEmpresa(pacienteExistente.consultor_id, req.user.id)); // Empresa pode editar pacientes de seus consultores

    if (!podeEditar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: Partial<Paciente> = {};
    
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) {
      const emailNormalizado = email.toLowerCase().trim();
      
      // Verificar se o novo email já existe em outro paciente
      const { data: emailExistente } = await supabase
        .from('pacientes')
        .select('id')
        .eq('email', emailNormalizado)
        .neq('id', id)
        .limit(1);

      if (emailExistente && emailExistente.length > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Este email já está sendo usado por outro paciente' 
        });
        return;
      }
      
      updateData.email = emailNormalizado;
    }
    if (telefone !== undefined) updateData.telefone = telefone;
    if (status !== undefined) updateData.status = status;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (consultor_id !== undefined) updateData.consultor_id = consultor_id;
    if (clinica_id !== undefined) updateData.clinica_id = clinica_id;

    // Atualizar paciente
    const { data, error } = await supabase
      .from('pacientes')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar paciente:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar paciente' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Paciente atualizado com sucesso',
      paciente: data[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
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