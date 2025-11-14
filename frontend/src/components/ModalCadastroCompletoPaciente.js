import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import logoBrasaoPreto from '../images/logohorizontalpreto.png';
import './ModalCadastroCompletoPaciente.css';

const ModalCadastroCompletoPaciente = ({ paciente, onClose, onComplete }) => {
  const { user, makeRequest, logout } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const modalRef = useRef(null);
  
  const [passoAtual, setPassoAtual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [contratoUrl, setContratoUrl] = useState(null);
  const [passoInicializado, setPassoInicializado] = useState(false); // Flag para evitar resetar o passo
  const [uploadEmProgresso, setUploadEmProgresso] = useState(false); // Flag para evitar verificação prematura durante upload
  const pacienteInicialRef = useRef(null); // Ref para rastrear o paciente inicial e evitar reinicialização
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    cpf: '',
    comprovante_residencia: null
  });
  
  // Inicializar formData quando paciente mudar (apenas na primeira vez ou se campos estiverem vazios)
  const isPacienteLogado = user?.tipo === 'paciente';

  useEffect(() => {
    // Não atualizar formData se já estamos em um passo específico e o paciente mudou durante o fluxo
    // Isso evita que atualizações do prop paciente reinicializem o formulário
    if (passoInicializado && passoAtual > 1) {
      console.log('⏸️ [ModalCadastro] Modal já em uso, ignorando atualização do prop paciente');
      return;
    }
    
    if (paciente) {
      // Armazenar referência do paciente inicial apenas na primeira vez
      if (!pacienteInicialRef.current) {
        pacienteInicialRef.current = paciente.id;
      }
      
      // Se o paciente mudou mas não é o inicial, não atualizar (evita reinicialização)
      if (pacienteInicialRef.current && paciente.id !== pacienteInicialRef.current && passoInicializado) {
        console.log('⏸️ [ModalCadastro] Paciente mudou durante o fluxo, ignorando atualização');
        return;
      }
      
      console.log('📋 [ModalCadastro] Dados do paciente recebidos:', {
        cpf: paciente.cpf ? '✓ Preenchido' : '✗ Vazio',
        comprovante_residencia_url: paciente.comprovante_residencia_url ? '✓ Preenchido' : '✗ Vazio',
        contrato_servico_url: paciente.contrato_servico_url ? '✓ Preenchido' : '✗ Vazio'
      });
      
      // Preservar valores existentes no formData se já estiverem preenchidos
      // IMPORTANTE: NÃO sobrescrever valores que o usuário já digitou
      setFormData(prev => {
        // Formatar CPF se existir no paciente E não estiver preenchido no formData
        let cpfFormatado = prev.cpf;
        if (!isPacienteLogado && !cpfFormatado && paciente.cpf) {
          const cpfLimpo = paciente.cpf.replace(/\D/g, '');
          if (cpfLimpo.length === 11) {
            cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
          } else {
            cpfFormatado = paciente.cpf;
          }
        }
        
        return {
          cpf: isPacienteLogado ? prev.cpf : cpfFormatado,
          comprovante_residencia: prev.comprovante_residencia // Preservar comprovante se existir
        };
      });
    }
  }, [paciente, isPacienteLogado, passoInicializado, passoAtual]);
  
  // Estados para upload
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [comprovantePreview, setComprovantePreview] = useState(null);
  const [modoComprovante, setModoComprovante] = useState(null); // 'camera' ou 'arquivo'
  const [cameraPronta, setCameraPronta] = useState(false);
  const [streamCamera, setStreamCamera] = useState(null);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const videoRefComprovante = React.useRef(null);
  const canvasRefComprovante = React.useRef(null);
  const cameraCheckTimeoutRef = useRef(null);
  
  // Estados para assinatura digital do contrato
  const [assinaturaRef, setAssinaturaRef] = useState(null);
  const [hasAssinatura, setHasAssinatura] = useState(false);
  const [contratoPdfBytes, setContratoPdfBytes] = useState(null);
  const [contratoPdfUrl, setContratoPdfUrl] = useState(null);
  const [assinaturaBase64, setAssinaturaBase64] = useState(null);
  const [assinaturaAplicada, setAssinaturaAplicada] = useState(false);
  const [assinandoContrato, setAssinandoContrato] = useState(false);
  const [mostrarCanvasAssinatura, setMostrarCanvasAssinatura] = useState(false);
  const [pdfKey, setPdfKey] = useState(0); // Para forçar re-render do iframe
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [hashExistente, setHashExistente] = useState(null); // Hash do fechamento existente
  const assinaturaCanvasContainerRef = useRef(null);
  const [assinaturaCanvasSize, setAssinaturaCanvasSize] = useState({ width: 400, height: 150 });
  
  // Detectar mudanças no tamanho da tela (apenas para layout, não para assinatura)
  const ajustarDimensoesCanvasAssinatura = () => {
    if (!assinaturaCanvasContainerRef.current) return;
    const { width } = assinaturaCanvasContainerRef.current.getBoundingClientRect();
    if (!width) return;

    const novoWidth = Math.round(width);
    const novoHeight = Math.round(Math.max(120, Math.min(220, width * 0.4))); // Mantém proporção aproximada

    setAssinaturaCanvasSize(prev => {
      if (prev.width === novoWidth && prev.height === novoHeight) return prev;
      return { width: novoWidth, height: novoHeight };
    });
  };

  useEffect(() => {
    setAssinaturaAplicada(Boolean(paciente?.contrato_servico_url));
  }, [paciente]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      ajustarDimensoesCanvasAssinatura();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    if (mostrarCanvasAssinatura) {
      // Ajustar dimensões ao abrir o canvas
      setTimeout(ajustarDimensoesCanvasAssinatura, 0);
    }
  }, [mostrarCanvasAssinatura]);

  
  // Determinar qual passo iniciar - SEMPRE começar do passo 1 apenas na primeira vez
  // O paciente DEVE passar por TODOS os passos sequencialmente para confirmar cada informação
  useEffect(() => {
    // Não executar durante upload para evitar verificação prematura
    if (uploadEmProgresso) {
      console.log('⏸️ [ModalCadastro] Upload em progresso, pulando verificação inicial');
      return;
    }
    
    // Não reinicializar se já estamos em um passo específico (evita reset quando paciente muda)
    if (passoInicializado && passoAtual > 1) {
      console.log('⏸️ [ModalCadastro] Modal já em uso no passo', passoAtual, ', ignorando reinicialização');
      return;
    }
    
    // Só executar na primeira vez que o componente é montado ou quando o paciente muda pela primeira vez
    if (paciente && !passoInicializado) {
      // Armazenar referência do paciente inicial
      if (!pacienteInicialRef.current) {
        pacienteInicialRef.current = paciente.id;
      }
      
      console.log('🔍 [ModalCadastro] Determinando passo inicial:', {
        cpf: paciente.cpf ? `"${paciente.cpf}"` : 'NULL',
        comprovante_residencia_url: paciente.comprovante_residencia_url ? 'EXISTE' : 'NULL',
        contrato_servico_url: paciente.contrato_servico_url ? 'EXISTE' : 'NULL'
      });
      
      // SEMPRE começar do passo 1 na primeira vez, independentemente de quais campos já estão preenchidos
      // O paciente deve confirmar cada passo antes de avançar
      console.log('✅ [ModalCadastro] Iniciando no Passo 1: CPF (step-by-step obrigatório)');
      setPassoAtual(1);
      setPassoInicializado(true);
      
      // NÃO verificar se todos os passos estão completos aqui - isso deve ser feito apenas no final do passo 4
      // Removido para evitar fechamento prematuro do modal
    } else if (!paciente && !passoInicializado) {
      // Se não tem dados do paciente, começar do passo 1
      console.log('⚠️ [ModalCadastro] Paciente não fornecido, iniciando no Passo 1');
      setPassoAtual(1);
      setPassoInicializado(true);
    }
    // Não incluir 'paciente' nas dependências para evitar re-execução quando o paciente é atualizado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passoInicializado, uploadEmProgresso, passoAtual]);
  
  // Buscar contrato do fechamento
  useEffect(() => {
    const buscarContrato = async () => {
      if (paciente?.id) {
        try {
          console.log('🔍 [ModalCadastro] Buscando contrato para o paciente:', paciente.id);
          const fechamentoResponse = await makeRequest(`/fechamentos?paciente_id=${paciente.id}`);
          if (fechamentoResponse.ok) {
            const fechamentos = await fechamentoResponse.json();
            const fechamento = Array.isArray(fechamentos) ? fechamentos[0] : fechamentos;
            console.log('📋 [ModalCadastro] Fechamento encontrado:', fechamento);
            
            if (fechamento?.id && fechamento?.contrato_arquivo) {
              console.log('🔍 [ModalCadastro] Buscando URL do contrato...');
              const contratoUrlResponse = await makeRequest(`/fechamentos/${fechamento.id}/contrato-url`);
              if (contratoUrlResponse.ok) {
                const contratoData = await contratoUrlResponse.json();
                console.log('✅ [ModalCadastro] Contrato URL recebida:', contratoData.url ? 'SIM' : 'NÃO');
                setContratoUrl(contratoData.url);
              } else {
                console.warn('⚠️ [ModalCadastro] Erro ao buscar URL do contrato');
              }
              
              // Buscar hash do fechamento
              try {
                const hashResponse = await makeRequest(`/fechamentos/hash/${paciente.id}`);
                if (hashResponse.temHash && hashResponse.hash) {
                  setHashExistente(hashResponse.hash);
                  console.log('✅ [ModalCadastro] Hash do fechamento carregado:', hashResponse.hash);
                }
              } catch (hashError) {
                console.warn('⚠️ [ModalCadastro] Não foi possível buscar hash do fechamento:', hashError);
                // Não bloquear o processo se não conseguir buscar o hash
              }
            } else {
              console.warn('⚠️ [ModalCadastro] Fechamento não tem contrato');
            }
          } else {
            console.warn('⚠️ [ModalCadastro] Nenhum fechamento encontrado para o paciente');
          }
        } catch (error) {
          console.error('❌ [ModalCadastro] Erro ao buscar contrato:', error);
        }
      }
    };
    
    if (passoAtual === 3) {
      buscarContrato();
    }
  }, [passoAtual, paciente, makeRequest]);
  
  // Carregar PDF do contrato quando URL estiver disponível (apenas uma vez)
  useEffect(() => {
    const carregarPdfContrato = async () => {
      // Só carregar se estiver no passo 4 e ainda não tiver carregado
      if (contratoUrl && passoAtual === 3 && !contratoPdfBytes) {
        try {
          console.log('📄 [ModalCadastro] Carregando PDF do contrato...');
          const response = await fetch(contratoUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            setContratoPdfBytes(bytes);
            
            // Criar URL para preview apenas se não existir
            if (!contratoPdfUrl) {
              const blob = new Blob([bytes], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              setContratoPdfUrl(url);
              console.log('✅ [ModalCadastro] PDF do contrato carregado com sucesso');
            }
          } else {
            console.error('❌ [ModalCadastro] Erro ao carregar PDF do contrato');
            showErrorToast('Erro ao carregar o contrato. Tente novamente.');
          }
        } catch (error) {
          console.error('❌ [ModalCadastro] Erro ao carregar PDF:', error);
          showErrorToast('Erro ao carregar o contrato.');
        }
      }
    };
    
    carregarPdfContrato();
    
    // Cleanup: revogar URL quando componente desmontar
    return () => {
      // Não revogar aqui para evitar problemas com o preview
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoUrl, passoAtual]); // Verificação interna evita loops
  
  // Desabilitar scroll do body quando modal estiver aberto
  useEffect(() => {
    // Salvar o estado original do overflow
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    
    // Desabilitar scroll do body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Cleanup: restaurar scroll quando modal fechar
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
    };
  }, []);

  // Fechar modal ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Não permitir fechar clicando fora
        showErrorToast('Por favor, complete seu cadastro antes de continuar');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showErrorToast]);
  
  // Formatar CPF
  const formatarCPF = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 11) {
      return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return valor;
  };
  
  // Formatar data
  const formatarData = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 8) {
      return apenasNumeros.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    }
    return valor;
  };
  
  // Validar CPF
  const validarCPF = (cpf) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return false;
    
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
    
    return true;
  };
  
  // Validar data de nascimento
  const validarDataNascimento = (data) => {
    const dataLimpa = data.replace(/\D/g, '');
    if (dataLimpa.length !== 8) {
      console.log('❌ [ModalCadastro] Data inválida: comprimento incorreto', dataLimpa.length);
      return false;
    }
    
    const dia = parseInt(dataLimpa.substring(0, 2));
    const mes = parseInt(dataLimpa.substring(2, 4));
    const ano = parseInt(dataLimpa.substring(4, 8));
    
    console.log('🔍 [ModalCadastro] Validando data:', { data, dia, mes, ano });
    
    if (dia < 1 || dia > 31) {
      console.log('❌ [ModalCadastro] Data inválida: dia fora do range', dia);
      return false;
    }
    if (mes < 1 || mes > 12) {
      console.log('❌ [ModalCadastro] Data inválida: mês fora do range', mes);
      return false;
    }
    if (ano < 1900 || ano > new Date().getFullYear()) {
      console.log('❌ [ModalCadastro] Data inválida: ano fora do range', ano);
      return false;
    }
    
    const dataObj = new Date(ano, mes - 1, dia);
    if (dataObj.getDate() !== dia || dataObj.getMonth() !== mes - 1 || dataObj.getFullYear() !== ano) {
      console.log('❌ [ModalCadastro] Data inválida: data não existe', { dia, mes, ano, dataObj });
      return false;
    }
    
    if (dataObj > new Date()) {
      console.log('❌ [ModalCadastro] Data inválida: data futura', dataObj);
      return false;
    }
    
    console.log('✅ [ModalCadastro] Data válida:', data);
    return true;
  };
  
  // Passo 1: Confirmar CPF
  const handleConfirmarCPF = async () => {
    const cpfLimpo = formData.cpf.replace(/\D/g, '');
    
    console.log('🔍 [ModalCadastro] Confirmando CPF:', {
      cpf_formatado: formData.cpf,
      cpf_limpo: cpfLimpo,
      cpf_length: cpfLimpo.length
    });
    
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      showErrorToast('Por favor, informe um CPF válido');
      return;
    }
    
    const cpfPacienteExistente = paciente?.cpf ? paciente.cpf.replace(/\D/g, '') : null;
    if (!validarCPF(formData.cpf)) {
      if (cpfPacienteExistente && cpfPacienteExistente === cpfLimpo) {
        console.warn('⚠️ [ModalCadastro] CPF informado falhou na validação local, mas corresponde ao CPF armazenado. Prosseguindo com o envio.');
      } else {
        showErrorToast('CPF inválido. Verifique os dígitos informados.');
        return;
      }
    }
    
    setLoading(true);
    try {
      const pacienteId = user?.paciente_id || user?.id;
      console.log('📤 [ModalCadastro] Enviando CPF para o servidor:', {
        pacienteId,
        cpf: cpfLimpo
      });
      
      const response = await makeRequest(`/pacientes/${pacienteId}`, {
        method: 'PUT',
        body: JSON.stringify({ cpf: cpfLimpo })
      });
      
      if (response.ok) {
        console.log('✅ [ModalCadastro] CPF salvo com sucesso! Verificando...');
        
        // Aguardar um pouco para garantir que o banco foi atualizado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se o CPF foi realmente salvo
        const pacienteResponse = await makeRequest(`/pacientes/${pacienteId}`);
        if (pacienteResponse.ok) {
          const pacienteAtualizado = await pacienteResponse.json();
          console.log('📋 [ModalCadastro] CPF após salvar:', {
            cpf_no_banco: pacienteAtualizado.cpf,
            cpf_enviado: cpfLimpo,
            cpf_igual: pacienteAtualizado.cpf === cpfLimpo
          });
          
          if (pacienteAtualizado.cpf === cpfLimpo) {
            showSuccessToast('CPF confirmado com sucesso!');
            setPassoAtual(2); // Ir direto para comprovante (passo 2)
          } else {
            console.error('❌ [ModalCadastro] CPF não foi salvo corretamente!');
            showErrorToast('Erro ao salvar CPF. Por favor, tente novamente.');
          }
        } else {
          console.error('❌ [ModalCadastro] Erro ao verificar CPF salvo');
          showErrorToast('Erro ao verificar CPF. Por favor, tente novamente.');
        }
      } else {
        const data = await response.json();
        console.error('❌ [ModalCadastro] Erro ao salvar CPF:', data);
        showErrorToast(data.error || 'Erro ao salvar CPF');
      }
    } catch (error) {
      console.error('❌ [ModalCadastro] Erro ao salvar CPF:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };
  
  // Passo 2: Comprovante de residência (anteriormente passo 3)
  const iniciarCameraComprovante = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Câmera traseira no mobile quando disponível
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStreamCamera(stream);
      setModoComprovante('camera');
      setCameraPronta(false);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      if (error.name === 'NotAllowedError') {
        showErrorToast('Permissão de câmera negada. Por favor, permita o acesso à câmera.');
      } else if (error.name === 'NotFoundError') {
        showErrorToast('Nenhuma câmera encontrada.');
      } else {
        showErrorToast('Erro ao acessar câmera. Tente novamente.');
      }
    }
  };

  // Parar câmera
  const pararCameraComprovante = () => {
    setCameraPronta(false);
    if (cameraCheckTimeoutRef.current) {
      clearTimeout(cameraCheckTimeoutRef.current);
      cameraCheckTimeoutRef.current = null;
    }
    if (streamCamera) {
      streamCamera.getTracks().forEach(track => track.stop());
      setStreamCamera(null);
    }
    if (videoRefComprovante.current) {
      const videoElement = videoRefComprovante.current;
      try {
        videoElement.pause();
      } catch (e) {
        // ignore
      }
      videoElement.srcObject = null;
    }
    setModoComprovante(null);
    setFotoCapturada(null);
  };

  // Capturar foto da câmera
  const capturarFotoComprovante = () => {
    console.log('📸 [ModalCadastro] Capturando foto da câmera...');
    if (!videoRefComprovante.current || !canvasRefComprovante.current) {
      console.error('❌ [ModalCadastro] Video ou canvas não disponível');
      return;
    }
    if (!cameraPronta) {
      console.error('❌ [ModalCadastro] Câmera ainda não está pronta para captura');
      showErrorToast('Aguarde a câmera carregar antes de tirar a foto.');
      return;
    }
    
    const video = videoRefComprovante.current;
    const canvas = canvasRefComprovante.current;
    const context = canvas.getContext('2d');

    if (!video.videoWidth || !video.videoHeight) {
      console.error('❌ [ModalCadastro] Dimensões do vídeo indefinidas para captura');
      showErrorToast('Não foi possível capturar a imagem. Tente novamente.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    console.log('📸 [ModalCadastro] Foto capturada, convertendo para blob...');
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('✅ [ModalCadastro] Blob criado, tamanho:', blob.size);
        const file = new File([blob], 'comprovante_residencia.jpg', { type: 'image/jpeg' });
        console.log('✅ [ModalCadastro] Arquivo criado:', file.name, file.size, 'bytes');
        
        setFotoCapturada(canvas.toDataURL('image/jpeg'));
        setFormData(prev => {
          console.log('📝 [ModalCadastro] Atualizando formData com arquivo...');
          return { ...prev, comprovante_residencia: file };
        });
        setComprovantePreview(canvas.toDataURL('image/jpeg'));
        console.log('✅ [ModalCadastro] Estado atualizado, parando câmera...');
        pararCameraComprovante();
      } else {
        console.error('❌ [ModalCadastro] Erro ao criar blob da foto');
        showErrorToast('Erro ao capturar foto. Tente novamente.');
      }
    }, 'image/jpeg', 0.9);
  };

  // Sincronizar stream da câmera com o elemento de vídeo
  useEffect(() => {
    const videoElement = videoRefComprovante.current;

    if (!videoElement) return undefined;

    if (modoComprovante !== 'camera') {
      videoElement.srcObject = null;
      setCameraPronta(false);
      return undefined;
    }

    if (!streamCamera) {
      setCameraPronta(false);
      return undefined;
    }

    setCameraPronta(false);

    const marcarProntoSePossivel = () => {
      if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
        setCameraPronta(true);
        if (cameraCheckTimeoutRef.current) {
          clearTimeout(cameraCheckTimeoutRef.current);
          cameraCheckTimeoutRef.current = null;
        }
      }
    };

    videoElement.srcObject = streamCamera;
    const playPromise = videoElement.play();

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          marcarProntoSePossivel();
        })
        .catch((err) => {
          console.error('❌ [ModalCadastro] Erro ao iniciar vídeo da câmera:', err);
          showErrorToast('Erro ao iniciar a câmera. Verifique as permissões e tente novamente.');
          setCameraPronta(false);
        });
    } else {
      marcarProntoSePossivel();
    }

    const intervalId = setInterval(() => {
      if (videoElement.videoWidth > 0 && videoElement.readyState >= 2) {
        marcarProntoSePossivel();
        clearInterval(intervalId);
      }
    }, 200);

    if (cameraCheckTimeoutRef.current) {
      clearTimeout(cameraCheckTimeoutRef.current);
    }
    cameraCheckTimeoutRef.current = setTimeout(() => {
      console.error('❌ [ModalCadastro] Timeout aguardando câmera iniciar (verificação periódica).');
      showErrorToast('Não foi possível iniciar a câmera. Feche outros aplicativos que estejam usando a câmera e tente novamente.');
      setCameraPronta(false);
      if (streamCamera) {
        streamCamera.getTracks().forEach(track => track.stop());
        setStreamCamera(null);
      }
      try {
        videoElement.pause();
      } catch (error) {
        // ignore
      }
      videoElement.srcObject = null;
      setModoComprovante(null);
      setFotoCapturada(null);
    }, 8000);

    return () => {
      clearInterval(intervalId);
      if (cameraCheckTimeoutRef.current) {
        clearTimeout(cameraCheckTimeoutRef.current);
        cameraCheckTimeoutRef.current = null;
      }
    };
  }, [modoComprovante, streamCamera, showErrorToast]);

  // Limpar foto capturada
  const limparFotoComprovante = () => {
    setFotoCapturada(null);
    setComprovantePreview(null);
    setModoComprovante(null);
    setFormData(prev => ({ ...prev, comprovante_residencia: null }));
  };

  // Limpar ao mudar de passo ou fechar modal
  React.useEffect(() => {
    if (passoAtual !== 3) {
      pararCameraComprovante();
    }
    return () => {
      pararCameraComprovante();
    };
  }, [passoAtual]);

  // Passo 3: Upload comprovante de residência
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
      showErrorToast('Formato não suportado. Use JPG, PNG ou PDF');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }
    
    setFormData(prev => ({ ...prev, comprovante_residencia: file }));
    setModoComprovante('arquivo');
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprovantePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setComprovantePreview(null);
    }
  };
  
  const handleUploadComprovante = async () => {
    console.log('🔍 [ModalCadastro] handleUploadComprovante chamado');
    console.log('📋 [ModalCadastro] Estado:', {
      comprovante_residencia: formData.comprovante_residencia ? 'EXISTE' : 'NÃO EXISTE',
      comprovantePreview: comprovantePreview ? 'EXISTE' : 'NÃO EXISTE',
      modoComprovante
    });
    
    // Verificar se há arquivo ou preview
    if (!formData.comprovante_residencia && !comprovantePreview) {
      console.error('❌ [ModalCadastro] Nenhum arquivo ou preview encontrado');
      showErrorToast('Por favor, selecione um arquivo ou tire uma foto');
      return;
    }
    
    // Se tiver preview mas não tiver arquivo, tentar criar arquivo do preview
    let arquivoParaEnviar = formData.comprovante_residencia;
    if (!arquivoParaEnviar && comprovantePreview) {
      console.log('⚠️ [ModalCadastro] Criando arquivo a partir do preview...');
      try {
        // Converter base64 para blob
        const response = await fetch(comprovantePreview);
        const blob = await response.blob();
        arquivoParaEnviar = new File([blob], 'comprovante_residencia.jpg', { type: 'image/jpeg' });
        console.log('✅ [ModalCadastro] Arquivo criado a partir do preview');
      } catch (error) {
        console.error('❌ [ModalCadastro] Erro ao criar arquivo do preview:', error);
        showErrorToast('Erro ao processar a foto. Tente novamente.');
        return;
      }
    }
    
    if (!arquivoParaEnviar) {
      console.error('❌ [ModalCadastro] Não foi possível obter arquivo para envio');
      showErrorToast('Erro ao preparar arquivo para envio');
      return;
    }
    
    setUploadingComprovante(true);
    setUploadEmProgresso(true); // Marcar upload em progresso para evitar verificação prematura
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('document', arquivoParaEnviar);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      const pacienteId = user?.paciente_id || user?.id;
      console.log('📤 [ModalCadastro] Enviando comprovante para:', `${API_BASE_URL}/documents/upload-paciente/${pacienteId}/comprovante_residencia`);
      
      const response = await fetch(`${API_BASE_URL}/documents/upload-paciente/${pacienteId}/comprovante_residencia`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ [ModalCadastro] Comprovante enviado com sucesso!');
        showSuccessToast('Comprovante de residência enviado com sucesso!');
        
        // Limpar estados do formulário
        setFormData(prev => ({ ...prev, comprovante_residencia: null }));
        setComprovantePreview(null);
        setModoComprovante(null);
        
        // Avançar para o próximo passo SEM atualizar o prop paciente
        // Isso evita que o useEffect seja disparado e cause refresh infinito
        setPassoAtual(3); // Avançar para contrato (passo 3)
        
        // Aguardar um pouco antes de liberar a flag para garantir que o passo foi atualizado
        setTimeout(() => {
          setUploadEmProgresso(false);
        }, 500);
      } else {
        console.error('❌ [ModalCadastro] Erro ao enviar comprovante:', data);
        showErrorToast(data.error || 'Erro ao enviar comprovante');
        setUploadEmProgresso(false);
      }
    } catch (error) {
      console.error('❌ [ModalCadastro] Erro ao fazer upload:', error);
      showErrorToast('Erro ao conectar com o servidor');
      setUploadEmProgresso(false);
    } finally {
      setUploadingComprovante(false);
    }
  };
  
  // Funções para assinatura digital do contrato
  
  // Gerar hash SHA1
  const gerarHashSHA1 = async (arrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hashHex;
  };
  
  // Função para detectar bounding box da assinatura (remover espaços vazios)
  const obterBoundingBoxAssinatura = (imageDataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;
        
        // Encontrar os limites da assinatura (pixels não transparentes)
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            
            if (alpha > 0) { // Pixel não transparente
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
        
        // Se não encontrou nada, retornar dimensões padrão
        if (minX >= maxX || minY >= maxY) {
          resolve({
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            originalWidth: canvas.width,
            originalHeight: canvas.height
          });
          return;
        }
        
        // Adicionar padding de 5px ao redor
        const padding = 5;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(canvas.width, maxX + padding);
        maxY = Math.min(canvas.height, maxY + padding);
        
        resolve({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          originalWidth: canvas.width,
          originalHeight: canvas.height
        });
      };
      img.src = imageDataUrl;
    });
  };

  // Limpar assinatura
  const limparAssinaturaContrato = () => {
    if (assinaturaRef) {
      assinaturaRef.clear();
      setHasAssinatura(false);
      setAssinaturaBase64(null);
    }
  };
  
  // Salvar assinatura temporariamente
  const salvarAssinaturaTemporaria = () => {
    if (!hasAssinatura || !assinaturaRef) {
      showErrorToast('Por favor, desenhe sua assinatura primeiro.');
      return;
    }
    
    const assinaturaBase64Temp = assinaturaRef.toDataURL('image/png');
    setAssinaturaBase64(assinaturaBase64Temp);
    setMostrarCanvasAssinatura(false);
    showSuccessToast('Assinatura criada! Clique em "Aplicar Assinatura" para assinar o contrato.');
  };
  
  // Aplicar assinatura ao contrato PDF - automaticamente na área do paciente
  const aplicarAssinaturaAoContrato = async () => {
    if (!assinaturaBase64 || !contratoPdfBytes) {
      showErrorToast('Por favor, crie sua assinatura primeiro.');
      return;
    }
    
    if (!paciente?.cpf) {
      showErrorToast('CPF não encontrado. Por favor, complete o Passo 1 primeiro.');
      return;
    }
    
    setAssinandoContrato(true);
    
    try {
      console.log('📝 [ModalCadastro] Aplicando assinatura do paciente ao contrato...');
      
      // Carregar o PDF
      const pdfDoc = await PDFDocument.load(contratoPdfBytes);
      const pages = pdfDoc.getPages();
      console.log('📄 [ModalCadastro] PDF carregado, número de páginas:', pages.length);
      
      // Obter bounding box da assinatura para remover espaços vazios
      const boundingBox = await obterBoundingBoxAssinatura(assinaturaBase64);
      console.log('📦 [ModalCadastro] Bounding box da assinatura:', boundingBox);
      
      // Criar nova imagem apenas com a área da assinatura (sem espaços vazios)
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = assinaturaBase64;
      });
      
      const canvasCrop = document.createElement('canvas');
      const ctxCrop = canvasCrop.getContext('2d');
      canvasCrop.width = boundingBox.width;
      canvasCrop.height = boundingBox.height;
      ctxCrop.drawImage(
        img,
        boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
        0, 0, boundingBox.width, boundingBox.height
      );
      
      const assinaturaCortadaBase64 = canvasCrop.toDataURL('image/png');
      
      // Converter assinatura base64 para imagem
      const signatureImage = await pdfDoc.embedPng(assinaturaCortadaBase64);
      const signatureDims = signatureImage.scale(1);
      console.log('✅ [ModalCadastro] Assinatura convertida para imagem (cortada)');
      
      // Adicionar rodapé estruturado apenas na última página
      const ultimaPagina = pages[pages.length - 1];
      const larguraPagina = ultimaPagina.getWidth();
      const alturaPagina = ultimaPagina.getHeight();
      
      console.log('📐 [ModalCadastro] Dimensões da última página:', {
        largura: larguraPagina,
        altura: alturaPagina
      });
      
      // Configurações do rodapé estruturado - melhor espaçamento
      const alturaRodape = 180; // Altura total do rodapé (aumentada significativamente)
      const margemInferior = 20;
      const yBaseRodape = margemInferior;
      const margemLateral = 50;
      const espacoEntreColunas = 20;
      
      // Desenhar área do rodapé
      // Linha superior do rodapé (mais grossa e escura)
      ultimaPagina.drawLine({
        start: { x: margemLateral, y: yBaseRodape + alturaRodape },
        end: { x: larguraPagina - margemLateral, y: yBaseRodape + alturaRodape },
        thickness: 1.5,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      // Calcular posições das 3 áreas de assinatura com melhor distribuição
      const larguraTotal = larguraPagina - (2 * margemLateral);
      const larguraArea = (larguraTotal - (2 * espacoEntreColunas)) / 3;
      const alturaAssinatura = 70; // Aumentada significativamente para acomodar melhor a assinatura
      const yLinhaAssinatura = yBaseRodape + 50; // Linha de assinatura mais abaixo, dando mais espaço acima
      
      // Posições Y para textos
      const yTitulo = yBaseRodape + alturaRodape - 15; // Texto "ASSINATURA CLÍNICA" mais para cima
      const yAssinatura = yBaseRodape + alturaRodape - 45;
      // Dados (nome e CNPJ) ficam ABAIXO da linha de assinatura
      const yDadosAbaixoLinha = yLinhaAssinatura - 12; // CNPJ abaixo da linha
      const yNomeAbaixoLinha = yLinhaAssinatura - 24; // Nome abaixo da linha (acima do CNPJ)
      
      // Área 1: ASSINATURA CLÍNICA (já deve estar preenchida)
      const x1 = margemLateral;
      const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
      ultimaPagina.drawLine({
        start: { x: x1, y: yLinhaAssinatura },
        end: { x: x1 + larguraArea, y: yLinhaAssinatura },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      const textoClinica = 'ASSINATURA CLÍNICA';
      const larguraTextoClinica = fontBold.widthOfTextAtSize(textoClinica, 9);
      ultimaPagina.drawText(textoClinica, {
        x: x1 + (larguraArea - larguraTextoClinica) / 2,
        y: yTitulo,
        size: 9,
        color: rgb(0.2, 0.2, 0.2),
        font: fontBold,
      });
      
      // Área 2: ASSINATURA PACIENTE - AQUI VAI A ASSINATURA DO PACIENTE
      const x2 = x1 + larguraArea + espacoEntreColunas;
      
      // Calcular dimensões da assinatura mantendo proporção
      const larguraMaxima = larguraArea - 20; // Margem de 10px de cada lado
      const alturaMaxima = alturaAssinatura;
      const proporcao = Math.min(
        larguraMaxima / signatureDims.width,
        alturaMaxima / signatureDims.height
      );
      const larguraAssinatura = signatureDims.width * proporcao;
      const alturaAssinaturaFinal = signatureDims.height * proporcao;
      
      // Desenhar assinatura do paciente (acima da linha, centralizada)
      // A assinatura será posicionada acima da linha, com espaço adequado
      const yAssinaturaPaciente = yLinhaAssinatura + alturaAssinatura - alturaAssinaturaFinal - 5; // 5px acima da linha
      ultimaPagina.drawImage(signatureImage, {
        x: x2 + (larguraArea - larguraAssinatura) / 2, // Centralizar assinatura
        y: yAssinaturaPaciente, // Posicionar acima da linha com espaço adequado
        width: larguraAssinatura,
        height: alturaAssinaturaFinal,
      });
      console.log('✅ [ModalCadastro] Assinatura do paciente desenhada');
      
      // Linha para assinatura
      ultimaPagina.drawLine({
        start: { x: x2, y: yLinhaAssinatura },
        end: { x: x2 + larguraArea, y: yLinhaAssinatura },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Texto centralizado acima da linha
      const textoPaciente = 'ASSINATURA PACIENTE';
      const fontBoldPaciente = await pdfDoc.embedFont('Helvetica-Bold');
      const larguraTextoPaciente = fontBoldPaciente.widthOfTextAtSize(textoPaciente, 9);
      ultimaPagina.drawText(textoPaciente, {
        x: x2 + (larguraArea - larguraTextoPaciente) / 2,
        y: yTitulo,
        size: 9,
        color: rgb(0.2, 0.2, 0.2),
        font: fontBoldPaciente,
      });
      
      const nomePaciente = paciente.nome || '';
      const cpfPaciente = formData.cpf || paciente.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
      
      // Nome do paciente (truncar baseado na largura disponível) - ABAIXO da linha
      if (nomePaciente) {
        const tamanhoFonteNomePaciente = 6.5; // Fonte menor
        const fontNormalPaciente = await pdfDoc.embedFont('Helvetica'); // Fonte normal para nomes
        const larguraDisponivelNomePaciente = larguraArea - 10; // Margem de 5px de cada lado
        let nomeExibidoPaciente = nomePaciente;
        let larguraNomePaciente = fontNormalPaciente.widthOfTextAtSize(nomeExibidoPaciente, tamanhoFonteNomePaciente);
        
        // Truncar se necessário
        if (larguraNomePaciente > larguraDisponivelNomePaciente) {
          let textoTruncado = nomeExibidoPaciente;
          while (fontNormalPaciente.widthOfTextAtSize(textoTruncado + '...', tamanhoFonteNomePaciente) > larguraDisponivelNomePaciente && textoTruncado.length > 0) {
            textoTruncado = textoTruncado.substring(0, textoTruncado.length - 1);
          }
          nomeExibidoPaciente = textoTruncado + '...';
          larguraNomePaciente = fontNormalPaciente.widthOfTextAtSize(nomeExibidoPaciente, tamanhoFonteNomePaciente);
        }
        
        ultimaPagina.drawText(nomeExibidoPaciente, {
          x: x2 + (larguraArea - larguraNomePaciente) / 2,
          y: yNomeAbaixoLinha, // Nome abaixo da linha
          size: tamanhoFonteNomePaciente,
          color: rgb(0.3, 0.3, 0.3),
          font: fontNormalPaciente,
        });
      }
      if (cpfPaciente) {
        const textoCpfPaciente = `CPF: ${cpfPaciente}`;
        const larguraCpfPaciente = textoCpfPaciente.length * 3.0;
        ultimaPagina.drawText(textoCpfPaciente, {
          x: x2 + (larguraArea - larguraCpfPaciente) / 2,
          y: yDadosAbaixoLinha, // CPF abaixo da linha
          size: 7,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
      
      // Área 3: ASSINATURA GRUPO IM
      const x3 = x2 + larguraArea + espacoEntreColunas;
      ultimaPagina.drawLine({
        start: { x: x3, y: yLinhaAssinatura },
        end: { x: x3 + larguraArea, y: yLinhaAssinatura },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      const textoGrupoIM = 'ASSINATURA GRUPO IM';
      const fontBoldGrupoIM = await pdfDoc.embedFont('Helvetica-Bold');
      const larguraTextoGrupoIM = fontBoldGrupoIM.widthOfTextAtSize(textoGrupoIM, 9);
      ultimaPagina.drawText(textoGrupoIM, {
        x: x3 + (larguraArea - larguraTextoGrupoIM) / 2,
        y: yTitulo,
        size: 9,
        color: rgb(0.2, 0.2, 0.2),
        font: fontBoldGrupoIM,
      });
      
      const nomeGrupoIM = 'INVESTMONEY S.A.';
      const fontNormalGrupoIM = await pdfDoc.embedFont('Helvetica');
      const tamanhoFonteNomeGrupoIM = 6.5;
      const larguraDisponivelNomeGrupoIM = larguraArea - 10;
      let nomeExibidoGrupoIM = nomeGrupoIM;
      let larguraNomeGrupoIM = fontNormalGrupoIM.widthOfTextAtSize(nomeExibidoGrupoIM, tamanhoFonteNomeGrupoIM);
      
      // Truncar se necessário
      if (larguraNomeGrupoIM > larguraDisponivelNomeGrupoIM) {
        let textoTruncado = nomeExibidoGrupoIM;
        while (fontNormalGrupoIM.widthOfTextAtSize(textoTruncado + '...', tamanhoFonteNomeGrupoIM) > larguraDisponivelNomeGrupoIM && textoTruncado.length > 0) {
          textoTruncado = textoTruncado.substring(0, textoTruncado.length - 1);
        }
        nomeExibidoGrupoIM = textoTruncado + '...';
        larguraNomeGrupoIM = fontNormalGrupoIM.widthOfTextAtSize(nomeExibidoGrupoIM, tamanhoFonteNomeGrupoIM);
      }
      
      ultimaPagina.drawText(nomeExibidoGrupoIM, {
        x: x3 + (larguraArea - larguraNomeGrupoIM) / 2,
        y: yNomeAbaixoLinha, // Nome abaixo da linha
        size: tamanhoFonteNomeGrupoIM,
        color: rgb(0.3, 0.3, 0.3),
        font: fontNormalGrupoIM,
      });
      
      const cnpjGrupoIM = 'CNPJ: 41.267.440/0001-97';
      const larguraCnpjGrupoIM = cnpjGrupoIM.length * 3.0;
      ultimaPagina.drawText(cnpjGrupoIM, {
        x: x3 + (larguraArea - larguraCnpjGrupoIM) / 2,
        y: yDadosAbaixoLinha, // CNPJ abaixo da linha
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Linha separadora antes do hash e data
      ultimaPagina.drawLine({
        start: { x: margemLateral, y: yBaseRodape + 25 },
        end: { x: larguraPagina - margemLateral, y: yBaseRodape + 25 },
        thickness: 0.3,
        color: rgb(0.6, 0.6, 0.6),
      });
      
      console.log('✅ [ModalCadastro] Rodapé estruturado desenhado');
      
      // Salvar PDF com assinatura e rodapé (antes de adicionar hash)
      const pdfBytesAntesHash = await pdfDoc.save();
      console.log('💾 [ModalCadastro] PDF salvo antes do hash, tamanho:', pdfBytesAntesHash.length);
      
      // Usar hash existente se disponível, senão gerar novo
      let hashRastreamento;
      if (hashExistente) {
        hashRastreamento = hashExistente.toUpperCase();
        console.log('✅ [ModalCadastro] Usando hash existente do fechamento:', hashRastreamento);
      } else {
        hashRastreamento = await gerarHashSHA1(pdfBytesAntesHash);
        console.log('✅ [ModalCadastro] Hash gerado (novo):', hashRastreamento);
      }
      
      // Recarregar PDF para adicionar hash no rodapé
      const pdfDocComHash = await PDFDocument.load(pdfBytesAntesHash);
      const ultimaPaginaComHash = pdfDocComHash.getPages()[pdfDocComHash.getPages().length - 1];
      const larguraPaginaHash = ultimaPaginaComHash.getWidth();
      
      // Reutilizar as mesmas configurações de margem
      const margemLateralHash = 50;
      const yBaseRodapeHash = 20;
      
      // Data e Hash no final do rodapé
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      const horaFormatada = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      ultimaPaginaComHash.drawText(`Data/Hora: ${dataFormatada} ${horaFormatada}`, {
        x: margemLateralHash,
        y: yBaseRodapeHash + 8,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Hash centralizado no rodapé
      const textoHash = `HASH/ID: ${hashRastreamento}`;
      const larguraHashAprox = textoHash.length * 3.5;
      ultimaPaginaComHash.drawText(textoHash, {
        x: (larguraPaginaHash - larguraHashAprox) / 2,
        y: yBaseRodapeHash + 8,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      console.log('✅ [ModalCadastro] Hash adicionado ao rodapé');
      
      // Salvar PDF final COM hash
      const pdfBytesFinal = await pdfDocComHash.save();
      console.log('✅ [ModalCadastro] PDF assinado gerado, tamanho:', pdfBytesFinal.length);
      
      // Coletar informações de rastreabilidade
      let ipAssinatura = 'desconhecido';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAssinatura = ipData.ip;
      } catch (error) {
        console.warn('Não foi possível obter IP:', error);
      }
      
      const dispositivoInfo = {
        userAgent: navigator.userAgent,
        plataforma: navigator.platform,
        idioma: navigator.language,
        timestamp: new Date().toISOString(),
        ip: ipAssinatura
      };
      
      // Salvar contrato assinado no Supabase Storage
      const pacienteId = user?.paciente_id || user?.id;
      const timestamp = Date.now();
      const nomeArquivo = `pacientes/${pacienteId}/contrato_assinado_${timestamp}.pdf`;
      
      console.log('📤 [ModalCadastro] Fazendo upload do contrato assinado...');
      
      // Converter bytes para File
      const blob = new Blob([pdfBytesFinal], { type: 'application/pdf' });
      const file = new File([blob], `contrato_assinado_${timestamp}.pdf`, { type: 'application/pdf' });
      
      const formDataUpload = new FormData();
      formDataUpload.append('document', file);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      const uploadResponse = await fetch(`${API_BASE_URL}/documents/upload-paciente/${pacienteId}/contrato_servico`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Erro ao salvar contrato assinado');
      }
      
      const uploadData = await uploadResponse.json();
      console.log('✅ [ModalCadastro] Contrato assinado salvo:', uploadData.publicUrl);
      
      // Salvar no sistema de rastreabilidade
      try {
        const nomeDocumento = `Contrato_Assinado_${paciente.nome?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        const cpfLimpo = paciente.cpf?.replace(/\D/g, '') || '';
        
        await fetch('/api/documentos-assinados', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nome: nomeDocumento,
            assinante: paciente.nome || 'Paciente',
            documento: cpfLimpo,
            hashSHA1: hashRastreamento,
            chaveValidacao: hashRastreamento.substring(0, 10),
            dataAssinatura: new Date().toISOString(),
            ip_assinatura: ipAssinatura,
            dispositivo_info: dispositivoInfo,
            hash_anterior: null,
            auditoria_log: [{
              tipo: 'criacao',
              data: new Date().toISOString(),
              ip: ipAssinatura,
              dispositivo: dispositivoInfo
            }]
          })
        });
        
        console.log('✅ [ModalCadastro] Documento salvo no sistema de rastreabilidade');
      } catch (error) {
        console.warn('⚠️ [ModalCadastro] Aviso: Não foi possível salvar dados de rastreabilidade:', error);
        // Não bloquear o fluxo se falhar
      }
      
      showSuccessToast('Contrato assinado e salvo com sucesso!');
      
      // Revogar URL antiga se existir
      if (contratoPdfUrl) {
        URL.revokeObjectURL(contratoPdfUrl);
      }
      
      // Atualizar preview do PDF assinado (reutilizar o blob já criado)
      const url = URL.createObjectURL(blob);
      setContratoPdfUrl(url);
      setContratoPdfBytes(pdfBytesFinal);
      setAssinaturaAplicada(true);
      
      // Forçar re-render do iframe mudando a key
      setPdfKey(prev => prev + 1);
      
      // Aguardar um pouco para garantir que o estado foi atualizado
      setTimeout(() => {
        console.log('🔄 [ModalCadastro] Forçando atualização do iframe...');
        const iframe = document.querySelector(`iframe[title="Contrato de Serviço"]`);
        if (iframe) {
          iframe.src = '';
          setTimeout(() => {
            iframe.src = url;
            console.log('✅ [ModalCadastro] Iframe atualizado');
          }, 100);
        }
      }, 100);
      
      // Atualizar dados do paciente
      const pacienteResponse = await makeRequest(`/pacientes/${pacienteId}`);
      if (pacienteResponse.ok) {
        const pacienteAtualizado = await pacienteResponse.json();
        console.log('✅ [ModalCadastro] Paciente atualizado com contrato assinado');
      }
      
      // Limpar estados de assinatura
      setAssinaturaBase64(null);
      setHasAssinatura(false);
      setMostrarCanvasAssinatura(false);
      
    } catch (error) {
      console.error('❌ [ModalCadastro] Erro ao assinar contrato:', error);
      showErrorToast(error.message || 'Erro ao assinar contrato. Tente novamente.');
    } finally {
      setAssinandoContrato(false);
    }
  };
  
  // Passo 4: Assinar contrato
  const handleFinalizarCadastro = async () => {
    console.log('🔍 [ModalCadastro] Botão Finalizar Cadastro clicado!');
    setLoading(true);
    
    try {
      // Buscar dados mais recentes do paciente antes de validar
      const pacienteId = user?.paciente_id || user?.id;
      console.log('🔍 [ModalCadastro] Buscando dados atualizados do paciente:', pacienteId);
      
      const pacienteResponse = await makeRequest(`/pacientes/${pacienteId}`);
      if (!pacienteResponse.ok) {
        throw new Error('Erro ao buscar dados do paciente');
      }
      
      const pacienteAtualizado = await pacienteResponse.json();
      
      // Log detalhado dos valores brutos
      console.log('📋 [ModalCadastro] Dados BRUTOS do paciente:', {
        cpf: pacienteAtualizado?.cpf,
        cpf_tipo: typeof pacienteAtualizado?.cpf,
        cpf_é_null: pacienteAtualizado?.cpf === null,
        cpf_é_undefined: pacienteAtualizado?.cpf === undefined,
        cpf_é_vazio: pacienteAtualizado?.cpf === '',
        comprovante_residencia_url: pacienteAtualizado?.comprovante_residencia_url,
        comprovante_residencia_url_tipo: typeof pacienteAtualizado?.comprovante_residencia_url,
        comprovante_residencia_url_é_null: pacienteAtualizado?.comprovante_residencia_url === null,
        comprovante_residencia_url_é_undefined: pacienteAtualizado?.comprovante_residencia_url === undefined,
        comprovante_residencia_url_é_vazio: pacienteAtualizado?.comprovante_residencia_url === '',
        comprovante_residencia_url_length: pacienteAtualizado?.comprovante_residencia_url?.length
      });
      
      // Validar campos obrigatórios com dados atualizados
      // Garantir que retornem booleanos explícitos
      const cpfValido = Boolean(
        pacienteAtualizado?.cpf && 
        String(pacienteAtualizado.cpf).trim() !== '' &&
        pacienteAtualizado.cpf !== 'null' &&
        pacienteAtualizado.cpf !== 'undefined'
      );
      
      const comprovanteValido = Boolean(
        pacienteAtualizado?.comprovante_residencia_url && 
        String(pacienteAtualizado.comprovante_residencia_url).trim() !== '' &&
        pacienteAtualizado.comprovante_residencia_url !== 'null' &&
        pacienteAtualizado.comprovante_residencia_url !== 'undefined'
      );
      
      console.log('🔍 [ModalCadastro] Resultado da validação:', {
        cpfValido,
        comprovanteValido,
        comprovante_valor: pacienteAtualizado?.comprovante_residencia_url,
        comprovante_apos_trim: pacienteAtualizado?.comprovante_residencia_url?.trim()
      });
      
      if (!cpfValido || !comprovanteValido) {
        console.error('❌ [ModalCadastro] Campos obrigatórios não preenchidos:', {
          cpf: cpfValido ? '✓' : '✗',
          comprovante_residencia_url: comprovanteValido ? '✓' : '✗'
        });
        
        const camposFaltando = [];
        let passoParaVoltar = null;
        
        if (!cpfValido) {
          camposFaltando.push('CPF');
          passoParaVoltar = 1;
        } else if (!comprovanteValido) {
          camposFaltando.push('Comprovante de Residência');
          passoParaVoltar = 2;
        }
        
        setLoading(false);
        showErrorToast(`Por favor, complete o passo ${passoParaVoltar}: ${camposFaltando.join(', ')}`);
        
        // Redirecionar para o passo correto
        if (passoParaVoltar) {
          setTimeout(() => {
            setPassoAtual(passoParaVoltar);
          }, 1000);
        }
        
        return;
      }
      
      console.log('✅ [ModalCadastro] Todos os campos validados. Finalizando cadastro...');
      console.log('📋 [ModalCadastro] Dados finais validados:', {
        cpf: cpfValido ? '✓' : '✗',
        comprovante_residencia_url: comprovanteValido ? '✓' : '✗'
      });
      
      // Simplificando: apenas mostrar sucesso e chamar onComplete
      // O contrato é opcional e não deve bloquear o fluxo
      showSuccessToast('Cadastro completo! Redirecionando...');
      
      // Pequeno delay para mostrar a mensagem
      setTimeout(() => {
        console.log('✅ [ModalCadastro] Chamando onComplete...');
        setLoading(false);
        
        // Chamar onComplete - ele vai fechar o modal e atualizar o estado
        if (onComplete) {
          console.log('✅ [ModalCadastro] onComplete existe, executando...');
          onComplete();
        } else {
          console.error('❌ [ModalCadastro] onComplete não está definido! Fechando modal e recarregando...');
          // Fallback: fechar modal e recarregar
          if (onClose) {
            onClose();
          }
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ [ModalCadastro] Erro na finalização:', error);
      setLoading(false);
      showErrorToast('Erro ao finalizar cadastro. Por favor, tente novamente.');
    }
  };
  
  return (
    <div 
      className="modal-overlay-cadastro-completo"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : '1rem',
        backdropFilter: 'blur(4px)',
        overflow: 'hidden',
        touchAction: 'none'
      }}
    >
      <div 
        ref={modalRef}
        className="modal-cadastro-completo"
        style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '0' : '16px',
          maxWidth: '600px',
          width: '100%',
          height: isMobile ? '100vh' : 'auto',
          maxHeight: isMobile ? '100vh' : '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          padding: isMobile ? '1.5rem' : '2rem',
          textAlign: 'center',
          color: 'white',
          position: 'relative',
          flexShrink: 0
        }}>
          {/* Botão de Logout */}
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair
          </button>
          
          <img 
            src={logoBrasaoPreto} 
            alt="Logo" 
            style={{ 
              height: '45px', 
              marginBottom: '1rem',
              filter: 'brightness(0) invert(1)'
            }} 
          />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
            Olá, {paciente?.nome?.split(' ')[0] || 'Paciente'}!
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', opacity: 0.9 }}>
            Para finalizar seu cadastro, preencha os seguintes itens:
          </p>
        </div>
        
        {/* Indicador de progresso */}
        <div 
          className="cadastro-stepper"
          style={{
            flexShrink: 0
          }}
        >
          {/* Linhas conectoras */}
          {[1, 2].map((index) => (
            <div
              key={`connector-${index}`}
              className="step-connector"
              style={{
                left: `calc(${index * 33.33}% - 16.665%)`,
                width: '33.33%',
                backgroundColor: index < passoAtual ? '#059669' : '#e5e7eb'
              }}
            />
          ))}
          
          {/* Steps */}
          {[
            { num: 1, label: 'CPF' },
            { num: 2, label: 'Residência' },
            { num: 3, label: 'Contrato' }
          ].map((step) => (
            <div key={step.num} className="cadastro-step">
              <div 
                className="step-number"
                style={{
                  backgroundColor: step.num <= passoAtual ? '#059669' : '#ffffff',
                  color: step.num <= passoAtual ? 'white' : '#9ca3af',
                  borderColor: step.num <= passoAtual ? '#059669' : '#e5e7eb'
                }}
              >
                {step.num < passoAtual ? '✓' : step.num}
              </div>
              <span className="step-label" style={{
                color: step.num <= passoAtual ? '#059669' : '#9ca3af',
                fontWeight: step.num === passoAtual ? '600' : '400'
              }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* Conteúdo */}
        <div 
          className="cadastro-form-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            scrollBehavior: 'smooth',
            padding: isMobile ? '1.5rem' : '2rem',
            touchAction: 'pan-y'
          }}
        >
          {/* Passo 1: CPF */}
          {passoAtual === 1 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Confirme seu CPF
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Por favor, confirme seu CPF para continuar
              </p>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  CPF *
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => {
                    const valorFormatado = formatarCPF(e.target.value);
                    setFormData(prev => ({ ...prev, cpf: valorFormatado }));
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#059669'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              
              <button
                className="btn-confirmar-cpf"
                onClick={handleConfirmarCPF}
                disabled={loading || !formData.cpf}
              >
                {loading ? 'Salvando...' : 'Confirmar CPF'}
              </button>
            </div>
          )}
          
          {/* Passo 2: Comprovante de residência */}
          {passoAtual === 2 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Comprovante de residência
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Envie um comprovante em seu nome (conta de luz, água, etc.)
              </p>
              
              {/* Opções: Tirar foto ou Enviar arquivo */}
              {!modoComprovante && !comprovantePreview && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button
                    onClick={iniciarCameraComprovante}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    Tirar Foto
                  </button>
                  <label
                    htmlFor="comprovante-upload"
                    style={{
                      flex: 1,
                      padding: '1rem',
                      backgroundColor: 'white',
                      color: '#059669',
                      border: '2px solid #059669',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Enviar Arquivo
                  </label>
                  <input
                    id="comprovante-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
              
              {/* Interface da câmera */}
              {modoComprovante === 'camera' && !comprovantePreview && (
                <div style={{
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  backgroundColor: '#000',
                  position: 'relative'
                }}>
                  <video
                    ref={videoRefComprovante}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      borderRadius: '8px',
                      display: 'block',
                      backgroundColor: '#000'
                    }}
                  />
                  {!cameraPronta && (
                    <div style={{
                      position: 'absolute',
                      inset: '1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      padding: '1rem'
                    }}>
                      <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></div>
                      <span>Aguardando câmera iniciar...</span>
                      <small style={{ opacity: 0.75 }}>Verifique se concedeu permissão ao navegador.</small>
                    </div>
                  )}
                  <canvas ref={canvasRefComprovante} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      onClick={pararCameraComprovante}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={capturarFotoComprovante}
                      style={{
                        flex: 2,
                        padding: '0.75rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Capturar Foto
                    </button>
                  </div>
                </div>
              )}
              
              {/* Preview do comprovante */}
              {comprovantePreview && (
                <div style={{
                  border: '2px dashed #e2e8f0',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                  backgroundColor: '#f8fafc'
                }}>
                  <img 
                    src={comprovantePreview} 
                    alt="Preview" 
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      marginBottom: '0.75rem'
                    }}
                  />
                  <p style={{ color: '#059669', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    {formData.comprovante_residencia?.name || 'Foto capturada'}
                  </p>
                  <button
                    onClick={limparFotoComprovante}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Remover
                  </button>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setPassoAtual(2)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleUploadComprovante}
                  disabled={uploadingComprovante || (!formData.comprovante_residencia && !comprovantePreview)}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    backgroundColor: uploadingComprovante || (!formData.comprovante_residencia && !comprovantePreview) ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: uploadingComprovante || (!formData.comprovante_residencia && !comprovantePreview) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {uploadingComprovante ? 'Enviando...' : 'Enviar Comprovante'}
                </button>
              </div>
            </div>
          )}
          
          {/* Passo 3: Assinar contrato */}
          {passoAtual === 3 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Assinar contrato de serviço
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Por favor, leia o contrato e assine digitalmente abaixo
              </p>
              
              {contratoPdfUrl ? (
                <>
                  {/* Visualização do PDF */}
                  <div 
                    className="contrato-pdf-viewer"
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      marginBottom: '1rem',
                      backgroundColor: '#f9fafb',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: isMobile ? '300px' : '500px',
                      maxHeight: isMobile ? '400px' : '600px'
                    }}
                  >
                    {contratoPdfUrl && (
                      <iframe
                        key={`contrato-pdf-iframe-${pdfKey}`}
                        src={contratoPdfUrl}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: isMobile ? '300px' : '500px',
                          border: 'none',
                          borderRadius: '6px',
                          display: 'block'
                        }}
                        title="Contrato de Serviço"
                        onLoad={() => {
                          console.log('✅ [ModalCadastro] Iframe carregado com sucesso');
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Canvas para criar assinatura */}
                  {mostrarCanvasAssinatura && (
                    <div style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      backgroundColor: '#fff'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1e293b' }}>
                        Desenhe sua assinatura
                      </h3>
                    <div
                      ref={assinaturaCanvasContainerRef}
                      style={{
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        position: 'relative',
                        width: '100%',
                        height: `${assinaturaCanvasSize.height}px`,
                        touchAction: 'none',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        padding: '0.5rem'
                      }}>
                        <SignatureCanvas
                          ref={(ref) => {
                            if (ref) {
                              setAssinaturaRef(ref);
                            }
                          }}
                          canvasProps={{
                            width: assinaturaCanvasSize.width,
                            height: assinaturaCanvasSize.height,
                            className: 'signature-canvas',
                            style: {
                              width: '100%',
                              height: '100%',
                              touchAction: 'none',
                              WebkitTouchCallout: 'none',
                              WebkitUserSelect: 'none',
                              userSelect: 'none',
                              display: 'block'
                            }
                          }}
                          onEnd={() => setHasAssinatura(true)}
                          backgroundColor="white"
                          penColor="black"
                          throttle={0}
                          velocityFilterWeight={0.7}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={limparAssinaturaContrato}
                          style={{
                            flex: 1,
                            minWidth: '100px',
                            padding: '0.75rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            touchAction: 'manipulation'
                          }}
                        >
                          Limpar
                        </button>
                        <button
                          onClick={salvarAssinaturaTemporaria}
                          disabled={!hasAssinatura}
                          style={{
                            flex: 2,
                            minWidth: '150px',
                            padding: '0.75rem',
                            backgroundColor: !hasAssinatura ? '#9ca3af' : '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: !hasAssinatura ? 'not-allowed' : 'pointer',
                            touchAction: 'manipulation'
                          }}
                        >
                          Salvar Assinatura
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Botões de ação */}
                  {!mostrarCanvasAssinatura && !assinaturaBase64 && !assinaturaAplicada && (
                    <div style={{ marginBottom: '1rem' }}>
                      <button
                        onClick={() => setMostrarCanvasAssinatura(true)}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          touchAction: 'manipulation',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Criar Assinatura
                      </button>
                    </div>
                  )}
                  
                  {assinaturaBase64 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#059669', marginBottom: '0.5rem', fontWeight: '600' }}>
                        ✓ Assinatura criada!
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setMostrarCanvasAssinatura(true);
                            setAssinaturaBase64(null);
                            setHasAssinatura(false);
                          }}
                          style={{
                            flex: 1,
                            minWidth: '120px',
                            padding: '0.75rem',
                            backgroundColor: 'white',
                            color: '#6b7280',
                            border: '2px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            touchAction: 'manipulation'
                          }}
                        >
                          Refazer Assinatura
                        </button>
                        <button
                          onClick={aplicarAssinaturaAoContrato}
                          disabled={assinandoContrato}
                          style={{
                            flex: 2,
                            minWidth: '150px',
                            padding: '0.75rem',
                            backgroundColor: assinandoContrato ? '#9ca3af' : '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: assinandoContrato ? 'not-allowed' : 'pointer',
                            touchAction: 'manipulation',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          {assinandoContrato ? (
                            <>
                              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                              Assinando...
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"></path>
                              </svg>
                              Assinar Contrato
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {assinaturaAplicada && (
                    <div style={{
                      marginBottom: '1rem',
                      padding: '0.875rem',
                      backgroundColor: '#ecfdf3',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#166534'
                    }}>
                      ✓ Contrato assinado e salvo. Você pode finalizar o cadastro.
                    </div>
                  )}
                  
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.8rem'
                  }}>
                    <p style={{ margin: 0, color: '#92400e' }}>
                      <strong>⚠️ Importante:</strong> Após assinar o contrato, você poderá finalizar seu cadastro.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setPassoAtual(2)}
                      style={{
                        flex: 1,
                        minWidth: '100px',
                        padding: '0.875rem',
                        backgroundColor: 'white',
                        color: '#6b7280',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        transition: 'all 0.2s'
                      }}
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleFinalizarCadastro}
                      disabled={loading || (!paciente?.contrato_servico_url && !assinaturaAplicada)}
                      style={{
                        flex: 2,
                        minWidth: '150px',
                        padding: '0.875rem',
                        backgroundColor: (loading || (!paciente?.contrato_servico_url && !assinaturaAplicada)) ? '#9ca3af' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: (loading || (!paciente?.contrato_servico_url && !assinaturaAplicada)) ? 'not-allowed' : 'pointer',
                        touchAction: 'manipulation',
                        transition: 'all 0.2s'
                      }}
                    >
                      {loading ? 'Finalizando...' : 'Finalizar Cadastro'}
                    </button>
                  </div>
                </>
              ) : contratoUrl ? (
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                  marginBottom: '1rem'
                }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Carregando contrato...
                  </p>
                </div>
              ) : (
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                  marginBottom: '1rem'
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ margin: '0 auto 0.75rem' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Contrato ainda não disponível. Entre em contato com sua clínica.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCadastroCompletoPaciente;
