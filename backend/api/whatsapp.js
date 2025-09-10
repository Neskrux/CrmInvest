const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const WhatsAppWebService = require('../whatsapp/whatsapp-web');
const { validateFile } = require('../utils/fileValidator');

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
        .eq('instancia_id', 'whatsapp_web')
        .single();
      
      qrCode = config?.qr_code || whatsappService.qrCode;
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

    res.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao desconectar WhatsApp' });
  }
});

// ===== CONFIGURAÇÕES WHATSAPP =====

// Obter configurações do WhatsApp
router.get('/configuracoes', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_configuracoes')
      .select('*')
      .eq('ativo', true)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar configurações' });
    }

    // Não retornar o token de acesso por segurança
    if (data) {
      delete data.token_acesso;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações do WhatsApp
router.put('/configuracoes', authenticateToken, async (req, res) => {
  try {
    const { instancia_id, token_acesso, numero_telefone, nome_empresa, webhook_url } = req.body;

    const { data, error } = await supabase
      .from('whatsapp_configuracoes')
      .upsert({
        instancia_id,
        token_acesso,
        numero_telefone,
        nome_empresa,
        webhook_url,
        ativo: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }

    // Não retornar o token de acesso
    delete data.token_acesso;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== CONVERSAS WHATSAPP =====

// Listar conversas
router.get('/conversas', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, consultor_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('whatsapp_conversas')
      .select(`
        *,
        pacientes(nome, telefone, status),
        consultores(nome),
        whatsapp_mensagens(id, conteudo, direcao, timestamp_whatsapp)
      `)
      .order('ultima_mensagem_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (consultor_id) {
      query = query.eq('consultor_id', consultor_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar conversas' });
    }

    // Buscar total de conversas para paginação
    const { count } = await supabase
      .from('whatsapp_conversas')
      .select('*', { count: 'exact', head: true });

    res.json({
      conversas: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conversa específica
router.get('/conversas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('whatsapp_conversas')
      .select(`
        *,
        pacientes(*),
        consultores(*),
        whatsapp_mensagens(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar conversa' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir conversa
router.delete('/conversas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Primeiro, excluir todas as mensagens da conversa
    const { error: mensagensError } = await supabase
      .from('whatsapp_mensagens')
      .delete()
      .eq('conversa_id', id);

    if (mensagensError) {
      console.error('Erro ao excluir mensagens:', mensagensError);
      return res.status(500).json({ error: 'Erro ao excluir mensagens da conversa' });
    }

    // Depois, excluir a conversa
    const { error: conversaError } = await supabase
      .from('whatsapp_conversas')
      .delete()
      .eq('id', id);

    if (conversaError) {
      console.error('Erro ao excluir conversa:', conversaError);
      return res.status(500).json({ error: 'Erro ao excluir conversa' });
    }

    res.json({
      success: true,
      message: 'Conversa excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar conversa (vincular paciente, consultor, etc.)
router.put('/conversas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, consultor_id, status, tags, observacoes } = req.body;

    const { data, error } = await supabase
      .from('whatsapp_conversas')
      .update({
        paciente_id,
        consultor_id,
        status,
        tags,
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao atualizar conversa' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== MENSAGENS WHATSAPP =====

// Listar mensagens de uma conversa
router.get('/conversas/:conversaId/mensagens', authenticateToken, async (req, res) => {
  try {
    const { conversaId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('timestamp_whatsapp', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }

    // Buscar total de mensagens
    const { count } = await supabase
      .from('whatsapp_mensagens')
      .select('*', { count: 'exact', head: true })
      .eq('conversa_id', conversaId);

    res.json({
      mensagens: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar mensagem
router.post('/conversas/:conversaId/mensagens', authenticateToken, async (req, res) => {
  try {
    const { conversaId } = req.params;
    const { conteudo, tipo = 'text' } = req.body;

    // Verificar se WhatsApp Web está conectado
    if (!whatsappService || !whatsappService.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado. Conecte primeiro via QR Code.' });
    }

    // Buscar conversa
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('*')
      .eq('id', conversaId)
      .single();

    if (!conversa) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Enviar mensagem via WhatsApp Web
    const message = await whatsappService.sendMessage(conversa.numero_contato, conteudo);

    res.json({
      success: true,
      messageId: message.id._serialized
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem: ' + error.message });
  }
});

// ===== AUTOMAÇÕES WHATSAPP =====

// Listar automações
router.get('/automatizacoes', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_automatizacoes')
      .select('*')
      .order('prioridade', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar automações' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar automação
router.post('/automatizacoes', authenticateToken, async (req, res) => {
  try {
    const { nome, descricao, trigger_tipo, trigger_config, acao_tipo, acao_config, prioridade } = req.body;

    const { data, error } = await supabase
      .from('whatsapp_automatizacoes')
      .insert({
        nome,
        descricao,
        trigger_tipo,
        trigger_config,
        acao_tipo,
        acao_config,
        prioridade: prioridade || 0,
        ativo: true
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao criar automação' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar automação
router.put('/automatizacoes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('whatsapp_automatizacoes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao atualizar automação' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
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

    if (error) {
      return res.status(500).json({ error: 'Erro ao deletar automação' });
    }

    res.json({ message: 'Automação deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== WEBHOOK WHATSAPP =====

// Webhook para receber mensagens do WhatsApp
router.post('/webhook', async (req, res) => {
  try {
    const { body } = req;
    
    // Verificar se é uma mensagem válida
    if (body.entry && body.entry[0] && body.entry[0].changes) {
      const change = body.entry[0].changes[0];
      
      if (change.field === 'messages' && change.value && change.value.messages) {
        const messages = change.value.messages;
        
        for (const message of messages) {
          await processarMensagemRecebida(message, change.value);
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificação do webhook
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verificar token (você deve configurar isso nas suas configurações)
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Token de verificação inválido' });
  }
});

// ===== FUNÇÕES AUXILIARES =====

// Processar mensagem recebida
async function processarMensagemRecebida(message, webhookData) {
  try {
    const numeroContato = message.from;
    const conteudo = message.text?.body || '';
    const tipo = message.type;
    const mensagemId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    // Buscar ou criar conversa
    let { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('*')
      .eq('numero_contato', numeroContato)
      .single();

    if (!conversa) {
      // Criar nova conversa
      const { data: novaConversa } = await supabase
        .from('whatsapp_conversas')
        .insert({
          configuracao_id: 1, // Assumindo configuração padrão
          numero_contato: numeroContato,
          nome_contato: webhookData.contacts?.[0]?.profile?.name || numeroContato,
          ultima_mensagem_at: timestamp.toISOString(),
          status: 'ativa'
        })
        .select()
        .single();

      conversa = novaConversa;
    }

    // Salvar mensagem
    const { data: mensagem } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        conversa_id: conversa.id,
        mensagem_id: mensagemId,
        tipo,
        conteudo,
        direcao: 'inbound',
        status: 'recebida',
        timestamp_whatsapp: timestamp.toISOString()
      })
      .select()
      .single();

    // Atualizar última mensagem da conversa
    await supabase
      .from('whatsapp_conversas')
      .update({ ultima_mensagem_at: timestamp.toISOString() })
      .eq('id', conversa.id);

    // Executar automações
    await executarAutomatizacoes(conversa, mensagem);

    return mensagem;
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    throw error;
  }
}

// Executar automações
async function executarAutomatizacoes(conversa, mensagem) {
  try {
    // Buscar automações ativas
    const { data: automatizacoes } = await supabase
      .from('whatsapp_automatizacoes')
      .select('*')
      .eq('ativo', true)
      .order('prioridade', { ascending: true });

    for (const automatizacao of automatizacoes) {
      try {
        const deveExecutar = await verificarTrigger(automatizacao, conversa, mensagem);
        
        if (deveExecutar) {
          await executarAcao(automatizacao, conversa, mensagem);
          
          // Log da execução
          await supabase
            .from('whatsapp_automatizacao_logs')
            .insert({
              automatizacao_id: automatizacao.id,
              conversa_id: conversa.id,
              mensagem_id: mensagem.id,
              status: 'sucesso',
              resultado: 'Automação executada com sucesso'
            });
        }
      } catch (error) {
        // Log do erro
        await supabase
          .from('whatsapp_automatizacao_logs')
          .insert({
            automatizacao_id: automatizacao.id,
            conversa_id: conversa.id,
            mensagem_id: mensagem.id,
            status: 'erro',
            erro_detalhes: error.message
          });
      }
    }
  } catch (error) {
    console.error('Erro ao executar automações:', error);
  }
}

// Verificar trigger da automação
async function verificarTrigger(automatizacao, conversa, mensagem) {
  const { trigger_tipo, trigger_config } = automatizacao;

  switch (trigger_tipo) {
    case 'mensagem_recebida':
      if (trigger_config.primeira_mensagem) {
        // Verificar se é a primeira mensagem da conversa
        const { count } = await supabase
          .from('whatsapp_mensagens')
          .select('*', { count: 'exact', head: true })
          .eq('conversa_id', conversa.id)
          .eq('direcao', 'inbound');
        
        return count === 1;
      }
      return true;

    case 'palavra_chave':
      if (trigger_config.palavras && mensagem.conteudo) {
        const conteudo = mensagem.conteudo.toLowerCase();
        return trigger_config.palavras.some(palavra => 
          conteudo.includes(palavra.toLowerCase())
        );
      }
      return false;

    case 'horario':
      const agora = new Date();
      const hora = agora.getHours();
      return hora >= trigger_config.hora_inicio && hora <= trigger_config.hora_fim;

    default:
      return false;
  }
}

// Executar ação da automação
async function executarAcao(automatizacao, conversa, mensagem) {
  const { acao_tipo, acao_config } = automatizacao;

  switch (acao_tipo) {
    case 'enviar_mensagem':
      // Enviar mensagem automática
      await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversa.id,
          mensagem_id: `auto_${Date.now()}`,
          tipo: 'text',
          conteudo: acao_config.mensagem,
          direcao: 'outbound',
          status: 'enviada',
          timestamp_whatsapp: new Date().toISOString()
        });
      break;

    case 'criar_lead':
      // Criar lead automaticamente
      await supabase
        .from('pacientes')
        .insert({
          nome: conversa.nome_contato || 'Lead WhatsApp',
          telefone: conversa.numero_contato,
          tipo_tratamento: acao_config.tipo_tratamento || 'Estético',
          status: acao_config.status || 'lead',
          observacoes: acao_config.observacoes || 'Lead criado automaticamente via WhatsApp'
        });
      break;

    case 'atualizar_status':
      // Atualizar status do paciente se vinculado
      if (conversa.paciente_id) {
        await supabase
          .from('pacientes')
          .update({ status: acao_config.status })
          .eq('id', conversa.paciente_id);
      }
      break;
  }
}

// ===== ENVIO DE MENSAGENS =====

// Endpoint específico para enviar mensagem (com suporte a reply)
router.post('/enviar-mensagem', authenticateToken, async (req, res) => {
  try {
    const { numero, mensagem, replyMessageId, replyContent, replyAuthor } = req.body;

    // Verificar se WhatsApp Web está conectado
    if (!whatsappService || !whatsappService.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado. Conecte primeiro via QR Code.' });
    }

    // Enviar mensagem via WhatsApp Web
    let messageResult;
    if (replyMessageId) {
      // Enviar como reply
      messageResult = await whatsappService.sendReplyMessage(numero, mensagem, replyMessageId, {
        content: replyContent,
        author: replyAuthor
      });
    } else {
      // Enviar mensagem normal
      messageResult = await whatsappService.sendMessage(numero, mensagem);
    }

    res.json({
      success: true,
      messageId: messageResult?.id?._serialized || 'unknown'
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem: ' + error.message });
  }
});

// ===== ENDPOINTS DE MÍDIA =====

// Enviar arquivo de mídia
router.post('/enviar-midia', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { numero, caption, replyMessageId } = req.body;
    const file = req.file;

    // Verificar se arquivo foi enviado
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    // Verificar se WhatsApp Web está conectado
    if (!whatsappService || !whatsappService.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado. Conecte primeiro via QR Code.' });
    }

    // Validar arquivo de forma completa
    const validation = validateFile(file);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Arquivo inválido', 
        details: validation.errors 
      });
    }

    let messageResult;
    
    if (replyMessageId) {
      // Enviar como resposta
      messageResult = await whatsappService.sendMediaReply(numero, file, replyMessageId, caption || '');
    } else {
      // Enviar mensagem normal
      messageResult = await whatsappService.sendMediaFile(numero, file, caption || '');
    }

    res.json({
      success: true,
      message: 'Mídia enviada com sucesso',
      messageId: messageResult?.id?._serialized || 'unknown',
      filename: file.originalname,
      size: file.size,
      type: file.mimetype
    });

  } catch (error) {
    console.error('Erro ao enviar mídia:', error);
    res.status(500).json({ error: 'Erro ao enviar mídia: ' + error.message });
  }
});

// Obter estatísticas de armazenamento
router.get('/storage-stats', authenticateToken, async (req, res) => {
  try {
    if (!whatsappService) {
      return res.status(400).json({ error: 'WhatsApp service não inicializado' });
    }

    const stats = await whatsappService.getStorageStats();
    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro ao obter estatísticas: ' + error.message });
  }
});

// Middleware de tratamento de erros do Multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo permitido: 50MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Muitos arquivos. Apenas 1 arquivo por vez é permitido' });
    }
  }
  
  if (error.message === 'Tipo de arquivo não permitido') {
    return res.status(400).json({ error: 'Tipo de arquivo não permitido' });
  }
  
  res.status(500).json({ error: 'Erro interno do servidor' });
});

module.exports = router;
