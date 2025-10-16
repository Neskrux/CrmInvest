import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Middleware para configurar headers de segurança
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

// Middleware para rate limiting global
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requests por IP a cada 15 minutos
  message: {
    success: false,
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para detectar e bloquear bots maliciosos
export const botDetection = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /wget/i,
    /curl/i,
    /python/i,
    /java/i,
    /php/i,
    /go-http/i,
    /okhttp/i,
    /apache/i,
    /nginx/i
  ];

  // Lista de user agents permitidos (browsers legítimos)
  const allowedPatterns = [
    /chrome/i,
    /firefox/i,
    /safari/i,
    /edge/i,
    /opera/i,
    /mozilla/i
  ];

  // Verificar se é um browser legítimo
  const isLegitimateBrowser = allowedPatterns.some(pattern => pattern.test(userAgent));
  
  // Verificar se contém padrões suspeitos
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  // Se não é um browser legítimo E contém padrões suspeitos, bloquear
  if (!isLegitimateBrowser && isSuspicious) {
    console.log(`🚫 Bot detectado e bloqueado: ${req.ip} - ${userAgent}`);
    res.status(403).json({
      success: false,
      error: 'Acesso negado'
    });
    return;
  }

  next();
};

// Middleware para validar origem das requisições
export const validateOrigin = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://crm.investmoneysa.com.br',
    'https://www.crm.investmoneysa.com.br',
    'https://solumn.com.br',
    'https://www.solumn.com.br'
  ];

  const origin = req.get('Origin') || req.get('Referer');
  
  // Permitir requisições sem origin (APIs, mobile apps, etc.)
  if (!origin) {
    next();
    return;
  }

  // Verificar se a origem está na lista permitida
  const isAllowed = allowedOrigins.some(allowedOrigin => 
    origin.startsWith(allowedOrigin)
  );

  if (!isAllowed) {
    console.log(`🚫 Origem não permitida: ${origin} - IP: ${req.ip}`);
    res.status(403).json({
      success: false,
      error: 'Origem não permitida'
    });
    return;
  }

  next();
};

// Middleware para detectar tentativas de SQL Injection
export const sqlInjectionDetection = (req: Request, res: Response, next: NextFunction): void => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(UNION\s+SELECT)/i,
    /(DROP\s+TABLE)/i,
    /(DELETE\s+FROM)/i,
    /(INSERT\s+INTO)/i,
    /(UPDATE\s+SET)/i,
    /(--|\/\*|\*\/)/,
    /(xp_cmdshell|sp_executesql)/i,
    /(script\s*:)/i,
    /(javascript\s*:)/i,
    /(vbscript\s*:)/i
  ];

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }
    
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    
    return false;
  };

  // Verificar body, query e params
  const hasSQLInjection = 
    checkObject(req.body) || 
    checkObject(req.query) || 
    checkObject(req.params);

  if (hasSQLInjection) {
    console.log(`🚫 Tentativa de SQL Injection detectada: ${req.ip} - ${req.originalUrl}`);
    res.status(400).json({
      success: false,
      error: 'Requisição maliciosa detectada'
    });
    return;
  }

  next();
};

