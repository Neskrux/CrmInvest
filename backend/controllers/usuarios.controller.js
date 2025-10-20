const bcrypt = require('bcrypt');
const { supabaseAdmin } = require('../config/database');

// Atualizar perfil do usuário
const updatePerfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, email, senhaAtual, novaSenha } = req.body;

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Verificar se o email já está sendo usado por outro usuário
    const { data: emailExistente } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .neq('id', userId)
      .single();

    if (emailExistente) {
      return res.status(400).json({ error: 'Este email já está sendo usado por outro usuário' });
    }

    // Se foi fornecida nova senha, verificar senha atual
    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
      }

      // Buscar senha atual do usuário
      const { data: usuario, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('senha')
        .eq('id', userId)
        .single();

      if (userError || !usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar se senha atual está correta
      const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaCorreta) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      nome,
      email
    };

    // Se nova senha foi fornecida, incluir na atualização
    if (novaSenha && novaSenha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(novaSenha, 10);
      updateData.senha = hashedPassword;
    }

    // Executar atualização
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Buscar dados atualizados do usuário
    const { data: usuarioAtualizado, error: fetchError } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, tipo, ultimo_login, created_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      usuario: usuarioAtualizado
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar informações completas do perfil do usuário
const getPerfil = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar dados completos do usuário
    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, tipo, ultimo_login, created_at')
      .eq('id', userId)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      usuario: usuario
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  updatePerfil,
  getPerfil
};

