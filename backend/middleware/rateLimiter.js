const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV === 'development';

// Rate limiter para login (proteção contra brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 9999 : 10, // 10 tentativas em produção, ilimitado em dev
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers
  legacyHeaders: false,
  skip: (req) => isDevelopment
});

// Rate limiter geral para todas as rotas
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: isDevelopment ? 9999 : 2000, // 2000 requisições em produção, ilimitado em dev
  message: {
    error: 'Muitas requisições. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment
});

// Rate limiter para uploads (mais restritivo)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: isDevelopment ? 9999 : 20, // 20 uploads por hora em produção, ilimitado em dev
  message: {
    error: 'Limite de uploads excedido. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment
});

// Rate limiter para APIs externas (Meta Ads, IDSF)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: isDevelopment ? 9999 : 2000, // 2000 requisições por minuto em produção, ilimitado em dev
  message: {
    error: 'Muitas requisições para API externa. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment
});

// Rate limiter específico para verify-token (mais permissivo)
const verifyTokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: isDevelopment ? 9999 : 120, // 120 requisições por minuto em produção, ilimitado em dev
  message: {
    error: 'Muitas verificações de token. Aguarde 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment
});

module.exports = {
  loginLimiter,
  generalLimiter,
  uploadLimiter,
  apiLimiter,
  verifyTokenLimiter
};

