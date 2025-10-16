import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, Empresa, UpdateEmpresaRequest } from '../types';
import { config } from '../config/env';

// Configuração do Supabase
const supabase = createClient(config.supabaseUrl!, config.supabaseServiceKey!);

// Controller para obter perfil da empresa
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const empresaId = req.user.id;

    // Buscar dados completos da empresa
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, razao_social, email, telefone, cidade, estado, responsavel, ativo, created_at')
      .eq('id', empresaId)
      .single();

    if (error || !empresa) {
      res.status(404).json({ 
        success: false, 
        error: 'Empresa não encontrada' 
      });
      return;
    }

    res.json({
      success: true,
      empresa: empresa
    });

  } catch (error) {
    console.error('Erro ao buscar perfil da empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar perfil da empresa
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const empresaId = req.user.id;
    const { nome, telefone, email, senhaAtual, novaSenha, responsavel, cidade, estado } = req.body as UpdateEmpresaRequest;

    // Validações básicas
    if (!nome || !email) {
      res.status(400).json({ 
        success: false, 
        error: 'Nome e email são obrigatórios' 
      });
      return;
    }

    // Verificar se o email já está sendo usado por outra empresa
    const { data: emailExistente } = await supabase
      .from('empresas')
      .select('id')
      .eq('email', email)
      .neq('id', empresaId)
      .single();

    if (emailExistente) {
      res.status(400).json({ 
        success: false, 
        error: 'Este email já está sendo usado por outra empresa' 
      });
      return;
    }

    // Preparar dados para atualização
    const updateData: Partial<Empresa> = {
      nome,
      email
    };
    
    if (telefone !== undefined) updateData.telefone = telefone;
    if (responsavel !== undefined) updateData.responsavel = responsavel;
    if (cidade !== undefined) updateData.cidade = cidade;
    if (estado !== undefined) updateData.estado = estado;

    // Se foi fornecida nova senha, verificar senha atual
    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        res.status(400).json({ 
          success: false, 
          error: 'Senha atual é obrigatória para alterar a senha' 
        });
        return;
      }

      // Buscar senha atual da empresa
      const { data: empresaAtual } = await supabase
        .from('empresas')
        .select('senha')
        .eq('id', empresaId)
        .single();

      if (!empresaAtual) {
        res.status(404).json({ 
          success: false, 
          error: 'Empresa não encontrada' 
        });
        return;
      }

      // Verificar senha atual
      const senhaValida = await bcrypt.compare(senhaAtual, empresaAtual.senha);
      if (!senhaValida) {
        res.status(400).json({ 
          success: false, 
          error: 'Senha atual incorreta' 
        });
        return;
      }

      // Hash da nova senha
      const senhaHash = await bcrypt.hash(novaSenha, 10);
      updateData.senha = senhaHash;
    }

    // Atualizar empresa
    const { data: empresaAtualizada, error } = await supabase
      .from('empresas')
      .update(updateData)
      .eq('id', empresaId)
      .select('id, nome, cnpj, razao_social, email, telefone, cidade, estado, responsavel, ativo, created_at')
      .single();

    if (error) {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar perfil da empresa' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      empresa: empresaAtualizada
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil da empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para listar empresas (apenas para admin)
export const listEmpresas = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Apenas administradores podem listar empresas' 
      });
      return;
    }

    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, razao_social, email, telefone, cidade, estado, responsavel, ativo, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar empresas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar empresas' 
      });
      return;
    }

    res.json({
      success: true,
      empresas: empresas || []
    });

  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};
