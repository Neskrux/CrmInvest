// Configuração da API
const config = {
  // URL base da API - usando variável de ambiente ou fallback seguro
  API_BASE_URL: process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? '/api' 
      : 'http://localhost:5000/api'),
  
  // Configurações do Supabase (se necessário no frontend)
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,
  
  // Configurações de ambiente
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Configurações de upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['application/pdf'],
  
  // Configurações de autenticação
  TOKEN_EXPIRY: 8 * 60 * 60 * 1000, // 8 horas em millisegundos
};

// Log para debug
console.log('🔧 Config carregada:', {
  API_BASE_URL: config.API_BASE_URL,
  NODE_ENV: config.NODE_ENV,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL
});

export default config; 