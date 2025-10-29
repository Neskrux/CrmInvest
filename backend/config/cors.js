// Configuração CORS para produção e desenvolvimento
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://crm.investmoneysa.com.br',
      'https://www.crm.investmoneysa.com.br',
      'https://solumn.com.br',
      'https://www.solumn.com.br'
    ];
    
    // Permitir também qualquer URL do Vercel
    const isVercelApp = /\.vercel\.app$/.test(origin);
    
    if (allowedOrigins.includes(origin) || isVercelApp) {
      callback(null, true);
    } else {
      console.log('⚠️ [CORS] Origem bloqueada:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 horas
};

module.exports = corsOptions;

