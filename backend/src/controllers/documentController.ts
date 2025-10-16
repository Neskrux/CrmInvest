import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getSocketService } from '../services/socketService';
import { formatarRespostaAPI, formatarErroAPI } from '../utils';

// Configuração do Supabase
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY']!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const STORAGE_BUCKET = 'documentos';

// Mapeamento de tipos de documento para campos do banco
const DOC_FIELD_MAP: Record<string, string> = {
  'cnpj': 'doc_cnpj',
  'alvara': 'doc_alvara',
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

// Tipos de documento que suportam múltiplos arquivos
const MULTIPLE_DOC_TYPES = ['socios', 'comprovante_endereco_socios'];

// Tipos de documento que aceitam vídeos (mantido para futuras implementações)
// const VIDEO_DOC_TYPES = ['visita_online', 'video_validacao'];

interface UploadResult {
  fileName: string;
  publicUrl: string;
  path: string;
}

interface DocumentInfo {
  fileName: string;
  publicUrl: string;
  originalName: string;
  uploadedAt: string;
}

/**
 * Upload de documento único para clínica
 */
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clinicaId, docType } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json(formatarErroAPI('Nenhum arquivo enviado', 400));
      return;
    }

    if (!clinicaId || !docType) {
      res.status(400).json(formatarErroAPI('ID da clínica e tipo de documento são obrigatórios', 400));
      return;
    }

    const docField = DOC_FIELD_MAP[docType];
    if (!docField) {
      res.status(400).json(formatarErroAPI('Tipo de documento inválido', 400));
      return;
    }

    // Verificar se a clínica existe
    const { data: clinica, error: clinicaError } = await supabaseAdmin
      .from('clinicas')
      .select('id, nome')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      res.status(404).json(formatarErroAPI('Clínica não encontrada', 404));
      return;
    }

    // Fazer upload para Supabase Storage
    const uploadResult = await uploadToSupabaseStorage(file, clinicaId, docType);

    // Atualizar banco de dados
    const docUrlField = `${docField}_url`;
    const updateData: Record<string, any> = {
      [docField]: 1,
      [docUrlField]: uploadResult.publicUrl
    };

    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);

    if (updateError) {
      console.error('❌ Erro ao atualizar banco:', updateError);
      res.status(500).json(formatarErroAPI('Erro ao salvar informações do documento', 500));
      return;
    }

    // Enviar notificação via Socket.IO
    try {
      const socketService = getSocketService();
      socketService.sendToAdmins({
        type: 'system',
        title: '📄 Novo Documento Enviado',
        message: `Documento ${docType} enviado para clínica ${clinica.nome}`,
        data: {
          clinicaId,
          clinicaNome: clinica.nome,
          docType,
          fileName: uploadResult.fileName
        }
      });
    } catch (socketError) {
      console.error('❌ Erro ao enviar notificação Socket.IO:', socketError);
    }

    res.json(formatarRespostaAPI({
      filename: uploadResult.fileName,
      publicUrl: uploadResult.publicUrl,
      docType,
      clinicaId,
      clinicaNome: clinica.nome
    }, 'Documento enviado com sucesso'));

  } catch (error: any) {
    console.error('❌ Erro no upload de documento:', error);
    res.status(500).json(formatarErroAPI('Erro ao fazer upload do documento', 500));
  }
};

/**
 * Upload múltiplo de documentos para clínica
 */
