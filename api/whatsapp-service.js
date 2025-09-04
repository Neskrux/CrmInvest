const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
  constructor(io, supabase) {
    this.io = io;
    this.supabase = supabase;
    this.sock = null;
    this.qrCodeData = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected'; // disconnected, connecting, connected, qr
    // Usar diretório temporário no Vercel (/tmp é o único diretório gravável)
    this.authDir = process.env.VERCEL 
      ? path.join('/tmp', 'whatsapp_auth') 
      : path.join(__dirname, 'whatsapp_auth');
    
    // Garantir que o diretório de autenticação existe (apenas em desenvolvimento)
    if (!process.env.VERCEL && !fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }


  async resetSession() {
    // Apaga a pasta de autenticação para forçar novo QR code
    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
    }
    this.sock = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.qrCodeData = null;
  }

  async initialize() {
    try {
      console.log('🔄 Inicializando WhatsApp Service...');
      await this.connectToWhatsApp();
    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp Service:', error);
      this.connectionStatus = 'error';
      this.emitStatusUpdate();
    }
  }

  // Sistema de autenticação customizado para ambientes serverless
  async createServerlessAuthState() {
    console.log('🔐 Iniciando createServerlessAuthState...');
    
    const writeData = async (file, data) => {
      try {
        console.log(`💾 Salvando dados de auth: ${file}`);
        const result = await this.supabase
          .from('whatsapp_auth')
          .upsert({ 
            key: file, 
            data: JSON.stringify(data),
            updated_at: new Date().toISOString()
          });
        console.log(`✅ Dados salvos: ${file}`, result);
      } catch (error) {
        console.error('❌ Erro ao salvar dados de auth:', error);
        throw error;
      }
    };

    const readData = async (file) => {
      try {
        console.log(`📖 Lendo dados de auth: ${file}`);
        const { data, error } = await this.supabase
          .from('whatsapp_auth')
          .select('data')
          .eq('key', file)
          .single();
        
        if (error) {
          console.log(`⚠️ Nenhum dado encontrado para ${file}:`, error.message);
          return null;
        }
        
        if (!data) {
          console.log(`⚠️ Nenhum dado retornado para ${file}`);
          return null;
        }
        
        const parsed = JSON.parse(data.data);
        console.log(`✅ Dados lidos: ${file}`, Object.keys(parsed));
        return parsed;
      } catch (error) {
        console.error('❌ Erro ao ler dados de auth:', error);
        return null;
      }
    };

    const removeData = async (file) => {
      try {
        console.log(`🗑️ Removendo dados de auth: ${file}`);
        await this.supabase
          .from('whatsapp_auth')
          .delete()
          .eq('key', file);
        console.log(`✅ Dados removidos: ${file}`);
      } catch (error) {
        console.error('❌ Erro ao remover dados de auth:', error);
      }
    };

    console.log('📖 Lendo credenciais existentes...');
    const creds = await readData('creds.json') || {};
    const keys = await readData('app-state-sync-version.json') || {};
    
    console.log('🔐 Estado de autenticação criado:', {
      hasCreds: Object.keys(creds).length > 0,
      hasKeys: Object.keys(keys).length > 0
    });

    return {
      state: {
        creds,
        keys
      },
      saveCreds: async () => {
        console.log('💾 Salvando credenciais...');
        await writeData('creds.json', creds);
        await writeData('app-state-sync-version.json', keys);
        console.log('✅ Credenciais salvas');
      }
    };
  }

  async connectToWhatsApp(forceReset = false) {
    try {
      console.log('🚀 Iniciando conexão WhatsApp...', { forceReset, isVercel: !!process.env.VERCEL });
      
      if (forceReset) {
        console.log('🔄 Resetando sessão...');
        await this.resetSession();
      }
      
      // Usar sistema de auth customizado para Vercel/Serverless
      console.log('🔐 Criando estado de autenticação...');
      const { state, saveCreds } = await this.createServerlessAuthState();
      console.log('✅ Estado de autenticação criado');
      
      console.log('📱 Buscando versão do WhatsApp...');
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WhatsApp v${version.join('.')}, isLatest: ${isLatest}`);

      const logger = {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => logger
      };

      console.log('🔌 Criando socket WhatsApp...');
      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: ['CRM Invest', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
        // Configurações para ambiente serverless
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        defaultQueryTimeoutMs: 60000,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        fireInitQueries: false,
        shouldSyncHistoryMessage: () => false,
        shouldIgnoreJid: () => false,
        getMessage: async () => undefined,
        patchMessageBeforeSending: (message) => message,
        connectCooldownMs: 4000,
        qrMaxRetries: 3
      });
      console.log('✅ Socket WhatsApp criado');

      // Eventos do socket
      console.log('📡 Configurando eventos do socket...');
      this.sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
      this.sock.ev.on('creds.update', saveCreds);
      this.sock.ev.on('messages.upsert', (m) => this.handleMessages(m));
      this.sock.ev.on('contacts.update', (contacts) => this.handleContactsUpdate(contacts));
      console.log('✅ Eventos do socket configurados');

      console.log('🚀 WhatsApp Service inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao conectar ao WhatsApp:', error);
      this.connectionStatus = 'error';
      this.emitStatusUpdate();
    }
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;
    
    console.log('🔄 Connection update:', { 
      connection, 
      qr: !!qr, 
      qrLength: qr ? qr.length : 0,
      lastDisconnect: lastDisconnect?.error?.message,
      timestamp: new Date().toISOString()
    });
    
    if (qr) {
      console.log('📱 QR Code gerado - convertendo para base64...');
      console.log('📱 QR Code length:', qr.length);
      try {
        this.qrCodeData = await QRCode.toDataURL(qr);
        this.connectionStatus = 'qr';
        console.log('✅ QR Code convertido com sucesso, length:', this.qrCodeData.length);
        this.emitStatusUpdate();
      } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
        this.connectionStatus = 'error';
        this.emitStatusUpdate();
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut;
      console.log('🔌 Conexão fechada devido a:', lastDisconnect?.error?.message, ', reconectando:', shouldReconnect);
      
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.qrCodeData = null;
      this.emitStatusUpdate();

      // Não reconectar automaticamente - deixar o usuário clicar novamente
      if (shouldReconnect && lastDisconnect?.error?.output?.statusCode !== 401) {
        console.log('🔄 Aguardando 5 segundos para reconectar...');
        setTimeout(() => {
          this.connectToWhatsApp();
        }, 50000);
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp conectado com sucesso!');
      this.isConnected = true;
      this.connectionStatus = 'connected';
      this.qrCodeData = null;
      this.emitStatusUpdate();
      
      // Buscar conversas recentes (sem falhar se tabela não existir)
      try {
        await this.loadRecentChats();
      } catch (error) {
        console.warn('⚠️ Erro ao carregar conversas (normal se tabela não existir):', error.message);
      }
    } else if (connection === 'connecting') {
      console.log('🔄 Conectando ao WhatsApp...');
      this.connectionStatus = 'connecting';
      this.emitStatusUpdate();
    }
  }

  async handleMessages(m) {
    try {
      for (const message of m.messages) {
        if (message.key.fromMe) continue; // Ignorar mensagens próprias
        
        const messageData = await this.processMessage(message);
        
        // Salvar mensagem no banco
        await this.saveMessage(messageData);
        
        // Emitir mensagem para o frontend (apenas se Socket.IO estiver disponível)
        if (this.io) {
          this.io.emit('whatsapp:new-message', messageData);
        }
        
        // Verificar se é um novo lead
        await this.checkAndCreateLead(messageData);
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagens:', error);
    }
  }

  async processMessage(message) {
    const remoteJid = message.key.remoteJid;
    const messageType = Object.keys(message.message || {})[0];
    let messageText = '';
    let mediaUrl = null;

    // Extrair texto da mensagem
    if (messageType === 'conversation') {
      messageText = message.message.conversation;
    } else if (messageType === 'extendedTextMessage') {
      messageText = message.message.extendedTextMessage.text;
    } else if (messageType === 'imageMessage') {
      messageText = message.message.imageMessage.caption || '[Imagem]';
      // TODO: Processar imagem se necessário
    } else if (messageType === 'audioMessage') {
      messageText = '[Áudio]';
    } else if (messageType === 'documentMessage') {
      messageText = `[Documento: ${message.message.documentMessage.fileName}]`;
    } else {
      messageText = `[${messageType}]`;
    }

    // Obter informações do contato
    const contact = await this.getContactInfo(remoteJid);

    return {
      id: message.key.id,
      remoteJid,
      contactName: contact.name || contact.notify || remoteJid.split('@')[0],
      contactNumber: remoteJid.split('@')[0],
      message: messageText,
      messageType,
      timestamp: message.messageTimestamp ? new Date(message.messageTimestamp * 1000) : new Date(),
      isFromMe: message.key.fromMe,
      mediaUrl
    };
  }

  async getContactInfo(jid) {
    try {
      if (this.sock) {
        const contact = await this.sock.onWhatsApp(jid);
        return contact[0] || { jid };
      }
      return { jid };
    } catch (error) {
      return { jid };
    }
  }
  
  async saveMessage(messageData) {
    try {
      const { error } = await this.supabase
        .from('whatsapp_messages')
        .upsert([{
          message_id: messageData.id,
          remote_jid: messageData.remoteJid,
          contact_name: messageData.contactName,
          contact_number: messageData.contactNumber,
          message: messageData.message,
          message_type: messageData.messageType,
          timestamp: messageData.timestamp.toISOString(),
          is_from_me: messageData.isFromMe,
          media_url: messageData.mediaUrl
        }], { onConflict: 'message_id' });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
    }
  }

  async checkAndCreateLead(messageData) {
    try {
      if (messageData.isFromMe) return; // Ignorar mensagens próprias

      const phoneNumber = messageData.contactNumber;
      
      // Verificar se já existe um paciente com este telefone
      const { data: existingPatient } = await this.supabase
        .from('pacientes')
        .select('id, nome')
        .eq('telefone', phoneNumber)
        .single();

      if (existingPatient) {
        console.log(`📋 Mensagem de paciente existente: ${existingPatient.nome}`);
        return;
      }

      // Criar novo lead
      const { data: newLead, error } = await this.supabase
        .from('pacientes')
        .insert([{
          nome: messageData.contactName,
          telefone: phoneNumber,
          status: 'lead',
          observacoes: `Lead criado automaticamente via WhatsApp. Primeira mensagem: "${messageData.message}"`
        }])
        .select()
        .single();

      if (error) throw error;

      console.log(`🆕 Novo lead criado: ${newLead.nome} (${phoneNumber})`);
      
      // Emitir evento de novo lead (apenas se Socket.IO estiver disponível)
      if (this.io) {
        this.io.emit('whatsapp:new-lead', newLead);
      }

    } catch (error) {
      console.error('❌ Erro ao criar lead:', error);
    }
  }

  async loadRecentChats() {
    try {
      // Buscar conversas recentes do banco
      const { data: recentChats, error } = await this.supabase
        .from('whatsapp_messages')
        .select('remote_jid, contact_name, contact_number, message, timestamp, is_from_me')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Agrupar por contato
      const chatsMap = new Map();
      recentChats.forEach(msg => {
        if (!chatsMap.has(msg.remote_jid)) {
          chatsMap.set(msg.remote_jid, {
            jid: msg.remote_jid,
            name: msg.contact_name,
            number: msg.contact_number,
            lastMessage: msg.message,
            timestamp: msg.timestamp,
            unread: !msg.is_from_me ? 1 : 0
          });
        }
      });

      const chats = Array.from(chatsMap.values());
      if (this.io) {
        this.io.emit('whatsapp:chats-loaded', chats);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar conversas:', error);
    }
  }

  async sendMessage(jid, message) {
    try {
      if (!this.isConnected) {
        throw new Error('WhatsApp não está conectado');
      }

      const sent = await this.sock.sendMessage(jid, { text: message });
      
      // Salvar mensagem enviada
      const messageData = {
        id: sent.key.id,
        remoteJid: jid,
        contactName: jid.split('@')[0],
        contactNumber: jid.split('@')[0],
        message,
        messageType: 'text',
        timestamp: new Date(),
        isFromMe: true,
        mediaUrl: null
      };

      await this.saveMessage(messageData);
      
      return { success: true, messageData };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return { success: false, error: error.message };
    }
  }

  async getMessages(jid, limit = 50) {
    try {
      console.log('🔍 WhatsAppService.getMessages - JID:', jid, 'Limit:', limit);
      
      const { data: messages, error } = await this.supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('remote_jid', jid)
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ Erro na query do Supabase:', error);
        throw error;
      }
      
      console.log('📨 Mensagens do banco:', messages?.length || 0);
      console.log('📨 Primeiras mensagens:', messages?.slice(0, 2));
      
      return messages || [];
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      return [];
    }
  }

  handleContactsUpdate(contacts) {
    // Atualizar informações de contatos se necessário
    console.log('📞 Contatos atualizados:', contacts.length);
  }

  emitStatusUpdate() {
    console.log('📡 Emitindo status update:', {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      hasQrCode: !!this.qrCodeData,
      hasIo: !!this.io
    });
    
    if (this.io) {
      this.io.emit('whatsapp:status', {
        status: this.connectionStatus,
        isConnected: this.isConnected,
        qrCode: this.qrCodeData
      });
      console.log('✅ Status emitido via Socket.IO');
    } else {
      console.log('⚠️ Socket.IO não disponível - status não será emitido em tempo real');
    }
  }

  getStatus() {
    const status = {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      qrCode: this.qrCodeData
    };
    
    console.log('📊 Status atual:', {
      status: status.status,
      isConnected: status.isConnected,
      hasQrCode: !!status.qrCode,
      qrCodeLength: status.qrCode ? status.qrCode.length : 0
    });
    
    return status;
  }

  async disconnect() {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.qrCodeData = null;
      
      // Limpar dados de autenticação do Supabase
      try {
        await this.supabase
          .from('whatsapp_auth')
          .delete()
          .in('key', ['creds.json', 'app-state-sync-version.json']);
        console.log('🗑️ Dados de autenticação removidos do Supabase');
      } catch (error) {
        console.error('❌ Erro ao limpar dados de auth do Supabase:', error);
      }
      
      // Limpar diretório temporário (fallback)
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      
      this.emitStatusUpdate();
      console.log('🔌 WhatsApp desconectado');
    } catch (error) {
      console.error('❌ Erro ao desconectar:', error);
    }
  }
}

module.exports = WhatsAppService;
