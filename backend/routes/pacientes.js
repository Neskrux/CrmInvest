const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('pacientes')
      .select(`
        *,
        consultores(nome)
      `)
      .order('created_at', { ascending: false });

    if (req.user.tipo === 'consultor') {
      const { data: agendamentos, error: agendError } = await supabase
        .from('agendamentos')
        .select('paciente_id')
        .eq('consultor_id', req.user.consultor_id);

      if (agendError) throw agendError;

      const pacienteIds = agendamentos.map(a => a.paciente_id);
      
      const conditions = [`consultor_id.eq.${req.user.consultor_id}`];
      
      if (pacienteIds.length > 0) {
        conditions.push(`id.in.(${pacienteIds.join(',')})`);
      }
      
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;

    if (error) throw error;
    
    const formattedData = data.map(paciente => ({
      ...paciente,
      consultor_nome: paciente.consultores?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id, cidade, estado } = req.body;
    
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabase
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabase
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('cpf', cpfNumeros)
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    
    const { data, error } = await supabase
      .from('pacientes')
      .insert([{ 
        nome, 
        telefone: telefoneNumeros,
        cpf: cpfNumeros,
        tipo_tratamento, 
        status: status || 'lead', 
        observacoes,
        consultor_id: consultorId,
        cidade,
        estado
      }])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Paciente cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads/cadastro', async (req, res) => {
  try {
    const { nome, telefone, tipo_tratamento, cpf, observacoes, cidade, estado } = req.body;
    
    if (!nome || !telefone || !cpf) {
      return res.status(400).json({ error: 'Nome, telefone e CPF são obrigatórios!' });
    }
    
    if (nome.trim().length < 2) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres!' });
    }
    
    const telefoneRegex = /^[\(\)\s\-\+\d]{10,15}$/;
    if (!telefoneRegex.test(telefone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Telefone inválido!' });
    }
    
    const cpfNumeros = cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 dígitos!' });
    }
    
    const telefoneNumeros = telefone.replace(/\D/g, '');
    
    const { data: telefoneExistente, error: telefoneError } = await supabase
      .from('pacientes')
      .select('id, nome, created_at')
      .eq('telefone', telefoneNumeros)
      .limit(1);

    if (telefoneError) {
      throw telefoneError;
    }
    
    if (telefoneExistente && telefoneExistente.length > 0) {
      const pacienteExistente = telefoneExistente[0];
      const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
      return res.status(400).json({ 
        error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}). Por favor, utilize outro número.` 
      });
    }
    
    const { data: cpfExistente, error: cpfError } = await supabase
      .from('pacientes')
      .select('id, nome, created_at')
      .eq('cpf', cpfNumeros)
      .limit(1);

    if (cpfError) {
      throw cpfError;
    }
    
    if (cpfExistente && cpfExistente.length > 0) {
      const pacienteExistente = cpfExistente[0];
      const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
      return res.status(400).json({ 
        error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}). Por favor, verifique os dados.` 
      });
    }
    
    const { data, error } = await supabase
      .from('pacientes')
      .insert([{ 
        nome: nome.trim(), 
        telefone: telefoneNumeros,
        cpf: cpfNumeros,
        tipo_tratamento: tipo_tratamento || null,
        status: 'lead', 
        observacoes: observacoes || null,
        cidade: cidade ? cidade.trim() : null,
        estado: estado ? estado.trim() : null,
        consultor_id: null
      }])
      .select();

    if (error) {
      throw error;
    }
    
    res.json({ 
      id: data[0].id, 
      message: 'Cadastro realizado com sucesso! Entraremos em contato em breve.',
      nome: nome.trim()
    });
  } catch (error) {
    console.error('Erro no cadastro de lead:', error);
    res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, cpf, tipo_tratamento, status, observacoes, consultor_id, cidade } = req.body;
    
    const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
    const cpfNumeros = cpf ? cpf.replace(/\D/g, '') : '';
    
    if (telefoneNumeros) {
      const { data: telefoneExistente, error: telefoneError } = await supabase
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('telefone', telefoneNumeros)
        .neq('id', id)
        .limit(1);

      if (telefoneError) throw telefoneError;
      
      if (telefoneExistente && telefoneExistente.length > 0) {
        const pacienteExistente = telefoneExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este número de telefone já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    if (cpfNumeros) {
      const { data: cpfExistente, error: cpfError } = await supabase
        .from('pacientes')
        .select('id, nome, created_at')
        .eq('cpf', cpfNumeros)
        .neq('id', id)
        .limit(1);

      if (cpfError) throw cpfError;
      
      if (cpfExistente && cpfExistente.length > 0) {
        const pacienteExistente = cpfExistente[0];
        const dataCadastro = new Date(pacienteExistente.created_at).toLocaleDateString('pt-BR');
        return res.status(400).json({ 
          error: `Este CPF já está cadastrado para ${pacienteExistente.nome} (cadastrado em ${dataCadastro}).` 
        });
      }
    }
    
    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    
    const { data, error } = await supabase
      .from('pacientes')
      .update({ 
        nome, 
        telefone: telefoneNumeros,
        cpf: cpfNumeros,
        tipo_tratamento, 
        status, 
        observacoes,
        consultor_id: consultorId,
        cidade
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Paciente atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const { error } = await supabase
      .from('pacientes')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/novos-leads', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .is('consultor_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/novos-leads/:id/pegar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: pacienteAtual, error: checkError } = await supabase
      .from('pacientes')
      .select('consultor_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (pacienteAtual.consultor_id !== null) {
      return res.status(400).json({ error: 'Este lead já foi atribuído a outro consultor!' });
    }

    const { error } = await supabase
      .from('pacientes')
      .update({ consultor_id: req.user.consultor_id })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Lead atribuído com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
