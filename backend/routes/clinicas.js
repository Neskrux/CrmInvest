const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { cidade, estado } = req.query;
    
    let query = supabase
      .from('clinicas')
      .select('*')
      .order('nome');

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (cidade) {
      query = query.ilike('cidade', `%${cidade}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/cidades', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = supabase
      .from('clinicas')
      .select('cidade')
      .not('cidade', 'is', null)
      .not('cidade', 'eq', '');

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    const cidadesUnicas = [...new Set(data.map(c => c.cidade))].sort();
    res.json(cidadesUnicas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/estados', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clinicas')
      .select('estado')
      .not('estado', 'is', null)
      .not('estado', 'eq', '');

    if (error) throw error;
    
    const estadosUnicos = [...new Set(data.map(c => c.estado))].sort();
    res.json(estadosUnicos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nome, endereco, bairro, cidade, estado, nicho, telefone, email, status } = req.body;
    
    const { data, error } = await supabase
      .from('clinicas')
      .insert([{ 
        nome, 
        endereco, 
        bairro, 
        cidade, 
        estado, 
        nicho, 
        telefone, 
        email, 
        status: status || 'ativo'
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Clínica cadastrada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const camposPermitidos = ['nome', 'endereco', 'bairro', 'cidade', 'estado', 'nicho', 'telefone', 'email', 'status'];
    const updateData = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        updateData[campo] = req.body[campo];
      }
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    }
    
    const { data, error } = await supabase
      .from('clinicas')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(403).json({ error: 'Nenhuma linha atualizada! Verifique as policies do Supabase.' });
    }
    
    res.json({ id: data[0].id, message: 'Clínica atualizada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
