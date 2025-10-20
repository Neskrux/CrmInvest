const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/database');
const { JWT_SECRET } = require('../config/constants');
const { normalizarEmail } = require('../utils/helpers');
const transporter = require('../config/email');
const { logLoginAttempt, logError, isDevelopment } = require('../utils/logger');

// Login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Nome/Email e senha são obrigatórios' });
    }

    const emailNormalizado = normalizarEmail(email);
    
    // Log seguro (sem dados sensíveis em produção)
    if (isDevelopment) {
      console.log('🔐 ==========================================');
      console.log('🔐 TENTATIVA DE LOGIN');
      console.log('🔐 Email:', emailNormalizado);
      console.log('🔐 Timestamp:', new Date().toISOString());
      console.log('🔐 ==========================================');
    }

    let usuario = null;
    let tipoLogin = null;

    // Primeiro, tentar login como admin (por email)
    if (typeof email === 'string' && email.includes('@')) {
      if (isDevelopment) console.log('🔍 [1/3] Buscando em ADMIN...');
      const { data: usuarios, error } = await supabaseAdmin
        .from('usuarios')
        .select(`
          *,
          consultores(nome, telefone)
        `)
        .eq('email', emailNormalizado)
        .eq('ativo', true);

      if (error) {
        logError(error, 'Erro ao buscar em usuarios');
        throw error;
      }

      if (isDevelopment) {
        console.log('🔍 Resultados em ADMIN:', usuarios ? usuarios.length : 0);
      }

      if (usuarios && usuarios.length > 0) {
        if (usuarios.length > 1) {
          console.error('⚠️ ALERTA: Múltiplos admins com o mesmo email!');
          if (isDevelopment) {
            console.error('Detalhes:', usuarios.map(u => ({ id: u.id, email: u.email })));
          }
        }
        usuario = usuarios[0];
        tipoLogin = 'admin';
        if (isDevelopment) {
          console.log('✅ Usuário encontrado em: ADMIN');
          console.log('📋 ID:', usuario.id, '| Nome:', usuario.nome);
        }
      }
    }

    // Se não encontrou admin, tentar login como clínica
    if (!usuario && typeof email === 'string' && email.includes('@')) {
      if (isDevelopment) console.log('🔍 [2/4] Buscando em CLÍNICAS...');
      
      const { data: clinicas, error } = await supabaseAdmin
        .from('clinicas')
        .select('*')
        .eq('email_login', emailNormalizado)
        .eq('ativo_no_sistema', true);

      if (error) {
        logError(error, 'Erro ao buscar em clínicas');
        throw error;
      }

      if (isDevelopment) {
        console.log('🔍 Resultados em CLÍNICAS:', clinicas ? clinicas.length : 0);
      }

      if (clinicas && clinicas.length > 0) {
        if (clinicas.length > 1) {
          console.error('⚠️ ALERTA: Múltiplas clínicas com o mesmo email!');
          if (isDevelopment) {
            console.error('Detalhes:', clinicas.map(c => ({ id: c.id, email: c.email_login })));
          }
        }
        usuario = clinicas[0];
        tipoLogin = 'clinica';
        if (isDevelopment) {
          console.log('✅ Usuário encontrado em: CLÍNICA');
          console.log('📋 ID:', usuario.id, '| Nome:', usuario.nome);
        }
        
        // Atualizar último acesso da clínica
        await supabaseAdmin
          .from('clinicas')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', usuario.id);
      } else {
        console.log('❌ Não encontrado em clínicas');
      }
    }

    // Se não encontrou admin nem clínica, tentar login como empresa (multi-tenancy)
    if (!usuario && typeof email === 'string' && email.includes('@')) {
      if (isDevelopment) console.log('🔍 [3/5] Buscando em EMPRESA (multi-tenancy)...');
      
      const { data: empresas, error } = await supabaseAdmin
        .from('empresa')
        .select('*')
        .eq('email', emailNormalizado)
        .eq('ativo', true);

      if (error) {
        logError(error, 'Erro ao buscar em empresa');
        throw error;
      }

      if (isDevelopment) {
        console.log('🔍 Resultados em EMPRESA:', empresas ? empresas.length : 0);
      }

      if (empresas && empresas.length > 0) {
        if (empresas.length > 1) {
          console.error('⚠️ ALERTA: Múltiplas empresas com o mesmo email!');
          if (isDevelopment) {
            console.error('Detalhes:', empresas.map(e => ({ id: e.id, email: e.email })));
          }
        }
        usuario = empresas[0];
        tipoLogin = 'empresa';
        if (isDevelopment) {
          console.log('✅ Usuário encontrado em: EMPRESA (multi-tenancy)');
          console.log('📋 ID:', usuario.id, '| Nome:', usuario.nome);
        }
      } else {
        if (isDevelopment) console.log('❌ Não encontrado em empresa');
      }
    }

    // Se não encontrou admin, clínica nem empresa, tentar login como parceiro
    if (!usuario && typeof email === 'string' && email.includes('@')) {
      if (isDevelopment) console.log('🔍 [4/5] Buscando em PARCEIROS...');
      
      const { data: parceiros, error } = await supabaseAdmin
        .from('parceiros')
        .select('*')
        .eq('email', emailNormalizado)
        .eq('ativo', true);

      if (error) {
        logError(error, 'Erro ao buscar em parceiros');
        throw error;
      }

      if (isDevelopment) {
        console.log('🔍 Resultados em PARCEIROS:', parceiros ? parceiros.length : 0);
      }

      if (parceiros && parceiros.length > 0) {
        if (parceiros.length > 1) {
          console.error('⚠️ ALERTA: Múltiplas parceiros com o mesmo email!');
          if (isDevelopment) {
            console.error('Detalhes:', parceiros.map(e => ({ id: e.id, email: e.email })));
          }
        }
        usuario = parceiros[0];
        tipoLogin = 'parceiro';
        if (isDevelopment) {
          console.log('✅ Usuário encontrado em: PARCEIRO');
          console.log('📋 ID:', usuario.id, '| Nome:', usuario.nome);
        }
      } else {
        if (isDevelopment) console.log('❌ Não encontrado em parceiros');
      }
    }

    // Se não encontrou admin, clínica, empresa nem parceiro, tentar login como consultor
    if (!usuario && typeof email === 'string' && email.includes('@')) {
      if (isDevelopment) console.log('🔍 [5/5] Buscando em CONSULTORES...');
      
      const { data: consultores, error } = await supabaseAdmin
        .from('consultores')
        .select('*')
        .eq('email', emailNormalizado)
        .eq('ativo', true);

      if (error) {
        logError(error, 'Erro ao buscar em consultores');
        throw error;
      }

      if (isDevelopment) {
        console.log('🔍 Resultados em CONSULTORES:', consultores ? consultores.length : 0);
      }

      if (consultores && consultores.length > 0) {
        if (consultores.length > 1) {
          console.error('⚠️ ALERTA CRÍTICO: Múltiplos consultores com o mesmo email!');
          if (isDevelopment) {
            console.error('Detalhes:', consultores.map(c => ({ id: c.id, nome: c.nome, email: c.email })));
          }
        }
        usuario = consultores[0];
        tipoLogin = 'consultor';
        if (isDevelopment) {
          console.log('✅ Usuário encontrado em: CONSULTOR');
          console.log('📋 ID:', usuario.id, '| Nome:', usuario.nome);
        }
      } else {
        if (isDevelopment) console.log('❌ Não encontrado em consultores');
      }
    }

    if (isDevelopment) console.log('📋 Tipo de login detectado:', tipoLogin);

    if (!usuario) {
      logLoginAttempt(emailNormalizado, false);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha (diferente para clínicas que usam senha_hash)
    let senhaValida = false;
    
    if (tipoLogin === 'clinica') {
      // Clínicas usam o campo senha_hash
      senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    } else {
      // Outros usuários usam o campo senha
      senhaValida = await bcrypt.compare(senha, usuario.senha);
    }
    
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    try {
      await supabaseAdmin
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', usuario.id);
    } catch (error) {
      logError(error, 'Erro ao atualizar ultimo_login');
    }

    // Padronizar payload e resposta para compatibilidade com Meta Ads
    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: tipoLogin === 'clinica' ? usuario.email_login : usuario.email,
      tipo: tipoLogin === 'empresa' ? 'empresa' : (tipoLogin === 'parceiro' ? 'parceiro' : (tipoLogin === 'clinica' ? 'clinica' : usuario.tipo)),
      clinica_id: tipoLogin === 'clinica' ? usuario.id : null,
      consultor_id: usuario.consultor_id !== undefined ? usuario.consultor_id : (tipoLogin === 'consultor' ? usuario.id : null),
      empresa_id: tipoLogin === 'empresa' ? usuario.id : (usuario.empresa_id || null),
      podealterarstatus: (tipoLogin === 'empresa' || tipoLogin === 'parceiro' || tipoLogin === 'clinica') ? false : (usuario.podealterarstatus || usuario.tipo === 'admin' || false),
      pode_ver_todas_novas_clinicas: (tipoLogin === 'empresa' || tipoLogin === 'parceiro' || tipoLogin === 'clinica') ? false : (usuario.pode_ver_todas_novas_clinicas || false),
      is_freelancer: (tipoLogin === 'admin' || tipoLogin === 'empresa' || tipoLogin === 'parceiro' || tipoLogin === 'clinica') ? false : (usuario.is_freelancer === true)
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    // Remover senha do objeto antes de enviar para o front
    delete usuario.senha;
    delete usuario.senha_hash;

    // Garante que usuario.tipo, consultor_id, empresa_id, clinica_id, podealterarstatus, pode_ver_todas_novas_clinicas e is_freelancer também estejam presentes no objeto de resposta
    usuario.tipo = payload.tipo;
    usuario.consultor_id = payload.consultor_id;
    usuario.empresa_id = payload.empresa_id;
    usuario.clinica_id = payload.clinica_id;
    usuario.podealterarstatus = payload.podealterarstatus;
    usuario.pode_ver_todas_novas_clinicas = payload.pode_ver_todas_novas_clinicas;
    usuario.is_freelancer = payload.is_freelancer;

    console.log('✅ Login bem-sucedido! Tipo:', usuario.tipo);
    console.log('📋 Usuario retornado para o frontend:', {
      id: usuario.id,
      nome: usuario.nome,
      tipo: usuario.tipo,
      clinica_id: usuario.clinica_id,
      email: usuario.email || usuario.email_login
    });

    res.json({ token, usuario });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Logout
const logout = (req, res) => {
  // Com JWT stateless, o logout é feito removendo o token do cliente
  res.json({ message: 'Logout realizado com sucesso' });
};

// Verify Token
const verifyToken = async (req, res) => {
  try {
    let usuario = null;
    let tipo = req.user.tipo;
    let consultor_id = null;

    // CRÍTICO: Usar o tipo do token para buscar na tabela correta
    if (req.user.tipo === 'admin') {
      const { data: usuarioData } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('id', req.user.id)
        .eq('ativo', true)
        .single();

      if (usuarioData) {
        usuario = usuarioData;
        consultor_id = usuario.consultor_id || null;
      }
    } else if (req.user.tipo === 'empresa') {
      const { data: empresaData } = await supabaseAdmin
        .from('empresa')
        .select('*')
        .eq('id', req.user.id)
        .eq('ativo', true)
        .single();

      if (empresaData) {
        usuario = empresaData;
        tipo = 'empresa';
        consultor_id = null;
      }
    } else if (req.user.tipo === 'parceiro') {
      const { data: empresaData } = await supabaseAdmin
        .from('parceiros')
        .select('*')
        .eq('id', req.user.id)
        .eq('ativo', true)
        .single();

      if (empresaData) {
        usuario = empresaData;
        tipo = 'parceiro';
        consultor_id = null;
      }
    } else if (req.user.tipo === 'consultor') {
      const { data: consultorData } = await supabaseAdmin
        .from('consultores')
        .select('*')
        .eq('id', req.user.id)
        .eq('ativo', true)
        .single();

      if (consultorData) {
        usuario = consultorData;
        tipo = 'consultor';
        consultor_id = usuario.id;
      }
    } else if (req.user.tipo === 'clinica') {
      const { data: clinicaData } = await supabaseAdmin
        .from('clinicas')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (clinicaData) {
        usuario = clinicaData;
        tipo = 'clinica';
        consultor_id = clinicaData.consultor_id || null;
      }
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Remover senha do objeto antes de enviar para o front
    const { senha: _, senha_hash: __, ...dadosUsuario } = usuario;

    res.json({
      usuario: {
        ...dadosUsuario,
        email: tipo === 'clinica' ? usuario.email_login : usuario.email,
        tipo,
        consultor_id,
        empresa_id: tipo === 'empresa' ? usuario.id : (usuario.empresa_id || null),
        clinica_id: tipo === 'clinica' ? usuario.id : null,
        podealterarstatus: (tipo === 'empresa' || tipo === 'parceiro' || tipo === 'clinica') ? false : (usuario.podealterarstatus || tipo === 'admin' || false),
        pode_ver_todas_novas_clinicas: (tipo === 'empresa' || tipo === 'parceiro' || tipo === 'clinica') ? false : (usuario.pode_ver_todas_novas_clinicas || false),
        is_freelancer: (tipo === 'admin' || tipo === 'empresa' || tipo === 'parceiro' || tipo === 'clinica') ? false : (usuario.is_freelancer === true)
      }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar token:', error);
    res.status(500).json({ error: error.message });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    if (isDevelopment) console.log('🔧 POST /api/forgot-password recebido');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Verificar se o consultor existe
    if (isDevelopment) console.log('🔧 Buscando consultor com email:', email);
    const { data: user, error: userError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, email')
      .eq('email', email)
      .single();

    if (isDevelopment) {
      console.log('🔧 Resultado da busca:', { user: user ? 'encontrado' : 'não encontrado', userError });
    }

    if (userError || !user) {
      if (isDevelopment) console.log('🔧 Consultor não encontrado, retornando mensagem de segurança');
      // Por segurança, sempre retorna sucesso mesmo se o email não existir
      return res.json({ 
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.' 
      });
    }

    if (isDevelopment) console.log('✅ Consultor encontrado');

    // Gerar token de redefinição com timestamp para expiração
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    
    // Salvar token no banco de dados
    if (isDevelopment) console.log('🔧 Tentando salvar token no banco...');
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert([{
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      }]);

    if (tokenError) {
      logError(tokenError, 'Erro ao salvar token de reset');
      if (isDevelopment) console.log('🔧 Continuando mesmo com erro no banco...');
    } else {
      if (isDevelopment) console.log('✅ Token salvo no banco com sucesso');
    }

    // Enviar email real
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    if (isDevelopment) {
      console.log('🔧 Preparando envio de email...');
      console.log('🔧 Reset link:', resetLink);
    }
    
    const mailOptions = {
      from: `"Solumn" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Redefinição de Senha - Solumn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1d23;">Redefinição de Senha</h2>
          <p>Olá ${user.nome},</p>
          <p>Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #1a1d23; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p><strong>Este link expira em 24 horas.</strong></p>
          <p>Se você não solicitou esta redefinição, ignore este email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, não responda.</p>
        </div>
      `
    };

    try {
      // Verificar se está em ambiente de desenvolvimento e se email não está configurado
      const isEmailConfigured = process.env.EMAIL_USER && 
                                process.env.EMAIL_USER !== 'your-email@gmail.com' && 
                                process.env.EMAIL_PASS && 
                                process.env.EMAIL_PASS !== 'your-app-password';

      if (isDevelopment) {
        console.log('🔧 Verificação de configuração de email:', {
          EMAIL_SERVICE: process.env.EMAIL_SERVICE,
          isEmailConfigured,
          NODE_ENV: process.env.NODE_ENV
        });
      }

      if (!isEmailConfigured && process.env.NODE_ENV === 'development') {
        console.log('🔧 EMAIL NÃO CONFIGURADO - MODO DESENVOLVIMENTO');
        console.log('📧 ========================================');
        console.log('📧 LINK DE REDEFINIÇÃO DE SENHA:');
        console.log(`📧 ${resetLink}`);
        console.log('📧 ========================================');
        console.log('📧 Copie o link acima e cole no navegador para redefinir a senha');
        console.log('📧 Para configurar o envio de email, veja o arquivo EMAIL_SETUP.md');
      } else {
        if (isDevelopment) {
          console.log('🔧 Tentando enviar email via SendGrid...');
          console.log('🔧 Configuração do transporter:', {
            service: process.env.EMAIL_SERVICE,
            from: mailOptions.from
          });
        }
        
        const result = await transporter.sendMail(mailOptions);
        if (isDevelopment) {
          console.log('✅ Email enviado com sucesso!', result);
          console.log('✅ Email de redefinição enviado');
        }
      }
    } catch (emailError) {
      logError(emailError, 'Erro ao enviar email');
      
      // Em desenvolvimento, mostrar o link mesmo se o email falhar
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 FALHA NO EMAIL - MODO DESENVOLVIMENTO');
        console.log('📧 ========================================');
        console.log('📧 LINK DE REDEFINIÇÃO DE SENHA:');
        console.log(`📧 ${resetLink}`);
        console.log('📧 ========================================');
        console.log('📧 Copie o link acima e cole no navegador para redefinir a senha');
      }
    }
    
    res.json({ 
      message: 'Instruções para redefinição de senha foram enviadas para seu email.' 
    });

  } catch (error) {
    console.error('Erro ao processar solicitação de redefinição de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Validate Reset Token
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    // Buscar token no banco de dados
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ error: 'Token inválido ou não encontrado' });
    }

    // Verificar se o token não expirou
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Token expirado' });
    }

    res.json({ message: 'Token válido' });

  } catch (error) {
    console.error('Erro ao validar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar token no banco de dados
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ error: 'Token inválido ou não encontrado' });
    }

    // Verificar se o token não expirou
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Token expirado' });
    }

    // Buscar o consultor
    const { data: consultor, error: consultorError } = await supabaseAdmin
      .from('consultores')
      .select('*')
      .eq('id', tokenData.user_id)
      .single();

    if (consultorError || !consultor) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha do consultor
    const { error: updateError } = await supabaseAdmin
      .from('consultores')
      .update({ senha: hashedPassword })
      .eq('id', tokenData.user_id);

    if (updateError) {
      throw updateError;
    }

    // Marcar token como usado
    const { error: tokenUpdateError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    if (tokenUpdateError) {
      console.error('Erro ao marcar token como usado:', tokenUpdateError);
    }

    console.log(`✅ Senha redefinida com sucesso para o consultor ${consultor.nome}`);
    res.json({ message: 'Senha redefinida com sucesso' });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  login,
  logout,
  verifyToken,
  forgotPassword,
  validateResetToken,
  resetPassword
};

