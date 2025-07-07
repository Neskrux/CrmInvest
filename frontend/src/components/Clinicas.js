import React, { useState, useEffect } from 'react';
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
    'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista'],
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

  useEffect(() => {
    fetchClinicas();
  }, []);

  const fetchClinicas = async () => {
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
  };

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
        <h1 className="page-title">Clínicas</h1>
        <p className="page-subtitle">Gerencie as clínicas parceiras</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('sucesso') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lista de Clínicas</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nova Clínica
          </button>
        </div>

        {/* Seção de Filtros */}
        <div style={{ 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1rem' 
          }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              color: '#1a1d23', 
              margin: 0
            }}>
              Filtros de Busca
            </h3>
            {(filtroEstado || filtroCity) && (
              <button 
                onClick={() => {
                  setFiltroEstado('');
                  setFiltroCity('');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Limpar Filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setFiltroCity('');
                }}
                className="form-select"
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

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Cidade</label>
              <select
                value={filtroCity}
                onChange={(e) => setFiltroCity(e.target.value)}
                className="form-select"
                disabled={!filtroEstado && cidadesDisponiveis.length > 20}
              >
                <option value="">Todas as cidades</option>
                {cidadesDisponiveis.slice(0, 50).map(cidade => (
                  <option key={cidade} value={cidade}>{cidade}</option>
                ))}
              </select>
            </div>
          </div>

          {(filtroEstado || filtroCity) && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '6px',
              color: '#4b5563',
              fontSize: '0.9rem'
            }}>
              Mostrando <strong>{clinicasFiltradas.length}</strong> de {clinicas.length} clínica(s)
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : clinicasFiltradas.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            {filtroEstado || filtroCity
              ? 'Nenhuma clínica encontrada com os filtros aplicados.'
              : 'Nenhuma clínica cadastrada ainda.'
            }
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Endereço</th>
                  <th>Bairro</th>
                  <th>Cidade/Estado</th>
                  <th>Nicho</th>
                  <th>Contato</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clinicasFiltradas.map(clinica => (
                  <tr key={clinica.id}>
                    <td>
                      <strong>{clinica.nome}</strong>
                    </td>
                    <td>{clinica.endereco || '-'}</td>
                    <td>{clinica.bairro || '-'}</td>
                    <td>
                      {clinica.cidade && clinica.estado ? (
                        <span>{clinica.cidade}/{clinica.estado}</span>
                      ) : '-'}
                    </td>
                    <td>
                      {clinica.nicho ? (
                        <span className="badge" style={{ backgroundColor: '#e5e7eb', color: '#374151' }}>
                          {clinica.nicho}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {clinica.telefone && (
                        <div>{formatarTelefone(clinica.telefone)}</div>
                      )}
                      {clinica.email && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{clinica.email}</div>
                      )}
                      {!clinica.telefone && !clinica.email && '-'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleEdit(clinica)}
                        className="btn-action"
                        title="Editar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingClinica ? 'Editar Clínica' : 'Nova Clínica'}
              </h2>
              <button 
                className="close-btn"
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
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
                  {cidadesSugeridas.length > 0 && formData.cidade !== 'OUTRA' ? (
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
                      <option value="OUTRA">Outra cidade</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="cidade"
                      className="form-input"
                      value={formData.cidade === 'OUTRA' ? '' : formData.cidade}
                      onChange={handleInputChange}
                      placeholder="Digite o nome da cidade"
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

              <div className="form-group">
                <label className="form-label">Nicho da Clínica *</label>
                <select
                  name="nicho"
                  className="form-select"
                  value={formData.nicho}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione o nicho</option>
                  <option value="Estético">Estético</option>
                  <option value="Odontológico">Odontológico</option>
                  <option value="Ambos">Ambos (Estético + Odontológico)</option>
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
                  {editingClinica ? 'Atualizar Clínica' : 'Cadastrar Clínica'}
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