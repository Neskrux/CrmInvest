require('dotenv').config();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Verificar se o JWT_SECRET está configurado
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não configurado!');
  console.error('Configure JWT_SECRET no arquivo .env');
  process.exit(1);
}

// Configurar Supabase Storage Buckets
const STORAGE_BUCKET_CONTRATOS = 'contratos';
const STORAGE_BUCKET_DOCUMENTOS = 'documentos';
const STORAGE_BUCKET_MATERIAIS = 'materiais-apoio';

// Constantes de retry
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// Status que requerem evidências
const STATUS_COM_EVIDENCIA = {
  pacientes: ['agendado', 'compareceu', 'nao_compareceu', 'fechado'],
  clinicas: ['em_visita', 'aprovada', 'reprovada']
};

module.exports = {
  JWT_SECRET,
  STORAGE_BUCKET_CONTRATOS,
  STORAGE_BUCKET_DOCUMENTOS,
  STORAGE_BUCKET_MATERIAIS,
  MAX_RETRIES,
  RETRY_DELAY,
  STATUS_COM_EVIDENCIA
};

