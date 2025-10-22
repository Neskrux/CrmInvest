const { supabase, supabaseAdmin } = require('../config/database');

// GET /api/empreendimentos - Listar empreendimentos
const getAllEmpreendimentos = async (req, res) => {
  try {
    const { cidade, estado } = req.query;
    
    console.log('🔍 [Backend] Iniciando query simples...');
    console.log('👤 [Backend] Usuário:', req.user.tipo, 'Empresa ID:', req.user.empresa_id);
    
    // Query mais simples possível - apenas selecionar todos
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('*');

    console.log('📡 [Backend] Query executada');
    console.log('📊 [Backend] Empreendimentos encontrados:', data ? data.length : 'null');
    console.log('📋 [Backend] Dados:', data);

    if (error) {
      console.error('❌ [Backend] Erro na query:', error);
      throw error;
    }

    console.log('✅ [Backend] Sucesso! Enviando dados para o frontend');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/empreendimentos/:id - Buscar empreendimento por ID
const getEmpreendimentoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllEmpreendimentos,
  getEmpreendimentoById
};

