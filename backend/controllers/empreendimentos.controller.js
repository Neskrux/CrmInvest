const { supabase, supabaseAdmin } = require('../config/database');
const { uploadGaleriaImagem, removeGaleriaImagem } = require('../utils/uploadGaleria');

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
    // Filtrar empreendimentos por empresa_id se o usuário não for admin
    let query = supabaseAdmin
      .from('empreendimentos')
      .select('*');

    // Se não for admin, filtrar por empresa_id (incluindo consultores internos)
    if (req.user.tipo !== 'admin') {
      if (req.user.empresa_id) {
        query = query.eq('empresa_id', req.user.empresa_id);
      } else {
        // Se não tem empresa_id, retornar vazio
        query = query.eq('id', 0);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data);
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

    if (error) {
      // Se não encontrou o registro, retornar 404
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return res.status(404).json({ error: 'Empreendimento não encontrado' });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    // Retornar no formato esperado pelo frontend
    res.json(data);
  } catch (error) {
    console.error('❌ Erro ao buscar empreendimento:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar empreendimento' });
  }
};

// GET /api/empreendimentos/:id/unidades - Buscar unidades de um empreendimento
const getUnidadesByEmpreendimento = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, torre, status } = req.query;
    
    let query = supabaseAdmin
      .from('unidades')
      .select('*')
      .eq('empreendimento_id', id);

    // Aplicar filtros se fornecidos
    if (tipo) query = query.eq('tipo_unidade', tipo);
    if (torre) query = query.eq('torre', torre);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('numero', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/empreendimentos/:id/unidades/:unidadeId - Buscar unidade específica
const getUnidadeById = async (req, res) => {
  try {
    const { id, unidadeId } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('unidades')
      .select('*')
      .eq('id', unidadeId)
      .eq('empreendimento_id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/empreendimentos/:id/galeria/upload - Upload de imagem para galeria
const uploadGaleria = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Validar categoria
    const categoriasValidas = ['apartamento', 'areas-de-lazer', 'plantas-humanizadas', 'videos'];
    if (!categoria || !categoriasValidas.includes(categoria)) {
      return res.status(400).json({ 
        error: 'Categoria inválida',
        categoriasValidas 
      });
    }

    // Verificar se empreendimento existe
    const { data: empreendimento, error: empError } = await supabaseAdmin
      .from('empreendimentos')
      .select('id')
      .eq('id', id)
      .single();

    if (empError || !empreendimento) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    // Fazer upload com geração automática de thumbnail
    const result = await uploadGaleriaImagem(req.file, id, categoria);

    const tipoArquivo = categoria === 'videos' ? 'Vídeo' : 'Imagem';
    
    res.json({
      success: true,
      message: `${tipoArquivo} uploadado(a) com sucesso`,
      data: result
    });

  } catch (error) {
    console.error('❌ Erro no upload de galeria:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao fazer upload do arquivo'
    });
  }
};

// POST /api/empreendimentos/:id/galeria/upload-multiple - Upload múltiplo de imagens
const uploadGaleriaMultiple = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Validar categoria
    const categoriasValidas = ['apartamento', 'areas-de-lazer', 'plantas-humanizadas', 'videos'];
    if (!categoria || !categoriasValidas.includes(categoria)) {
      return res.status(400).json({ 
        error: 'Categoria inválida',
        categoriasValidas 
      });
    }

    // Verificar se empreendimento existe
    const { data: empreendimento, error: empError } = await supabaseAdmin
      .from('empreendimentos')
      .select('id')
      .eq('id', id)
      .single();

    if (empError || !empreendimento) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    // Processar cada arquivo
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const result = await uploadGaleriaImagem(file, id, categoria);
        results.push(result);
      } catch (error) {
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
      }
    }

    const tipoArquivo = categoria === 'videos' ? 'vídeo(s)' : 'imagem(ns)';
    
    res.json({
      success: true,
      message: `${results.length} ${tipoArquivo} uploadado(s) com sucesso`,
      uploaded: results.length,
      failed: errors.length,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Erro no upload múltiplo de galeria:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao fazer upload dos arquivos'
    });
  }
};

// DELETE /api/empreendimentos/:id/galeria/* - Remover imagem da galeria
const removeGaleria = async (req, res) => {
  try {
    // Pegar o path do wildcard (*)
    const path = req.params[0] || req.params.path;
    
    if (!path) {
      return res.status(400).json({ error: 'Path da imagem não fornecido' });
    }
    
    // Decodificar o path (pode vir com / codificados)
    const decodedPath = decodeURIComponent(path);

    const result = await removeGaleriaImagem(decodedPath);

    res.json({
      success: true,
      message: 'Imagem removida com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro ao remover imagem da galeria:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao remover imagem'
    });
  }
};

