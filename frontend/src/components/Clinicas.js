import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Clinicas = () => {
  const { makeRequest } = useAuth();
  const [clinicas, setClinicas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClinica, setEditingClinica] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCity, setFiltroCity] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    nicho: '',
    telefone: '',
    email: ''
  });

  // Estados brasileiros
  const estadosBrasileiros = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
  ];

  // Principais cidades por estado (sample - pode expandir)
  const cidadesPorEstado = {
    'SP': ['São Paulo', 'Campinas', 'Santos', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Sorocaba'],
    'RJ': ['Rio de Janeiro', 'Niterói', 'Nova Iguaçu', 'Duque de Caxias', 'Campos dos Goytacazes', 'Petrópolis', 'Volta Redonda'],
    'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves'],
    'ES': ['Vitória', 'Serra', 'Vila Velha', 'Cariacica', 'Linhares', 'Cachoeiro de Itapemirim', 'Colatina'],
    'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu'],
    'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí', 'Viamão'],
    'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó', 'Itajaí'],
    'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro', 'Ilhéus', 'Itabuna'],
    'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás'],
    'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho'],
    'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca'],
    'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Planaltina', 'Águas Claras', 'Guará'],
    'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Cáceres', 'Barra do Garças'],
    'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Aquidauana', 'Naviraí'],
    'AL': ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares', 'Penedo'],
    'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'Estância', 'Tobias Barreto'],
    'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cajazeiras'],
    'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Ceará-Mirim'],
    'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras'],
    'MA': ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar'],
    'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Colinas do Tocantins'],
    'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasileia'],
    'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura'],
    'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí', 'Cantá'],
    'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande'],
    'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Tabatinga'],
    'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal', 'Abaetetuba']
  };

  const fetchClinicas = useCallback(async () => {
    try {
      const response = await makeRequest('/clinicas');
      const data = await response.json();
      
      if (response.ok) {
        setClinicas(data);
      } else {
        console.error('Erro ao carregar clínicas:', data.error);
        setMessage('Erro ao carregar clínicas: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
      setMessage('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  useEffect(() => {
    fetchClinicas();
  }, [fetchClinicas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingClinica) {
        response = await makeRequest(`/clinicas/${editingClinica.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        response = await makeRequest('/clinicas', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        setMessage(editingClinica ? 'Clínica atualizada com sucesso!' : 'Clínica cadastrada com sucesso!');
        setShowModal(false);
        setEditingClinica(null);
        setFormData({
          nome: '',
          endereco: '',
          bairro: '',
          cidade: '',
          estado: '',
          nicho: '',
          telefone: '',
          email: ''
        });
        fetchClinicas();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao salvar clínica: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar clínica:', error);
      setMessage('Erro ao salvar clínica');
    }
  };

  const handleEdit = (clinica) => {
    setEditingClinica(clinica);
    setFormData({
      nome: clinica.nome || '',
      endereco: clinica.endereco || '',
      bairro: clinica.bairro || '',
      cidade: clinica.cidade || '',
      estado: clinica.estado || '',
      nicho: clinica.nicho || '',
      telefone: clinica.telefone || '',
      email: clinica.email || ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Limpar cidade se estado mudar
    if (name === 'estado') {
      setFormData(prev => ({
        ...prev,
        estado: value,
        cidade: '' // Limpar cidade quando estado muda
      }));
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    const numbers = telefone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    }
    return telefone;
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      nicho: '',
      telefone: '',
      email: ''
    });
    setEditingClinica(null);
    setShowModal(false);
  };

  // Filtrar clínicas
  const clinicasFiltradas = clinicas.filter(clinica => {
    const matchEstado = !filtroEstado || clinica.estado === filtroEstado;
    const matchCidade = !filtroCity || clinica.cidade?.toLowerCase().includes(filtroCity.toLowerCase());
    return matchEstado && matchCidade;
  });

  // Obter listas únicas para filtros
  const estadosDisponiveis = [...new Set(clinicas
    .map(c => c.estado)
    .filter(estado => estado && estado.trim() !== '')
  )].sort();

  const cidadesDisponiveis = [...new Set(clinicas
    .filter(c => !filtroEstado || c.estado === filtroEstado)
    .map(c => c.cidade)
    .filter(cidade => cidade && cidade.trim() !== '')
  )].sort();

  // Obter cidades sugeridas baseadas no estado selecionado
  const cidadesSugeridas = formData.estado ? (cidadesPorEstado[formData.estado] || []) : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏥 Gestão de Clínicas</h1>
        <p className="page-subtitle">Cadastre as clínicas parceiras do sistema</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🏥 Lista de Clínicas</h2>
        </div>

        {/* Seção de Filtros */}
        <div style={{ 
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
          padding: '2rem', 
          borderRadius: '16px', 
          marginBottom: '2rem',
          border: '1px solid #cbd5e0',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem' 
          }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              fontWeight: '600', 
              color: '#2d3748', 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🔍 Filtros de Busca
            </h3>
            <button 
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              ➕ Nova Clínica
            </button>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem',
            alignItems: 'end'
          }}>
            {/* Filtro por Estado */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ 
                fontSize: '1rem', 
                color: '#374151', 
                marginBottom: '0.5rem',
                fontWeight: '500',
                display: 'block'
              }}>
                🗺️ Estado:
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setFiltroCity(''); // Limpar filtro de cidade
                }}
                className="form-select"
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '12px',
                  border: '2px solid #d1d5db',
                  fontSize: '1rem',
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <option value="">Todos os estados</option>
                {estadosDisponiveis.map(estado => {
                  const estadoInfo = estadosBrasileiros.find(e => e.sigla === estado);
                  return (
                    <option key={estado} value={estado}>
                      {estado} - {estadoInfo?.nome || estado}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filtro por Cidade */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ 
                fontSize: '1rem', 
                color: '#374151', 
                marginBottom: '0.5rem',
                fontWeight: '500',
                display: 'block'
              }}>
                🌆 Cidade:
              </label>
              <select
                value={filtroCity}
                onChange={(e) => setFiltroCity(e.target.value)}
                className="form-select"
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '12px',
                  border: '2px solid #d1d5db',
                  fontSize: '1rem',
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  opacity: (!filtroEstado && cidadesDisponiveis.length > 20) ? 0.6 : 1
                }}
                disabled={!filtroEstado && cidadesDisponiveis.length > 20}
              >
                <option value="">Todas as cidades</option>
                {cidadesDisponiveis.slice(0, 50).map(cidade => (
                  <option key={cidade} value={cidade}>{cidade}</option>
                ))}
              </select>
            </div>

            {/* Botão Limpar Filtros */}
            {(filtroEstado || filtroCity) && (
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ 
                  fontSize: '1rem', 
                  color: 'transparent', 
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  display: 'block'
                }}>
                  .
                </label>
                <button 
                  onClick={() => {
                    setFiltroEstado('');
                    setFiltroCity('');
                  }}
                  className="btn btn-secondary"
                  style={{ 
                    padding: '0.875rem 1.5rem',
                    fontSize: '1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  🗑️ Limpar Filtros
                </button>
              </div>
            )}
          </div>

          {/* Contador de resultados */}
          {(filtroEstado || filtroCity) && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem 1.5rem', 
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
              borderRadius: '12px',
              border: '1px solid #93c5fd',
              color: '#1e40af',
              fontSize: '1rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📍 Exibindo <strong style={{ margin: '0 0.25rem', color: '#1d4ed8' }}>{clinicasFiltradas.length}</strong> 
              de {clinicas.length} clínica(s)
              {filtroEstado && ` • Estado: ${filtroEstado}`}
              {filtroCity && ` • Cidade: ${filtroCity}`}
            </div>
          )}
        </div>

        {loading ? (
          <p>Carregando clínicas...</p>
        ) : clinicasFiltradas.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
            {filtroEstado || filtroCity
              ? `Nenhuma clínica encontrada com os filtros aplicados.`
              : 'Nenhuma clínica cadastrada ainda. Clique em "Nova Clínica" para começar.'
            }
          </p>
        ) : (
          <div className="grid grid-2">
              {clinicasFiltradas.map(clinica => (
                <div key={clinica.id} className="card card-grid-item" style={{ margin: 0, position: 'relative' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '2px solid #667eea'
                  }}>
                    <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>🏥</span>
                    <h3 style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '600', 
                      color: '#2d3748',
                      margin: 0,
                      flex: 1
                    }}>
                      {clinica.nome}
                    </h3>
                    <button
                      onClick={() => handleEdit(clinica)}
                      className="btn-edit card-edit-btn"
                    >
                      ✏️
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {clinica.endereco && (
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ marginRight: '0.5rem' }}>📍</span>
                        <span style={{ color: '#4a5568' }}>{clinica.endereco}</span>
                      </div>
                    )}

                    {clinica.bairro && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '0.5rem' }}>🏘️</span>
                        <span style={{ color: '#4a5568' }}>{clinica.bairro}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {clinica.cidade && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.25rem' }}>🌆</span>
                          <span style={{ 
                            color: '#667eea', 
                            fontWeight: '600',
                            padding: '0.25rem 0.5rem',
                            background: '#e3f2fd',
                            borderRadius: '12px',
                            fontSize: '0.85rem'
                          }}>
                            {clinica.cidade}
                          </span>
                        </div>
                      )}

                      {clinica.estado && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.25rem' }}>🗺️</span>
                          <span style={{ 
                            color: '#059669', 
                            fontWeight: '600',
                            padding: '0.25rem 0.5rem',
                            background: '#d1fae5',
                            borderRadius: '12px',
                            fontSize: '0.85rem'
                          }}>
                            {clinica.estado}
                          </span>
                        </div>
                      )}

                      {clinica.nicho && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.25rem' }}>
                            {clinica.nicho === 'Estético' ? '✨' : 
                             clinica.nicho === 'Odontológico' ? '🦷' : '🎯'}
                          </span>
                          <span style={{ 
                            color: clinica.nicho === 'Estético' ? '#7c3aed' : 
                                   clinica.nicho === 'Odontológico' ? '#dc2626' : '#f59e0b',
                            fontWeight: '600',
                            padding: '0.25rem 0.5rem',
                            background: clinica.nicho === 'Estético' ? '#f3e8ff' : 
                                       clinica.nicho === 'Odontológico' ? '#fef2f2' : '#fef3c7',
                            borderRadius: '12px',
                            fontSize: '0.85rem'
                          }}>
                            {clinica.nicho}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {clinica.telefone && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '0.5rem' }}>📞</span>
                        <span style={{ color: '#4a5568' }}>{formatarTelefone(clinica.telefone)}</span>
                      </div>
                    )}
                    
                    {clinica.email && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '0.5rem' }}>📧</span>
                        <a 
                          href={`mailto:${clinica.email}`}
                          style={{ color: '#667eea', textDecoration: 'none' }}
                        >
                          {clinica.email}
                        </a>
                      </div>
                    )}
                    
                    <div style={{ 
                      marginTop: '1rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '0.85rem',
                      color: '#718096'
                    }}>
                      Cadastrada em: {formatarData(clinica.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingClinica ? '✏️ Editar Clínica' : '🏥 Nova Clínica'}
              </h2>
              <button 
                className="close-btn"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome da Clínica *</label>
                <input
                  type="text"
                  name="nome"
                  className="form-input"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Digite o nome da clínica"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Endereço (Rua e Número)</label>
                <input
                  type="text"
                  name="endereco"
                  className="form-input"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  placeholder="Ex: Rua das Flores, 123"
                />
              </div>

              <div className="grid grid-3">
                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    name="estado"
                    className="form-select"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o estado</option>
                    {estadosBrasileiros.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cidade *</label>
                  {cidadesSugeridas.length > 0 ? (
                    <select
                      name="cidade"
                      className="form-select"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecione a cidade</option>
                      {cidadesSugeridas.map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                      <option value="OUTRA">➕ Outra cidade</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="cidade"
                      className="form-input"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      placeholder={formData.estado ? "Digite o nome da cidade" : "Selecione o estado primeiro"}
                      disabled={!formData.estado}
                      required
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Bairro/Zona</label>
                  <input
                    type="text"
                    name="bairro"
                    className="form-input"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    placeholder="Ex: Centro, Zona Sul"
                  />
                </div>
              </div>

              {/* Campo personalizado para cidade se "OUTRA" for selecionada */}
              {formData.cidade === 'OUTRA' && (
                <div className="form-group">
                  <label className="form-label">Nome da Cidade *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digite o nome da cidade"
                    onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">🎯 Nicho da Clínica *</label>
                <select
                  name="nicho"
                  className="form-select"
                  value={formData.nicho}
                  onChange={handleInputChange}
                  required
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid #d1d5db',
                    fontSize: '1rem',
                    background: 'white'
                  }}
                >
                  <option value="">Selecione o nicho</option>
                  <option value="Estético">✨ Estético</option>
                  <option value="Odontológico">🦷 Odontológico</option>
                  <option value="Ambos">🎯 Ambos (Estético + Odontológico)</option>
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    type="tel"
                    name="telefone"
                    className="form-input"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contato@clinica.com"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingClinica ? '💾 Atualizar Clínica' : '💾 Cadastrar Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clinicas; 