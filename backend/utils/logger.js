/**
 * Logger seguro para produção
 * Remove informações sensíveis dos logs
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Campos sensíveis que devem ser mascarados
const SENSITIVE_FIELDS = [
  'senha',
  'password',
  'token',
  'authorization',
  'auth',
  'secret',
  'key',
  'api_key',
  'access_token',
  'refresh_token'
];

// Função para mascarar dados sensíveis
const maskSensitiveData = (data) => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return '***';
  }
  
  if (typeof data === 'object') {
    const masked = { ...data };
    
    for (const key in masked) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        masked[key] = '***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskSensitiveData(masked[key]);
      }
    }
    
    return masked;
  }
  
  return data;
};

// Função para log seguro
const safeLog = (level, message, data = null) => {
  // Em produção, não logar dados sensíveis
  if (!isDevelopment && data) {
    data = maskSensitiveData(data);
  }
  
  const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  
  switch (level) {
    case 'info':
      console.log(`ℹ️  ${logMessage}`);
      break;
    case 'warn':
      console.warn(`⚠️  ${logMessage}`);
      break;
    case 'error':
      console.error(`❌ ${logMessage}`);
      break;
    case 'success':
      console.log(`✅ ${logMessage}`);
      break;
    case 'debug':
      if (isDevelopment) {
        console.log(`🔍 ${logMessage}`);
      }
      break;
    default:
      console.log(logMessage);
  }
};

// Helper para log de login (sem dados sensíveis)
const logLoginAttempt = (email, success) => {
  if (isDevelopment) {
    console.log(`🔐 Tentativa de login: ${email} - ${success ? 'SUCESSO' : 'FALHA'}`);
  } else {
    console.log(`🔐 Tentativa de login: ${success ? 'SUCESSO' : 'FALHA'}`);
  }
};

// Helper para log de erro
const logError = (error, context = '') => {
  const errorMessage = context ? `${context}: ${error.message}` : error.message;
  
  if (isDevelopment) {
    console.error(`❌ ${errorMessage}`, error.stack);
  } else {
    console.error(`❌ ${errorMessage}`);
  }
};

// Helper para log de request (sem dados sensíveis)
const logRequest = (method, path, statusCode, duration) => {
  const emoji = statusCode >= 400 ? '❌' : '✅';
  console.log(`${emoji} ${method} ${path} - ${statusCode} (${duration}ms)`);
};

module.exports = {
  safeLog,
  logLoginAttempt,
  logError,
  logRequest,
  isDevelopment
};

