const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurar Supabase Storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios para upload de documentos');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const STORAGE_BUCKET = 'documentos';

// Configurar multer para upload em memória (para enviar ao Supabase)
const storage = multer.memoryStorage();

// Filtro para aceitar PDFs, imagens e vídeos
const fileFilter = (req, file, cb) => {
  const { docType } = req.params;
  
  // Se for visita online ou vídeo de validação, aceitar apenas vídeos
  if (docType === 'visita_online' || docType === 'video_validacao') {
    const videoTypes = /mp4|avi|mov|wmv|webm|mkv/;
    const extname = videoTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Para este tipo de documento, apenas arquivos de vídeo são permitidos (MP4, AVI, MOV, WMV, WEBM, MKV)'));
    }
  } else {
    // Para outros documentos, manter as regras antigas
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF, DOC, DOCX, JPG, JPEG e PNG são permitidos'));
    }
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (para suportar vídeos)
  fileFilter: fileFilter
});

// Função para fazer upload para Supabase Storage
const uploadToSupabaseStorage = async (file, clinicaId, docType) => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const fileName = `clinicas/${clinicaId}/${docType}_${timestamp}_${randomId}${ext}`;
    
    console.log(`📤 Fazendo upload para Supabase Storage: ${fileName}`);
    
    // Fazer upload para Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
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
      .from(STORAGE_BUCKET)
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

// Upload múltiplo de documentos (para doc_socios)
router.post('/upload-multiple/:clinicaId/:docType', upload.array('documents', 10), async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    // Mapear o tipo de documento para o campo do banco
    const docFieldMap = {
      'socios': 'doc_socios',
      'comprovante_endereco_socios': 'doc_comprovante_endereco_socios'
    };
    
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido para upload múltiplo' });
    }
    
    // Fazer upload de todos os arquivos
    const uploadResults = [];
    for (const file of files) {
      const result = await uploadToSupabaseStorage(file, clinicaId, docType);
      uploadResults.push({
        fileName: result.fileName,
        publicUrl: result.publicUrl,
        originalName: file.originalname
      });
    }
    
    // Buscar documentos existentes
    const { data: clinicaData } = await supabaseAdmin
      .from('clinicas')
      .select(docUrlField)
      .eq('id', clinicaId)
      .single();
    
    let existingDocs = [];
    if (clinicaData && clinicaData[docUrlField]) {
      try {
        existingDocs = JSON.parse(clinicaData[docUrlField]);
        if (!Array.isArray(existingDocs)) {
          existingDocs = [{ publicUrl: clinicaData[docUrlField] }]; // Converter formato antigo
        }
      } catch {
        existingDocs = [{ publicUrl: clinicaData[docUrlField] }]; // Converter formato antigo
      }
    }
    
    // Adicionar novos documentos ao array
    const allDocs = [...existingDocs, ...uploadResults];
    
    // Atualizar banco de dados
    const updateData = {};
    updateData[docField] = 1;
    updateData[docUrlField] = JSON.stringify(allDocs);
    
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);
    
    if (updateError) {
      console.error('Erro ao atualizar banco:', updateError);
      return res.status(500).json({ error: 'Erro ao salvar informações dos documentos' });
    }
    
    res.json({
      success: true,
      message: `${files.length} documento(s) enviado(s) com sucesso`,
      filesCount: files.length,
      uploadResults: uploadResults
    });
    
  } catch (error) {
    console.error('Erro no upload múltiplo:', error);
    res.status(500).json({ error: 'Erro ao fazer upload dos documentos' });
  }
});

// Upload de documento específico (único arquivo)
router.post('/upload/:clinicaId/:docType', upload.single('document'), async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    // Mapear o tipo de documento para o campo do banco
    const docFieldMap = {
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
      // Novos documentos
      'comprovante_endereco_socios': 'doc_comprovante_endereco_socios',
      'carteirinha_cro': 'doc_carteirinha_cro',
      'video_validacao': 'video_validacao'
    };
    
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Fazer upload para Supabase Storage
    const uploadResult = await uploadToSupabaseStorage(file, clinicaId, docType);
    
    // Atualizar banco de dados com a URL do Supabase
    const updateData = {};
    updateData[docField] = 1;
    updateData[docUrlField] = uploadResult.publicUrl;
    
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);
    
    if (updateError) {
      console.error('Erro ao atualizar banco:', updateError);
      return res.status(500).json({ error: 'Erro ao salvar informações do documento' });
    }
    
    res.json({
      success: true,
      message: 'Documento enviado com sucesso',
      filename: uploadResult.fileName,
      publicUrl: uploadResult.publicUrl,
      docType: docType
    });
    
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
});

