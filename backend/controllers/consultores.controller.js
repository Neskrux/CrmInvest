const bcrypt = require('bcrypt');
const { supabase, supabaseAdmin } = require('../config/database');
const { normalizarEmail } = require('../utils/helpers');

// Atualizar perfil do consultor
const updatePerfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, telefone, email, senhaAtual, novaSenha, pix, cidade, estado } = req.body;

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Verificar se o email já está sendo usado por outro consultor
    const { data: emailExistente } = await supabaseAdmin
      .from('consultores')
      .select('id')
      .eq('email', email)
      .neq('id', userId)
      .single();

    if (emailExistente) {
      return res.status(400).json({ error: 'Este email já está sendo usado por outro consultor' });
    }

    // Se foi fornecida nova senha, verificar senha atual
    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
      }

      // Buscar senha atual do consultor
      const { data: consultor, error: userError } = await supabaseAdmin
        .from('consultores')
        .select('senha')
        .eq('id', userId)
        .single();

      if (userError || !consultor) {
        return res.status(404).json({ error: 'Consultor não encontrado' });
      }

      // Verificar se senha atual está correta
      const senhaCorreta = await bcrypt.compare(senhaAtual, consultor.senha);
      if (!senhaCorreta) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      nome,
      email,
      telefone: telefone || null,
      pix: pix || null,
      cidade: cidade || null,
      estado: estado || null
    };

    // Se nova senha foi fornecida, incluir na atualização
    if (novaSenha && novaSenha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(novaSenha, 10);
      updateData.senha = hashedPassword;
    }

    // Executar atualização
    const { error: updateError } = await supabaseAdmin
      .from('consultores')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Buscar dados atualizados do consultor
    const { data: consultorAtualizado, error: fetchError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, email, telefone, pix, ativo, created_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      consultor: consultorAtualizado
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil do consultor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar informações completas do perfil do consultor
const getPerfil = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar dados completos do consultor
    const { data: consultor, error } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, email, telefone, pix, ativo, created_at, codigo_referencia, pode_ver_todas_novas_clinicas, podealterarstatus, is_freelancer, tipo_consultor, empresa_id')
      .eq('id', userId)
      .single();

    if (error || !consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    res.json({
      consultor: consultor
    });

  } catch (error) {
    console.error('Erro ao buscar perfil do consultor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar permissões de consultor
const updatePermissao = async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar permissões' });
    }

    const { id } = req.params;
    const { podeAlterarStatus } = req.body;

    if (podeAlterarStatus === undefined) {
      return res.status(400).json({ error: 'podeAlterarStatus é obrigatório' });
    }

    const { error } = await supabaseAdmin
      .from('consultores')
      .update({ podealterarstatus: podeAlterarStatus })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar todos os consultores
const getAllConsultores = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('consultores')
      .select('*')
      .order('nome');
    
    // Se for admin, parceiro ou consultor interno, filtrar apenas consultores da empresa
    if (((req.user.tipo === 'admin' || req.user.tipo === 'parceiro') && req.user.empresa_id) ||
        (req.user.tipo === 'consultor' && req.user.empresa_id && !req.user.is_freelancer)) {
      query = query.eq('empresa_id', req.user.empresa_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Criar consultor
const createConsultor = async (req, res) => {
  try {
    const { nome, telefone, email, senha, pix, cidade, estado, is_freelancer, tipo_consultor } = req.body;
    
    // Validar campos obrigatórios
    if (!senha || senha.trim() === '') {
      return res.status(400).json({ error: 'Senha é obrigatória!' });
    }
    
    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'Email é obrigatório!' });
    }
    
    // Normalizar email
    const emailNormalizado = normalizarEmail(email);
    
    // Verificar se email já existe na mesma empresa
    const { data: emailExistente, error: emailError } = await supabaseAdmin
      .from('consultores')
      .select('id, empresa_id')
      .eq('email', emailNormalizado)
      .eq('empresa_id', consultorData.empresa_id || req.user.empresa_id)
      .limit(1);

    if (emailError) throw emailError;
    
    if (emailExistente && emailExistente.length > 0) {
      return res.status(400).json({ 
        error: 'Email já cadastrado', 
        message: 'Este email já está sendo usado por outro consultor nesta empresa. Por favor, use um email diferente ou entre em contato com o administrador.',
        field: 'email'
      });
    }
    
    // Hash da senha antes de salvar
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    // Determinar tipo_consultor e is_freelancer
    let tipoConsultorFinal = tipo_consultor || 'freelancer';
    let isFreelancerFinal = is_freelancer !== undefined ? is_freelancer : true;
    
    // Sincronizar campos: se tipo_consultor for fornecido, calcular is_freelancer
    if (tipo_consultor) {
      isFreelancerFinal = tipo_consultor === 'freelancer';
    } else if (is_freelancer !== undefined) {
      // Se apenas is_freelancer for fornecido, determinar tipo_consultor
      tipoConsultorFinal = is_freelancer ? 'freelancer' : 'corretor';
    }
    
    // Preparar dados do consultor
    const consultorData = { 
      nome, 
      telefone, 
      email: emailNormalizado, 
      senha: senhaHash, 
      pix,
      cidade,
      estado,
      is_freelancer: isFreelancerFinal,
      tipo_consultor: tipoConsultorFinal
    };
    
    // Se for parceiro criando, vincular o consultor à parceiro
    if (req.user.tipo === 'parceiro') {
      consultorData.empresa_id = req.user.id;
      consultorData.podealterarstatus = false;
      consultorData.pode_ver_todas_novas_clinicas = false;
    }
    
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .insert([consultorData])
      .select();

    if (error) throw error;
    
    const consultorId = data[0].id;
    
    // Gerar código de referência automaticamente
    const deveGerarCodigo = consultorData.is_freelancer === true || consultorData.empresa_id !== undefined;
    
    if (deveGerarCodigo) {
      try {
        console.log('🔄 Gerando código de referência para consultor ID:', consultorId);
        
        const nomeLimpo = nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 10);
        
        const codigoReferencia = `${nomeLimpo}${consultorId}`;
        
        // Atualizar o consultor com o código de referência
        await supabaseAdmin
          .from('consultores')
          .update({ codigo_referencia: codigoReferencia })
          .eq('id', consultorId);
        
        console.log('✅ Código gerado:', codigoReferencia);
      } catch (codeError) {
        console.error('⚠️ Erro ao gerar código de referência:', codeError);
      }
    }
    
    res.json({ 
      id: consultorId, 
      message: 'Consultor cadastrado com sucesso!',
      email: emailNormalizado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cadastro público de consultor
const cadastroPublico = async (req, res) => {
  try {
    console.log('📝 === NOVO CADASTRO DE CONSULTOR ===');
    console.log('📋 Dados recebidos:', req.body);
    
    const { nome, telefone, email, senha, cpf, pix, cidade, estado, empresa_id, is_freelancer, tipo_consultor } = req.body;
    
    // Validar campos obrigatórios
    if (!nome || !telefone || !email || !senha || !cpf || !pix) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios!' });
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido!' });
    }
    
    // Normalizar email antes de salvar
    const emailNormalizado = normalizarEmail(email);
    
    // Validar se email já existe na mesma empresa
    const { data: emailExistente, error: emailError } = await supabaseAdmin
      .from('consultores')
      .select('id, empresa_id')
      .eq('email', emailNormalizado)
      .eq('empresa_id', empresaIdFinal)
      .limit(1);

    if (emailError) throw emailError;
    
    if (emailExistente && emailExistente.length > 0) {
      return res.status(400).json({ 
        error: 'Email já cadastrado', 
        message: 'Este email já está sendo usado por outro consultor nesta empresa. Por favor, use um email diferente ou entre em contato com o administrador.',
        field: 'email'
      });
    }
    
    // Validar se CPF já existe na mesma empresa
    const { data: cpfExistente, error: cpfError } = await supabaseAdmin
      .from('consultores')
      .select('id, empresa_id')
      .eq('cpf', cpf)
      .eq('empresa_id', empresaIdFinal)
      .limit(1);

    if (cpfError) throw cpfError;
    
    if (cpfExistente && cpfExistente.length > 0) {
      return res.status(400).json({ 
        error: 'CPF já cadastrado', 
        message: 'Este CPF já está sendo usado por outro consultor nesta empresa. Verifique se o CPF está correto ou entre em contato com o administrador.',
        field: 'cpf'
      });
    }
    
    // Hash da senha
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    // Definir empresa_id, is_freelancer e tipo_consultor baseado nos dados recebidos
    const empresaIdFinal = empresa_id || 3; // Default para empresa 3 se não especificado
    
    // Determinar tipo_consultor e is_freelancer
    let tipoConsultorFinal = tipo_consultor || 'freelancer';
    let isFreelancerFinal = is_freelancer !== undefined ? is_freelancer : true;
    
    // Sincronizar campos: se tipo_consultor for fornecido, calcular is_freelancer
    if (tipo_consultor) {
      isFreelancerFinal = tipo_consultor === 'freelancer';
    } else if (is_freelancer !== undefined) {
      // Se apenas is_freelancer for fornecido, determinar tipo_consultor
      tipoConsultorFinal = is_freelancer ? 'freelancer' : 'corretor';
    }
    
    console.log('🏢 Definindo empresa_id =', empresaIdFinal, 'para cadastro público de consultor');
    console.log('👤 is_freelancer =', isFreelancerFinal, 'tipo_consultor =', tipoConsultorFinal);
    
    // Inserir consultor
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .insert([{ 
        nome, 
        telefone, 
        email: emailNormalizado, 
        senha: senhaHash, 
        cpf, 
        pix,
        cidade,
        estado,
        tipo: 'consultor',
        ativo: true,
        is_freelancer: isFreelancerFinal,
        tipo_consultor: tipoConsultorFinal,
        empresa_id: empresaIdFinal
      }])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir consultor:', error);
      throw error;
    }

    const consultorId = data[0].id;
    
    // Gerar código de referência automaticamente para freelancers
    try {
      console.log('🔄 Iniciando geração de código de referência para consultor ID:', consultorId);
      
      const nomeLimpo = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 10);
      
      const codigoReferencia = `${nomeLimpo}${consultorId}`;
      
      console.log('📝 Dados do código:', {
        nomeOriginal: nome,
        nomeLimpo: nomeLimpo,
        consultorId: consultorId,
        codigoReferencia: codigoReferencia
      });
      
      // Atualizar o consultor com o código de referência
      const { error: updateError } = await supabaseAdmin
        .from('consultores')
        .update({ codigo_referencia: codigoReferencia })
        .eq('id', consultorId);
      
      if (updateError) {
        console.error('⚠️ Erro ao gerar código de referência:', updateError);
      } else {
        console.log('✅ Código de referência gerado automaticamente:', codigoReferencia);
      }
    } catch (codigoError) {
      console.error('⚠️ Erro ao gerar código de referência:', codigoError);
    }
    
    res.json({ 
      id: consultorId, 
      message: 'Consultor cadastrado com sucesso! Agora você pode fazer login.',
      email: emailNormalizado
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: error.message });
  }
};

// Atualizar consultor
const updateConsultor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, senha, pix, cidade, estado, is_freelancer, tipo_consultor } = req.body;
    
    // Se for parceiro, verificar se o consultor pertence a ela
    if (req.user.tipo === 'parceiro') {
      const { data: consultor, error: checkError } = await supabaseAdmin
        .from('consultores')
        .select('empresa_id')
        .eq('id', id)
        .single();
      
      if (checkError || !consultor) {
        return res.status(404).json({ error: 'Consultor não encontrado' });
      }
      
      if (consultor.empresa_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não pode editar consultores de outra parceiro' });
      }
    }
    
    const updateData = {};
    if (nome) updateData.nome = nome;
    if (telefone) updateData.telefone = telefone;
    if (email) updateData.email = normalizarEmail(email);
    if (pix !== undefined) updateData.pix = pix;
    if (cidade) updateData.cidade = cidade;
    if (estado) updateData.estado = estado;
    if (is_freelancer !== undefined) updateData.is_freelancer = is_freelancer;
    if (tipo_consultor !== undefined) updateData.tipo_consultor = tipo_consultor;
    
    // Sincronizar campos: se tipo_consultor for fornecido, calcular is_freelancer
    if (tipo_consultor !== undefined) {
      updateData.is_freelancer = tipo_consultor === 'freelancer';
    } else if (is_freelancer !== undefined) {
      // Se apenas is_freelancer for fornecido, determinar tipo_consultor
      updateData.tipo_consultor = is_freelancer ? 'freelancer' : 'corretor';
    }
    
    if (senha) {
      const saltRounds = 10;
      updateData.senha = await bcrypt.hash(senha, saltRounds);
    }
    
    const { error } = await supabaseAdmin
      .from('consultores')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ message: 'Consultor atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar consultor:', error);
    res.status(500).json({ error: error.message });
  }
};

