const { supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_DOCUMENTOS } = require('../config/constants');
const path = require('path');

// Função para fazer upload para Supabase Storage
const uploadToSupabaseStorage = async (file, entityId, docType, entityType = 'clinicas') => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const fileName = `${entityType}/${entityId}/${docType}_${timestamp}_${randomId}${ext}`;
    
    console.log(`📤 Fazendo upload para Supabase Storage: ${fileName}`);
    
    // Fazer upload para Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_DOCUMENTOS)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });
    
    if (error) {
      console.error('❌ Erro no upload para Supabase:', error);
      throw error;
    }
    
    console.log('✅ Upload realizado com sucesso:', data);
    
    // Obter URL pública do arquivo
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET_DOCUMENTOS)
      .getPublicUrl(fileName);
    
    return {
      fileName: fileName,
      publicUrl: urlData.publicUrl,
      path: data.path
    };
    
  } catch (error) {
    console.error('❌ Erro na função uploadToSupabaseStorage:', error);
    throw error;
  }
};

// Deletar arquivo do Supabase Storage
const deleteFromSupabaseStorage = async (publicUrl) => {
  try {
    if (!publicUrl) return { success: false, error: 'URL não fornecida' };
    
    // Extrair o caminho do arquivo da URL do Supabase
    const url = new URL(publicUrl);
    const filePath = url.pathname.split('/').slice(-3).join('/'); // Pega os últimos 3 segmentos
    
    console.log(`🗑️ Deletando arquivo do Supabase Storage: ${filePath}`);
    
    // Deletar arquivo do Supabase Storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_DOCUMENTOS)
      .remove([filePath]);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar do Supabase Storage:', deleteError);
      return { success: false, error: deleteError.message };
    }
    
    console.log('✅ Arquivo deletado do Supabase Storage com sucesso');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao processar URL do Supabase:', error);
    return { success: false, error: error.message };
  }
};

// Mapear tipo de documento para campo do banco (clínicas)
const getDocFieldMap = (entityType = 'clinicas') => {
  if (entityType === 'clinicas') {
    return {
      'cartao_cnpj': 'doc_cartao_cnpj',
      'contrato_social': 'doc_contrato_social',
      'alvara_sanitario': 'doc_alvara_sanitario',
      'balanco': 'doc_balanco',
      'comprovante_endereco': 'doc_comprovante_endereco',
      'dados_bancarios': 'doc_dados_bancarios',
      'socios': 'doc_socios',
      'certidao_resp_tecnico': 'doc_certidao_resp_tecnico',
      'resp_tecnico': 'doc_resp_tecnico',
      'certidao_casamento': 'doc_certidao_casamento',
      'visita_online': 'visita_online',
      'comprovante_endereco_socios': 'doc_comprovante_endereco_socios',
      'carteirinha_cro': 'doc_carteirinha_cro',
      'video_validacao': 'video_validacao'
    };
  } else if (entityType === 'pacientes') {
    return {
      'selfie_doc': 'selfie_doc',
      'documento': 'documento',
      'comprovante_residencia': 'comprovante_residencia',
      'contrato_servico': 'contrato_servico',
      'confirmacao_sacado': 'confirmacao_sacado'
    };
  }
  
  return {};
};

module.exports = {
  uploadToSupabaseStorage,
  deleteFromSupabaseStorage,
  getDocFieldMap
};

