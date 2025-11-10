const { supabaseAdmin } = require('../config/database');

// GET /api/assinaturas-admin/minha-assinatura - Obter assinatura ativa do admin logado
const getMinhaAssinatura = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    
    const { data, error } = await supabaseAdmin
      .from('assinaturas_admin')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('ativa', true)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ 
        error: 'Nenhuma assinatura cadastrada',
        temAssinatura: false 
      });
    }
    
    res.json({
      ...data,
      temAssinatura: true
    });
  } catch (error) {
    console.error('Erro ao buscar assinatura do admin:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/assinaturas-admin - Salvar assinatura do admin
const salvarAssinaturaAdmin = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { nome_admin, documento_admin, assinatura_base64, assinatura_url } = req.body;
    
    if (!nome_admin || !documento_admin || !assinatura_base64) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: nome_admin, documento_admin, assinatura_base64' 
      });
    }
    
    // Desativar assinaturas anteriores do mesmo usuário
    await supabaseAdmin
      .from('assinaturas_admin')
      .update({ ativa: false })
      .eq('usuario_id', usuarioId)
      .eq('ativa', true);
    
    // Inserir nova assinatura ativa
    const { data, error } = await supabaseAdmin
      .from('assinaturas_admin')
      .insert({
        usuario_id: usuarioId,
        nome_admin,
        documento_admin,
        assinatura_base64,
        assinatura_url: assinatura_url || null,
        ativa: true
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({
      message: 'Assinatura salva com sucesso!',
      assinatura: data
    });
  } catch (error) {
    console.error('Erro ao salvar assinatura do admin:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMinhaAssinatura,
  salvarAssinaturaAdmin
};
