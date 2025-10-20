const { supabaseAdmin } = require('../config/database');

// GET /api/pacientes-financeiro - Listar pacientes financeiros
const getAllPacientesFinanceiro = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Se for clínica, filtrar apenas pacientes da clínica
    if (req.user.tipo === 'clinica') {
      query = query.eq('clinica_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Erro ao buscar pacientes financeiros:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/pacientes-financeiro - Criar paciente financeiro
const createPacienteFinanceiro = async (req, res) => {
  try {
    const {
      cpf, nome, contato, valor_parcela, numero_parcelas, vencimento,
      valor_tratamento, antecipacao_meses, data_operacao, entregue,
      analise, responsavel, observacoes_financeiras, status
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .insert([{
        cpf, 
        nome, 
        telefone: contato,
        valor_parcela: valor_parcela ? parseFloat(valor_parcela.replace(/[^\d,-]/g, '').replace(',', '.')) : null,
        numero_parcelas: numero_parcelas ? parseInt(numero_parcelas) : null,
        vencimento,
        valor_tratamento: valor_tratamento ? parseFloat(valor_tratamento.replace(/[^\d,-]/g, '').replace(',', '.')) : null,
        antecipacao_meses: antecipacao_meses ? parseInt(antecipacao_meses) : null,
        data_operacao,
        entregue: entregue || false,
        analise,
        responsavel,
        observacoes_financeiras,
        status: status || 'novo',
        tipo_tratamento: 'Financeiro'
      }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Erro ao criar paciente financeiro:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/pacientes-financeiro/:id - Atualizar paciente financeiro
const updatePacienteFinanceiro = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cpf, nome, contato, valor_parcela, numero_parcelas, vencimento,
      valor_tratamento, antecipacao_meses, data_operacao, entregue,
      analise, responsavel, observacoes_financeiras, status
    } = req.body;

    const updateData = {
      cpf, 
      nome, 
      telefone: contato,
      valor_parcela: valor_parcela ? parseFloat(valor_parcela.replace(/[^\d,-]/g, '').replace(',', '.')) : null,
      numero_parcelas: numero_parcelas ? parseInt(numero_parcelas) : null,
      vencimento,
      valor_tratamento: valor_tratamento ? parseFloat(valor_tratamento.replace(/[^\d,-]/g, '').replace(',', '.')) : null,
      antecipacao_meses: antecipacao_meses ? parseInt(antecipacao_meses) : null,
      data_operacao,
      entregue: entregue || false,
      analise,
      responsavel,
      observacoes_financeiras,
      status
    };

    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Erro ao atualizar paciente financeiro:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/pacientes-financeiro/:id - Excluir paciente financeiro (apenas admin)
const deletePacienteFinanceiro = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir pacientes' });
    }

    const { error } = await supabaseAdmin
      .from('pacientes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Paciente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir paciente financeiro:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/pacientes-financeiro/:id/upload-documento - Upload de documento
const uploadDocumentoPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.body; // tipo: selfie_doc, documento, comprovante_residencia, etc.
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `pacientes/${id}/${tipo}-${timestamp}-${req.file.originalname}`;
    
    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('pacientes-documentos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('pacientes-documentos')
      .getPublicUrl(fileName);

    // Atualizar o campo correspondente no paciente
    const updateField = `${tipo}_url`;
    const { error: updateError } = await supabaseAdmin
      .from('pacientes')
      .update({ [updateField]: publicUrl })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ 
      message: 'Documento enviado com sucesso',
      url: publicUrl,
      tipo: tipo
    });
  } catch (error) {
    console.error('Erro ao fazer upload de documento:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllPacientesFinanceiro,
  createPacienteFinanceiro,
  updatePacienteFinanceiro,
  deletePacienteFinanceiro,
  uploadDocumentoPaciente
};

