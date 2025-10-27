const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar Nodemailer para envio de emails
const getEmailTransporter = () => {
  const service = process.env.EMAIL_SERVICE || 'gmail';
  
  switch (service) {
    case 'sendgrid':
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    
    case 'mailgun':
      return nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    
    case 'gmail':
    default:
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
  }
};

const transporter = getEmailTransporter();

// Log da configuração de email (para debug)
console.log(`📧 Email configurado: ${process.env.EMAIL_SERVICE || 'gmail'}`);
console.log(`📧 Email user: ${process.env.EMAIL_USER || 'seu-email@gmail.com'}`);
console.log(`📧 Email from: ${process.env.EMAIL_FROM || 'noreply@crm.com'}`);

module.exports = transporter;

