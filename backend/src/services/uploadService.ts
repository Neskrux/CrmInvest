import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Configurar Supabase Storage
const STORAGE_BUCKET = 'contratos';

export interface UploadResult {
  success: boolean;
  fileName?: string;
  url?: string;
  error?: string;
}

// Função para fazer upload para Supabase Storage com retry
export const uploadToSupabase = async (
  file: Express.Multer.File, 
  fileType: string = 'contrato', 
  retryCount: number = 0
): Promise<UploadResult> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 segundo
  
  try {
    // Debug: verificar configuração do Supabase
    console.log('🔍 Debug uploadToSupabase:', {
      hasSupabaseAdmin: !!supabaseAdmin,
      bucket: STORAGE_BUCKET,
      fileSize: file.size,
      fileType: fileType,
      originalName: file.originalname,
      mimeType: file.mimetype,
      supabaseUrl: supabaseUrl ? 'OK' : 'MISSING',
      supabaseKey: supabaseServiceKey ? 'OK' : 'MISSING'
    });

    // Gerar nome único para o arquivo baseado no tipo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    
    // Detectar extensão do arquivo original
    const originalExt = file.originalname ? file.originalname.split('.').pop()?.toLowerCase() : null;
    
    // Determinar extensão e contentType baseado no tipo de arquivo e mimetype
    let extension = 'pdf';
    let contentType = 'application/pdf';
    
    if (fileType === 'print_confirmacao') {
      // Para prints, usar a extensão original ou detectar pelo mimetype
      if (file.mimetype.startsWith('image/')) {
        const mimeToExt: { [key: string]: string } = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp'
        };
        extension = mimeToExt[file.mimetype] || originalExt || 'jpg';
        contentType = file.mimetype;
      } else if (file.mimetype === 'application/pdf') {
        extension = 'pdf';
        contentType = 'application/pdf';
      } else {
        // Fallback: tentar usar extensão original
        extension = originalExt || 'jpg';
        contentType = file.mimetype;
      }
    }
    
    const fileName = `${fileType}-${timestamp}-${randomId}.${extension}`;
    
    console.log('📤 Upload iniciado:', {
      fileName,
      contentType,
      size: file.size
    });
    
    // Fazer upload para o Supabase Storage usando cliente admin com timeout
    const uploadPromise = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    // Timeout de 60 segundos para uploads grandes
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - arquivo muito grande ou conexão lenta')), 60000);
    });

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) {
      console.error('❌ Erro no upload:', error);
      
      // Verificar se é um erro que pode ser tentado novamente
      if (isRetryableError(error) && retryCount < MAX_RETRIES) {
        console.log(`🔄 Tentativa ${retryCount + 1}/${MAX_RETRIES} falhou, tentando novamente em ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return uploadToSupabase(file, fileType, retryCount + 1);
      }
      
      throw error;
    }

    console.log('✅ Upload concluído com sucesso:', {
      fileName,
      path: data.path,
      size: file.size
    });

    // Construir URL pública do arquivo
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return {
      success: true,
      fileName: fileName,
      url: urlData.publicUrl
    };

  } catch (error) {
    console.error('❌ Erro fatal no upload:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no upload'
    };
  }
};

// Função para verificar se um erro é retryable
const isRetryableError = (error: any): boolean => {
  const retryableErrors = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'timeout',
    'network',
    'rate limit'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  return retryableErrors.some(retryableError => 
    errorMessage.includes(retryableError)
  );
};

// Função para remover arquivo do Supabase Storage
export const removeFromSupabase = async (fileName: string): Promise<boolean> => {
  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('❌ Erro ao remover arquivo:', error);
      return false;
    }

    console.log('✅ Arquivo removido com sucesso:', fileName);
    return true;
  } catch (error) {
    console.error('❌ Erro fatal ao remover arquivo:', error);
    return false;
  }
};

// Função para obter URL pública de um arquivo
export const getPublicUrl = (fileName: string): string => {
  const { data } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);
  
  return data.publicUrl;
};
