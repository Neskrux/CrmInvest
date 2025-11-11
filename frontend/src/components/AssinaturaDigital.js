import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import { useToast } from './Toast';
import './AssinaturaDigital.css';

const AssinaturaDigital = () => {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const signatureRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Estados
  const [nomeAssinante, setNomeAssinante] = useState('');
  const [documentoAssinante, setDocumentoAssinante] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [signaturePosition, setSignaturePosition] = useState({ x: 100, y: 100 });
  const [signatureSize, setSignatureSize] = useState({ width: 150, height: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentSignature, setCurrentSignature] = useState(null);
  const [documentosAssinados, setDocumentosAssinados] = useState([]);
  const [step, setStep] = useState(1); // 1: Criar assinatura, 2: Upload PDF, 3: Posicionar
  const [validacaoDetalhada, setValidacaoDetalhada] = useState(null); // Informações detalhadas de validação
  const [validandoDocumento, setValidandoDocumento] = useState(null); // ID do documento sendo validado

  // Limpar assinatura
  const limparAssinatura = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setHasSignature(false);
    }
  };

  // Salvar assinatura temporariamente
  const salvarAssinaturaTemporiamente = () => {
    if (!hasSignature) {
      showErrorToast('Por favor, desenhe sua assinatura primeiro.');
      return;
    }

    if (!nomeAssinante.trim()) {
      showErrorToast('Por favor, informe o nome do assinante.');
      return;
    }

    if (!documentoAssinante.trim()) {
      showErrorToast('Por favor, informe o documento do assinante.');
      return;
    }

    const assinaturaBase64 = signatureRef.current.toDataURL('image/png');
    setCurrentSignature(assinaturaBase64);
    setStep(2);
    showSuccessToast('Assinatura criada! Agora selecione o documento PDF.');
  };

  // Upload do PDF
  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) {
        showErrorToast('O arquivo PDF deve ter no máximo 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const bytes = new Uint8Array(e.target.result);
          setPdfBytes(bytes);
          
          // Criar URL para preview
          const url = URL.createObjectURL(file);
          setPdfFile(url);
          setPdfPreviewUrl(url);
          
          // Tentar obter número de páginas usando pdf-lib
          try {
            const pdfDoc = await PDFDocument.load(bytes);
            setNumPages(pdfDoc.getPageCount());
          } catch (err) {
            console.warn('Não foi possível obter número de páginas:', err);
            setNumPages(1);
          }
          
          setStep(3);
        } catch (error) {
          console.error('Erro ao processar PDF:', error);
          showErrorToast('Erro ao processar PDF. Verifique se o arquivo está válido.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showErrorToast('Por favor, selecione um arquivo PDF válido.');
    }
  };

  // Drag and drop da assinatura
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const viewerElement = document.querySelector('.pdf-viewer');
    
    if (viewerElement) {
      const viewerRect = viewerElement.getBoundingClientRect();
      // Calcular offset do clique dentro da assinatura
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      setIsDragging(true);
      setDragStart({
        x: offsetX,
        y: offsetY
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const viewerElement = document.querySelector('.pdf-viewer');
      if (viewerElement) {
        const rect = viewerElement.getBoundingClientRect();
        
        // Calcular nova posição considerando o offset do clique
        const newX = e.clientX - rect.left - dragStart.x;
        const newY = e.clientY - rect.top - dragStart.y;
        
        // Calcular limites considerando o tamanho total (assinatura + informações)
        const totalHeight = signatureSize.height + 60;
        const maxX = rect.width - signatureSize.width;
        const maxY = rect.height - totalHeight;
        
        // Aplicar limites para manter dentro da área do PDF
        setSignaturePosition({
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY))
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Adicionar event listeners globais para drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, signatureSize]);

  // Gerar hash SHA1
  const gerarHashSHA1 = async (arrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hashHex;
  };

  // Gerar chave única de validação
  const gerarChaveValidacao = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${timestamp}${random}`;
  };

  // Aplicar assinatura ao PDF
  const aplicarAssinatura = async () => {
    try {
      setLoading(true);

      // Carregar o PDF
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const page = pages[currentPage - 1];

      // Converter assinatura base64 para imagem
      const signatureImage = await pdfDoc.embedPng(currentSignature);
      
      // Obter dimensões da página
      const pageHeight = page.getHeight();
      const pageWidth = page.getWidth();
      
      // Obter dimensões reais do viewer para calcular escala correta
      const viewerElement = document.querySelector('.pdf-viewer');
      const iframeElement = viewerElement?.querySelector('iframe');
      
      // Tentar obter dimensões do iframe renderizado
      let iframeWidth = 600; // Default
      let iframeHeight = 800; // Default
      
      if (iframeElement) {
        // Pegar dimensões do iframe
        const iframeRect = iframeElement.getBoundingClientRect();
        iframeWidth = iframeRect.width || 600;
        iframeHeight = iframeRect.height || 800;
      }
      
      // Calcular escala real considerando que o PDF pode ter diferentes tamanhos
      // O PDF padrão A4 tem ~595x842 pontos, mas pode variar
      const scaleX = pageWidth / iframeWidth;
      const scaleY = pageHeight / iframeHeight;
      
      // Calcular posição no PDF (considerando que o PDF tem origem no canto inferior esquerdo)
      const signatureHeight = signatureSize.height + 60; // altura da assinatura + informações
      const x = signaturePosition.x * scaleX;
      // Converter Y (origem do PDF é inferior esquerdo, do viewer é superior esquerdo)
      const y = pageHeight - (signaturePosition.y * scaleY) - (signatureHeight * scaleY);
      
      // Desenhar assinatura
      page.drawImage(signatureImage, {
        x: x,
        y: y + 60, // Deixar espaço para as informações abaixo
        width: signatureSize.width,
        height: signatureSize.height,
      });
      
      // Adicionar informações abaixo da assinatura
      const fontSize = 10;
      const smallFontSize = 8;
      
      // Nome
      page.drawText(nomeAssinante, {
        x: x,
        y: y + 40,
        size: fontSize,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      // CPF/CNPJ
      page.drawText(`CPF/CNPJ: ${documentoAssinante}`, {
        x: x,
        y: y + 25,
        size: smallFontSize,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Data
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      page.drawText(`Data: ${dataFormatada}`, {
        x: x,
        y: y + 10,
        size: smallFontSize,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Linha divisória acima da assinatura
      page.drawLine({
        start: { x: x, y: y + 55 },
        end: { x: x + signatureSize.width, y: y + 55 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      // IMPORTANTE: Adicionar rodapé ANTES de gerar o hash
      // Isso garante que o hash seja calculado do PDF completo (com assinatura + rodapé)
      // Mas primeiro vamos salvar sem rodapé para gerar o hash, depois adicionar rodapé
      
      // Salvar PDF com assinatura (sem rodapé ainda) para gerar hash
      const pdfBytesAntesHash = await pdfDoc.save();
      
      // Gerar nosso hash SHA1 como número de rastreabilidade
      const hashRastreamento = await gerarHashSHA1(pdfBytesAntesHash);
      
      console.log('Hash gerado:', hashRastreamento); // Debug
      
      // Agora precisamos recarregar o PDF para adicionar o hash sem afetar o hash anterior
      // Mas na verdade, vamos adicionar o hash DEPOIS de calcular, então o hash não inclui o próprio hash
      // Isso está correto! O hash deve ser do documento ANTES de adicionar o hash
      
      // Recarregar o PDF para adicionar o rodapé
      const pdfDocComRodape = await PDFDocument.load(pdfBytesAntesHash);
      const pagesComRodape = pdfDocComRodape.getPages();
      
      // Adicionar rodapé simples em todas as páginas
      for (let i = 0; i < pagesComRodape.length; i++) {
        const paginaAtual = pagesComRodape[i];
        const larguraPagina = paginaAtual.getWidth();
        const alturaPagina = paginaAtual.getHeight();
        
        // Rodapé centralizado na parte inferior
        const textoRodape = `HASH/ID: ${hashRastreamento}`;
        const tamanhoFonte = 12; // Fonte maior para melhor visibilidade
        const margemInferior = 25; // Margem do fundo da página
        const yPosicaoTexto = margemInferior; // Posição do texto (origem é inferior esquerdo no pdf-lib)
        const yPosicaoLinha = margemInferior + 12; // Linha acima do texto
        
        // Usar uma aproximação melhor para largura do texto
        // Cada caractere em fonte 12 tem aproximadamente 7.2 pontos de largura
        const larguraTextoAprox = textoRodape.length * 7.2;
        const xPosicao = (larguraPagina - larguraTextoAprox) / 2;
        
        // Garantir que o texto não saia da página
        const xPosicaoFinal = Math.max(20, Math.min(xPosicao, larguraPagina - larguraTextoAprox - 20));
        
        // Adicionar linha fina acima do rodapé
        paginaAtual.drawLine({
          start: { x: 40, y: yPosicaoLinha },
          end: { x: larguraPagina - 40, y: yPosicaoLinha },
          thickness: 1,
          color: rgb(0.5, 0.5, 0.5),
        });
        
        // Adicionar texto do rodapé com cor bem visível
        paginaAtual.drawText(textoRodape, {
          x: xPosicaoFinal,
          y: yPosicaoTexto,
          size: tamanhoFonte,
          color: rgb(0.1, 0.1, 0.1), // Cor bem escura para máxima visibilidade
        });
        
        console.log(`Rodapé adicionado na página ${i + 1}:`, {
          texto: textoRodape,
          x: xPosicaoFinal,
          y: yPosicaoTexto,
          larguraPagina,
          alturaPagina
        }); // Debug detalhado
      }
      
      // Salvar PDF final COM rodapé
      const pdfBytesFinal = await pdfDocComRodape.save();
      console.log('PDF final salvo com hash:', hashRastreamento, 'Tamanho:', pdfBytesFinal.length); // Debug
      const blob = new Blob([pdfBytesFinal], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Adicionar à lista de documentos assinados
      const novoDocumento = {
        id: Date.now(),
        nome: `Documento_Assinado_${nomeAssinante.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        assinante: nomeAssinante,
        documento: documentoAssinante,
        dataAssinatura: new Date().toISOString(),
        url: url,
        blob: blob,
        hashSHA1: hashRastreamento,
        chaveValidacao: hashRastreamento.substring(0, 10), // Primeiros 10 caracteres do hash como código
        urlValidacao: `${window.location.origin}/validar-documento-assinado?hash=${hashRastreamento}`
      };
      
      // Coletar informações adicionais para rastreabilidade
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

      // Enviar dados para o backend para armazenar
      try {
        const response = await fetch('/api/documentos-assinados', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            nome: novoDocumento.nome,
            assinante: novoDocumento.assinante,
            documento: novoDocumento.documento,
            hashSHA1: novoDocumento.hashSHA1,
            chaveValidacao: novoDocumento.chaveValidacao,
            dataAssinatura: novoDocumento.dataAssinatura,
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
        
        if (!response.ok) {
          console.warn('Aviso: Não foi possível salvar dados de validação no servidor');
        }
      } catch (error) {
        console.warn('Aviso: Erro ao salvar dados de validação:', error);
      }

      setDocumentosAssinados([...documentosAssinados, novoDocumento]);
      
      // Resetar formulário
      resetarFormulario();
      
      showSuccessToast('Documento assinado com sucesso!');
    } catch (error) {
      console.error('Erro ao assinar documento:', error);
      showErrorToast('Erro ao assinar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Resetar formulário
  const resetarFormulario = () => {
    setStep(1);
    if (pdfFile) {
      URL.revokeObjectURL(pdfFile);
    }
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfFile(null);
    setPdfBytes(null);
    setPdfPreviewUrl(null);
    setCurrentSignature(null);
    setNomeAssinante('');
    setDocumentoAssinante('');
    limparAssinatura();
    setSignaturePosition({ x: 100, y: 100 });
    setCurrentPage(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download do documento assinado
  const downloadDocumento = (documento) => {
    const link = document.createElement('a');
    link.href = documento.url;
    link.download = documento.nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excluir documento
  // Validar integridade do documento e buscar informações detalhadas
  const validarDocumentoDetalhado = async (documento) => {
    if (!documento.hashSHA1) {
      showErrorToast('Hash não disponível para este documento.');
      return;
    }

    setValidandoDocumento(documento.id);
    try {
      const response = await fetch(`/api/documentos-assinados/validar-integridade?hash=${documento.hashSHA1}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.integro && data.encontrado) {
        // Buscar informações completas do documento no backend
        const responseDetalhes = await fetch(`/api/documentos-assinados/validar-hash?hash=${documento.hashSHA1}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const detalhes = await responseDetalhes.json();

        // Buscar informações completas do banco (incluindo IP, dispositivo, auditoria)
        // Vamos fazer uma busca direta via API de listagem e filtrar
        const responseLista = await fetch('/api/documentos-assinados', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const listaCompleta = await responseLista.json();
        const documentoCompleto = listaCompleta.documentos?.find(d => d.hash_sha1 === documento.hashSHA1);

        setValidacaoDetalhada({
          documento: data.documento,
          detalhes: detalhes.documento || {},
          completo: documentoCompleto || {},
          integro: true,
          mensagem: 'Documento íntegro - não foi alterado desde a assinatura'
        });

        showSuccessToast('Documento validado com sucesso!');
      } else {
        setValidacaoDetalhada({
          integro: false,
          mensagem: 'Documento não encontrado ou foi alterado',
          detalhes: data.error || 'Hash não corresponde a nenhum documento assinado no sistema'
        });
        showErrorToast('Documento não encontrado ou alterado');
      }
    } catch (error) {
      console.error('Erro ao validar documento:', error);
      showErrorToast('Erro ao validar documento');
      setValidacaoDetalhada({
        integro: false,
        mensagem: 'Erro ao validar documento',
        detalhes: error.message
      });
    } finally {
      setValidandoDocumento(null);
    }
  };

  // Fechar modal de validação
  const fecharValidacao = () => {
    setValidacaoDetalhada(null);
  };

  const excluirDocumento = (id) => {
    setDocumentosAssinados(documentosAssinados.filter(doc => doc.id !== id));
    showSuccessToast('Documento excluído com sucesso!');
  };

  return (
    <div className="assinatura-digital-container">
      <div className="assinatura-header">
        <h1>Assinatura Digital de Documentos</h1>
        <p>Sistema profissional para assinatura digital de documentos PDF</p>
      </div>

      <div className="assinatura-content">
        {/* Indicador de Progresso */}
        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Criar Assinatura</span>
          </div>
          <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Selecionar Documento</span>
          </div>
          <div className={`progress-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Posicionar e Assinar</span>
          </div>
        </div>

        {/* Step 1: Criar Assinatura */}
        {step === 1 && (
          <div className="step-content">
            <div className="signature-creation-card">
              <h2>Criar Nova Assinatura</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="nomeAssinante">Nome Completo *</label>
                  <input
                    type="text"
                    id="nomeAssinante"
                    value={nomeAssinante}
                    onChange={(e) => setNomeAssinante(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="documentoAssinante">CPF/CNPJ *</label>
                  <input
                    type="text"
                    id="documentoAssinante"
                    value={documentoAssinante}
                    onChange={(e) => setDocumentoAssinante(e.target.value)}
                    placeholder="Digite seu CPF ou CNPJ"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="signature-canvas-section">
                <label>Desenhe sua assinatura</label>
                <div className="signature-pad">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: 'signature-canvas',
                      width: 600,
                      height: 200
                    }}
                    backgroundColor="#ffffff"
                    penColor="#000033"
                    onEnd={() => setHasSignature(true)}
                  />
                </div>
                <button
                  className="btn btn-text"
                  onClick={limparAssinatura}
                >
                  Limpar Assinatura
                </button>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={salvarAssinaturaTemporiamente}
                  disabled={!hasSignature || !nomeAssinante.trim() || !documentoAssinante.trim()}
                >
                  Próximo: Selecionar Documento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload PDF */}
        {step === 2 && (
          <div className="step-content">
            <div className="upload-card">
              <h2>Selecionar Documento PDF</h2>
              
              <div className="upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  style={{ display: 'none' }}
                />
                <div
                  className="upload-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <p className="upload-text">
                    Clique para selecionar ou arraste um arquivo PDF aqui
                  </p>
                  <p className="upload-hint">
                    Arquivos PDF até 10MB
                  </p>
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Posicionar Assinatura */}
        {step === 3 && pdfFile && (
          <div className="step-content">
            <div className="positioning-card">
              <h2>Posicionar Assinatura</h2>
              
              <div className="pdf-controls">
                <div className="page-navigation">
                  <button
                    className="btn btn-sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    Página Anterior
                  </button>
                  <span>Página {currentPage} de {numPages || '?'}</span>
                  <button
                    className="btn btn-sm"
                    onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                    disabled={currentPage >= numPages}
                  >
                    Próxima Página
                  </button>
                </div>

                <div className="signature-size-control">
                  <label>Tamanho da assinatura:</label>
                  <input
                    type="range"
                    min="100"
                    max="300"
                    value={signatureSize.width}
                    onChange={(e) => {
                      const width = parseInt(e.target.value);
                      setSignatureSize({
                        width: width,
                        height: width / 3
                      });
                    }}
                  />
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                    {signatureSize.width}px
                  </span>
                </div>

                <div className="position-controls">
                  <label>Posição:</label>
                  <div className="position-inputs">
                    <div className="position-input-group">
                      <label>X:</label>
                      <input
                        type="number"
                        value={Math.round(signaturePosition.x)}
                        onChange={(e) => {
                          const viewerElement = document.querySelector('.pdf-viewer');
                          const maxX = viewerElement ? viewerElement.clientWidth - signatureSize.width : 0;
                          const newX = Math.max(0, Math.min(maxX, parseInt(e.target.value) || 0));
                          setSignaturePosition({
                            ...signaturePosition,
                            x: newX
                          });
                        }}
                        className="position-input"
                        min="0"
                      />
                    </div>
                    <div className="position-input-group">
                      <label>Y:</label>
                      <input
                        type="number"
                        value={Math.round(signaturePosition.y)}
                        onChange={(e) => {
                          const viewerElement = document.querySelector('.pdf-viewer');
                          const totalHeight = signatureSize.height + 60;
                          const maxY = viewerElement ? viewerElement.clientHeight - totalHeight : 0;
                          const newY = Math.max(0, Math.min(maxY, parseInt(e.target.value) || 0));
                          setSignaturePosition({
                            ...signaturePosition,
                            y: newY
                          });
                        }}
                        className="position-input"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pdf-viewer-wrapper">
                {pdfPreviewUrl && (
                  <div 
                    className="pdf-viewer"
                  >
                    <iframe
                      src={`${pdfPreviewUrl}#page=${currentPage}`}
                      className="pdf-iframe"
                      title="PDF Preview"
                      width="100%"
                      height="800px"
                      style={{
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: '#f3f4f6',
                        pointerEvents: isDragging ? 'none' : 'auto'
                      }}
                    />
                    
                    {/* Assinatura arrastável sobreposta com informações */}
                    {currentSignature && (
                      <div
                        className="signature-overlay"
                        style={{
                          position: 'absolute',
                          left: `${signaturePosition.x}px`,
                          top: `${signaturePosition.y}px`,
                          width: `${signatureSize.width}px`,
                          minHeight: `${signatureSize.height + 60}px`,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          border: '2px dashed #3b82f6',
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          padding: '8px',
                          borderRadius: '4px',
                          zIndex: 10,
                          pointerEvents: 'auto',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          transition: isDragging ? 'none' : 'box-shadow 0.2s'
                        }}
                        onMouseDown={handleMouseDown}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{
                          fontSize: '10px',
                          color: '#9ca3af',
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}>
                          ✋ Arraste livremente
                        </div>
                        <img
                          src={currentSignature}
                          alt="Assinatura"
                          style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            marginBottom: '8px',
                            pointerEvents: 'none'
                          }}
                          draggable={false}
                        />
                        <div style={{
                          borderTop: '1px solid #e5e7eb',
                          paddingTop: '6px',
                          fontSize: '10px',
                          color: '#374151',
                          lineHeight: '1.4',
                          pointerEvents: 'none'
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                            {nomeAssinante}
                          </div>
                          <div style={{ fontSize: '9px', color: '#6b7280' }}>
                            CPF/CNPJ: {documentoAssinante}
                          </div>
                          <div style={{ fontSize: '9px', color: '#6b7280' }}>
                            Data: {new Date().toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={resetarFormulario}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={aplicarAssinatura}
                  disabled={loading}
                >
                  {loading ? 'Assinando documento...' : 'Aplicar Assinatura'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documentos Assinados */}
        {documentosAssinados.length > 0 && (
          <div className="signed-documents-section">
            <h2>Documentos Assinados ({documentosAssinados.length})</h2>
            
            <div className="documents-grid">
              {documentosAssinados.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="document-header">
                    <div className="document-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                    </div>
                    <div className="document-title-section">
                      <h3>{doc.nome}</h3>
                    </div>
                  </div>
                  
                  <div className="document-info">
                    <div className="document-meta">
                      <span className="meta-label">Assinado por:</span>
                      <strong>{doc.assinante}</strong>
                    </div>
                    <div className="document-meta">
                      <span className="meta-label">CPF/CNPJ:</span>
                      <strong>{doc.documento}</strong>
                    </div>
                    {doc.hashSHA1 && (
                      <div className="document-meta">
                        <span className="meta-label">Hash de Rastreabilidade:</span>
                        <code style={{ 
                          fontSize: '0.75rem', 
                          wordBreak: 'break-all',
                          backgroundColor: '#f3f4f6',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          display: 'block',
                          marginTop: '0.5rem'
                        }}>
                          {doc.hashSHA1}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(doc.hashSHA1);
                            showSuccessToast('Hash copiado para a área de transferência!');
                          }}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Copiar Hash
                        </button>
                      </div>
                    )}
                    <div className="document-date">
                      {new Date(doc.dataAssinatura).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <div className="document-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      Visualizar
                    </button>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => downloadDocumento(doc)}
                    >
                      Download
                    </button>
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => validarDocumentoDetalhado(doc)}
                      disabled={validandoDocumento === doc.id || !doc.hashSHA1}
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white'
                      }}
                    >
                      {validandoDocumento === doc.id ? 'Validando...' : '🔍 Validar Integridade'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => excluirDocumento(doc.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Validação Detalhada */}
        {validacaoDetalhada && (
          <div className="modal-overlay" onClick={fecharValidacao}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div className="modal-header">
                <h2>🔍 Validação Detalhada do Documento</h2>
                <button className="close-btn" onClick={fecharValidacao}>×</button>
              </div>

              <div className="modal-body">
                {validacaoDetalhada.integro ? (
                  <>
                    {/* Status de Integridade */}
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{ color: '#065f46', margin: 0 }}>✅ Documento Íntegro</h3>
                      <p style={{ color: '#047857', margin: '0.5rem 0 0 0' }}>
                        {validacaoDetalhada.mensagem}
                      </p>
                    </div>

                    {/* Informações Básicas */}
                    <div className="info-section">
                      <h3>Informações do Documento</h3>
                      <div className="info-grid">
                        <div>
                          <strong>Nome:</strong>
                          <span>{validacaoDetalhada.documento?.nome || validacaoDetalhada.completo?.nome || 'N/A'}</span>
                        </div>
                        <div>
                          <strong>Assinado por:</strong>
                          <span>{validacaoDetalhada.documento?.assinante || validacaoDetalhada.completo?.assinante || 'N/A'}</span>
                        </div>
                        <div>
                          <strong>CPF/CNPJ:</strong>
                          <span>{validacaoDetalhada.documento?.documento || validacaoDetalhada.completo?.documento || 'N/A'}</span>
                        </div>
                        <div>
                          <strong>Data de Assinatura:</strong>
                          <span>
                            {validacaoDetalhada.documento?.dataAssinatura || validacaoDetalhada.completo?.data_assinatura 
                              ? new Date(validacaoDetalhada.documento?.dataAssinatura || validacaoDetalhada.completo?.data_assinatura).toLocaleString('pt-BR')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Informações de Rastreabilidade */}
                    <div className="info-section">
                      <h3>Rastreabilidade</h3>
                      <div className="info-grid">
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong>Hash SHA1 Completo:</strong>
                          <code style={{
                            display: 'block',
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            wordBreak: 'break-all',
                            fontFamily: 'monospace'
                          }}>
                            {validacaoDetalhada.documento?.hashSHA1 || validacaoDetalhada.completo?.hash_sha1 || 'N/A'}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(validacaoDetalhada.documento?.hashSHA1 || validacaoDetalhada.completo?.hash_sha1 || '');
                              showSuccessToast('Hash copiado!');
                            }}
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Copiar Hash
                          </button>
                        </div>
                        <div>
                          <strong>Chave de Validação:</strong>
                          <span>{validacaoDetalhada.documento?.chaveValidacao || validacaoDetalhada.completo?.chave_validacao || 'N/A'}</span>
                        </div>
                        <div>
                          <strong>Status de Integridade:</strong>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            fontWeight: '600'
                          }}>
                            ✅ {validacaoDetalhada.completo?.integridade_status === 'integro' ? 'Íntegro' : 'Não Verificado'}
                          </span>
                        </div>
                        {validacaoDetalhada.completo?.integridade_verificada && (
                          <div>
                            <strong>Última Verificação:</strong>
                            <span>{new Date(validacaoDetalhada.completo.integridade_verificada).toLocaleString('pt-BR')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Informações de Assinatura */}
                    {validacaoDetalhada.completo?.ip_assinatura && (
                      <div className="info-section">
                        <h3>Informações da Assinatura</h3>
                        <div className="info-grid">
                          <div>
                            <strong>IP do Assinante:</strong>
                            <span>{validacaoDetalhada.completo.ip_assinatura}</span>
                          </div>
                          {validacaoDetalhada.completo?.dispositivo_info && (
                            <>
                              {validacaoDetalhada.completo.dispositivo_info.userAgent && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <strong>User Agent:</strong>
                                  <span style={{ fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
                                    {validacaoDetalhada.completo.dispositivo_info.userAgent}
                                  </span>
                                </div>
                              )}
                              {validacaoDetalhada.completo.dispositivo_info.plataforma && (
                                <div>
                                  <strong>Plataforma:</strong>
                                  <span>{validacaoDetalhada.completo.dispositivo_info.plataforma}</span>
                                </div>
                              )}
                              {validacaoDetalhada.completo.dispositivo_info.idioma && (
                                <div>
                                  <strong>Idioma:</strong>
                                  <span>{validacaoDetalhada.completo.dispositivo_info.idioma}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Histórico de Auditoria */}
                    {validacaoDetalhada.completo?.auditoria_log && Array.isArray(validacaoDetalhada.completo.auditoria_log) && validacaoDetalhada.completo.auditoria_log.length > 0 && (
                      <div className="info-section">
                        <h3>Histórico de Validações</h3>
                        <div style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '1rem'
                        }}>
                          {validacaoDetalhada.completo.auditoria_log.map((evento, index) => (
                            <div key={index} style={{
                              padding: '0.75rem',
                              borderBottom: index < validacaoDetalhada.completo.auditoria_log.length - 1 ? '1px solid #e5e7eb' : 'none',
                              marginBottom: index < validacaoDetalhada.completo.auditoria_log.length - 1 ? '0.5rem' : '0'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: '#1a1d23' }}>{evento.tipo || 'Evento'}</strong>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {evento.data ? new Date(evento.data).toLocaleString('pt-BR') : 'N/A'}
                                </span>
                              </div>
                              {evento.ip && (
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                  IP: {evento.ip}
                                </div>
                              )}
                              {evento.userAgent && (
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                  {evento.userAgent}
                                </div>
                              )}
                              {evento.resultado && (
                                <div style={{
                                  marginTop: '0.5rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  backgroundColor: evento.resultado === 'integro' ? '#d1fae5' : '#fef2f2',
                                  color: evento.resultado === 'integro' ? '#065f46' : '#991b1b',
                                  display: 'inline-block',
                                  fontSize: '0.75rem'
                                }}>
                                  Resultado: {evento.resultado}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Validade Jurídica */}
                    {validacaoDetalhada.completo?.validade_juridica && (
                      <div className="info-section">
                        <h3>Validade Jurídica</h3>
                        <div className="info-grid">
                          <div>
                            <strong>Nível:</strong>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              fontWeight: '600'
                            }}>
                              {validacaoDetalhada.completo.validade_juridica === 'simples' ? 'Simples' :
                               validacaoDetalhada.completo.validade_juridica === 'avancada' ? 'Avançada' :
                               validacaoDetalhada.completo.validade_juridica === 'icp_brasil' ? 'ICP-Brasil' :
                               validacaoDetalhada.completo.validade_juridica}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ color: '#991b1b', margin: 0 }}>❌ Documento Não Encontrado ou Alterado</h3>
                    <p style={{ color: '#dc2626', margin: '0.5rem 0 0 0' }}>
                      {validacaoDetalhada.mensagem}
                    </p>
                    <p style={{ color: '#991b1b', margin: '1rem 0 0 0', fontSize: '0.875rem' }}>
                      {validacaoDetalhada.detalhes}
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-primary" onClick={fecharValidacao}>
                  Fechar
                </button>
                {validacaoDetalhada.integro && validacaoDetalhada.documento?.hashSHA1 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      window.open(`/validar-documento-assinado?hash=${validacaoDetalhada.documento.hashSHA1}`, '_blank');
                    }}
                  >
                    Validar em Página Pública
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssinaturaDigital;