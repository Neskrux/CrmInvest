import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import config from '../config';
import './GestaoBoletosAdmin.css';

const GestaoBoletosAdmin = () => {
  const { makeRequest } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  
  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    status: '',
    vencimento_de: '',
    vencimento_ate: '',
    paciente_id: '',
    clinica_id: '',
    gerar_boleto: '',
    boleto_gerado: ''
  });
  
  const [showImportArquivoModal, setShowImportArquivoModal] = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [importArquivoData, setImportArquivoData] = useState({
    paciente_id: '',
    data_vencimento: '',
    valor: '',
    arquivo: null
  });
  
  const [selectedBoletos, setSelectedBoletos] = useState([]);
  const [editingBoleto, setEditingBoleto] = useState(null);
  
  const [paginacao, setPaginacao] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  // Buscar boletos
  const buscarBoletos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params.append(key, filtros[key]);
      });
      params.append('page', paginacao.page);
      params.append('limit', paginacao.limit);
      
      const response = await makeRequest(`/boletos-gestao?${params.toString()}`);
      const data = await response.json();
      
      setBoletos(data.boletos || []);
      setPaginacao(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages
      }));
    } catch (error) {
      console.error('Erro ao buscar boletos:', error);
      showErrorToast('Erro ao buscar boletos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarBoletos();
    buscarPacientes();
  }, [paginacao.page, filtros]);

  // Buscar lista de pacientes
  const buscarPacientes = async () => {
    setLoadingPacientes(true);
    try {
      const response = await makeRequest('/pacientes');
      const data = await response.json();
      
      if (response.ok) {
        setPacientes(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
    } finally {
      setLoadingPacientes(false);
    }
  };

  // Importar boleto com arquivo PDF
  const handleImportarBoletoArquivo = async () => {
    if (!importArquivoData.paciente_id) {
      showErrorToast('Selecione um paciente');
      return;
    }

    if (!importArquivoData.data_vencimento) {
      showErrorToast('Informe a data de vencimento');
      return;
    }

    if (!importArquivoData.valor) {
      showErrorToast('Informe o valor do boleto');
      return;
    }

    if (!importArquivoData.arquivo) {
      showErrorToast('Selecione o arquivo PDF do boleto');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('paciente_id', importArquivoData.paciente_id);
      formData.append('data_vencimento', importArquivoData.data_vencimento);
      formData.append('valor', importArquivoData.valor);
      formData.append('arquivo', importArquivoData.arquivo);

      const token = localStorage.getItem('token');
      const response = await fetch(`${config.API_BASE_URL}/boletos-gestao/importar-arquivo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast(data.message);
        setShowImportArquivoModal(false);
        setImportArquivoData({
          paciente_id: '',
          data_vencimento: '',
          valor: '',
          arquivo: null
        });
        buscarBoletos();
      } else {
        showErrorToast(data.error || 'Erro ao importar boleto');
      }
    } catch (error) {
      console.error('Erro ao importar boleto:', error);
      showErrorToast('Erro ao importar boleto');
    } finally {
      setLoading(false);
    }
  };


  // Atualizar status do boleto
  const handleAtualizarStatus = async (boletoId, novoStatus) => {
    try {
      const updateData = { status: novoStatus };
      
      if (novoStatus === 'pago') {
        const dataPagamento = window.prompt('Data de pagamento (AAAA-MM-DD):');
        if (!dataPagamento) return;
        updateData.data_pagamento = dataPagamento;
        
        const valorPago = window.prompt('Valor pago:');
        if (valorPago) updateData.valor_pago = parseFloat(valorPago);
      }
      
      const response = await makeRequest(`/boletos-gestao/${boletoId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        showSuccessToast('Status atualizado com sucesso');
        buscarBoletos();
      } else {
        const data = await response.json();
        showErrorToast(data.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showErrorToast('Erro ao atualizar status');
    }
  };

  // Atualizar status em lote
  const handleAtualizarStatusLote = async (novoStatus) => {
    if (selectedBoletos.length === 0) {
      showErrorToast('Selecione pelo menos um boleto');
      return;
    }
    
    try {
      const updateData = { 
        ids: selectedBoletos,
        status: novoStatus 
      };
      
      if (novoStatus === 'pago') {
        const dataPagamento = window.prompt('Data de pagamento (AAAA-MM-DD):');
        if (!dataPagamento) return;
        updateData.data_pagamento = dataPagamento;
      }
      
      const response = await makeRequest('/boletos-gestao/atualizar-status-lote', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        const data = await response.json();
        showSuccessToast(data.message);
        setSelectedBoletos([]);
        buscarBoletos();
      } else {
        const data = await response.json();
        showErrorToast(data.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar boletos em lote:', error);
      showErrorToast('Erro ao atualizar boletos em lote');
    }
  };


  // Formatar data
  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Formatar valor
  const formatarValor = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Calcular status visual
  const getStatusColor = (boleto) => {
    if (boleto.status === 'pago') return '#10b981';
    if (boleto.status === 'cancelado') return '#6b7280';
    if (new Date(boleto.data_vencimento) < new Date() && boleto.status !== 'pago') return '#ef4444';
    return '#3b82f6';
  };

  return (
    <div className="gestao-boletos-container">
      <div className="header">
        <h1>Gestão de Boletos</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowImportArquivoModal(true)}
          >
            Importar Boleto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtro-group">
          <label>Status</label>
          <select 
            value={filtros.status}
            onChange={(e) => setFiltros({...filtros, status: e.target.value})}
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="filtro-group">
          <label>Vencimento De</label>
          <input 
            type="date"
            value={filtros.vencimento_de}
            onChange={(e) => setFiltros({...filtros, vencimento_de: e.target.value})}
          />
        </div>

        <div className="filtro-group">
          <label>Vencimento Até</label>
          <input 
            type="date"
            value={filtros.vencimento_ate}
            onChange={(e) => setFiltros({...filtros, vencimento_ate: e.target.value})}
          />
        </div>

        <div className="filtro-group">
          <label>Gerar Boleto</label>
          <select 
            value={filtros.gerar_boleto}
            onChange={(e) => setFiltros({...filtros, gerar_boleto: e.target.value})}
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>

        <div className="filtro-group">
          <label>Boleto Gerado</label>
          <select 
            value={filtros.boleto_gerado}
            onChange={(e) => setFiltros({...filtros, boleto_gerado: e.target.value})}
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => setFiltros({
            status: '',
            vencimento_de: '',
            vencimento_ate: '',
            paciente_id: '',
            clinica_id: '',
            gerar_boleto: '',
            boleto_gerado: ''
          })}
        >
          Limpar Filtros
        </button>
      </div>

      {/* Ações em lote */}
      {selectedBoletos.length > 0 && (
        <div className="acoes-lote">
          <span>{selectedBoletos.length} boleto(s) selecionado(s)</span>
          <button 
            className="btn btn-success btn-sm"
            onClick={() => handleAtualizarStatusLote('pago')}
          >
            Marcar como Pago
          </button>
          <button 
            className="btn btn-danger btn-sm"
            onClick={() => handleAtualizarStatusLote('cancelado')}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedBoletos([])}
          >
            Desmarcar Todos
          </button>
        </div>
      )}

      {/* Tabela de boletos */}
      <div className="tabela-container">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <table className="tabela-boletos">
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox"
                    checked={selectedBoletos.length === boletos.length && boletos.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBoletos(boletos.map(b => b.id));
                      } else {
                        setSelectedBoletos([]);
                      }
                    }}
                  />
                </th>
                <th>Paciente</th>
                <th>Clínica</th>
                <th>Parcela</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Boleto Gerado</th>
                <th>Nosso Número</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {boletos.map(boleto => (
                <tr key={boleto.id}>
                  <td>
                    <input 
                      type="checkbox"
                      checked={selectedBoletos.includes(boleto.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBoletos([...selectedBoletos, boleto.id]);
                        } else {
                          setSelectedBoletos(selectedBoletos.filter(id => id !== boleto.id));
                        }
                      }}
                    />
                  </td>
                  <td>{boleto.paciente_nome}</td>
                  <td>{boleto.clinica_nome}</td>
                  <td>{boleto.numero_parcela}/{boleto.total_parcelas || '-'}</td>
                  <td>{formatarValor(boleto.valor)}</td>
                  <td>
                    {formatarData(boleto.data_vencimento)}
                    {boleto.dias_ate_vencimento && (
                      <span className="dias-vencimento">
                        ({boleto.dias_ate_vencimento > 0 ? `${boleto.dias_ate_vencimento}d` : 'Vencido'})
                      </span>
                    )}
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(boleto) }}
                    >
                      {boleto.status_display}
                    </span>
                  </td>
                  <td>
                    {boleto.boleto_gerado ? (
                      <span className="badge-sim">Sim</span>
                    ) : boleto.deve_gerar_hoje ? (
                      <span className="badge-pendente">Pendente</span>
                    ) : (
                      <span className="badge-nao">Não</span>
                    )}
                  </td>
                  <td>{boleto.nosso_numero || '-'}</td>
                  <td>
                    <div className="acoes">
                      <select 
                        value=""
                        onChange={(e) => handleAtualizarStatus(boleto.id, e.target.value)}
                        disabled={boleto.status === 'pago' || boleto.status === 'cancelado'}
                      >
                        <option value="">Alterar Status</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="vencido">Vencido</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      
                      {boleto.url_boleto && (
                        <a 
                          href={boleto.url_boleto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-link"
                        >
                          Ver
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      <div className="paginacao">
        <button 
          onClick={() => setPaginacao({...paginacao, page: paginacao.page - 1})}
          disabled={paginacao.page === 1}
        >
          Anterior
        </button>
        <span>
          Página {paginacao.page} de {paginacao.totalPages || 1} ({paginacao.total} registros)
        </span>
        <button 
          onClick={() => setPaginacao({...paginacao, page: paginacao.page + 1})}
          disabled={paginacao.page >= paginacao.totalPages}
        >
          Próxima
        </button>
      </div>

      {/* Modal de importação de boleto com arquivo */}
      {showImportArquivoModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Importar Boleto</h2>
            <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
              Selecione o paciente, informe a data de vencimento e faça upload do arquivo PDF do boleto.
              O boleto ficará visível para o paciente e para a clínica.
            </p>
            
            <div className="form-group">
              <label>Paciente *</label>
              <select
                value={importArquivoData.paciente_id}
                onChange={(e) => setImportArquivoData({...importArquivoData, paciente_id: e.target.value})}
                disabled={loadingPacientes}
                required
              >
                <option value="">Selecione um paciente</option>
                {pacientes.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nome} {paciente.telefone && `- ${paciente.telefone}`}
                  </option>
                ))}
              </select>
              {loadingPacientes && <small style={{ color: '#666' }}>Carregando pacientes...</small>}
            </div>
            
            <div className="form-group">
              <label>Data de Vencimento *</label>
              <input 
                type="date"
                value={importArquivoData.data_vencimento}
                onChange={(e) => setImportArquivoData({...importArquivoData, data_vencimento: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Valor (R$) *</label>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={importArquivoData.valor}
                onChange={(e) => setImportArquivoData({...importArquivoData, valor: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Arquivo PDF do Boleto *</label>
              <input 
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setImportArquivoData({...importArquivoData, arquivo: e.target.files[0]})}
                required
              />
              {importArquivoData.arquivo && (
                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                  Arquivo selecionado: {importArquivoData.arquivo.name}
                </small>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={handleImportarBoletoArquivo}
                disabled={loading}
              >
                {loading ? 'Importando...' : 'Importar Boleto'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportArquivoModal(false);
                  setImportArquivoData({
                    paciente_id: '',
                    data_vencimento: '',
                    valor: '',
                    arquivo: null
                  });
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestaoBoletosAdmin;
