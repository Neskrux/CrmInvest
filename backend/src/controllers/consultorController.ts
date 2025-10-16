import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, Consultor, CreateConsultorRequest, UpdateConsultorRequest } from '../types';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para normalizar email
const normalizarEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

// Função para gerar código de referência
const gerarCodigoReferencia = (nome: string): string => {
  const nomeLimpo = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '') // Remove espaços
    .substring(0, 8); // Limita a 8 caracteres
  
  const timestamp = Date.now().toString().slice(-4); // Últimos 4 dígitos do timestamp
  return `${nomeLimpo}${timestamp}`;
};

// Controller para listar consultores
export const listConsultores = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    let query = supabase
      .from('consultores')
      .select('*')
      .order('nome');
    
    // Se for empresa, filtrar apenas consultores vinculados a ela
    if (req.user.tipo === 'empresa') {
      query = query.eq('empresa_id', req.user.id);
    }
    // Admin vê todos os consultores

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar consultores:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar consultores' 
      });
      return;
    }

    res.json({
      success: true,
      consultores: data || []
    });

  } catch (error) {
    console.error('Erro ao listar consultores:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para criar consultor
export const createConsultor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Verificar permissões
    if (req.user.tipo !== 'admin' && req.user.tipo !== 'empresa') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores ou empresas podem criar consultores' 
      });
      return;
    }

    const { 
      nome, 
      telefone, 
      email, 
      senha, 
      pix, 
      cidade, 
      estado, 
      is_freelancer 
    }: CreateConsultorRequest = req.body;
    
    // Validar campos obrigatórios
    if (!senha || senha.trim() === '') {
      res.status(400).json({ 
        success: false, 
        error: 'Senha é obrigatória!' 
      });
      return;
    }
    
    if (!email || email.trim() === '') {
      res.status(400).json({ 
        success: false, 
        error: 'Email é obrigatório!' 
      });
      return;
    }
    
    // Normalizar email
    const emailNormalizado = normalizarEmail(email);
    
    // Verificar se email já existe
    const { data: emailExistente, error: emailError } = await supabase
      .from('consultores')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailError) {
      console.error('Erro ao verificar email existente:', emailError);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
      return;
    }
    
    if (emailExistente && emailExistente.length > 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Este email já está cadastrado!' 
      });
      return;
    }
    
    // Hash da senha antes de salvar
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    // Preparar dados do consultor
    const consultorData: Partial<Consultor> = { 
      nome, 
      email: emailNormalizado, 
      senha: senhaHash
    };
    
    if (telefone !== undefined) consultorData.telefone = telefone;
    if (pix !== undefined) consultorData.pix = pix;
    if (cidade !== undefined) consultorData.cidade = cidade;
    if (estado !== undefined) consultorData.estado = estado;
    if (is_freelancer !== undefined) consultorData.is_freelancer = is_freelancer;
    
    // Se for empresa criando, vincular o consultor à empresa
    if (req.user.tipo === 'empresa') {
      consultorData.empresa_id = req.user.id;
      // Empresa pode escolher se é freelancer ou consultor fixo
      // Ambos só indicam (não alteram status)
      consultorData.podealterarstatus = false;
      consultorData.pode_ver_todas_novas_clinicas = false;
    }
    
    const { data, error } = await supabase
      .from('consultores')
      .insert([consultorData])
      .select();

    if (error) {
      console.error('Erro ao criar consultor:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar consultor' 
      });
      return;
    }
    
    const consultorId = data[0].id;
    
    // Gerar código de referência automaticamente para:
    // - Freelancers sem empresa (is_freelancer=true, empresa_id=NULL)
    // - Consultores de empresa (freelancers E funcionários com empresa_id preenchido)
    // NÃO gerar para: Consultores Internos Invest Money (is_freelancer=false, empresa_id=NULL)
    const deveGerarCodigo = consultorData.is_freelancer === true || consultorData.empresa_id !== undefined;
    
    if (deveGerarCodigo) {
      try {
        console.log('🔄 Gerando código de referência para consultor ID:', consultorId);
        
        const codigoReferencia = gerarCodigoReferencia(nome);
        
        // Atualizar consultor com código de referência
        const { error: updateError } = await supabase
          .from('consultores')
          .update({ codigo_referencia: codigoReferencia })
          .eq('id', consultorId);

        if (updateError) {
          console.error('Erro ao atualizar código de referência:', updateError);
          // Não falhar a criação se houver erro no código
        } else {
          console.log('✅ Código de referência gerado:', codigoReferencia);
        }
      } catch (codigoError) {
        console.error('Erro ao gerar código de referência:', codigoError);
        // Não falhar a criação se houver erro no código
      }
    }

    res.status(201).json({
      success: true,
      message: 'Consultor criado com sucesso',
      consultor: {
        id: consultorId,
        nome,
        email: emailNormalizado,
        is_freelancer,
        empresa_id: consultorData.empresa_id
      }
    });

  } catch (error) {
    console.error('Erro ao criar consultor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter consultor específico
export const getConsultor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      .from('consultores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar consultor:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar consultor' 
      });
      return;
    }

    if (!data) {
      res.status(404).json({ 
        success: false, 
        error: 'Consultor não encontrado' 
      });
      return;
    }
    
    // Verificar se o usuário pode acessar este consultor
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todos
      req.user.id === id || // Próprio consultor
      (req.user.tipo === 'empresa' && data.empresa_id === req.user.id); // Empresa vê seus consultores
    
    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Remover senha dos dados retornados
    const { senha, ...consultorSemSenha } = data;

    res.json({
      success: true,
      consultor: consultorSemSenha
    });

  } catch (error) {
    console.error('Erro ao obter consultor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter links personalizados do consultor
export const getLinksPersonalizados = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { id } = req.params;
    
    const { data: consultor, error } = await supabase
      .from('consultores')
      .select('id, nome, codigo_referencia, empresa_id')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar consultor:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar consultor' 
      });
      return;
    }
    
    if (!consultor) {
      res.status(404).json({ 
        success: false, 
        error: 'Consultor não encontrado' 
      });
      return;
    }
    
    // Verificar se o usuário pode acessar este consultor
    const podeAcessar = 
      req.user.tipo === 'admin' || // Admin vê todos
      req.user.id === id || // Próprio consultor
      (req.user.tipo === 'empresa' && consultor.empresa_id === req.user.id); // Empresa vê seus consultores
    
    if (!podeAcessar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }
    
    if (consultor.codigo_referencia) {
      const linkPersonalizado = `https://solumn.com.br/captura-lead?ref=${consultor.codigo_referencia}`;
      const linkClinicas = `https://solumn.com.br/captura-clinica?ref=${consultor.codigo_referencia}`;
      
      res.json({
        success: true,
        data: {
          link_personalizado: linkPersonalizado,
          link_clinicas: linkClinicas,
          codigo_referencia: consultor.codigo_referencia
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          link_personalizado: null,
          link_clinicas: null,
          codigo_referencia: null
        }
      });
    }

  } catch (error) {
    console.error('Erro ao obter links personalizados:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar consultor
export const updateConsultor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      telefone, 
      email, 
      pix, 
      cidade, 
      estado, 
      is_freelancer 
    }: UpdateConsultorRequest = req.body;

    // Verificar se o consultor existe
    const { data: consultorExistente, error: checkError } = await supabase
      .from('consultores')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !consultorExistente) {
      res.status(404).json({ 
        success: false, 
        error: 'Consultor não encontrado' 
      });
      return;
    }

    // Verificar permissões
    const podeEditar = 
      req.user.tipo === 'admin' || // Admin pode editar todos
      req.user.id === id || // Próprio consultor
      (req.user.tipo === 'empresa' && consultorExistente.empresa_id === req.user.id); // Empresa pode editar seus consultores

    if (!podeEditar) {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado' 
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: Partial<Consultor> = {};
    
    if (nome !== undefined) updateData.nome = nome;
    if (telefone !== undefined) updateData.telefone = telefone;
    if (email !== undefined) {
      const emailNormalizado = normalizarEmail(email);
      
      // Verificar se o novo email já existe em outro consultor
      const { data: emailExistente } = await supabase
        .from('consultores')
        .select('id')
        .eq('email', emailNormalizado)
        .neq('id', id)
        .limit(1);

      if (emailExistente && emailExistente.length > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Este email já está sendo usado por outro consultor' 
        });
        return;
      }
      
      updateData.email = emailNormalizado;
    }
    if (pix !== undefined) updateData.pix = pix;
    if (cidade !== undefined) updateData.cidade = cidade;
    if (estado !== undefined) updateData.estado = estado;
    if (is_freelancer !== undefined) updateData.is_freelancer = is_freelancer;

    // Atualizar consultor
    const { data, error } = await supabase
      .from('consultores')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao atualizar consultor:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar consultor' 
      });
      return;
    }

    // Remover senha dos dados retornados
    const { senha, ...consultorSemSenha } = data[0];

    res.json({
      success: true,
      message: 'Consultor atualizado com sucesso',
      consultor: consultorSemSenha
    });

  } catch (error) {
    console.error('Erro ao atualizar consultor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};
