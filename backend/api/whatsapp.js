const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const WhatsAppWebService = require('../whatsapp/whatsapp-web');
const WhatsAppFallback = require('../whatsapp-fallback');
const { validateFile } = require('../utils/fileValidator');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Instâncias do WhatsApp Web por usuário
const whatsappServices = new Map();

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

// Cache de configurações para evitar verificações repetidas
const configCache = new Map();

// Função auxiliar para obter ou criar configuração do WhatsApp do usuário
async function getWhatsAppConfigByUser(userId) {
  // Verificar cache primeiro
  if (configCache.has(userId)) {
    return configCache.get(userId);
  }

  try {
    // Primeiro, verificar se o usuário existe na tabela usuarios
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', userId)
      .single();

    let userIdValido = userId;
    let isConsultor = false;
    
    if (usuarioError && usuarioError.code === 'PGRST116') {
      // Usuário não existe em usuarios, verificar em consultores
      const { data: consultor, error: consultorError } = await supabase
        .from('consultores')
        .select('id')
        .eq('id', userId)
        .single();

      if (consultorError || !consultor) {
        console.error(`Usuário ${userId} não encontrado em usuarios nem consultores`);
        return null;
      }
      
      isConsultor = true;
    } else if (usuarioError) {
      console.error('Erro ao verificar usuário:', usuarioError);
      return null;
    }

    // Para consultores, buscar por consultor_id; para usuários, por usuario_id
    let query = supabase
      .from('whatsapp_configuracoes')
      .select('*')
      .eq('ativo', true);
      
    if (isConsultor) {
      query = query.eq('consultor_id', userIdValido);
    } else {
      query = query.eq('usuario_id', userIdValido);
    }
    
    let { data, error } = await query.single();

    if (error && error.code === 'PGRST116') { // PGRST116 = no rows returned
      // Configuração não existe, criar uma nova
      console.log(`🔧 Criando nova configuração para usuário ${userIdValido}...`);
      
      const configData = {
        instancia_id: `whatsapp-user-${userIdValido}`,
        token_acesso: 'auto-generated',
        numero_telefone: '',
        nome_empresa: `Usuário ${userIdValido}`,
        ativo: true
      };
      
      // Para consultores, usar consultor_id; para usuários, usar usuario_id
      if (isConsultor) {
        configData.consultor_id = userIdValido;
      } else {
        configData.usuario_id = userIdValido;
      }
      
      const { data: novaConfig, error: createError } = await supabase
        .from('whatsapp_configuracoes')
        .insert(configData)
        .select('*')
        .single();

      if (createError) {
        console.error('Erro ao criar configuração:', createError);
        return null;
      }

      data = novaConfig;
      console.log(`✅ Nova configuração criada para usuário ${userIdValido}: config_id=${data.id}`);
    } else if (error) {
      console.error('Erro ao buscar configuração:', error);
      return null;
    }

    // Armazenar no cache
    configCache.set(userId, data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar/criar configuração do WhatsApp:', error);
    return null;
  }
}

// ===== CONEXÃO WHATSAPP WEB =====

// Inicializar WhatsApp Web
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Se já existe uma instância para este usuário, desconectar completamente primeiro
    if (whatsappServices.has(userId)) {
      console.log(`🔄 Desconectando instância anterior do usuário ${userId}...`);
      const existingService = whatsappServices.get(userId);
      await existingService.disconnect();
      whatsappServices.delete(userId);
      
      // Aguardar um pouco para garantir que a limpeza foi concluída
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`🚀 Criando nova instância do WhatsApp para usuário ${userId}...`);
    
    try {
      const whatsappService = new WhatsAppWebService(userId);
      whatsappServices.set(userId, whatsappService);
      
      await whatsappService.initialize(0, true);
      const status = whatsappService.getStatus();
      
      res.json({
        success: true,
        status: status.status,
        isConnected: status.isConnected,
        qrCode: status.qrCode,
        message: 'WhatsApp Web inicializado com sucesso'
      });
    } catch (whatsappError) {
      console.error('❌ WhatsApp Web falhou, usando fallback:', whatsappError.message);
      
      // Usar fallback quando WhatsApp Web falha
      const fallbackService = new WhatsAppFallback();
      whatsappServices.set(userId, fallbackService);
      
      const fallbackResult = await fallbackService.connect();
      
      res.json({
        success: false,
        status: 'unavailable',
        isConnected: false,
        qrCode: null,
        message: fallbackResult.message,
        alternative: fallbackResult.alternative,
        fallback: true
      });
    }
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao conectar WhatsApp: ' + error.message });
  }
});

