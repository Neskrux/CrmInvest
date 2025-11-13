// Configurações gerais da aplicação
const appConfig = {
  // Configurações de ambiente
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Configurações de upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['application/pdf'],
  
  // Configurações de autenticação
  TOKEN_EXPIRY: 8 * 60 * 60 * 1000, // 8 horas em millisegundos
};

export default appConfig;

