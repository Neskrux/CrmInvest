import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../types';

export interface SocketUser extends User {
  socketId: string;
  connectedAt: Date;
}

export interface NotificationData {
  type: 'new_lead' | 'new_patient' | 'new_appointment' | 'new_clinic' | 'new_closing' | 'status_update' | 'system';
  title: string;
  message: string;
  data?: any;
  userId?: string;
  timestamp?: Date;
}

export interface RoomInfo {
  name: string;
  users: SocketUser[];
  createdAt: Date;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userRooms: Map<string, Set<string>> = new Map(); // userId -> Set<roomNames>
  private roomUsers: Map<string, Set<string>> = new Map(); // roomName -> Set<userId>

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://crm.investmoneysa.com.br',
          'https://www.crm.investmoneysa.com.br',
          'https://solumn.com.br',
          'https://www.solumn.com.br'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('🔌 Socket.IO Service inicializado');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      // Autenticação do socket
      socket.on('authenticate', (data: { token: string }) => {
        try {
          const jwtSecret = process.env['JWT_SECRET'];
          if (!jwtSecret) {
            socket.emit('auth_error', { message: 'JWT secret não configurado' });
            return;
          }

          const decoded = jwt.verify(data.token, jwtSecret) as any;
          const user: SocketUser = {
            ...decoded,
            socketId: socket.id,
            connectedAt: new Date()
          };

          this.connectedUsers.set(socket.id, user);
          socket.data.user = user;

          console.log(`✅ Usuário autenticado via Socket: ${user.nome} (${user.tipo})`);
          
          // Entrar em salas baseadas no tipo de usuário
          this.joinUserRooms(socket, user);
          
          socket.emit('authenticated', { 
            user: {
              id: user.id,
              nome: user.nome,
              tipo: user.tipo,
              email: user.email
            },
            message: 'Autenticado com sucesso'
          });

        } catch (error: any) {
          console.error('❌ Erro na autenticação Socket:', error.message);
          socket.emit('auth_error', { message: 'Token inválido' });
        }
      });

      // Entrar em sala específica
      socket.on('join_room', (data: { room: string }) => {
        if (!socket.data.user) {
          socket.emit('error', { message: 'Usuário não autenticado' });
          return;
        }

        this.joinRoom(socket, data.room);
        socket.emit('room_joined', { room: data.room });
      });

      // Sair de sala específica
      socket.on('leave_room', (data: { room: string }) => {
        if (!socket.data.user) {
          socket.emit('error', { message: 'Usuário não autenticado' });
          return;
        }

        this.leaveRoom(socket, data.room);
        socket.emit('room_left', { room: data.room });
      });

      // Ping/Pong para manter conexão ativa
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Solicitar lista de usuários online
      socket.on('get_online_users', () => {
        if (!socket.data.user) {
          socket.emit('error', { message: 'Usuário não autenticado' });
          return;
        }

        const onlineUsers = Array.from(this.connectedUsers.values()).map(user => ({
          id: user.id,
          nome: user.nome,
          tipo: user.tipo,
          connectedAt: user.connectedAt
        }));

        socket.emit('online_users', { users: onlineUsers });
      });

      // Solicitar informações de salas
      socket.on('get_room_info', () => {
        if (!socket.data.user) {
          socket.emit('error', { message: 'Usuário não autenticado' });
          return;
        }

        const rooms: RoomInfo[] = [];
        this.roomUsers.forEach((userIds, roomName) => {
          const users = Array.from(userIds)
            .map(userId => this.getUserByUserId(userId))
            .filter(user => user !== null) as SocketUser[];

          rooms.push({
            name: roomName,
            users,
            createdAt: new Date() // Simplificado - em produção seria persistido
          });
        });

        socket.emit('room_info', { rooms });
      });

      // Handler para join-lead-notifications
      socket.on('join-lead-notifications', (data: any) => {
        console.log('📢 Cliente entrou no grupo de notificações de leads:', data);
        socket.join('lead-notifications');
        
        // Enviar contagem atual de leads para admins
        if (data.userType === 'admin') {
          socket.emit('lead-count-update', { count: 0 }); // Será atualizado pela requisição
        }
      });
      
      // Handler para request-lead-count
      socket.on('request-lead-count', async (data: any) => {
        console.log('📊 Solicitação de contagem de leads:', data);
        
        if (data.userType === 'admin') {
          try {
            // Importar auxiliaryService dinamicamente para evitar dependência circular
            const { auxiliaryService } = await import('../controllers/auxiliaryController');
            const result = await auxiliaryService.getLeadCount();
            
            socket.emit('lead-count-update', { count: result.count });
            console.log(`📊 Contagem de leads enviada: ${result.count}`);
          } catch (error: any) {
            console.error('❌ Erro ao contar leads:', error);
          }
        }
      });

