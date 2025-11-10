import React, { useState, useEffect, useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import './GerenciarAssinaturaAdmin.css';

const GerenciarAssinaturaAdmin = () => {
  const { user } = useAuth();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const sigCanvas = useRef(null);
  
  const [assinaturaExistente, setAssinaturaExistente] = useState(null);
  const [carregandoAssinatura, setCarregandoAssinatura] = useState(true);
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const [formData, setFormData] = useState({
    nome_admin: user?.nome || '',
    documento_admin: ''
  });

  // Carregar assinatura existente
  const carregarAssinaturaExistente = useCallback(async () => {
    try {
      setCarregandoAssinatura(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/assinaturas-admin/minha-assinatura', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const assinaturaData = await response.json();
        setAssinaturaExistente(assinaturaData);
        setFormData({
          nome_admin: assinaturaData.nome_admin || user?.nome || '',
          documento_admin: assinaturaData.documento_admin || ''
        });
      } else if (response.status === 404) {
        // Se não houver assinatura, não é erro
        console.log('Nenhuma assinatura cadastrada ainda');
      } else {
        throw new Error('Erro ao carregar assinatura');
      }
    } catch (error) {
      // Se não houver assinatura, não é erro
      console.log('Nenhuma assinatura cadastrada ainda');
    } finally {
      setCarregandoAssinatura(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      carregarAssinaturaExistente();
    }
  }, [user, carregarAssinaturaExistente]);

  const limparAssinatura = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setHasSignature(false);
    }
  };

  const salvarAssinatura = async () => {
    try {
      // Validações
      if (!formData.nome_admin.trim()) {
        showErrorToast('Por favor, informe seu nome completo');
        return;
      }
      
      if (!formData.documento_admin.trim()) {
        showErrorToast('Por favor, informe seu CPF ou CNPJ');
        return;
      }
      
      if (!hasSignature || sigCanvas.current.isEmpty()) {
        showErrorToast('Por favor, desenhe sua assinatura');
        return;
      }
      
      setSalvandoAssinatura(true);
      
      // Obter assinatura em base64
      const assinaturaBase64 = sigCanvas.current.toDataURL('image/png');
      
      // Enviar para o backend
      const payload = {
        nome_admin: formData.nome_admin,
        documento_admin: formData.documento_admin.replace(/\D/g, ''), // Remove formatação
        assinatura_base64: assinaturaBase64,
        ativa: true
      };
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assinaturas-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        await response.json(); // Resposta OK, não precisa usar os dados
        showSuccessToast('Assinatura salva com sucesso!');
        await carregarAssinaturaExistente();
        setMostrarFormulario(false);
        limparAssinatura();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar assinatura');
      }
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      showErrorToast(error.message || 'Erro ao salvar assinatura');
    } finally {
      setSalvandoAssinatura(false);
    }
  };

  const formatarDocumento = (valor) => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    
    // Formata como CPF ou CNPJ
    if (numeros.length <= 11) {
      // CPF: 000.000.000-00
      return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numeros
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  };

  const handleDocumentoChange = (e) => {
    const valorFormatado = formatarDocumento(e.target.value);
    setFormData({ ...formData, documento_admin: valorFormatado });
  };

  if (carregandoAssinatura) {
    return (
      <div className="gerenciar-assinatura-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gerenciar-assinatura-container">
      <div className="assinatura-header">
        <h2>
          <i className="fas fa-signature"></i>
          Minha Assinatura Digital
        </h2>
        <p className="assinatura-subtitle">
          Configure sua assinatura digital para uso automático em documentos
        </p>
      </div>

      {assinaturaExistente && !mostrarFormulario ? (
        <div className="assinatura-existente">
          <div className="assinatura-card">
            <div className="assinatura-info">
              <div className="info-item">
                <label>Nome:</label>
                <span>{assinaturaExistente.nome_admin}</span>
              </div>
              <div className="info-item">
                <label>Documento:</label>
                <span>{formatarDocumento(assinaturaExistente.documento_admin)}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className="status-badge ativo">
                  <i className="fas fa-check-circle"></i>
                  Ativa
                </span>
              </div>
              <div className="info-item">
                <label>Cadastrada em:</label>
                <span>
                  {new Date(assinaturaExistente.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
            
            <div className="assinatura-preview">
              <label>Assinatura:</label>
              <div className="preview-box">
                <img 
                  src={assinaturaExistente.assinatura_base64} 
                  alt="Assinatura" 
                  className="assinatura-img"
                />
              </div>
            </div>
          </div>

          <div className="assinatura-actions">
            <button 
              className="btn-atualizar"
              onClick={() => setMostrarFormulario(true)}
            >
              <i className="fas fa-edit"></i>
              Atualizar Assinatura
            </button>
          </div>
        </div>
      ) : (
        <div className="assinatura-formulario">
          <div className="form-section">
            <h3>Dados Pessoais</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nome">Nome Completo *</label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome_admin}
                  onChange={(e) => setFormData({ ...formData, nome_admin: e.target.value })}
                  placeholder="Digite seu nome completo"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="documento">CPF ou CNPJ *</label>
                <input
                  type="text"
                  id="documento"
                  value={formData.documento_admin}
                  onChange={handleDocumentoChange}
                  placeholder="000.000.000-00"
                  className="form-input"
                  maxLength={18}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Assinatura Digital</h3>
            <div className="signature-area">
              <div className="signature-canvas-wrapper">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: 'signature-canvas',
                    width: 500,
                    height: 200
                  }}
                  backgroundColor="white"
                  penColor="black"
                  onEnd={() => setHasSignature(true)}
                />
                <div className="signature-hint">
                  <i className="fas fa-info-circle"></i>
                  Desenhe sua assinatura acima
                </div>
              </div>
              
              <button 
                className="btn-limpar"
                onClick={limparAssinatura}
                type="button"
              >
                <i className="fas fa-eraser"></i>
                Limpar Assinatura
              </button>
            </div>
          </div>

          <div className="form-actions">
            {assinaturaExistente && (
              <button 
                className="btn-cancelar"
                onClick={() => {
                  setMostrarFormulario(false);
                  limparAssinatura();
                }}
                disabled={salvandoAssinatura}
              >
                Cancelar
              </button>
            )}
            
            <button 
              className="btn-salvar"
              onClick={salvarAssinatura}
              disabled={salvandoAssinatura || !hasSignature}
            >
              {salvandoAssinatura ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Salvando...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Salvar Assinatura
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="assinatura-info-box">
        <i className="fas fa-shield-alt"></i>
        <div>
          <h4>Segurança e Conformidade</h4>
          <p>
            Sua assinatura digital será aplicada automaticamente em documentos aprovados,
            garantindo rastreabilidade e validade jurídica. Todos os documentos assinados
            incluem hash SHA-1 para verificação de integridade.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GerenciarAssinaturaAdmin;
