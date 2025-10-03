import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Copy, Check, CheckCircle } from 'lucide-react';
import './ComoFazer.css';

const ComoFazer = () => {
  const { user, makeRequest } = useAuth();
  const { showSuccessToast, showInfoToast } = useToast();
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
      url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
      titulo: 'Clínica Moderna',
      descricao: 'Ambiente profissional e acolhedor'
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
      titulo: 'Consultório Premium',
      descricao: 'Tecnologia de ponta para tratamentos'
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&q=80',
      titulo: 'Sala de Atendimento',
      descricao: 'Conforto e privacidade garantidos'
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
      titulo: 'Recepção Elegante',
      descricao: 'Primeira impressão que marca'
    },
    {
      id: 5,
      url: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80',
      titulo: 'Equipamentos Modernos',
      descricao: 'Tecnologia avançada em saúde'
    }
  ];

  const imagensPacientes = [
    {
      id: 1,
      url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80',
      titulo: 'Sorriso Renovado',
      descricao: 'Resultados que transformam vidas'
    },
    {
      id: 2,
      url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80',
      titulo: 'Tratamento Personalizado',
      descricao: 'Cuidado único para cada paciente'
    },
    {
      id: 3,
      url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
      titulo: 'Bem-estar Completo',
      descricao: 'Saúde e qualidade de vida'
    },
    {
      id: 4,
      url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=80',
      titulo: 'Consulta Especializada',
      descricao: 'Profissionais qualificados'
    },
    {
      id: 5,
      url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
      titulo: 'Resultado Garantido',
      descricao: 'Satisfação e confiança'
    }
  ];

  // Templates premium profissionais
  const templatesDisponiveis = activeTab === 'clinicas' ? imagensClinicas : imagensPacientes;

  // Modelos de mensagens corporativas
  const mensagensPacientes = [
    {
      id: 1,
      titulo: 'Consulta Inicial Gratuita',
      texto: `Prezado(a),\n\nTemos uma oportunidade exclusiva para você conhecer nossos serviços.\n\n• Consulta inicial sem custo\n• Avaliação profissional completa\n• Plano de tratamento personalizado\n• Condições especiais de pagamento\n• Profissionais altamente qualificados\n\nAproveite esta oportunidade:`
    },
    {
      id: 2,
      titulo: 'Tratamento Especializado',
      texto: `Excelente oportunidade para investir na sua saúde e bem-estar.\n\n• Clínicas com tecnologia de ponta\n• Equipe multidisciplinar qualificada\n• Condições de parcelamento facilitadas\n• Tratamento 100% personalizado\n• Resultados comprovados e duradouros\n\nConheça nossa proposta:`
    },
    {
      id: 3,
      titulo: 'Transformação Completa',
      texto: `Invista no seu bem-estar com nossos serviços exclusivos.\n\n• Tratamentos com resultados excepcionais\n• Abordagem personalizada para cada paciente\n• Condições comerciais diferenciadas\n• Acompanhamento especializado completo\n• Satisfação garantida com nossos protocolos\n\nDescubra o que preparamos para você:`
    }
  ];

  const mensagensClinicas = [
    {
      id: 1,
      titulo: 'Parceria Estratégica',
      texto: `Prezada clínica,\n\nApresentamos uma proposta comercial diferenciada para expansão da sua carteira de pacientes.\n\n• Sistema exclusivo de captação de pacientes\n• Pacientes pré-qualificados com alto potencial\n• Modelo sem mensalidade - pague por resultados\n• Relatórios detalhados e transparência total\n• Suporte técnico especializado incluso\n\nAgende uma reunião para conhecer nossa proposta:`
    },
    {
      id: 2,
      titulo: 'Programa de Indicação',
      texto: `Clínica especializada,\n\nOferecemos um programa de captação de pacientes com resultados comprovados.\n\n• Sistema testado por clínicas parceiras\n• Pacientes qualificados com interesse real\n• Comissão atrativa e competitiva\n• Suporte técnico durante toda parceria\n• Implementação rápida e simples\n\nEntre em contato para conhecer os detalhes:`
    },
    {
      id: 3,
      titulo: 'Expansão Comercial',
      texto: `Estimada clínica,\n\nApresentamos uma oportunidade de parceria comercial para crescimento sustentável.\n\n• Aumento médio de 40% em novos pacientes\n• Sistema automatizado de captação\n• Gestão profissional com relatórios\n• Marketing especializado incluso\n• Treinamento da equipe para conversões\n\nVamos conversar sobre esta parceria:`
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

  const downloadSelectedImage = () => {
    if (selectedTemplate) {
      const link = document.createElement('a');
      link.href = selectedTemplate.url;
      link.download = `${selectedTemplate.titulo}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccessToast('Imagem baixada com sucesso!');
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
    <div className="como-fazer-container">
      {/* Header executivo */}
      <div className="como-fazer-header">
        <div className="header-content">
          <h1 className="header-title">
            Como Fazer Indicações
          </h1>
          <p className="header-subtitle">
            Siga os 3 passos simples abaixo para começar a indicar
          </p>
        </div>
      </div>

      {/* Tabs executivas */}
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
                     </div>
            </div>
          </button>
        </div>
      </div>

      {/* Processo executivo */}
      <div className="process-container">
        {/* Passo 1: Links Executivos */}
        <div className="process-step">
          <div className="step-header">
            <div className="step-number">1</div>
            <div className="step-content">
                   <h2>Esse é <strong>SEU</strong> link personalizado</h2>
                   <p>Seu link personalizado para acompanhar as indicações</p>
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

        {/* Passo 2: Mensagens Corporativas */}
        <div className="process-step">
          <div className="step-header">
            <div className="step-number">2</div>
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
            <div className="step-number">3</div>
            <div className="step-content">
                   <h2>Escolha uma Imagem (Opcional)</h2>
                   <p>Selecione o template que mais combina com seu público</p>
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
                  <h4>Mensagem Completa</h4>
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
        </div>

        {/* Ações Finais */}
        <div className="final-actions">
          <h3>Tudo pronto!</h3>
          <p>Agora é só compartilhar e acompanhar o status das suas indicações <br /> <strong>Todos que se cadastrarem pelo seu link serão atribuídos a você no sistema
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

export default ComoFazer;
