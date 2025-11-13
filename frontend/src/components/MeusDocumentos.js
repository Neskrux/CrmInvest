import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts';
import { Check, X, Clock, AlertCircle, FileText, Upload } from 'lucide-react';
import { apiConfig } from '../config';

const MeusDocumentos = () => {
  const { makeRequest, user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [clinica, setClinica] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [editandoDados, setEditandoDados] = useState(false);
  const [dadosForm, setDadosForm] = useState({
    telefone_socios: '',
    email_socios: '',
    banco_nome: '',
    banco_conta: '',
    banco_agencia: '',
    banco_pix: ''
  });
  
  // Estados para controlar seções de documentos (acordeão)
  const [secaoDadosEmpresa, setSecaoDadosEmpresa] = useState(true);
  const [secaoFaturamento, setSecaoFaturamento] = useState(false);
  const [secaoSocios, setSecaoSocios] = useState(false);
  const [secaoRespTecnico, setSecaoRespTecnico] = useState(false);

  // Documentos organizados por categoria
  const documentosPorSecao = {
    dadosEmpresa: [
      { key: 'doc_cartao_cnpj', label: 'Cartão CNPJ' },
      { key: 'doc_contrato_social', label: 'Contrato Social' },
      { key: 'doc_alvara_sanitario', label: 'Alvará de Funcionamento Sanitário' },
      { key: 'doc_comprovante_endereco', label: 'Comprovante de Endereço da Clínica' }
    ],
    faturamento: [
      { key: 'doc_balanco', label: 'Balanço/Balancete Assinado (Últimos 12 meses)', nota: 'Deve ser dos últimos 12 meses' }
    ],
    socios: [
      { key: 'doc_socios', label: 'Documentos dos Sócios' },
      { key: 'doc_comprovante_endereco_socios', label: 'Comprovante de Endereço dos Sócios' }
    ],
    respTecnico: [
      { key: 'doc_certidao_resp_tecnico', label: 'Certidão de Responsabilidade Técnica' },
      { key: 'doc_resp_tecnico', label: 'Documentos do Responsável Técnico' },
      { key: 'doc_carteirinha_cro', label: 'Carteirinha do Conselho (CRO/CFO)' }
    ]
  };

  useEffect(() => {
    carregarDadosClinica();
  }, []);

  useEffect(() => {
    if (clinica) {
      setDadosForm({
        telefone_socios: clinica.telefone_socios || '',
        email_socios: clinica.email_socios || '',
        banco_nome: clinica.banco_nome || '',
        banco_conta: clinica.banco_conta || '',
        banco_agencia: clinica.banco_agencia || '',
        banco_pix: clinica.banco_pix || ''
      });
    }
  }, [clinica]);

  const carregarDadosClinica = async () => {
    try {
      setLoading(true);
      
      // Verificar se o clinica_id está presente
      if (!user?.clinica_id) {
        console.error('❌ clinica_id não encontrado no usuário:', user);
        showErrorToast('Erro: ID da clínica não encontrado. Por favor, faça logout e login novamente.');
        setLoading(false);
        return;
      }
      
      // Buscar a clínica usando o clinica_id do usuário
      const response = await makeRequest(`/clinicas/${user.clinica_id}`);
      const data = await response.json();
      
      if (response.ok) {
        setClinica(data);
      } else {
        showErrorToast('Erro ao carregar dados da clínica');
      }
    } catch (error) {
      console.error('Erro ao carregar clínica:', error);
      showErrorToast('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (doc) => {
    if (!clinica) return { status: 'pendente', icon: Clock, color: '#9ca3af', text: 'Pendente' };
    
    const docKey = doc.key;
    const aprovadoKey = `${docKey}_aprovado`;
    
    // Se tem o documento enviado
    if (clinica[docKey]) {
      // Verificar se foi aprovado ou reprovado
      if (clinica[aprovadoKey] === true) {
        return { status: 'aprovado', icon: Check, color: '#10b981', text: 'Aprovado' };
      } else if (clinica[aprovadoKey] === false) {
        return { status: 'reprovado', icon: X, color: '#ef4444', text: 'Reprovado' };
      } else {
        return { status: 'enviado', icon: Clock, color: '#f59e0b', text: 'Em Análise' };
      }
    }
    
    return { status: 'pendente', icon: AlertCircle, color: '#9ca3af', text: 'Pendente' };
  };

  const handleUploadDocumento = async (docKey, file) => {
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      showErrorToast('Apenas arquivos PDF, DOC, DOCX, JPG, JPEG e PNG são permitidos');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast('O arquivo deve ter no máximo 10MB');
      return;
    }

    setUploadingDoc(docKey);
    try {
      const formData = new FormData();
      formData.append('documento', file);
      formData.append('tipo', docKey);

      // Para FormData, não usar makeRequest pois ele adiciona Content-Type automaticamente
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.API_BASE_URL}/clinicas/${user.clinica_id}/documentos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showSuccessToast('Documento enviado com sucesso!');
        carregarDadosClinica();
      } else {
        showErrorToast(data.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      showErrorToast('Erro ao enviar documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDownloadDocumento = async (docKey) => {
    try {
      const response = await makeRequest(`/clinicas/${user.clinica_id}/documentos/${docKey}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docKey}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showErrorToast('Erro ao baixar documento');
      }
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      showErrorToast('Erro ao baixar documento');
    }
  };

  const handleDadosInputChange = (e) => {
    let { name, value } = e.target;
    
    // Aplicar formatação específica baseada no campo
    if (name === 'telefone_socios') {
      // Remove tudo que não é número
      let numbers = value.replace(/\D/g, '');
      
      // Remove zeros à esquerda
      numbers = numbers.replace(/^0+/, '');
      
      // Limita a 11 dígitos
      numbers = numbers.substring(0, 11);
      
      // Formata baseado no tamanho
      if (numbers.length === 0) {
        value = '';
      } else if (numbers.length <= 2) {
        value = `(${numbers}`;
      } else if (numbers.length <= 6) {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
      } else if (numbers.length <= 10) {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
      } else {
        value = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7, 11)}`;
      }
    } else if (name === 'email_socios') {
      // Normalizar email para minúsculas
      value = value.toLowerCase();
    } else if (name === 'banco_pix') {
      // Detectar e formatar PIX (CPF, CNPJ, telefone ou email)
      const numbers = value.replace(/\D/g, '');
      
      // Se parecer CPF (11 dígitos)
      if (numbers.length === 11 && !value.includes('@') && !value.includes('.')) {
        value = numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      // Se parecer CNPJ (14 dígitos)
      else if (numbers.length === 14 && !value.includes('@') && !value.includes('.')) {
        value = numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      // Se parecer telefone (10 ou 11 dígitos)
      else if ((numbers.length === 10 || numbers.length === 11) && !value.includes('@')) {
        if (numbers.length === 11) {
          value = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else {
          value = numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
      }
      // Email - normalizar para minúsculas
      else if (value.includes('@')) {
        value = value.toLowerCase();
      }
      // Caso contrário, manter como está
    } else if (name === 'banco_agencia') {
      // Remove tudo que não é número ou hífen
      value = value.replace(/[^\d-]/g, '');
    } else if (name === 'banco_conta') {
      // Remove tudo que não é número ou hífen
      value = value.replace(/[^\d-]/g, '');
    }
    
    setDadosForm({ ...dadosForm, [name]: value });
  };

  const handleSalvarDados = async () => {
    try {
      const response = await makeRequest(`/clinicas/${user.clinica_id}`, {
        method: 'PUT',
        body: JSON.stringify(dadosForm)
      });

      if (response.ok) {
        showSuccessToast('Dados atualizados com sucesso!');
        setEditandoDados(false);
        carregarDadosClinica();
      } else {
        const data = await response.json();
        showErrorToast(data.error || 'Erro ao atualizar dados');
      }
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      showErrorToast('Erro ao salvar dados');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando documentos...</p>
      </div>
    );
  }

  if (!clinica && !loading) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h3>Erro ao carregar dados</h3>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            {!user?.clinica_id 
              ? 'ID da clínica não encontrado. Por favor, faça logout e login novamente.'
              : 'Não foi possível carregar os dados da clínica'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/'}
            style={{ marginTop: '1rem' }}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meus Documentos</h1>
          <p className="page-subtitle">Gerencie e acompanhe o status dos documentos da sua clínica</p>
        </div>
      </div>

      {/* Informações da Clínica */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            {clinica.nome}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {clinica.cnpj && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>CNPJ:</span>
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0' }}>{clinica.cnpj}</p>
              </div>
            )}
            {clinica.cidade && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Localização:</span>
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0' }}>{clinica.cidade}/{clinica.estado}</p>
              </div>
            )}
            {clinica.status && (
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Status:</span>
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', textTransform: 'capitalize' }}>
                  {clinica.status}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informações dos Sócios e Dados Bancários */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Informações Adicionais
          </h2>
          {!editandoDados && (
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => setEditandoDados(true)}
            >
              Editar Informações
            </button>
          )}
        </div>
        <div className="card-body">
          {/* Informações dos Sócios */}
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
            Dados dos Sócios
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Telefone dos Sócios</label>
              {editandoDados ? (
                <input
                  type="tel"
                  name="telefone_socios"
                  className="form-input"
                  value={dadosForm.telefone_socios}
                  onChange={handleDadosInputChange}
                  placeholder="(11) 99999-9999"
                  style={{ marginTop: '0.25rem' }}
                />
              ) : (
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                  {clinica?.telefone_socios ? (
                    (() => {
                      const tel = clinica.telefone_socios.replace(/\D/g, '');
                      if (tel.length === 11) {
                        return `(${tel.substring(0, 2)}) ${tel.substring(2, 7)}-${tel.substring(7)}`;
                      } else if (tel.length === 10) {
                        return `(${tel.substring(0, 2)}) ${tel.substring(2, 6)}-${tel.substring(6)}`;
                      }
                      return clinica.telefone_socios;
                    })()
                  ) : 'Não informado'}
                </p>
              )}
            </div>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Email dos Sócios</label>
              {editandoDados ? (
                <input
                  type="email"
                  name="email_socios"
                  className="form-input"
                  value={dadosForm.email_socios}
                  onChange={handleDadosInputChange}
                  placeholder="socios@email.com"
                  style={{ marginTop: '0.25rem' }}
                />
              ) : (
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                  {clinica?.email_socios ? clinica.email_socios.toLowerCase() : 'Não informado'}
                </p>
              )}
            </div>
          </div>

          {/* Dados Bancários */}
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
            Dados Bancários (PJ)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Banco</label>
              {editandoDados ? (
                <input
                  type="text"
                  name="banco_nome"
                  className="form-input"
                  value={dadosForm.banco_nome}
                  onChange={handleDadosInputChange}
                  placeholder="Ex: Banco do Brasil"
                  style={{ marginTop: '0.25rem' }}
                />
              ) : (
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                  {clinica?.banco_nome || 'Não informado'}
                </p>
              )}
            </div>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Agência</label>
              {editandoDados ? (
                <input
                  type="text"
                  name="banco_agencia"
                  className="form-input"
                  value={dadosForm.banco_agencia}
                  onChange={handleDadosInputChange}
                  placeholder="Ex: 0001"
                  style={{ marginTop: '0.25rem' }}
                />
              ) : (
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                  {clinica?.banco_agencia || 'Não informado'}
                </p>
              )}
            </div>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Conta</label>
              {editandoDados ? (
                <input
                  type="text"
                  name="banco_conta"
                  className="form-input"
                  value={dadosForm.banco_conta}
                  onChange={handleDadosInputChange}
                  placeholder="Ex: 12345-6"
                  style={{ marginTop: '0.25rem' }}
                />
              ) : (
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', color: '#1f2937' }}>
                  {clinica?.banco_conta || 'Não informado'}
                </p>
              )}
            </div>
            <div>
              <label style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '600' }}>Chave PIX</label>
              {editandoDados ? (
                <input
                  type="text"
                  name="banco_pix"
                  className="form-input"
                  value={dadosForm.banco_pix}
                  onChange={handleDadosInputChange}
                  placeholder="CPF, CNPJ, Email ou Telefone"
                  style={{ marginTop: '0.25rem' }}
                />
              ) : (
                <p style={{ fontWeight: '500', margin: '0.25rem 0 0 0', color: '#1f2937', fontFamily: 'monospace' }}>
                  {clinica?.banco_pix || 'Não informado'}
                </p>
              )}
            </div>
          </div>

          {/* Botões de ação quando editando */}
          {editandoDados && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setEditandoDados(false);
                  setDadosForm({
                    telefone_socios: clinica?.telefone_socios || '',
                    email_socios: clinica?.email_socios || '',
                    banco_nome: clinica?.banco_nome || '',
                    banco_conta: clinica?.banco_conta || '',
                    banco_agencia: clinica?.banco_agencia || '',
                    banco_pix: clinica?.banco_pix || ''
                  });
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSalvarDados}
              >
                Salvar Alterações
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Documentos com Acordeão */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Documentação Necessária</h2>
        </div>
        <div className="card-body">
          {/* SEÇÃO 1: DADOS DA EMPRESA */}
          <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setSecaoDadosEmpresa(!secaoDadosEmpresa)}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: secaoDadosEmpresa ? '#eff6ff' : '#f9fafb',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                color: '#1e40af'
              }}
            >
              <span>Dados da Empresa</span>
              <span style={{ fontSize: '1.25rem' }}>{secaoDadosEmpresa ? '−' : '+'}</span>
            </button>
            {secaoDadosEmpresa && (
              <div style={{ padding: '1rem', backgroundColor: '#ffffff' }}>
                {documentosPorSecao.dadosEmpresa.map((doc) => {
                  const statusInfo = getStatusInfo(doc);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div
                      key={doc.key}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1', minWidth: '200px' }}>
                        <FileText size={20} color="#6b7280" />
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', margin: '0' }}>
                            {doc.label}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <StatusIcon size={14} color={statusInfo.color} />
                            <span style={{ fontSize: '0.75rem', color: statusInfo.color, fontWeight: '500' }}>
                              {statusInfo.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {clinica[doc.key] && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleDownloadDocumento(doc.key)}
                            title="Baixar documento"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Baixar
                          </button>
                        )}
                        <label
                          htmlFor={`upload-${doc.key}`}
                          className="btn btn-sm btn-primary"
                          style={{ cursor: uploadingDoc === doc.key ? 'not-allowed' : 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          {uploadingDoc === doc.key ? 'Enviando...' : (clinica[doc.key] ? 'Reenviar' : 'Enviar')}
                        </label>
                        <input
                          id={`upload-${doc.key}`}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadDocumento(doc.key, e.target.files[0]);
                            }
                          }}
                          disabled={uploadingDoc === doc.key}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEÇÃO 2: FATURAMENTO E BANCÁRIO */}
          <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setSecaoFaturamento(!secaoFaturamento)}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: secaoFaturamento ? '#eff6ff' : '#f9fafb',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                color: '#1e40af'
              }}
            >
              <span>Faturamento e Bancário</span>
              <span style={{ fontSize: '1.25rem' }}>{secaoFaturamento ? '−' : '+'}</span>
            </button>
            {secaoFaturamento && (
              <div style={{ padding: '1rem', backgroundColor: '#ffffff' }}>
                {documentosPorSecao.faturamento.map((doc) => {
                  const statusInfo = getStatusInfo(doc);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div
                      key={doc.key}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1', minWidth: '200px' }}>
                          <FileText size={20} color="#6b7280" />
                          <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', margin: '0' }}>
                              {doc.label}
                            </h4>
                            {doc.nota && (
                              <p style={{ fontSize: '0.7rem', color: '#f59e0b', margin: '0.25rem 0', fontWeight: '500' }}>
                                {doc.nota}
                              </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <StatusIcon size={14} color={statusInfo.color} />
                              <span style={{ fontSize: '0.75rem', color: statusInfo.color, fontWeight: '500' }}>
                                {statusInfo.text}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {clinica[doc.key] && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleDownloadDocumento(doc.key)}
                              title="Baixar documento"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Baixar
                            </button>
                          )}
                          <label
                            htmlFor={`upload-${doc.key}`}
                            className="btn btn-sm btn-primary"
                            style={{ cursor: uploadingDoc === doc.key ? 'not-allowed' : 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            {uploadingDoc === doc.key ? 'Enviando...' : (clinica[doc.key] ? 'Reenviar' : 'Enviar')}
                          </label>
                          <input
                            id={`upload-${doc.key}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadDocumento(doc.key, e.target.files[0]);
                              }
                            }}
                            disabled={uploadingDoc === doc.key}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEÇÃO 3: DADOS DOS SÓCIOS */}
          <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setSecaoSocios(!secaoSocios)}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: secaoSocios ? '#eff6ff' : '#f9fafb',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                color: '#1e40af'
              }}
            >
              <span>Dados dos Sócios</span>
              <span style={{ fontSize: '1.25rem' }}>{secaoSocios ? '−' : '+'}</span>
            </button>
            {secaoSocios && (
              <div style={{ padding: '1rem', backgroundColor: '#ffffff' }}>
                {documentosPorSecao.socios.map((doc) => {
                  const statusInfo = getStatusInfo(doc);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div
                      key={doc.key}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1', minWidth: '200px' }}>
                          <FileText size={20} color="#6b7280" />
                          <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', margin: '0' }}>
                              {doc.label}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <StatusIcon size={14} color={statusInfo.color} />
                              <span style={{ fontSize: '0.75rem', color: statusInfo.color, fontWeight: '500' }}>
                                {statusInfo.text}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {clinica[doc.key] && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleDownloadDocumento(doc.key)}
                              title="Baixar documento"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Baixar
                            </button>
                          )}
                          <label
                            htmlFor={`upload-${doc.key}`}
                            className="btn btn-sm btn-primary"
                            style={{ cursor: uploadingDoc === doc.key ? 'not-allowed' : 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            {uploadingDoc === doc.key ? 'Enviando...' : (clinica[doc.key] ? 'Reenviar' : 'Enviar')}
                          </label>
                          <input
                            id={`upload-${doc.key}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadDocumento(doc.key, e.target.files[0]);
                              }
                            }}
                            disabled={uploadingDoc === doc.key}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEÇÃO 4: RESPONSÁVEL TÉCNICO */}
          <div style={{ marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setSecaoRespTecnico(!secaoRespTecnico)}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: secaoRespTecnico ? '#eff6ff' : '#f9fafb',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                color: '#1e40af'
              }}
            >
              <span>Responsável Técnico</span>
              <span style={{ fontSize: '1.25rem' }}>{secaoRespTecnico ? '−' : '+'}</span>
            </button>
            {secaoRespTecnico && (
              <div style={{ padding: '1rem', backgroundColor: '#ffffff' }}>
                {documentosPorSecao.respTecnico.map((doc) => {
                  const statusInfo = getStatusInfo(doc);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div
                      key={doc.key}
                      style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1', minWidth: '200px' }}>
                          <FileText size={20} color="#6b7280" />
                          <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', margin: '0' }}>
                              {doc.label}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <StatusIcon size={14} color={statusInfo.color} />
                              <span style={{ fontSize: '0.75rem', color: statusInfo.color, fontWeight: '500' }}>
                                {statusInfo.text}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {clinica[doc.key] && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleDownloadDocumento(doc.key)}
                              title="Baixar documento"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Baixar
                            </button>
                          )}
                          <label
                            htmlFor={`upload-${doc.key}`}
                            className="btn btn-sm btn-primary"
                            style={{ cursor: uploadingDoc === doc.key ? 'not-allowed' : 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            {uploadingDoc === doc.key ? 'Enviando...' : (clinica[doc.key] ? 'Reenviar' : 'Enviar')}
                          </label>
                          <input
                            id={`upload-${doc.key}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadDocumento(doc.key, e.target.files[0]);
                              }
                            }}
                            disabled={uploadingDoc === doc.key}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Avisos */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-body" style={{ backgroundColor: '#eff6ff' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <AlertCircle size={24} color="#3b82f6" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: '#1e40af' }}>
                Informações Importantes
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#1e40af' }}>
                <li>Formatos aceitos: PDF, DOC, DOCX, JPG, JPEG e PNG</li>
                <li>Tamanho máximo por arquivo: 10MB</li>
                <li>Os documentos serão analisados pela equipe administrativa</li>
                <li>Você será notificado sobre aprovações ou solicitações de reenvio</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeusDocumentos;

