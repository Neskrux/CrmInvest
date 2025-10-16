import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

// Interfaces para tipagem do serviço de email
export interface EmailConfig {
  service: string;
  host?: string;
  port?: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface PasswordResetEmailData {
  nome: string;
  resetLink: string;
}

export interface WelcomeEmailData {
  nome: string;
  tipo: 'consultor' | 'clinica' | 'empresa';
  loginUrl?: string;
}

export interface NotificationEmailData {
  nome: string;
  titulo: string;
  mensagem: string;
  acaoUrl?: string;
  acaoTexto?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter!: Transporter;
  private isConfigured: boolean;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env['EMAIL_FROM'] || 'noreply@solumn.com.br';
    this.isConfigured = this.checkEmailConfiguration();
    
    if (this.isConfigured) {
      this.transporter = this.createTransporter();
      console.log(`📧 Email Service configurado: ${process.env['EMAIL_SERVICE'] || 'gmail'}`);
    } else {
      console.log('⚠️ Email Service não configurado - emails serão logados no console');
    }
  }

  // Verificar se a configuração de email está completa
  private checkEmailConfiguration(): boolean {
    const emailUser = process.env['EMAIL_USER'];
    const emailPass = process.env['EMAIL_PASS'];
    
    return !!(
      emailUser && 
      emailPass &&
      emailUser !== 'your-email@gmail.com' &&
      emailPass !== 'your-app-password'
    );
  }

