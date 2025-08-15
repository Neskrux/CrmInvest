const express = require('express');
const bcrypt = require('bcrypt');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin, normalizarEmail } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('consultores')
      .select('*')
      .order('nome');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nome, telefone, email, senha, pix } = req.body;
    
    if (!senha || senha.trim() === '') {
      return res.status(400).json({ error: 'Senha é obrigatória!' });
    }
    
    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'Email é obrigatório!' });
    }
    
    const emailNormalizado = normalizarEmail(email);
    
    const { data: emailExistente, error: emailError } = await supabase
      .from('consultores')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailError) throw emailError;
    
    if (emailExistente && emailExistente.length > 0) {
      return res.status(400).json({ error: 'Este email já está cadastrado!' });
    }
    
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    const { data, error } = await supabase
      .from('consultores')
      .insert([{ nome, telefone, email: emailNormalizado, senha: senhaHash, pix }])
      .select();

    if (error) throw error;
    res.json({ 
      id: data[0].id, 
      message: 'Consultor cadastrado com sucesso!',
      email: emailNormalizado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cadastro', async (req, res) => {
  try {
    const { nome, telefone, email, senha, cpf, pix } = req.body;
    
    if (!nome || !telefone || !email || !senha || !cpf || !pix) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios!' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido!' });
    }
    
    const emailNormalizado = normalizarEmail(email);
    
    const { data: emailExistente, error: emailError } = await supabase
      .from('consultores')
      .select('id')
      .eq('email', emailNormalizado)
      .limit(1);

    if (emailError) throw emailError;
    
    if (emailExistente && emailExistente.length > 0) {
      return res.status(400).json({ error: 'Este email já está cadastrado!' });
    }
    
    const { data: cpfExistente, error: cpfError } = await supabase
      .from('consultores')
      .select('id')
      .eq('cpf', cpf)
      .limit(1);

    if (cpfError) throw cpfError;
    
    if (cpfExistente && cpfExistente.length > 0) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado!' });
    }
    
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    const { data, error } = await supabase
      .from('consultores')
      .insert([{ 
        nome, 
        telefone, 
        email: emailNormalizado, 
        senha: senhaHash, 
        cpf, 
        pix,
        tipo: 'consultor',
        ativo: true
      }])
      .select();

    if (error) {
      throw error;
    }
    
    res.json({ 
      id: data[0].id, 
      message: 'Consultor cadastrado com sucesso! Agora você pode fazer login.',
      email: emailNormalizado
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, senha, pix } = req.body;
    
    const updateData = { nome, telefone, pix };
    
    if (email && email.trim() !== '') {
      const emailNormalizado = normalizarEmail(email);
      
      const { data: emailExistente, error: emailError } = await supabase
        .from('consultores')
        .select('id')
        .eq('email', emailNormalizado)
        .neq('id', id)
        .limit(1);

      if (emailError) throw emailError;
      
      if (emailExistente && emailExistente.length > 0) {
        return res.status(400).json({ error: 'Este email já está sendo usado por outro consultor!' });
      }
      
      updateData.email = emailNormalizado;
    }
    
    if (senha && senha.trim() !== '') {
      const saltRounds = 10;
      updateData.senha = await bcrypt.hash(senha, saltRounds);
    }
    
    const { data, error } = await supabase
      .from('consultores')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ 
      id: data[0].id, 
      message: 'Consultor atualizado com sucesso!',
      email: updateData.email
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('consultores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