      // Handler para join-clinicas-notifications
      socket.on('join-clinicas-notifications', (data: any) => {
        console.log('📢 Cliente entrou no grupo de notificações de clínicas:', data);
        socket.join('clinicas-notifications');
        
        // Enviar contagem atual de clínicas para admins
        if (data.userType === 'admin') {
          socket.emit('clinicas-count-update', { count: 0 }); // Será atualizado pela requisição
        }
      });
      
      // Handler para request-clinicas-count
      socket.on('request-clinicas-count', async (data: any) => {
        console.log('📊 Solicitação de contagem de novas clínicas:', data);
        
        if (data.userType === 'admin') {
          try {
            // Importar auxiliaryService dinamicamente para evitar dependência circular
            const { auxiliaryService } = await import('../controllers/auxiliaryController');
            const result = await auxiliaryService.getClinicasCount();
            
            socket.emit('clinicas-count-update', { count: result.count });
            console.log(`📊 Contagem de novas clínicas enviada: ${result.count}`);
          } catch (error: any) {
            console.error('❌ Erro ao contar novas clínicas:', error);
          }
        }
      });

      // Desconexão
      socket.on('disconnect', () => {
        const user = socket.data.user;
        if (user) {
          console.log(`🔌 Usuário desconectado: ${user.nome} (${socket.id})`);
          
          // Remover de todas as salas
          this.leaveAllRooms(socket, user);
          
          // Remover usuário conectado
          this.connectedUsers.delete(socket.id);
        } else {
          console.log(`🔌 Cliente desconectado: ${socket.id}`);
        }
      });
    });
  }

  private joinUserRooms(socket: any, user: SocketUser): void {
    // Sala geral baseada no tipo de usuário
    const typeRoom = `users_${user.tipo}`;
    this.joinRoom(socket, typeRoom);

    // Sala específica do usuário
    const userRoom = `user_${user.id}`;
    this.joinRoom(socket, userRoom);

    // Sala de administradores (se for admin)
    if (user.tipo === 'admin') {
      this.joinRoom(socket, 'admins');
    }

    // Sala de empresa (se for empresa)
    if (user.tipo === 'empresa' && user.empresa_id) {
      const empresaRoom = `empresa_${user.empresa_id}`;
      this.joinRoom(socket, empresaRoom);
    }
  }

  private joinRoom(socket: any, roomName: string): void {
    socket.join(roomName);
    
    const user = socket.data.user;
    if (user) {
      // Adicionar usuário à sala
      if (!this.roomUsers.has(roomName)) {
        this.roomUsers.set(roomName, new Set());
      }
      this.roomUsers.get(roomName)!.add(user.id);

      // Adicionar sala ao usuário
      if (!this.userRooms.has(user.id)) {
        this.userRooms.set(user.id, new Set());
      }
      this.userRooms.get(user.id)!.add(roomName);

      console.log(`🏠 Usuário ${user.nome} entrou na sala: ${roomName}`);
    }
  }

  private leaveRoom(socket: any, roomName: string): void {
    socket.leave(roomName);
    
    const user = socket.data.user;
    if (user) {
      // Remover usuário da sala
      if (this.roomUsers.has(roomName)) {
        this.roomUsers.get(roomName)!.delete(user.id);
        if (this.roomUsers.get(roomName)!.size === 0) {
          this.roomUsers.delete(roomName);
        }
      }

      // Remover sala do usuário
      if (this.userRooms.has(user.id)) {
        this.userRooms.get(user.id)!.delete(roomName);
        if (this.userRooms.get(user.id)!.size === 0) {
          this.userRooms.delete(user.id);
        }
      }

      console.log(`🏠 Usuário ${user.nome} saiu da sala: ${roomName}`);
    }
  }

  private leaveAllRooms(socket: any, user: SocketUser): void {
    if (this.userRooms.has(user.id)) {
      const rooms = Array.from(this.userRooms.get(user.id)!);
      rooms.forEach(roomName => {
        this.leaveRoom(socket, roomName);
      });
    }
  }

  private getUserByUserId(userId: string): SocketUser | null {
    for (const user of this.connectedUsers.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  }

  // Métodos públicos para envio de notificações

  // Enviar notificação para usuário específico
  public sendToUser(userId: string, notification: NotificationData): void {
    const user = this.getUserByUserId(userId);
    if (user) {
      this.io.to(user.socketId).emit('notification', {
        ...notification,
        timestamp: notification.timestamp || new Date()
      });
      console.log(`📢 Notificação enviada para usuário ${user.nome}: ${notification.title}`);
    }
  }

  // Enviar notificação para todos os usuários de um tipo
  public sendToUserType(userType: string, notification: NotificationData): void {
    this.io.to(`users_${userType}`).emit('notification', {
      ...notification,
      timestamp: notification.timestamp || new Date()
    });
    console.log(`📢 Notificação enviada para tipo ${userType}: ${notification.title}`);
  }

  // Enviar notificação para sala específica
  public sendToRoom(roomName: string, notification: NotificationData): void {
    this.io.to(roomName).emit('notification', {
      ...notification,
      timestamp: notification.timestamp || new Date()
    });
    console.log(`📢 Notificação enviada para sala ${roomName}: ${notification.title}`);
  }

  // Enviar notificação para todos os administradores
  public sendToAdmins(notification: NotificationData): void {
    this.sendToRoom('admins', notification);
  }

  // Enviar notificação para todos os usuários conectados
  public broadcast(notification: NotificationData): void {
    this.io.emit('notification', {
      ...notification,
      timestamp: notification.timestamp || new Date()
    });
    console.log(`📢 Broadcast enviado: ${notification.title}`);
  }

  // Notificações específicas do sistema

  public notifyNewLead(leadData: any): void {
    const notification: NotificationData = {
      type: 'new_lead',
      title: '🎯 Novo Lead Capturado',
      message: `Lead ${leadData.nome} capturado via ${leadData.fonte || 'landing page'}`,
      data: leadData
    };

    // Notificar consultores e admins
    this.sendToUserType('consultor', notification);
    this.sendToAdmins(notification);
  }

  public notifyNewPatient(patientData: any): void {
    const notification: NotificationData = {
      type: 'new_patient',
      title: '👤 Novo Paciente',
      message: `Paciente ${patientData.nome} foi adicionado ao sistema`,
      data: patientData
    };

    // Notificar consultor responsável
    if (patientData.consultor_id) {
      this.sendToUser(patientData.consultor_id, notification);
    }
    
    // Notificar admins
    this.sendToAdmins(notification);
  }

  public notifyNewAppointment(appointmentData: any): void {
    const notification: NotificationData = {
      type: 'new_appointment',
      title: '📅 Novo Agendamento',
      message: `Agendamento para ${appointmentData.paciente_nome} em ${appointmentData.clinica_nome}`,
      data: appointmentData
    };

    // Notificar consultor responsável
    if (appointmentData.consultor_id) {
      this.sendToUser(appointmentData.consultor_id, notification);
    }

    // Notificar admins
    this.sendToAdmins(notification);
  }

  public notifyNewClinic(clinicData: any): void {
    const notification: NotificationData = {
      type: 'new_clinic',
      title: '🏥 Nova Clínica',
      message: `Clínica ${clinicData.nome} foi adicionada ao sistema`,
      data: clinicData
    };

    // Notificar consultor responsável
    if (clinicData.consultor_id) {
      this.sendToUser(clinicData.consultor_id, notification);
    }

    // Notificar admins
    this.sendToAdmins(notification);
  }

  public notifyNewClosing(closingData: any): void {
    const notification: NotificationData = {
      type: 'new_closing',
      title: '💰 Novo Fechamento',
      message: `Fechamento de R$ ${closingData.valor_fechado} para ${closingData.paciente_nome}`,
      data: closingData
    };

    // Notificar consultor responsável
    if (closingData.consultor_id) {
      this.sendToUser(closingData.consultor_id, notification);
    }

    // Notificar admins
    this.sendToAdmins(notification);
  }

  public notifyStatusUpdate(entity: string, status: string, data: any): void {
    const notification: NotificationData = {
      type: 'status_update',
      title: '🔄 Status Atualizado',
      message: `${entity} status alterado para ${status}`,
      data
    };

    // Notificar usuários relevantes baseado no tipo de entidade
    if (data.consultor_id) {
      this.sendToUser(data.consultor_id, notification);
    }
    
    this.sendToAdmins(notification);
  }

  // Métodos de utilidade

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getUsersByType(userType: string): SocketUser[] {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.tipo === userType);
  }

  public getRoomUsers(roomName: string): SocketUser[] {
    if (!this.roomUsers.has(roomName)) {
      return [];
    }

    return Array.from(this.roomUsers.get(roomName)!)
      .map(userId => this.getUserByUserId(userId))
      .filter(user => user !== null) as SocketUser[];
  }

  public isUserOnline(userId: string): boolean {
    return this.getUserByUserId(userId) !== null;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Instância singleton do serviço
let socketServiceInstance: SocketService | null = null;

export const getSocketService = (server?: HTTPServer): SocketService => {
  if (!socketServiceInstance && server) {
    socketServiceInstance = new SocketService(server);
  }
  
  if (!socketServiceInstance) {
    throw new Error('SocketService não foi inicializado. Chame getSocketService(server) primeiro.');
  }
  
  return socketServiceInstance;
};
