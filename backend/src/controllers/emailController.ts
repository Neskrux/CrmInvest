import { Response } from 'express';
import { EmailService } from '../services/emailService';
import { AuthenticatedRequest } from '../types';

// Instância do serviço de email
const emailService = new EmailService();

// Controller para testar conexão com serviço de email
export const testEmailConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('📧 GET /api/email/test - Testando conexão');

    const result = await emailService.testConnection();
    
    res.json({
      success: result.success,
      message: result.success ? 'Conexão com serviço de email verificada com sucesso' : 'Erro na conexão com serviço de email',
      data: {
        messageId: result.messageId,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao testar conexão de email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para obter configuração do email
export const getEmailConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    console.log('📧 GET /api/email/config');

    const config = emailService.getConfig();
    const isConfigured = emailService.isServiceConfigured();
    
    res.json({
      success: true,
      data: {
        ...config,
        isConfigured
      }
    });

  } catch (error: any) {
    console.error('Erro ao obter configuração de email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para enviar email de redefinição de senha
export const sendPasswordResetEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { email, nome, resetLink } = req.body;

    if (!email || !nome || !resetLink) {
      res.status(400).json({ 
        success: false, 
        error: 'Email, nome e resetLink são obrigatórios' 
      });
      return;
    }

    console.log(`📧 POST /api/email/password-reset - Para: ${email}`);

    const result = await emailService.sendPasswordResetEmail(email, {
      nome,
      resetLink
    });
    
    res.json({
      success: result.success,
      message: result.success ? 'Email de redefinição enviado com sucesso' : 'Erro ao enviar email',
      data: {
        messageId: result.messageId,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao enviar email de redefinição:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para enviar email de boas-vindas
export const sendWelcomeEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { email, nome, tipo, loginUrl } = req.body;

    if (!email || !nome || !tipo) {
      res.status(400).json({ 
        success: false, 
        error: 'Email, nome e tipo são obrigatórios' 
      });
      return;
    }

    if (!['consultor', 'clinica', 'empresa'].includes(tipo)) {
      res.status(400).json({ 
        success: false, 
        error: 'Tipo deve ser: consultor, clinica ou empresa' 
      });
      return;
    }

    console.log(`📧 POST /api/email/welcome - Para: ${email}, Tipo: ${tipo}`);

    const result = await emailService.sendWelcomeEmail(email, {
      nome,
      tipo: tipo as 'consultor' | 'clinica' | 'empresa',
      loginUrl
    });
    
    res.json({
      success: result.success,
      message: result.success ? 'Email de boas-vindas enviado com sucesso' : 'Erro ao enviar email',
      data: {
        messageId: result.messageId,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para enviar email de notificação
export const sendNotificationEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { email, nome, titulo, mensagem, acaoUrl, acaoTexto } = req.body;

    if (!email || !nome || !titulo || !mensagem) {
      res.status(400).json({ 
        success: false, 
        error: 'Email, nome, titulo e mensagem são obrigatórios' 
      });
      return;
    }

    console.log(`📧 POST /api/email/notification - Para: ${email}`);

    const result = await emailService.sendNotificationEmail(email, {
      nome,
      titulo,
      mensagem,
      acaoUrl,
      acaoTexto
    });
    
    res.json({
      success: result.success,
      message: result.success ? 'Email de notificação enviado com sucesso' : 'Erro ao enviar email',
      data: {
        messageId: result.messageId,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao enviar email de notificação:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para enviar email de novo lead
export const sendNewLeadEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { email, nome, telefone, leadEmail, origem } = req.body;

    if (!email || !nome || !telefone || !leadEmail) {
      res.status(400).json({ 
        success: false, 
        error: 'Email destinatário, nome, telefone e email do lead são obrigatórios' 
      });
      return;
    }

    console.log(`📧 POST /api/email/new-lead - Para: ${email}`);

    const result = await emailService.sendNewLeadEmail(email, {
      nome,
      telefone,
      email: leadEmail,
      origem
    });
    
    res.json({
      success: result.success,
      message: result.success ? 'Email de novo lead enviado com sucesso' : 'Erro ao enviar email',
      data: {
        messageId: result.messageId,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao enviar email de novo lead:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para enviar email de agendamento
export const sendAppointmentEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { email, nome, data, horario, clinica, tipo } = req.body;

    if (!email || !nome || !data || !horario || !clinica || !tipo) {
      res.status(400).json({ 
        success: false, 
        error: 'Todos os campos são obrigatórios' 
      });
      return;
    }

    if (!['confirmacao', 'lembrete', 'cancelamento'].includes(tipo)) {
      res.status(400).json({ 
        success: false, 
        error: 'Tipo deve ser: confirmacao, lembrete ou cancelamento' 
      });
      return;
    }

    console.log(`📧 POST /api/email/appointment - Para: ${email}, Tipo: ${tipo}`);

    const result = await emailService.sendAppointmentEmail(email, {
      nome,
      data,
      horario,
      clinica,
      tipo: tipo as 'confirmacao' | 'lembrete' | 'cancelamento'
    });
    
    res.json({
      success: result.success,
      message: result.success ? 'Email de agendamento enviado com sucesso' : 'Erro ao enviar email',
      data: {
        messageId: result.messageId,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao enviar email de agendamento:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

// Controller para enviar email genérico
export const sendGenericEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Token de autenticação não fornecido' 
      });
      return;
    }

    const { email, subject, html, text } = req.body;

    if (!email || !subject || !html) {
      res.status(400).json({ 
        success: false, 
        error: 'Email, subject e html são obrigatórios' 
      });
      return;
    }

    console.log(`📧 POST /api/email/send - Para: ${email}`);

    const result = await emailService.sendEmail(email, subject, html, text);
    
    res.json({
      success: result.success,
      message: result.success ? 'Email enviado com sucesso' : 'Erro ao enviar email',
      data: {
        messageId: result.messageId,
        error: result.error
      }
    });

  } catch (error: any) {
    console.error('Erro ao enviar email genérico:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};
