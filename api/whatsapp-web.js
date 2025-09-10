const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class WhatsAppWebService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.qrCode = null;
    this.connectionStatus = 'disconnected';
    this.connectionMonitorInterval = null;
    this.reconnecting = false;
    this.sentMessages = new Set(); // Para rastrear mensagens enviadas e evitar duplicação
  }

  // Executar scripts de limpeza antes de conectar
  async runCleanupScripts() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      console.log('🧹 Executando scripts de limpeza...');
      
      // 1. Limpar sessões do WhatsApp Web (pasta wwebjs_auth)
      const authPath = path.join(__dirname, '.wwebjs_auth');
      try {
        await fs.rm(authPath, { recursive: true, force: true });
        console.log('✅ Pasta de autenticação WhatsApp limpa');
      } catch (error) {
        console.log('ℹ️ Pasta de autenticação não encontrada (já limpa)');
      }
      
      // 2. Limpar cache do WhatsApp Web
      const cachePath = path.join(__dirname, '.wwebjs_cache');
      try {
        await fs.rm(cachePath, { recursive: true, force: true });
        console.log('✅ Cache WhatsApp limpo');
      } catch (error) {
        console.log('ℹ️ Cache não encontrado (já limpo)');
      }
      
      // 3. Limpar conversas inválidas do banco
      console.log('🗄️ Limpando conversas inválidas do banco...');
      
      // Buscar conversas com numero_contato null ou vazio
      const { data: conversasInvalidas } = await supabase
        .from('whatsapp_conversas')
        .select('id')
        .or('numero_contato.is.null,numero_contato.eq.""');
      
      if (conversasInvalidas && conversasInvalidas.length > 0) {
        const idsInvalidos = conversasInvalidas.map(c => c.id);
        
        // Remover mensagens das conversas inválidas
        await supabase
          .from('whatsapp_mensagens')
          .delete()
          .in('conversa_id', idsInvalidos);
        
        // Remover conversas inválidas
        await supabase
          .from('whatsapp_conversas')
          .delete()
          .in('id', idsInvalidos);
        
        console.log(`✅ ${conversasInvalidas.length} conversas inválidas removidas`);
      } else {
        console.log('✅ Nenhuma conversa inválida encontrada');
      }
      
      // 4. Limpar mensagens órfãs
      const { data: conversasValidas } = await supabase
        .from('whatsapp_conversas')
        .select('id')
        .not('numero_contato', 'is', null)
        .neq('numero_contato', '');
      
      const idsValidos = conversasValidas?.map(c => c.id) || [];
      
      if (idsValidos.length > 0) {
        const { error: errorMensagens } = await supabase
          .from('whatsapp_mensagens')
          .delete()
          .not('conversa_id', 'in', idsValidos);
        
        if (!errorMensagens) {
          console.log('✅ Mensagens órfãs removidas');
        }
      }
      
      console.log('🎉 Scripts de limpeza executados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao executar scripts de limpeza:', error);
    }
  }

  // Inicializar o WhatsApp Web
  async initialize() {
    try {
      console.log('🚀 Inicializando WhatsApp Web...');
      
      // Executar limpeza antes de conectar
      await this.runCleanupScripts();
      
      // Configuração do cliente com argumentos otimizados para serverless
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'crm-whatsapp',
          dataPath: __dirname
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-pings',
            '--password-store=basic',
            '--use-mock-keychain',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
          timeout: 60000
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
      });

      // Configurar eventos
      this.setupEvents();
      
      // Inicializar cliente
      await this.client.initialize();
      
      console.log('✅ WhatsApp Web inicializado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp Web:', error);
      this.connectionStatus = 'error';
      throw error;
    }
  }

  // Configurar eventos do WhatsApp
  setupEvents() {
    // Evento de QR Code
    this.client.on('qr', async (qr) => {
      console.log('📱 QR Code gerado');
      this.qrCode = qr;
      this.connectionStatus = 'qr_ready';
      
      // Salvar QR Code no banco
      try {
        await supabase
          .from('whatsapp_configuracoes')
          .upsert({
            id: 1,
            qr_code: qr,
            status: 'qr_ready',
            updated_at: new Date().toISOString()
          });
        console.log('✅ QR Code salvo no banco');
      } catch (error) {
        console.error('❌ Erro ao salvar QR Code:', error);
      }
    });

    // Evento de conexão
    this.client.on('ready', async () => {
      console.log('✅ WhatsApp Web conectado!');
      this.isConnected = true;
      this.connectionStatus = 'connected';
      this.qrCode = null;
      
      // Limpar QR Code do banco
      try {
        await supabase
          .from('whatsapp_configuracoes')
          .update({
            qr_code: null,
            status: 'connected',
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);
        console.log('✅ Status atualizado no banco');
      } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
      }
      
      // Iniciar monitoramento de conexão
      this.startConnectionMonitoring();
    });

    // Evento de desconexão
    this.client.on('disconnected', async (reason) => {
      console.log('❌ WhatsApp Web desconectado:', reason);
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.qrCode = null;
      
      // Atualizar status no banco
      try {
        await supabase
          .from('whatsapp_configuracoes')
          .update({
            qr_code: null,
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);
      } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
      }
      
      // Parar monitoramento
      this.stopConnectionMonitoring();
    });

    // Evento de mensagem recebida
    this.client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem recebida:', error);
      }
    });

    // Evento de mensagem criada (enviada)
    this.client.on('message_create', async (message) => {
      try {
        await this.handleOutgoingMessage(message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem enviada:', error);
      }
    });
  }

  // Processar mensagem recebida
  async handleIncomingMessage(message) {
    try {
      // Ignorar mensagens de grupos
      if (message.from.includes('@g.us')) {
        return;
      }

      // Ignorar mensagens sem conteúdo
      if (!message.body && !message.hasMedia) {
        return;
      }

      // Ignorar mensagens de status
      if (message.from.includes('status@broadcast')) {
        return;
      }

      // Ignorar mensagens do próprio número
      if (message.fromMe) {
        return;
      }

      const contact = await message.getContact();
      const chat = await message.getChat();
      
      // Ignorar se não conseguir obter contato
      if (!contact || !contact.number) {
        return;
      }

      // Normalizar número do contato
      const numeroContato = contact.number.replace('@c.us', '');
      
      // Ignorar números inválidos
      if (!numeroContato || numeroContato.length < 10) {
        return;
      }

      console.log(`📨 Mensagem recebida de ${numeroContato}: ${message.body || '[Mídia]'}`);

      // Buscar ou criar conversa
      let conversa = await this.findOrCreateConversation(numeroContato, contact.name || contact.pushname || 'Contato');

      if (!conversa) {
        console.error('❌ Erro ao criar/buscar conversa');
        return;
      }

      // Processar mídia se houver
      let conteudoMensagem = message.body || '';
      let tipoMensagem = 'texto';
      let arquivoMensagem = null;
      let nomeArquivo = null;

      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          if (media) {
            tipoMensagem = this.getMediaType(media.mimetype);
            arquivoMensagem = media.data;
            nomeArquivo = media.filename || `media_${Date.now()}.${this.getFileExtension(media.mimetype)}`;
            
            // Salvar arquivo
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(__dirname, 'uploads');
            
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filePath = path.join(uploadsDir, nomeArquivo);
            fs.writeFileSync(filePath, arquivoMensagem, 'base64');
            
            conteudoMensagem = `Mídia: ${tipoMensagem}`;
          }
        } catch (mediaError) {
          console.error('❌ Erro ao processar mídia:', mediaError);
          conteudoMensagem = '[Erro ao processar mídia]';
        }
      }

      // Verificar se é uma resposta
      let mensagemPaiId = null;
      let mensagemPaiConteudo = null;
      let mensagemPaiAutor = null;

      if (message.hasQuotedMsg) {
        try {
          const quotedMessage = await message.getQuotedMessage();
          if (quotedMessage) {
            mensagemPaiConteudo = quotedMessage.body || '[Mídia]';
            mensagemPaiAutor = quotedMessage.fromMe ? 'eu' : 'contato';
            
            // Buscar mensagem pai no banco
            const { data: mensagemPai } = await supabase
              .from('whatsapp_mensagens')
              .select('id')
              .eq('conversa_id', conversa.id)
              .eq('timestamp', new Date(quotedMessage.timestamp * 1000).toISOString())
              .single();
            
            if (mensagemPai) {
              mensagemPaiId = mensagemPai.id;
            }
          }
        } catch (quotedError) {
          console.error('❌ Erro ao processar mensagem citada:', quotedError);
        }
      }

      // Salvar mensagem no banco
      const { data: novaMensagem, error: mensagemError } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversa.id,
          conteudo: conteudoMensagem,
          tipo: tipoMensagem,
          arquivo: nomeArquivo,
          timestamp: new Date(message.timestamp * 1000).toISOString(),
          status: 'recebida',
          mensagem_pai_id: mensagemPaiId,
          mensagem_pai_conteudo: mensagemPaiConteudo,
          mensagem_pai_autor: mensagemPaiAutor
        })
        .select()
        .single();

      if (mensagemError) {
        console.error('❌ Erro ao salvar mensagem:', mensagemError);
        return;
      }

      // Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversas')
        .update({
          ultima_mensagem: conteudoMensagem,
          ultima_mensagem_at: new Date(message.timestamp * 1000).toISOString()
        })
        .eq('id', conversa.id);

      console.log('✅ Mensagem salva com sucesso');

      // Executar automações
      await this.executeAutomations(conversa, novaMensagem);

    } catch (error) {
      console.error('❌ Erro ao processar mensagem recebida:', error);
    }
  }

  // Processar mensagem enviada
  async handleOutgoingMessage(message) {
    try {
      // Ignorar mensagens de grupos
      if (message.from.includes('@g.us')) {
        return;
      }

      // Ignorar mensagens sem conteúdo
      if (!message.body && !message.hasMedia) {
        return;
      }

      // Ignorar mensagens de status
      if (message.from.includes('status@broadcast')) {
        return;
      }

      // Ignorar mensagens que não são do usuário
      if (!message.fromMe) {
        return;
      }

      // Verificar se já processamos esta mensagem
      const messageId = message.id._serialized;
      if (this.sentMessages.has(messageId)) {
        return;
      }

      const contact = await message.getContact();
      const chat = await message.getChat();
      
      // Ignorar se não conseguir obter contato
      if (!contact || !contact.number) {
        return;
      }

      // Normalizar número do contato
      const numeroContato = contact.number.replace('@c.us', '');
      
      // Ignorar números inválidos
      if (!numeroContato || numeroContato.length < 10) {
        return;
      }

      console.log(`📤 Mensagem enviada para ${numeroContato}: ${message.body || '[Mídia]'}`);

      // Buscar conversa
      let conversa = await this.findOrCreateConversation(numeroContato, contact.name || contact.pushname || 'Contato');

      if (!conversa) {
        console.error('❌ Erro ao criar/buscar conversa');
        return;
      }

      // Processar mídia se houver
      let conteudoMensagem = message.body || '';
      let tipoMensagem = 'texto';
      let arquivoMensagem = null;
      let nomeArquivo = null;

      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          if (media) {
            tipoMensagem = this.getMediaType(media.mimetype);
            arquivoMensagem = media.data;
            nomeArquivo = media.filename || `media_${Date.now()}.${this.getFileExtension(media.mimetype)}`;
            
            // Salvar arquivo
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(__dirname, 'uploads');
            
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filePath = path.join(uploadsDir, nomeArquivo);
            fs.writeFileSync(filePath, arquivoMensagem, 'base64');
            
            conteudoMensagem = `Mídia: ${tipoMensagem}`;
          }
        } catch (mediaError) {
          console.error('❌ Erro ao processar mídia:', mediaError);
          conteudoMensagem = '[Erro ao processar mídia]';
        }
      }

      // Verificar se é uma resposta
      let mensagemPaiId = null;
      let mensagemPaiConteudo = null;
      let mensagemPaiAutor = null;

      if (message.hasQuotedMsg) {
        try {
          const quotedMessage = await message.getQuotedMessage();
          if (quotedMessage) {
            mensagemPaiConteudo = quotedMessage.body || '[Mídia]';
            mensagemPaiAutor = quotedMessage.fromMe ? 'eu' : 'contato';
            
            // Buscar mensagem pai no banco
            const { data: mensagemPai } = await supabase
              .from('whatsapp_mensagens')
              .select('id')
              .eq('conversa_id', conversa.id)
              .eq('timestamp', new Date(quotedMessage.timestamp * 1000).toISOString())
              .single();
            
            if (mensagemPai) {
              mensagemPaiId = mensagemPai.id;
            }
          }
        } catch (quotedError) {
          console.error('❌ Erro ao processar mensagem citada:', quotedError);
        }
      }

      // Salvar mensagem no banco
      const { data: novaMensagem, error: mensagemError } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversa.id,
          conteudo: conteudoMensagem,
          tipo: tipoMensagem,
          arquivo: nomeArquivo,
          timestamp: new Date(message.timestamp * 1000).toISOString(),
          status: 'enviada',
          mensagem_pai_id: mensagemPaiId,
          mensagem_pai_conteudo: mensagemPaiConteudo,
          mensagem_pai_autor: mensagemPaiAutor
        })
        .select()
        .single();

      if (mensagemError) {
        console.error('❌ Erro ao salvar mensagem:', mensagemError);
        return;
      }

      // Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversas')
        .update({
          ultima_mensagem: conteudoMensagem,
          ultima_mensagem_at: new Date(message.timestamp * 1000).toISOString()
        })
        .eq('id', conversa.id);

      // Marcar mensagem como processada
      this.sentMessages.add(messageId);

      console.log('✅ Mensagem enviada salva com sucesso');

    } catch (error) {
      console.error('❌ Erro ao processar mensagem enviada:', error);
    }
  }

  // Buscar ou criar conversa
  async findOrCreateConversation(numeroContato, nomeContato) {
    try {
      // Buscar conversa existente
      const { data: conversaExistente, error: buscaError } = await supabase
        .from('whatsapp_conversas')
        .select('*')
        .eq('numero_contato', numeroContato)
        .single();

      if (buscaError && buscaError.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar conversa:', buscaError);
        return null;
      }

      if (conversaExistente) {
        return conversaExistente;
      }

      // Criar nova conversa
      const { data: novaConversa, error: createError } = await supabase
        .from('whatsapp_conversas')
        .insert({
          numero_contato: numeroContato,
          nome_contato: nomeContato,
          ultima_mensagem: null,
          ultima_mensagem_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar conversa:', createError);
        return null;
      }

      console.log(`✅ Nova conversa criada: ${nomeContato} (${numeroContato})`);
      return novaConversa;

    } catch (error) {
      console.error('❌ Erro ao buscar/criar conversa:', error);
      return null;
    }
  }

  // Executar automações
  async executeAutomations(conversa, mensagem) {
    try {
      // Buscar automações ativas
      const { data: automatizacoes, error } = await supabase
        .from('whatsapp_automatizacoes')
        .select('*')
        .eq('ativo', true);

      if (error || !automatizacoes) {
        return;
      }

      for (const automacao of automatizacoes) {
        try {
          await this.processAutomation(automacao, conversa, mensagem);
        } catch (automationError) {
          console.error(`❌ Erro ao executar automação ${automacao.nome}:`, automationError);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao executar automações:', error);
    }
  }

  // Processar automação individual
  async processAutomation(automacao, conversa, mensagem) {
    try {
      const config = automacao.configuracao;
      
      // Verificar trigger
      let shouldExecute = false;
      
      switch (automacao.trigger) {
        case 'palavra_chave':
          if (config.palavra_chave && mensagem.conteudo.toLowerCase().includes(config.palavra_chave.toLowerCase())) {
            shouldExecute = true;
          }
          break;
          
        case 'primeira_mensagem':
          // Verificar se é a primeira mensagem da conversa
          const { data: mensagensAnteriores } = await supabase
            .from('whatsapp_mensagens')
            .select('id')
            .eq('conversa_id', conversa.id)
            .neq('id', mensagem.id);
          
          if (!mensagensAnteriores || mensagensAnteriores.length === 0) {
            shouldExecute = true;
          }
          break;
          
        case 'horario_especifico':
          const agora = new Date();
          const horaAtual = agora.getHours();
          const minutoAtual = agora.getMinutes();
          
          if (config.hora_inicio && config.hora_fim) {
            const [horaInicio, minutoInicio] = config.hora_inicio.split(':').map(Number);
            const [horaFim, minutoFim] = config.hora_fim.split(':').map(Number);
            
            const tempoAtual = horaAtual * 60 + minutoAtual;
            const tempoInicio = horaInicio * 60 + minutoInicio;
            const tempoFim = horaFim * 60 + minutoFim;
            
            if (tempoAtual >= tempoInicio && tempoAtual <= tempoFim) {
              shouldExecute = true;
            }
          }
          break;
      }
      
      if (!shouldExecute) {
        return;
      }
      
      // Executar ação
      switch (automacao.acao) {
        case 'enviar_mensagem':
          if (config.mensagem) {
            await this.enviarMensagem(conversa.numero_contato, config.mensagem);
          }
          break;
      }
      
      // Registrar log da automação
      await supabase
        .from('whatsapp_automatizacao_logs')
        .insert({
          automatizacao_id: automacao.id,
          conversa_id: conversa.id,
          mensagem_id: mensagem.id,
          status: 'executada',
          created_at: new Date().toISOString()
        });
      
    } catch (error) {
      console.error('❌ Erro ao processar automação:', error);
    }
  }

  // Enviar mensagem
  async enviarMensagem(numeroContato, conteudo, mensagemPaiId = null) {
    try {
      if (!this.client || !this.isConnected) {
        return { success: false, error: 'WhatsApp não conectado' };
      }

      const chatId = `${numeroContato}@c.us`;
      
      let resultado;
      
      if (mensagemPaiId) {
        // Buscar mensagem pai para responder
        const { data: mensagemPai } = await supabase
          .from('whatsapp_mensagens')
          .select('*')
          .eq('id', mensagemPaiId)
          .single();
        
        if (mensagemPai) {
          // Buscar mensagem original no WhatsApp
          const messages = await this.client.getMessages(chatId, { limit: 100 });
          const originalMessage = messages.find(msg => 
            msg.body === mensagemPai.conteudo && 
            new Date(msg.timestamp * 1000).toISOString() === mensagemPai.timestamp
          );
          
          if (originalMessage) {
            resultado = await originalMessage.reply(conteudo);
          } else {
            resultado = await this.client.sendMessage(chatId, conteudo);
          }
        } else {
          resultado = await this.client.sendMessage(chatId, conteudo);
        }
      } else {
        resultado = await this.client.sendMessage(chatId, conteudo);
      }

      return { success: true, data: resultado };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar mídia
  async enviarMidia(numeroContato, arquivo, legenda = '') {
    try {
      if (!this.client || !this.isConnected) {
        return { success: false, error: 'WhatsApp não conectado' };
      }

      const chatId = `${numeroContato}@c.us`;
      
      // Criar MessageMedia
      const media = new MessageMedia(arquivo.mimetype, arquivo.buffer.toString('base64'), arquivo.originalname);
      
      // Enviar mídia
      const resultado = await this.client.sendMessage(chatId, media, { caption: legenda });

      return { success: true, data: resultado };
    } catch (error) {
      console.error('❌ Erro ao enviar mídia:', error);
      return { success: false, error: error.message };
    }
  }

  // Obter status da conexão
  getStatus() {
    return {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      qrCode: this.qrCode
    };
  }

  // Desconectar
  async disconnect() {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }
      
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.qrCode = null;
      
      this.stopConnectionMonitoring();
      
      console.log('✅ WhatsApp Web desconectado');
    } catch (error) {
      console.error('❌ Erro ao desconectar WhatsApp:', error);
    }
  }

  // Iniciar monitoramento de conexão
  startConnectionMonitoring() {
    this.connectionMonitorInterval = setInterval(async () => {
      try {
        if (this.client && this.isConnected) {
          const state = await this.client.getState();
          if (state !== 'CONNECTED') {
            console.log('⚠️ Conexão perdida, tentando reconectar...');
            this.isConnected = false;
            this.connectionStatus = 'reconnecting';
            this.reconnecting = true;
            
            // Tentar reconectar
            setTimeout(() => {
              this.initialize();
            }, 5000);
          }
        }
      } catch (error) {
        console.error('❌ Erro no monitoramento de conexão:', error);
      }
    }, 30000); // Verificar a cada 30 segundos
  }

  // Parar monitoramento de conexão
  stopConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
  }

  // Obter tipo de mídia
  getMediaType(mimetype) {
    if (mimetype.startsWith('image/')) return 'imagem';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf') return 'documento';
    return 'arquivo';
  }

  // Obter extensão do arquivo
  getFileExtension(mimetype) {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/avi': 'avi',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf',
      'audio/ptt': 'ogg' // WhatsApp PTT é OGG
    };
    
    return extensions[mimetype] || 'bin';
  }
}

module.exports = WhatsAppWebService;
