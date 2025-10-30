import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabaseClient';
import { notificationQueue } from '../lib/notificationQueue';
import { Calendar as CalendarIcon, User, Phone, Clock, CheckCircle, PartyPopper } from 'lucide-react';
import logoBrasao from '../images/logobrasaopreto.png';

// Supabase client is now provided by a shared singleton in ../lib/supabaseClient

const useAgendamentoNotifications = () => {
  const { user, isIncorporadora } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [agendamentoData, setAgendamentoData] = useState(null);
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

  const stopAgendamentoSound = useCallback(() => {
    stopAllAudio();
  }, [stopAllAudio]);

  const playAgendamentoSound = useCallback((musicaUrl) => {
    if (!audioInstanceRef.current || audioInstanceRef.current.paused) {
      audioStartedRef.current = false;
    }
    
    if (audioStartedRef.current && audioInstanceRef.current && !audioInstanceRef.current.paused) {
      return Promise.resolve(true);
    }
    
    if (audioInstanceRef.current && audioInstanceRef.current.readyState < 2) {
      return new Promise((resolve) => setTimeout(() => {
        playAgendamentoSound(musicaUrl).then(resolve).catch(() => resolve(false));
      }, 100));
    }

    try {
      if (audioInstanceRef.current) {
        try {
          audioInstanceRef.current.pause();
          audioInstanceRef.current.currentTime = 0;
        } catch (e) {
          // Ignorar erros
        }
        audioInstanceRef.current = null;
      }
      
      const expectedSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
      if (preloadedAudioRef.current) {
        const preloadSrc = preloadedAudioRef.current.src || '';
        const isSameFile = preloadSrc.includes(musicaUrl || 'audioNovoLead.mp3') || 
                          (musicaUrl && preloadSrc.includes(musicaUrl.split('/').pop()));
        if (isSameFile) {
          const preloadedSrc = preloadedAudioRef.current.src;
          const newAudio = new Audio(preloadedSrc);
          newAudio.volume = 1.0;
          newAudio.loop = false;
          newAudio.preload = 'auto';
          audioInstanceRef.current = newAudio;
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
        stopAgendamentoSound();
        setShowAgendamentoModal(false);
        setAgendamentoData(null);
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        if (currentAudio) {
          currentAudio.removeEventListener('ended', handleAudioEnded);
        }
      };
      
      currentAudio.addEventListener('ended', handleAudioEnded);
      
      return new Promise((resolve) => {
        let resolved = false;
        const resolveOnce = (v) => { if (!resolved) { resolved = true; resolve(v); } };
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
            playPromise.then(() => setTimeout(() => resolveOnce(true), 0)).catch(() => {
              const retryDelays = [50, 100, 150, 200, 300, 500, 750, 1000, 1500];
              let i = 0;
              const retry = () => {
                if (!audioInstanceRef.current || audioStartedRef.current) return resolveOnce(audioStartedRef.current);
                if (i >= retryDelays.length) return resolveOnce(false);
                const d = retryDelays[i++];
                setTimeout(() => {
                  if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
                    audioInstanceRef.current.play().then(() => setTimeout(() => resolveOnce(true), 0)).catch(retry);
                  } else {
                    resolveOnce(true);
                  }
                }, d);
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
  }, [stopAgendamentoSound]);

  useEffect(() => {
    if (user?.tipo !== 'admin' || user?.empresa_id !== 5) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    supabaseRef.current = supabase;

    const processNewAgendamentoNotification = async (data) => {
      if (processedNotificationIdsRef.current.has(data.id)) {
        return;
      }
      processedNotificationIdsRef.current.add(data.id);

      try {
        await notificationQueue.run(() => new Promise((resolve) => {
          activeTaskResolveRef.current = resolve;
        audioStartedRef.current = false;
        stopAllAudio();
        
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        
        setShowAgendamentoModal(false);
        setAgendamentoData(null);
        
        const audioSource = data.sdr_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        try {
          const preloadAudio = new Audio(audioSource);
          preloadAudio.preload = 'auto';
          preloadAudio.volume = 1.0;
          preloadAudio.load();
          preloadedAudioRef.current = preloadAudio;
        } catch (e) {
          // Ignorar erros
        }
        
        const agendamentoDataFormatted = {
          agendamentoId: data.agendamento_id,
          paciente_nome: data.paciente_nome,
          paciente_telefone: data.paciente_telefone,
          data_agendamento: data.data_agendamento,
          horario: data.horario,
          sdr_id: data.sdr_id,
          sdr_nome: data.sdr_nome,
          sdr_foto: data.sdr_foto,
          sdr_musica: data.sdr_musica,
          consultor_interno_id: data.consultor_interno_id
        };
        
        setTimeout(async () => {
          setAgendamentoData(agendamentoDataFormatted);
          audioStartedRef.current = false;
          await playAgendamentoSound(data.sdr_musica);
          setShowAgendamentoModal(true);
          previousModalStateRef.current = false;
          setNotifications(prev => [...prev, { id: Date.now(), type: 'new-agendamento', data: agendamentoDataFormatted, timestamp: new Date() }]);
        }, 100);
          // resolve happens when modal closes (hook effects)
        }));
      } catch (error) {
        // Ignorar erros
      }
    };

    const subscription = supabase
      .channel('notificacoes_agendamentos_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes_agendamentos',
          filter: `empresa_id=eq.5`
        },
        (payload) => {
          if (payload.new) {
            processNewAgendamentoNotification(payload.new);
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
      
      if (audioInstanceRef.current && !showAgendamentoModal) {
        try {
          audioInstanceRef.current.pause();
          audioInstanceRef.current.currentTime = 0;
          audioInstanceRef.current = null;
        } catch (e) {
          // Ignorar erros
        }
      }
    };
  }, [user?.id, user?.empresa_id, user?.tipo, stopAllAudio, playAgendamentoSound]);

  useLayoutEffect(() => {
    const wasClosed = !previousModalStateRef.current;
    const isNowOpen = showAgendamentoModal && agendamentoData;
    
    if (wasClosed && isNowOpen) {
      const existingTimerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (existingTimerAge < 2000 && modalTimerRef.current) {
        previousModalStateRef.current = showAgendamentoModal;
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
          stopAgendamentoSound();
          setShowAgendamentoModal(false);
          setAgendamentoData(null);
          previousModalStateRef.current = false;
          modalTimerRef.current = null;
          timerCreatedAtRef.current = null;
          if (activeTaskResolveRef.current) { activeTaskResolveRef.current(); activeTaskResolveRef.current = null; }
        }
      }, 20000);
      
      modalTimerRef.current = mainTimer;
      
      // Sincronização: o áudio já é iniciado antes de abrir o modal
    }
    
    previousModalStateRef.current = showAgendamentoModal;
  }, [showAgendamentoModal, agendamentoData, playAgendamentoSound, stopAgendamentoSound]);

  useEffect(() => {
    const wasOpen = previousModalStateRef.current;
    const isNowClosed = !showAgendamentoModal;
    
    previousModalStateRef.current = showAgendamentoModal;
    
    if (wasOpen && isNowClosed) {
      audioStartedRef.current = false;
      
      const timerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (timerAge > 1000) {
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        timerCreatedAtRef.current = null;
      }
      
      if (audioInstanceRef.current) {
        stopAgendamentoSound();
      }
      
      setAgendamentoData(null);
      
      preloadedAudioRef.current = null;
      if (activeTaskResolveRef.current) { activeTaskResolveRef.current(); activeTaskResolveRef.current = null; }
    }
  }, [showAgendamentoModal, stopAgendamentoSound]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const fecharModalAgendamento = () => {
    setShowAgendamentoModal(false);
    setAgendamentoData(null);
  };

  const AgendamentoModal = () => {
    if (!showAgendamentoModal || !agendamentoData) return null;

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
          @keyframes slideIn { 0% { transform: translateY(-20px) scale(0.95); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
          @keyframes pulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59,130,246,0.35);} 50% { transform: scale(1.01); box-shadow: 0 0 0 8px rgba(59,130,246,0.12);} }
          @keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px);} 100% { opacity: 1; transform: translateY(0);} }
          @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0;} 100% { transform: translateY(0); opacity: 1;} }
        `}</style>

        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '520px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideIn 0.5s ease-out, pulse 2s ease-in-out infinite',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.5rem', animation:'fadeIn 0.6s ease-out 0.2s both' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display:'flex', alignItems:'center', justifyContent:'center', marginRight:'0.875rem' }}>
              <CalendarIcon size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color:'#0f172a', margin:0, lineHeight:1.2 }}>Novo Agendamento</h1>
            </div>
          </div>

          {/* Foto e nome do SDR - DESTACADO */}
          {agendamentoData.sdr_foto && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.6s ease-out 0.25s both'
            }}>
              <div style={{
                position: 'relative',
                marginBottom: '0.75rem'
              }}>
                <img 
                  src={agendamentoData.sdr_foto} 
                  alt={agendamentoData.sdr_nome}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #3b82f6',
                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
                  }}
                />
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#1e40af',
                textAlign: 'center'
              }}>
                {agendamentoData.sdr_nome}
              </div>
            </div>
          )}
          
          {!agendamentoData.sdr_foto && (
            <div style={{ 
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.6s ease-out 0.25s both'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#1e40af',
                textAlign: 'center'
              }}>
                {agendamentoData.sdr_nome}
              </div>
            </div>
          )}

          {/* Card info */}
          <div style={{ background:'#f8fafc', borderRadius:14, padding:'1.25rem', marginBottom:'1rem', border:'1px solid #e2e8f0', animation:'slideUp 0.6s ease-out 0.3s both' }}>
            <div style={{ marginBottom:'1rem', borderBottom:'1px solid #e2e8f0', paddingBottom:'0.875rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'#64748b', fontSize:14, marginBottom:6 }}>
                <User size={16} />
                <span>Cliente</span>
              </div>
              <div style={{ color:'#0f172a', fontWeight:700, fontSize:18 }}>{agendamentoData.paciente_nome}</div>
            </div>
            <div style={{ marginBottom:'1rem', borderBottom:'1px solid #e2e8f0', paddingBottom:'0.875rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'#64748b', fontSize:14, marginBottom:6 }}>
                <CalendarIcon size={16} />
                <span>Data e horário</span>
              </div>
              <div style={{ color:'#059669', fontWeight:800, fontSize:18 }}>
                {new Date(agendamentoData.data_agendamento).toLocaleDateString('pt-BR')} às {agendamentoData.horario}
              </div>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'#64748b', fontSize:14, marginBottom:6 }}>
                <Phone size={16} />
                <span>Telefone</span>
              </div>
              <div style={{ fontSize:16 }}>
                <a href={`tel:${agendamentoData.paciente_telefone}`} style={{ color:'#2563eb', textDecoration:'none', fontWeight:600 }}>{agendamentoData.paciente_telefone}</a>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.875rem', background:'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius:12, border:'1px solid #f59e0b', color:'#92400e' }}>
            <PartyPopper size={18} />
            <span style={{ fontSize:14, fontWeight:600 }}>Parabéns! Agendamento realizado com sucesso</span>
          </div>

          {/* Footer */}
          <div style={{ marginTop:'1.25rem', paddingTop:'0.875rem', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'center', alignItems:'center', gap:8, opacity:0.75 }}>
            <img src={logoBrasao} alt="Invest Money" style={{ width:22, height:22, objectFit:'contain' }} />
            <span style={{ fontSize:12, color:'#64748b', fontWeight:500 }}>IM Solumn</span>
          </div>
        </div>
      </div>
    );
  };

  return {
    notifications,
    clearNotifications,
    showAgendamentoModal,
    agendamentoData,
    fecharModalAgendamento,
    AgendamentoModal
  };
};

export default useAgendamentoNotifications;
