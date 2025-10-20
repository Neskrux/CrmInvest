const rateLimit = require('express-rate-limit');

// Rate limiter para login (proteção contra brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo de 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers
  legacyHeaders: false,
  // Pular rate limit em ambiente de desenvolvimento
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Rate limiter geral para todas as rotas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo de 100 requisições por IP
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Rate limiter para uploads (mais restritivo)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo de 10 uploads por hora
  message: {
    error: 'Limite de uploads excedido. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Rate limiter para APIs externas (Meta Ads, IDSF)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // Máximo de 30 requisições por minuto
  message: {
    error: 'Muitas requisições para API externa. Aguarde 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

module.exports = {
  loginLimiter,
  generalLimiter,
  uploadLimiter,
  apiLimiter
};

