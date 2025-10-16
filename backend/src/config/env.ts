// Configurar variáveis de ambiente
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Exportar configurações validadas
export const config = {
  // Supabase
  supabaseUrl: process.env['SUPABASE_URL'],
  supabaseServiceKey: process.env['SUPABASE_SERVICE_KEY'],
  
  // JWT
  jwtSecret: process.env['JWT_SECRET'],
  
  // Email
  emailHost: process.env['EMAIL_HOST'],
  emailPort: process.env['EMAIL_PORT'],
  emailUser: process.env['EMAIL_USER'],
  emailPass: process.env['EMAIL_PASS'],
  
  // Meta Ads
  metaAccessToken: process.env['META_ACCESS_TOKEN'],
  metaAppId: process.env['META_APP_ID'],
  metaAppSecret: process.env['META_APP_SECRET'],
  
  // IDSF
  idsfApiKey: process.env['IDSF_API_KEY'],
  
  // Servidor
  port: process.env['PORT'] || '5000',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  
  // CORS
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:3000'
};

// Validar configurações obrigatórias
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Variável de ambiente obrigatória não encontrada: ${varName}`);
  }
}
