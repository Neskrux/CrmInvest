import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabaseClient';
import { notificationQueue } from '../lib/notificationQueue';
import { AlertCircle, Phone, MapPin, User, Clock } from 'lucide-react';
import logoBrasao from '../images/logobrasaopreto.png';

const useIncorporadoraNotifications = () => {
  const { user, isIncorporadora } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState(null);
  const audioInstanceRef = useRef(null);
  const modalTimerRef = useRef(null);
  const previousModalStateRef = useRef(false);
  const audioStartedRef = useRef(false);
  const timerCreatedAtRef = useRef(null);
  const preloadedAudioRef = useRef(null);
  const activeTaskResolveRef = useRef(null);
  const supabaseRef = useRef(null);
  const subscriptionRef = useRef(null);
  const processedNotificationIdsRef = useRef(new Set());

  const stopAllAudio = useCallback(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current.currentTime = 0;
      audioInstanceRef.current = null;
    }
    
    try {
      const allAudioElements = document.querySelectorAll('audio');
      allAudioElements.forEach((audio) => {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    } catch (error) {
      // Ignorar erros
    }
  }, []);

  const stopNotificationSound = useCallback(() => {
    stopAllAudio();
  }, [stopAllAudio]);

  const playNotificationSound = useCallback((musicaUrl) => {
    if (audioStartedRef.current && audioInstanceRef.current && !audioInstanceRef.current.paused) {
      return Promise.resolve(true);
    }

    try {
      const expectedSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
      if (preloadedAudioRef.current) {
        const preloadSrc = preloadedAudioRef.current.src || '';
        const isSameFile = preloadSrc.includes(musicaUrl || 'audioNovoLead.mp3') || 
                          (musicaUrl && preloadSrc.includes(musicaUrl.split('/').pop()));
        if (isSameFile) {
          audioInstanceRef.current = preloadedAudioRef.current;
          preloadedAudioRef.current = null;
        } else {
          preloadedAudioRef.current = null;
        }
      }
      
      if (!audioInstanceRef.current) {
        const audioSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        const audio = new Audio(audioSource);
        audio.volume = 1.0;
        audio.loop = false;
        audio.preload = 'auto';
        
        audioInstanceRef.current = audio;
      }
      
      audioStartedRef.current = false;
      
      const currentAudio = audioInstanceRef.current;
      if (!currentAudio) return Promise.resolve(false);
      
      const handleAudioEnded = () => {
        audioStartedRef.current = false;
        stopNotificationSound();
        setShowNewLeadModal(false);
        setNewLeadData(null);
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        timerCreatedAtRef.current = null;
        if (currentAudio) {
          currentAudio.removeEventListener('ended', handleAudioEnded);
        }
      };
      
      currentAudio.addEventListener('ended', handleAudioEnded);
      
      return new Promise((resolve) => {
        let resolved = false;
        const resolveOnce = (value) => {
          if (!resolved) {
            resolved = true;
            resolve(value);
          }
        };

        const onPlaying = () => {
          audioStartedRef.current = true;
          currentAudio.removeEventListener('playing', onPlaying);
          resolveOnce(true);
        };
        currentAudio.addEventListener('playing', onPlaying, { once: true });

        const tryPlay = () => {
          if (!audioInstanceRef.current) return resolveOnce(false);
          const playPromise = audioInstanceRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // 'playing' listener will resolve; keep as backup after a tick
                setTimeout(() => resolveOnce(true), 0);
              })
              .catch(() => {
                // simple retry ladder
                const retryDelays = [50, 100, 150, 200, 300, 500, 750, 1000, 1500];
                let idx = 0;
                const retry = () => {
                  if (!audioInstanceRef.current || audioStartedRef.current) return resolveOnce(audioStartedRef.current);
                  if (idx >= retryDelays.length) return resolveOnce(false);
                  const delay = retryDelays[idx++];
                  setTimeout(() => {
                    if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
                      audioInstanceRef.current.play().then(() => setTimeout(() => resolveOnce(true), 0)).catch(retry);
                    } else {
                      resolveOnce(true);
                    }
                  }, delay);
                };
                retry();
              });
          } else {
            resolveOnce(false);
          }
        };

        tryPlay();
      });
    } catch (error) {
      // Ignorar erros
      return Promise.resolve(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !user.id || user.tipo !== 'admin' || user.empresa_id !== 5) {
      return;
    }

    const pendingNotification = localStorage.getItem('pending_notification');

    if (pendingNotification) {
      try {
        const notification = JSON.parse(pendingNotification);
        
        if (notification.type === 'new-lead' && notification.data) {
          const maybeLeadId = notification.data.lead_id || notification.data.id;
          const hasSdrInPayload = !!notification.data.sdr_id;
          const proceedIfUnassigned = async () => {
            // Não exibir notificação se já houver sdr_id atribuído
            if (hasSdrInPayload) return false;
            if (!maybeLeadId) return true; // sem como checar, manter comportamento antigo
            try {
              const supabase = getSupabaseClient();
              if (!supabase) return true;
              const { data } = await supabase
                .from('pacientes')
                .select('id, sdr_id')
                .eq('id', maybeLeadId)
                .single();
              return !data?.sdr_id;
            } catch (_) {
              return true;
            }
          };

          (async () => {
            const canShow = await proceedIfUnassigned();
            localStorage.removeItem('pending_notification');
            if (!canShow) return;

            const audioSource = notification.data.corretor_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
            try {
              const preloadAudio = new Audio(audioSource);
              preloadAudio.preload = 'auto';
              preloadAudio.volume = 1.0;
              preloadAudio.load();
              preloadedAudioRef.current = preloadAudio;
            } catch (e) {
              // Ignorar erros
            }
            
            setNewLeadData(notification.data);
            audioStartedRef.current = false;
            await playNotificationSound(notification.data.corretor_musica);
            setShowNewLeadModal(true);
            previousModalStateRef.current = false;
            setNotifications(prev => [...prev, { id: Date.now(), type: 'new-lead', data: notification.data, timestamp: new Date() }]);
          })();
        }
      } catch (error) {
        localStorage.removeItem('pending_notification');
      }
    }
  }, [user?.id, user?.tipo, user?.empresa_id, playNotificationSound, stopNotificationSound]);

  useEffect(() => {
    if (user?.tipo !== 'admin' || user?.empresa_id !== 5) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    supabaseRef.current = supabase;

    const processNewLeadNotification = async (data) => {
      // Não exibir notificação se já houver sdr_id atribuído (no payload ou no próprio lead)
      if (data?.sdr_id) {
        return;
      }
      try {
        const supabase = getSupabaseClient();
        if (supabase && data?.lead_id) {
          const { data: leadRow } = await supabase
            .from('pacientes')
            .select('id, sdr_id')
            .eq('id', data.lead_id)
            .single();
          if (leadRow?.sdr_id) {
            return; // já atribuído, não notificar
          }
        }
      } catch (_) {
        // Se falhar a checagem, seguimos com comportamento padrão (mostrar)
      }
      if (processedNotificationIdsRef.current.has(data.id)) {
        return;
      }
      processedNotificationIdsRef.current.add(data.id);

      try {
        await notificationQueue.run(() => new Promise((resolve) => {
          activeTaskResolveRef.current = resolve;
        audioStartedRef.current = false;
        stopAllAudio();
        
        const audioSource = data.corretor_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        try {
          const preloadAudio = new Audio(audioSource);
          preloadAudio.preload = 'auto';
          preloadAudio.volume = 1.0;
          preloadAudio.load();
          preloadedAudioRef.current = preloadAudio;
        } catch (e) {
          // Ignorar erros
        }
        
        const leadData = {
          leadId: data.lead_id,
          nome: data.nome,
          telefone: data.telefone,
          cidade: data.cidade,
          estado: data.estado,
          empreendimento_id: data.empreendimento_id,
          consultor_nome: data.consultor_nome,
          consultor_foto: data.consultor_foto,
          corretor_musica: data.corretor_musica
        };
        
        setNewLeadData(leadData);
        audioStartedRef.current = false;
        
        (async () => {
          await playNotificationSound(data.corretor_musica);
          setShowNewLeadModal(true);
          previousModalStateRef.current = false;
          setNotifications(prev => [...prev, { id: Date.now(), type: 'new-lead', data: leadData, timestamp: new Date() }]);
        })();

      }));
      } catch (error) {
        // Ignorar erros
      }
    };

    const subscription = supabase
      .channel('notificacoes_leads_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes_leads',
          filter: `empresa_id=eq.5`
        },
        (payload) => {
          if (payload.new) {
            processNewLeadNotification(payload.new);
          }
        }
      )
      .subscribe((status) => {
        // Subscription ativa
      });

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      
      if (processedNotificationIdsRef.current.size > 100) {
        processedNotificationIdsRef.current.clear();
      }
      
      if (audioInstanceRef.current && !showNewLeadModal) {
        try {
          audioInstanceRef.current.pause();
          audioInstanceRef.current.currentTime = 0;
          audioInstanceRef.current = null;
        } catch (e) {
          // Ignorar erros
        }
      }
    };
  }, [user?.id, user?.empresa_id, user?.tipo, stopAllAudio, playNotificationSound]);

  useLayoutEffect(() => {
    const wasClosed = !previousModalStateRef.current;
    const isNowOpen = showNewLeadModal && newLeadData;
    
    if (wasClosed && isNowOpen) {
      const existingTimerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (existingTimerAge < 2000 && modalTimerRef.current) {
        previousModalStateRef.current = showNewLeadModal;
        return;
      }
      
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      
      const timerCreatedAt = Date.now();
      timerCreatedAtRef.current = timerCreatedAt;
      
      const mainTimer = setTimeout(() => {
        if (modalTimerRef.current === mainTimer && timerCreatedAtRef.current === timerCreatedAt) {
          audioStartedRef.current = false;
          stopNotificationSound();
          setShowNewLeadModal(false);
          setNewLeadData(null);
          previousModalStateRef.current = false;
          modalTimerRef.current = null;
          timerCreatedAtRef.current = null;
          if (activeTaskResolveRef.current) { activeTaskResolveRef.current(); activeTaskResolveRef.current = null; }
        }
      }, 20000);
      
      modalTimerRef.current = mainTimer;
      // Sincronização: o áudio já é iniciado antes de abrir o modal
    }
    
    previousModalStateRef.current = showNewLeadModal;
  }, [showNewLeadModal, newLeadData, playNotificationSound, stopNotificationSound]);

  useEffect(() => {
    const wasOpen = previousModalStateRef.current;
    const isNowClosed = !showNewLeadModal;
    
    previousModalStateRef.current = showNewLeadModal;
    
      if (wasOpen && isNowClosed) {
      const timerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (timerAge > 1000) {
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        timerCreatedAtRef.current = null;
      }
      
      audioStartedRef.current = false;
      if (audioInstanceRef.current) {
        stopNotificationSound();
      }
        if (activeTaskResolveRef.current) { activeTaskResolveRef.current(); activeTaskResolveRef.current = null; }
    }
  }, [showNewLeadModal, stopNotificationSound]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const NewLeadModal = () => {
    if (!showNewLeadModal || !newLeadData) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <style>{`
          @keyframes slideIn {
            0% { 
              transform: translateY(-20px) scale(0.95); 
              opacity: 0; 
            }
            100% { 
              transform: translateY(0) scale(1); 
              opacity: 1; 
            }
          }
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1); 
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
            }
            50% { 
              transform: scale(1.01); 
              box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1);
            }
          }
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideIn 0.5s ease-out, pulse 2s ease-in-out infinite',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header com ícone animado */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            animation: 'fadeIn 0.6s ease-out 0.2s both'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <AlertCircle size={28} color="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: 0,
                lineHeight: 1.2
              }}>
                Novo Lead
              </h1>
            </div>
          </div>
          
          {/* Card de informações */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0',
            animation: 'slideUp 0.6s ease-out 0.3s both'
          }}>
            {/* Nome do Cliente */}
            <div style={{ 
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.5rem' 
              }}>
                <User size={16} color="#64748b" />
                <span style={{ 
                  color: '#64748b', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}>
                  Cliente
                </span>
              </div>
              <p style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700',
                color: '#1e293b',
                margin: 0
              }}>
                {newLeadData.nome}
              </p>
            </div>
            
            {/* Telefone */}
            <div style={{ 
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.5rem' 
              }}>
                <Phone size={16} color="#64748b" />
                <span style={{ 
                  color: '#64748b', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}>
                  Telefone
                </span>
              </div>
              <p style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#3b82f6',
                margin: 0
              }}>
                {newLeadData.telefone}
              </p>
            </div>
            
            {/* Localização */}
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.5rem' 
              }}>
                <MapPin size={16} color="#64748b" />
                <span style={{ 
                  color: '#64748b', 
                  fontSize: '0.875rem', 
                  fontWeight: '500' 
                }}>
                  Localização
                </span>
              </div>
              <p style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#059669',
                margin: 0
              }}>
                {newLeadData.cidade}/{newLeadData.estado}
              </p>
            </div>
          </div>

          {/* Call to action */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px',
            border: '1px solid #f59e0b',
            animation: 'fadeIn 0.6s ease-out 0.4s both'
          }}>
            <Clock size={18} color="#d97706" />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#92400e'
            }}>
              Seja rápido! Lead disponível para captura
            </span>
          </div>
          
          {/* Footer */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: 0.7,
            animation: 'fadeIn 0.6s ease-out 0.5s both'
          }}>
            <img 
              src={logoBrasao}
              alt="Invest Money" 
              style={{
                width: '24px',
                height: '24px',
                objectFit: 'contain'
              }}
            />
            <span style={{
              fontSize: '0.75rem',
              color: '#64748b',
              fontWeight: '500'
            }}>
              IM Solumn
            </span>
          </div>
        </div>
      </div>
    );
  };

  return {
    notifications,
    clearNotifications,
    showNewLeadModal,
    newLeadData,
    NewLeadModal
  };
};

export default useIncorporadoraNotifications;
