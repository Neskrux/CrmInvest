// Configuração da API
const apiConfig = {
  // URL base da API - usando variável de ambiente ou fallback seguro
  API_BASE_URL: process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://crminvest-backend.fly.dev/api'
      : 'http://localhost:5000/api'),
  
  // URL do backend para WebSocket
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://crminvest-backend.fly.dev'
      : 'http://localhost:5000'),
  
  // Configurações do Supabase (se necessário no frontend)
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,
};

export default apiConfig;

