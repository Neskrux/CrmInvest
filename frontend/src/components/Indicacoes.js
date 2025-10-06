import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { Copy, Check, CheckCircle } from 'lucide-react';
import './Indicacoes.css';

const Indicacoes = () => {
  const { user, makeRequest } = useAuth();
  const { showSuccessToast, showInfoToast, showErrorToast } = useToast();
  const [activeTab, setActiveTab] = useState('clinicas');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [linkPacientes, setLinkPacientes] = useState('');
  const [linkClinicas, setLinkClinicas] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingLink, setLoadingLink] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  // Imagens para o carrossel
  const imagensClinicas = [
    {
      id: 1,
      url: '/images/clinicas/cli1.png',
      titulo: 'Clínica Parceira',
      descricao: 'Receba à vista, paciente paga parcelado'
    },
    {
      id: 2,
      url: '/images/clinicas/cli2.png',
      titulo: 'Aumente seu Faturamento',
      descricao: 'Mais pacientes, sem inadimplência'
    },
    {
      id: 3,
      url: '/images/clinicas/cli3.png',
      titulo: 'Gestão Completa',
      descricao: 'Nós cuidamos da cobrança'
    },
    {
      id: 4,
      url: '/images/clinicas/cli4.png',
      titulo: 'Fluxo de Caixa Garantido',
      descricao: 'Pagamento em D+1 útil'
    },
    {
      id: 5,
      url: '/images/clinicas/cli5.png',
      titulo: 'Pacientes Pré-aprovados',
      descricao: 'Sem perda de tempo com negociação'
    },
    {
      id: 6,
      url: '/images/clinicas/cli6.png',
      titulo: 'Parceria de Sucesso',
      descricao: 'Mais de 200 clínicas parceiras'
    }
  ];

  const imagensPacientes = [
    {
      id: 1,
      url: '/images/pacientes/pac1.png',
      titulo: 'Tratamento Odontológico',
      descricao: 'Comece hoje e pague no boleto em até 36x'
    },
    {
      id: 2,
      url: '/images/pacientes/pac2.png',
      titulo: 'Parcelamento Facilitado',
      descricao: 'Só a InvestMoney parcela no boleto'
    },
    {
      id: 3,
      url: '/images/pacientes/pac3.png',
      titulo: 'Sorriso Novo',
      descricao: 'Implantes parcelados em até 36x'
    },
    {
      id: 4,
      url: '/images/pacientes/pac4.png',
      titulo: 'Sorriso dos Sonhos',
      descricao: 'Sem entrada, parcelas que cabem no bolso'
    },
    {
      id: 5,
      url: '/images/pacientes/pac5.png',
      titulo: 'Procedimento Estético',
      descricao: 'Harmonização facial parcelada'
    },
    {
      id: 6,
      url: '/images/pacientes/pac6.png',
      titulo: 'Tratamento Completo',
      descricao: 'Aprovação rápida, sem burocracia'
    }
  ];

  // Templates premium profissionais
  const templatesDisponiveis = activeTab === 'clinicas' ? imagensClinicas : imagensPacientes;

  // Modelos de mensagens corporativas
  const mensagensPacientes = [
    {
      id: 1,
      titulo: 'Tratamento Aprovado - Sem Cartão',
      texto: `Olá!\n\nTemos uma boa notícia: conseguimos aprovar seu tratamento mesmo sem cartão de crédito.\n\nComo funciona:\n• Pagamento 100% no boleto mensal\n• Sem entrada obrigatória\n• Primeira consulta gratuita\n• Início do tratamento após aprovação\n\nVantagens:\n• Sem consulta ao SPC/Serasa\n• Parcelas que cabem no seu orçamento\n• Clínicas parceiras qualificadas\n• Profissionais especializados\n\nEsta é uma oportunidade real para você realizar seu tratamento. Entre em contato para mais informações:`
    },
    {
      id: 2,
      titulo: 'Tratamento Odontológico Facilitado',
      texto: `Prezado(a),\n\nOferecemos uma solução para quem precisa de tratamento odontológico mas não possui cartão de crédito ou dinheiro à vista.\n\nNossa proposta:\n• Parcelamento no boleto bancário\n• Avaliação inicial gratuita\n• Aprovação rápida e simples\n• Clínicas parceiras certificadas\n\nTratamentos disponíveis:\n• Ortodontia\n• Implantes\n• Próteses\n• Estética dental\n\nMais de 3.000 pacientes já foram atendidos através do nosso sistema. Queremos ajudar você também.\n\nEntre em contato para agendar sua avaliação:`
    },
    {
      id: 3,
      titulo: 'Procedimentos Estéticos - Pagamento Facilitado',
      texto: `Olá!\n\nSe você deseja realizar procedimentos estéticos mas não tem cartão de crédito, temos uma solução para você.\n\nNossa proposta:\n• Parcelamento no boleto\n• Sem entrada obrigatória\n• Aprovação em até 24h\n• Clínicas parceiras qualificadas\n\nProcedimentos disponíveis:\n• Harmonização facial\n• Preenchimentos\n• Limpeza de pele\n• Tratamentos corporais\n\nTrabalhamos com clínicas que utilizam produtos originais e contam com profissionais especializados.\n\nAgende sua consulta gratuita:`
    }
  ];

  const mensagensClinicas = [
    {
      id: 1,
      titulo: 'Receba à Vista - Paciente Paga Parcelado',
      texto: `Prezado(a) proprietário(a) de clínica,\n\nApresentamos uma proposta comercial que pode aumentar significativamente seu faturamento.\n\nComo funciona:\n• Paciente faz tratamento de R$ 5.000\n• Ele parcela em 10x no boleto\n• Você recebe os R$ 5.000 à vista\n• Nós cuidamos da cobrança\n\nVantagens para sua clínica:\n• Eliminação do risco de inadimplência\n• Fluxo de caixa garantido\n• Aumento no número de pacientes\n• Pacientes pré-aprovados para tratamento\n• Sem taxas de cartão de crédito\n\nNossos números:\n• 85% de aprovação dos pacientes\n• Ticket médio: R$ 3.500\n• 15-20 novos pacientes por mês\n• Pagamento em D+1 útil\n\nTrabalhamos com mais de 200 clínicas parceiras em todo o Brasil.\n\nEntre em contato para conhecer nossa proposta:`
    },
    {
      id: 2,
      titulo: 'Solução para Agenda e Inadimplência',
      texto: `Prezada clínica,\n\nIdentificamos que muitas clínicas enfrentam os seguintes desafios:\n• Agenda com baixa ocupação\n• Alto índice de inadimplência\n• Pacientes que desistem por falta de crédito\n• Fluxo de caixa irregular\n\nNossa solução:\n\n1. Enviamos pacientes pré-aprovados\n2. Você atende e fecha o tratamento\n3. Recebe o valor à vista em 24h\n4. Nós gerenciamos a cobrança\n\nBenefícios comprovados:\n• Aumento médio de 35% no faturamento\n• Zero inadimplência para a clínica\n• Pacientes que realmente realizam o tratamento\n• Gestão completa da cobrança\n• Sistema legal e transparente\n\nExemplo de resultado:\nClínica parceira - Odontologia\nAntes: 40 pacientes/mês\nDepois: 95 pacientes/mês\nAumento no faturamento: R$ 65.000/mês\n\nVagas limitadas por região. Entre em contato:`
    },
    {
      id: 3,
      titulo: 'Antecipação de Boletos - Aumento de Faturamento',
      texto: `Prezado(a) proprietário(a),\n\nPara clínicas que desejam:\n• Aumentar o número de pacientes\n• Receber sempre à vista\n• Eliminar inadimplência\n• Melhorar a ocupação da agenda\n\nO problema: 60% dos pacientes não possuem cartão com limite suficiente.\nNossa solução: Antecipamos o pagamento via boleto.\n\nComo funciona:\n• Paciente sem cartão/dinheiro\n• Quer fazer tratamento de R$ 8.000\n• Parcela em 12x no boleto\n• Você recebe R$ 8.000 à vista\n• Nós gerenciamos a cobrança\n\nDiferenciais:\n• Aprovação em até 24h\n• Pagamento em D+1\n• Taxa menor que cartão de crédito\n• Atendimento a todas as classes sociais\n• Suporte completo\n\nMédia das nossas clínicas parceiras:\n• 20 novos pacientes por mês\n• Ticket médio: R$ 3.800\n• Taxa de conversão: 88%\n\nEntre em contato para mais informações:`
    }
  ];

  // Verificação de permissão - executada sempre
  useEffect(() => {
    if (!user?.is_freelancer || user?.tipo !== 'consultor') {
      return; // Sai sem executar fetchLinks
    }

    // Só executa fetchLinks se o usuário tiver permissão
    fetchLinks();
  }, [user]);

  // Cleanup: restaurar scroll quando componente for desmontado
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      setLoadingLink(true);
      
      // Usar a rota de perfil que o consultor pode acessar
      const consultorResponse = await makeRequest('/consultores/perfil');
      const responseData = await consultorResponse.json();
      
      if (consultorResponse.ok && responseData.consultor) {
        const consultorData = responseData.consultor;
        
        // Verificar se é consultor interno (tem as duas permissões)
        const isConsultorInterno = consultorData.pode_ver_todas_novas_clinicas === true && 
                                   consultorData.podealterarstatus === true;
        
        if (!isConsultorInterno) {
          // Freelancer: buscar link personalizado baseado no código de referência
          if (consultorData.codigo_referencia) {
            setLinkPacientes(`https://solumn.com.br/captura-lead?ref=${consultorData.codigo_referencia}`);
            setLinkClinicas(`https://solumn.com.br/captura-clinica?ref=${consultorData.codigo_referencia}`);
          } else {
            // Se não tem código de referência, mostrar mensagem
            setLinkPacientes(null);
            setLinkClinicas(null);
          }
        } else {
          // Interno: usar link geral
          setLinkPacientes('https://solumn.com.br/captura-lead');
          setLinkClinicas('https://solumn.com.br/captura-clinica');
        }
      } else {
        console.error('Erro ao buscar dados do consultor:', responseData);
        setLinkPacientes(null);
        setLinkClinicas(null);
      }
    } catch (error) {
      console.error('Erro ao buscar link personalizado:', error);
      setLinkPacientes(null);
      setLinkClinicas(null);
    } finally {
      setLoading(false);
      setLoadingLink(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    showSuccessToast('Link copiado com sucesso!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyFullMessage = () => {
    const mensagem = selectedMessage;
    const link = activeTab === 'clinicas' ? linkClinicas : linkPacientes;
    const fullText = `${mensagem.texto}\n\n${link}`;

    navigator.clipboard.writeText(fullText);
    showSuccessToast('Mensagem completa copiada!');
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? templatesDisponiveis.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => 
      (prev + 1) % templatesDisponiveis.length
    );
  };

  const openImageModal = (image) => {
    setModalImage(image);
    setShowImageModal(true);
    // Prevenir scroll da página principal
    document.body.style.overflow = 'hidden';
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImage(null);
    // Restaurar scroll da página principal
    document.body.style.overflow = 'unset';
  };

  const openMessageModal = (message) => {
    setModalMessage(message);
    setShowMessageModal(true);
    // Prevenir scroll da página principal
    document.body.style.overflow = 'hidden';
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setModalMessage(null);
    // Restaurar scroll da página principal
    document.body.style.overflow = 'unset';
  };

  const selectMessageFromModal = () => {
    if (modalMessage) {
      handleMessageSelect(modalMessage);
      closeMessageModal();
    }
  };

  const downloadSelectedImage = async () => {
    if (!selectedTemplate) return;

    try {
      // Detectar se é iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      // Tentar usar a API de compartilhamento nativa (funciona melhor no iOS)
      if (isIOS && navigator.share) {
        try {
          // Fazer fetch da imagem e converter para blob
          const response = await fetch(selectedTemplate.url);
          const blob = await response.blob();
          const file = new File([blob], `${selectedTemplate.titulo}.jpg`, { type: 'image/jpeg' });
          
          await navigator.share({
            files: [file],
            title: selectedTemplate.titulo,
            text: 'Imagem selecionada para indicação'
          });
          
          showSuccessToast('Compartilhe e escolha "Salvar Imagem" para salvar nas fotos!');
          return;
        } catch (shareError) {
          console.log('Share API falhou, tentando método alternativo:', shareError);
        }
      }
      
      // Método alternativo: converter para blob e criar link de download
      try {
        const response = await fetch(selectedTemplate.url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${selectedTemplate.titulo}.jpg`;
        
        // Para iOS, abrir em nova aba permite salvar nas fotos
        if (isIOS) {
          link.target = '_blank';
          showSuccessToast('Toque e segure na imagem para salvar nas fotos!');
        } else {
          showSuccessToast('Imagem baixada com sucesso!');
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar o blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (blobError) {
        // Fallback final: abrir em nova aba
        window.open(selectedTemplate.url, '_blank');
        showInfoToast('Toque e segure na imagem para salvar!');
      }
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      showErrorToast('Erro ao baixar imagem. Tente novamente.');
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    showInfoToast(`Template "${template.titulo}" selecionado`);
  };

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
    showInfoToast(`Modelo "${message.titulo}" selecionado`);
  };

  const handleTabChange = (newTab) => {
    // Limpar todas as seleções ao mudar de tab
    setSelectedTemplate(null);
    setSelectedMessage(null);
    setSelectedImageIndex(0);
    setActiveTab(newTab);
  };

  // Verificação final de permissão antes do render
  if (!user?.is_freelancer || user?.tipo !== 'consultor') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#666'
      }}>
        Acesso restrito a freelancers consultores
      </div>
    );
  }

  return (
    <div className="indicacoes-container">
      {/* Header executivo */}
      <div className="indicacoes-header">
        <div className="header-content">
          <h1 className="header-title">
            Comece a Indicar
          </h1>
          <p className="header-subtitle">
            Siga os passos abaixo para começar a indicar e ganhar dinheiro
          </p>
        </div>
      </div>

      {/* Seção de Comissões em Destaque */}
      <div style={{
        padding: '2rem',
        borderRadius: '16px',
        margin: '2rem auto',
        maxWidth: '1200px',
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'black',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            color: 'black'
          }}>
            Quanto você ganha com suas indicações?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.95,
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            Receba comissões atrativas por cada indicação que fechar conosco
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
          gap: '1.5rem',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* Card Clínicas */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            transition: 'transform 0.3s ease',
            position: 'relative'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '1rem'
            }}>
              Indicação de Clínicas
            </h3>
            <div style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#10b981',
              marginBottom: '0.5rem',
              lineHeight: '1'
            }}>
              R$ 100
            </div>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              fontWeight: '500',
              marginBottom: '1rem'
            }}>
              por clínica indicada
            </p>
            
            {/* Destaque do Bônus ES */}
            <div style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              padding: '1rem',
              borderRadius: '8px',
              border: '2px solid #f59e0b',
              marginBottom: '1rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite'
              }}></div>
              <div style={{
                fontSize: '0.75rem',
                color: '#92400e',
                fontWeight: '600',
                textTransform: 'uppercase',
                marginBottom: '0.25rem',
                letterSpacing: '0.5px'
              }}>
                Bônus Especial
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#f59e0b',
                marginBottom: '0.25rem'
              }}>
                R$ 200
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: '#92400e',
                fontWeight: '600'
              }}>
                Para clínicas no Espírito Santo
              </div>
            </div>
            
            <div style={{
              background: '#f0fdf4',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #bbf7d0'
            }}>
              <p style={{
                fontSize: '0.9rem',
                color: '#065f46',
                fontWeight: '600',
                margin: 0
              }}>
                ✓ Pagamento quando a clínica fechar parceria conosco
              </p>
            </div>
          </div>

          {/* Card Pacientes */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ marginLeft: '0.5rem' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '1rem'
            }}>
              Indicação de Pacientes
            </h3>
            <div style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#3b82f6',
              marginBottom: '0.5rem',
              lineHeight: '1'
            }}>
              R$ 50
            </div>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              fontWeight: '500',
              marginBottom: '1rem'
            }}>
              a cada R$ 5.000 do tratamento
            </p>
            <div style={{
              background: '#eff6ff',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #bfdbfe'
            }}>
              <p style={{
                fontSize: '0.9rem',
                color: '#1e40af',
                fontWeight: '600',
                margin: 0
              }}>
                ✓ Ex: Tratamento de R$ 3.000 = R$ 30 de comissão
              </p>
            </div>
          </div>
        </div>
        {/* Tabs executivas */}
      <h2 style={{
        fontSize: '2rem',
        fontWeight: '700',
        marginBottom: '1rem',
        color: 'black',
        textAlign: 'center',
        marginTop: '2rem'
      }}>Escolha o que você quer indicar</h2>
      <div className="tabs-container">
        <div className="tabs-wrapper">
          <button
            className={`tab-button ${activeTab === 'clinicas' ? 'active' : ''}`}
            onClick={() => handleTabChange('clinicas')}
          >
            <div className="tab-content">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
                     <div className="tab-info">
                       <span className="tab-text">Clínicas</span>
                       <span className="tab-subtitle">Indicar clínicas</span>
                       <span style={{
                         display: 'inline-block',
                         marginTop: '0.25rem',
                         padding: '0.25rem 0.5rem',
                         background: '#10b981',
                         color: 'white',
                         fontSize: '0.75rem',
                         fontWeight: '700',
                         borderRadius: '6px'
                       }}>
                         R$ 100 por clínica
                       </span>
                     </div>
            </div>
          </button>
          <button
            className={`tab-button ${activeTab === 'pacientes' ? 'active' : ''}`}
            onClick={() => handleTabChange('pacientes')}
          >
            <div className="tab-content">
              <div className="tab-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                    </div>
                     <div className="tab-info">
                       <span className="tab-text">Pacientes</span>
                       <span className="tab-subtitle">Indicar pacientes</span>
                       <span style={{
                         display: 'inline-block',
                         marginTop: '0.25rem',
                         padding: '0.25rem 0.5rem',
                         background: '#3b82f6',
                         color: 'white',
                         fontSize: '0.75rem',
                         fontWeight: '700',
                         borderRadius: '6px'
                       }}>
                         R$ 50 a cada R$ 5.000
                       </span>
                     </div>
                    </div>
              </button>
            </div>
          </div>
      </div>


      {/* Processo executivo */}
      <div className="process-container">

        {/* Passo 2: Mensagens Corporativas */}
        <div className="process-step">
          <div className="step-header">
            <div className="step-number">1</div>
            <div className="step-content">
                   <h2>Escolha uma Mensagem (Opcional)</h2>
                   <p>Use um dos modelos prontos ou personalize do seu jeito</p>
            </div>
          </div>
          <div className="messages-grid">
            {(activeTab === 'clinicas' ? mensagensClinicas : mensagensPacientes).map(message => (
              <div
                key={message.id}
                className={`message-card ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                onClick={() => handleMessageSelect(message)}
              >
                <div className="message-header">
                  <h3>{message.titulo}</h3>
                </div>
                <div className="message-content">
                  <div className="message-preview">
                    <p>{message.texto.substring(0, 150)}...</p>
                  </div>
                  <div className="message-actions">
                    <button 
                      className="view-full-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMessageModal(message);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Ver completo
                    </button>
                    {selectedMessage?.id === message.id && (
                      <div className="selected-indicator">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Passo 3: Templates Premium */}
        <div className="process-step">
          <div className="step-header">
            <div className="step-number">2</div>
            <div className="step-content">
                   <h2>Escolha uma Imagem (Opcional)</h2>
                   <p>Selecione a imagem que mais combina com seu público, ou envie apenas a mensagem de texto</p>
            </div>
          </div>
          <div className="carousel-container">
            <button className="carousel-arrow carousel-arrow-left" onClick={handlePrevImage}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            
            <div className="carousel-content">
              <div className="carousel-main-image">
                <img 
                  src={templatesDisponiveis[selectedImageIndex].url} 
                  alt={templatesDisponiveis[selectedImageIndex].titulo}
                  onClick={() => openImageModal(templatesDisponiveis[selectedImageIndex])}
                />
                <div className="carousel-image-info">
                  <h3>{templatesDisponiveis[selectedImageIndex].titulo}</h3>
                  <p>{templatesDisponiveis[selectedImageIndex].descricao}</p>
                </div>
                {selectedTemplate?.id === templatesDisponiveis[selectedImageIndex].id && (
                  <div className="selected-badge-carousel">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Selecionada</span>
                  </div>
                )}
                <button 
                  className="select-image-button"
                  onClick={() => handleTemplateSelect(templatesDisponiveis[selectedImageIndex])}
                >
                  {selectedTemplate?.id === templatesDisponiveis[selectedImageIndex].id ? 'Selecionada' : 'Selecionar'}
                </button>
              </div>
              
              <div className="carousel-thumbnails">
                {templatesDisponiveis.map((image, index) => (
                  <div
                    key={image.id}
                    className={`thumbnail ${index === selectedImageIndex ? 'active' : ''} ${selectedTemplate?.id === image.id ? 'selected' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={image.url} alt={image.titulo} />
                    {selectedTemplate?.id === image.id && (
                      <div className="thumbnail-selected">
                        <CheckCircle size={20} color="white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <button className="carousel-arrow carousel-arrow-right" onClick={handleNextImage}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          
          {/* Botão de baixar imagem */}
          {selectedTemplate && (
            <div className="download-image-section">
              <button
                className="action-button download"
                onClick={downloadSelectedImage}
                disabled={!selectedTemplate}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Baixar Imagem Selecionada
              </button>
            </div>
          )}

          {/* Mensagem Completa - Preview Final */}
          {selectedMessage && (
            <div className="complete-message-card">
              <div className="message-header">
                  <h4>Envie essa mensagem para seus possíveis clientes!</h4>
                <button className="copy-all-button" onClick={copyFullMessage}>
                  <Copy size={16} />
                  Copiar Mensagem
                </button>
              </div>
              <div className="message-full-content">
                {/* Preview da imagem selecionada */}
                {selectedTemplate && (
                  <div className="selected-image-preview">
                    <div className="preview-header">
                      <h5>Imagem Selecionada</h5>
                      <div className="preview-badge">
                        <CheckCircle size={16} color="#10b981" />
                        <span>Selecionada</span>
                      </div>
                    </div>
                    <div className="preview-image-container">
                      <img 
                        src={selectedTemplate.url} 
                        alt={selectedTemplate.titulo}
                        className="preview-image"
                      />
                      <div className="preview-info">
                        <h6>{selectedTemplate.titulo}</h6>
                        <p>{selectedTemplate.descricao}</p>
                      </div>
                    </div>
                    <div className="image-warning" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="warning-text">
                        <strong>Importante:</strong> Lembre-se de baixar a imagem selecionada e enviá-la junto com a mensagem para garantir que tudo fique perfeito!
                      </div>
                      <button
                        className="action-button download"
                        onClick={downloadSelectedImage}
                        style={{
                          marginTop: '1rem',
                          padding: '0.5rem 1rem',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Baixar Imagem
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="message-text">
                  <p>{selectedMessage.texto}</p>
                  <div className="link-attachment">
                    <div className="link-box">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                      {activeTab === 'clinicas' ? linkClinicas : linkPacientes}
                    </div>
                  </div>
                </div>
                
                {/* Botão de copiar no final */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button 
                    className="action-button primary" 
                    onClick={copyFullMessage}
                    style={{
                      padding: '0.75rem 2rem',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copiar Mensagem Completa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Passo 1: Links Executivos */}
        <div className="process-step">
          <div className="step-header">
            <div className="step-content">
                   <h2>Esse é <strong>SEU</strong> link personalizado</h2>
                   <p>Se não deseja utilizar nossos textos e imagens pré-definidos, você pode personalizar do seu jeito, mas não esqueça de enviar junto com o link!</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-section">
              <div className="loading-spinner"></div>
                   <p>Carregando seus links...</p>
            </div>
          ) : (
            <div className="links-section">
              <div className="links-container">
                <div className="link-card">
                  <div className="link-header">
                    <div className={`link-icon ${activeTab === 'pacientes' ? 'link-icon-pacientes' : ''}`}>
                      {activeTab === 'clinicas' ?
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg> :
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                        </svg>
                      }
                    </div>
                    <div className="link-info">
                           <h4>Link para {activeTab === 'clinicas' ? 'Clínicas' : 'Pacientes'}</h4>
                           <p>Use este link para suas indicações</p>
                    </div>
                  </div>
                  <div className="link-input-container">
                    <input
                      type="text"
                      value={loadingLink ? 'Carregando...' : (activeTab === 'clinicas' ? linkClinicas : linkPacientes) || 'Link não disponível'}
                      readOnly
                      className="link-input"
                      placeholder="Seu link personalizado será gerado aqui..."
                    />
                    <button
                      className="copy-link-button"
                      onClick={() => copyToClipboard(activeTab === 'clinicas' ? linkClinicas : linkPacientes)}
                      disabled={loadingLink || !(activeTab === 'clinicas' ? linkClinicas : linkPacientes)}
                    >
                      {copiedLink ?
                        <><Check size={16} /> Copiado!</> :
                        <><Copy size={16} /> Copiar</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Ações Finais */}
        <div className="final-actions">
          <h3>Tudo pronto!</h3>
          <p>Agora é só compartilhar e acompanhar o status das suas indicações na página Clínicas ou Pacientes. <strong>Todos que se cadastrarem pelo seu link serão atribuídos a você no sistema
          </strong></p>
          <div className="action-buttons">
            <button className="action-button primary" onClick={() => window.location.href = '/dashboard'}>
              Ver Dashboard
            </button>
            <button className="action-button secondary" onClick={() => window.location.href = activeTab === 'clinicas' ? '/clinicas' : '/pacientes'}>
              Minhas Indicações
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Visualização de Imagem */}
      {showImageModal && modalImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeImageModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <img src={modalImage.url} alt={modalImage.titulo} />
            <div className="modal-image-info">
              <h3>{modalImage.titulo}</h3>
              <p>{modalImage.descricao}</p>
              <button 
                className="modal-select-button"
                onClick={() => {
                  handleTemplateSelect(modalImage);
                  closeImageModal();
                }}
              >
                Selecionar esta imagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Mensagem */}
      {showMessageModal && modalMessage && (
        <div className="message-modal-overlay" onClick={closeMessageModal}>
          <div className="message-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeMessageModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            
            <div className="message-modal-header">
              <h3>{modalMessage.titulo}</h3>
            </div>
            
            <div className="message-modal-body">
              <p>{modalMessage.texto}</p>
            </div>
            
            <div className="message-modal-footer">
              <button 
                className="modal-button secondary"
                onClick={closeMessageModal}
              >
                Fechar
              </button>
              <button 
                className="modal-button primary"
                onClick={selectMessageFromModal}
              >
                Selecionar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Indicacoes;
