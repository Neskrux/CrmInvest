const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const WhatsAppWebService = require('./whatsapp-web');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Instância global do WhatsApp Web
let whatsappService = null;

// Configuração do Multer para upload seguro
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
    files: 1 // Apenas 1 arquivo por vez
  },
  fileFilter: (req, file, cb) => {
    // Validação básica - validação completa será feita no endpoint
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/avi',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// ===== CONEXÃO WHATSAPP WEB =====

// Inicializar WhatsApp Web
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    if (!whatsappService) {
      whatsappService = new WhatsAppWebService();
      await whatsappService.initialize();
    }

    const status = whatsappService.getStatus();
    res.json({
      success: true,
      status: status.status,
      isConnected: status.isConnected,
      message: 'WhatsApp Web inicializado'
    });
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao conectar WhatsApp' });
  }
});

// Obter status da conexão
router.get('/status', authenticateToken, async (req, res) => {
  try {
    if (!whatsappService) {
      return res.json({
        success: true,
        status: 'not_initialized',
        isConnected: false,
        qrCode: null
      });
    }

    const status = whatsappService.getStatus();
    
    // Buscar QR Code no banco se disponível
    let qrCode = null;
    if (status.status === 'qr_ready') {
      const { data: config } = await supabase
        .from('whatsapp_configuracoes')
        .select('qr_code')
        .eq('id', 1)
        .single();
      
      if (config && config.qr_code) {
        qrCode = config.qr_code;
      }
    }

    res.json({
      success: true,
      status: status.status,
      isConnected: status.isConnected,
      qrCode: qrCode
    });
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

// Desconectar WhatsApp
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    if (whatsappService) {
      await whatsappService.disconnect();
      whatsappService = null;
    }

    // Limpar QR Code do banco
    await supabase
      .from('whatsapp_configuracoes')
      .update({ qr_code: null })
      .eq('id', 1);

    res.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao desconectar WhatsApp' });
  }
});

// ===== CONVERSAS =====

// Buscar conversas
router.get('/conversas', authenticateToken, async (req, res) => {
  try {
    const { data: conversas, error } = await supabase
      .from('whatsapp_conversas')
      .select(`
        *,
        pacientes (
          id,
          nome,
          telefone
        )
      `)
      .order('ultima_mensagem_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: conversas || []
    });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
});

// Buscar mensagens de uma conversa
router.get('/conversas/:id/mensagens', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: mensagens, error } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', id)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: mensagens || []
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// ===== ENVIAR MENSAGENS =====

// Enviar mensagem de texto
router.post('/enviar-mensagem', authenticateToken, async (req, res) => {
  try {
    const { conversa_id, conteudo, mensagem_pai_id } = req.body;

    if (!whatsappService || !whatsappService.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    // Buscar conversa
    const { data: conversa, error: conversaError } = await supabase
      .from('whatsapp_conversas')
      .select('*')
      .eq('id', conversa_id)
      .single();

    if (conversaError || !conversa) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Enviar mensagem via WhatsApp
    const resultado = await whatsappService.enviarMensagem(
      conversa.numero_contato,
      conteudo,
      mensagem_pai_id
    );

    if (resultado.success) {
      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: resultado.data
      });
    } else {
      res.status(400).json({ error: resultado.error });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Enviar mídia
router.post('/enviar-midia', authenticateToken, upload.single('arquivo'), async (req, res) => {
  try {
    const { conversa_id, legenda } = req.body;
    const arquivo = req.file;

    if (!arquivo) {
      return res.status(400).json({ error: 'Arquivo é obrigatório' });
    }

    if (!whatsappService || !whatsappService.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    // Buscar conversa
    const { data: conversa, error: conversaError } = await supabase
      .from('whatsapp_conversas')
      .select('*')
      .eq('id', conversa_id)
      .single();

    if (conversaError || !conversa) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Enviar mídia via WhatsApp
    const resultado = await whatsappService.enviarMidia(
      conversa.numero_contato,
      arquivo,
      legenda
    );

    if (resultado.success) {
      res.json({
        success: true,
        message: 'Mídia enviada com sucesso',
        data: resultado.data
      });
    } else {
      res.status(400).json({ error: resultado.error });
    }
  } catch (error) {
    console.error('Erro ao enviar mídia:', error);
    res.status(500).json({ error: 'Erro ao enviar mídia' });
  }
});

// ===== AUTOMAÇÕES =====

// Buscar automações
router.get('/automatizacoes', authenticateToken, async (req, res) => {
  try {
    const { data: automatizacoes, error } = await supabase
      .from('whatsapp_automatizacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: automatizacoes || []
    });
  } catch (error) {
    console.error('Erro ao buscar automações:', error);
    res.status(500).json({ error: 'Erro ao buscar automações' });
  }
});

// Criar automação
router.post('/automatizacoes', authenticateToken, async (req, res) => {
  try {
    const { nome, trigger, acao, configuracao, ativo } = req.body;

    const { data: automatizacao, error } = await supabase
      .from('whatsapp_automatizacoes')
      .insert({
        nome,
        trigger,
        acao,
        configuracao,
        ativo: ativo || false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: automatizacao,
      message: 'Automação criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar automação:', error);
    res.status(500).json({ error: 'Erro ao criar automação' });
  }
});

// Atualizar automação
router.put('/automatizacoes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, trigger, acao, configuracao, ativo } = req.body;

    const { data: automatizacao, error } = await supabase
      .from('whatsapp_automatizacoes')
      .update({
        nome,
        trigger,
        acao,
        configuracao,
        ativo
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: automatizacao,
      message: 'Automação atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar automação:', error);
    res.status(500).json({ error: 'Erro ao atualizar automação' });
  }
});

// Deletar automação
router.delete('/automatizacoes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('whatsapp_automatizacoes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Automação deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar automação:', error);
    res.status(500).json({ error: 'Erro ao deletar automação' });
  }
});

// ===== VINCULAR PACIENTE =====

// Vincular conversa a paciente
router.post('/conversas/:id/vincular-paciente', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id } = req.body;

    const { data: conversa, error } = await supabase
      .from('whatsapp_conversas')
      .update({ paciente_id })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: conversa,
      message: 'Conversa vinculada ao paciente com sucesso'
    });
  } catch (error) {
    console.error('Erro ao vincular paciente:', error);
    res.status(500).json({ error: 'Erro ao vincular paciente' });
  }
});

// ===== DELETAR CONVERSA =====

// Deletar conversa
router.delete('/conversas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Deletar mensagens primeiro
    await supabase
      .from('whatsapp_mensagens')
      .delete()
      .eq('conversa_id', id);

    // Deletar conversa
    const { error } = await supabase
      .from('whatsapp_conversas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Conversa deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    res.status(500).json({ error: 'Erro ao deletar conversa' });
  }
});

module.exports = router;
