const bcrypt = require('bcrypt');
const { supabaseAdmin } = require('../config/database');

// Buscar perfil da parceiro
const getPerfil = async (req, res) => {
  try {
    const empresaId = req.user.id;

    // Buscar dados completos da parceiro
    const { data: parceiro, error } = await supabaseAdmin
      .from('parceiros')
      .select('id, nome, cnpj, razao_social, email, telefone, cidade, estado, responsavel, ativo, created_at')
      .eq('id', empresaId)
      .single();

    if (error || !parceiro) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json({
      parceiro: parceiro
    });

  } catch (error) {
    console.error('Erro ao buscar perfil da parceiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar perfil da parceiro
const updatePerfil = async (req, res) => {
  try {
    const empresaId = req.user.id;
    const { nome, telefone, email, senhaAtual, novaSenha, responsavel, cidade, estado } = req.body;

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Verificar se o email já está sendo usado por outra parceiro
    const { data: emailExistente } = await supabaseAdmin
      .from('parceiros')
      .select('id')
      .eq('email', email)
      .neq('id', empresaId)
      .single();

    if (emailExistente) {
      return res.status(400).json({ error: 'Este email já está sendo usado por outra parceiro' });
    }

    // Se foi fornecida nova senha, verificar senha atual
    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
      }

      // Buscar senha atual da parceiro
      const { data: parceiro, error: empresaError } = await supabaseAdmin
        .from('parceiros')
        .select('senha')
        .eq('id', empresaId)
        .single();

      if (empresaError || !parceiro) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Verificar se senha atual está correta
      const senhaCorreta = await bcrypt.compare(senhaAtual, parceiro.senha);
      if (!senhaCorreta) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      nome,
      email,
      telefone: telefone || null,
      responsavel: responsavel || null,
      cidade: cidade || null,
      estado: estado || null,
      updated_at: new Date().toISOString()
    };

    // Se nova senha foi fornecida, incluir na atualização
    if (novaSenha && novaSenha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(novaSenha, 10);
      updateData.senha = hashedPassword;
    }

    // Executar atualização
    const { error: updateError } = await supabaseAdmin
      .from('parceiros')
      .update(updateData)
      .eq('id', empresaId);

    if (updateError) {
      throw updateError;
    }

    // Buscar dados atualizados da parceiro
    const { data: empresaAtualizada, error: fetchError } = await supabaseAdmin
      .from('parceiros')
      .select('id, nome, cnpj, razao_social, email, telefone, cidade, estado, responsavel, ativo, created_at')
      .eq('id', empresaId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      parceiro: empresaAtualizada
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil da parceiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getPerfil,
  updatePerfil
};

