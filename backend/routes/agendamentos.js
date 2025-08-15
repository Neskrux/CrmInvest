const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome, telefone),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_agendamento', { ascending: false })
      .order('horario');

    if (req.user.tipo === 'consultor') {
      query = query.eq('consultor_id', req.user.consultor_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = data.map(agendamento => ({
      ...agendamento,
      paciente_nome: agendamento.pacientes?.nome,
      paciente_telefone: agendamento.pacientes?.telefone,
      consultor_nome: agendamento.consultores?.nome,
      clinica_nome: agendamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, observacoes } = req.body;
    
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([{ paciente_id, consultor_id, clinica_id, data_agendamento, horario, observacoes }])
      .select();

    if (error) throw error;

    if (paciente_id) {
      await supabase
        .from('pacientes')
        .update({ status: 'agendado' })
        .eq('id', paciente_id);
    }

    res.json({ id: data[0].id, message: 'Agendamento criado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes } = req.body;
    
    const { data, error } = await supabase
      .from('agendamentos')
      .update({ paciente_id, consultor_id, clinica_id, data_agendamento, horario, status, observacoes })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (paciente_id) {
      await supabase
        .from('pacientes')
        .update({ status: 'agendado' })
        .eq('id', paciente_id);
    }

    res.json({ id: data[0].id, message: 'Agendamento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const { error } = await supabase
      .from('agendamentos')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/lembrado', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('agendamentos')
      .update({ lembrado: true })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Paciente marcado como lembrado!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Agendamento removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