// Deletar um documento específico do array (para múltiplos documentos)
router.delete('/delete-from-array/:clinicaId/:docType/:fileIndex', async (req, res) => {
  try {
    const { clinicaId, docType, fileIndex } = req.params;
    const index = parseInt(fileIndex);
    
    const docFieldMap = {
      'socios': 'doc_socios',
      'comprovante_endereco_socios': 'doc_comprovante_endereco_socios'
    };
    
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Buscar documentos existentes
    const { data: clinicaData, error: fetchError } = await supabaseAdmin
      .from('clinicas')
      .select(docUrlField)
      .eq('id', clinicaId)
      .single();
    
    if (fetchError || !clinicaData || !clinicaData[docUrlField]) {
      return res.status(404).json({ error: 'Documentos não encontrados' });
    }
    
    let docs = [];
    try {
      docs = JSON.parse(clinicaData[docUrlField]);
      if (!Array.isArray(docs)) {
        return res.status(400).json({ error: 'Formato de documentos inválido' });
      }
    } catch {
      return res.status(400).json({ error: 'Erro ao processar documentos' });
    }
    
    if (index < 0 || index >= docs.length) {
      return res.status(400).json({ error: 'Índice inválido' });
    }
    
    const docToDelete = docs[index];
    
    // Deletar arquivo do Supabase Storage
    if (docToDelete.publicUrl) {
      try {
        const url = new URL(docToDelete.publicUrl);
        const filePath = url.pathname.split('/').slice(-3).join('/');
        
        console.log(`🗑️ Deletando arquivo do Supabase Storage: ${filePath}`);
        
        const { error: deleteError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);
        
        if (deleteError) {
          console.error('❌ Erro ao deletar do Supabase Storage:', deleteError);
        } else {
          console.log('✅ Arquivo deletado do Supabase Storage com sucesso');
        }
      } catch (storageError) {
        console.error('❌ Erro ao processar URL do Supabase:', storageError);
      }
    }
    
    // Remover documento do array
    docs.splice(index, 1);
    
    // Atualizar banco de dados
    const updateData = {};
    if (docs.length === 0) {
      updateData[docField] = 0;
      updateData[docUrlField] = null;
    } else {
      updateData[docField] = 1;
      updateData[docUrlField] = JSON.stringify(docs);
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);
    
    if (updateError) {
      return res.status(500).json({ error: 'Erro ao atualizar banco de dados' });
    }
    
    res.json({
      success: true,
      message: 'Documento deletado com sucesso',
      remainingDocs: docs.length
    });
    
  } catch (error) {
    console.error('Erro ao deletar documento do array:', error);
    res.status(500).json({ error: 'Erro ao deletar documento' });
  }
});

// Deletar todos os documentos
router.delete('/delete/:clinicaId/:docType', async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    
    // Mapear o tipo de documento para o campo do banco
    const docFieldMap = {
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
      // Novos documentos
      'comprovante_endereco_socios': 'doc_comprovante_endereco_socios',
      'carteirinha_cro': 'doc_carteirinha_cro',
      'video_validacao': 'video_validacao'
    };
    
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Buscar o arquivo atual
    const { data: clinicaData, error: fetchError } = await supabaseAdmin
      .from('clinicas')
      .select(docUrlField)
      .eq('id', clinicaId)
      .single();
    
    if (fetchError) {
      return res.status(500).json({ error: 'Erro ao buscar documento' });
    }
    
    if (clinicaData && clinicaData[docUrlField]) {
      try {
        // Extrair o caminho do arquivo da URL do Supabase
        const url = new URL(clinicaData[docUrlField]);
        const filePath = url.pathname.split('/').slice(-3).join('/'); // Pega os últimos 3 segmentos (clinicas/clinicaId/filename)
        
        console.log(`🗑️ Deletando arquivo do Supabase Storage: ${filePath}`);
        
        // Deletar arquivo do Supabase Storage
        const { error: deleteError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);
        
        if (deleteError) {
          console.error('❌ Erro ao deletar do Supabase Storage:', deleteError);
          // Continuar mesmo com erro no storage
        } else {
          console.log('✅ Arquivo deletado do Supabase Storage com sucesso');
        }
      } catch (storageError) {
        console.error('❌ Erro ao processar URL do Supabase:', storageError);
        // Continuar mesmo com erro no storage
      }
    }
    
    // Atualizar banco de dados
    const updateData = {};
    updateData[docField] = 0;
    updateData[docUrlField] = null;
    
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);
    
    if (updateError) {
      console.error('Erro ao atualizar banco:', updateError);
      return res.status(500).json({ error: 'Erro ao deletar documento' });
    }
    
    res.json({
      success: true,
      message: 'Documento deletado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({ error: 'Erro ao deletar documento' });
  }
});

// Baixar documento
router.get('/download/:clinicaId/:docType', async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    
    // Mapear o tipo de documento para o campo do banco
    const docFieldMap = {
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
      // Novos documentos
      'comprovante_endereco_socios': 'doc_comprovante_endereco_socios',
      'carteirinha_cro': 'doc_carteirinha_cro',
      'video_validacao': 'video_validacao'
    };
    
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Buscar o arquivo
    const { data: clinicaData, error: fetchError } = await supabaseAdmin
      .from('clinicas')
      .select(docUrlField)
      .eq('id', clinicaId)
      .single();
    
    if (fetchError) {
      return res.status(500).json({ error: 'Erro ao buscar documento' });
    }
    
    if (!clinicaData || !clinicaData[docUrlField]) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    // Redirecionar para a URL pública do Supabase Storage
    res.redirect(clinicaData[docUrlField]);
    
  } catch (error) {
    console.error('Erro ao baixar:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
});

module.exports = router;