export const uploadMultipleDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clinicaId, docType } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json(formatarErroAPI('Nenhum arquivo enviado', 400));
      return;
    }

    if (!clinicaId || !docType) {
      res.status(400).json(formatarErroAPI('ID da clínica e tipo de documento são obrigatórios', 400));
      return;
    }

    if (!MULTIPLE_DOC_TYPES.includes(docType)) {
      res.status(400).json(formatarErroAPI('Tipo de documento não suporta múltiplos arquivos', 400));
      return;
    }

    const docField = DOC_FIELD_MAP[docType];
    if (!docField) {
      res.status(400).json(formatarErroAPI('Tipo de documento inválido', 400));
      return;
    }

    // Verificar se a clínica existe
    const { data: clinica, error: clinicaError } = await supabaseAdmin
      .from('clinicas')
      .select('id, nome')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      res.status(404).json(formatarErroAPI('Clínica não encontrada', 404));
      return;
    }

    // Fazer upload de todos os arquivos
    const uploadResults: DocumentInfo[] = [];
    for (const file of files) {
      const result = await uploadToSupabaseStorage(file, clinicaId, docType);
      uploadResults.push({
        fileName: result.fileName,
        publicUrl: result.publicUrl,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
      });
    }

    // Buscar documentos existentes
    const docUrlField = `${docField}_url`;
    const { data: clinicaData } = await supabaseAdmin
      .from('clinicas')
      .select(docUrlField)
      .eq('id', clinicaId)
      .single();

    let existingDocs: DocumentInfo[] = [];
    if (clinicaData && (clinicaData as any)[docUrlField]) {
      try {
        const parsed = JSON.parse((clinicaData as any)[docUrlField]);
        existingDocs = Array.isArray(parsed) ? parsed : [{ 
          publicUrl: (clinicaData as any)[docUrlField],
          fileName: '',
          originalName: '',
          uploadedAt: new Date().toISOString()
        }];
      } catch {
        existingDocs = [{ 
          publicUrl: (clinicaData as any)[docUrlField],
          fileName: '',
          originalName: '',
          uploadedAt: new Date().toISOString()
        }];
      }
    }

    // Combinar documentos existentes com novos
    const allDocs = [...existingDocs, ...uploadResults];

    // Atualizar banco de dados
    const updateData: Record<string, any> = {
      [docField]: allDocs.length,
      [docUrlField]: JSON.stringify(allDocs)
    };

    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);

    if (updateError) {
      console.error('❌ Erro ao atualizar banco:', updateError);
      res.status(500).json(formatarErroAPI('Erro ao salvar informações dos documentos', 500));
      return;
    }

    // Enviar notificação via Socket.IO
    try {
      const socketService = getSocketService();
      socketService.sendToAdmins({
        type: 'system',
        title: '📄 Múltiplos Documentos Enviados',
        message: `${uploadResults.length} documentos ${docType} enviados para clínica ${clinica.nome}`,
        data: {
          clinicaId,
          clinicaNome: clinica.nome,
          docType,
          quantidade: uploadResults.length,
          files: uploadResults.map(r => r.fileName)
        }
      });
    } catch (socketError) {
      console.error('❌ Erro ao enviar notificação Socket.IO:', socketError);
    }

    res.json(formatarRespostaAPI({
      uploadedFiles: uploadResults,
      totalDocuments: allDocs.length,
      docType,
      clinicaId,
      clinicaNome: clinica.nome
    }, `${uploadResults.length} documentos enviados com sucesso`));

  } catch (error: any) {
    console.error('❌ Erro no upload múltiplo:', error);
    res.status(500).json(formatarErroAPI('Erro ao fazer upload dos documentos', 500));
  }
};

/**
 * Deletar documento específico do array
 */
