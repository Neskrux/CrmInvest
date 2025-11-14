const { supabaseAdmin } = require('../config/database');

// GET /api/metas-corretores - Buscar metas de todos corretores do mês
const getMetasCorretores = async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();
    
    // Verificar se é admin ou consultor interno da incorporadora
    const isAdmin = req.user.tipo === 'admin';
    const isConsultorInterno = req.user.tipo === 'consultor' && 
      req.user.pode_ver_todas_novas_clinicas === true && 
      req.user.podealterarstatus === true &&
      req.user.empresa_id === 5;
    
    if (!isAdmin && !isConsultorInterno) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou consultores internos da incorporadora.' });
    }
    
    // Buscar metas do mês
    let query = supabaseAdmin
      .from('metas_corretores')
      .select(`
        *,
        consultores(id, nome, foto_url, empresa_id)
      `)
      .eq('mes', mesAtual)
      .eq('ano', anoAtual);
    
    // Se for consultor interno, filtrar apenas corretores da mesma empresa
    if (isConsultorInterno && !isAdmin) {
      query = query.eq('consultores.empresa_id', req.user.empresa_id);
    }
    
    const { data: metas, error } = await query;
    
    if (error) throw error;
    
    // Buscar todos os corretores da incorporadora (empresa_id = 5) que atendem ao filtro
    // Filtro: empresa_id = 5, is_freelancer = false, tipo_consultor = 'corretor'
    const { data: corretores, error: corretoresError } = await supabaseAdmin
      .from('consultores')
      .select('id, nome, foto_url, empresa_id')
      .eq('empresa_id', 5)
      .eq('is_freelancer', false)
      .eq('tipo_consultor', 'corretor');
    
    if (corretoresError) throw corretoresError;
    
    // Filtrar apenas as metas dos corretores que atendem ao filtro
    const corretoresIds = corretores?.map(c => c.id) || [];
    const metasFiltradas = metas?.filter(m => corretoresIds.includes(m.corretor_id)) || [];
    
    // Criar metas padrão para corretores que não têm meta
    const corretoresComMeta = metasFiltradas.map(m => m.corretor_id);
    const corretoresSemMeta = corretores?.filter(c => !corretoresComMeta.includes(c.id)) || [];
    
    if (corretoresSemMeta.length > 0) {
      const metasPadrao = corretoresSemMeta.map(corretor => ({
        corretor_id: corretor.id,
        mes: mesAtual,
        ano: anoAtual,
        meta_vgv: 1020000.00,
        meta_entrada: 150000.00
      }));
      
      const { data: novasMetas, error: insertError } = await supabaseAdmin
        .from('metas_corretores')
        .insert(metasPadrao)
        .select(`
          *,
          consultores(id, nome, foto_url, empresa_id)
        `);
      
      if (insertError) throw insertError;
      
      // Combinar metas existentes filtradas com novas
      const todasMetas = [...metasFiltradas, ...(novasMetas || [])];
      
      // Calcular meta máxima do time (soma de todas as metas dos corretores filtrados)
      const metaMaximaVGV = todasMetas.reduce((sum, m) => sum + parseFloat(m.meta_vgv || 0), 0);
      const metaMaximaEntrada = todasMetas.reduce((sum, m) => sum + parseFloat(m.meta_entrada || 0), 0);
      
      // Logs detalhados para Metas Corretores
      console.log('\n📊 [METAS CORRETORES]');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📅 Período: ${mesAtual}/${anoAtual}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🔍 Filtro aplicado: empresa_id=5, is_freelancer=false, tipo_consultor='corretor'`);
      console.log(`👥 Total de Corretores no Filtro: ${corretores?.length || 0}`);
      console.log(`👥 Total de Metas (após filtro): ${todasMetas.length}`);
      console.log(`   └─ Metas existentes (filtradas): ${metasFiltradas.length}`);
      console.log(`   └─ Novas metas criadas: ${novasMetas?.length || 0}`);
      console.log(`💰 Meta Máxima VGV: R$ ${metaMaximaVGV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`💵 Meta Máxima Entrada: R$ ${metaMaximaEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      res.json({
        metas: todasMetas,
        meta_maxima_vgv: metaMaximaVGV,
        meta_maxima_entrada: metaMaximaEntrada
      });
    } else {
      // Calcular meta máxima do time (soma de todas as metas dos corretores filtrados)
      const metaMaximaVGV = metasFiltradas.reduce((sum, m) => sum + parseFloat(m.meta_vgv || 0), 0);
      const metaMaximaEntrada = metasFiltradas.reduce((sum, m) => sum + parseFloat(m.meta_entrada || 0), 0);
      
      // Logs detalhados para Metas Corretores
      console.log('\n📊 [METAS CORRETORES]');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📅 Período: ${mesAtual}/${anoAtual}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🔍 Filtro aplicado: empresa_id=5, is_freelancer=false, tipo_consultor='corretor'`);
      console.log(`👥 Total de Corretores no Filtro: ${corretores?.length || 0}`);
      console.log(`👥 Total de Metas (após filtro): ${metasFiltradas.length}`);
      console.log(`💰 Meta Máxima VGV: R$ ${metaMaximaVGV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`💵 Meta Máxima Entrada: R$ ${metaMaximaEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      res.json({
        metas: metasFiltradas,
        meta_maxima_vgv: metaMaximaVGV,
        meta_maxima_entrada: metaMaximaEntrada
      });
    }
  } catch (error) {
    console.error('Erro ao buscar metas de corretores:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/metas-corretores/:corretor_id - Buscar meta de um corretor
const getMetaCorretor = async (req, res) => {
  try {
    const { corretor_id } = req.params;
    const { mes, ano } = req.query;
    
    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();
    
    // Verificar se é admin ou o próprio corretor
    const isAdmin = req.user.tipo === 'admin';
    const isProprioCorretor = req.user.id === parseInt(corretor_id);
    
    if (!isAdmin && !isProprioCorretor) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    
    const { data: meta, error } = await supabaseAdmin
      .from('metas_corretores')
      .select(`
        *,
        consultores(id, nome, foto_url, empresa_id)
      `)
      .eq('corretor_id', corretor_id)
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
      .single();
    
    if (error) {
      // Se não encontrou, criar meta padrão
      if (error.code === 'PGRST116') {
        const { data: novaMeta, error: insertError } = await supabaseAdmin
          .from('metas_corretores')
          .insert({
            corretor_id: parseInt(corretor_id),
            mes: mesAtual,
            ano: anoAtual,
            meta_vgv: 1020000.00,
            meta_entrada: 150000.00
          })
          .select(`
            *,
            consultores(id, nome, foto_url, empresa_id)
          `)
          .single();
        
        if (insertError) throw insertError;
        return res.json(novaMeta);
      }
      throw error;
    }
    
    res.json(meta);
  } catch (error) {
    console.error('Erro ao buscar meta do corretor:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/metas-corretores - Criar meta (apenas admin)
const createMetaCorretor = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    const { corretor_id, mes, ano, meta_vgv, meta_entrada } = req.body;
    
    if (!corretor_id || !mes || !ano) {
      return res.status(400).json({ error: 'corretor_id, mes e ano são obrigatórios' });
    }
    
    // Verificar se já existe meta para este corretor no mês/ano
    const { data: metaExistente, error: checkError } = await supabaseAdmin
      .from('metas_corretores')
      .select('id')
      .eq('corretor_id', corretor_id)
      .eq('mes', mes)
      .eq('ano', ano)
      .single();
    
    if (metaExistente) {
      return res.status(400).json({ error: 'Meta já existe para este corretor no mês/ano especificado' });
    }
    
    const { data: novaMeta, error } = await supabaseAdmin
      .from('metas_corretores')
      .insert({
        corretor_id: parseInt(corretor_id),
        mes: parseInt(mes),
        ano: parseInt(ano),
        meta_vgv: meta_vgv ? parseFloat(meta_vgv) : 1020000.00,
        meta_entrada: meta_entrada ? parseFloat(meta_entrada) : 150000.00
      })
      .select(`
        *,
        consultores(id, nome, foto_url, empresa_id)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(novaMeta);
  } catch (error) {
    console.error('Erro ao criar meta do corretor:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/metas-corretores/:id - Atualizar meta (apenas admin)
const updateMetaCorretor = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    const { id } = req.params;
    const { meta_vgv, meta_entrada } = req.body;
    
    const updateData = {};
    if (meta_vgv !== undefined) updateData.meta_vgv = parseFloat(meta_vgv);
    if (meta_entrada !== undefined) updateData.meta_entrada = parseFloat(meta_entrada);
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    const { data: metaAtualizada, error } = await supabaseAdmin
      .from('metas_corretores')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        consultores(id, nome, foto_url, empresa_id)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(metaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar meta do corretor:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/metas-corretores/corretor/:corretor_id - Atualizar meta por corretor_id (apenas admin)
const updateMetaCorretorById = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    const { corretor_id } = req.params;
    const { mes, ano, meta_vgv, meta_entrada } = req.body;
    
    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();
    
    const updateData = {};
    if (meta_vgv !== undefined) updateData.meta_vgv = parseFloat(meta_vgv);
    if (meta_entrada !== undefined) updateData.meta_entrada = parseFloat(meta_entrada);
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }
    
    // Verificar se existe meta
    const { data: metaExistente, error: checkError } = await supabaseAdmin
      .from('metas_corretores')
      .select('id')
      .eq('corretor_id', corretor_id)
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      // Se não existe, criar
      const { data: novaMeta, error: insertError } = await supabaseAdmin
        .from('metas_corretores')
        .insert({
          corretor_id: parseInt(corretor_id),
          mes: mesAtual,
          ano: anoAtual,
          meta_vgv: meta_vgv ? parseFloat(meta_vgv) : 1020000.00,
          meta_entrada: meta_entrada ? parseFloat(meta_entrada) : 150000.00
        })
        .select(`
          *,
          consultores(id, nome, foto_url, empresa_id)
        `)
        .single();
      
      if (insertError) throw insertError;
      return res.json(novaMeta);
    }
    
    // Se existe, atualizar
    const { data: metaAtualizada, error } = await supabaseAdmin
      .from('metas_corretores')
      .update(updateData)
      .eq('corretor_id', corretor_id)
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
      .select(`
        *,
        consultores(id, nome, foto_url, empresa_id)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(metaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar meta do corretor:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMetasCorretores,
  getMetaCorretor,
  createMetaCorretor,
  updateMetaCorretor,
  updateMetaCorretorById
};

