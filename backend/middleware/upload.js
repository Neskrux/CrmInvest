const { supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_CONTRATOS, STORAGE_BUCKET_DOCUMENTOS, STORAGE_BUCKET_MATERIAIS, MAX_RETRIES, RETRY_DELAY } = require('../config/constants');

// Função para verificar se o erro permite retry
const isRetryableError = (error) => {
  const retryableMessages = [
    'fetch failed',
    'other side closed',
    'timeout',
    'network',
    'socket',
    'ECONNRESET',
    'ETIMEDOUT'
  ];
  
  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some(msg => errorMessage.includes(msg));
};

// Função para fazer upload para Supabase Storage com retry
const uploadToSupabase = async (file, bucketName, folderPath, fileType = 'document', retryCount = 0) => {
  try {
    // Gerar nome único para o arquivo baseado no tipo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    
    // Detectar extensão do arquivo original
    const originalExt = file.originalname ? file.originalname.split('.').pop().toLowerCase() : null;
    
    // Determinar extensão e contentType
    let extension = originalExt || 'bin';
    let contentType = file.mimetype;
    
    const fileName = `${fileType}-${timestamp}-${randomId}.${extension}`;
    const fullPath = `${folderPath}/${fileName}`;
    
    console.log('📤 Upload iniciado:', {
      fileName,
      fullPath,
      bucketName,
      contentType,
      size: file.size
    });
    
    // Fazer upload para o Supabase Storage usando cliente admin com timeout
    const uploadPromise = supabaseAdmin.storage
      .from(bucketName)
      .upload(fullPath, file.buffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    // Timeout de 60 segundos para uploads grandes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - arquivo muito grande ou conexão lenta')), 60000);
    });

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) throw error;
    
    // Retornar informações do arquivo
    return {
      fileName: fileName,
      originalName: file.originalname,
      size: file.size,
      path: data.path
    };
  } catch (error) {
    console.error(`❌ Erro no upload para Supabase (tentativa ${retryCount + 1}):`, error.message);
    
    // Se não atingiu o máximo de tentativas e é um erro de conexão, tenta novamente
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return uploadToSupabase(file, bucketName, folderPath, fileType, retryCount + 1);
    }
    
    throw error;
  }
};

module.exports = {
  uploadToSupabase,
  isRetryableError,
  STORAGE_BUCKET_CONTRATOS,
  STORAGE_BUCKET_DOCUMENTOS,
  STORAGE_BUCKET_MATERIAIS
};

