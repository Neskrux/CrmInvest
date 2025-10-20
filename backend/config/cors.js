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

module.exports = corsOptions;

