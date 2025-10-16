import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { User, UpdateUserRequest, ApiResponse } from '../types';
import { config } from '../config/env';

// Configuração do Supabase
const supabase = createClient(config.supabaseUrl!, config.supabaseServiceKey!);

// Controller para obter perfil do usuário
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (userError || !userData) {
      res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
      return;
    }

    // Remover senha do objeto de resposta
    const { senha: _, ...userWithoutPassword } = userData;
    const user: User = userWithoutPassword as User;

    res.json({
      success: true,
      data: { user },
      message: 'Perfil obtido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller para atualizar perfil do usuário
export const updateProfile = async (req: Request<{}, ApiResponse<User>, UpdateUserRequest>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    const { nome, email, telefone, tipo } = req.body;
    const updateData: Partial<User> = {};

    // Validar e adicionar campos que foram fornecidos
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (telefone !== undefined) updateData.telefone = telefone;
    if (tipo !== undefined) updateData.tipo = tipo;

    // Verificar se o email já existe (se estiver sendo alterado)
    if (email && email !== req.user.email) {
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email.toLowerCase())
        .neq('id', req.user.id)
        .single();

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'Este email já está sendo usado por outro usuário'
        });
        return;
      }
    }

    // Atualizar usuário
    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError);
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar perfil'
      });
      return;
    }

    // Remover senha do objeto de resposta
    const { senha: _, ...userWithoutPassword } = updatedUser;
    const user: User = userWithoutPassword as User;

    res.json({
      success: true,
      data: user,
      message: 'Perfil atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller para alterar senha
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      res.status(400).json({
        success: false,
        error: 'Senha atual e nova senha são obrigatórias'
      });
      return;
    }

    if (novaSenha.length < 6) {
      res.status(400).json({
        success: false,
        error: 'A nova senha deve ter pelo menos 6 caracteres'
      });
      return;
    }

    // Buscar usuário atual
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('senha')
      .eq('id', req.user.id)
      .single();

    if (userError || !userData) {
      res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
      return;
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(senhaAtual, userData.senha);
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        error: 'Senha atual incorreta'
      });
      return;
    }

    // Criptografar nova senha
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(novaSenha, saltRounds);

    // Atualizar senha
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        senha: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError);
      res.status(500).json({
        success: false,
        error: 'Erro ao alterar senha'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
