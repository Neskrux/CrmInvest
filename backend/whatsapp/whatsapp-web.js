const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const SecureStorage = require('../utils/secureStorage');
const { validateFile } = require('../utils/fileValidator');

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
    this.secureStorage = new SecureStorage(); // Sistema de armazenamento seguro
  }

  // Executar scripts de limpeza antes de conectar
  async runCleanupScripts() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      console.log('🧹 Executando scripts de limpeza...');
      
      // 1. Limpar sessões do WhatsApp Web (pasta wwebjs_auth)
      const authPath = path.join(__dirname, '..', '.wwebjs_auth');
      try {
        await fs.rm(authPath, { recursive: true, force: true });
        console.log('✅ Pasta de autenticação WhatsApp limpa');
      } catch (error) {
        console.log('ℹ️ Pasta de autenticação não encontrada (já limpa)');
      }
      
      // 2. Limpar cache do WhatsApp Web
      const cachePath = path.join(__dirname, '..', '.wwebjs_cache');
      try {
        await fs.rm(cachePath, { recursive: true, force: true });
        console.log('✅ Cache WhatsApp limpo');
      } catch (error) {
        console.log('ℹ️ Cache não encontrado (já limpo)');
      }
      
      // 3. Limpar pasta de sessão específica do cliente (se existir)
      const clientAuthPath = path.join(__dirname, '..', '.wwebjs_auth', 'session-crm-whatsapp');
      try {
        await fs.rm(clientAuthPath, { recursive: true, force: true });
        console.log('✅ Sessão específica do cliente limpa');
      } catch (error) {
        console.log('ℹ️ Sessão específica não encontrada (já limpa)');
      }
      
      // 4. Limpar pasta de sessão em produção (Railway)
      const prodAuthPath = '/tmp/.wwebjs_auth';
      try {
        await fs.rm(prodAuthPath, { recursive: true, force: true });
        console.log('✅ Pasta de autenticação de produção limpa');
      } catch (error) {
        console.log('ℹ️ Pasta de produção não encontrada (já limpa)');
      }
      
      // 5. Limpar conversas inválidas do banco
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
      
      // 6. Limpar mensagens órfãs
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
      // Não interromper a conexão por causa de erro na limpeza
    }
  }

  // Inicializar cliente WhatsApp
  async initialize(retryCount = 0, forceCleanup = false) {
    const maxRetries = 3;
    
    try {
      // Executar scripts de limpeza na primeira tentativa ou quando forçado
      if (retryCount === 0 || forceCleanup) {
        await this.runCleanupScripts();
      }
      
      // Limpar cliente anterior se existir
      if (this.client) {
        try {
          // Remover todos os event listeners antes de destruir
          this.client.removeAllListeners();
          await this.client.destroy();
        } catch (e) {
          console.log('Limpeza de cliente anterior...');
        }
        this.client = null;
      }
      
      // Resetar estados
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.qrCode = null;
      this.reconnecting = false;
      // Configuração para ambiente de produção (Railway)
      const authStrategy = process.env.NODE_ENV === 'production' 
        ? new LocalAuth({
            clientId: "crm-whatsapp",
            dataPath: "/tmp/.wwebjs_auth" // Usar diretório temporário no Railway
          })
        : new LocalAuth({
            clientId: "crm-whatsapp"
          });

      this.client = new Client({
        authStrategy: authStrategy,
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--disable-default-apps',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-background-networking',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-report-upload',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-domain-reliability',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-downloads',
            '--disable-add-to-shelf',
            '--disable-client-side-phishing-detection',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-windows10-custom-titlebar',
            '--safebrowsing-disable-auto-update',
            '--enable-automation',
            '--password-store=basic',
            '--use-mock-keychain',
            // Argumentos específicos para melhor persistência
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-blink-features=AutomationControlled',
            '--no-default-browser-check',
            '--disable-extensions-file-access-check',
            '--disable-features=VizDisplayCompositor',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-logging',
            '--disable-login-animations',
            '--disable-notifications'
          ],
          // Timeouts mais generosos para resistir a hibernação
          timeout: 180000, // 3 minutos
          protocolTimeout: 180000, // 3 minutos
          defaultViewport: null,
          // Configurações adicionais para estabilidade
          devtools: false,
          slowMo: 0,
          ignoreDefaultArgs: ['--disable-extensions'],
          handleSIGINT: false,
          handleSIGTERM: false,
          handleSIGHUP: false
        }
      });

      // Evento: QR Code gerado
      this.client.on('qr', async (qr) => {
        this.qrCode = qr;
        this.connectionStatus = 'qr_ready';
        
        // Salvar QR Code no banco para o frontend acessar
        await this.saveQRCode(qr);
      });

      // Evento: Cliente pronto
      this.client.on('ready', async () => {
        console.log('✅ WhatsApp Web conectado com sucesso!');
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.qrCode = null;
        
        // Atualizar status no banco
        await this.updateConnectionStatus('connected');
      });

      // Evento: Mensagem recebida
      this.client.on('message', async (message) => {
        console.log('📨 Evento message disparado:', {
          id: message.id._serialized,
          from: message.from,
          body: message.body?.substring(0, 50),
          hasMedia: message.hasMedia,
          timestamp: new Date(message.timestamp * 1000).toISOString()
        });
        await this.handleIncomingMessage(message);
      });

      // Evento: Mensagem enviada (para sincronizar mensagens do celular)
      this.client.on('message_create', async (message) => {
        console.log('📤 Evento message_create disparado:', {
          id: message.id._serialized,
          from: message.from,
          to: message.to,
          body: message.body?.substring(0, 50),
          fromMe: message.fromMe,
          hasMedia: message.hasMedia,
          timestamp: new Date(message.timestamp * 1000).toISOString()
        });
        await this.handleOutgoingMessage(message);
      });

      // Evento: Cliente desconectado
      this.client.on('disconnected', async (reason) => {
        console.log('❌ WhatsApp Web desconectado:', reason);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.qrCode = null;
        await this.updateConnectionStatus('disconnected');
        
        // Parar monitoramento para evitar loops
        this.stopConnectionMonitoring();
        
        // NÃO reconectar automaticamente - deixar para o usuário reconectar manualmente
        console.log('ℹ️ Desconectado. Use o botão "Conectar" para reconectar manualmente.');
      });

      // Evento: Estado de autenticação mudou
      this.client.on('auth_failure', async (message) => {
        console.error('❌ Falha na autenticação:', message);
        await this.updateConnectionStatus('auth_failure');
      });

      // Monitoramento de conexão a cada 30 segundos
      this.startConnectionMonitoring();

      // Evento: Autenticação falhou
      this.client.on('auth_failure', async (msg) => {
        console.log('❌ Falha na autenticação WhatsApp:', msg);
        this.connectionStatus = 'auth_failed';
        await this.updateConnectionStatus('auth_failed');
      });

      // Inicializar cliente
      await this.client.initialize();
      
    } catch (error) {
      console.error(`❌ Erro ao inicializar WhatsApp Web (tentativa ${retryCount + 1}):`, error.message);
      
      // Se não atingiu o máximo de tentativas, tenta novamente
      if (retryCount < maxRetries) {
        console.log(`🔄 Tentando novamente em 5 segundos... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.initialize(retryCount + 1);
      }
      
      this.connectionStatus = 'error';
      throw error;
    }
  }

  // Salvar QR Code no banco
  async saveQRCode(qr) {
    try {
      await supabase
        .from('whatsapp_configuracoes')
        .upsert({
          instancia_id: 'whatsapp_web',
          qr_code: qr,
          status_conexao: 'qr_ready',
          ativo: true,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Erro ao salvar QR Code:', error);
    }
  }

  // Atualizar status da conexão
  async updateConnectionStatus(status) {
    try {
      await supabase
        .from('whatsapp_configuracoes')
        .upsert({
          instancia_id: 'whatsapp_web',
          status_conexao: status,
          ativo: status === 'connected',
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }

  // Monitoramento periódico da conexão
  startConnectionMonitoring() {
    // Monitorar a cada 15 segundos para detectar problemas mais rapidamente
    this.connectionMonitorInterval = setInterval(async () => {
      try {
        if (this.client && this.isConnected) {
          // Verificar se o cliente ainda está respondendo
          const state = await this.client.getState();
          if (state !== 'CONNECTED') {
            console.log('⚠️ Estado da conexão mudou:', state);
            if (state === 'DISCONNECTED' || state === 'NAVIGATING') {
              this.isConnected = false;
              this.connectionStatus = 'disconnected';
              this.qrCode = null;
              await this.updateConnectionStatus('disconnected');
              // NÃO reconectar automaticamente - apenas marcar como desconectado
              console.log('ℹ️ Conexão perdida. Use o botão "Conectar" para reconectar.');
            }
          }
        }
      } catch (error) {
        console.error('Erro no monitoramento de conexão:', error);
        // Se não conseguir verificar o estado, assumir desconectado
        if (this.isConnected) {
          this.isConnected = false;
          this.connectionStatus = 'disconnected';
          this.qrCode = null;
          await this.updateConnectionStatus('disconnected');
          console.log('ℹ️ Erro na verificação de conexão. Use o botão "Conectar" para reconectar.');
        }
      }
    }, 15000); // 15 segundos
    
    console.log('📡 Monitoramento de conexão iniciado');
  }

  // Parar monitoramento
  stopConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
      console.log('📡 Monitoramento de conexão parado');
    }
  }

  // Tentativa de reconexão automática
  async attemptReconnection() {
    if (this.reconnecting) {
      console.log('⏳ Reconexão já em andamento...');
      return;
    }
    
    this.reconnecting = true;
    const maxRetries = 5;
    let retryCount = 0;
    
    while (retryCount < maxRetries && !this.isConnected) {
      retryCount++;
      console.log(`🔄 Tentativa de reconexão ${retryCount}/${maxRetries}`);
      
      try {
        await this.initialize(retryCount);
        break; // Sucesso na reconexão
      } catch (error) {
        console.error(`❌ Erro na tentativa ${retryCount}:`, error.message);
        
        if (retryCount < maxRetries) {
          const waitTime = Math.min(retryCount * 30000, 300000); // Max 5 minutos
          console.log(`⏸️ Aguardando ${waitTime/1000} segundos antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    this.reconnecting = false;
    
    if (!this.isConnected) {
      console.error('❌ Falha em todas as tentativas de reconexão');
    }
  }

  // Obter extensão do arquivo baseado no tipo de mensagem e mimetype
  getFileExtension(messageType, mimetype) {
    // Mapeamento de tipos de mensagem para extensões
    const typeExtensions = {
      'audio': '.ogg',
      'voice': '.ogg',
      'ptt': '.ogg', // Push-to-talk (áudio de WhatsApp)
      'image': '.jpg',
      'video': '.mp4',
      'document': '.pdf'
    };

    // Mapeamento de mimetypes para extensões
    const mimetypeExtensions = {
      'audio/ogg': '.ogg',
      'audio/ogg; codecs=opus': '.ogg',
      'audio/webm; codecs=opus': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/wav': '.wav',
      'audio/aac': '.aac',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'text/plain': '.txt'
    };

    // Tentar primeiro pelo mimetype (mais preciso)
    if (mimetype && mimetypeExtensions[mimetype]) {
      return mimetypeExtensions[mimetype];
    }

    // Senão, usar o tipo da mensagem
    if (messageType && typeExtensions[messageType]) {
      return typeExtensions[messageType];
    }

    // Padrão para áudio (mais comum no WhatsApp)
    return messageType === 'audio' || messageType === 'voice' || messageType === 'ptt' ? '.ogg' : '.bin';
  }

  // Processar mensagem enviada (do celular)
  async handleOutgoingMessage(message) {
    try {
      // Verificar se a mensagem já foi processada via API (sendReplyMessage ou sendMessage)
      if (this.sentMessages.has(message.id._serialized)) {
        console.log(`📤 Mensagem já processada via API, ignorando: ${message.id._serialized}`);
        // Remover da lista após um tempo para não acumular
        setTimeout(() => {
          this.sentMessages.delete(message.id._serialized);
        }, 10000); // 10 segundos
        return;
      }
      
      const chat = await message.getChat();
      
      // Verificar se é um grupo ou comunidade (ignorar por enquanto)
      if (chat.isGroup) {
        console.log(`📤 Mensagem de grupo/comunidade ignorada: ${chat.name || 'Grupo'}`);
        return;
      }
      
      // Verificar se a mensagem foi realmente enviada por nós
      // message.fromMe indica se a mensagem foi enviada por nós
      if (!message.fromMe) {
        console.log(`📤 Ignorando mensagem recebida no evento message_create: ${message.body?.substring(0, 50)}...`);
        return;
      }
      
      // Ignorar mensagens de sistema ou sem conteúdo (exceto se tiver mídia)
      if ((!message.body || message.body.trim() === '') && !message.hasMedia) {
        console.log(`📤 Mensagem vazia ignorada no chat: ${chat.name || chat.id._serialized}`);
        return;
      }

      // Para mensagens enviadas, o destinatário está no chat.id
      const chatId = chat.id._serialized;
      const numeroDestinatario = chatId.replace('@c.us', '');
      
      // Obter o número do próprio WhatsApp conectado para evitar conversas consigo mesmo
      const meuNumero = this.client?.info?.wid?.user;
      
      console.log(`📤 Mensagem enviada por mim - Destinatário: ${numeroDestinatario}, Meu número: ${meuNumero}`);
      
      // Verificar se não é uma mensagem para si mesmo
      if (meuNumero && numeroDestinatario.includes(meuNumero)) {
        console.log(`📤 Ignorando mensagem para si mesmo: ${numeroDestinatario}`);
        return;
      }

      // Verificar se a mensagem já existe no banco (para evitar duplicatas)
      const { data: mensagemExistente } = await supabase
        .from('whatsapp_mensagens')
        .select('id')
        .eq('mensagem_id', message.id._serialized)
        .single();

      if (mensagemExistente) {
        console.log(`📤 Mensagem já existe no banco: ${message.id._serialized}`);
        return;
      }
      
      console.log(`📤 Buscando conversa para destinatário: ${numeroDestinatario}`);
      
      let { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('*')
        .eq('numero_contato', numeroDestinatario)
        .single();

      if (!conversa) {
        // Obter informações do contato destinatário através do chat
        const contact = await chat.getContact();
        
        console.log(`📤 Criando nova conversa para ${numeroDestinatario} - Nome: ${contact?.name || contact?.pushname || 'Sem nome'}`);
        
        // Verificar novamente se não estamos criando conversa conosco mesmo
        if (meuNumero && (contact?.number?.includes(meuNumero) || numeroDestinatario.includes(meuNumero))) {
          console.log(`📤 Evitando criar conversa consigo mesmo - Contact: ${contact?.number}, Destinatário: ${numeroDestinatario}`);
          return;
        }
        
        // Criar nova conversa se não existir
        const { data: novaConversa, error: conversaError } = await supabase
          .from('whatsapp_conversas')
          .upsert({
            configuracao_id: 1,
            numero_contato: numeroDestinatario,
            nome_contato: contact?.name || contact?.pushname || chat.name || numeroDestinatario,
            ultima_mensagem_at: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString(), // UTC-3
            status: 'ativa'
          }, {
            onConflict: 'configuracao_id,numero_contato'
          })
          .select()
          .single();

        if (conversaError) {
          console.error('Erro ao criar conversa para mensagem enviada:', conversaError);
          return;
        }
        conversa = novaConversa;
      }

      // Verificar se a conversa foi criada com sucesso
      if (!conversa || !conversa.id) {
        console.error('Conversa não foi criada corretamente para mensagem enviada');
        return;
      }

      // Verificar se é uma resposta a outra mensagem
      let mensagemPaiId = null;
      let mensagemPaiConteudo = null;
      let mensagemPaiAutor = null;

      if (message.hasQuotedMsg) {
        try {
          const quotedMsg = await message.getQuotedMessage();
          if (quotedMsg) {
            // Buscar a mensagem original no banco
            const { data: mensagemOriginal } = await supabase
              .from('whatsapp_mensagens')
              .select('*')
              .eq('mensagem_id', quotedMsg.id._serialized)
              .single();

            if (mensagemOriginal) {
              mensagemPaiId = mensagemOriginal.id;
              // Evitar replies aninhados - usar apenas o conteúdo da mensagem original, não de outro reply
              mensagemPaiConteudo = mensagemOriginal.conteudo;
              mensagemPaiAutor = mensagemOriginal.direcao === 'outbound' ? 'Você' : (conversa.nome_contato || 'Contato');
            }
          }
        } catch (error) {
          console.error('Erro ao processar mensagem quotada enviada:', error);
        }
      }

      // Processar mídia se necessário
      let midiaUrl = null;
      let midiaTipo = null;
      let midiaNome = null;
      
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          
          if (media) {
            console.log(`📤 Processando mídia enviada - Tipo: ${message.type}, MimeType: ${media.mimetype}, Tamanho: ${media.data.length} bytes`);
            
            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const extensao = this.getFileExtension(message.type, media.mimetype);
            midiaNome = `${message.type}_${timestamp}${extensao}`;
            
            console.log(`📁 Arquivo enviado será salvo como: ${midiaNome}`);
            
            // Salvar arquivo localmente (pasta uploads)
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            
            // Criar diretório se não existir
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filePath = path.join(uploadsDir, midiaNome);
            fs.writeFileSync(filePath, media.data, 'base64');
            
            midiaUrl = `/uploads/${midiaNome}`;
            midiaTipo = media.mimetype;
            
          }
        } catch (error) {
          console.error('Erro ao processar mídia enviada:', error);
        }
      }

      // Salvar mensagem com fuso horário correto (UTC-3)
      const timestampWhatsApp = new Date(message.timestamp * 1000);
      const timestampBrasil = new Date(timestampWhatsApp.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      
      const { data: mensagem } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversa.id,
          mensagem_id: message.id._serialized,
          tipo: message.type,
          conteudo: message.body || (message.hasMedia ? `Mídia: ${message.type}` : ''),
          midia_url: midiaUrl,
          midia_tipo: midiaTipo,
          midia_nome: midiaNome,
          direcao: 'outbound',
          status: 'enviada',
          timestamp_whatsapp: timestampBrasil.toISOString(),
          mensagem_pai_id: mensagemPaiId,
          mensagem_pai_conteudo: mensagemPaiConteudo,
          mensagem_pai_autor: mensagemPaiAutor
        })
        .select()
        .single();

      // Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversas')
        .update({ ultima_mensagem_at: timestampBrasil.toISOString() })
        .eq('id', conversa.id);

    } catch (error) {
      console.error('Erro ao processar mensagem enviada:', error);
    }
  }

  // Processar mensagem recebida
  async handleIncomingMessage(message) {
    try {
      const contact = await message.getContact();
      const chat = await message.getChat();
      
      // Verificar se é um grupo ou comunidade (ignorar por enquanto)
      if (chat.isGroup || !contact.number) {
        return; // Sem log para reduzir taxa de logging
      }
      
      // Ignorar mensagens de sistema ou sem conteúdo (exceto se tiver mídia)
      if ((!message.body || message.body.trim() === '') && !message.hasMedia) {
        return; // Sem log para reduzir taxa de logging
      }
      
      // Buscar ou criar conversa
      // Normalizar número para busca (remover @c.us se presente)
      const numeroLimpo = contact.number.replace('@c.us', '');
      
      let { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('*')
        .eq('numero_contato', numeroLimpo)
        .single();

      if (!conversa) {
        // Criar nova conversa ou buscar se já existe
        const { data: novaConversa, error: conversaError } = await supabase
          .from('whatsapp_conversas')
          .upsert({
            configuracao_id: 1,
            numero_contato: numeroLimpo,
            nome_contato: contact.name || contact.pushname || numeroLimpo,
            ultima_mensagem_at: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString(), // UTC-3
            status: 'ativa'
          }, {
            onConflict: 'configuracao_id,numero_contato'
          })
          .select()
          .single();

        if (conversaError) {
          console.error('Erro ao criar/buscar conversa:', conversaError);
          return; // Sair se não conseguir criar a conversa
        }

        conversa = novaConversa;
      }

      // Verificar se a conversa foi criada com sucesso
      if (!conversa || !conversa.id) {
        console.error('Conversa não foi criada corretamente');
        return;
      }

      // Verificar se é uma resposta a outra mensagem
      let mensagemPaiId = null;
      let mensagemPaiConteudo = null;
      let mensagemPaiAutor = null;

      if (message.hasQuotedMsg) {
        try {
          const quotedMsg = await message.getQuotedMessage();
          if (quotedMsg) {
            // Buscar a mensagem original no banco
            const { data: mensagemOriginal } = await supabase
              .from('whatsapp_mensagens')
              .select('*')
              .eq('mensagem_id', quotedMsg.id._serialized)
              .single();

            if (mensagemOriginal) {
              mensagemPaiId = mensagemOriginal.id;
              // Evitar replies aninhados - usar apenas o conteúdo da mensagem original, não de outro reply
              mensagemPaiConteudo = mensagemOriginal.conteudo;
              mensagemPaiAutor = mensagemOriginal.direcao === 'outbound' ? 'Você' : contact.name || 'Contato';
            }
          }
        } catch (error) {
          console.error('Erro ao processar mensagem quotada:', error);
        }
      }

      // Processar mídia se necessário
      let midiaUrl = null;
      let midiaTipo = null;
      let midiaNome = null;
      
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          
          if (media) {
            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const extensao = this.getFileExtension(message.type, media.mimetype);
            midiaNome = `${message.type}_${timestamp}${extensao}`;
            
            // Salvar arquivo localmente (pasta uploads)
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            
            // Criar diretório se não existir
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filePath = path.join(uploadsDir, midiaNome);
            fs.writeFileSync(filePath, media.data, 'base64');
            
            midiaUrl = `/uploads/${midiaNome}`;
            midiaTipo = media.mimetype;
          }
        } catch (error) {
          console.error('Erro ao processar mídia:', error);
        }
      }

      // Salvar mensagem com fuso horário correto (UTC-3)
      const timestampWhatsApp = new Date(message.timestamp * 1000);
      const timestampBrasil = new Date(timestampWhatsApp.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      
      const { data: mensagem } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversa.id,
          mensagem_id: message.id._serialized,
          tipo: message.type,
          conteudo: message.body || (message.hasMedia ? `Mídia: ${message.type}` : ''),
          midia_url: midiaUrl,
          midia_tipo: midiaTipo,
          midia_nome: midiaNome,
          direcao: 'inbound',
          status: 'recebida',
          timestamp_whatsapp: timestampBrasil.toISOString(),
          mensagem_pai_id: mensagemPaiId,
          mensagem_pai_conteudo: mensagemPaiConteudo,
          mensagem_pai_autor: mensagemPaiAutor
        })
        .select()
        .single();

      // Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversas')
        .update({ ultima_mensagem_at: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString() }) // UTC-3
        .eq('id', conversa.id);

      // Executar automações
      await this.executeAutomations(conversa, mensagem);

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      console.error('Stack trace:', error.stack);
    }
  }

  // Executar automações
  async executeAutomations(conversa, mensagem) {
    try {
      const { data: automatizacoes } = await supabase
        .from('whatsapp_automatizacoes')
        .select('*')
        .eq('ativo', true)
        .order('prioridade', { ascending: true });

      for (const automatizacao of automatizacoes) {
        const deveExecutar = await this.checkTrigger(automatizacao, conversa, mensagem);
        
        if (deveExecutar) {
          await this.executeAction(automatizacao, conversa, mensagem);
        }
      }
    } catch (error) {
      console.error('Erro ao executar automações:', error);
    }
  }

  // Verificar trigger da automação
  async checkTrigger(automatizacao, conversa, mensagem) {
    const { trigger_tipo, trigger_config } = automatizacao;

    switch (trigger_tipo) {
      case 'mensagem_recebida':
        if (trigger_config.primeira_mensagem) {
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

      default:
        return false;
    }
  }

  // Executar ação da automação
  async executeAction(automatizacao, conversa, mensagem) {
    const { acao_tipo, acao_config } = automatizacao;

    switch (acao_tipo) {
      case 'enviar_mensagem':
        await this.sendMessage(conversa.numero_contato, acao_config.mensagem);
        break;

      case 'criar_lead':
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
    }
  }

  // Enviar mensagem
  async sendMessage(number, content) {
    try {
      // Verificar se está realmente conectado
      if (!this.isConnected || !this.client) {
        throw new Error('WhatsApp não está conectado');
      }
      
      // Verificar estado real do cliente
      const clientState = await this.client.getState();
      if (clientState !== 'CONNECTED') {
        console.log('⚠️ Cliente não está realmente conectado. Estado:', clientState);
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        await this.updateConnectionStatus('disconnected');
        throw new Error(`WhatsApp não está conectado. Estado: ${clientState}`);
      }

      const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
      console.log('📤 Enviando mensagem via API:', {
        chatId,
        content: content.substring(0, 100),
        timestamp: new Date().toISOString()
      });
      
      const message = await this.client.sendMessage(chatId, content);
      
      console.log('✅ Mensagem enviada com sucesso:', {
        messageId: message.id._serialized,
        chatId,
        timestamp: new Date().toISOString()
      });

      // Marcar mensagem como enviada via API para evitar duplicação
      this.sentMessages.add(message.id._serialized);

      // Salvar mensagem no banco
      // Normalizar número para busca (remover @c.us se presente)
      const numeroLimpo = number.replace('@c.us', '');
      
      const { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('*')
        .eq('numero_contato', numeroLimpo)
        .single();

      if (conversa) {
        // Salvar mensagem com fuso horário correto (UTC-3)
        const timestampBrasil = new Date(Date.now() - (3 * 60 * 60 * 1000)); // UTC-3
        
        await supabase
          .from('whatsapp_mensagens')
          .insert({
            conversa_id: conversa.id,
            mensagem_id: message.id._serialized,
            tipo: 'text',
            conteudo: content,
            direcao: 'outbound',
            status: 'enviada',
            timestamp_whatsapp: timestampBrasil.toISOString()
          });

        // Atualizar última mensagem da conversa
        await supabase
          .from('whatsapp_conversas')
          .update({ ultima_mensagem_at: timestampBrasil.toISOString() })
          .eq('id', conversa.id);
      }

      return message;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  // Enviar mensagem como resposta (reply)
  async sendReplyMessage(number, content, replyMessageId, replyData) {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('WhatsApp não está conectado');
      }

      const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
      
      // Normalizar número para busca
      const numeroLimpo = number.replace('@c.us', '');
      
      // Buscar a conversa e a mensagem original no banco
      const { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('*')
        .eq('numero_contato', numeroLimpo)
        .single();

      if (!conversa) {
        throw new Error('Conversa não encontrada');
      }

      // Buscar a mensagem original para obter o ID real do WhatsApp
      const { data: mensagemOriginal } = await supabase
        .from('whatsapp_mensagens')
        .select('mensagem_id')
        .eq('id', replyMessageId)
        .single();

      if (!mensagemOriginal || !mensagemOriginal.mensagem_id) {
        // Se não encontrou a mensagem original, enviar como mensagem normal
        console.log('Mensagem original não encontrada, enviando como mensagem normal');
        return await this.sendMessage(number, content);
      }

      // Buscar o chat do WhatsApp
      const chat = await this.client.getChatById(chatId);
      
      // Buscar mensagens no chat para encontrar a mensagem original
      const messages = await chat.fetchMessages({ limit: 100 });
      const originalMessage = messages.find(msg => msg.id._serialized === mensagemOriginal.mensagem_id);

      let message;
      if (originalMessage) {
        // Enviar como reply se encontrou a mensagem original
        // Usar a API correta do whatsapp-web.js para reply
        message = await originalMessage.reply(content);
      } else {
        // Se não encontrou a mensagem no WhatsApp, enviar como mensagem normal
        console.log('Mensagem original não encontrada no WhatsApp, enviando como mensagem normal');
        message = await this.client.sendMessage(chatId, content);
      }

      // Marcar mensagem como enviada via API para evitar duplicação
      this.sentMessages.add(message.id._serialized);
      
      // Salvar mensagem no banco com dados do reply
      const timestampBrasil = new Date(Date.now() - (3 * 60 * 60 * 1000)); // UTC-3
      
      const mensagemData = {
        conversa_id: conversa.id,
        mensagem_id: message.id._serialized,
        tipo: 'text',
        conteudo: content,
        direcao: 'outbound',
        status: 'enviada',
        timestamp_whatsapp: timestampBrasil.toISOString()
      };

        // Adicionar dados do reply se a mensagem original foi encontrada
        if (originalMessage) {
          mensagemData.mensagem_pai_id = replyMessageId;
          mensagemData.mensagem_pai_conteudo = replyData.content;
          mensagemData.mensagem_pai_autor = replyData.author;
        }

      await supabase
        .from('whatsapp_mensagens')
        .insert(mensagemData);

      // Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversas')
        .update({ ultima_mensagem_at: timestampBrasil.toISOString() })
        .eq('id', conversa.id);

      return message;
    } catch (error) {
      console.error('Erro ao enviar mensagem reply:', error);
      throw error;
    }
  }

  // Obter status da conexão
  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionStatus,
      qrCode: this.qrCode
    };
  }

  // Verificar se o cliente está realmente funcional
  async isClientFunctional() {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      
      const state = await this.client.getState();
      return state === 'CONNECTED';
    } catch (error) {
      console.error('Erro ao verificar estado do cliente:', error);
      return false;
    }
  }

  // Desconectar
  async disconnect() {
    console.log('🔌 Desconectando WhatsApp Web...');
    
    // Parar monitoramento
    this.stopConnectionMonitoring();
    
    // Parar reconexão automática
    this.reconnecting = false;
    
    if (this.client) {
      try {
        // Remover todos os event listeners antes de destruir
        this.client.removeAllListeners();
        await this.client.destroy();
      } catch (error) {
        console.error('Erro ao destruir cliente:', error);
      }
      this.client = null;
    }
    
    // Resetar todos os estados
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.qrCode = null;
    this.reconnecting = false;
    
    // Executar limpeza completa das sessões
    await this.runCleanupScripts();
    
    await this.updateConnectionStatus('disconnected');
    console.log('✅ WhatsApp Web desconectado e sessões limpas');
  }

  // ===== MÉTODOS DE ENVIO DE MÍDIA =====

  /**
   * Envia um arquivo de mídia de forma segura
   */
  async sendMediaFile(number, file, caption = '') {
    try {
      // Verificar se está realmente conectado e funcional
      if (!this.isClientFunctional()) {
        throw new Error('WhatsApp não está conectado ou não está funcional');
      }

      // 1. Salvar arquivo de forma segura (já inclui validação)
      const saveResult = await this.secureStorage.saveFile(file);
      if (!saveResult.success) {
        throw new Error(`Erro ao salvar arquivo: ${saveResult.error}`);
      }

      // 3. Preparar número do destinatário
      const cleanNumber = number.replace(/\D/g, '');
      const chatId = `${cleanNumber}@c.us`;

      // 4. Verificar conexão novamente antes de enviar
      if (!this.isClientFunctional()) {
        throw new Error('Conexão WhatsApp perdida durante o processamento');
      }

      // 5. Criar MessageMedia
      const media = new MessageMedia(
        file.mimetype,
        file.buffer.toString('base64'),
        file.originalname
      );

      // 6. Enviar mensagem
      const message = await this.client.sendMessage(chatId, media, { caption });

      // 7. Marcar como enviada via API
      this.sentMessages.add(message.id._serialized);

      // 8. Salvar no banco de dados
      await this.saveOutgoingMediaMessage(message, saveResult.metadata, caption);

      console.log(`📤 Mídia enviada com sucesso: ${file.originalname}`);
      return message;

    } catch (error) {
      console.error('❌ Erro ao enviar mídia:', error);
      throw error;
    }
  }

  /**
   * Envia um arquivo de mídia como resposta a uma mensagem
   */
  async sendMediaReply(number, file, replyMessageId, caption = '') {
    try {
      // Verificar se está realmente conectado e funcional
      if (!this.isClientFunctional()) {
        throw new Error('WhatsApp não está conectado ou não está funcional');
      }

      // 1. Salvar arquivo de forma segura (já inclui validação)
      const saveResult = await this.secureStorage.saveFile(file);
      if (!saveResult.success) {
        throw new Error(`Erro ao salvar arquivo: ${saveResult.error}`);
      }

      // 3. Buscar mensagem original no banco
      const { data: mensagemOriginal, error: msgError } = await supabase
        .from('whatsapp_mensagens')
        .select('*')
        .eq('id', replyMessageId)
        .single();

      if (msgError || !mensagemOriginal) {
        throw new Error('Mensagem original não encontrada');
      }

      // 4. Preparar número do destinatário
      const cleanNumber = number.replace(/\D/g, '');
      const chatId = `${cleanNumber}@c.us`;

      // 5. Buscar mensagem original no WhatsApp
      const chat = await this.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: 100 });
      const originalMessage = messages.find(msg => msg.id._serialized === mensagemOriginal.mensagem_id);

      if (!originalMessage) {
        throw new Error('Mensagem original não encontrada no WhatsApp');
      }

      // 6. Verificar conexão novamente antes de enviar
      if (!this.isClientFunctional()) {
        throw new Error('Conexão WhatsApp perdida durante o processamento');
      }

      // 7. Criar MessageMedia
      const media = new MessageMedia(
        file.mimetype,
        file.buffer.toString('base64'),
        file.originalname
      );

      // 8. Enviar como resposta
      const message = await originalMessage.reply(media, { caption });

      // 9. Marcar como enviada via API
      this.sentMessages.add(message.id._serialized);

      // 10. Salvar no banco de dados
      await this.saveOutgoingMediaMessage(message, saveResult.metadata, caption, {
        mensagem_pai_id: replyMessageId,
        mensagem_pai_conteudo: mensagemOriginal.conteudo,
        mensagem_pai_autor: mensagemOriginal.direcao === 'inbound' ? 'Contato' : 'Você'
      });

      console.log(`📤 Mídia reply enviada com sucesso: ${file.originalname}`);
      return message;

    } catch (error) {
      console.error('❌ Erro ao enviar mídia reply:', error);
      throw error;
    }
  }

  /**
   * Salva mensagem de mídia enviada no banco de dados
   */
  async saveOutgoingMediaMessage(message, mediaMetadata, caption = '', replyData = null) {
    try {
      // Buscar ou criar conversa
      const chatId = message.to;
      const cleanNumber = chatId.replace('@c.us', '');
      
      const { data: conversa, error: convError } = await supabase
        .from('whatsapp_conversas')
        .select('*')
        .eq('numero_contato', cleanNumber)
        .single();

      if (convError || !conversa) {
        throw new Error('Conversa não encontrada');
      }

      // Preparar dados da mensagem
      const messageData = {
        conversa_id: conversa.id,
        mensagem_id: message.id._serialized,
        conteudo: caption || `Mídia: ${mediaMetadata.originalName}`,
        tipo: this.getMediaType(mediaMetadata.mimeType),
        direcao: 'outbound',
        status: 'enviada',
        midia_url: mediaMetadata.url,
        midia_tipo: mediaMetadata.mimeType,
        midia_nome: mediaMetadata.originalName,
        created_at: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString()
      };

      // Adicionar dados de reply se existirem
      if (replyData) {
        messageData.mensagem_pai_id = replyData.mensagem_pai_id;
        messageData.mensagem_pai_conteudo = replyData.mensagem_pai_conteudo;
        messageData.mensagem_pai_autor = replyData.mensagem_pai_autor;
      }

      // Salvar no banco
      const { error: saveError } = await supabase
        .from('whatsapp_mensagens')
        .insert([messageData]);

      if (saveError) {
        console.error('❌ Erro ao salvar mensagem de mídia:', saveError);
      } else {
        console.log('✅ Mensagem de mídia salva no banco');
      }

    } catch (error) {
      console.error('❌ Erro ao salvar mensagem de mídia:', error);
    }
  }

  /**
   * Determina o tipo de mídia baseado no MIME type
   */
  getMediaType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    return 'document';
  }

  /**
   * Obtém estatísticas de armazenamento
   */
  async getStorageStats() {
    return await this.secureStorage.getStorageStats();
  }
}

module.exports = WhatsAppWebService;
