// Configurar variáveis de ambiente PRIMEIRO
import './src/config/env';

import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { createServer } from 'http';
import { getSocketService } from './src/services/socketService';
import { accessLogger, errorLogger } from './src/middleware/logging';
import { securityHeaders, globalRateLimit, botDetection, validateOrigin, sqlInjectionDetection, xssDetection, sanitizeInput } from './src/middleware/security';
import { authenticateToken } from './src/middleware/auth';
import { AuthenticatedHandler } from './src/types';

// Importar rotas
import authRoutes from './src/routes/authRoutes';
import { verifyToken } from './src/controllers/authController';
import userRoutes from './src/routes/userRoutes';
import empresaRoutes from './src/routes/empresaRoutes';
import uploadRoutes from './src/routes/uploadRoutes';
import consultorRoutes from './src/routes/consultorRoutes';
import pacienteRoutes from './src/routes/pacienteRoutes';
import clinicaRoutes from './src/routes/clinicaRoutes';
import agendamentoRoutes from './src/routes/agendamentoRoutes';
import fechamentoRoutes from './src/routes/fechamentoRoutes';
import leadRoutes from './src/routes/leadRoutes';
import metaAdsRoutes from './src/routes/metaAdsRoutes';
import idsfRoutes from './src/routes/idsfRoutes';
import emailRoutes from './src/routes/emailRoutes';
import notificationRoutes from './src/routes/notificationRoutes';
import documentRoutes from './src/routes/documentRoutes';
import dashboardRoutes from './src/routes/dashboardRoutes';
import auxiliaryRoutes from './src/routes/auxiliaryRoutes';

const app = express();
const server = createServer(app);
const PORT = process.env['PORT'] || 5000;

// Health check endpoint para Railway
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

// Rota raiz para Railway
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'CrmInvest Backend API', 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/usuarios',
      empresas: '/api/empresas',
      upload: '/api/upload',
      consultores: '/api/consultores',
      pacientes: '/api/pacientes',
      clinicas: '/api/clinicas',
      agendamentos: '/api/agendamentos',
      fechamentos: '/api/fechamentos',
      leads: '/api/leads',
      metaAds: '/api/meta-ads',
      idsf: '/api/idsf',
      email: '/api/email',
      notifications: '/api/notifications',
      documents: '/api/documents',
      dashboard: '/api/dashboard'
    }
  });
});

// Configuração CORS para produção e desenvolvimento
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://crm.investmoneysa.com.br',
    'https://www.crm.investmoneysa.com.br',
    'https://solumn.com.br',
    'https://www.solumn.com.br'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware de segurança (aplicar primeiro)
app.use(securityHeaders);
app.use(globalRateLimit);
app.use(botDetection);
app.use(validateOrigin);
app.use(sqlInjectionDetection);
app.use(xssDetection);
app.use(sanitizeInput);

// Middleware de logging
app.use(accessLogger);

// Middleware CORS e parsing
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '250mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '250mb' }));

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas da API
app.use('/api/auth', authRoutes);
// Rota direta para verify-token (compatibilidade)
app.get('/api/verify-token', authenticateToken, verifyToken as AuthenticatedHandler);
app.use('/api/usuarios', userRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/consultores', consultorRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/clinicas', clinicaRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/fechamentos', fechamentoRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/meta-ads', metaAdsRoutes);
app.use('/api/idsf', idsfRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auxiliary', auxiliaryRoutes);

// Middleware de tratamento de erros
app.use(errorLogger);
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env['NODE_ENV'] === 'development' ? err.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: _req.originalUrl
  });
});

// Inicializar Socket.IO Service
getSocketService(server);

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🌍 Ambiente: ${process.env['NODE_ENV'] || 'development'}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});

export default app;
