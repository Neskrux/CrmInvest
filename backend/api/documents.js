const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
/*const Database = require('better-sqlite3');*/
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurar Supabase Storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios para upload de documentos');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const STORAGE_BUCKET = 'clinicas-documentos';

// Configurar o diretório de uploads (temporário)
const uploadsDir = path.join(__dirname, '..', 'uploads', 'clinicas');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para upload em memória (para enviar ao Supabase)
const storage = multer.memoryStorage();

// Filtro para aceitar PDFs, imagens e vídeos
const fileFilter = (req, file, cb) => {
  const { docType } = req.params;
  
  // Se for visita online, aceitar apenas vídeos
  if (docType === 'visita_online') {
    const videoTypes = /mp4|avi|mov|wmv|webm|mkv/;
    const extname = videoTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Para Visita Online, apenas arquivos de vídeo são permitidos (MP4, AVI, MOV, WMV, WEBM, MKV)'));
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (para suportar vídeos)
  fileFilter: fileFilter
});

// Função para fazer upload para Supabase Storage
const uploadToSupabaseStorage = async (file, clinicaId, docType) => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const fileName = `${clinicaId}/${docType}_${timestamp}_${randomId}${ext}`;
    
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

// Upload de documento específico
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
    const query = `UPDATE clinicas SET ${docField} = 1, ${docUrlField} = ? WHERE id = ?`;
    
    db.run(query, [uploadResult.publicUrl, clinicaId], function(err) {
      if (err) {
        console.error('Erro ao atualizar banco:', err);
        return res.status(500).json({ error: 'Erro ao salvar informações do documento' });
      }
      
      res.json({
        success: true,
        message: 'Documento enviado com sucesso',
        filename: uploadResult.fileName,
        publicUrl: uploadResult.publicUrl,
        docType: docType
      });
    });
    
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
});

// Deletar documento
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
    db.get(`SELECT ${docUrlField} as url FROM clinicas WHERE id = ?`, [clinicaId], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar documento' });
      }
      
      if (row && row.url) {
        try {
          // Extrair o caminho do arquivo da URL do Supabase
          const url = new URL(row.url);
          const filePath = url.pathname.split('/').slice(-2).join('/'); // Pega os últimos 2 segmentos (clinicaId/filename)
          
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
      const query = `UPDATE clinicas SET ${docField} = 0, ${docUrlField} = NULL WHERE id = ?`;
      
      db.run(query, [clinicaId], function(err) {
        if (err) {
          console.error('Erro ao atualizar banco:', err);
          return res.status(500).json({ error: 'Erro ao deletar documento' });
        }
        
        res.json({
          success: true,
          message: 'Documento deletado com sucesso'
        });
      });
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
    db.get(`SELECT ${docUrlField} as url FROM clinicas WHERE id = ?`, [clinicaId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar documento' });
      }
      
      if (!row || !row.url) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }
      
      // Redirecionar para a URL pública do Supabase Storage
      res.redirect(row.url);
    });
    
  } catch (error) {
    console.error('Erro ao baixar:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
});

module.exports = router;