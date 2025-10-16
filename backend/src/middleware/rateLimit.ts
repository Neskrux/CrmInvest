import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Número máximo de requests
  message?: string; // Mensagem de erro personalizada
  skipSuccessfulRequests?: boolean; // Não contar requests bem-sucedidos
  skipFailedRequests?: boolean; // Não contar requests com falha
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// Store simples em memória para rate limiting
// Em produção, usar Redis ou banco de dados
const requestStore = new Map<string, RequestRecord>();

// Função para limpar registros expirados
const cleanupExpiredRecords = (): void => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
};

// Executar limpeza a cada 5 minutos
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

// Middleware de rate limiting genérico
export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Muitas tentativas. Tente novamente mais tarde.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Gerar chave única baseada no IP e rota
    const key = `${req.ip}-${req.originalUrl}`;
    const now = Date.now();
    
    // Obter ou criar registro para esta chave
    let record = requestStore.get(key);
    
    if (!record || now > record.resetTime) {
      // Criar novo registro ou resetar existente
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      requestStore.set(key, record);
    }

    // Incrementar contador
    record.count++;

    // Verificar se excedeu o limite
    if (record.count > maxRequests) {
      const resetTimeSeconds = Math.ceil((record.resetTime - now) / 1000);
      
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: resetTimeSeconds
      });
      return;
    }

    // Adicionar headers informativos
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
    });

    // Interceptar resposta para verificar se deve contar o request
    const originalSend = res.send;
    res.send = function(data: any) {
      const shouldCount = 
        (!skipSuccessfulRequests || res.statusCode < 400) &&
        (!skipFailedRequests || res.statusCode >= 400);

      if (!shouldCount && record) {
        record.count--;
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

// Rate limiting específico para login
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 5, // 5 tentativas por IP
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skipSuccessfulRequests: true // Não contar logins bem-sucedidos
});

// Rate limiting específico para captura de leads
export const leadCaptureRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 10, // 10 capturas por minuto
  message: 'Muitas capturas de leads. Aguarde um momento.'
});

// Rate limiting específico para uploads
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 50, // 50 uploads por hora
  message: 'Limite de uploads excedido. Tente novamente em uma hora.'
});

// Rate limiting específico para APIs externas
export const externalAPIRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 30, // 30 requests por minuto
  message: 'Muitas requisições para APIs externas. Aguarde um momento.'
});

// Rate limiting específico para notificações
export const notificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 20, // 20 notificações por minuto
  message: 'Muitas notificações enviadas. Aguarde um momento.'
});

// Rate limiting para criação de registros
export const createRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 20, // 20 criações por minuto
  message: 'Muitas criações de registros. Aguarde um momento.'
});

// Rate limiting para atualizações
export const updateRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 50, // 50 atualizações por minuto
  message: 'Muitas atualizações. Aguarde um momento.'
});

// Rate limiting para consultas
export const readRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 100, // 100 consultas por minuto
  message: 'Muitas consultas. Aguarde um momento.'
});

// Função para obter estatísticas de rate limiting
export const getRateLimitStats = (): any => {
  const now = Date.now();
  const stats = {
    totalKeys: requestStore.size,
    activeKeys: 0,
    expiredKeys: 0,
    topIPs: [] as Array<{ ip: string; count: number }>,
    topRoutes: [] as Array<{ route: string; count: number }>
  };

  const ipCounts = new Map<string, number>();
  const routeCounts = new Map<string, number>();

  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      stats.expiredKeys++;
    } else {
      stats.activeKeys++;
      
      // Extrair IP e rota da chave
      const [ip, route] = key.split('-', 2);
      
      // Contar por IP
      if (ip) {
        ipCounts.set(ip, (ipCounts.get(ip) || 0) + record.count);
      }
      
      // Contar por rota
      if (route) {
        routeCounts.set(route, (routeCounts.get(route) || 0) + record.count);
      }
    }
  }

  // Top 10 IPs
  stats.topIPs = Array.from(ipCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  // Top 10 rotas
  stats.topRoutes = Array.from(routeCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  return stats;
};

// Função para limpar rate limiting de um IP específico
export const clearRateLimitForIP = (ip: string): boolean => {
  let cleared = false;
  for (const key of requestStore.keys()) {
    if (key.startsWith(ip + '-')) {
      requestStore.delete(key);
      cleared = true;
    }
  }
  return cleared;
};

// Função para limpar todo o rate limiting
export const clearAllRateLimits = (): void => {
  requestStore.clear();
};
