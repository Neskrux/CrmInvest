import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Fechamentos = () => {
  const { makeRequest } = useAuth();
  const [fechamentos, setFechamentos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [fechamentoEditando, setFechamentoEditando] = useState(null);
  const [novoFechamento, setNovoFechamento] = useState({
    paciente_id: '',
    consultor_id: '',
    clinica_id: '',
    agendamento_id: '',
    valor_fechado: '',
    valor_formatado: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    tipo_tratamento: '',
    forma_pagamento: '',
    observacoes: '',
    contrato: null
  });
  const [contratoSelecionado, setContratoSelecionado] = useState(null);

  const formasPagamento = [
    'À vista',
    'Parcelado 2x',
    'Parcelado 3x',
    'Parcelado 4x',
    'Parcelado 6x',
    'Parcelado 12x',
    'PIX',
    'Boleto',
    'Cartão de Crédito',
    'Cartão de Débito'
  ];

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      const [fechamentosRes, pacientesRes, consultoresRes, clinicasRes, agendamentosRes] = await Promise.all([
        makeRequest('/fechamentos'),
        makeRequest('/pacientes'),
        makeRequest('/consultores'),
        makeRequest('/clinicas'),
        makeRequest('/agendamentos')
      ]);

      // Verificar se todas as respostas foram bem-sucedidas
      if (!fechamentosRes.ok) {
        throw new Error(`Erro ao carregar fechamentos: ${fechamentosRes.status} - Tabela 'fechamentos' não encontrada. Execute a migração no Supabase.`);
      }

      const fechamentosData = await fechamentosRes.json();
      const pacientesData = await pacientesRes.json();
      const consultoresData = await consultoresRes.json();
      const clinicasData = await clinicasRes.json();
      const agendamentosData = await agendamentosRes.json();

      // Garantir que sempre sejam arrays
      setFechamentos(Array.isArray(fechamentosData) ? fechamentosData : []);
      setPacientes(Array.isArray(pacientesData) ? pacientesData : []);
      setConsultores(Array.isArray(consultoresData) ? consultoresData : []);
      setClinicas(Array.isArray(clinicasData) ? clinicasData : []);
      setAgendamentos(Array.isArray(agendamentosData) ? agendamentosData : []);
      
      setCarregando(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErro(error.message);
      setCarregando(false);
      
      // Em caso de erro, garantir arrays vazios
      setFechamentos([]);
      setPacientes([]);
      setConsultores([]);
      setClinicas([]);
      setAgendamentos([]);
    }
  }, [makeRequest]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const filtrarFechamentos = () => {
    if (!Array.isArray(fechamentos)) {
      return [];
    }
    return fechamentos.filter(fechamento => {
      const consultorMatch = !filtroConsultor || fechamento.consultor_id === parseInt(filtroConsultor);
      const clinicaMatch = !filtroClinica || fechamento.clinica_id === parseInt(filtroClinica);
      
      let mesMatch = true;
      if (filtroMes) {
        const dataFechamento = new Date(fechamento.data_fechamento);
        const [ano, mes] = filtroMes.split('-');
        mesMatch = dataFechamento.getFullYear() === parseInt(ano) && 
                   dataFechamento.getMonth() === parseInt(mes) - 1;
      }

      return consultorMatch && clinicaMatch && mesMatch;
    });
  };

  const calcularEstatisticas = () => {
    const fechamentosFiltrados = filtrarFechamentos();
    const total = fechamentosFiltrados.length;
    const valorTotal = fechamentosFiltrados.reduce((acc, f) => acc + parseFloat(f.valor_fechado || 0), 0);
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    
    const hoje = new Date().toISOString().split('T')[0];
    const fechamentosHoje = fechamentosFiltrados.filter(f => f.data_fechamento === hoje).length;

    const mesAtual = new Date();
    const fechamentosMes = fechamentosFiltrados.filter(f => {
      const dataFechamento = new Date(f.data_fechamento);
      return dataFechamento.getMonth() === mesAtual.getMonth() && 
             dataFechamento.getFullYear() === mesAtual.getFullYear();
    }).length;

    return { total, valorTotal, ticketMedio, fechamentosHoje, fechamentosMes };
  };

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtroConsultor) count++;
    if (filtroClinica) count++;
    if (filtroMes) count++;
    return count;
  };

  const limparFiltros = () => {
    setFiltroConsultor('');
    setFiltroClinica('');
    setFiltroMes('');
  };

  const abrirModal = (fechamento = null) => {
    if (fechamento) {
      setFechamentoEditando(fechamento);
      // Formatar o valor para exibição
      const valorFormatado = fechamento.valor_fechado 
        ? parseFloat(fechamento.valor_fechado).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        : '';
      
      setNovoFechamento({ 
        ...fechamento, 
        valor_formatado: valorFormatado,
        contrato: null
      });
    } else {
      setFechamentoEditando(null);
      setNovoFechamento({
        paciente_id: '',
        consultor_id: '',
        clinica_id: '',
        agendamento_id: '',
        valor_fechado: '',
        valor_formatado: '',
        data_fechamento: new Date().toISOString().split('T')[0],
        tipo_tratamento: '',
        forma_pagamento: '',
        observacoes: '',
        contrato: null
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setFechamentoEditando(null);
    setContratoSelecionado(null);
    setNovoFechamento({
      paciente_id: '',
      consultor_id: '',
      clinica_id: '',
      agendamento_id: '',
      valor_fechado: '',
      valor_formatado: '',
      data_fechamento: new Date().toISOString().split('T')[0],
      tipo_tratamento: '',
      forma_pagamento: '',
      observacoes: '',
      contrato: null
    });
  };

  const salvarFechamento = async () => {
    try {
      // Validar campos obrigatórios
      if (!novoFechamento.paciente_id) {
        alert('Por favor, selecione um paciente!');
        return;
      }
      
      if (!novoFechamento.valor_fechado || parseFloat(novoFechamento.valor_fechado) <= 0) {
        alert('Por favor, informe um valor válido!');
        return;
      }

      // Para novos fechamentos, validar se contrato foi selecionado
      if (!fechamentoEditando && !contratoSelecionado) {
        alert('Por favor, selecione o contrato em PDF!');
        return;
      }

      // Validar tipo de arquivo
      if (contratoSelecionado && contratoSelecionado.type !== 'application/pdf') {
        alert('Apenas arquivos PDF são permitidos para o contrato!');
        return;
      }

      // Validar tamanho do arquivo (máximo 10MB)
      if (contratoSelecionado && contratoSelecionado.size > 10 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 10MB!');
        return;
      }

      // Preparar FormData para envio com arquivo
      const formData = new FormData();
      
      // Adicionar campos do fechamento
      formData.append('paciente_id', parseInt(novoFechamento.paciente_id));
      
      // Só adicionar IDs se tiverem valor
      if (novoFechamento.consultor_id && novoFechamento.consultor_id.trim() !== '') {
        formData.append('consultor_id', parseInt(novoFechamento.consultor_id));
      }
      
      if (novoFechamento.clinica_id && novoFechamento.clinica_id.trim() !== '') {
        formData.append('clinica_id', parseInt(novoFechamento.clinica_id));
      }
      
      if (novoFechamento.agendamento_id && novoFechamento.agendamento_id.trim() !== '') {
        formData.append('agendamento_id', parseInt(novoFechamento.agendamento_id));
      }
      
      formData.append('valor_fechado', parseFloat(novoFechamento.valor_fechado));
      formData.append('data_fechamento', novoFechamento.data_fechamento);
      formData.append('tipo_tratamento', novoFechamento.tipo_tratamento || '');
      formData.append('forma_pagamento', novoFechamento.forma_pagamento || '');
      formData.append('observacoes', novoFechamento.observacoes || '');
      
      // Adicionar arquivo se selecionado
      if (contratoSelecionado) {
        formData.append('contrato', contratoSelecionado);
      }

      console.log('Enviando dados com arquivo...'); // Debug

      // Enviar dados - usar fetch diretamente para FormData
      const url = fechamentoEditando 
        ? `http://localhost:5000/api/fechamentos/${fechamentoEditando.id}`
        : 'http://localhost:5000/api/fechamentos';
      
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method: fechamentoEditando ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      console.log('Resposta do servidor:', result); // Debug

      if (response.ok) {
        carregarDados();
        fecharModal();
        alert(fechamentoEditando ? 'Fechamento atualizado!' : `Fechamento registrado com sucesso! Contrato: ${result.contrato || 'anexado'}`);
      } else {
        alert('Erro: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao salvar fechamento:', error);
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const excluirFechamento = async (id) => {
    if (window.confirm('Deseja excluir este fechamento?')) {
      try {
        const response = await makeRequest(`/fechamentos/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          carregarDados();
          alert('Fechamento excluído!');
        } else {
          const data = await response.json();
          alert('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
        }
      } catch (error) {
        console.error('Erro ao excluir fechamento:', error);
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Função para formatar valor como moeda durante a digitação
  const formatarValorInput = (valor) => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    
    // Se não há números, retorna string vazia
    if (!numeros) return '';
    
    // Converte para número com 2 casas decimais
    const numero = parseFloat(numeros) / 100;
    
    // Formata como moeda brasileira
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para converter valor formatado para número
  const desformatarValor = (valorFormatado) => {
    if (!valorFormatado) return '';
    return valorFormatado.replace(/\./g, '').replace(',', '.');
  };

  // Função para lidar com mudança no campo de valor
  const handleValorChange = (e) => {
    const valorDigitado = e.target.value;
    const valorFormatado = formatarValorInput(valorDigitado);
    const valorNumerico = desformatarValor(valorFormatado);
    
    setNovoFechamento({
      ...novoFechamento, 
      valor_fechado: valorNumerico,
      valor_formatado: valorFormatado
    });
  };

  // Mostrar loading
  if (carregando) {
    return (
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'white',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ color: '#6b7280', fontWeight: '500' }}>Carregando dados...</h2>
          <p style={{ color: '#9ca3af' }}>Aguarde enquanto buscamos as informações</p>
        </div>
      </div>
    );
  }

  // Mostrar erro
  if (erro) {
    return (
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'white',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #fecaca'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: '#dc2626', fontWeight: '600', marginBottom: '10px' }}>
            Erro ao carregar dados
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>{erro}</p>
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <h3 style={{ color: '#991b1b', fontSize: '16px', marginBottom: '10px' }}>
              📋 Como resolver:
            </h3>
            <ol style={{ color: '#7f1d1d', fontSize: '14px', paddingLeft: '20px' }}>
              <li>Acesse o <strong>Supabase</strong> (supabase.com)</li>
              <li>Vá para <strong>SQL Editor</strong></li>
              <li>Execute o arquivo: <code>backend/migrations/run_migrations.sql</code></li>
              <li>Certifique-se de que a tabela <strong>fechamentos</strong> foi criada</li>
            </ol>
          </div>
          <button 
            onClick={carregarDados}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const fechamentosFiltrados = filtrarFechamentos();
  const stats = calcularEstatisticas();
  const filtrosAtivos = contarFiltrosAtivos();

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Seção de Estatísticas */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', margin: '0' }}>💰 Fechamentos</h1>
          <button 
            onClick={() => abrirModal()}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            ➕ Novo Fechamento
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px', display: 'block' }}>
              {stats.total}
            </span>
            <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '500' }}>
              Total de Fechamentos
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px', display: 'block' }}>
              {formatarMoeda(stats.valorTotal)}
            </span>
            <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '500' }}>
              Valor Total
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px', display: 'block' }}>
              {formatarMoeda(stats.ticketMedio)}
            </span>
            <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '500' }}>
              Ticket Médio
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px', display: 'block' }}>
              {stats.fechamentosHoje}
            </span>
            <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '500' }}>
              Fechamentos Hoje
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <span style={{ fontSize: '32px', fontWeight: '700', marginBottom: '5px', display: 'block' }}>
              {stats.fechamentosMes}
            </span>
            <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '500' }}>
              Fechamentos no Mês
            </div>
          </div>
        </div>

        {stats.fechamentosHoje > 0 && (
          <div style={{
            background: 'rgba(255, 193, 7, 0.2)',
            border: '1px solid rgba(255, 193, 7, 0.4)',
            borderRadius: '8px',
            padding: '15px',
            textAlign: 'center',
            color: '#fff3cd',
            fontWeight: '500'
          }}>
            🎉 Parabéns! {stats.fechamentosHoje} fechamento(s) realizado(s) hoje!
          </div>
        )}
      </div>

      {/* Lista de Fechamentos */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {fechamentosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: '0.5' }}>💰</div>
            <h3>Nenhum fechamento encontrado</h3>
            <p>Registre seu primeiro fechamento para começar!</p>
          </div>
        ) : (
          fechamentosFiltrados.map(fechamento => (
            <div key={fechamento.id} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div>
                  <h3 style={{
                    margin: '0 0 5px 0',
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {fechamento.paciente_nome}
                  </h3>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#059669',
                    margin: '0'
                  }}>
                    {formatarMoeda(fechamento.valor_fechado)}
                  </div>
                </div>
                <div style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {formatarData(fechamento.data_fechamento)}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                marginBottom: '15px'
              }}>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '2px' }}>
                    Consultor
                  </div>
                  <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    {fechamento.consultor_nome || 'Não informado'}
                  </div>
                </div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '2px' }}>
                    Clínica
                  </div>
                  <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    {fechamento.clinica_nome || 'Não informado'}
                  </div>
                </div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '2px' }}>
                    Tipo de Tratamento
                  </div>
                  <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    {fechamento.tipo_tratamento || 'Não informado'}
                  </div>
                </div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '2px' }}>
                    Forma de Pagamento
                  </div>
                  <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    {fechamento.forma_pagamento || 'Não informado'}
                  </div>
                </div>
              </div>

              {fechamento.observacoes && (
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '2px' }}>
                    Observações
                  </div>
                  <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    {fechamento.observacoes}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {fechamento.contrato_arquivo && (
                  <button 
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`http://localhost:5000/api/fechamentos/${fechamento.id}/contrato?token=${token}`);
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          alert('Erro ao baixar contrato: ' + (errorData.error || 'Erro desconhecido'));
                          return;
                        }

                        // Criar blob e fazer download
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fechamento.contrato_nome_original || 'contrato.pdf';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        console.error('Erro ao baixar contrato:', error);
                        alert('Erro ao baixar contrato: ' + error.message);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.3s ease',
                      background: '#059669',
                      color: 'white'
                    }}
                    title={`Baixar contrato: ${fechamento.contrato_nome_original || 'contrato.pdf'}`}
                  >
                    📄 Contrato
                  </button>
                )}
                <button 
                  onClick={() => abrirModal(fechamento)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                    background: '#3b82f6',
                    color: 'white'
                  }}
                >
                  ✏️ Editar
                </button>
                <button 
                  onClick={() => excluirFechamento(fechamento.id)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                    background: '#dc2626',
                    color: 'white'
                  }}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalAberto && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0'
              }}>
                {fechamentoEditando ? 'Editar Fechamento' : 'Novo Fechamento'}
              </h2>
              <button 
                onClick={fecharModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.3s ease'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '25px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  👤 Paciente *
                </label>
                <select 
                  value={novoFechamento.paciente_id} 
                  onChange={(e) => setNovoFechamento({...novoFechamento, paciente_id: e.target.value})}
                  required
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome} - {paciente.telefone}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  💰 Valor Fechado *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    R$
                  </span>
                  <input 
                    type="text" 
                    placeholder="0,00"
                    value={novoFechamento.valor_formatado || ''} 
                    onChange={handleValorChange}
                    required
                    style={{
                      padding: '10px 10px 10px 35px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  👨‍💼 Consultor
                </label>
                <select 
                  value={novoFechamento.consultor_id || ''} 
                  onChange={(e) => setNovoFechamento({...novoFechamento, consultor_id: e.target.value})}
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <option value="">Selecione um consultor</option>
                  {consultores.map(consultor => (
                    <option key={consultor.id} value={consultor.id}>
                      {consultor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  🏥 Clínica
                </label>
                <select 
                  value={novoFechamento.clinica_id || ''} 
                  onChange={(e) => setNovoFechamento({...novoFechamento, clinica_id: e.target.value})}
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <option value="">Selecione uma clínica</option>
                  {clinicas.map(clinica => (
                    <option key={clinica.id} value={clinica.id}>
                      {clinica.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  📅 Data do Fechamento
                </label>
                <input 
                  type="date"
                  value={novoFechamento.data_fechamento || ''} 
                  onChange={(e) => setNovoFechamento({...novoFechamento, data_fechamento: e.target.value})}
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  🦷 Tipo de Tratamento
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Implante, Ortodontia, Limpeza..."
                  value={novoFechamento.tipo_tratamento || ''} 
                  onChange={(e) => setNovoFechamento({...novoFechamento, tipo_tratamento: e.target.value})}
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  💳 Forma de Pagamento
                </label>
                <select 
                  value={novoFechamento.forma_pagamento || ''} 
                  onChange={(e) => setNovoFechamento({...novoFechamento, forma_pagamento: e.target.value})}
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <option value="">Selecione a forma de pagamento</option>
                  {formasPagamento.map(forma => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo de Upload do Contrato */}
              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  📄 Contrato (PDF) {!fechamentoEditando && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  background: contratoSelecionado ? '#f0fdf4' : '#fafafa',
                  borderColor: contratoSelecionado ? '#10b981' : '#d1d5db',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setContratoSelecionado(e.target.files[0])}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                  
                  {contratoSelecionado ? (
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#059669',
                        marginBottom: '5px'
                      }}>
                        Arquivo selecionado:
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#374151',
                        wordBreak: 'break-all'
                      }}>
                        {contratoSelecionado.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '5px'
                      }}>
                        {(contratoSelecionado.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: '10px', opacity: '0.5' }}>📄</div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '5px'
                      }}>
                        Clique aqui ou arraste para adicionar o contrato
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#9ca3af'
                      }}>
                        Apenas arquivos PDF • Máximo 10MB
                      </div>
                    </div>
                  )}
                </div>
                
                {fechamentoEditando && (
                  <div style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    💡 Para edições, o contrato é opcional (manterá o arquivo atual se não for alterado)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                <label style={{
                  fontWeight: '500',
                  marginBottom: '5px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  📝 Observações
                </label>
                <textarea 
                  placeholder="Informações adicionais sobre o fechamento..."
                  value={novoFechamento.observacoes} 
                  onChange={(e) => setNovoFechamento({...novoFechamento, observacoes: e.target.value})}
                  style={{
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              paddingTop: '15px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button 
                onClick={fecharModal}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  background: '#6b7280',
                  color: 'white'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={salvarFechamento}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  background: '#059669',
                  color: 'white'
                }}
              >
                {fechamentoEditando ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fechamentos; 