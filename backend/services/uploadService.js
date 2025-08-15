const { supabaseAdmin, STORAGE_BUCKET } = require('../config/database');

const uploadToSupabase = async (file, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  
  try {
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const fileName = `contrato-${timestamp}-${randomId}.pdf`;
    
    const uploadPromise = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - arquivo muito grande ou conexão lenta')), 60000);
    });

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) throw error;
    
    return {
      fileName: fileName,
      originalName: file.originalname,
      size: file.size,
      path: data.path
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return uploadToSupabase(file, retryCount + 1);
    }
    
    throw error;
  }
};

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

module.exports = {
  uploadToSupabase
};