// Deletar consultor
const deleteConsultor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Se for parceiro, verificar se o consultor pertence a ela
    if (req.user.tipo === 'parceiro') {
      const { data: consultor, error: checkError } = await supabaseAdmin
        .from('consultores')
        .select('empresa_id')
        .eq('id', id)
        .single();
      
      if (checkError || !consultor) {
        return res.status(404).json({ error: 'Consultor não encontrado' });
      }
      
      if (consultor.empresa_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não pode deletar consultores de outra parceiro' });
      }
    }
    
    const { error } = await supabaseAdmin
      .from('consultores')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ message: 'Consultor deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar consultor:', error);
    res.status(500).json({ error: error.message });
  }
};

// Gerar código de referência
const gerarCodigo = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar consultor
    const { data: consultor, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, codigo_referencia')
      .eq('id', id)
      .single();
    
    if (consultorError || !consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }
    
    // Gerar código
    const nomeLimpo = consultor.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
    
    const codigoReferencia = `${nomeLimpo}${consultor.id}`;
    
    // Atualizar consultor
    const { error: updateError } = await supabaseAdmin
      .from('consultores')
      .update({ codigo_referencia: codigoReferencia })
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    res.json({ 
      message: 'Código gerado com sucesso!',
      codigo: codigoReferencia
    });
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    res.status(500).json({ error: error.message });
  }
};

