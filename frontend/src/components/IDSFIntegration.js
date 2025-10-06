import React, { useState, useEffect } from 'react';
import './IDSFIntegration.css';

const IDSFIntegration = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [clinicaData, setClinicaData] = useState(null);
  const [error, setError] = useState(null);

  // Testar conexão com IDSF
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/idsf/test-connection');
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setError(result.error || 'Erro na conexão');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados de uma clínica
  const searchClinica = async () => {
    if (!cnpj || cnpj.length !== 14) {
      setError('CNPJ deve conter 14 dígitos');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/idsf/clinica/${cnpj}`);
      const result = await response.json();
      
      if (result.success) {
        setClinicaData(result.clinica);
      } else {
        setError(result.error || 'Erro ao buscar clínica');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  // Formatar CNPJ
  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted.replace(/\D/g, ''));
  };

  return (
    <div className="idsf-integration">
      <div className="idsf-header">
        <h2>🔗 Integração IDSF</h2>
        <p>Portal do Desenvolvedor: <a href="https://developers.idsf.com.br/" target="_blank" rel="noopener noreferrer">developers.idsf.com.br</a></p>
        <p>Contato: <a href="mailto:developers@idsf.com.br">developers@idsf.com.br</a></p>
      </div>

      {/* Status da Conexão */}
      <div className="connection-section">
        <h3>Status da Conexão</h3>
        <div className="connection-status">
          {connectionStatus === 'success' && (
            <div className="status-success">
              ✅ Conexão estabelecida com sucesso
            </div>
          )}
          {connectionStatus === 'error' && (
            <div className="status-error">
              ❌ Falha na conexão
            </div>
          )}
          {!connectionStatus && (
            <div className="status-pending">
              ⏳ Clique em "Testar Conexão" para verificar
            </div>
          )}
        </div>
        <button 
          onClick={testConnection} 
          disabled={loading}
          className="btn-test-connection"
        >
          {loading ? 'Testando...' : 'Testar Conexão'}
        </button>
      </div>

      {/* Busca de Clínica */}
      <div className="search-section">
        <h3>Buscar Clínica no IDSF</h3>
        <div className="search-form">
          <input
            type="text"
            placeholder="Digite o CNPJ (14 dígitos)"
            value={cnpj}
            onChange={handleCNPJChange}
            maxLength={14}
            className="cnpj-input"
          />
          <button 
            onClick={searchClinica} 
            disabled={loading || cnpj.length !== 14}
            className="btn-search"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {clinicaData && (
        <div className="clinica-results">
          <h3>Dados da Clínica</h3>
          <div className="clinica-card">
            <pre>{JSON.stringify(clinicaData, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Informações de Configuração */}
      <div className="config-info">
        <h3>📋 Configuração Necessária</h3>
        <div className="config-steps">
          <div className="step">
            <strong>1. Variáveis de Ambiente:</strong>
            <code>
              IDSF_BASE_URL=https://api.idsf.com.br<br/>
              IDSF_API_KEY=seu_token_aqui
            </code>
          </div>
          <div className="step">
            <strong>2. Solicitar Token:</strong>
            <p>Envie um e-mail para <a href="mailto:developers@idsf.com.br">developers@idsf.com.br</a> solicitando:</p>
            <ul>
              <li>Token de integração</li>
              <li>Documentação completa da API</li>
              <li>Lista de endpoints disponíveis</li>
            </ul>
          </div>
          <div className="step">
            <strong>3. Endpoints Disponíveis:</strong>
            <ul>
              <li><code>GET /api/idsf/test-connection</code> - Testar conexão</li>
              <li><code>GET /api/idsf/clinica/:cnpj</code> - Buscar clínica</li>
              <li><code>POST /api/idsf/clinica</code> - Cadastrar clínica</li>
              <li><code>GET /api/idsf/financiamento/:cnpj</code> - Status do financiamento</li>
              <li><code>POST /api/idsf/financiamento</code> - Solicitar financiamento</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDSFIntegration;




