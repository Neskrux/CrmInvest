import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import config from '../config';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import './Pacientes.css';

const Pacientes = () => {
  const { user } = useContext(AuthContext);
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  
  const isConsultor = user?.tipo === 'consultor';
  const isAdmin = user?.tipo === 'admin';
  
  // Estados principais
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' ou 'pacientes'
  const [loading, setLoading] = useState(true);
  
  // Estados para leads
  const [leads, setLeads] = useState([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  
  // Estados para pacientes
  const [pacientes, setPacientes] = useState([]);
  const [showPacienteModal, setShowPacienteModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState(null);
  
  // Estados para filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    status: '',
    responsavel: '',
    dataInicio: '',
    dataFim: ''
  });
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Estados para upload de documentos
  const [uploading, setUploading] = useState(false);
  const [arquivos, setArquivos] = useState({
    selfie_doc: null,
    documento: null,
    comprovante_residencia: null,
    contrato_servico: null,
    confirmacao_sacado: null
  });
  
  // Form data para lead
  const [leadFormData, setLeadFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    cidade: '',
    estado: '',
    tipo_tratamento: '',
    status: 'lead',
    observacoes: '',
    consultor_id: isConsultor ? user?.id : ''
  });
  
  // Form data para paciente
  const [pacienteFormData, setPacienteFormData] = useState({
    cpf: '',
    nome: '',
    contato: '',
    valor_parcela: '',
    numero_parcelas: '',
    vencimento: '',
    valor_tratamento: '',
    antecipacao_meses: '',
    data_operacao: '',
    entregue: false,
    analise: '',
    responsavel: '',
    observacoes_financeiras: '',
    status: 'novo'
  });

  // Status options para leads
  const leadStatusOptions = [
    { value: 'lead', label: 'Lead', color: '#3b82f6', description: 'Novo lead cadastrado' },
    { value: 'em_conversa', label: 'Em Conversa', color: '#f59e0b', description: 'Consultor está conversando com o paciente' },
    { value: 'nao_responde', label: 'Não Responde', color: '#6b7280', description: 'Paciente não respondeu as tentativas de contato' },
    { value: 'cpf_aprovado', label: 'CPF Aprovado', color: '#8b5cf6', description: 'CPF foi consultado e aprovado' },
    { value: 'nao_elegivel', label: 'Não Elegível', color: '#ef4444', description: 'Paciente não elegível para o crédito' },
    { value: 'sem_interesse', label: 'Sem Interesse', color: '#ef4444', description: 'Paciente não tem interesse' },
    { value: 'agendado', label: 'Agendado', color: '#22c55e', description: 'Consulta agendada com a clínica' },
    { value: 'compareceu', label: 'Compareceu', color: '#10b981', description: 'Paciente compareceu à clínica' },
    { value: 'fechado', label: 'Fechado', color: '#059669', description: 'Contrato fechado - venda realizada!' },
    { value: 'reagendado', label: 'Reagendado', color: '#f97316', description: 'Consulta foi reagendada' }
  ];

  // Status options para pacientes financeiros
  const pacienteStatusOptions = [
    { value: 'novo', label: 'Novo', color: '#6b7280' },
    { value: 'em_analise', label: 'Em Análise', color: '#f59e0b' },
    { value: 'aprovado', label: 'Aprovado', color: '#10b981' },
    { value: 'reprovado', label: 'Reprovado', color: '#ef4444' },
    { value: 'pendente_documentos', label: 'Pendente Documentos', color: '#8b5cf6' },
    { value: 'operacao_realizada', label: 'Operação Realizada', color: '#3b82f6' },
    { value: 'finalizado', label: 'Finalizado', color: '#059669' }
  ];

  // Buscar dados
  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar leads
      const leadsResponse = await axios.get(`${config.apiUrl}/api/pacientes`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setLeads(leadsResponse.data || []);
      
      // Buscar pacientes
      const pacientesResponse = await axios.get(`${config.apiUrl}/api/pacientes-financeiro`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPacientes(pacientesResponse.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      showErrorToast('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Funções de formatação
  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    const cleaned = telefone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return telefone;
  };

  const formatarData = (data) => {
    if (!data) return '';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor) => {
    if (!valor) return '';
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d,-]/g, '').replace(',', '.')) : valor;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numero);
  };

  // Filtrar dados
  const filtrarDados = (dados) => {
    return dados.filter(item => {
      const matchNome = !filtros.nome || item.nome?.toLowerCase().includes(filtros.nome.toLowerCase());
      const matchTelefone = !filtros.telefone || (item.telefone || item.contato)?.includes(filtros.telefone);
      const matchCPF = !filtros.cpf || item.cpf?.includes(filtros.cpf);
      const matchStatus = !filtros.status || item.status === filtros.status;
      const matchResponsavel = !filtros.responsavel || item.responsavel?.toLowerCase().includes(filtros.responsavel.toLowerCase());
      
      let matchData = true;
      if (filtros.dataInicio || filtros.dataFim) {
        const dataItem = item.created_at || item.data_operacao;
        if (dataItem) {
          const data = new Date(dataItem);
          if (filtros.dataInicio && data < new Date(filtros.dataInicio)) matchData = false;
          if (filtros.dataFim && data > new Date(filtros.dataFim)) matchData = false;
        }
      }
      
      return matchNome && matchTelefone && matchCPF && matchStatus && matchResponsavel && matchData;
    });
  };

  const dadosFiltrados = activeTab === 'leads' ? filtrarDados(leads) : filtrarDados(pacientes);
  const totalPages = Math.ceil(dadosFiltrados.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const dadosPaginados = dadosFiltrados.slice(startIndex, startIndex + PAGE_SIZE);

  // Salvar lead
  const handleSaveLead = async () => {
    try {
      setLoading(true);
      const url = editingLead 
        ? `${config.apiUrl}/api/pacientes/${editingLead.id}`
        : `${config.apiUrl}/api/pacientes`;
      const method = editingLead ? 'put' : 'post';
      
      await axios[method](url, leadFormData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      showSuccessToast(editingLead ? 'Lead atualizado!' : 'Lead cadastrado!');
      setShowLeadModal(false);
      setEditingLead(null);
      resetLeadForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      showErrorToast('Erro ao salvar lead');
    } finally {
      setLoading(false);
    }
  };

  // Salvar paciente
  const handleSavePaciente = async () => {
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      
      // Adicionar dados do formulário
      Object.keys(pacienteFormData).forEach(key => {
        formDataToSend.append(key, pacienteFormData[key]);
      });
      
      // Adicionar arquivos
      Object.keys(arquivos).forEach(key => {
        if (arquivos[key]) {
          formDataToSend.append(key, arquivos[key]);
        }
      });
      
      const url = editingPaciente 
        ? `${config.apiUrl}/api/pacientes-financeiro/${editingPaciente.id}`
        : `${config.apiUrl}/api/pacientes-financeiro`;
      const method = editingPaciente ? 'put' : 'post';
      
      await axios[method](url, formDataToSend, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      showSuccessToast(editingPaciente ? 'Paciente atualizado!' : 'Paciente cadastrado!');
      setShowPacienteModal(false);
      setEditingPaciente(null);
      resetPacienteForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      showErrorToast('Erro ao salvar paciente');
    } finally {
      setLoading(false);
    }
  };

  // Reset forms
  const resetLeadForm = () => {
    setLeadFormData({
      nome: '',
      telefone: '',
      cpf: '',
      cidade: '',
      estado: '',
      tipo_tratamento: '',
      status: 'lead',
      observacoes: '',
      consultor_id: isConsultor ? user?.id : ''
    });
  };

  const resetPacienteForm = () => {
    setPacienteFormData({
      cpf: '',
      nome: '',
      contato: '',
      valor_parcela: '',
      numero_parcelas: '',
      vencimento: '',
      valor_tratamento: '',
      antecipacao_meses: '',
      data_operacao: '',
      entregue: false,
      analise: '',
      responsavel: '',
      observacoes_financeiras: '',
      status: 'novo'
    });
    setArquivos({
      selfie_doc: null,
      documento: null,
      comprovante_residencia: null,
      contrato_servico: null,
      confirmacao_sacado: null
    });
  };

  // Editar lead
  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setLeadFormData({
      nome: lead.nome || '',
      telefone: lead.telefone || '',
      cpf: lead.cpf || '',
      cidade: lead.cidade || '',
      estado: lead.estado || '',
      tipo_tratamento: lead.tipo_tratamento || '',
      status: lead.status || 'lead',
      observacoes: lead.observacoes || '',
      consultor_id: lead.consultor_id || ''
    });
    setShowLeadModal(true);
  };

  // Editar paciente
  const handleEditPaciente = (paciente) => {
    setEditingPaciente(paciente);
    setPacienteFormData({
      cpf: paciente.cpf || '',
      nome: paciente.nome || '',
      contato: paciente.telefone || paciente.contato || '',
      valor_parcela: paciente.valor_parcela || '',
      numero_parcelas: paciente.numero_parcelas || '',
      vencimento: paciente.vencimento || '',
      valor_tratamento: paciente.valor_tratamento || '',
      antecipacao_meses: paciente.antecipacao_meses || '',
      data_operacao: paciente.data_operacao || '',
      entregue: paciente.entregue || false,
      analise: paciente.analise || '',
      responsavel: paciente.responsavel || '',
      observacoes_financeiras: paciente.observacoes_financeiras || '',
      status: paciente.status || 'novo'
    });
    setShowPacienteModal(true);
  };

  // Excluir
  const handleDelete = async (id, tipo) => {
    if (!window.confirm(`Tem certeza que deseja excluir este ${tipo === 'lead' ? 'lead' : 'paciente'}?`)) return;
    
    try {
      const url = tipo === 'lead' 
        ? `${config.apiUrl}/api/pacientes/${id}`
        : `${config.apiUrl}/api/pacientes-financeiro/${id}`;
        
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      showSuccessToast(`${tipo === 'lead' ? 'Lead' : 'Paciente'} excluído com sucesso!`);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showErrorToast('Erro ao excluir');
    }
  };

  // Download documento
  const handleDownload = (url, filename) => {
    window.open(url, '_blank');
  };

  return (
    <div className="pacientes-container">
      <h1 className="page-title">Gestão de Leads e Pacientes</h1>

      {/* Abas principais */}
      <div className="tabs" style={{ marginBottom: '2rem' }}>
        <button
          className={`tab ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('leads');
            setCurrentPage(1);
          }}
        >
          Leads
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
            ({leads.length})
          </span>
        </button>
        <button
          className={`tab ${activeTab === 'pacientes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('pacientes');
            setCurrentPage(1);
          }}
        >
          Pacientes
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
            ({pacientes.length})
          </span>
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title" style={{ fontSize: '1.1rem' }}>Filtros</h2>
          <button className="btn btn-secondary" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
        </div>
        {mostrarFiltros && (
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb' }}>
            <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nome"
                value={filtros.nome}
                onChange={e => setFiltros({...filtros, nome: e.target.value})}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Telefone"
                value={filtros.telefone}
                onChange={e => setFiltros({...filtros, telefone: e.target.value})}
              />
              <input
                type="text"
                className="form-input"
                placeholder="CPF"
                value={filtros.cpf}
                onChange={e => setFiltros({...filtros, cpf: e.target.value})}
              />
            </div>
            <div className="grid grid-3" style={{ gap: '1rem' }}>
              <select
                className="form-select"
                value={filtros.status}
                onChange={e => setFiltros({...filtros, status: e.target.value})}
              >
                <option value="">Todos os Status</option>
                {(activeTab === 'leads' ? leadStatusOptions : pacienteStatusOptions).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {activeTab === 'pacientes' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Responsável"
                  value={filtros.responsavel}
                  onChange={e => setFiltros({...filtros, responsavel: e.target.value})}
                />
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="form-input"
                  value={filtros.dataInicio}
                  onChange={e => setFiltros({...filtros, dataInicio: e.target.value})}
                />
                <input
                  type="date"
                  className="form-input"
                  value={filtros.dataFim}
                  onChange={e => setFiltros({...filtros, dataFim: e.target.value})}
                />
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
              onClick={() => setFiltros({
                nome: '',
                telefone: '',
                cpf: '',
                status: '',
                responsavel: '',
                dataInicio: '',
                dataFim: ''
              })}
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Leads */}
      {activeTab === 'leads' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Lista de Leads</h2>
            <button className="btn btn-primary" onClick={() => setShowLeadModal(true)}>
              + Novo Lead
            </button>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : dadosPaginados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              Nenhum lead encontrado.
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>CPF</th>
                      <th>Cidade/UF</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Consultor</th>
                      <th>Cadastrado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPaginados.map(lead => {
                      const statusInfo = leadStatusOptions.find(s => s.value === lead.status) || leadStatusOptions[0];
                      return (
                        <tr key={lead.id}>
                          <td><strong>{lead.nome}</strong></td>
                          <td>{formatarTelefone(lead.telefone)}</td>
                          <td>{formatarCPF(lead.cpf)}</td>
                          <td>{lead.cidade ? `${lead.cidade}/${lead.estado}` : '-'}</td>
                          <td>
                            {lead.tipo_tratamento && (
                              <span className={`badge badge-${lead.tipo_tratamento === 'Estético' ? 'info' : 'warning'}`}>
                                {lead.tipo_tratamento}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>{lead.consultor_nome || '-'}</td>
                          <td>{formatarData(lead.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleEditLead(lead)}
                                className="btn-action"
                                title="Editar"
                              >
                                ✏️
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(lead.id, 'lead')}
                                  className="btn-action"
                                  title="Excluir"
                                  style={{ color: '#dc2626' }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tabela de Pacientes */}
      {activeTab === 'pacientes' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Lista de Pacientes</h2>
            {(isAdmin || isConsultor) && (
              <button className="btn btn-primary" onClick={() => setShowPacienteModal(true)}>
                + Novo Paciente
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : dadosPaginados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              Nenhum paciente encontrado.
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>CPF</th>
                      <th>Nome</th>
                      <th>Contato</th>
                      <th>Valor Parcela</th>
                      <th>Nº Parcelas</th>
                      <th>Vencimento</th>
                      <th>Valor Total</th>
                      <th>Antecipação</th>
                      <th>Data Op.</th>
                      <th>Entregue</th>
                      <th>Análise</th>
                      <th>Resp.</th>
                      <th>Docs</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPaginados.map(paciente => {
                      const statusInfo = pacienteStatusOptions.find(s => s.value === paciente.status) || pacienteStatusOptions[0];
                      return (
                        <tr key={paciente.id}>
                          <td>
                            <span className="badge" style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color, fontSize: '0.75rem' }}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>{formatarCPF(paciente.cpf)}</td>
                          <td>
                            <strong>{paciente.nome}</strong>
                            {paciente.observacoes_financeiras && (
                              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                {paciente.observacoes_financeiras}
                              </div>
                            )}
                          </td>
                          <td>{formatarTelefone(paciente.telefone || paciente.contato)}</td>
                          <td>{formatarMoeda(paciente.valor_parcela)}</td>
                          <td>{paciente.numero_parcelas || '-'}</td>
                          <td>{formatarData(paciente.vencimento)}</td>
                          <td>{formatarMoeda(paciente.valor_tratamento)}</td>
                          <td>{paciente.antecipacao_meses ? `${paciente.antecipacao_meses}m` : '-'}</td>
                          <td>{formatarData(paciente.data_operacao)}</td>
                          <td>
                            <span className={`badge badge-${paciente.entregue ? 'success' : 'secondary'}`} style={{ fontSize: '0.7rem' }}>
                              {paciente.entregue ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td>{paciente.analise || '-'}</td>
                          <td>{paciente.responsavel || '-'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem', fontSize: '1.2rem' }}>
                              {paciente.selfie_doc_url && (
                                <button
                                  onClick={() => handleDownload(paciente.selfie_doc_url, 'selfie')}
                                  className="btn-action"
                                  title="Selfie com Doc"
                                >
                                  📷
                                </button>
                              )}
                              {paciente.documento_url && (
                                <button
                                  onClick={() => handleDownload(paciente.documento_url, 'doc')}
                                  className="btn-action"
                                  title="Documento"
                                >
                                  📄
                                </button>
                              )}
                              {paciente.comprovante_residencia_url && (
                                <button
                                  onClick={() => handleDownload(paciente.comprovante_residencia_url, 'comp')}
                                  className="btn-action"
                                  title="Comp. Residência"
                                >
                                  🏠
                                </button>
                              )}
                              {paciente.contrato_servico_url && (
                                <button
                                  onClick={() => handleDownload(paciente.contrato_servico_url, 'contrato')}
                                  className="btn-action"
                                  title="Contrato"
                                >
                                  📑
                                </button>
                              )}
                              {paciente.confirmacao_sacado_url && (
                                <button
                                  onClick={() => handleDownload(paciente.confirmacao_sacado_url, 'confirm')}
                                  className="btn-action"
                                  title="Conf. Sacado"
                                >
                                  ✅
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {(isAdmin || isConsultor) && (
                                <button
                                  onClick={() => handleEditPaciente(paciente)}
                                  className="btn-action"
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(paciente.id, 'paciente')}
                                  className="btn-action"
                                  title="Excluir"
                                  style={{ color: '#dc2626' }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Paginação */}
      {dadosPaginados.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Página {currentPage} de {totalPages} — {dadosFiltrados.length} registros
          </div>
          <div>
            <button
              className="btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ marginRight: '0.5rem' }}
            >
              Anterior
            </button>
            <button
              className="btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Modal Lead */}
      {showLeadModal && (
        <div className="modal-overlay" onClick={() => setShowLeadModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLead ? 'Editar Lead' : 'Novo Lead'}</h2>
              <button className="close-button" onClick={() => setShowLeadModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={leadFormData.nome}
                    onChange={e => setLeadFormData({...leadFormData, nome: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={leadFormData.telefone}
                    onChange={e => setLeadFormData({...leadFormData, telefone: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input
                    type="text"
                    className="form-input"
                    value={leadFormData.cpf}
                    onChange={e => setLeadFormData({...leadFormData, cpf: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={leadFormData.status}
                    onChange={e => setLeadFormData({...leadFormData, status: e.target.value})}
                  >
                    {leadStatusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input
                    type="text"
                    className="form-input"
                    value={leadFormData.cidade}
                    onChange={e => setLeadFormData({...leadFormData, cidade: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <input
                    type="text"
                    className="form-input"
                    value={leadFormData.estado}
                    onChange={e => setLeadFormData({...leadFormData, estado: e.target.value})}
                    maxLength="2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamento</label>
                  <select
                    className="form-select"
                    value={leadFormData.tipo_tratamento}
                    onChange={e => setLeadFormData({...leadFormData, tipo_tratamento: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  value={leadFormData.observacoes}
                  onChange={e => setLeadFormData({...leadFormData, observacoes: e.target.value})}
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLeadModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveLead} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paciente */}
      {showPacienteModal && (
        <div className="modal-overlay" onClick={() => setShowPacienteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{editingPaciente ? 'Editar Paciente' : 'Novo Paciente'}</h2>
              <button className="close-button" onClick={() => setShowPacienteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Dados básicos */}
              <h3>Dados Básicos</h3>
              <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">CPF *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pacienteFormData.cpf}
                    onChange={e => setPacienteFormData({...pacienteFormData, cpf: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pacienteFormData.nome}
                    onChange={e => setPacienteFormData({...pacienteFormData, nome: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contato *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pacienteFormData.contato}
                    onChange={e => setPacienteFormData({...pacienteFormData, contato: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={pacienteFormData.status}
                    onChange={e => setPacienteFormData({...pacienteFormData, status: e.target.value})}
                  >
                    {pacienteStatusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dados financeiros */}
              <h3>Dados Financeiros</h3>
              <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Valor da Parcela</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pacienteFormData.valor_parcela}
                    onChange={e => setPacienteFormData({...pacienteFormData, valor_parcela: e.target.value})}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nº de Parcelas</label>
                  <input
                    type="number"
                    className="form-input"
                    value={pacienteFormData.numero_parcelas}
                    onChange={e => setPacienteFormData({...pacienteFormData, numero_parcelas: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vencimento</label>
                  <input
                    type="date"
                    className="form-input"
                    value={pacienteFormData.vencimento}
                    onChange={e => setPacienteFormData({...pacienteFormData, vencimento: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Valor do Tratamento</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pacienteFormData.valor_tratamento}
                    onChange={e => setPacienteFormData({...pacienteFormData, valor_tratamento: e.target.value})}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Antecipação (meses)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={pacienteFormData.antecipacao_meses}
                    onChange={e => setPacienteFormData({...pacienteFormData, antecipacao_meses: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data da Operação</label>
                  <input
                    type="date"
                    className="form-input"
                    value={pacienteFormData.data_operacao}
                    onChange={e => setPacienteFormData({...pacienteFormData, data_operacao: e.target.value})}
                  />
                </div>
              </div>

              {/* Informações adicionais */}
              <h3>Informações Adicionais</h3>
              <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pacienteFormData.responsavel}
                    onChange={e => setPacienteFormData({...pacienteFormData, responsavel: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Análise</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pacienteFormData.analise}
                    onChange={e => setPacienteFormData({...pacienteFormData, analise: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={pacienteFormData.entregue}
                    onChange={e => setPacienteFormData({...pacienteFormData, entregue: e.target.checked})}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Entregue
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  value={pacienteFormData.observacoes_financeiras}
                  onChange={e => setPacienteFormData({...pacienteFormData, observacoes_financeiras: e.target.value})}
                  rows="3"
                />
              </div>

              {/* Documentos */}
              <h3>Documentos</h3>
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Selfie com Documento</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    onChange={e => setArquivos({...arquivos, selfie_doc: e.target.files[0]})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Documento (RG/CNH)</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*,.pdf"
                    onChange={e => setArquivos({...arquivos, documento: e.target.files[0]})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Comprovante de Residência</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*,.pdf"
                    onChange={e => setArquivos({...arquivos, comprovante_residencia: e.target.files[0]})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contrato de Serviço</label>
                  <input
                    type="file"
                    className="form-input"
                    accept=".pdf"
                    onChange={e => setArquivos({...arquivos, contrato_servico: e.target.files[0]})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmação do Sacado</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    onChange={e => setArquivos({...arquivos, confirmacao_sacado: e.target.files[0]})}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPacienteModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSavePaciente} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pacientes;

