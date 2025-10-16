import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  getConnectionStats,
  getOnlineUsers,
  sendToUser,
  sendToUserType,
  broadcast,
  testConnection,
  getRoomInfo
} from '../controllers/notificationController';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas administrativas - apenas admins podem acessar
router.get('/stats', requireAdmin, getConnectionStats);
router.get('/online-users', requireAdmin, getOnlineUsers);
router.get('/room-info', requireAdmin, getRoomInfo);
router.get('/test', requireAdmin, testConnection);

// Rotas para envio de notificações - apenas admins
router.post('/send/user/:userId', requireAdmin, sendToUser);
router.post('/send/type/:userType', requireAdmin, sendToUserType);
router.post('/broadcast', requireAdmin, broadcast);

export default router;
