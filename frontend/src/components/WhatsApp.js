import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

const WhatsApp = () => {
  const { makeRequest } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    // Conectar ao Socket.IO
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:5000';
    
    console.log('🔌 Conectando Socket.IO em:', socketUrl);
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Debug do Socket.IO
    socketRef.current.on('connect', () => {
      console.log('✅ Socket.IO conectado!');
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket.IO desconectado!');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Erro na conexão Socket.IO:', error);
    });

    // Listeners do Socket.IO
    socketRef.current.on('whatsapp:status', (status) => {
      console.log('📱 Status do WhatsApp recebido:', status);
      setConnectionStatus(status.status);
      setQrCode(status.qrCode);
    });

    socketRef.current.on('whatsapp:chats-loaded', (chatsData) => {
      console.log('💬 Chats carregados:', chatsData);
      setChats(chatsData);
    });

    socketRef.current.on('whatsapp:new-message', (messageData) => {
      console.log('📨 Nova mensagem:', messageData);
      
      // Atualizar mensagens se for do chat selecionado
      if (selectedChat && messageData.remoteJid === selectedChat.jid) {
        setMessages(prev => [...prev, messageData]);
      }
      
      // Atualizar lista de chats
      setChats(prev => {
        const updated = [...prev];
        const chatIndex = updated.findIndex(c => c.jid === messageData.remoteJid);
        
        if (chatIndex >= 0) {
          updated[chatIndex] = {
            ...updated[chatIndex],
            lastMessage: messageData.message,
            timestamp: messageData.timestamp,
            unread: messageData.isFromMe ? 0 : (updated[chatIndex].unread || 0) + 1
          };
        } else {
          // Novo chat
          updated.unshift({
            jid: messageData.remoteJid,
            name: messageData.contactName,
            number: messageData.contactNumber,
            lastMessage: messageData.message,
            timestamp: messageData.timestamp,
            unread: messageData.isFromMe ? 0 : 1
          });
        }
        
        return updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      });
    });

    socketRef.current.on('whatsapp:new-lead', (leadData) => {
      console.log('🆕 Novo lead criado:', leadData);
      setMessage(`Novo lead criado automaticamente: ${leadData.nome}`);
      setTimeout(() => setMessage(''), 5000);
    });

    // Buscar status inicial
    fetchWhatsAppStatus();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchWhatsAppStatus = async () => {
    try {
      const response = await makeRequest('/whatsapp/status');
      const data = await response.json();
      
      if (response.ok) {
        setConnectionStatus(data.status);
        setQrCode(data.qrCode);
      }
    } catch (error) {
      console.error('Erro ao buscar status do WhatsApp:', error);
    }
  };

  const connectWhatsApp = async () => {
    try {
      setLoading(true);
      setMessage('Iniciando conexão com WhatsApp...');
      console.log('🔄 Iniciando conexão com WhatsApp...');
      
      const response = await makeRequest('/whatsapp/connect', {
        method: 'POST'
      });
      
      console.log('📡 Resposta da API:', response.status);
      const data = await response.json();
      console.log('📄 Dados recebidos:', data);
      
      if (response.ok) {
        setMessage(data.message);
        console.log('✅ Conexão iniciada com sucesso');
      } else {
        setMessage('Erro ao conectar: ' + data.error);
        console.error('❌ Erro na resposta:', data.error);
      }
    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      setMessage('Erro ao conectar WhatsApp: ' + error.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      setLoading(true);
      setMessage('Desconectando WhatsApp...');
      
      const response = await makeRequest('/whatsapp/disconnect', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        setConnectionStatus('disconnected');
        setQrCode(null);
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
      } else {
        setMessage('Erro ao desconectar: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      setMessage('Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const selectChat = async (chat) => {
    try {
      console.log('🔍 Selecionando chat:', chat);
      setSelectedChat(chat);
      setLoading(true);
      
      // Buscar mensagens do chat
      console.log('🔍 Buscando mensagens para JID:', chat.jid);
      const response = await makeRequest(`/whatsapp/messages/${encodeURIComponent(chat.jid)}`);
      const data = await response.json();
      
      console.log('📨 Resposta da API de mensagens:', data);
      
      if (response.ok) {
        console.log('✅ Mensagens carregadas:', data.length, 'mensagens');
        setMessages(data);
        
        // Marcar chat como lido
        setChats(prev => prev.map(c => 
          c.jid === chat.jid ? { ...c, unread: 0 } : c
        ));
      } else {
        console.error('❌ Erro na resposta:', data);
        setMessage('Erro ao carregar mensagens: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
      setMessage('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      const response = await makeRequest('/whatsapp/send-message', {
        method: 'POST',
        body: JSON.stringify({
          jid: selectedChat.jid,
          message: newMessage.trim()
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Adicionar mensagem à lista
        const messageData = {
          id: Date.now().toString(),
          message: newMessage.trim(),
          timestamp: new Date().toISOString(),
          isFromMe: true
        };
        
        setMessages(prev => [...prev, messageData]);
        setNewMessage('');
        
        // Atualizar último mensagem no chat
        setChats(prev => prev.map(c => 
          c.jid === selectedChat.jid 
            ? { ...c, lastMessage: newMessage.trim(), timestamp: new Date().toISOString() }
            : c
        ));
      } else {
        setMessage('Erro ao enviar mensagem: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessage('Erro ao enviar mensagem');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'qr': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'qr': return 'Aguardando QR Code';
      case 'error': return 'Erro na conexão';
      default: return 'Desconectado';
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1f2937' }}>WhatsApp</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>
            Gerencie conversas e leads do WhatsApp
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: getStatusColor() 
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {getStatusText()}
            </span>
          </div>
          {connectionStatus === 'connected' ? (
            <button 
              className="btn btn-danger" 
              onClick={disconnectWhatsApp}
              disabled={loading}
            >
              Desconectar
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={connectWhatsApp}
              disabled={loading}
            >
              {loading ? 'Conectando...' : 'Conectar WhatsApp'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') || message.includes('Novo lead') ? 'alert-success' : 'alert-info'}`}>
          {message}
        </div>
      )}

      {/* QR Code */}
      {qrCode && connectionStatus === 'qr' && (
        <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Escaneie o QR Code</h3>
            <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0' }}>
              Abra o WhatsApp no seu celular e escaneie o código abaixo
            </p>
          </div>
          <div style={{ padding: '2rem' }}>
            <img src={qrCode} alt="QR Code WhatsApp" style={{ maxWidth: '300px' }} />
          </div>
        </div>
      )}

      {/* Interface de Chat */}
      {connectionStatus === 'connected' && (
        <div style={{ display: 'flex', gap: '1rem', height: '600px' }}>
          {/* Lista de Conversas */}
          <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <h3 className="card-title">Conversas</h3>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {chats.length} conversa(s)
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {chats.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                  Nenhuma conversa ainda
                </div>
              ) : (
                chats.map(chat => (
                  <div
                    key={chat.jid}
                    onClick={() => selectChat(chat)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      backgroundColor: selectedChat?.jid === chat.jid ? '#f3f4f6' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {chat.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {chat.number}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                          {chat.lastMessage}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {formatTime(chat.timestamp)}
                        </span>
                        {chat.unread > 0 && (
                          <span style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem'
                          }}>
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Área de Chat */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedChat ? (
              <>
                {/* Header do Chat */}
                <div className="card-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <h3 className="card-title" style={{ margin: 0 }}>
                      {selectedChat.name}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                      {selectedChat.number}
                    </p>
                  </div>
                </div>

                {/* Mensagens */}
                <div style={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', color: '#6b7280' }}>
                      Carregando mensagens...
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280' }}>
                      Nenhuma mensagem ainda
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id || msg.message_id}
                        style={{
                          alignSelf: msg.isFromMe || msg.is_from_me ? 'flex-end' : 'flex-start',
                          maxWidth: '70%'
                        }}
                      >
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '1rem',
                            backgroundColor: msg.isFromMe || msg.is_from_me ? '#3b82f6' : '#f3f4f6',
                            color: msg.isFromMe || msg.is_from_me ? 'white' : '#1f2937'
                          }}
                        >
                          <div>{msg.message}</div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            opacity: 0.7, 
                            marginTop: '0.25rem',
                            textAlign: 'right'
                          }}>
                            {formatTime(msg.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input de Mensagem */}
                <div style={{ 
                  padding: '1rem', 
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="btn btn-primary"
                  >
                    Enviar
                  </button>
                </div>
              </>
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                Selecione uma conversa para começar
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status de Carregamento */}
      {connectionStatus === 'connecting' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ padding: '2rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
            <p>Conectando ao WhatsApp...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsApp;
