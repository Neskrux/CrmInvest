import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
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
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState({
    fechamento_id: '',
    gerar_automatico: false,
    dias_antes_vencimento: 20
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
  }, [paginacao.page, filtros]);

  // Importar boletos
  const handleImportarBoletos = async () => {
    if (!importData.fechamento_id) {
      showErrorToast('Informe o ID do fechamento');
      return;
    }
    
    setLoading(true);
    try {
      const response = await makeRequest('/boletos-gestao/importar', {
        method: 'POST',
        body: JSON.stringify(importData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(data.message);
        setShowImportModal(false);
        setImportData({
          fechamento_id: '',
          gerar_automatico: false,
          dias_antes_vencimento: 20
        });
        buscarBoletos();
      } else {
        showErrorToast(data.error);
      }
    } catch (error) {
      console.error('Erro ao importar boletos:', error);
      showErrorToast('Erro ao importar boletos');
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

  // Gerar boletos pendentes
  const handleGerarBoletosPendentes = async () => {
    if (!window.confirm('Deseja gerar os boletos pendentes na Caixa?')) return;
    
    setLoading(true);
    try {
      const response = await makeRequest('/boletos-gestao/gerar-pendentes', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showSuccessToast(data.message);
        buscarBoletos();
      } else {
        showErrorToast(data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar boletos:', error);
      showErrorToast('Erro ao gerar boletos');
    } finally {
      setLoading(false);
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
            onClick={() => setShowImportModal(true)}
          >
            Importar Boletos
          </button>
          <button 
            className="btn btn-success"
            onClick={handleGerarBoletosPendentes}
            disabled={loading}
          >
            Gerar Boletos Pendentes
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

      {/* Modal de importação */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Importar Boletos de Fechamento</h2>
            
            <div className="form-group">
              <label>ID do Fechamento</label>
              <input 
                type="number"
                value={importData.fechamento_id}
                onChange={(e) => setImportData({...importData, fechamento_id: e.target.value})}
                placeholder="Digite o ID do fechamento"
              />
            </div>
            
            <div className="form-group">
              <label>
                <input 
                  type="checkbox"
                  checked={importData.gerar_automatico}
                  onChange={(e) => setImportData({...importData, gerar_automatico: e.target.checked})}
                />
                Gerar boleto automaticamente na Caixa
              </label>
            </div>
            
            {importData.gerar_automatico && (
              <div className="form-group">
                <label>Dias antes do vencimento para gerar</label>
                <input 
                  type="number"
                  value={importData.dias_antes_vencimento}
                  onChange={(e) => setImportData({...importData, dias_antes_vencimento: e.target.value})}
                />
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={handleImportarBoletos}
                disabled={loading}
              >
                Importar
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportData({
                    fechamento_id: '',
                    gerar_automatico: false,
                    dias_antes_vencimento: 20
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
