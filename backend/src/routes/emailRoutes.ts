import { Router } from 'express';
import { 
  testEmailConnection,
  getEmailConfig,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNotificationEmail,
  sendNewLeadEmail,
  sendAppointmentEmail,
  sendGenericEmail
} from '../controllers/emailController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';

const router = Router();

// Todas as rotas de email requerem autenticação
router.use(authenticateToken);

// Testar conexão com serviço de email
router.get('/test', testEmailConnection as AuthenticatedHandler);

// Obter configuração do email
router.get('/config', getEmailConfig as AuthenticatedHandler);

// Enviar email de redefinição de senha
router.post('/password-reset', sendPasswordResetEmail as AuthenticatedHandler);

// Enviar email de boas-vindas
router.post('/welcome', sendWelcomeEmail as AuthenticatedHandler);

// Enviar email de notificação
router.post('/notification', sendNotificationEmail as AuthenticatedHandler);

// Enviar email de novo lead
router.post('/new-lead', sendNewLeadEmail as AuthenticatedHandler);

// Enviar email de agendamento
router.post('/appointment', sendAppointmentEmail as AuthenticatedHandler);

// Enviar email genérico
router.post('/send', sendGenericEmail as AuthenticatedHandler);

export default router;
