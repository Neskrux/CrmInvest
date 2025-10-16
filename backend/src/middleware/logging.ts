import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  statusCode: number;
  responseTime: number;
  body?: any;
  query?: any;
  params?: any;
}

// Configuração de logging
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'access.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Criar diretório de logs se não existir
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Função para formatar log
const formatLogEntry = (entry: LogEntry): string => {
  const logLine = [
    entry.timestamp,
    entry.method,
    entry.url,
    entry.ip,
    entry.userAgent,
    entry.userId || '-',
    entry.statusCode,
    `${entry.responseTime}ms`
  ].join(' | ');

  return logLine;
};

// Função para escrever log de forma assíncrona
const writeLog = async (logFile: string, message: string): Promise<void> => {
  try {
    await fs.promises.appendFile(logFile, message + '\n');
  } catch (error) {
    console.error('❌ Erro ao escrever log:', error);
  }
};

// Middleware de logging de acesso
export const accessLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Interceptar o evento 'finish' da resposta
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    
    const logEntry: LogEntry = {
      timestamp,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      userId: (req as any).user?.id,
      statusCode: res.statusCode,
      responseTime
    };

    // Adicionar dados da requisição para logs detalhados (apenas em desenvolvimento)
    if (process.env['NODE_ENV'] === 'development') {
      if (req.body && Object.keys(req.body).length > 0) {
        logEntry.body = req.body;
      }
      if (req.query && Object.keys(req.query).length > 0) {
        logEntry.query = req.query;
      }
      if (req.params && Object.keys(req.params).length > 0) {
        logEntry.params = req.params;
      }
    }

    const logLine = formatLogEntry(logEntry);
    
    // Log no console (apenas erros e warnings)
    if (res.statusCode >= 400) {
      console.log(`🔴 ${logLine}`);
    } else if (res.statusCode >= 300) {
      console.log(`🟡 ${logLine}`);
    }
    // Removido log de sucesso para reduzir spam

    // Log em arquivo
    await writeLog(LOG_FILE, logLine);
  });

  next();
};

// Middleware de logging de erros
export const errorLogger = (err: Error, req: Request, _res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const errorEntry = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    userId: (req as any).user?.id,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    body: req.body,
    query: req.query,
    params: req.params
  };

  const errorLogLine = `${timestamp} | ${req.method} ${req.originalUrl} | ${req.ip} | ${err.name}: ${err.message}`;
  
  // Log no console
  console.error(`🔴 ${errorLogLine}`);
  
  // Log em arquivo
  writeLog(ERROR_LOG_FILE, JSON.stringify(errorEntry, null, 2));
  
  next(err);
};

// Middleware para logging de operações específicas
export const operationLogger = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
  const userId = (req as any).user?.id;
  
  console.log(`🔄 Iniciando ${operation} - Usuário: ${userId || 'Anônimo'} - ${req.originalUrl}`);
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode >= 400 ? '❌' : '✅';
      
      console.log(`${status} ${operation} concluído em ${duration}ms - Status: ${res.statusCode}`);
    });
    
    next();
  };
};

// Middleware para logging de uploads
export const uploadLogger = (req: Request, res: Response, next: NextFunction): void => {
  const userId = (req as any).user?.id;
  
  // Log início do upload
  console.log(`📤 Upload iniciado - Usuário: ${userId || 'Anônimo'} - ${req.originalUrl}`);
  
  res.on('finish', () => {
    const status = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${status} Upload concluído - Status: ${res.statusCode}`);
  });
  
  next();
};

// Middleware para logging de autenticação
export const authLogger = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Log tentativa de autenticação
  console.log(`🔐 Tentativa de autenticação - IP: ${ip} - ${req.originalUrl}`);
  
  res.on('finish', () => {
    const status = res.statusCode === 200 ? '✅ Login bem-sucedido' : '❌ Login falhou';
    console.log(`${status} - IP: ${ip} - Status: ${res.statusCode}`);
  });
  
  next();
};

// Middleware para logging de API externa
export const externalAPILogger = (apiName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    console.log(`🌐 Chamada para ${apiName} - ${req.originalUrl}`);
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode >= 400 ? '❌' : '✅';
      
      console.log(`${status} ${apiName} respondido em ${duration}ms - Status: ${res.statusCode}`);
    });
    
    next();
  };
};

// Função para obter estatísticas de logs
export const getLogStats = async (): Promise<any> => {
  try {
    const stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      topEndpoints: [] as Array<{ endpoint: string; count: number }>,
      topIPs: [] as Array<{ ip: string; count: number }>,
      requestsByHour: [] as Array<{ hour: string; count: number }>,
      errorCount: 0
    };

    // Ler arquivo de log de acesso
    if (fs.existsSync(LOG_FILE)) {
      const logContent = await fs.promises.readFile(LOG_FILE, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const endpointCounts = new Map<string, number>();
      const ipCounts = new Map<string, number>();
      const hourCounts = new Map<string, number>();
      let totalResponseTime = 0;
      
      lines.forEach(line => {
        const parts = line.split(' | ');
        if (parts.length >= 8) {
          stats.totalRequests++;
          
        const timestamp = parts[0];
        const method = parts[1];
        const url = parts[2];
        const ip = parts[3];
        const statusCode = parseInt(parts[6] || '0');
        const responseTime = parseInt((parts[7] || '0').replace('ms', ''));
          
          // Contar sucessos e falhas
          if (statusCode < 400) {
            stats.successfulRequests++;
          } else {
            stats.failedRequests++;
          }
          
          // Soma do tempo de resposta
          totalResponseTime += responseTime;
          
          // Contar endpoints
          const endpoint = `${method} ${url?.split('?')[0] || ''}`;
          endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + 1);
          
          // Contar IPs
          if (ip) {
            ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
          }
          
          // Contar por hora
          const hour = timestamp?.substring(0, 13) || ''; // YYYY-MM-DDTHH
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
      });
      
      // Calcular tempo médio de resposta
      if (stats.totalRequests > 0) {
        stats.averageResponseTime = Math.round(totalResponseTime / stats.totalRequests);
      }
      
      // Top 10 endpoints
      stats.topEndpoints = Array.from(endpointCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }));
      
      // Top 10 IPs
      stats.topIPs = Array.from(ipCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }));
      
      // Requests por hora (últimas 24 horas)
      const now = new Date();
      const last24Hours = Array.from(hourCounts.entries())
        .filter(([hour]) => {
          const hourDate = new Date(hour + ':00:00.000Z');
          return now.getTime() - hourDate.getTime() <= 24 * 60 * 60 * 1000;
        })
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, count]) => ({ hour, count }));
      
      stats.requestsByHour = last24Hours;
    }
    
    // Ler arquivo de log de erros
    if (fs.existsSync(ERROR_LOG_FILE)) {
      const errorContent = await fs.promises.readFile(ERROR_LOG_FILE, 'utf-8');
      const errorLines = errorContent.split('\n').filter(line => line.trim());
      stats.errorCount = errorLines.length;
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas de logs:', error);
    return null;
  }
};

// Função para limpar logs antigos
export const cleanOldLogs = async (daysToKeep: number = 30): Promise<void> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Implementar rotação de logs aqui se necessário
    console.log(`🧹 Limpeza de logs mais antigos que ${daysToKeep} dias agendada`);
  } catch (error) {
    console.error('❌ Erro ao limpar logs antigos:', error);
  }
};
