import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { uploadToSupabase, removeFromSupabase, getPublicUrl } from '../services/uploadService';

// Controller para upload de arquivo único
export const uploadSingle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    const { fileType = 'documento' } = req.body;
    
    console.log('📤 Upload iniciado:', {
      fileName: req.file.originalname,
      fileType,
      size: req.file.size,
      mimetype: req.file.mimetype,
      user: req.user?.id
    });

    const result = await uploadToSupabase(req.file, fileType);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || 'Erro no upload'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: {
        fileName: result.fileName,
        url: result.url,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller para upload de múltiplos arquivos
export const uploadMultiple = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    const { fileType = 'documento' } = req.body;
    
    console.log('📤 Upload múltiplo iniciado:', {
      fileCount: files.length,
      fileType,
      user: req.user?.id
    });

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await uploadToSupabase(file, fileType);
        
        if (result.success) {
          results.push({
            fileName: result.fileName,
            url: result.url,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });
        } else {
          errors.push({
            originalName: file.originalname,
            error: result.error
          });
        }
      } catch (error) {
        errors.push({
          originalName: file.originalname,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    res.json({
      success: true,
      message: `${results.length} arquivo(s) enviado(s) com sucesso`,
      data: {
        uploaded: results,
        errors: errors,
        total: files.length,
        successCount: results.length,
        errorCount: errors.length
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload múltiplo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller para remover arquivo
export const removeFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileName } = req.params;

    if (!fileName) {
      res.status(400).json({
        success: false,
        error: 'Nome do arquivo é obrigatório'
      });
      return;
    }

    const success = await removeFromSupabase(fileName);

    if (!success) {
      res.status(500).json({
        success: false,
        error: 'Erro ao remover arquivo'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Arquivo removido com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao remover arquivo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Controller para obter URL pública de arquivo
export const getFileUrl = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileName } = req.params;

    if (!fileName) {
      res.status(400).json({
        success: false,
        error: 'Nome do arquivo é obrigatório'
      });
      return;
    }

    const url = getPublicUrl(fileName);

    res.json({
      success: true,
      data: {
        fileName,
        url
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter URL do arquivo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