export const deleteDocumentFromArray = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clinicaId, docType, fileIndex } = req.params;
    
    if (!fileIndex) {
      res.status(400).json(formatarErroAPI('Índice do arquivo é obrigatório', 400));
      return;
    }
    
    const index = parseInt(fileIndex);

    if (isNaN(index) || index < 0) {
      res.status(400).json(formatarErroAPI('Índice inválido', 400));
      return;
    }

    if (!docType) {
      res.status(400).json(formatarErroAPI('Tipo de documento é obrigatório', 400));
      return;
    }

    if (!MULTIPLE_DOC_TYPES.includes(docType)) {
      res.status(400).json(formatarErroAPI('Tipo de documento não suporta múltiplos arquivos', 400));
      return;
    }

    const docField = DOC_FIELD_MAP[docType as keyof typeof DOC_FIELD_MAP];
    if (!docField) {
      res.status(400).json(formatarErroAPI('Tipo de documento inválido', 400));
      return;
    }

    // Buscar documentos existentes
    const docUrlField = `${docField}_url`;
    const { data: clinicaData, error: fetchError } = await supabaseAdmin
      .from('clinicas')
      .select(`${docUrlField}, nome`)
      .eq('id', clinicaId)
      .single();

    if (fetchError || !clinicaData || !(clinicaData as any)[docUrlField]) {
      res.status(404).json(formatarErroAPI('Documentos não encontrados', 404));
      return;
    }

    let docs: DocumentInfo[] = [];
    try {
      const parsed = JSON.parse((clinicaData as any)[docUrlField]);
      docs = Array.isArray(parsed) ? parsed : [];
    } catch {
      res.status(400).json(formatarErroAPI('Erro ao processar documentos', 400));
      return;
    }

    if (index >= docs.length) {
      res.status(400).json(formatarErroAPI('Índice inválido', 400));
      return;
    }

    const docToDelete = docs[index];
    if (!docToDelete) {
      res.status(404).json(formatarErroAPI('Documento não encontrado', 404));
      return;
    }

    // Deletar arquivo do Supabase Storage
    if (docToDelete.publicUrl) {
      try {
        const fileName = docToDelete.fileName || docToDelete.publicUrl.split('/').pop();
        if (fileName) {
          await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .remove([`clinicas/${clinicaId}/${fileName}`]);
        }
      } catch (storageError) {
        console.error('❌ Erro ao deletar arquivo do storage:', storageError);
        // Continuar mesmo se não conseguir deletar do storage
      }
    }

    // Remover documento do array
    docs.splice(index, 1);

    // Atualizar banco de dados
    const updateData: Record<string, any> = {
      [docField]: docs.length,
      [docUrlField]: docs.length > 0 ? JSON.stringify(docs) : null
    };

    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);

    if (updateError) {
      console.error('❌ Erro ao atualizar banco:', updateError);
      res.status(500).json(formatarErroAPI('Erro ao atualizar documentos', 500));
      return;
    }

    res.json(formatarRespostaAPI({
      deletedIndex: index,
      remainingDocuments: docs.length,
      docType,
      clinicaId
    }, 'Documento removido com sucesso'));

  } catch (error: any) {
    console.error('❌ Erro ao deletar documento:', error);
    res.status(500).json(formatarErroAPI('Erro ao deletar documento', 500));
  }
};

/**
 * Listar documentos de uma clínica
 */
export const listClinicDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clinicaId } = req.params;

    if (!clinicaId) {
      res.status(400).json(formatarErroAPI('ID da clínica é obrigatório', 400));
      return;
    }

    // Buscar dados da clínica
    const { data: clinica, error: clinicaError } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      res.status(404).json(formatarErroAPI('Clínica não encontrada', 404));
      return;
    }

    // Extrair informações de documentos
    const documents: Record<string, any> = {};
    
    for (const [docType, docField] of Object.entries(DOC_FIELD_MAP)) {
      const docUrlField = `${docField}_url`;
      const docValue = clinica[docField];
      const docUrl = clinica[docUrlField];

      if (docValue && docUrl) {
        if (MULTIPLE_DOC_TYPES.includes(docType)) {
          try {
            const parsed = JSON.parse(docUrl);
            documents[docType] = {
              type: 'multiple',
              count: Array.isArray(parsed) ? parsed.length : 1,
              documents: Array.isArray(parsed) ? parsed : [{ publicUrl: docUrl }]
            };
          } catch {
            documents[docType] = {
              type: 'multiple',
              count: 1,
              documents: [{ publicUrl: docUrl }]
            };
          }
        } else {
          documents[docType] = {
            type: 'single',
            url: docUrl,
            uploaded: true
          };
        }
      } else {
        documents[docType] = {
          type: MULTIPLE_DOC_TYPES.includes(docType) ? 'multiple' : 'single',
          uploaded: false
        };
      }
    }

    res.json(formatarRespostaAPI({
      clinicaId,
      clinicaNome: clinica.nome,
      documents
    }, 'Documentos listados com sucesso'));

  } catch (error: any) {
    console.error('❌ Erro ao listar documentos:', error);
    res.status(500).json(formatarErroAPI('Erro ao listar documentos', 500));
  }
};

/**
 * Função auxiliar para upload para Supabase Storage
 */
const uploadToSupabaseStorage = async (file: Express.Multer.File, clinicaId: string, docType: string): Promise<UploadResult> => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop() || '';
    const fileName = `clinicas/${clinicaId}/${docType}_${timestamp}_${randomId}.${ext}`;
    
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
