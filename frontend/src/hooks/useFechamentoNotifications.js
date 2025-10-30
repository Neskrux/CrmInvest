import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabaseClient';
import { CheckCircle, User, DollarSign, Calendar as CalendarIcon, Clock } from 'lucide-react';
import logoBrasao from '../images/logobrasaopreto.png';

// Supabase client is now provided by a shared singleton in ../lib/supabaseClient

const useFechamentoNotifications = () => {
  const { user } = useAuth();
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [fechamentoData, setFechamentoData] = useState(null);
  const audioInstanceRef = useRef(null);
  const modalTimerRef = useRef(null);
  const previousModalStateRef = useRef(false);
  const audioStartedRef = useRef(false);
  const timerCreatedAtRef = useRef(null);
  const preloadedAudioRef = useRef(null);
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

  const stopFechamentoSound = useCallback(() => {
    stopAllAudio();
  }, [stopAllAudio]);

  const playFechamentoSound = useCallback((musicaUrl) => {
    if (audioStartedRef.current && audioInstanceRef.current && !audioInstanceRef.current.paused) {
      return;
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
        stopFechamentoSound();
        
        const audioSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        
        const audio = new Audio(audioSource);
        audio.volume = 0.6;
        audio.loop = false;
        audio.preload = 'auto';
        
        audioInstanceRef.current = audio;
      }
      
      audioStartedRef.current = false;
      
      const currentAudio = audioInstanceRef.current;
      if (!currentAudio) return;
      
      const handleAudioEnded = () => {
        audioStartedRef.current = false;
        stopFechamentoSound();
        setShowFechamentoModal(false);
        setFechamentoData(null);
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
      
      const tryPlay = (attemptNumber = 0) => {
        if (!audioInstanceRef.current) return;
        
        const playPromise = audioInstanceRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              audioStartedRef.current = true;
            })
            .catch(error => {
              const retryDelays = [50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000];
              let retryCount = 0;
              
              const tryPlayAgain = () => {
                if (retryCount < retryDelays.length && audioInstanceRef.current) {
                  const delay = retryDelays[retryCount];
                  
                  setTimeout(() => {
                    if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
                      audioInstanceRef.current.play()
                        .then(() => {
                          audioStartedRef.current = true;
                        })
                        .catch((err) => {
                          retryCount++;
                          if (retryCount < retryDelays.length) {
                            tryPlayAgain();
                          }
                        });
                    }
                  }, delay);
                }
              };
              
              tryPlayAgain();
            });
        }
      };
      
      tryPlay(0);
      
      const immediateRetries = [25, 50, 75, 100, 150, 200];
      immediateRetries.forEach((delay, index) => {
        setTimeout(() => {
          if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
            tryPlay(index + 1);
          }
        }, delay);
      });
      
      audioInstanceRef.current.addEventListener('loadstart', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          tryPlay(100);
        }
      }, { once: true });
      
      audioInstanceRef.current.addEventListener('loadeddata', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          tryPlay(101);
        }
      }, { once: true });

      audioInstanceRef.current.addEventListener('canplay', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          tryPlay(102);
        }
      }, { once: true });

      audioInstanceRef.current.addEventListener('canplaythrough', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          tryPlay(103);
        }
      }, { once: true });
    } catch (error) {
      // Ignorar erros
    }
  }, [stopFechamentoSound]);

  const fecharModal = useCallback(() => {
    stopFechamentoSound();
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
      modalTimerRef.current = null;
    }
    setShowFechamentoModal(false);
    setFechamentoData(null);
  }, [stopFechamentoSound]);

  const userData = useMemo(() => ({
    id: user?.id,
    empresa_id: user?.empresa_id,
    tipo: user?.tipo
  }), [user?.id, user?.empresa_id, user?.tipo]);

  useEffect(() => {
    if (!userData || userData.tipo !== 'admin' || userData.empresa_id !== 5 || !userData.id) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    supabaseRef.current = supabase;

    const processNewFechamentoNotification = (data) => {
      if (processedNotificationIdsRef.current.has(data.id)) {
        return;
      }
      processedNotificationIdsRef.current.add(data.id);

      try {
        audioStartedRef.current = false;
        stopAllAudio();
        
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        
        setShowFechamentoModal(false);
        setFechamentoData(null);
        
        const audioSource = data.corretor_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        try {
          const preloadAudio = new Audio(audioSource);
          preloadAudio.preload = 'auto';
          preloadAudio.volume = 0.6;
          preloadAudio.load();
          preloadedAudioRef.current = preloadAudio;
        } catch (e) {
          // Ignorar erros
        }
        
        const fechamentoDataFormatted = {
          fechamentoId: data.fechamento_id,
          paciente_nome: data.paciente_nome,
          paciente_telefone: data.paciente_telefone,
          valor_fechado: data.valor_fechado,
          data_fechamento: data.data_fechamento,
          consultor_interno_id: data.consultor_interno_id,
          corretor_nome: data.corretor_nome,
          corretor_foto: data.corretor_foto,
          corretor_musica: data.corretor_musica
        };
        
        setTimeout(() => {
          setFechamentoData(fechamentoDataFormatted);
          setShowFechamentoModal(true);
          previousModalStateRef.current = false;
          playFechamentoSound(data.corretor_musica);
        }, 100);
      } catch (error) {
        // Ignorar erros
      }
    };

    const subscription = supabase
      .channel('notificacoes_fechamentos_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes_fechamentos',
          filter: `empresa_id=eq.5`
        },
        (payload) => {
          if (payload.new) {
            processNewFechamentoNotification(payload.new);
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
      
      if (!showFechamentoModal && audioInstanceRef.current) {
        try {
          audioInstanceRef.current.pause();
          audioInstanceRef.current.currentTime = 0;
          audioInstanceRef.current = null;
        } catch (e) {
          // Ignorar erros
        }
      }
    };
  }, [userData?.id, userData?.tipo, userData?.empresa_id, playFechamentoSound, stopFechamentoSound]);

  useLayoutEffect(() => {
    const wasClosed = !previousModalStateRef.current;
    const isNowOpen = showFechamentoModal && fechamentoData;
    
    if (wasClosed && isNowOpen) {
      const existingTimerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (existingTimerAge < 2000 && modalTimerRef.current) {
        previousModalStateRef.current = showFechamentoModal;
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
          stopFechamentoSound();
          setShowFechamentoModal(false);
          setFechamentoData(null);
          previousModalStateRef.current = false;
          modalTimerRef.current = null;
          timerCreatedAtRef.current = null;
        }
      }, 20000);
      
      modalTimerRef.current = mainTimer;
      
      if (showFechamentoModal && fechamentoData && !audioStartedRef.current) {
        playFechamentoSound(fechamentoData.corretor_musica);
        
        [100, 200, 300].forEach((delay) => {
          setTimeout(() => {
            if (showFechamentoModal && fechamentoData && !audioStartedRef.current && audioInstanceRef.current) {
              try {
                if (audioInstanceRef.current.paused) {
                  audioInstanceRef.current.play()
                    .then(() => {
                      audioStartedRef.current = true;
                    })
                    .catch(() => {
                      // Ignorar erros
                    });
                }
              } catch (e) {
                // Ignorar erros
              }
            }
          }, delay);
        });
      }
    }
    
    previousModalStateRef.current = showFechamentoModal;
  }, [showFechamentoModal, fechamentoData, playFechamentoSound, stopFechamentoSound]);

  useEffect(() => {
    const wasOpen = previousModalStateRef.current;
    const isNowClosed = !showFechamentoModal;
    
    previousModalStateRef.current = showFechamentoModal;
    
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
        stopFechamentoSound();
      }
    }
  }, [showFechamentoModal, stopFechamentoSound]);

  const FechamentoModal = () => {
    if (!showFechamentoModal || !fechamentoData) return null;

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
          @keyframes pulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0.35);} 50% { transform: scale(1.01); box-shadow: 0 0 0 8px rgba(16,185,129,0.12);} }
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
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem',
            animation: 'fadeIn 0.6s ease-out 0.2s both'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '0.875rem',
            }}>
              <CheckCircle size={26} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Novo Fechamento</h1>
            </div>
          </div>

          {/* Foto e nome do Corretor - DESTACADO */}
          {fechamentoData.corretor_foto && (
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
                  src={fechamentoData.corretor_foto} 
                  alt={fechamentoData.corretor_nome}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #10b981',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                  }}
                />
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#047857',
                textAlign: 'center'
              }}>
                {fechamentoData.corretor_nome}
              </div>
            </div>
          )}
          
          {!fechamentoData.corretor_foto && (
            <div style={{ 
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.6s ease-out 0.25s both'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#047857',
                textAlign: 'center'
              }}>
                {fechamentoData.corretor_nome}
              </div>
            </div>
          )}

          {/* Card info */}
          <div style={{
            background: '#f0fdf4', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem',
            border: '1px solid #bbf7d0', animation: 'slideUp 0.6s ease-out 0.3s both'
          }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #bbf7d0', paddingBottom: '0.875rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap: '0.5rem', color:'#64748b', fontSize: 14, marginBottom: 6 }}>
                <User size={16} />
                <span>Cliente</span>
              </div>
              <div style={{ color:'#0f172a', fontWeight: 700, fontSize: 18 }}>{fechamentoData.paciente_nome}</div>
            </div>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #bbf7d0', paddingBottom: '0.875rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap: '0.5rem', color:'#64748b', fontSize: 14, marginBottom: 6 }}>
                <DollarSign size={16} />
                <span>Valor Fechado</span>
              </div>
              <div style={{ color:'#059669', fontWeight: 800, fontSize: 22 }}>
                R$ {fechamentoData.valor_fechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap: '0.5rem', color:'#64748b', fontSize: 14, marginBottom: 6 }}>
                <CalendarIcon size={16} />
                <span>Data</span>
              </div>
              <div style={{ color:'#0f172a', fontWeight: 700, fontSize: 16 }}>
                {new Date(fechamentoData.data_fechamento).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap: '0.5rem', padding:'0.875rem',
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', borderRadius: 12, border: '1px solid #86efac',
            color:'#065f46'
          }}>
            <Clock size={18} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Parabéns! Fechamento registrado</span>
          </div>

          {/* Footer */}
          <div style={{ marginTop:'1.25rem', paddingTop:'0.875rem', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'center', alignItems:'center', gap:8, opacity:0.75 }}>
            <img src={logoBrasao} alt="Invest Money" style={{ width: 22, height: 22, objectFit:'contain' }} />
            <span style={{ fontSize: 12, color:'#64748b', fontWeight: 500 }}>IM Solumn</span>
          </div>
        </div>
      </div>
    );
  };

  return {
    showFechamentoModal,
    fechamentoData,
    fecharModal,
    FechamentoModal
  };
};

export default useFechamentoNotifications;
