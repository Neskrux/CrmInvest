const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken, authenticateUpload } = require('../middleware/auth');

// Configurar multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Listar contratos de uma solicitação
router.get('/contratos-carteira/:solicitacaoId', authenticateToken, async (req, res) => {
  try {
    const { solicitacaoId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('contratos_carteira')
      .select('*')
      .eq('solicitacao_carteira_id', solicitacaoId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao listar contratos:', error);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
});

// Teste simples primeiro
router.post('/contratos-carteira/test', (req, res) => {
  console.log('🧪 Teste de rota funcionando');
  res.json({ message: 'Rota funcionando' });
});

// Upload de contrato individual
router.post('/contratos-carteira/upload', authenticateUpload, upload.single('arquivo'), async (req, res) => {
  try {
    console.log('📤 Upload de contrato iniciado');
    console.log('📤 Body:', req.body);
    console.log('📤 File:', req.file ? 'Arquivo recebido' : 'Nenhum arquivo');
    
    // Apenas clínicas podem fazer upload
    if (req.user.tipo !== 'clinica') {
      return res.status(403).json({ error: 'Apenas clínicas podem fazer upload de contratos' });
    }

    const { solicitacao_carteira_id, paciente_cpf, paciente_nome } = req.body;

    if (!req.file) {
      console.log('❌ Arquivo não encontrado');
      return res.status(400).json({ error: 'Arquivo não encontrado' });
    }

    // Upload para Supabase Storage
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `contratos/${solicitacao_carteira_id}/${paciente_cpf}_${Date.now()}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documentos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Obter URL pública do arquivo
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documentos')
      .getPublicUrl(fileName);

    // Criar registro no banco
    const { data, error } = await supabaseAdmin
      .from('contratos_carteira')
      .insert([{
        solicitacao_carteira_id,
        paciente_cpf,
        paciente_nome,
        arquivo_url: publicUrl,
        arquivo_nome: req.file.originalname,
        status: 'pendente'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar registro no banco:', error);
      throw error;
    }

    console.log('✅ Contrato criado no banco:', data);

    // Atualizar etapa da solicitação
    await supabaseAdmin
      .from('solicitacoes_carteira')
      .update({ etapa_aprovacao: 'contratos_enviados' })
      .eq('id', solicitacao_carteira_id);

    console.log('✅ Upload concluído com sucesso');
    res.json(data);
  } catch (error) {
    console.error('❌ Erro ao fazer upload de contrato:', error);
    res.status(500).json({ error: 'Erro ao fazer upload de contrato: ' + error.message });
  }
});

// Aprovar contrato
router.post('/contratos-carteira/:id/aprovar', authenticateToken, async (req, res) => {
  try {
    // Apenas admin pode aprovar
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar contratos' });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('contratos_carteira')
      .update({
        status: 'aprovado',
        aprovado_por: req.user.id,
        data_aprovacao: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao aprovar contrato:', error);
    res.status(500).json({ error: 'Erro ao aprovar contrato' });
  }
});

// Reprovar contrato com motivo
router.post('/contratos-carteira/:id/reprovar', authenticateToken, async (req, res) => {
  try {
    // Apenas admin pode reprovar
    if (req.user.tipo !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem reprovar contratos' });
    }

    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: 'Motivo da reprovação é obrigatório' });
    }

    const { data, error } = await supabaseAdmin
      .from('contratos_carteira')
      .update({
        status: 'reprovado',
        motivo_reprovacao: motivo,
        reprovado_por: req.user.id,
        data_reprovacao: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao reprovar contrato:', error);
    res.status(500).json({ error: 'Erro ao reprovar contrato' });
  }
});

// Deletar contrato
router.delete('/contratos-carteira/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Clínicas podem deletar apenas seus próprios contratos pendentes
    if (req.user.tipo === 'clinica') {
      const { data: contrato } = await supabaseAdmin
        .from('contratos_carteira')
        .select('*, solicitacoes_carteira!inner(clinica_id)')
        .eq('id', id)
        .single();

      if (!contrato || contrato.solicitacoes_carteira.clinica_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este contrato' });
      }

      if (contrato.status !== 'pendente') {
        return res.status(403).json({ error: 'Apenas contratos pendentes podem ser deletados' });
      }
    }

    const { error } = await supabaseAdmin
      .from('contratos_carteira')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar contrato:', error);
    res.status(500).json({ error: 'Erro ao deletar contrato' });
  }
});

module.exports = router;