// PUT /api/empreendimentos/:id - Atualizar empreendimento
const updateEmpreendimento = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem editar empreendimentos' });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Remover campos que não devem ser atualizados
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.empresa_id;

    // Limpar apenas strings vazias (null deve ser mantido para atualizar campos no banco)
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      // Remover apenas strings vazias e undefined (null é válido para limpar campos)
      if (value === '' || (typeof value === 'string' && value.trim() === '')) {
        updateData[key] = null; // Converter string vazia para null
        return;
      }
      // Remover undefined apenas
      if (value === undefined) {
        delete updateData[key];
        return;
      }
      // Para campos de data, validar formato e converter string vazia para null
      if (key.includes('data') || key.includes('_date')) {
        if (typeof value === 'string' && value.trim() === '') {
          updateData[key] = null;
          return;
        }
      }
      // null é válido, não remover
    });

    // Atualizar data_ultima_atualizacao
    updateData.data_ultima_atualizacao = new Date().toISOString();

    // Fazer update
    const { data, error } = await supabaseAdmin
      .from('empreendimentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar empreendimento:', error);
      return res.status(500).json({ 
        error: 'Erro ao atualizar empreendimento',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Empreendimento não encontrado' });
    }

    res.json({
      success: true,
      message: 'Empreendimento atualizado com sucesso',
      data
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar empreendimento:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao atualizar empreendimento'
    });
  }
};

// PUT /api/empreendimentos/:id/unidades/:unidadeId - Atualizar unidade
const updateUnidade = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem editar unidades' });
    }

    const { id, unidadeId } = req.params;
    const updateData = req.body;

    // Remover campos que não devem ser atualizados
    delete updateData.id;
    delete updateData.empreendimento_id;
    delete updateData.created_at;

    // Atualizar updated_at
    updateData.updated_at = new Date().toISOString();

    // Verificar se a unidade pertence ao empreendimento
    const { data: unidade, error: checkError } = await supabaseAdmin
      .from('unidades')
      .select('id, empreendimento_id')
      .eq('id', unidadeId)
      .eq('empreendimento_id', id)
      .single();

    if (checkError || !unidade) {
      return res.status(404).json({ error: 'Unidade não encontrada ou não pertence a este empreendimento' });
    }

    // Fazer update
    const { data, error } = await supabaseAdmin
      .from('unidades')
      .update(updateData)
      .eq('id', unidadeId)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar unidade:', error);
      return res.status(500).json({ 
        error: 'Erro ao atualizar unidade',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Unidade atualizada com sucesso',
      data
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar unidade:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao atualizar unidade'
    });
  }
};

// POST /api/empreendimentos/:id/unidades - Criar nova unidade
const createUnidade = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem criar unidades' });
    }

    const { id } = req.params;
    const newUnidade = req.body;

    // Adicionar empreendimento_id
    newUnidade.empreendimento_id = parseInt(id);
    newUnidade.created_at = new Date().toISOString();
    newUnidade.updated_at = new Date().toISOString();

    // Fazer insert
    const { data, error } = await supabaseAdmin
      .from('unidades')
      .insert(newUnidade)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar unidade:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar unidade',
        details: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Unidade criada com sucesso',
      data
    });

  } catch (error) {
    console.error('❌ Erro ao criar unidade:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao criar unidade'
    });
  }
};

// DELETE /api/empreendimentos/:id/unidades/:unidadeId - Deletar unidade
const deleteUnidade = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem deletar unidades' });
    }

    const { id, unidadeId } = req.params;

    // Verificar se a unidade pertence ao empreendimento
    const { data: unidade, error: checkError } = await supabaseAdmin
      .from('unidades')
      .select('id, empreendimento_id')
      .eq('id', unidadeId)
      .eq('empreendimento_id', id)
      .single();

    if (checkError || !unidade) {
      return res.status(404).json({ error: 'Unidade não encontrada ou não pertence a este empreendimento' });
    }

    // Fazer delete
    const { error } = await supabaseAdmin
      .from('unidades')
      .delete()
      .eq('id', unidadeId);

    if (error) {
      console.error('❌ Erro ao deletar unidade:', error);
      return res.status(500).json({ 
        error: 'Erro ao deletar unidade',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Unidade deletada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao deletar unidade:', error);
    res.status(500).json({ 
      error: error.message || 'Erro ao deletar unidade'
    });
  }
};

module.exports = {
  testEmpreendimentos,
  getAllEmpreendimentos,
  getEmpreendimentoById,
  getUnidadesByEmpreendimento,
  getUnidadeById,
  uploadGaleria,
  uploadGaleriaMultiple,
  removeGaleria,
  updateEmpreendimento,
  updateUnidade,
  createUnidade,
  deleteUnidade
};

