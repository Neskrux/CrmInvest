const { supabaseAdmin } = require('../config/database');
const sharp = require('sharp');

const BUCKET = 'galeria-empreendimentos';
const THUMB_WIDTH = 960;
const THUMB_QUALITY = 80;

/**
 * Gera thumbnail WebP de uma imagem
 * @param {Buffer} imageBuffer - Buffer da imagem original
 * @returns {Promise<Buffer>} Buffer da thumbnail em WebP
 */
async function generateThumbnail(imageBuffer) {
  try {
    const thumbnail = await sharp(imageBuffer)
      .rotate() // Auto-rotaciona baseado em EXIF
      .resize({ 
        width: THUMB_WIDTH, 
        withoutEnlargement: true // Não aumenta imagens menores
      })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();
    
    return thumbnail;
  } catch (error) {
    console.error('Erro ao gerar thumbnail:', error);
    throw error;
  }
}

/**
 * Faz upload de imagem para galeria de empreendimentos com geração automática de thumbnail
 * @param {Object} file - Arquivo do multer (req.file)
 * @param {number} empreendimentoId - ID do empreendimento
 * @param {string} categoria - Categoria da imagem (apartamento, areas-de-lazer, plantas-humanizadas, videos, tour-virtual)
 * @returns {Promise<Object>} Objeto com paths da imagem original e thumbnail
 */
async function uploadGaleriaImagem(file, empreendimentoId, categoria) {
  try {
    // Validar se é imagem
    const isImage = /\.(png|jpg|jpeg|webp|avif|gif)$/i.test(file.originalname || '');
    
    if (!isImage) {
      throw new Error('Apenas imagens são suportadas para galeria');
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const originalExt = file.originalname.split('.').pop().toLowerCase();
    const fileName = `${timestamp}-${randomId}.${originalExt}`;
    
    // Path da imagem original: {empreendimentoId}/{categoria}/{fileName}
    const originalPath = `${empreendimentoId}/${categoria}/${fileName}`;
    
    console.log('📤 Upload de galeria iniciado:', {
      empreendimentoId,
      categoria,
      fileName,
      originalPath,
      size: file.size
    });

    // 1. Upload da imagem original
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(originalPath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '31536000, immutable', // Cache de 1 ano
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
    }

    console.log('✅ Imagem original uploadada:', originalPath);

    // 2. Gerar e fazer upload da thumbnail (apenas para imagens)
    let thumbnailPath = null;
    try {
      const thumbnailBuffer = await generateThumbnail(file.buffer);
      
      // Path da thumbnail: .thumbs/960w/{empreendimentoId}/{categoria}/{fileName sem ext}.webp
      const fileNameWithoutExt = fileName.replace(/\.[^.]+$/, '');
      thumbnailPath = `.thumbs/960w/${empreendimentoId}/${categoria}/${fileNameWithoutExt}.webp`;
      
      const { data: thumbData, error: thumbError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(thumbnailPath, thumbnailBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000, immutable', // Cache de 1 ano
          upsert: true // Permite sobrescrever se já existir
        });

      if (thumbError) {
        console.warn('⚠️ Erro ao fazer upload da thumbnail (continuando):', thumbError.message);
        // Não falha o upload se a thumbnail der erro
      } else {
        console.log('✅ Thumbnail gerada e uploadada:', thumbnailPath);
      }
    } catch (thumbErr) {
      console.warn('⚠️ Erro ao gerar thumbnail (continuando):', thumbErr.message);
      // Não falha o upload se a thumbnail der erro
    }

    // 3. Gerar URLs públicas
    const { data: { publicUrl: originalUrl } } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(originalPath);

    const { data: { publicUrl: thumbnailUrl } } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(thumbnailPath || originalPath); // Fallback para original se não tiver thumb

    return {
      success: true,
      original: {
        path: originalPath,
        url: originalUrl,
        fileName: fileName,
        size: file.size
      },
      thumbnail: thumbnailPath ? {
        path: thumbnailPath,
        url: thumbnailUrl
      } : null
    };

  } catch (error) {
    console.error('❌ Erro no upload de galeria:', error);
    throw error;
  }
}

/**
 * Remove imagem da galeria (original + thumbnail)
 * @param {string} originalPath - Path da imagem original
 * @returns {Promise<Object>} Resultado da remoção
 */
async function removeGaleriaImagem(originalPath) {
  try {
    // Remover imagem original
    const { error: originalError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([originalPath]);

    if (originalError) {
      console.warn('Erro ao remover imagem original:', originalError);
    }

    // Gerar path da thumbnail
    const thumbPath = originalPath.replace(/^(.+)\/([^/]+)\.([^.]+)$/, '.thumbs/960w/$1/$2.webp');
    
    // Remover thumbnail
    const { error: thumbError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([thumbPath]);

    if (thumbError) {
      console.warn('Erro ao remover thumbnail:', thumbError);
    }

    return {
      success: true,
      removed: {
        original: !originalError,
        thumbnail: !thumbError
      }
    };
  } catch (error) {
    console.error('Erro ao remover imagem da galeria:', error);
    throw error;
  }
}

module.exports = {
  uploadGaleriaImagem,
  removeGaleriaImagem,
  generateThumbnail
};

