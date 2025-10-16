import { Response } from 'express';
import { AuxiliaryService } from '../services/auxiliaryService';
import { AuthenticatedRequest } from '../types';

// Instância do serviço auxiliar
const auxiliaryService = new AuxiliaryService();

// Controller para obter contagem de leads
export const getLeadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Apenas admin pode acessar contagem de leads
    if (req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores podem acessar contagem de leads' 
      });
      return;
    }

    console.log('📊 GET /api/auxiliary/lead-count');

    const result = await auxiliaryService.getLeadCount();
    
    res.json({
      success: true,
      data: {
        count: result.count,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao obter contagem de leads:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para obter contagem de novas clínicas
export const getClinicasCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Apenas admin pode acessar contagem de clínicas
    if (req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores podem acessar contagem de clínicas' 
      });
      return;
    }

    console.log('📊 GET /api/auxiliary/clinicas-count');

    const result = await auxiliaryService.getClinicasCount();
    
    res.json({
      success: true,
      data: {
        count: result.count,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao obter contagem de clínicas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar contagem de leads (trigger manual)
export const updateLeadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Apenas admin pode atualizar contagem de leads
    if (req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores podem atualizar contagem de leads' 
      });
      return;
    }

    console.log('🔄 POST /api/auxiliary/update-lead-count');

    // Importar socketService dinamicamente para evitar dependência circular
    const { getSocketService } = await import('../services/socketService');
    const socketService = getSocketService();
    
    await auxiliaryService.updateLeadCount(socketService);
    
    res.json({
      success: true,
      message: 'Contagem de leads atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao atualizar contagem de leads:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Controller para atualizar contagem de clínicas (trigger manual)
export const updateClinicasCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    // Apenas admin pode atualizar contagem de clínicas
    if (req.user.tipo !== 'admin') {
      res.status(403).json({ 
        success: false, 
        error: 'Apenas administradores podem atualizar contagem de clínicas' 
      });
      return;
    }

    console.log('🔄 POST /api/auxiliary/update-clinicas-count');

    // Importar socketService dinamicamente para evitar dependência circular
    const { getSocketService } = await import('../services/socketService');
    const socketService = getSocketService();
    
    await auxiliaryService.updateClinicasCount(socketService);
    
    res.json({
      success: true,
      message: 'Contagem de clínicas atualizada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao atualizar contagem de clínicas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};

// Exportar instância do serviço para uso em outros módulos
export { auxiliaryService };
