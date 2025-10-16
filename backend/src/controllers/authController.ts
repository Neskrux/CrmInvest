import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { User, LoginRequest, ApiResponse } from '../types';
import { config } from '../config/env';

// Configuração do Supabase
const supabase = createClient(config.supabaseUrl!, config.supabaseServiceKey!);

// Função para gerar token JWT
const generateToken = (user: User): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tipo: user.tipo
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

// Controller de login
export const login = async (req: Request<{}, ApiResponse<{ user: User; token: string }>, LoginRequest>, res: Response): Promise<void> => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
      return;
    }

    // Buscar usuário no Supabase
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !userData) {
      res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
      return;
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(senha, userData.senha);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
      return;
    }

    // Remover senha do objeto de resposta
    const { senha: _, ...userWithoutPassword } = userData;
    const user: User = userWithoutPassword as User;

    // Gerar token
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user,
        token
      },
      message: 'Login realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller de logout
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Em uma implementação mais robusta, você poderia invalidar o token
    // Por enquanto, apenas retornamos sucesso
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller para verificar token
export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    // Buscar dados atualizados do usuário
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
      message: 'Token válido'
    });

  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller para redefinir senha
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email é obrigatório'
      });
      return;
    }

    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !userData) {
      // Por segurança, sempre retornar sucesso mesmo se o email não existir
      res.json({
        success: true,
        message: 'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.'
      });
      return;
    }

    // Aqui você implementaria o envio de email
    // Por enquanto, apenas logamos
    console.log(`Solicitação de redefinição de senha para: ${email}`);

    res.json({
      success: true,
      message: 'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.'
    });

  } catch (error) {
    console.error('Erro na solicitação de redefinição de senha:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