// Gerar códigos faltantes
const gerarCodigosFaltantes = async (req, res) => {
  try {
    // Buscar consultores sem código
    const { data: consultores, error } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, codigo_referencia')
      .is('codigo_referencia', null);
    
    if (error) throw error;
    
    let sucesso = 0;
    let erros = 0;
    
    for (const consultor of consultores) {
      try {
        const nomeLimpo = consultor.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 10);
        
        const codigoReferencia = `${nomeLimpo}${consultor.id}`;
        
        await supabaseAdmin
          .from('consultores')
          .update({ codigo_referencia: codigoReferencia })
          .eq('id', consultor.id);
        
        sucesso++;
      } catch (err) {
        console.error(`Erro ao gerar código para consultor ${consultor.id}:`, err);
        erros++;
      }
    }
    
    res.json({ 
      message: `Códigos gerados: ${sucesso} sucesso(s), ${erros} erro(s)`,
      sucesso,
      erros
    });
  } catch (error) {
    console.error('Erro ao gerar códigos:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar link personalizado
const getLinkPersonalizado = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar consultor
    const { data: consultor, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, codigo_referencia')
      .eq('id', id)
      .single();
    
    if (consultorError || !consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }
    
    if (!consultor.codigo_referencia) {
      return res.status(400).json({ error: 'Consultor não possui código de referência' });
    }
    
    const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clinica?ref=${consultor.codigo_referencia}`;
    
    res.json({ 
      link,
      codigo: consultor.codigo_referencia
    });
  } catch (error) {
    console.error('Erro ao buscar link:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar consultor por ID
const getConsultorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: consultor, error } = await supabaseAdmin
      .from('consultores')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }
    
    res.json(consultor);
  } catch (error) {
    console.error('Erro ao buscar consultor:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar SDRs da incorporadora (consultores internos da empresa_id 5)
const getSDRsIncorporadora = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, foto_url')
      .eq('empresa_id', 5)
      .eq('is_freelancer', false)
      .order('nome');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  updatePerfil,
  getPerfil,
  updatePermissao,
  getAllConsultores,
  createConsultor,
  cadastroPublico,
  updateConsultor,
  deleteConsultor,
  gerarCodigo,
  gerarCodigosFaltantes,
  getLinkPersonalizado,
  getConsultorById,
  getSDRsIncorporadora
};

