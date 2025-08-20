const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

class WhatsAppService {
  constructor(io, supabase) {
    this.io = io;
    this.supabase = supabase;
    this.sock = null;
    this.qrCodeData = null;
    this.isConnected = false;
    this.connectionStatus = 'disconnected'; // disconnected, connecting, connected, qr
    this.authDir = path.join(__dirname, 'whatsapp_auth');
    
    // Garantir que o diretório de autenticação existe
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
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

  async connectToWhatsApp() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
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

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: ['CRM Invest', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true
      });

      // Eventos do socket
      this.sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
      this.sock.ev.on('creds.update', saveCreds);
      this.sock.ev.on('messages.upsert', (m) => this.handleMessages(m));
      this.sock.ev.on('contacts.update', (contacts) => this.handleContactsUpdate(contacts));

      console.log('🚀 WhatsApp Service inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao conectar ao WhatsApp:', error);
      this.connectionStatus = 'error';
      this.emitStatusUpdate();
    }
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;
    
    console.log('🔄 Connection update:', { connection, qr: !!qr, lastDisconnect: lastDisconnect?.error?.message });
    
    if (qr) {
      console.log('📱 QR Code gerado - convertendo para base64...');
      try {
        this.qrCodeData = await QRCode.toDataURL(qr);
        this.connectionStatus = 'qr';
        console.log('✅ QR Code convertido com sucesso');
        this.emitStatusUpdate();
      } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
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
        }, 5000);
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
        
        // Emitir mensagem para o frontend
        this.io.emit('whatsapp:new-message', messageData);
        
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
      
      // Emitir evento de novo lead
      this.io.emit('whatsapp:new-lead', newLead);

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
      this.io.emit('whatsapp:chats-loaded', chats);

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
    this.io.emit('whatsapp:status', {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      qrCode: this.qrCodeData
    });
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      qrCode: this.qrCodeData
    };
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
      
      // Limpar arquivos de autenticação
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