// Obter status da conexão
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar instância específica do usuário
    const whatsappService = whatsappServices.get(userId);
    
    if (!whatsappService) {
      return res.json({
        success: true,
        status: 'not_initialized',
        isConnected: false,
        qrCode: null
      });
    }

    const status = whatsappService.getStatus();
    
    // Verificar se o cliente está realmente funcional
    const isFunctional = await whatsappService.isClientFunctional();
    
    // Se não está funcional, atualizar status
    if (status.isConnected && !isFunctional) {
      console.log('⚠️ Cliente marcado como conectado mas não está funcional');
      whatsappService.isConnected = false;
      whatsappService.connectionStatus = 'disconnected';
      await whatsappService.updateConnectionStatus('disconnected');
      
      return res.json({
        success: true,
        status: 'disconnected',
        isConnected: false,
        qrCode: null
      });
    }
    
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
      isConnected: status.isConnected && isFunctional,
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
    const userId = req.user.id;
    
    // Buscar e desconectar instância específica do usuário
    const whatsappService = whatsappServices.get(userId);
    if (whatsappService) {
      await whatsappService.disconnect();
      whatsappServices.delete(userId);
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
    const userId = req.user.id;

    // Buscar configuração específica do usuário
    const config = await getWhatsAppConfigByUser(userId);
    if (!config) {
      return res.status(404).json({ error: 'Configuração do WhatsApp não encontrada para este usuário' });
    }

    // Não retornar o token de acesso por segurança
    delete config.token_acesso;

    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações do WhatsApp
router.put('/configuracoes', authenticateToken, async (req, res) => {
  try {
    const { instancia_id, token_acesso, numero_telefone, nome_empresa, webhook_url } = req.body;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('whatsapp_configuracoes')
      .upsert({
        usuario_id: userId, // CRÍTICO: associar configuração ao usuário logado
        instancia_id,
        token_acesso,
        numero_telefone,
        nome_empresa,
        webhook_url,
        ativo: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'usuario_id' // Atualizar se já existe configuração para este usuário
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar configurações:', error);
      return res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }

    // Não retornar o token de acesso
    delete data.token_acesso;

    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== CONVERSAS WHATSAPP =====

// Listar conversas
router.get('/conversas', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, consultor_id } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Buscar configuração do WhatsApp do usuário
    const config = await getWhatsAppConfigByUser(userId);
    if (!config) {
      return res.status(404).json({ error: 'Configuração do WhatsApp não encontrada para este usuário' });
    }

    // Para consultores, filtrar por instancia_id que contém o ID real do usuário
    let query = supabase
      .from('whatsapp_conversas')
      .select(`
        *,
        pacientes(nome, telefone, status),
        consultores(nome),
        whatsapp_mensagens(id, conteudo, direcao, timestamp_whatsapp)
      `)
      .eq('configuracao_id', config.id) // FILTRO CRÍTICO: apenas conversas da configuração do usuário
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

    // Buscar total de conversas para paginação (com filtro de configuração)
    const { count } = await supabase
      .from('whatsapp_conversas')
      .select('*', { count: 'exact', head: true })
      .eq('configuracao_id', config.id);

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
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conversa específica
router.get('/conversas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Buscar configuração do WhatsApp do usuário
    const config = await getWhatsAppConfigByUser(userId);
    if (!config) {
      return res.status(404).json({ error: 'Configuração do WhatsApp não encontrada para este usuário' });
    }

    const { data, error } = await supabase
      .from('whatsapp_conversas')
      .select(`
        *,
        pacientes(*),
        consultores(*),
        whatsapp_mensagens(*)
      `)
      .eq('id', id)
      .eq('configuracao_id', config.id) // FILTRO CRÍTICO: verificar se a conversa pertence ao usuário
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Conversa não encontrada ou você não tem acesso a ela' });
      }
      return res.status(500).json({ error: 'Erro ao buscar conversa' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
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
    const userId = req.user.id;

    // Buscar configuração do WhatsApp do usuário
    const config = await getWhatsAppConfigByUser(userId);
    if (!config) {
      return res.status(404).json({ error: 'Configuração do WhatsApp não encontrada para este usuário' });
    }

    // Verificar se a conversa pertence ao usuário
    const { data: conversa, error: conversaError } = await supabase
      .from('whatsapp_conversas')
      .select('id')
      .eq('id', conversaId)
      .eq('configuracao_id', config.id)
      .single();

    if (conversaError || !conversa) {
      return res.status(404).json({ error: 'Conversa não encontrada ou você não tem acesso a ela' });
    }

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
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar mensagem
router.post('/conversas/:conversaId/mensagens', authenticateToken, async (req, res) => {
  try {
    const { conversaId } = req.params;
    const { conteudo, tipo = 'text' } = req.body;
    const userId = req.user.id;

    // Buscar instância específica do usuário
    const userWhatsappService = whatsappServices.get(userId);
    if (!userWhatsappService || !userWhatsappService.isConnected) {
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
    const message = await userWhatsappService.sendMessage(conversa.numero_contato, conteudo);

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
      // Para webhooks, usar configuração do admin (usuario_id = 1)
      // NOTA: Webhooks não têm contexto de usuário, então usamos configuração do admin
      const { data: configAdmin, error: configError } = await supabase
        .from('whatsapp_configuracoes')
        .select('id')
        .eq('usuario_id', 1)
        .eq('ativo', true)
        .single();
        
      if (configError || !configAdmin) {
        console.error('❌ Erro: Configuração do admin não encontrada para webhook');
        return;
      }
      
      // Criar nova conversa
      const { data: novaConversa } = await supabase
        .from('whatsapp_conversas')
        .insert({
          configuracao_id: configAdmin.id,
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
    const userId = req.user.id;

    // Buscar instância específica do usuário
    const userWhatsappService = whatsappServices.get(userId);
    if (!userWhatsappService || !userWhatsappService.isConnected) {
      return res.status(400).json({ error: 'WhatsApp não está conectado. Conecte primeiro via QR Code.' });
    }

    // Enviar mensagem via WhatsApp Web
    let messageResult;
    if (replyMessageId) {
      // Enviar como reply
      messageResult = await userWhatsappService.sendReplyMessage(numero, mensagem, replyMessageId, {
        content: replyContent,
        author: replyAuthor
      });
    } else {
      // Enviar mensagem normal
      messageResult = await userWhatsappService.sendMessage(numero, mensagem);
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
    const userId = req.user.id;

    // Verificar se arquivo foi enviado
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    // Buscar instância específica do usuário
    const userWhatsappService = whatsappServices.get(userId);
    if (!userWhatsappService || !userWhatsappService.isConnected) {
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
      messageResult = await userWhatsappService.sendMediaReply(numero, file, replyMessageId, caption || '');
    } else {
      // Enviar mensagem normal
      messageResult = await userWhatsappService.sendMediaFile(numero, file, caption || '');
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
