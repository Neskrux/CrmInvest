const { supabase, supabaseAdmin } = require('../config/database');

// GET /api/empreendimentos/test - Testar conexão e tabela
const testEmpreendimentos = async (req, res) => {
  try {
    console.log('🧪 [Backend] Testando conexão com empreendimentos...');
    
    // Testar se a tabela existe
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ [Backend] Erro ao acessar tabela empreendimentos:', error);
      return res.status(500).json({ 
        error: 'Tabela empreendimentos não existe ou não é acessível',
        details: error.message,
        hint: 'Verifique se a tabela empreendimentos foi criada no banco de dados'
      });
    }

    console.log('✅ [Backend] Tabela empreendimentos acessível');
    res.json({ 
      success: true, 
      message: 'Tabela empreendimentos acessível',
      data: data 
    });
  } catch (error) {
    console.error('❌ [Backend] Erro no teste:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Erro ao testar conexão com empreendimentos'
    });
  }
};

// GET /api/empreendimentos - Listar empreendimentos
const getAllEmpreendimentos = async (req, res) => {
  try {
    console.log('🔍 [Backend] Iniciando busca de empreendimentos...');
    console.log('👤 [Backend] Usuário:', req.user.tipo, 'Empresa ID:', req.user.empresa_id);
    
    // Testar conexão com Supabase primeiro
    console.log('🔗 [Backend] Testando conexão com Supabase...');
    
    // Query mais simples possível - apenas selecionar todos
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .select('*');

    console.log('📡 [Backend] Query executada');
    console.log('📊 [Backend] Empreendimentos encontrados:', data ? data.length : 'null');
    
    if (error) {
      console.error('❌ [Backend] Erro na query:', error);
      console.error('❌ [Backend] Detalhes do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ [Backend] Sucesso! Enviando dados para o frontend');
    console.log('📋 [Backend] Dados enviados:', data);
    res.json(data || []);
  } catch (error) {
    console.error('❌ [Backend] Erro completo:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.details || 'Erro interno do servidor'
    });
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
  testEmpreendimentos,
  getAllEmpreendimentos,
  getEmpreendimentoById
};

