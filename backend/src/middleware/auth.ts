import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, AuthToken } from '../types';

// Estender o tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

// Middleware de autenticação
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      success: false, 
      error: 'Token de acesso requerido' 
    });
    return;
  }

  try {
    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado');
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthToken;
    
    // Adicionar informações do usuário ao request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      tipo: decoded.tipo
    } as User;
    
    req.token = token;
    next();
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(403).json({ 
      success: false, 
      error: 'Token inválido ou expirado' 
    });
  }
};

// Middleware para verificar se é admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Usuário não autenticado' 
    });
    return;
  }

  if (req.user.tipo !== 'admin') {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas administradores podem acessar este recurso.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se é admin ou consultor interno
export const requireAdminOrConsultorInterno = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Usuário não autenticado' 
    });
    return;
  }

  const allowedTypes = ['admin', 'consultor'];
  if (!allowedTypes.includes(req.user.tipo)) {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas administradores e consultores podem acessar este recurso.' 
    });
    return;
  }

  // Se for consultor, verificar se não é freelancer
  if (req.user.tipo === 'consultor' && req.user.is_freelancer) {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas consultores internos podem acessar este recurso.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se é freelancer
export const requireFreelancer = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Usuário não autenticado' 
    });
    return;
  }

  if (req.user.tipo !== 'consultor' || !req.user.is_freelancer) {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas freelancers podem acessar este recurso.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se é clínica
export const requireClinica = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Usuário não autenticado' 
    });
    return;
  }

  if (req.user.tipo !== 'clinica') {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas clínicas podem acessar este recurso.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se é empresa
export const requireEmpresa = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Usuário não autenticado' 
    });
    return;
  }

  if (req.user.tipo !== 'empresa') {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas empresas podem acessar este recurso.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se é consultor (interno ou freelancer)
export const requireConsultor = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Usuário não autenticado' 
    });
    return;
  }

  if (req.user.tipo !== 'consultor') {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas consultores podem acessar este recurso.' 
    });
    return;
  }

  next();
};

export const requireAdminOrEmpresa = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.tipo !== 'admin' && req.user?.tipo !== 'empresa') {
    res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas administradores ou empresas podem realizar esta ação.' 
    });
    return;
  }
  next();
};
