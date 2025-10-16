import { Request, Response } from 'express';
import { getSocketService, NotificationData } from '../services/socketService';

// Obter estatísticas de usuários conectados
export const getConnectionStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const socketService = getSocketService();
    
    const stats = {
      connectedUsers: socketService.getConnectedUsersCount(),
      usersByType: {
        admin: socketService.getUsersByType('admin').length,
        consultor: socketService.getUsersByType('consultor').length,
        clinica: socketService.getUsersByType('clinica').length,
        empresa: socketService.getUsersByType('empresa').length
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('❌ Erro ao obter estatísticas de conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Obter usuários online
export const getOnlineUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const socketService = getSocketService();
    
    const onlineUsers = Array.from(socketService['connectedUsers'].values()).map(user => ({
      id: user.id,
      nome: user.nome,
      tipo: user.tipo,
      email: user.email,
      connectedAt: user.connectedAt,
      socketId: user.socketId
    }));

    res.json({
      success: true,
      data: {
        users: onlineUsers,
        count: onlineUsers.length
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao obter usuários online:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Enviar notificação para usuário específico
export const sendToUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const notificationData: NotificationData = req.body;

    // Validações
    if (!userId || !notificationData.title || !notificationData.message) {
      res.status(400).json({
        success: false,
        error: 'userId, title e message são obrigatórios'
      });
      return;
    }

    const socketService = getSocketService();
    
    // Verificar se o usuário está online
    if (!socketService.isUserOnline(userId)) {
      res.status(404).json({
        success: false,
        error: 'Usuário não está online'
      });
      return;
    }

    socketService.sendToUser(userId, notificationData);

    res.json({
      success: true,
      message: 'Notificação enviada com sucesso'
    });

  } catch (error: any) {
    console.error('❌ Erro ao enviar notificação para usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Enviar notificação para tipo de usuário
export const sendToUserType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userType } = req.params;
    const notificationData: NotificationData = req.body;

    // Validações
    if (!userType || !notificationData.title || !notificationData.message) {
      res.status(400).json({
        success: false,
        error: 'userType, title e message são obrigatórios'
      });
      return;
    }

    const validTypes = ['admin', 'consultor', 'clinica', 'empresa'];
    if (!validTypes.includes(userType)) {
      res.status(400).json({
        success: false,
        error: 'Tipo de usuário inválido'
      });
      return;
    }

    const socketService = getSocketService();
    socketService.sendToUserType(userType, notificationData);

    res.json({
      success: true,
      message: `Notificação enviada para todos os usuários do tipo ${userType}`
    });

  } catch (error: any) {
    console.error('❌ Erro ao enviar notificação para tipo de usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Enviar broadcast para todos os usuários
export const broadcast = async (req: Request, res: Response): Promise<void> => {
  try {
    const notificationData: NotificationData = req.body;

    // Validações
    if (!notificationData.title || !notificationData.message) {
      res.status(400).json({
        success: false,
        error: 'title e message são obrigatórios'
      });
      return;
    }

    const socketService = getSocketService();
    socketService.broadcast(notificationData);

    res.json({
      success: true,
      message: 'Broadcast enviado para todos os usuários conectados'
    });

  } catch (error: any) {
    console.error('❌ Erro ao enviar broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Testar conexão Socket.IO
export const testConnection = async (_req: Request, res: Response): Promise<void> => {
  try {
    const socketService = getSocketService();
    
    // Enviar notificação de teste para admins
    socketService.sendToAdmins({
      type: 'system',
      title: '🧪 Teste de Conexão',
      message: 'Este é um teste de notificação via Socket.IO',
      data: {
        testId: Date.now(),
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Notificação de teste enviada para administradores',
      data: {
        connectedUsers: socketService.getConnectedUsersCount(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Obter informações de salas
export const getRoomInfo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const socketService = getSocketService();
    
    const rooms = [
      {
        name: 'admins',
        users: socketService.getRoomUsers('admins').length,
        description: 'Sala para administradores'
      },
      {
        name: 'users_consultor',
        users: socketService.getRoomUsers('users_consultor').length,
        description: 'Sala para consultores'
      },
      {
        name: 'users_clinica',
        users: socketService.getRoomUsers('users_clinica').length,
        description: 'Sala para clínicas'
      },
      {
        name: 'users_empresa',
        users: socketService.getRoomUsers('users_empresa').length,
        description: 'Sala para empresas'
      }
    ];

    res.json({
      success: true,
      data: {
        rooms,
        totalRooms: rooms.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao obter informações de salas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
