import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from './Toast';
import logoBrasaoPreto from '../images/logohorizontalpreto.png';

const ValidacaoBiometrica = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  
  // Dados do paciente vindos do login
  const { paciente_id, paciente_nome, email, senha } = location.state || {};

  // Estados do componente
  const [passoAtual, setPassoAtual] = useState(1); // 1 = selfie, 2 = documento, 3 = validando
  const [selfieBase64, setSelfieBase64] = useState(null);
  const [documentoBase64, setDocumentoBase64] = useState(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Refs para vídeo e canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Detectar mudanças de tamanho de tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Verificar se tem dados do paciente
  useEffect(() => {
    if (!paciente_id) {
      showErrorToast('Dados do paciente não encontrados. Por favor, faça login novamente.');
      navigate('/login');
    }
  }, [paciente_id, navigate, showErrorToast]);

  // Limpar stream ao desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Atualizar vídeo quando stream mudar
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Erro ao reproduzir vídeo:', err);
      });
    }
  }, [stream]);

  // Iniciar câmera
  const iniciarCamera = async () => {
    try {
      setError(''); // Limpar erros anteriores
      
      // Detectar mobile dinamicamente
      const isMobileDevice = window.innerWidth < 768;
      
      // Em mobile, usar facingMode: 'user' para selfie e 'environment' para documento
      const facingMode = passoAtual === 1 ? 'user' : 'environment';
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      // Garantir que o vídeo seja atualizado
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => {
          console.error('Erro ao reproduzir vídeo:', err);
          setError('Erro ao iniciar câmera. Tente novamente.');
        });
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      let mensagemErro = 'Não foi possível acessar a câmera.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        mensagemErro = 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        mensagemErro = 'Nenhuma câmera encontrada. Verifique se seu dispositivo tem câmera.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        mensagemErro = 'A câmera está sendo usada por outro aplicativo. Feche outros aplicativos e tente novamente.';
      }
      
      setError(mensagemErro);
      showErrorToast(mensagemErro);
    }
  };

  // Parar câmera
  const pararCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Capturar foto da câmera
  const capturarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    if (passoAtual === 1) {
      setSelfieBase64(base64);
    } else {
      setDocumentoBase64(base64);
    }
    
    pararCamera();
  };

  // Upload de arquivo (para documento)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      showErrorToast('Por favor, selecione uma imagem válida.');
      return;
    }

    // Validar tamanho (máximo 15MB conforme API BigDataCorp)
    if (file.size > 15 * 1024 * 1024) {
      showErrorToast('A imagem deve ter no máximo 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setDocumentoBase64(event.target.result);
    };
    reader.onerror = () => {
      showErrorToast('Erro ao ler o arquivo.');
    };
    reader.readAsDataURL(file);
  };

  // Validar biométrica
  const validarBiometria = async () => {
    if (!selfieBase64 || !documentoBase64) {
      setError('Por favor, tire uma foto do rosto e do documento.');
      return;
    }

    if (!paciente_id) {
      setError('ID do paciente não encontrado. Por favor, faça login novamente.');
      showErrorToast('ID do paciente não encontrado.');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');
    setPassoAtual(3);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      console.log('🔐 [FRONTEND] Enviando requisição de validação biométrica...');
      console.log('🔐 [FRONTEND] URL:', `${API_BASE_URL}/auth/validar-biometria`);
      console.log('🔐 [FRONTEND] Paciente ID:', paciente_id);
      console.log('🔐 [FRONTEND] Selfie presente?', !!selfieBase64);
      console.log('🔐 [FRONTEND] Documento presente?', !!documentoBase64);
      
      const response = await fetch(`${API_BASE_URL}/auth/validar-biometria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paciente_id,
          selfie_base64: selfieBase64,
          documento_base64: documentoBase64
        })
      });

      console.log('🔐 [FRONTEND] Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const data = await response.json();
      console.log('🔐 [FRONTEND] Dados da resposta:', data);

      if (response.ok && data.aprovado) {
        // APROVADO - Salvar token e redirecionar
        showSuccessToast('Identidade validada com sucesso!');
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        
        // Redirecionar para dashboard do paciente
        navigate('/dashboard');
      } else {
        // NÃO APROVADO - Mostrar erro e permitir tentar novamente
        const errorMessage = data.error || data.message || 'As faces não correspondem. Por favor, tente novamente.';
        setError(errorMessage);
        setPassoAtual(1); // Voltar para o início
        setSelfieBase64(null);
        setDocumentoBase64(null);
        showErrorToast(errorMessage);
      }
    } catch (err) {
      console.error('❌ [FRONTEND] Erro ao validar biométrica:', err);
      const errorMessage = err.message || 'Erro ao conectar com o servidor. Tente novamente.';
      setError(errorMessage);
      setPassoAtual(1);
      showErrorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Voltar para login
  const voltarParaLogin = () => {
    navigate('/login');
  };

  // Tirar foto novamente
  const tirarFotoNovamente = () => {
    if (passoAtual === 1) {
      setSelfieBase64(null);
    } else {
      setDocumentoBase64(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1d23 0%, #2d3748 100%)',
      padding: isMobile ? '0.5rem' : '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: isMobile ? '0' : '12px',
        padding: isMobile ? '1.25rem' : '2rem',
        maxWidth: '600px',
        width: '100%',
        boxShadow: isMobile ? 'none' : '0 20px 40px rgba(0, 0, 0, 0.1)',
        maxHeight: isMobile ? '100vh' : 'auto',
        overflowY: isMobile ? 'auto' : 'visible'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={logoBrasaoPreto} 
            alt="Logo" 
            style={{ 
              height: isMobile ? '50px' : '60px', 
              marginBottom: isMobile ? '0.75rem' : '1rem',
              objectFit: 'contain'
            }} 
          />
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#1a1d23' }}>
            Validação de Identidade
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: isMobile ? '0.8125rem' : '0.875rem' }}>
            Olá, {paciente_nome || 'Paciente'}
          </p>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        {/* Passo 1: Selfie */}
        {passoAtual === 1 && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1a1d23' }}>
                Passo 1: Foto do Rosto
              </h3>
              <p style={{ color: '#6b7280', fontSize: isMobile ? '0.8125rem' : '0.875rem', marginBottom: '1rem' }}>
                Posicione seu rosto na câmera e tire uma selfie clara.
              </p>
            </div>

            {!selfieBase64 ? (
              <div>
                {!stream ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem'
                      }}>
                        📷
                      </div>
                    </div>
                    <button
                      onClick={iniciarCamera}
                      style={{
                        padding: isMobile ? '1rem 2rem' : '0.75rem 2rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: isMobile ? '1rem' : '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: isMobile ? '100%' : 'auto',
                        minHeight: isMobile ? '48px' : 'auto',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) e.target.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) e.target.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      📷 Abrir Câmera
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      backgroundColor: '#000',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      minHeight: isMobile ? '300px' : '400px',
                      maxHeight: isMobile ? '70vh' : '500px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          display: stream ? 'block' : 'none',
                          transform: isMobile ? 'scaleX(-1)' : 'none' // Espelhar em mobile para selfie
                        }}
                      />
                      {!stream && (
                        <div style={{
                          color: 'white',
                          textAlign: 'center',
                          padding: '2rem'
                        }}>
                          Carregando câmera...
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: isMobile ? '0.5rem' : '0.75rem', 
                      justifyContent: 'center',
                      flexDirection: isMobile ? 'column' : 'row'
                    }}>
                      <button
                        onClick={pararCamera}
                        style={{
                          padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: isMobile ? '1rem' : '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: isMobile ? '100%' : 'auto',
                          minHeight: isMobile ? '48px' : 'auto',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={capturarFoto}
                        style={{
                          padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: isMobile ? '1rem' : '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: isMobile ? '100%' : 'auto',
                          minHeight: isMobile ? '48px' : 'auto',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        ✅ Tirar Foto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <img
                  src={selfieBase64}
                  alt="Selfie capturada"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    maxHeight: '400px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  gap: isMobile ? '0.5rem' : '0.75rem', 
                  justifyContent: 'center',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <button
                    onClick={tirarFotoNovamente}
                    style={{
                      padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: isMobile ? '100%' : 'auto',
                      minHeight: isMobile ? '48px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    🔄 Tirar Novamente
                  </button>
                  <button
                    onClick={() => setPassoAtual(2)}
                    style={{
                      padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: isMobile ? '100%' : 'auto',
                      minHeight: isMobile ? '48px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Passo 2: Documento */}
        {passoAtual === 2 && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1a1d23' }}>
                Passo 2: Foto do Documento
              </h3>
              <p style={{ color: '#6b7280', fontSize: isMobile ? '0.8125rem' : '0.875rem', marginBottom: '1rem' }}>
                Tire uma foto do seu RG ou CNH. A foto deve estar clara e legível.
              </p>
            </div>

            {!documentoBase64 ? (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={iniciarCamera}
                    style={{
                      width: '100%',
                      padding: isMobile ? '1rem' : '0.75rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginBottom: '0.75rem',
                      minHeight: isMobile ? '48px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    📷 Tirar Foto com Câmera
                  </button>
                  <div style={{ textAlign: 'center', color: '#6b7280', margin: '0.75rem 0' }}>
                    ou
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: isMobile ? '1rem' : '0.75rem',
                      backgroundColor: '#e5e7eb',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minHeight: isMobile ? '48px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    📁 Escolher Arquivo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                {stream && (
                  <div>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      backgroundColor: '#000',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      minHeight: isMobile ? '300px' : '400px',
                      maxHeight: isMobile ? '70vh' : '500px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          display: stream ? 'block' : 'none'
                        }}
                      />
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: isMobile ? '0.5rem' : '0.75rem', 
                      justifyContent: 'center',
                      flexDirection: isMobile ? 'column' : 'row'
                    }}>
                      <button
                        onClick={pararCamera}
                        style={{
                          padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: isMobile ? '1rem' : '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: isMobile ? '100%' : 'auto',
                          minHeight: isMobile ? '48px' : 'auto',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={capturarFoto}
                        style={{
                          padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: isMobile ? '1rem' : '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: isMobile ? '100%' : 'auto',
                          minHeight: isMobile ? '48px' : 'auto',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        ✅ Tirar Foto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <img
                  src={documentoBase64}
                  alt="Documento capturado"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    backgroundColor: '#f9fafb'
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  gap: isMobile ? '0.5rem' : '0.75rem', 
                  justifyContent: 'center',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <button
                    onClick={tirarFotoNovamente}
                    style={{
                      padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: isMobile ? '100%' : 'auto',
                      minHeight: isMobile ? '48px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    🔄 Tirar Novamente
                  </button>
                  <button
                    onClick={validarBiometria}
                    disabled={loading}
                    style={{
                      padding: isMobile ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      backgroundColor: loading ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: isMobile ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      width: isMobile ? '100%' : 'auto',
                      minHeight: isMobile ? '48px' : 'auto',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {loading ? '⏳ Validando...' : '✅ Validar Identidade'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                onClick={() => setPassoAtual(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                ← Voltar para foto do rosto
              </button>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Passo 3: Validando */}
        {passoAtual === 3 && loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Validando sua identidade...
            </p>
          </div>
        )}

        {/* Botão voltar para login */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={voltarParaLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Voltar para login
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ValidacaoBiometrica;
