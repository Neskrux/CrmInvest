const { supabase, supabaseAdmin } = require('../config/database');

// GET /api/empreendimentos - Listar empreendimentos
const getAllEmpreendimentos = async (req, res) => {
  try {
    // Filtrar empreendimentos por empresa_id se o usuário não for admin
    let query = supabaseAdmin
      .from('empreendimentos')
      .select('*');

    // Se não for admin, filtrar por empresa_id
    if (req.user.tipo !== 'admin') {
      query = query.eq('empresa_id', req.user.empresa_id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

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

