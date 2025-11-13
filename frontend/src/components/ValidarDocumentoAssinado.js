import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts';
import { useSearchParams } from 'react-router-dom';
import './ValidarDocumentoAssinado.css';

const ValidarDocumentoAssinado = () => {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [searchParams] = useSearchParams();
  const [hash, setHash] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [modoValidacao, setModoValidacao] = useState('hash');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoValidado, setAutoValidado] = useState(false);

  // Validar por hash
  const validarPorHash = async () => {
    if (!hash.trim()) {
      showErrorToast('Por favor, informe o hash do documento.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/documentos-assinados/validar-integridade?hash=${hash.trim()}`);
      const data = await response.json();

      if (data.integro && data.encontrado) {
        setResultado({
          tipo: 'sucesso',
          mensagem: '✅ Documento íntegro - não foi alterado desde a assinatura',
          documento: data.documento
        });
        showSuccessToast('Documento validado com sucesso!');
      } else {
        setResultado({
          tipo: 'erro',
          mensagem: '❌ Documento não encontrado ou foi alterado',
          detalhes: data.error || 'Hash não corresponde a nenhum documento assinado no sistema'
        });
        showErrorToast('Documento não encontrado ou alterado');
      }
    } catch (error) {
      console.error('Erro ao validar:', error);
      showErrorToast('Erro ao validar documento');
    } finally {
      setLoading(false);
    }
  };

  // Ler hash da URL se existir
  useEffect(() => {
    const hashFromUrl = searchParams.get('hash');
    if (hashFromUrl && !autoValidado) {
      const hashUpper = hashFromUrl.toUpperCase();
      setHash(hashUpper);
      setModoValidacao('hash');
      setAutoValidado(true);
      // Validar diretamente com o hash da URL
      setTimeout(async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/documentos-assinados/validar-integridade?hash=${hashUpper}`);
          const data = await response.json();

          if (data.integro && data.encontrado) {
            setResultado({
              tipo: 'sucesso',
              mensagem: '✅ Documento íntegro - não foi alterado desde a assinatura',
              documento: data.documento
            });
            showSuccessToast('Documento validado com sucesso!');
          } else {
            setResultado({
              tipo: 'erro',
              mensagem: '❌ Documento não encontrado ou foi alterado',
              detalhes: data.error || 'Hash não corresponde a nenhum documento assinado no sistema'
            });
            showErrorToast('Documento não encontrado ou alterado');
          }
        } catch (error) {
          console.error('Erro ao validar:', error);
          showErrorToast('Erro ao validar documento');
        } finally {
          setLoading(false);
        }
      }, 300);
    }
  }, [searchParams]);

  // Validar por arquivo
  const validarPorArquivo = async () => {
    if (!pdfFile) {
      showErrorToast('Por favor, selecione um arquivo PDF.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      const response = await fetch('/api/documentos-assinados/validar-integridade-arquivo', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.integro && data.encontrado) {
        setResultado({
          tipo: 'sucesso',
          mensagem: '✅ Documento íntegro - não foi alterado desde a assinatura',
          documento: data.documento
        });
        showSuccessToast('Documento validado com sucesso!');
      } else {
        setResultado({
          tipo: 'erro',
          mensagem: '❌ Documento não encontrado ou foi alterado',
          detalhes: data.error || 'O arquivo não corresponde a nenhum documento assinado no sistema ou foi modificado'
        });
        showErrorToast('Documento não encontrado ou alterado');
      }
    } catch (error) {
      console.error('Erro ao validar:', error);
      showErrorToast('Erro ao validar documento');
    } finally {
      setLoading(false);
    }
  };

  // Extrair hash do PDF
  const extrairHashDoPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
          resolve(hashHex);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Quando selecionar arquivo, mostrar hash
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      try {
        const hashCalculado = await extrairHashDoPDF(file);
        setHash(hashCalculado);
      } catch (error) {
        console.error('Erro ao calcular hash:', error);
      }
    } else {
      showErrorToast('Por favor, selecione um arquivo PDF válido.');
    }
  };

  return (
    <div className="validar-documento-container">
      <div className="validar-header">
        <h1>🔒 Validar Integridade de Documento Assinado</h1>
        <p>Verifique se um documento não foi alterado desde a assinatura</p>
      </div>

      <div className="validar-content">
        {/* Seleção de modo */}
        <div className="modo-validacao">
          <button
            className={`modo-btn ${modoValidacao === 'hash' ? 'active' : ''}`}
            onClick={() => {
              setModoValidacao('hash');
              setResultado(null);
            }}
          >
            Validar por Hash
          </button>
          <button
            className={`modo-btn ${modoValidacao === 'arquivo' ? 'active' : ''}`}
            onClick={() => {
              setModoValidacao('arquivo');
              setResultado(null);
            }}
          >
            Validar por Arquivo PDF
          </button>
        </div>

        {/* Formulário de validação */}
        {modoValidacao === 'hash' && (
          <div className="validar-form">
            <label htmlFor="hash">Hash SHA1 do Documento:</label>
            <input
              type="text"
              id="hash"
              value={hash}
              onChange={(e) => setHash(e.target.value.toUpperCase())}
              placeholder="Cole o hash SHA1 do documento (40 caracteres)"
              style={{ fontFamily: 'monospace', fontSize: '0.875rem', padding: '0.75rem' }}
            />
            <button
              className="btn btn-primary"
              onClick={validarPorHash}
              disabled={loading || !hash.trim()}
            >
              {loading ? 'Validando...' : 'Validar Integridade'}
            </button>
          </div>
        )}

        {modoValidacao === 'arquivo' && (
          <div className="validar-form">
            <label htmlFor="pdfFile">Selecione o arquivo PDF:</label>
            <input
              type="file"
              id="pdfFile"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ marginBottom: '1rem' }}
            />
            {hash && (
              <div className="hash-preview">
                <strong>Hash calculado:</strong>
                <code>{hash}</code>
              </div>
            )}
            <button
              className="btn btn-primary"
              onClick={validarPorArquivo}
              disabled={loading || !pdfFile}
            >
              {loading ? 'Validando...' : 'Validar Integridade'}
            </button>
          </div>
        )}

        {/* Resultado da validação */}
        {resultado && (
          <div className={`resultado-validacao ${resultado.tipo}`}>
            <h3>{resultado.mensagem}</h3>
            
            {resultado.tipo === 'sucesso' && resultado.documento && (
              <div className="documento-info">
                <h4>Informações do Documento:</h4>
                <div className="info-grid">
                  <div>
                    <strong>Nome:</strong> {resultado.documento.nome}
                  </div>
                  <div>
                    <strong>Assinado por:</strong> {resultado.documento.assinante}
                  </div>
                  <div>
                    <strong>CPF/CNPJ:</strong> {resultado.documento.documento}
                  </div>
                  <div>
                    <strong>Data de Assinatura:</strong>{' '}
                    {new Date(resultado.documento.dataAssinatura).toLocaleString('pt-BR')}
                  </div>
                  <div>
                    <strong>Hash SHA1:</strong>
                    <code>{resultado.documento.hashSHA1}</code>
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <span className="status-badge integro">✅ Íntegro</span>
                  </div>
                </div>

                <div className="acoes-validacao">
                  <a
                    href={`/api/documentos-assinados/validar-hash?hash=${resultado.documento.hashSHA1}`}
                    target="_blank"
                    className="btn btn-secondary"
                  >
                    Ver Validação Completa
                  </a>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(resultado.documento.chaveValidacao);
                      showSuccessToast('Chave de validação copiada!');
                    }}
                  >
                    Copiar Chave de Validação
                  </button>
                </div>
              </div>
            )}

            {resultado.tipo === 'erro' && (
              <div className="erro-info">
                <p>{resultado.detalhes}</p>
                <p className="aviso">
                  ⚠️ Se você tem certeza de que o documento foi assinado neste sistema,
                  é possível que ele tenha sido modificado após a assinatura.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="instrucoes-validacao">
          <h3>Como usar:</h3>
          <ul>
            <li>
              <strong>Validar por Hash:</strong> Cole o hash SHA1 que aparece no rodapé do documento PDF
            </li>
            <li>
              <strong>Validar por Arquivo:</strong> Faça upload do PDF e o sistema calculará o hash automaticamente
            </li>
            <li>
              <strong>Resultado:</strong> Se o documento for íntegro, você verá todas as informações da assinatura
            </li>
            <li>
              <strong>Segurança:</strong> Se o documento foi alterado, o hash não corresponderá e você será alertado
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ValidarDocumentoAssinado;