  // Criar transporter baseado na configuração
  private createTransporter(): Transporter {
    const service = process.env['EMAIL_SERVICE'] || 'gmail';
    
    switch (service) {
      case 'sendgrid':
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env['EMAIL_PASS']!
          }
        });
      
      case 'mailgun':
        return nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env['EMAIL_USER']!,
            pass: process.env['EMAIL_PASS']!
          }
        });
      
      case 'gmail':
      default:
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env['EMAIL_USER']!,
            pass: process.env['EMAIL_PASS']!
          }
        });
    }
  }

  // Verificar se o serviço está configurado
  public isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  // Enviar email genérico
  public async sendEmail(to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
    try {
      if (!this.isConfigured) {
        console.log('📧 ========================================');
        console.log('📧 EMAIL NÃO CONFIGURADO - MODO DESENVOLVIMENTO');
        console.log(`📧 Para: ${to}`);
        console.log(`📧 Assunto: ${subject}`);
        console.log(`📧 HTML: ${html.substring(0, 200)}...`);
        console.log('📧 ========================================');
        
        return {
          success: true,
          messageId: 'dev-mode-' + Date.now()
        };
      }

      const mailOptions: SendMailOptions = {
        from: this.fromAddress,
        to,
        subject,
        html,
        text
      };

      console.log(`📧 Enviando email para: ${to}`);
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email enviado com sucesso: ${result.messageId}`);
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error: any) {
      console.error('❌ Erro ao enviar email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enviar email de redefinição de senha
  public async sendPasswordResetEmail(email: string, data: PasswordResetEmailData): Promise<EmailResult> {
    const subject = 'Redefinição de Senha - Solumn';
    const html = this.generatePasswordResetTemplate(data);
    const text = `Olá ${data.nome}, você solicitou a redefinição de sua senha. Acesse: ${data.resetLink}`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Enviar email de boas-vindas
  public async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<EmailResult> {
    const subject = `Bem-vindo ao Solumn - ${data.nome}`;
    const html = this.generateWelcomeTemplate(data);
    const text = `Bem-vindo ao Solumn, ${data.nome}! Sua conta ${data.tipo} foi criada com sucesso.`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Enviar email de notificação
  public async sendNotificationEmail(email: string, data: NotificationEmailData): Promise<EmailResult> {
    const subject = `Notificação Solumn - ${data.titulo}`;
    const html = this.generateNotificationTemplate(data);
    const text = `${data.titulo}: ${data.mensagem}`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Enviar email de novo lead
  public async sendNewLeadEmail(email: string, leadData: { nome: string; telefone: string; email: string; origem?: string }): Promise<EmailResult> {
    const subject = 'Novo Lead Capturado - Solumn';
    const html = this.generateNewLeadTemplate(leadData);
    const text = `Novo lead: ${leadData.nome} (${leadData.telefone})`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Enviar email de agendamento
  public async sendAppointmentEmail(email: string, appointmentData: { 
    nome: string; 
    data: string; 
    horario: string; 
    clinica: string;
    tipo: 'confirmacao' | 'lembrete' | 'cancelamento';
  }): Promise<EmailResult> {
    const subject = `Agendamento ${appointmentData.tipo === 'confirmacao' ? 'Confirmado' : appointmentData.tipo === 'lembrete' ? 'Lembrete' : 'Cancelado'} - Solumn`;
    const html = this.generateAppointmentTemplate(appointmentData);
    const text = `Agendamento ${appointmentData.tipo}: ${appointmentData.nome} - ${appointmentData.data} às ${appointmentData.horario}`;

    return await this.sendEmail(email, subject, html, text);
  }

  // Gerar template de redefinição de senha
  private generatePasswordResetTemplate(data: PasswordResetEmailData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1d23; margin: 0;">Solumn</h1>
        </div>
        
        <h2 style="color: #1a1d23;">Redefinição de Senha</h2>
        
        <p>Olá <strong>${data.nome}</strong>,</p>
        
        <p>Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova senha:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" 
             style="background-color: #1a1d23; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Redefinir Senha
          </a>
        </div>
        
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="word-break: break-all; color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;">${data.resetLink}</p>
        
        <p><strong>⚠️ Este link expira em 24 horas.</strong></p>
        
        <p>Se você não solicitou esta redefinição, ignore este email.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          Este é um email automático, não responda.<br>
          Solumn - Sistema de Gestão
        </p>
      </div>
    `;
  }

  // Gerar template de boas-vindas
  private generateWelcomeTemplate(data: WelcomeEmailData): string {
    const tipoText = {
      consultor: 'Consultor',
      clinica: 'Clínica',
      empresa: 'Empresa'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1d23; margin: 0;">Solumn</h1>
        </div>
        
        <h2 style="color: #1a1d23;">Bem-vindo ao Solumn!</h2>
        
        <p>Olá <strong>${data.nome}</strong>,</p>
        
        <p>Sua conta de <strong>${tipoText[data.tipo]}</strong> foi criada com sucesso no Solumn!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a1d23; margin-top: 0;">O que você pode fazer agora:</h3>
          <ul style="color: #666;">
            <li>Acessar seu painel personalizado</li>
            <li>Gerenciar seus dados e preferências</li>
            <li>Utilizar todas as funcionalidades disponíveis</li>
          </ul>
        </div>
        
        ${data.loginUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" 
               style="background-color: #1a1d23; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Acessar Sistema
            </a>
          </div>
        ` : ''}
        
        <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          Solumn - Sistema de Gestão<br>
          Este é um email automático, não responda.
        </p>
      </div>
    `;
  }

  // Gerar template de notificação
  private generateNotificationTemplate(data: NotificationEmailData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1d23; margin: 0;">Solumn</h1>
        </div>
        
        <h2 style="color: #1a1d23;">${data.titulo}</h2>
        
        <p>${data.mensagem}</p>
        
        ${data.acaoUrl && data.acaoTexto ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.acaoUrl}" 
               style="background-color: #1a1d23; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              ${data.acaoTexto}
            </a>
          </div>
        ` : ''}
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          Solumn - Sistema de Gestão<br>
          Este é um email automático, não responda.
        </p>
      </div>
    `;
  }

  // Gerar template de novo lead
  private generateNewLeadTemplate(data: { nome: string; telefone: string; email: string; origem?: string }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1d23; margin: 0;">Solumn</h1>
        </div>
        
        <h2 style="color: #1a1d23;">🎯 Novo Lead Capturado!</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a1d23; margin-top: 0;">Dados do Lead:</h3>
          <p><strong>Nome:</strong> ${data.nome}</p>
          <p><strong>Telefone:</strong> ${data.telefone}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          ${data.origem ? `<p><strong>Origem:</strong> ${data.origem}</p>` : ''}
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>
        
        <p><strong>🚀 Ação recomendada:</strong> Entre em contato o quanto antes para maximizar as chances de conversão!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          Solumn - Sistema de Gestão<br>
          Notificação automática de novos leads
        </p>
      </div>
    `;
  }

  // Gerar template de agendamento
  private generateAppointmentTemplate(data: { 
    nome: string; 
    data: string; 
    horario: string; 
    clinica: string;
    tipo: 'confirmacao' | 'lembrete' | 'cancelamento';
  }): string {
    const tipoText = {
      confirmacao: 'Confirmado',
      lembrete: 'Lembrete',
      cancelamento: 'Cancelado'
    };

    const tipoColor = {
      confirmacao: '#28a745',
      lembrete: '#ffc107',
      cancelamento: '#dc3545'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1d23; margin: 0;">Solumn</h1>
        </div>
        
        <div style="background: ${tipoColor[data.tipo]}20; border-left: 4px solid ${tipoColor[data.tipo]}; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: ${tipoColor[data.tipo]}; margin-top: 0;">
            📅 Agendamento ${tipoText[data.tipo]}
          </h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a1d23; margin-top: 0;">Detalhes do Agendamento:</h3>
          <p><strong>Paciente:</strong> ${data.nome}</p>
          <p><strong>Data:</strong> ${data.data}</p>
          <p><strong>Horário:</strong> ${data.horario}</p>
          <p><strong>Clínica:</strong> ${data.clinica}</p>
        </div>
        
        ${data.tipo === 'lembrete' ? `
          <p><strong>⏰ Lembrete:</strong> Seu agendamento está próximo. Chegue com alguns minutos de antecedência.</p>
        ` : data.tipo === 'cancelamento' ? `
          <p><strong>❌ Cancelamento:</strong> Este agendamento foi cancelado. Entre em contato se precisar reagendar.</p>
        ` : `
          <p><strong>✅ Confirmação:</strong> Seu agendamento foi confirmado com sucesso!</p>
        `}
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          Solumn - Sistema de Gestão<br>
          Notificação automática de agendamentos
        </p>
      </div>
    `;
  }

  // Testar conexão com o serviço de email
  public async testConnection(): Promise<EmailResult> {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Serviço de email não configurado'
        };
      }

      await this.transporter.verify();
      console.log('✅ Conexão com serviço de email verificada com sucesso');
      
      return {
        success: true,
        messageId: 'connection-test-' + Date.now()
      };

    } catch (error: any) {
      console.error('❌ Erro ao verificar conexão de email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obter configuração atual (sem senhas)
  public getConfig(): Partial<EmailConfig> & { auth: { user: string; pass: string } } {
    return {
      service: process.env['EMAIL_SERVICE'] || 'gmail',
      ...(process.env['EMAIL_SERVICE'] === 'sendgrid' && { host: 'smtp.sendgrid.net' }),
      ...(process.env['EMAIL_SERVICE'] === 'mailgun' && { host: 'smtp.mailgun.org' }),
      ...(process.env['EMAIL_SERVICE'] !== 'gmail' && { port: 587 }),
      secure: false,
      auth: {
        user: process.env['EMAIL_USER'] || '',
        pass: '***' // Não retornar a senha real
      }
    };
  }
}
