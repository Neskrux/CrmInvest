const { supabaseAdmin } = require('../config/database');
const documentsService = require('../services/documents.service');

// Upload múltiplo de documentos (para doc_socios)
const uploadMultiple = async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const docFieldMap = documentsService.getDocFieldMap('clinicas');
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido para upload múltiplo' });
    }
    
    // Fazer upload de todos os arquivos
    const uploadResults = [];
    for (const file of files) {
      const result = await documentsService.uploadToSupabaseStorage(file, clinicaId, docType, 'clinicas');
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
          existingDocs = [{ publicUrl: clinicaData[docUrlField] }];
        }
      } catch {
        existingDocs = [{ publicUrl: clinicaData[docUrlField] }];
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
};

// Upload de documento específico de clínica (único arquivo)
const uploadClinica = async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const docFieldMap = documentsService.getDocFieldMap('clinicas');
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Fazer upload para Supabase Storage
    const uploadResult = await documentsService.uploadToSupabaseStorage(file, clinicaId, docType, 'clinicas');
    
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
};

// Deletar um documento específico do array (para múltiplos documentos)
const deleteFromArray = async (req, res) => {
  try {
    const { clinicaId, docType, fileIndex } = req.params;
    const index = parseInt(fileIndex);
    
    const docFieldMap = documentsService.getDocFieldMap('clinicas');
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
      await documentsService.deleteFromSupabaseStorage(docToDelete.publicUrl);
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
};

// Deletar todos os documentos
const deleteDocument = async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    
    const docFieldMap = documentsService.getDocFieldMap('clinicas');
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
      await documentsService.deleteFromSupabaseStorage(clinicaData[docUrlField]);
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
};

// Upload de documento de paciente
const uploadPaciente = async (req, res) => {
  try {
    const { pacienteId, docType } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const docFieldMap = documentsService.getDocFieldMap('pacientes');
    const docField = docFieldMap[docType];
    const docUrlField = `${docField}_url`;
    
    if (!docField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Fazer upload para Supabase Storage
    const uploadResult = await documentsService.uploadToSupabaseStorage(file, pacienteId, docType, 'pacientes');
    
    // Atualizar banco de dados com a URL do Supabase
    const updateData = {};
    updateData[docUrlField] = uploadResult.publicUrl;
    
    // Resetar aprovação ao enviar novo documento
    const aprovadoField = `${docField}_aprovado`;
    updateData[aprovadoField] = null;
    
    const { error: updateError } = await supabaseAdmin
      .from('pacientes')
      .update(updateData)
      .eq('id', pacienteId);
    
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
    console.error('Erro no upload de documento de paciente:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do documento' });
  }
};

// Aprovar documento de paciente
const approvePaciente = async (req, res) => {
  try {
    const { pacienteId, docType } = req.params;
    
    const docFieldMap = documentsService.getDocFieldMap('pacientes');
    const aprovadoField = `${docFieldMap[docType]}_aprovado`;
    
    if (!aprovadoField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    const updateData = {};
    updateData[aprovadoField] = true;
    
    const { error: updateError } = await supabaseAdmin
      .from('pacientes')
      .update(updateData)
      .eq('id', pacienteId);
    
    if (updateError) {
      console.error('Erro ao aprovar documento:', updateError);
      return res.status(500).json({ error: 'Erro ao aprovar documento' });
    }
    
    res.json({
      success: true,
      message: 'Documento aprovado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao aprovar documento:', error);
    res.status(500).json({ error: 'Erro ao aprovar documento' });
  }
};

// Reprovar documento de paciente
const rejectPaciente = async (req, res) => {
  try {
    const { pacienteId, docType } = req.params;
    
    const docFieldMap = documentsService.getDocFieldMap('pacientes');
    const aprovadoField = `${docFieldMap[docType]}_aprovado`;
    
    if (!aprovadoField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    const updateData = {};
    updateData[aprovadoField] = false;
    
    const { error: updateError } = await supabaseAdmin
      .from('pacientes')
      .update(updateData)
      .eq('id', pacienteId);
    
    if (updateError) {
      console.error('Erro ao reprovar documento:', updateError);
      return res.status(500).json({ error: 'Erro ao reprovar documento' });
    }
    
    res.json({
      success: true,
      message: 'Documento reprovado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao reprovar documento:', error);
    res.status(500).json({ error: 'Erro ao reprovar documento' });
  }
};

// Baixar documento
const downloadDocument = async (req, res) => {
  try {
    const { clinicaId, docType } = req.params;
    
    const docFieldMap = documentsService.getDocFieldMap('clinicas');
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
};

module.exports = {
  uploadMultiple,
  uploadClinica,
  deleteFromArray,
  deleteDocument,
  uploadPaciente,
  approvePaciente,
  rejectPaciente,
  downloadDocument
};