// Middleware para detectar XSS
export const xssDetection = (req: Request, res: Response, next: NextFunction): void => {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>.*?<\/link>/gi,
    /<meta[^>]*>.*?<\/meta>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
    /onmouseover=/gi,
    /onfocus=/gi,
    /onblur=/gi,
    /onchange=/gi,
    /onsubmit=/gi,
    /onreset=/gi,
    /onselect=/gi,
    /onkeydown=/gi,
    /onkeyup=/gi,
    /onkeypress=/gi,
    /onmousedown=/gi,
    /onmouseup=/gi,
    /onmousemove=/gi,
    /onmouseout=/gi,
    /ondblclick=/gi,
    /oncontextmenu=/gi,
    /onabort=/gi,
    /oncanplay=/gi,
    /oncanplaythrough=/gi,
    /ondurationchange=/gi,
    /onemptied=/gi,
    /onended=/gi,
    /onerror=/gi,
    /onloadeddata=/gi,
    /onloadedmetadata=/gi,
    /onloadstart=/gi,
    /onpause=/gi,
    /onplay=/gi,
    /onplaying=/gi,
    /onprogress=/gi,
    /onratechange=/gi,
    /onseeked=/gi,
    /onseeking=/gi,
    /onstalled=/gi,
    /onsuspend=/gi,
    /ontimeupdate=/gi,
    /onvolumechange=/gi,
    /onwaiting=/gi
  ];

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return xssPatterns.some(pattern => pattern.test(obj));
    }
    
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    
    return false;
  };

  // Verificar body, query e params
  const hasXSS = 
    checkObject(req.body) || 
    checkObject(req.query) || 
    checkObject(req.params);

  if (hasXSS) {
    console.log(`🚫 Tentativa de XSS detectada: ${req.ip} - ${req.originalUrl}`);
    res.status(400).json({
      success: false,
      error: 'Requisição maliciosa detectada'
    });
    return;
  }

  next();
};

// Middleware para sanitizar dados de entrada
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove < e >
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/vbscript:/gi, '') // Remove vbscript:
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  
  next();
};

// Middleware para validar tamanho da requisição
export const validateRequestSize = (maxSize: number = 10 * 1024 * 1024) => { // 10MB padrão
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        error: 'Requisição muito grande'
      });
      return;
    }

    next();
  };
};

// Middleware para detectar ataques de força bruta
const bruteForceAttempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();

export const bruteForceProtection = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    let attempts = bruteForceAttempts.get(key);
    
    if (!attempts) {
      attempts = { count: 0, lastAttempt: now, blocked: false };
      bruteForceAttempts.set(key, attempts);
    }
    
    // Reset se passou da janela de tempo
    if (now - attempts.lastAttempt > windowMs) {
      attempts.count = 0;
      attempts.blocked = false;
    }
    
    // Verificar se está bloqueado
    if (attempts.blocked) {
      res.status(429).json({
        success: false,
        error: 'IP bloqueado por tentativas excessivas'
      });
      return;
    }
    
    // Incrementar contador
    attempts.count++;
    attempts.lastAttempt = now;
    
    // Bloquear se excedeu o limite
    if (attempts.count >= maxAttempts) {
      attempts.blocked = true;
      console.log(`🚫 IP bloqueado por força bruta: ${key}`);
      res.status(429).json({
        success: false,
        error: 'Muitas tentativas. IP bloqueado temporariamente'
      });
      return;
    }
    
    // Interceptar resposta para detectar falhas
    const originalSend = res.send;
    res.send = function(data: any) {
      // Se a resposta indica falha (status 4xx), incrementar contador
      if (res.statusCode >= 400 && res.statusCode < 500) {
        attempts!.count++;
      } else if (res.statusCode < 400) {
        // Se sucesso, resetar contador
        attempts!.count = 0;
        attempts!.blocked = false;
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Função para limpar tentativas de força bruta expiradas
export const cleanupBruteForceAttempts = (): void => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos
  
  for (const [key, attempts] of bruteForceAttempts.entries()) {
    if (now - attempts.lastAttempt > windowMs) {
      bruteForceAttempts.delete(key);
    }
  }
};

// Executar limpeza a cada 5 minutos
setInterval(cleanupBruteForceAttempts, 5 * 60 * 1000);

// Middleware para validar tokens JWT malformados
export const validateJWTFormat = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Verificar formato básico do JWT (3 partes separadas por ponto)
    const parts = token.split('.');
    if (parts.length !== 3) {
      res.status(401).json({
        success: false,
        error: 'Token malformado'
      });
      return;
    }
    
    // Verificar se cada parte é base64 válida
    try {
      parts.forEach(part => {
        Buffer.from(part, 'base64url');
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token malformado'
      });
      return;
    }
  }
  
  next();
};
