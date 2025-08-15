const express = require('express');
const { supabase, supabaseAdmin, STORAGE_BUCKET } = require('../config/database');
const { authenticateToken, authenticateUpload, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadToSupabase } = require('../services/uploadService');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('fechamentos')
      .select(`
        *,
        pacientes(nome, telefone, cpf),
        consultores(nome),
        clinicas(nome)
      `)
      .order('data_fechamento', { ascending: false })
      .order('created_at', { ascending: false });

    if (req.user.tipo === 'consultor') {
      query = query.eq('consultor_id', req.user.consultor_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = data.map(fechamento => ({
      ...fechamento,
      paciente_nome: fechamento.pacientes?.nome,
      paciente_telefone: fechamento.pacientes?.telefone,
      paciente_cpf: fechamento.pacientes?.cpf,
      consultor_nome: fechamento.consultores?.nome,
      clinica_nome: fechamento.clinicas?.nome
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateUpload, upload.single('contrato'), async (req, res) => {
  try {
    const { 
      paciente_id, 
      consultor_id, 
      clinica_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_tratamento,
      observacoes 
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Contrato em PDF é obrigatório!' });
    }

    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    const clinicaId = clinica_id && String(clinica_id).trim() !== '' ? parseInt(clinica_id) : null;

    let contratoArquivo = null;
    let contratoNomeOriginal = null;
    let contratoTamanho = null;
    
    if (req.file) {
      try {
        const uploadResult = await uploadToSupabase(req.file);
        contratoArquivo = uploadResult.fileName;
        contratoNomeOriginal = uploadResult.originalName;
        contratoTamanho = uploadResult.size;
      } catch (uploadError) {
        console.error('Erro detalhado no upload:', uploadError);
        return res.status(500).json({ 
          error: 'Erro ao fazer upload do contrato: ' + uploadError.message,
          details: process.env.NODE_ENV === 'development' ? uploadError : undefined
        });
      }
    }
    
    const { data, error } = await supabase
      .from('fechamentos')
      .insert([{ 
        paciente_id: parseInt(paciente_id), 
        consultor_id: consultorId, 
        clinica_id: clinicaId, 
        valor_fechado: parseFloat(valor_fechado), 
        data_fechamento, 
        tipo_tratamento: tipo_tratamento || null,
        observacoes: observacoes || null,
        contrato_arquivo: contratoArquivo,
        contrato_nome_original: contratoNomeOriginal,
        contrato_tamanho: contratoTamanho,
        aprovado: 'pendente'
      }])
      .select();

    if (error) {
      if (contratoArquivo) {
        await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([contratoArquivo]);
      }
      throw error;
    }

    if (paciente_id) {
      await supabase
        .from('pacientes')
        .update({ status: 'fechado' })
        .eq('id', paciente_id);
    }

    res.json({ 
      id: data[0].id, 
      message: 'Fechamento registrado com sucesso!',
      contrato: contratoNomeOriginal
    });
  } catch (error) {
    console.error('Erro ao criar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      paciente_id, 
      consultor_id, 
      clinica_id, 
      valor_fechado, 
      data_fechamento, 
      tipo_tratamento,
      observacoes 
    } = req.body;

    const consultorId = consultor_id && String(consultor_id).trim() !== '' ? parseInt(consultor_id) : null;
    const clinicaId = clinica_id && String(clinica_id).trim() !== '' ? parseInt(clinica_id) : null;
    
    const { data, error } = await supabase
      .from('fechamentos')
      .update({ 
        paciente_id: parseInt(paciente_id), 
        consultor_id: consultorId, 
        clinica_id: clinicaId, 
        valor_fechado: parseFloat(valor_fechado), 
        data_fechamento, 
        tipo_tratamento: tipo_tratamento || null,
        observacoes: observacoes || null 
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ id: data[0].id, message: 'Fechamento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: fechamento, error: selectError } = await supabase
      .from('fechamentos')
      .select('contrato_arquivo')
      .eq('id', id)
      .single();

    if (selectError) throw selectError;

    const { error } = await supabase
      .from('fechamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (fechamento?.contrato_arquivo) {
      try {
        await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .remove([fechamento.contrato_arquivo]);
      } catch (storageError) {
        console.error('Erro ao remover arquivo do storage:', storageError);
      }
    }

    res.json({ message: 'Fechamento removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/contrato', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: fechamento, error } = await supabase
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!fechamento?.contrato_arquivo) {
      return res.status(404).json({ error: 'Contrato não encontrado!' });
    }

    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(fechamento.contrato_arquivo);

    if (downloadError) {
      console.error('Erro ao baixar arquivo:', downloadError);
      return res.status(500).json({ error: 'Erro ao baixar arquivo' });
    }

    const nomeDownload = (fechamento.contrato_nome_original || 'contrato.pdf').replace(/"/g, '');
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fechamento.contrato_arquivo, 60, { download: nomeDownload });

    if (!signedError && signed?.signedUrl) {
      return res.redirect(signed.signedUrl);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeDownload}"`);

    if (data && typeof data.arrayBuffer === 'function') {
      const buffer = Buffer.from(await data.arrayBuffer());
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }
    if (data && typeof data.pipe === 'function') {
      return data.pipe(res);
    }
    return res.status(500).json({ error: 'Não foi possível processar o arquivo do contrato' });
  } catch (error) {
    console.error('Erro ao baixar contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/contrato/url', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: fechamento, error } = await supabase
      .from('fechamentos')
      .select('contrato_arquivo, contrato_nome_original')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!fechamento?.contrato_arquivo) {
      return res.status(404).json({ error: 'Contrato não encontrado!' });
    }

    const nomeDownload = (fechamento.contrato_nome_original || 'contrato.pdf').replace(/"/g, '');
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fechamento.contrato_arquivo, 60, { download: nomeDownload });

    if (signedError || !signed?.signedUrl) {
      return res.status(500).json({ error: 'Não foi possível gerar URL assinada' });
    }

    res.json({ url: signed.signedUrl, nome: nomeDownload });
  } catch (error) {
    console.error('Erro ao gerar URL do contrato:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/aprovar', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: fechamento, error: fetchError } = await supabase
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    const { data, error } = await supabase
      .from('fechamentos')
      .update({ aprovado: 'aprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      return res.json({ message: 'Fechamento aprovado com sucesso!' });
    }
    
    res.json({ message: 'Fechamento aprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao aprovar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/reprovar', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: fechamento, error: fetchError } = await supabase
      .from('fechamentos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !fechamento) {
      return res.status(404).json({ error: 'Fechamento não encontrado' });
    }
    
    const { data, error } = await supabase
      .from('fechamentos')
      .update({ aprovado: 'reprovado' })
      .eq('id', id)
      .select();
    
    if (error) {
      return res.json({ message: 'Fechamento reprovado com sucesso!' });
    }
    
    res.json({ message: 'Fechamento reprovado com sucesso!' });
  } catch (error) {
    console.error('Erro ao reprovar fechamento:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
