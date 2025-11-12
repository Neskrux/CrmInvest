import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import config from '../config';
import './GestaoBoletosAdmin.css';

const FILTROS_PADRAO = {
  status: '',
  vencimento_de: '',
  vencimento_ate: '',
  paciente_id: '',
  clinica_id: '',
  gerar_boleto: '',
  boleto_gerado: ''
};

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: '#ab6400', bg: '#fef3c7' },
  { value: 'pago', label: 'Pago', color: '#065f46', bg: '#dcfce7' },
  { value: 'vencido', label: 'Vencido', color: '#991b1b', bg: '#fee2e2' },
  { value: 'cancelado', label: 'Cancelado', color: '#475569', bg: '#e2e8f0' }
];

const STATUS_LOOKUP = STATUS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const GestaoBoletosAdmin = () => {
  const { makeRequest, user } = useAuth();
  const location = useLocation();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const pacienteIdInicial = location.state?.pacienteId ? String(location.state?.pacienteId) : '';
  const isClinicaUser = user?.tipo === 'clinica';
  const clinicaIdAtual = user?.clinica_id ? String(user.clinica_id) : '';
  
  const [todosBoletos, setTodosBoletos] = useState([]);
  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_PADRAO);
  const [filtrosIniciaisAplicados, setFiltrosIniciaisAplicados] = useState(false);
  
  const [showImportArquivoModal, setShowImportArquivoModal] = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [clinicas, setClinicas] = useState([]);
  const [loadingClinicas, setLoadingClinicas] = useState(false);
  const [importArquivoData, setImportArquivoData] = useState({
    paciente_id: '',
    data_vencimento: '',
    valor: '',
    arquivo: null
  });
  const [valorDisplay, setValorDisplay] = useState('');
  
  const [selectedBoletos, setSelectedBoletos] = useState([]);

  const aplicarFiltros = useCallback((listaBase, filtrosAplicar) => {
    const base = Array.isArray(listaBase) ? listaBase : [];
    const filtrosAtuais = filtrosAplicar || FILTROS_PADRAO;

    const parseData = (valor) => {
      if (!valor) return null;
      const data = new Date(valor);
      return Number.isNaN(data.getTime()) ? null : data;
    };

    const dataInicial = parseData(filtrosAtuais.vencimento_de);
    const dataFinal = parseData(filtrosAtuais.vencimento_ate);

    return base.filter((boleto) => {
      const statusBoleto = (boleto.status || '').toLowerCase();
      if (filtrosAtuais.status && statusBoleto !== filtrosAtuais.status) return false;

      const dataBoleto = boleto.data_vencimento ? new Date(boleto.data_vencimento) : null;
      if (dataInicial && (!dataBoleto || dataBoleto < dataInicial)) return false;
      if (dataFinal && (!dataBoleto || dataBoleto > dataFinal)) return false;

      if (filtrosAtuais.paciente_id && String(boleto.paciente_id) !== filtrosAtuais.paciente_id) return false;
      if (filtrosAtuais.clinica_id && String(boleto.clinica_id) !== filtrosAtuais.clinica_id) return false;

      if (filtrosAtuais.gerar_boleto) {
        const filtroGerar = filtrosAtuais.gerar_boleto === 'true';
        const valorAtual = Boolean(boleto.gerar_boleto || boleto.deve_gerar_hoje);
        if (valorAtual !== filtroGerar) return false;
      }

      if (filtrosAtuais.boleto_gerado) {
        const filtroGerado = filtrosAtuais.boleto_gerado === 'true';
        const valorAtual = Boolean(boleto.boleto_gerado);
        if (valorAtual !== filtroGerado) return false;
      }

      return true;
    });
  }, []);

  const atualizarFiltros = useCallback((patch) => {
    setFiltros(prev => ({ ...prev, ...patch }));
    setSelectedBoletos([]);
  }, []);

  const limparFiltros = useCallback(() => {
    const filtrosReset = {
      ...FILTROS_PADRAO,
      ...(isClinicaUser && clinicaIdAtual ? { clinica_id: clinicaIdAtual } : {})
    };
    setFiltros(filtrosReset);
    setSelectedBoletos([]);
  }, [isClinicaUser, clinicaIdAtual]);

  const buscarBoletos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '500');

      const response = await makeRequest(`/boletos-gestao?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao buscar boletos');
      }

      let listaBoletos = Array.isArray(data?.boletos) ? data.boletos : [];
      if (isClinicaUser && clinicaIdAtual) {
        listaBoletos = listaBoletos.filter(boleto => String(boleto?.clinica_id) === clinicaIdAtual);
      }

      setTodosBoletos(listaBoletos);
      setSelectedBoletos([]);
    } catch (error) {
      console.error('Erro ao buscar boletos:', error);
      showErrorToast('Erro ao buscar boletos');
    } finally {
      setLoading(false);
    }
  }, [makeRequest, isClinicaUser, clinicaIdAtual, showErrorToast]);

  useEffect(() => {
    if (!filtrosIniciaisAplicados) return;
    buscarBoletos();
  }, [buscarBoletos, filtrosIniciaisAplicados]);

  const buscarPacientes = useCallback(async () => {
    setLoadingPacientes(true);
    try {
      const response = await makeRequest('/pacientes');
      const data = await response.json();

      if (response.ok) {
        const lista = Array.isArray(data) ? data : [];
        const filtrada = isClinicaUser && clinicaIdAtual
          ? lista.filter(paciente => String(paciente?.clinica_id) === clinicaIdAtual)
          : lista;
        setPacientes(filtrada);
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
    } finally {
      setLoadingPacientes(false);
    }
  }, [makeRequest, isClinicaUser, clinicaIdAtual]);

  const buscarClinicas = useCallback(async () => {
    if (isClinicaUser) return;
    setLoadingClinicas(true);
    try {
      const response = await makeRequest('/clinicas');
      const data = await response.json();

      if (response.ok) {
        setClinicas(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar clínicas:', error);
    } finally {
      setLoadingClinicas(false);
    }
  }, [makeRequest, isClinicaUser]);

  useEffect(() => {
    if (!filtrosIniciaisAplicados) return;
    buscarPacientes();
    if (!isClinicaUser) {
      buscarClinicas();
    }
  }, [buscarPacientes, buscarClinicas, filtrosIniciaisAplicados, isClinicaUser]);

  useEffect(() => {
    if (filtrosIniciaisAplicados) return;
    const filtrosBase = {
      ...FILTROS_PADRAO,
      ...(isClinicaUser && clinicaIdAtual ? { clinica_id: clinicaIdAtual } : {}),
      ...(pacienteIdInicial ? { paciente_id: pacienteIdInicial } : {})
    };
    setFiltros(filtrosBase);
    setFiltrosIniciaisAplicados(true);
  }, [isClinicaUser, clinicaIdAtual, pacienteIdInicial, filtrosIniciaisAplicados]);

  const pacientesMap = useMemo(() => {
    const map = {};
    pacientes.forEach(paciente => {
      map[String(paciente.id)] = paciente.nome || '';
    });
    return map;
  }, [pacientes]);

  const clinicasMap = useMemo(() => {
    const map = {};
    clinicas.forEach(clinica => {
      map[String(clinica.id)] = clinica.nome || '';
    });
    if (isClinicaUser && clinicaIdAtual && user?.nome) {
      map[clinicaIdAtual] = user.nome;
    }
    return map;
  }, [clinicas, isClinicaUser, clinicaIdAtual, user?.nome]);

  const enriquecerBoletos = useCallback((lista) => {
    return (Array.isArray(lista) ? lista : []).map(boleto => {
      const pacienteNome = boleto.paciente_nome || pacientesMap[String(boleto.paciente_id)] || '—';
      const clinicaNome = boleto.clinica_nome || clinicasMap[String(boleto.clinica_id)] || (isClinicaUser && user?.nome ? user.nome : '—');
      return {
        ...boleto,
        paciente_nome: pacienteNome,
        clinica_nome: clinicaNome
      };
    });
  }, [pacientesMap, clinicasMap, isClinicaUser, user?.nome]);

  useEffect(() => {
    const enriquecidos = enriquecerBoletos(todosBoletos);
    setBoletos(aplicarFiltros(enriquecidos, filtros));
  }, [todosBoletos, filtros, aplicarFiltros, enriquecerBoletos]);

  useEffect(() => {
    if (!importArquivoData.valor) {
      setValorDisplay('');
      return;
    }
    const numero = parseFloat(importArquivoData.valor);
    if (Number.isNaN(numero)) {
      setValorDisplay('');
      return;
    }
    setValorDisplay(
      numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }, [importArquivoData.valor]);

  const handleValorInputChange = useCallback((value) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) {
      setValorDisplay('');
      setImportArquivoData(prev => ({ ...prev, valor: '' }));
      return;
    }
    const numero = parseInt(digitsOnly, 10) / 100;
    setValorDisplay(
      numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
    setImportArquivoData(prev => ({ ...prev, valor: numero.toFixed(2) }));
  }, []);

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
        setValorDisplay('');
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

  const podeGerenciar = !isClinicaUser;
  const colunasTotais = podeGerenciar ? 9 : 8;
  const statusSelectOptions = useMemo(() => STATUS_OPTIONS, []);

  return (
    <div className="gestao-boletos-container">
      <div className="header">
        <h1>Gestão de Boletos</h1>
        {podeGerenciar && (
          <div className="header-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowImportArquivoModal(true)}
            >
              Importar Boleto
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtro-group">
          <label>Status</label>
          <select 
            value={filtros.status}
            onChange={(e) => atualizarFiltros({ status: e.target.value })}
          >
            <option value="">Todos</option>
            {statusSelectOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-group">
          <label>Vencimento De</label>
          <input 
            type="date"
            value={filtros.vencimento_de}
            onChange={(e) => atualizarFiltros({ vencimento_de: e.target.value })}
          />
        </div>

        <div className="filtro-group">
          <label>Vencimento Até</label>
          <input 
            type="date"
            value={filtros.vencimento_ate}
            onChange={(e) => atualizarFiltros({ vencimento_ate: e.target.value })}
          />
        </div>

        <div className="filtro-group">
          <label>Gerar Boleto</label>
          <select 
            value={filtros.gerar_boleto}
            onChange={(e) => atualizarFiltros({ gerar_boleto: e.target.value })}
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
            onChange={(e) => atualizarFiltros({ boleto_gerado: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>

        <div className="filtro-group filtro-paciente">
          <label>Paciente</label>
          <select 
            value={filtros.paciente_id}
            onChange={(e) => atualizarFiltros({ paciente_id: e.target.value })}
            disabled={loadingPacientes}
          >
            <option value="">Todos</option>
            {pacientes.map((paciente) => (
              <option key={paciente.id} value={paciente.id}>
                {paciente.nome} {paciente.telefone ? `- ${paciente.telefone}` : ''}
              </option>
            ))}
          </select>
        </div>

        {!isClinicaUser && (
          <div className="filtro-group filtro-clinica">
            <label>Clínica</label>
            <select 
              value={filtros.clinica_id}
              onChange={(e) => atualizarFiltros({ clinica_id: e.target.value })}
              disabled={loadingClinicas}
            >
              <option value="">Todas</option>
              {clinicas.map((clinica) => (
                <option key={clinica.id} value={clinica.id}>
                  {clinica.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filtro-actions">
          <button 
            className="btn btn-secondary"
            onClick={limparFiltros}
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Ações em lote */}
      {podeGerenciar && selectedBoletos.length > 0 && (
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
          <>
            {/* Layout Desktop - Tabela */}
            <table className="tabela-boletos tabela-desktop">
              <thead>
                <tr>
                  {podeGerenciar && (
                    <th className="col-checkbox">
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
                  )}
                  <th className="col-paciente">Paciente</th>
                  <th className="col-clinica">Clínica</th>
                  <th className="col-parcela">Parcela</th>
                  <th className="col-valor">Valor</th>
                  <th className="col-vencimento">Vencimento</th>
                  <th className="col-status">Status</th>
                  <th className="col-boleto-gerado">Boleto Gerado</th>
                  <th className="col-acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {boletos.map(boleto => (
                  <tr key={boleto.id}>
                    {podeGerenciar && (
                      <td className="col-checkbox">
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
                    )}
                    <td className="col-paciente">{boleto.paciente_nome || '—'}</td>
                    <td className="col-clinica">{boleto.clinica_nome || '—'}</td>
                    <td className="col-parcela">
                      {(() => {
                        const parcelaNumero = boleto.numero_parcela || boleto.parcela_atual;
                        const totalParcelas = boleto.total_parcelas ?? boleto.qtd_parcelas ?? boleto.numero_parcelas_total ?? boleto.parcelas_totais;
                        if (!parcelaNumero && !totalParcelas) return '—';
                        if (parcelaNumero && totalParcelas) return `${parcelaNumero}/${totalParcelas}`;
                        if (parcelaNumero) return `Parcela ${parcelaNumero}`;
                        return `Total ${totalParcelas}`;
                      })()}
                    </td>
                    <td className="col-valor">{formatarValor(boleto.valor || boleto.valor_parcela)}</td>
                    <td className="col-vencimento">
                      {formatarData(boleto.data_vencimento)}
                      {boleto.dias_ate_vencimento && (
                        <span className="dias-vencimento">
                          ({boleto.dias_ate_vencimento > 0 ? `${boleto.dias_ate_vencimento}d` : 'Vencido'})
                        </span>
                      )}
                    </td>
                    <td className="col-status">
                      {(() => {
                        const statusKey = (boleto.status || '').toLowerCase();
                        const info = STATUS_LOOKUP[statusKey] || { label: boleto.status_display || 'Indefinido', color: '#334155', bg: '#e2e8f0' };
                        const label = boleto.status_display || info.label;
                        return (
                          <span className="status-pill" style={{ backgroundColor: info.bg, color: info.color }}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="col-boleto-gerado">
                      {boleto.boleto_gerado ? (
                        <span className="badge-sim">Sim</span>
                      ) : boleto.deve_gerar_hoje ? (
                        <span className="badge-pendente">Pendente</span>
                      ) : (
                        <span className="badge-nao">Não</span>
                      )}
                    </td>
                    <td className="col-acoes">
                      <div className="acoes">
                        {podeGerenciar && (
                          <div className="acoes-status-group">
                            {statusSelectOptions.map(option => {
                              const ativo = option.value === (boleto.status || '').toLowerCase();
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={`acao-status-btn ${ativo ? 'ativo' : ''}`}
                                  style={{
                                    borderColor: option.color,
                                    color: ativo ? '#ffffff' : option.color,
                                    backgroundColor: ativo ? option.color : 'transparent'
                                  }}
                                  disabled={ativo || loading}
                                  onClick={() => handleAtualizarStatus(boleto.id, option.value)}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
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

            {/* Layout Mobile - Cards */}
            <div className="boletos-cards-mobile">
              {boletos.map(boleto => (
                <div key={boleto.id} className="boleto-card">
                  {podeGerenciar && (
                    <div className="card-checkbox">
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
                    </div>
                  )}
                  <div className="card-header">
                    <div className="card-paciente">{boleto.paciente_nome || '—'}</div>
                    {(() => {
                      const statusKey = (boleto.status || '').toLowerCase();
                      const info = STATUS_LOOKUP[statusKey] || { label: boleto.status_display || 'Indefinido', color: '#334155', bg: '#e2e8f0' };
                      const label = boleto.status_display || info.label;
                      return (
                        <span className="status-pill" style={{ backgroundColor: info.bg, color: info.color }}>
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="card-body">
                    <div className="card-row">
                      <span className="card-label">Valor:</span>
                      <span className="card-value card-valor">{formatarValor(boleto.valor || boleto.valor_parcela)}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Vencimento:</span>
                      <span className="card-value">
                        {formatarData(boleto.data_vencimento)}
                        {boleto.dias_ate_vencimento && (
                          <span className="dias-vencimento">
                            {' '}({boleto.dias_ate_vencimento > 0 ? `${boleto.dias_ate_vencimento}d` : 'Vencido'})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="card-actions">
                    {podeGerenciar && (
                      <div className="acoes-status-group">
                        {statusSelectOptions.map(option => {
                          const ativo = option.value === (boleto.status || '').toLowerCase();
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`acao-status-btn ${ativo ? 'ativo' : ''}`}
                              style={{
                                borderColor: option.color,
                                color: ativo ? '#ffffff' : option.color,
                                backgroundColor: ativo ? option.color : 'transparent'
                              }}
                              disabled={ativo || loading}
                              onClick={() => handleAtualizarStatus(boleto.id, option.value)}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {boleto.url_boleto && (
                      <a 
                        href={boleto.url_boleto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-link"
                      >
                        Ver Boleto
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de importação de boleto com arquivo */}
      {podeGerenciar && showImportArquivoModal && (
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f9fafb'
              }}>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={valorDisplay}
                  onChange={(e) => handleValorInputChange(e.target.value)}
                  placeholder="0,00"
                  style={{
                    flex: 1,
                    border: 'none',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    background: 'transparent',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.parentElement.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.target.parentElement.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>
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
                  setValorDisplay('');
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
