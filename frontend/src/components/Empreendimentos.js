import React, { useState, useEffect } from 'react';
import useBranding from '../hooks/useBranding';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabaseClient';
import { Phone, Mail, Share2, X, Calculator, ArrowLeft, Home, Images, Globe, BookOpen, ChevronLeft, ChevronRight, Maximize2, Bed, BedDouble, Car, Clock, Bath, Droplets, Ruler, Edit, Copy } from 'lucide-react';

const Empreendimentos = () => {
  const { t } = useBranding();
  const { user, makeRequest } = useAuth();
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('unidades');
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [filtroGaleria, setFiltroGaleria] = useState('Apartamento');
  const [tipoDiferencial, setTipoDiferencial] = useState('unidade'); // 'unidade' ou 'gerais'
  const [galeriaImagensSupabase, setGaleriaImagensSupabase] = useState({});
  const [loadingGaleria, setLoadingGaleria] = useState(false);
  const [listaUnidades, setListaUnidades] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState(null);
  const [showUnidadeModal, setShowUnidadeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [shareOptions, setShareOptions] = useState({
    localizacao: true,
    valorCondicoes: true,
    catalogo: true,
    caracteristicas: true,
    descricaoImovel: true,
    receberPropostas: true
  });

  // Função para buscar empreendimentos do banco
  const fetchEmpreendimentos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const config = await import('../config');
      const response = await fetch(`${config.default.API_BASE_URL}/empreendimentos-public`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar empreendimentos');
      }
      
      const data = await response.json();
      
       // Mapear dados do banco para o formato esperado
       const empreendimentosFormatados = data.map(emp => {
         // Usar apenas URL do Supabase se existir
         const imagemPath = (emp.imagem && emp.imagem.trim() && (emp.imagem.startsWith('http://') || emp.imagem.startsWith('https://'))) 
           ? emp.imagem 
           : null;

         return {
           id: emp.id,
           nome: emp.nome,
           descricao: emp.observacoes || '',
           localizacao: `${emp.cidade} - ${emp.estado}`,
           endereco: emp.endereco || '',
           bairro: emp.bairro || '',
           tipo: emp.tipo || 'Residencial',
           unidades: emp.unidades != null ? parseInt(emp.unidades, 10) || 0 : 0,
           status: emp.status === 'ativo' ? 'Em construção' : 'Lançamento',
           imagem: imagemPath,
          condicoesPagamento: (() => {
            try {
              // Se for string JSON, fazer parse
              if (typeof emp.condicoes_pagamento === 'string' && emp.condicoes_pagamento.trim()) {
                return JSON.parse(emp.condicoes_pagamento);
              }
              // Se já for objeto/array, retornar direto
              if (Array.isArray(emp.condicoes_pagamento) || typeof emp.condicoes_pagamento === 'object') {
                return emp.condicoes_pagamento;
              }
              return [];
            } catch (e) {
              console.warn('Erro ao processar condições de pagamento:', e);
              return [];
            }
          })(),
          // Novos campos
          galeriaImagens: (() => {
            try {
              if (typeof emp.galeria_imagens === 'string' && emp.galeria_imagens.trim()) {
                return JSON.parse(emp.galeria_imagens);
              }
              if (Array.isArray(emp.galeria_imagens)) {
                return emp.galeria_imagens;
              }
              return [];
            } catch (e) {
              console.warn('Erro ao processar galeria de imagens:', e);
              return [];
            }
          })(),
          diferenciaisGerais: emp.diferenciais_gerais || '',
          diferenciaisUnidade: emp.diferenciais_unidade || '',
          progressoObra: emp.progresso_obra || 0,
          dataInicioObra: emp.data_inicio_obra || null,
          dataEntrega: emp.data_entrega || null,
          valorCondominio: emp.valor_condominio || null,
          valorIptu: emp.valor_iptu || null,
          dataUltimaAtualizacao: emp.data_ultima_atualizacao || null,
          telefone: emp.telefone || '',
          email: emp.email || '',
          catalogoUrl: emp.catalogo_url || '',
          tourVirtualUrl: emp.tour_virtual_url || '',
          simuladorCaixaUrl: emp.simulador_caixa_url || ''
        };
       });
      
      setEmpreendimentos(empreendimentosFormatados);
    } catch (err) {
      console.error('❌ Erro ao buscar empreendimentos:', err);
      setError('Erro ao carregar empreendimentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchEmpreendimentos();
  }, []);

  // Desabilitar scroll do body quando o modal estiver aberto
  useEffect(() => {
    if (showModal) {
      // Salvar o valor atual do overflow
      const originalOverflow = document.body.style.overflow;
      // Desabilitar scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurar o scroll ao fechar
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal]);

  // Gerenciar carregamento e limpeza da galeria baseado na aba ativa
  useEffect(() => {
    if (!selectedEmpreendimento) return;

    const empreendimentoId = selectedEmpreendimento.id;

    if (activeTab === 'galeria') {
      // Ao entrar/mudar filtro na aba galeria, sempre recarregar a categoria
      const categoriaMap = {
        'Plantas': 'plantas-humanizadas',
        'Videos': 'videos',
        'Tour virtual': 'tour-virtual',
        'Áreas de Lazer': 'areas-de-lazer',
        'Apartamento': 'apartamento'
      };
      
      const categoriaSupabase = categoriaMap[filtroGaleria] || 'apartamento';
      
      // Sempre recarregar (limpa estado anterior e busca novamente)
      if (!loadingGaleria) {
        // Limpar estado anterior antes de carregar
        setGaleriaImagensSupabase(prev => {
          const novo = { ...prev };
          if (novo[empreendimentoId]) {
            novo[empreendimentoId] = {};
          }
          return novo;
        });
        fetchGaleriaImagens(empreendimentoId, categoriaSupabase);
      }
    } else {
      // Ao sair da aba galeria, limpar completamente as imagens da memória
      setGaleriaImagensSupabase(prev => {
        const novo = { ...prev };
        delete novo[empreendimentoId];
        return novo;
      });
      setLoadingGaleria(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filtroGaleria, selectedEmpreendimento?.id]);

  // Fechar lightbox com tecla ESC e navegação por setas
  useEffect(() => {
    const handleKeyboard = (e) => {
      if (showImageLightbox && selectedEmpreendimento) {
        // Mesma lógica do lightbox: combinar todas as imagens
        const galeriaEmpreendimento = galeriaImagensSupabase[selectedEmpreendimento.id] || {};
        const todasImagensSupabase = Object.values(galeriaEmpreendimento).flat();
        const imagensJSON = selectedEmpreendimento.galeriaImagens || [];
        const todasImagens = [...todasImagensSupabase, ...imagensJSON];
        
        const imagemPrincipal = selectedEmpreendimento.imagem;
        const images = imagemPrincipal 
          ? [imagemPrincipal, ...todasImagens.filter(img => img !== imagemPrincipal)]
          : (todasImagens.length > 0 ? todasImagens : []);
        
        if (e.key === 'Escape') {
          setShowImageLightbox(false);
        } else if (e.key === 'ArrowLeft' && images.length > 1) {
          setLightboxImageIndex((lightboxImageIndex - 1 + images.length) % images.length);
        } else if (e.key === 'ArrowRight' && images.length > 1) {
          setLightboxImageIndex((lightboxImageIndex + 1) % images.length);
        }
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [showImageLightbox, lightboxImageIndex, selectedEmpreendimento, galeriaImagensSupabase]);

  // Função para buscar imagens da galeria do Supabase (apenas categoria específica para melhor performance)
  const fetchGaleriaImagens = async (empreendimentoId, categoriaEspecifica = null) => {
    try {
      setLoadingGaleria(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('Supabase client não disponível');
        setLoadingGaleria(false);
        return;
      }

      // Não verificar cache - sempre recarregar para manter dados atualizados

      const categorias = categoriaEspecifica 
        ? [categoriaEspecifica] 
        : ['plantas-humanizadas', 'apartamento', 'videos', 'areas-de-lazer', 'tour-virtual'];
      
      // Buscar todas as categorias em paralelo para melhor performance
      const promises = categorias.map(async (categoria) => {
        const path = `${empreendimentoId}/${categoria}/`;
        
        const { data, error } = await supabase.storage
          .from('galeria-empreendimentos')
          .list(path, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) {
          return { categoria, urls: [] };
        }

        if (!data || data.length === 0) {
          return { categoria, urls: [] };
        }

        // Gerar URLs públicas para cada arquivo
        const urls = data
          .filter(file => file.name && !file.name.startsWith('.'))
          .map((file) => {
            const filePath = `${empreendimentoId}/${categoria}/${file.name}`;
            const { data: urlData } = supabase.storage
              .from('galeria-empreendimentos')
              .getPublicUrl(filePath);
            return urlData?.publicUrl || null;
          })
          .filter(url => url);

        return { categoria, urls };
      });

      // Aguardar todas as requisições em paralelo
      const results = await Promise.all(promises);
      
      // Construir objeto de imagens por categoria
      setGaleriaImagensSupabase(prev => {
        const imagensPorCategoria = { ...(prev[empreendimentoId] || {}) };
        results.forEach(({ categoria, urls }) => {
          imagensPorCategoria[categoria] = urls;
        });
        return {
          ...prev,
          [empreendimentoId]: imagensPorCategoria
        };
      });
      
      setLoadingGaleria(false);
    } catch (err) {
      console.error('Erro ao buscar galeria do Supabase:', err);
      setLoadingGaleria(false);
    }
  };

  // Função para buscar unidades do empreendimento
  const fetchUnidades = async (empreendimentoId) => {
    try {
      setLoadingUnidades(true);
      const config = await import('../config');
      const response = await fetch(`${config.default.API_BASE_URL}/empreendimentos-public/${empreendimentoId}/unidades`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar unidades');
      }
      
      const data = await response.json();
      setListaUnidades(data || []);
      setLoadingUnidades(false);
    } catch (err) {
      console.error('Erro ao buscar unidades:', err);
      setListaUnidades([]);
      setLoadingUnidades(false);
    }
  };

  // Função para visualizar detalhes (associada ao ID real)
  const handleCardClick = async (empreendimento) => {
    setSelectedEmpreendimento(empreendimento);
    setShowModal(true);
    setActiveTab('unidades'); // Aba padrão agora é unidades
    setTipoDiferencial('unidade'); // Resetar para unidade
    setFiltroGaleria('Apartamento'); // Resetar filtro da galeria para Apartamento
    // Carregar unidades ao abrir o modal
    if (empreendimento.id) {
      fetchUnidades(empreendimento.id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEmpreendimento(null);
    setActiveTab('unidades'); // Resetar aba ao fechar
    setFiltroGaleria('Apartamento'); // Resetar filtro da galeria
    // Limpar todas as imagens da galeria da memória
    setGaleriaImagensSupabase({});
    setLoadingGaleria(false);
    setShowImageLightbox(false); // Fechar lightbox se estiver aberto
    // Limpar lista de unidades
    setListaUnidades([]);
    setLoadingUnidades(false);
  };

   // Função formatPrice removida (não mais necessária)

  // Função para gerar texto de compartilhamento
  const generateShareText = () => {
    if (!selectedUnidade || !selectedEmpreendimento) return '';

    let text = `*Unidade: ${selectedUnidade.numero || selectedUnidade.numero_unidade}*\n\n`;

    // Características
    if (shareOptions.caracteristicas) {
      if (selectedUnidade.metragem_privativa || selectedUnidade.area_privativa || selectedUnidade.metragem) {
        text += `*- Área privativa*: ${parseFloat(selectedUnidade.metragem_privativa || selectedUnidade.area_privativa || selectedUnidade.metragem).toFixed(1)} m²\n`;
      }
      if (selectedUnidade.area_total) {
        text += `*- Área total*: ${parseFloat(selectedUnidade.area_total).toFixed(2)} m²\n`;
      }
      if (selectedUnidade.dormitorios !== undefined && selectedUnidade.dormitorios !== null) {
        text += `- ${selectedUnidade.dormitorios} dormitório${selectedUnidade.dormitorios > 1 ? 's' : ''}\n`;
      }
      if (selectedUnidade.banheiros !== undefined && selectedUnidade.banheiros !== null) {
        text += `- ${selectedUnidade.banheiros} banheiro${selectedUnidade.banheiros > 1 ? 's' : ''}\n`;
      }
      if (selectedUnidade.suites !== undefined && selectedUnidade.suites !== null) {
        text += `- ${selectedUnidade.suites} suíte${selectedUnidade.suites > 1 ? 's' : ''}\n`;
      }
      if (selectedUnidade.vagas !== undefined && selectedUnidade.vagas !== null) {
        text += `- ${selectedUnidade.vagas} vaga${selectedUnidade.vagas > 1 ? 's' : ''} de garagem\n`;
      }
      text += '\n';
    }

    // Valor e condições
    if (shareOptions.valorCondicoes && selectedUnidade.valor) {
      text += `*Valor*: R$ ${parseFloat(selectedUnidade.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      // Adicionar todas as condições de pagamento se disponível
      if (selectedEmpreendimento.condicoesPagamento && selectedEmpreendimento.condicoesPagamento.length > 0) {
        text += '\n\n*Condições de Pagamento:*\n';
        
        selectedEmpreendimento.condicoesPagamento.forEach((condicao) => {
          if (!condicao.titulo) return;
          
          let condicaoTexto = `*${condicao.titulo}*`;
          
          // Adicionar valor se existir
          if (condicao.valor) {
            condicaoTexto += `: ${condicao.valor}`;
          }
          
          // Para financiamento, calcular parcelas do valor financiado
          if (condicao.titulo?.toLowerCase().includes('financiamento') && selectedUnidade.valor && condicao.valor) {
            const numParcelasMatch = condicao.detalhes?.find(d => d.includes('x'))?.match(/(\d+)x/i);
            const numParcelas = numParcelasMatch ? numParcelasMatch[1] : null;
            
            if (numParcelas && condicao.valor.includes('%')) {
              const percentualFinanciado = parseFloat(condicao.valor.replace('%', '').replace(/\s/g, ''));
              const valorFinanciado = parseFloat(selectedUnidade.valor) * (percentualFinanciado / 100);
              const valorParcela = valorFinanciado / parseFloat(numParcelas);
              condicaoTexto += ` (${numParcelas}x R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            } else if (numParcelas) {
              // Se não tiver percentual, tentar calcular baseado no valor total
              const valorTotal = parseFloat(selectedUnidade.valor);
              const valorParcela = valorTotal / parseFloat(numParcelas);
              condicaoTexto += ` (${numParcelas}x R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
            }
          }
          
          text += `${condicaoTexto}\n`;
          
          // Adicionar descrição se existir
          if (condicao.descricao) {
            text += `${condicao.descricao}\n`;
          }
          
          // Adicionar detalhes se existirem (array de detalhes)
          if (condicao.detalhes && Array.isArray(condicao.detalhes) && condicao.detalhes.length > 0) {
            condicao.detalhes.forEach(detalhe => {
              if (detalhe && !detalhe.includes('x')) { // Não repetir se já for parcela
                text += `- ${detalhe}\n`;
              }
            });
          }
          
          text += '\n';
        });
      } else {
        text += '\n\n';
      }
    }

    // Descrição do imóvel (unidade) - sempre mostrar se marcado
    if (shareOptions.descricaoImovel) {
      // Pegar diferenciais_unidade da tabela empreendimentos
      const descricaoUnidade = selectedEmpreendimento.diferenciaisUnidade;
      
      if (descricaoUnidade && descricaoUnidade.trim()) {
        text += `*Descrição unidade*: \n`;
        // Separar por linha, vírgula ou ponto e vírgula, e limpar formatação existente
        const descricaoLinhas = descricaoUnidade
          .split(/[\n,;]/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            // Remover bullets e hífens existentes no início
            return line.replace(/^[•\-\s]+/, '').trim();
          })
          .filter(line => line.length > 0);
        
        if (descricaoLinhas.length > 0) {
          descricaoLinhas.forEach(line => {
            text += `- ${line}\n`;
          });
          text += '\n';
        }
      }
      
      // Descrição do empreendimento (diferenciais gerais) - sempre mostrar se marcado
      if (selectedEmpreendimento.diferenciaisGerais && selectedEmpreendimento.diferenciaisGerais.trim()) {
        text += `*Descrição do empreendimento*: \n`;
        // Separar por linha, vírgula ou ponto e vírgula, e limpar formatação existente
        const diferenciaisLinhas = selectedEmpreendimento.diferenciaisGerais
          .split(/[\n,;]/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            // Remover bullets e hífens existentes no início
            return line.replace(/^[•\-\s]+/, '').trim();
          })
          .filter(line => line.length > 0);
        
        if (diferenciaisLinhas.length > 0) {
          diferenciaisLinhas.forEach(line => {
            text += `- ${line}\n`;
          });
          text += '\n';
        }
      }
    }

    // Catálogo do empreendimento
    if (shareOptions.catalogo && selectedEmpreendimento.catalogoUrl) {
      text += `*Catálogo do empreendimento*: ${selectedEmpreendimento.catalogoUrl}\n\n`;
    }

    // Localização
    if (shareOptions.localizacao) {
      const localizacaoParts = [];
      if (selectedEmpreendimento.endereco) localizacaoParts.push(selectedEmpreendimento.endereco);
      if (selectedEmpreendimento.bairro) localizacaoParts.push(selectedEmpreendimento.bairro);
      if (selectedEmpreendimento.cidade || selectedEmpreendimento.estado) {
        const cidadeEstado = [selectedEmpreendimento.cidade, selectedEmpreendimento.estado].filter(Boolean).join('/');
        if (cidadeEstado) localizacaoParts.push(cidadeEstado);
      }
      if (localizacaoParts.length > 0) {
        text += `${localizacaoParts.join(', ')}\n`;
      }
    }

    // Link de contra-proposta (se receber propostas estiver ativo)
    if (shareOptions.receberPropostas) {
      text += `\nDeseja fazer uma contra-proposta? Acesse o link abaixo:\n`;
      text += `https://solumn.com.br\n`;
    }

    text += '\nAtenciosamente,\n';
    // Pegar nome do corretor do usuário logado
    const nomeCorretor = user?.nome || user?.name || 'Equipe Solumn';
    text += `${nomeCorretor}\n`;

    return text;
  };

  // Função para copiar texto para clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Texto copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Função para compartilhar no WhatsApp
  const shareOnWhatsApp = (text) => {
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  // Função para obter cor do status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pronto para morar':
      case 'pronto':
        return '#10b981';
      case 'em construção':
      case 'construção':
        return '#f59e0b';
      case 'lançamento':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  // Estilos customizados para as scrollbars dos painéis
  const scrollbarStyles = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .empreendimento-left-panel-scroll::-webkit-scrollbar,
    .empreendimento-right-panel-scroll::-webkit-scrollbar {
      width: 8px;
    }
    
    .empreendimento-left-panel-scroll::-webkit-scrollbar-track,
    .empreendimento-right-panel-scroll::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    
    .empreendimento-left-panel-scroll::-webkit-scrollbar-thumb,
    .empreendimento-right-panel-scroll::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      transition: background 0.2s ease;
    }
    
    .empreendimento-left-panel-scroll::-webkit-scrollbar-thumb:hover,
    .empreendimento-right-panel-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    /* Firefox */
    .empreendimento-left-panel-scroll,
    .empreendimento-right-panel-scroll {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.2);
    }
  `;

  // Loading state
  if (loading) {
    return (
      <>
        <style>{scrollbarStyles}</style>
        <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gerenciar {t.clinicas}</h1>
            <p className="page-subtitle">Explore nossos empreendimentos</p>
          </div>
        </div>
        <div className="page-content">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            fontSize: '1.125rem',
            color: '#6b7280'
          }}>
            Carregando empreendimentos do banco...
          </div>
        </div>
      </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gerenciar {t.clinicas}</h1>
            <p className="page-subtitle">Explore nossos empreendimentos</p>
          </div>
        </div>
        <div className="page-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            gap: '1rem'
          }}>
            <div style={{ color: '#ef4444', fontSize: '1.125rem' }}>
              ❌ {error}
            </div>
            <button
              onClick={fetchEmpreendimentos}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (empreendimentos.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gerenciar {t.clinicas}</h1>
            <p className="page-subtitle">Explore nossos empreendimentos</p>
          </div>
        </div>
        <div className="page-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            gap: '1rem'
          }}>
            <div style={{ color: '#6b7280', fontSize: '1.125rem' }}>
              📋 Nenhum empreendimento encontrado no banco
            </div>
            <button
              onClick={fetchEmpreendimentos}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerenciar {t.clinicas}</h1>
          <p className="page-subtitle">Explore nossos empreendimentos</p>
        </div>
      </div>
      
      <div className="page-content">
        {/* Grid de Empreendimentos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {empreendimentos.map((empreendimento) => (
            <div
              key={empreendimento.id} // ✅ ID real do banco (4, 5, 6, 7, 8, 9)
              onClick={() => handleCardClick(empreendimento)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '1px solid #e5e7eb'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
            >
              {/* Imagem do Empreendimento */}
              <div style={{
                height: '240px',
                backgroundImage: empreendimento.imagem ? `url(${empreendimento.imagem})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                backgroundColor: '#1f2937',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px'
              }}>
                {/* Overlay escuro gradiente na parte inferior */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '100px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)'
                }} />
                
                {/* Barra de progresso da obra */}
                {empreendimento.progressoObra !== undefined && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Obra: {empreendimento.progressoObra || 0}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${empreendimento.progressoObra || 0}%`,
                        height: '100%',
                        backgroundColor: '#10b981',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Badge de status no canto superior direito */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: getStatusColor(empreendimento.status),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  {empreendimento.status || 'Status não informado'}
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div style={{ 
                padding: '1.5rem',
                backgroundColor: '#1f2937',
                color: 'white',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: 'white',
                  lineHeight: '1.3',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {empreendimento.nome || 'Nome não informado'}
                </h3>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  color: '#9ca3af',
                  fontSize: '0.875rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {empreendimento.localizacao || 'Localização não informada'}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {empreendimento.tipo || 'Tipo não informado'}
                    {(empreendimento.unidades && empreendimento.unidades > 0) && ` • ${empreendimento.unidades} unidades`}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#60a5fa',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    <span>Ver detalhes</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalhes - Layout de Dois Painéis */}
      {showModal && selectedEmpreendimento && (
        <div style={{
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
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            maxWidth: '1400px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Header do Modal */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1f2937'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ArrowLeft size={20} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedEmpreendimento.telefone && (
                  <button
                    onClick={() => {
                      // Formatar telefone para WhatsApp: remover caracteres não numéricos e adicionar código do país
                      const telefoneLimpo = selectedEmpreendimento.telefone.replace(/\D/g, '');
                      const whatsappUrl = `https://wa.me/55${telefoneLimpo}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    transition: 'all 0.2s ease'
                  }}
                  title="Abrir WhatsApp"
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.color = '#9ca3af';
                  }}
                >
                  <Phone size={18} />
                </button>
                )}
                {selectedEmpreendimento.email && (
                  <button
                    onClick={() => window.open(`mailto:${selectedEmpreendimento.email}`)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      transition: 'all 0.2s ease'
                    }}
                    title="Enviar email"
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.color = '#9ca3af';
                    }}
                  >
                    <Mail size={18} />
                  </button>
                )}
                <button
                  onClick={closeModal}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.color = '#9ca3af';
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Container Principal - Dois Painéis */}
            <div style={{
              display: 'flex',
              flex: 1,
              overflow: 'hidden'
            }}>
              {/* Painel Esquerdo - Informações Fixas */}
              <div style={{
                width: '400px',
                backgroundColor: '#1f2937',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {/* Abas de Navegação - Navbar no topo */}
                <div style={{
                  display: 'flex',
                  padding: '0.75rem',
                  gap: '0.5rem',
                  backdropFilter: 'blur(10px)'
                }}>
                  {[
                    { id: 'unidades', label: 'Unidades', icon: Home },
                    { id: 'galeria', label: 'Galeria', icon: Images },
                    { id: 'hotsite', label: 'Hotsite', icon: Globe }
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          flex: 1,
                          padding: '0.625rem 0.75rem',
                          border: isActive ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: isActive ? '#60a5fa' : '#9ca3af',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: isActive ? '600' : '500',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.2s ease',
                          boxShadow: isActive ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.color = '#d1d5db';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.color = '#9ca3af';
                          }
                        }}
                      >
                        <IconComponent size={18} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                  {/* Botão Catálogo - abre em nova aba */}
                  {selectedEmpreendimento?.catalogoUrl && (
                    <a
                      href={selectedEmpreendimento.catalogoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        padding: '0.625rem 0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s ease',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.color = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.color = '#9ca3af';
                      }}
                    >
                      <BookOpen size={18} strokeWidth={2} />
                      <span>Catálogo</span>
                    </a>
                  )}
                </div>

                {/* Informações do Empreendimento */}
                <div 
                  className="empreendimento-left-panel-scroll"
                  style={{
                    padding: '1.5rem',
                    flex: 1,
                    overflowY: 'auto'
                  }}>
                  <h2 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {selectedEmpreendimento.nome || 'Nome não informado'}
                  </h2>

                  {/* Imagem do Empreendimento */}
                  {selectedEmpreendimento.imagem && (
                    <div 
                      style={{
                        marginBottom: '1.5rem',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        height: '200px',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => {
                        // Abrir lightbox apenas com a imagem principal
                        setLightboxImageIndex(0);
                        setShowImageLightbox(true);
                      }}
                      onMouseEnter={(e) => {
                        const container = e.currentTarget;
                        const overlay = container.querySelector('.image-overlay');
                        const img = container.querySelector('img');
                        if (overlay) overlay.style.opacity = '1';
                        if (img) img.style.opacity = '0.7';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.currentTarget;
                        const overlay = container.querySelector('.image-overlay');
                        const img = container.querySelector('img');
                        if (overlay) overlay.style.opacity = '0';
                        if (img) img.style.opacity = '1';
                      }}
                    >
                      <img
                        src={selectedEmpreendimento.imagem}
                        alt={selectedEmpreendimento.nome}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'opacity 0.3s ease'
                        }}
                      />
                      {/* Overlay com texto e ícone */}
                      <div 
                        className="image-overlay"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                          pointerEvents: 'none'
                        }}
                      >
                        <Maximize2 size={32} color="white" />
                        <span style={{
                          color: 'white',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          textAlign: 'center'
                        }}>
                          Clique para ver em tela cheia
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Localização */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    color: '#9ca3af',
                    fontSize: '0.875rem'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div>
                      {selectedEmpreendimento.endereco && <div>{selectedEmpreendimento.endereco}</div>}
                      {selectedEmpreendimento.bairro && <div>{selectedEmpreendimento.bairro}</div>}
                      <div>{selectedEmpreendimento.localizacao || 'Localização não informada'}</div>
                    </div>
                  </div>

                  {/* Datas da Obra */}
                  {(selectedEmpreendimento.dataInicioObra || selectedEmpreendimento.dataEntrega) && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      {selectedEmpreendimento.dataInicioObra && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>Início da obra: {(() => {
                            const date = new Date(selectedEmpreendimento.dataInicioObra);
                            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                          })()}</span>
                        {selectedEmpreendimento.dataEntrega && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#9ca3af',
                            fontSize: '0.875rem'
                          }}>
                            <span>Data de entrega: {(() => {
                              const date = new Date(selectedEmpreendimento.dataEntrega);
                              return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            })()}</span>
                          </div>
                        )}
                        </div>
                      )}
                      
                    </div>
                  )}

                  {/* Progresso da Obra */}
                  {selectedEmpreendimento.progressoObra !== undefined && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                          {selectedEmpreendimento.progressoObra || 0}% concluído
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${selectedEmpreendimento.progressoObra || 0}%`,
                          height: '100%',
                          backgroundColor: '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Características */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      <Bed size={20} />
                      <span>3 Dorm.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      <BedDouble size={20} />
                      <span>1 Suites</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      <Car size={20} />
                      <span>2 Vagas</span>
                    </div>
                  </div>

                  {/* Valor Condomínio */}
                  {selectedEmpreendimento.valorCondominio && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      color: '#9ca3af',
                      fontSize: '0.875rem'
                    }}>
                      <span>R$ {parseFloat(selectedEmpreendimento.valorCondominio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Condomínio</span>
                      {/* Valor IPTU */}
                      {selectedEmpreendimento.valorIptu && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1.5rem',
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          <span>R$ {parseFloat(selectedEmpreendimento.valorIptu).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} IPTU</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observações/Descrição */}
                  {selectedEmpreendimento.descricao && (
                    <div style={{
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <h3 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#9ca3af',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Sobre o Empreendimento
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#d1d5db',
                        lineHeight: '1.6',
                        margin: 0,
                        whiteSpace: 'pre-line'
                      }}>
                        {selectedEmpreendimento.descricao}
                      </p>
                    </div>
                  )}

                  {/* Diferenciais com Toggle */}
                  {(selectedEmpreendimento.diferenciaisUnidade || selectedEmpreendimento.diferenciaisGerais) && (
                    <div style={{
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {/* Botões de alternância */}
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '1rem'
                      }}>
                        {selectedEmpreendimento.diferenciaisUnidade && (
                          <button
                            onClick={() => setTipoDiferencial('unidade')}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '6px',
                              backgroundColor: tipoDiferencial === 'unidade' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                              color: tipoDiferencial === 'unidade' ? '#60a5fa' : '#9ca3af',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: tipoDiferencial === 'unidade' ? '600' : '400',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Diferenciais do Imóvel
                          </button>
                        )}
                        {selectedEmpreendimento.diferenciaisGerais && (
                          <button
                            onClick={() => setTipoDiferencial('gerais')}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '6px',
                              backgroundColor: tipoDiferencial === 'gerais' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                              color: tipoDiferencial === 'gerais' ? '#60a5fa' : '#9ca3af',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: tipoDiferencial === 'gerais' ? '600' : '400',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            Diferenciais Gerais
                          </button>
                        )}
                      </div>
                      {/* Conteúdo dos diferenciais */}
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#d1d5db',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-line'
                      }}>
                        {tipoDiferencial === 'unidade' && selectedEmpreendimento.diferenciaisUnidade
                          ? selectedEmpreendimento.diferenciaisUnidade
                          : selectedEmpreendimento.diferenciaisGerais}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Painel Direito - Conteúdo das Abas */}
              <div style={{
                flex: 1,
                backgroundColor: '#1f2937',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div 
                  className="empreendimento-right-panel-scroll"
                  style={{
                    padding: '1.5rem',
                    flex: 1,
                    overflowY: 'auto',
                    color: 'white'
                  }}>
              {/* Aba: Informações */}
              {activeTab === 'informacoes' && (
                <div>
                  {/* Imagem do Empreendimento */}
                  {selectedEmpreendimento.imagem && (
                    <div style={{
                      position: 'relative',
                      height: '300px',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      overflow: 'hidden',
                      backgroundColor: '#f3f4f6',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // Se tiver galeria, começar pela primeira imagem da galeria
                      if (selectedEmpreendimento.galeriaImagens && selectedEmpreendimento.galeriaImagens.length > 0) {
                        setLightboxImageIndex(0);
                      } else {
                        setLightboxImageIndex(0); // Imagem principal
                      }
                      setShowImageLightbox(true);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.95';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    >
                      <img
                        src={selectedEmpreendimento.imagem}
                        alt={selectedEmpreendimento.nome}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                      {/* Overlay com botão de ampliar */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0';
                      }}
                      >
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          padding: '0.75rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          fontWeight: '500',
                          color: '#1f2937',
                          fontSize: '0.875rem'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                          </svg>
                          Ver foto completa
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Localização Completa */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      marginBottom: '0.75rem',
                      color: '#1f2937'
                    }}>
                      Localização
                    </h3>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      lineHeight: '1.6'
                    }}>
                      {selectedEmpreendimento.endereco && (
                        <div style={{ marginBottom: '0.5rem', color: '#374151' }}>
                          <strong>Endereço:</strong> {selectedEmpreendimento.endereco}
                        </div>
                      )}
                      {selectedEmpreendimento.bairro && (
                        <div style={{ marginBottom: '0.5rem', color: '#374151' }}>
                          <strong>Bairro:</strong> {selectedEmpreendimento.bairro}
                        </div>
                      )}
                      <div style={{ color: '#374151' }}>
                        <strong>Cidade/Estado:</strong> {selectedEmpreendimento.localizacao || 'Não informado'}
                      </div>
                    </div>
                  </div>

                  {/* Informações Básicas */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Tipo
                        </div>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {selectedEmpreendimento.tipo || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Unidades
                        </div>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {selectedEmpreendimento.unidades || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Status
                        </div>
                        <div style={{
                          fontWeight: '500',
                          color: getStatusColor(selectedEmpreendimento.status),
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          backgroundColor: `${getStatusColor(selectedEmpreendimento.status)}20`,
                          fontSize: '0.875rem'
                        }}>
                          {selectedEmpreendimento.status || 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  {selectedEmpreendimento.descricao && (
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#1f2937'
                      }}>
                        Descrição
                      </h3>
                      <p style={{
                        color: '#6b7280',
                        lineHeight: '1.6',
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        {selectedEmpreendimento.descricao}
                      </p>
                    </div>
                  )}
                  {!selectedEmpreendimento.descricao && (
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#1f2937'
                      }}>
                        Descrição
                      </h3>
                      <p style={{
                        color: '#9ca3af',
                        fontStyle: 'italic',
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        Descrição não disponível
                      </p>
                    </div>
                  )}
                </div>
              )}

                  {/* Aba: Galeria */}
                  {activeTab === 'galeria' && (
                    <div>
                      {/* Loading state */}
                      {loadingGaleria && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '3rem 1rem',
                          color: '#9ca3af'
                        }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid rgba(255, 255, 255, 0.1)',
                            borderTop: '4px solid #60a5fa',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '1rem'
                          }} />
                          <p style={{ fontSize: '0.875rem', margin: 0 }}>
                            Carregando imagens...
                          </p>
                        </div>
                      )}

                      {/* Filtros da Galeria */}
                      {!loadingGaleria && (
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          marginBottom: '1.5rem',
                          flexWrap: 'wrap'
                        }}>
                        {['Apartamento', 'Áreas de Lazer', 'Plantas', 'Videos', 'Tour virtual'].map((filtro) => (
                          <button
                            key={filtro}
                            onClick={() => setFiltroGaleria(filtro)}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '6px',
                              backgroundColor: filtroGaleria === filtro ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                              color: filtroGaleria === filtro ? '#60a5fa' : '#9ca3af',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (filtroGaleria !== filtro) {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (filtroGaleria !== filtro) {
                                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                              }
                            }}
                          >
                            {filtro}
                          </button>
                        ))}
                      </div>
                      )}

                      {/* Conteúdo baseado no filtro selecionado */}
                      {!loadingGaleria && (() => {
                        // Mapear filtros para categorias do Supabase
                        const categoriaMap = {
                          'Plantas': 'plantas-humanizadas',
                          'Videos': 'videos',
                          'Tour virtual': 'tour-virtual',
                          'Áreas de Lazer': 'areas-de-lazer',
                          'Apartamento': 'apartamento'
                        };
                        
                        const categoria = categoriaMap[filtroGaleria];
                        const galeriaEmpreendimento = galeriaImagensSupabase[selectedEmpreendimento.id] || {};
                        const imagens = categoria ? (galeriaEmpreendimento[categoria] || []) : [];
                        
                        // Se houver imagens, renderizar grid
                        if (imagens.length > 0) {
                          return (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                              gap: '0.75rem'
                            }}>
                              {imagens.map((imgUrl, index) => (
                                <div
                                  key={index}
                                  onClick={() => {
                                    setLightboxImageIndex(index);
                                    setShowImageLightbox(true);
                                  }}
                                  style={{
                                    position: 'relative',
                                    aspectRatio: '1',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    backgroundColor: '#f3f4f6',
                                    transition: 'transform 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Imagem ${index + 1} de ${selectedEmpreendimento.nome}`}
                                    loading="lazy"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                        // Se não houver imagens e for um filtro que usa essa lógica geral (Apartamento ou Áreas de Lazer)
                        if (filtroGaleria === 'Apartamento' || filtroGaleria === 'Áreas de Lazer') {
                          return (
                            <div style={{
                              textAlign: 'center',
                              padding: '3rem 1rem',
                              color: '#9ca3af'
                            }}>
                              <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                                {filtroGaleria === 'Apartamento' 
                                  ? 'Imagens de apartamento não disponíveis para este empreendimento'
                                  : 'Áreas de lazer não disponíveis para este empreendimento'}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {filtroGaleria === 'Plantas' && (
                        <div>
                          {(() => {
                            // Primeiro tentar imagens do Supabase, depois URL do banco
                            const galeriaEmpreendimento = galeriaImagensSupabase[selectedEmpreendimento.id] || {};
                            const plantasSupabase = galeriaEmpreendimento['plantas-humanizadas'] || [];
                            
                            if (plantasSupabase.length > 0) {
                              return (
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                  gap: '0.75rem'
                                }}>
                                  {plantasSupabase.map((imgUrl, index) => (
                                    <div
                                      key={index}
                                      onClick={() => {
                                        // Calcular índice considerando todas as imagens
                                        const todasImagens = [...plantasSupabase];
                                        const indexGlobal = todasImagens.indexOf(imgUrl);
                                        setLightboxImageIndex(indexGlobal);
                                        setShowImageLightbox(true);
                                      }}
                                      style={{
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        backgroundColor: '#f3f4f6',
                                        transition: 'transform 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                    >
                                      <img
                                        src={imgUrl}
                                        alt={`Planta ${index + 1} de ${selectedEmpreendimento.nome}`}
                                        loading="lazy"
                                        style={{
                                          width: '100%',
                                          height: 'auto',
                                          display: 'block'
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            } else if (selectedEmpreendimento.plantaUrl) {
                              return (
                                <div style={{
                                  width: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  backgroundColor: '#f9fafb',
                                  borderRadius: '8px',
                                  padding: '1rem',
                                  minHeight: '400px'
                                }}>
                                  <img
                                    src={selectedEmpreendimento.plantaUrl}
                                    alt={`Planta de ${selectedEmpreendimento.nome}`}
                                    loading="lazy"
                                    style={{
                                      maxWidth: '100%',
                                      height: 'auto',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                    }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              );
                            }
                            return (
                              <div style={{
                                textAlign: 'center',
                                padding: '3rem 1rem',
                                color: '#9ca3af'
                              }}>
                                <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                                  Planta não disponível para este empreendimento
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {filtroGaleria === 'Videos' && (
                        <div>
                          {(() => {
                            const galeriaEmpreendimento = galeriaImagensSupabase[selectedEmpreendimento.id] || {};
                            const videos = galeriaEmpreendimento['videos'] || [];
                            
                            if (videos.length > 0) {
                              return (
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                  gap: '1rem'
                                }}>
                                  {videos.map((videoUrl, index) => (
                                    <div
                                      key={index}
                                      style={{
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        backgroundColor: '#1f2937'
                                      }}
                                    >
                                      <video
                                        src={videoUrl}
                                        controls
                                        style={{
                                          width: '100%',
                                          height: 'auto',
                                          display: 'block'
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <div style={{
                                textAlign: 'center',
                                padding: '3rem 1rem',
                                color: '#9ca3af'
                              }}>
                                <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                                  Vídeos não disponíveis para este empreendimento
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {filtroGaleria === 'Tour virtual' && (
                        <div>
                          {(() => {
                            // Primeiro tentar imagens do Supabase, depois URL do banco
                            const galeriaEmpreendimento = galeriaImagensSupabase[selectedEmpreendimento.id] || {};
                            const tourSupabase = galeriaEmpreendimento['tour-virtual'] || [];
                            
                            if (tourSupabase.length > 0) {
                              // Mostrar como imagens clicáveis
                              return (
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                  gap: '0.75rem'
                                }}>
                                  {tourSupabase.map((imgUrl, index) => (
                                    <div
                                      key={index}
                                      onClick={() => {
                                        const todasImagens = [...tourSupabase];
                                        const indexGlobal = todasImagens.indexOf(imgUrl);
                                        setLightboxImageIndex(indexGlobal);
                                        setShowImageLightbox(true);
                                      }}
                                      style={{
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        backgroundColor: '#f3f4f6',
                                        transition: 'transform 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                    >
                                      <img
                                        src={imgUrl}
                                        alt={`Tour Virtual ${index + 1} de ${selectedEmpreendimento.nome}`}
                                        loading="lazy"
                                        style={{
                                          width: '100%',
                                          height: 'auto',
                                          display: 'block'
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            } else if (selectedEmpreendimento.tourVirtualUrl) {
                              // Fallback para URL do banco
                              return (
                                <div style={{
                                  width: '100%',
                                  height: '600px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  backgroundColor: '#1f2937'
                                }}>
                                  <iframe
                                    src={selectedEmpreendimento.tourVirtualUrl}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      border: 'none'
                                    }}
                                    title="Tour Virtual"
                                    allowFullScreen
                                  />
                                </div>
                              );
                            }
                            return (
                              <div style={{
                                textAlign: 'center',
                                padding: '3rem 1rem',
                                color: '#9ca3af'
                              }}>
                                <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                                  Tour virtual não disponível para este empreendimento
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}


                    </div>
                  )}

                  {/* Aba: Unidades */}
                  {activeTab === 'unidades' && (
                    <div>
                      {/* Resumo de Disponibilidade */}
                      <div style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981'
                          }} />
                          <span style={{ fontSize: '1rem', color: '#10b981', fontWeight: '700' }}>
                            {selectedEmpreendimento.unidades || 0} UNIDADES DISPONÍVEIS
                          </span>
                        </div>
                        
                        {selectedEmpreendimento.dataUltimaAtualizacao && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#9ca3af'
                          }}>
                            <span>
                              Última atualização: {new Date(selectedEmpreendimento.dataUltimaAtualizacao).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}

                        {/* Informações adicionais do empreendimento */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem',
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {selectedEmpreendimento.valorCondominio && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                Condomínio
                              </div>
                              <div style={{ fontSize: '1rem', color: 'white', fontWeight: '600' }}>
                                R$ {parseFloat(selectedEmpreendimento.valorCondominio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                          {selectedEmpreendimento.valorIptu && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                IPTU
                              </div>
                              <div style={{ fontSize: '1rem', color: 'white', fontWeight: '600' }}>
                                R$ {parseFloat(selectedEmpreendimento.valorIptu).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          )}
                          {selectedEmpreendimento.dataEntrega && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                Previsão de Entrega
                              </div>
                              <div style={{ fontSize: '1rem', color: 'white', fontWeight: '600' }}>
                                {(() => {
                                  const date = new Date(selectedEmpreendimento.dataEntrega);
                                  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informações sobre o empreendimento */}
                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          color: 'white',
                          marginBottom: '1rem'
                        }}>
                          Informações do Empreendimento
                        </h3>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Tipo</span>
                            <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                              {selectedEmpreendimento.tipo || 'Não informado'}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Total de Unidades</span>
                            <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                              {selectedEmpreendimento.unidades || 0}
                            </span>
                          </div>
                          {selectedEmpreendimento.dataInicioObra && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingBottom: '0.75rem',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Início da Obra</span>
                              <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                                {(() => {
                                  const date = new Date(selectedEmpreendimento.dataInicioObra);
                                  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                })()}
                              </span>
                            </div>
                          )}
                          {selectedEmpreendimento.progressoObra !== undefined && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              paddingTop: '0.75rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Progresso da Obra</span>
                                <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                                  {selectedEmpreendimento.progressoObra || 0}%
                                </span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${selectedEmpreendimento.progressoObra || 0}%`,
                                  height: '100%',
                                  backgroundColor: '#10b981',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lista de Unidades */}
                      {(() => {
                        // Agrupar unidades por tipo/torre
                        const unidadesPorTipo = {};
                        listaUnidades.forEach(unidade => {
                          const tipo = unidade.tipo_unidade || unidade.torre || 'Geral';
                          const chave = tipo;
                          if (!unidadesPorTipo[chave]) {
                            unidadesPorTipo[chave] = [];
                          }
                          unidadesPorTipo[chave].push(unidade);
                        });

                        const tipos = Object.keys(unidadesPorTipo);

                        if (loadingUnidades) {
                          return (
                            <div style={{
                              padding: '2rem',
                              textAlign: 'center',
                              color: '#9ca3af'
                            }}>
                              Carregando unidades...
                            </div>
                          );
                        }

                        if (tipos.length === 0) {
                          return null;
                        }

                        return (
                          <div style={{ marginTop: '2rem' }}>
                            {tipos.map((tipo, tipoIndex) => {
                              const unidades = unidadesPorTipo[tipo];
                              const tipoLabel = tipo !== 'Geral' ? `${selectedEmpreendimento.nome} - ${tipo}` : selectedEmpreendimento.nome;
                              
                              return (
                                <div key={tipoIndex} style={{ marginBottom: '2rem' }}>
                                  {/* Título do Tipo */}
                                  <h3 style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: 'white',
                                    marginBottom: '0.75rem'
                                  }}>
                                    {tipoLabel}
                                  </h3>

                                  {/* Header da Tabela */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1.5fr 1.5fr',
                                    gap: '1rem',
                                    padding: '0.75rem 1rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    marginBottom: '0.5rem'
                                  }}>
                                    <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '600' }}>
                                      Unidade
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '600' }}>
                                      Metragem (Privativo)
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '600' }}>
                                      Valor
                                    </div>
                                  </div>

                                  {/* Lista de Unidades */}
                                  {unidades.map((unidade, index) => {
                                    const status = unidade.status?.toLowerCase() || 'disponivel';
                                    const isVendido = status === 'vendido' || status === 'vendida';
                                    const isReservado = status === 'reservado' || status === 'reservada';
                                    const isDisponivel = !isVendido && !isReservado;
                                    
                                    // Formatar valor
                                    const valorFormatado = unidade.valor 
                                      ? `R$ ${parseFloat(unidade.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                      : 'N/A';
                                    
                                    // Formatar metragem
                                    const metragemFormatada = unidade.metragem_privativa || unidade.area_privativa || unidade.metragem
                                      ? `${parseFloat(unidade.metragem_privativa || unidade.area_privativa || unidade.metragem).toFixed(2)} m²`
                                      : 'N/A';

                                    return (
                                      <div
                                        key={unidade.id || index}
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1.5fr 1.5fr',
                                          gap: '1rem',
                                          padding: '0.75rem 1rem',
                                          backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                                          borderRadius: '8px',
                                          marginBottom: '0.5rem',
                                          alignItems: 'center'
                                        }}
                                      >
                                        {/* Número da Unidade */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
                                            {unidade.numero || unidade.numero_unidade || 'N/A'}
                                          </span>
                                          {(unidade.tipo_unidade || unidade.torre) && tipo === 'Geral' && (
                                            <span style={{
                                              padding: '0.125rem 0.5rem',
                                              borderRadius: '4px',
                                              backgroundColor: '#10b981',
                                              color: 'white',
                                              fontSize: '0.75rem',
                                              fontWeight: '500'
                                            }}>
                                              {unidade.tipo_unidade || unidade.torre}
                                            </span>
                                          )}
                                        </div>

                                        {/* Metragem */}
                                        <div style={{ fontSize: '0.875rem', color: '#d1d5db' }}>
                                          {metragemFormatada}
                                        </div>

                                        {/* Valor/Status */}
                                        <div>
                                          {isVendido ? (
                                            <div style={{
                                              display: 'inline-block',
                                              padding: '0.375rem 0.75rem',
                                              borderRadius: '6px',
                                              backgroundColor: '#374151',
                                              color: 'white',
                                              fontSize: '0.875rem',
                                              fontWeight: '500'
                                            }}>
                                              Vendido
                                            </div>
                                          ) : isReservado ? (
                                            <div style={{
                                              display: 'inline-block',
                                              padding: '0.375rem 0.75rem',
                                              borderRadius: '6px',
                                              backgroundColor: '#f59e0b',
                                              color: 'white',
                                              fontSize: '0.875rem',
                                              fontWeight: '500'
                                            }}>
                                              Reservado
                                            </div>
                                          ) : (
                                            <div 
                                              style={{
                                                display: 'inline-block',
                                                padding: '0.375rem 0.75rem',
                                                borderRadius: '6px',
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                fontSize: '0.875rem',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                              }}
                                              onClick={() => {
                                                setSelectedUnidade(unidade);
                                                setShowUnidadeModal(true);
                                              }}
                                              onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#059669';
                                                e.target.style.transform = 'scale(1.05)';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = '#10b981';
                                                e.target.style.transform = 'scale(1)';
                                              }}
                                            >
                                              {valorFormatado}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Aba: Hotsite */}
                  {activeTab === 'hotsite' && (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                        Hotsite será implementado em breve
                      </p>
                      {selectedEmpreendimento.tourVirtualUrl && (
                        <a
                          href={selectedEmpreendimento.tourVirtualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '1rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: '500'
                          }}
                        >
                          Ver Tour Virtual
                        </a>
                      )}
                    </div>
                  )}


                  {/* Aba: Simulador Caixa */}
                  {activeTab === 'simulador' && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {selectedEmpreendimento.simuladorCaixaUrl ? (
                        <iframe
                          src={selectedEmpreendimento.simuladorCaixaUrl}
                          style={{
                            width: '100%',
                            flex: 1,
                            minHeight: '600px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)'
                          }}
                          title="Simulador Caixa"
                          allowFullScreen
                        />
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          padding: '3rem 1rem',
                          color: '#9ca3af'
                        }}>
                          <p style={{ fontSize: '1rem', margin: 0, color: '#9ca3af' }}>
                            Simulador Caixa não disponível para este empreendimento
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aba: Progresso Obra (antiga - manter por compatibilidade mas não mostrar nas abas) */}
                  {activeTab === 'progresso-obra' && (
                <div>
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        margin: 0,
                        color: '#1f2937'
                      }}>
                        Progresso da Obra
                      </h3>
                      <span style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#3b82f6'
                      }}>
                        {selectedEmpreendimento.progressoObra || 0}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '24px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${selectedEmpreendimento.progressoObra || 0}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease',
                        borderRadius: '12px'
                      }} />
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                  }}>
                    {selectedEmpreendimento.dataInicioObra && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Início da Obra
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {(() => {
                            const date = new Date(selectedEmpreendimento.dataInicioObra);
                            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                          })()}
                        </div>
                      </div>
                    )}
                    {selectedEmpreendimento.dataEntrega && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Previsão de Entrega
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {(() => {
                            const date = new Date(selectedEmpreendimento.dataEntrega);
                            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                          })()}
                        </div>
                        {selectedEmpreendimento.dataEntrega && (() => {
                          const hoje = new Date();
                          const entrega = new Date(selectedEmpreendimento.dataEntrega);
                          const diffTime = entrega - hoje;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {diffDays} dias restantes
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {selectedEmpreendimento.valorCondominio && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Condomínio
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          R$ {parseFloat(selectedEmpreendimento.valorCondominio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}
                    {selectedEmpreendimento.valorIptu && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          IPTU
                        </div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          R$ {parseFloat(selectedEmpreendimento.valorIptu).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedEmpreendimento.dataUltimaAtualizacao && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}>
                      Última atualização: {new Date(selectedEmpreendimento.dataUltimaAtualizacao).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Diferenciais */}
              {activeTab === 'diferenciais' && (
                <div>
                  {selectedEmpreendimento.diferenciaisGerais ? (
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        color: '#1f2937'
                      }}>
                        Diferenciais do Empreendimento
                      </h3>
                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        lineHeight: '1.8',
                        color: '#374151',
                        whiteSpace: 'pre-line'
                      }}>
                        {selectedEmpreendimento.diferenciaisGerais}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Diferenciais não informados para este empreendimento
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Planta */}
              {activeTab === 'planta' && (
                <div>
                  {selectedEmpreendimento.plantaUrl ? (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '1rem',
                      minHeight: '400px'
                    }}>
                      <img
                        src={selectedEmpreendimento.plantaUrl}
                        alt={`Planta de ${selectedEmpreendimento.nome}`}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div style={{
                        display: 'none',
                        textAlign: 'center',
                        color: '#9ca3af',
                        padding: '2rem'
                      }}>
                        <p>Erro ao carregar a imagem da planta</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Planta não disponível para este empreendimento
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Planta Humanizada */}
              {activeTab === 'planta-humanizada' && (
                <div>
                  {selectedEmpreendimento.plantaHumanizadaUrl ? (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '1rem',
                      minHeight: '400px'
                    }}>
                      <img
                        src={selectedEmpreendimento.plantaHumanizadaUrl}
                        alt={`Planta humanizada de ${selectedEmpreendimento.nome}`}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div style={{
                        display: 'none',
                        textAlign: 'center',
                        color: '#9ca3af',
                        padding: '2rem'
                      }}>
                        <p>Erro ao carregar a imagem da planta humanizada</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Planta humanizada não disponível para este empreendimento
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Condições de Pagamento */}
              {activeTab === 'condicoes-pagamento' && (
                <div>
                  {selectedEmpreendimento.condicoesPagamento && 
                   Array.isArray(selectedEmpreendimento.condicoesPagamento) && 
                   selectedEmpreendimento.condicoesPagamento.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1.5rem'
                    }}>
                      {selectedEmpreendimento.condicoesPagamento.map((condicao, index) => (
                        <div
                          key={index}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Ícone/Badge */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              backgroundColor: '#3b82f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '1rem',
                              flexShrink: 0
                            }}>
                              {index + 1}
                            </div>
                            {condicao.titulo && (
                              <h3 style={{
                                margin: 0,
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#1f2937'
                              }}>
                                {condicao.titulo}
                              </h3>
                            )}
                          </div>

                          {/* Valor destacado */}
                          {condicao.valor && (
                            <div style={{
                              marginBottom: '0.75rem',
                              padding: '0.75rem',
                              backgroundColor: '#eff6ff',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#3b82f6',
                                lineHeight: '1.2'
                              }}>
                                {condicao.valor}
                              </div>
                            </div>
                          )}

                          {/* Descrição */}
                          {condicao.descricao && (
                            <p style={{
                              margin: 0,
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              lineHeight: '1.6'
                            }}>
                              {condicao.descricao}
                            </p>
                          )}

                          {/* Campos adicionais (se houver) */}
                          {condicao.detalhes && Array.isArray(condicao.detalhes) && condicao.detalhes.length > 0 && (
                            <div style={{
                              marginTop: '1rem',
                              paddingTop: '1rem',
                              borderTop: '1px solid #e5e7eb'
                            }}>
                              <ul style={{
                                margin: 0,
                                paddingLeft: '1.25rem',
                                listStyle: 'disc',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                              }}>
                                {condicao.detalhes.map((detalhe, idx) => (
                                  <li key={idx} style={{ marginBottom: '0.5rem' }}>
                                    {detalhe}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#9ca3af'
                    }}>
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        style={{ margin: '0 auto 1rem', opacity: 0.5 }}
                      >
                        <path d="M12 2v20M2 12h20" strokeLinecap="round" />
                      </svg>
                      <p style={{ fontSize: '1rem', margin: 0 }}>
                        Condições de pagamento não disponíveis para este empreendimento
                      </p>
                    </div>
                  )}
                </div>
              )}
                </div>
              </div>
            </div>

            {/* Footer do Modal com Botões de Ação */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              backgroundColor: '#1f2937'
            }}>
              {selectedEmpreendimento.simuladorCaixaUrl && (
                <button
                  onClick={() => setActiveTab('simulador')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.color = '#9ca3af';
                  }}
                >
                  <Calculator size={16} />
                  <span>Simulador Caixa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para foto completa - suporta galeria */}
      {showImageLightbox && selectedEmpreendimento && (() => {
        // Combinar imagens do Supabase e JSON para o lightbox
        const galeriaEmpreendimento = galeriaImagensSupabase[selectedEmpreendimento.id] || {};
        const todasImagensSupabase = Object.values(galeriaEmpreendimento).flat();
        const imagensJSON = selectedEmpreendimento.galeriaImagens || [];
        const todasImagens = [...todasImagensSupabase, ...imagensJSON];
        
        // Se houver imagem principal, colocar ela no início (prioridade)
        const imagemPrincipal = selectedEmpreendimento.imagem;
        const images = imagemPrincipal 
          ? [imagemPrincipal, ...todasImagens.filter(img => img !== imagemPrincipal)]
          : (todasImagens.length > 0 ? todasImagens : []);
        const currentIndex = lightboxImageIndex >= 0 && lightboxImageIndex < images.length ? lightboxImageIndex : 0;
        const currentImage = images[currentIndex];
        
        return currentImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '2rem'
          }}
          onClick={() => setShowImageLightbox(false)}
        >
          {/* Botão fechar */}
          <button
            onClick={() => setShowImageLightbox(false)}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: '#1f2937',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              zIndex: 2001,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
              e.target.style.transform = 'scale(1)';
            }}
            >
              <X size={24} />
            </button>

          {/* Botões de navegação (se houver múltiplas imagens) */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = (lightboxImageIndex - 1 + images.length) % images.length;
                  setLightboxImageIndex(newIndex);
                }}
                style={{
                  position: 'absolute',
                  left: '2rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#1f2937',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  zIndex: 2001,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  e.target.style.transform = 'translateY(-50%) scale(1)';
                }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = (lightboxImageIndex + 1) % images.length;
                  setLightboxImageIndex(newIndex);
                }}
                style={{
                  position: 'absolute',
                  right: '2rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#1f2937',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  zIndex: 2001,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                  e.target.style.transform = 'translateY(-50%) scale(1)';
                }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Imagem ampliada */}
          <div
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={selectedEmpreendimento.nome}
              style={{
                maxWidth: '100%',
                maxHeight: '95vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            />
          </div>

          {/* Nome do empreendimento e contador no rodapé */}
          <div
            style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              color: '#1f2937',
              fontSize: '1rem',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              textAlign: 'center'
            }}
          >
            {selectedEmpreendimento.nome}
            {images.length > 1 && (
              <div style={{ fontSize: '0.875rem', fontWeight: '400', marginTop: '0.25rem', color: '#6b7280' }}>
                {(currentIndex >= 0 ? currentIndex : 0) + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* Modal de Detalhes da Unidade */}
      {showUnidadeModal && selectedUnidade && selectedEmpreendimento && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '2rem'
          }}
          onClick={() => setShowUnidadeModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <button
                  onClick={() => setShowUnidadeModal(false)}
                  style={{
                    background: '#374151',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <ArrowLeft size={20} />
                </button>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                  {selectedEmpreendimento.nome?.toUpperCase() || 'EMPREENDIMENTO'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setShareTitle(`${selectedUnidade.numero || selectedUnidade.numero_unidade} - ${selectedEmpreendimento.nome}`);
                    setShowShareModal(true);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    backgroundColor: '#374151',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Share2 size={16} />
                  <span>Compartilhar</span>
                </button>
                <button
                  onClick={() => setShowUnidadeModal(false)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '50%',
                    backgroundColor: '#374151',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '2rem' }}>
              {/* Título e Valor */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 0.5rem 0'
                }}>
                  {selectedUnidade.numero || selectedUnidade.numero_unidade} - {selectedUnidade.tipo_unidade || 'Unidade'}
                </h1>
                {selectedUnidade.valor && (
                  <>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: '#10b981',
                      marginBottom: '0.5rem'
                    }}>
                      R$ {parseFloat(selectedUnidade.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      marginBottom: '2rem'
                    }}>
                      Disponível
                    </div>
                  </>
                )}
              </div>

              {/* Características */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {selectedUnidade.dormitorios !== undefined && selectedUnidade.dormitorios !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <Bed size={32} color="#1f2937" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                      {selectedUnidade.dormitorios}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Dormitórios
                    </div>
                  </div>
                )}
                {selectedUnidade.banheiros !== undefined && selectedUnidade.banheiros !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <Bath size={32} color="#1f2937" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                      {selectedUnidade.banheiros}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Banheiros
                    </div>
                  </div>
                )}
                {selectedUnidade.suites !== undefined && selectedUnidade.suites !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <BedDouble size={32} color="#1f2937" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                      {selectedUnidade.suites}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Suites
                    </div>
                  </div>
                )}
                {selectedUnidade.vagas !== undefined && selectedUnidade.vagas !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <Car size={32} color="#1f2937" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                      {selectedUnidade.vagas}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Vagas
                    </div>
                  </div>
                )}
              </div>

              {/* Áreas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: selectedUnidade.area_total ? '1fr 1fr' : '1fr',
                gap: '2rem',
                marginBottom: '2rem'
              }}>
                {/* Área Privativa */}
                {(selectedUnidade.metragem_privativa || selectedUnidade.area_privativa || selectedUnidade.metragem) && (
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Ruler size={24} color="#1f2937" />
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                          {parseFloat(selectedUnidade.metragem_privativa || selectedUnidade.area_privativa || selectedUnidade.metragem).toFixed(2)}m²
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Área privativa
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Área Total (se disponível) */}
                {selectedUnidade.area_total && (
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Ruler size={24} color="#1f2937" />
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                          {parseFloat(selectedUnidade.area_total).toFixed(2)}m²
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Área total
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Condições de Pagamento */}
              {selectedEmpreendimento.condicoesPagamento && selectedEmpreendimento.condicoesPagamento.length > 0 && selectedUnidade.valor && (
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  marginTop: '1rem'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '1rem'
                  }}>
                    Condições de Pagamento
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                  }}>
                    {selectedEmpreendimento.condicoesPagamento.map((condicao, index) => {
                      // Calcular parcelas se for financiamento
                      let parcelasInfo = null;
                      if (condicao.titulo?.toLowerCase().includes('financiamento') && condicao.valor && selectedUnidade.valor) {
                        const valorFinanciado = parseFloat(selectedUnidade.valor) * (parseFloat(condicao.valor.replace('%', '')) / 100);
                        const numParcelas = condicao.detalhes?.find(d => d.includes('x'))?.match(/\d+/)?.[0] || '60';
                        const valorParcela = valorFinanciado / parseFloat(numParcelas);
                        parcelasInfo = `${numParcelas}x R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }

                      return (
                        <div key={index} style={{
                          padding: '1rem',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '0.875rem'
                            }}>
                              $
                            </div>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                                {condicao.titulo || 'Entrada'}
                              </div>
                              {condicao.valor && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  ({condicao.valor})
                                </div>
                              )}
                            </div>
                          </div>
                          {parcelasInfo && (
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginTop: '0.5rem' }}>
                              {parcelasInfo}
                            </div>
                          )}
                          {condicao.descricao && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                              {condicao.descricao}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento */}
      {showShareModal && selectedUnidade && selectedEmpreendimento && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000,
            padding: '2rem'
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com logo e X */}
            <div style={{
              position: 'relative',
              padding: '2rem 2rem 1rem 2rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={24} color="#1f2937" />
              </button>
              <div style={{ marginTop: '2rem' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                  {selectedUnidade.numero || selectedUnidade.numero_unidade} - {selectedEmpreendimento.nome}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                  {selectedUnidade.valor ? `R$ ${parseFloat(selectedUnidade.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Valor não informado'}
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '2rem' }}>
              {/* Input de Título */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  marginBottom: '0.5rem'
                }}>
                  Dê um título para identificar o compartilhamento
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                    placeholder="Digite o título..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                  <Edit size={16} style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af'
                  }} />
                </div>
              </div>

              {/* Toggles de Opções */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Informações que você vai compartilhar
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem'
                }}>
                  {[
                    { key: 'localizacao', label: 'Localização' },
                    { key: 'valorCondicoes', label: 'Valor e condições' },
                    { key: 'catalogo', label: 'Exibir catálogo do empreendimento' },
                    { key: 'caracteristicas', label: 'Características' },
                    { key: 'descricaoImovel', label: 'Descrição do imóvel' },
                    { key: 'receberPropostas', label: 'Receber propostas', subtitle: 'Inclui o link da landing page do imóvel' }
                  ].map((option) => (
                    <div key={option.key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', marginBottom: option.subtitle ? '0.25rem' : 0 }}>
                          {option.label}
                        </div>
                        {option.subtitle && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            {option.subtitle}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShareOptions(prev => ({
                          ...prev,
                          [option.key]: !prev[option.key]
                        }))}
                        style={{
                          width: '48px',
                          height: '28px',
                          borderRadius: '14px',
                          border: 'none',
                          backgroundColor: shareOptions[option.key] ? '#10b981' : '#d1d5db',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          left: shareOptions[option.key] ? '22px' : '2px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview do Texto */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '0.75rem'
                }}>
                  Preview do texto
                </h3>
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontSize: '0.875rem',
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  lineHeight: '1.6',
                  wordBreak: 'break-word'
                }}>
                  {generateShareText() || 'Nenhuma informação selecionada para compartilhar.'}
                </div>
              </div>

              {/* Botão de Compartilhar */}
              <button
                onClick={() => {
                  const shareText = generateShareText();
                  shareOnWhatsApp(shareText);
                }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#d97706'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f59e0b'}
              >
                <Share2 size={20} />
                <span>Compartilhar unidade</span>
              </button>

              {/* Botão de Copiar */}
              <button
                onClick={() => {
                  const shareText = generateShareText();
                  copyToClipboard(shareText);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                <Copy size={16} />
                <span>Copiar texto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Empreendimentos;
