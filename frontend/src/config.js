const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://crm-invest.vercel.app/api'
      : 'http://localhost:5000/api'),
  
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,
  
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_FILE_TYPES: ['application/pdf'],
  
  TOKEN_EXPIRY: 8 * 60 * 60 * 1000,
};

export default config; 