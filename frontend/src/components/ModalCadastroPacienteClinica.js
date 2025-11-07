import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import useBranding from '../hooks/useBranding';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import './ModalCadastroPacienteClinica.css';
import logoBrasaoPreto from '../images/logohorizontalpreto.png';

const ModalCadastroPacienteClinica = ({ onClose, onComplete }) => {
  console.log('🚀🚀🚀 [ModalCadastroPacienteClinica] COMPONENTE INICIADO!');
  const { user, makeRequest } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { empresaId, t } = useBranding();
  const modalRef = useRef(null);
  
  const [passoAtual, setPassoAtual] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);
  
  // Estados para assinatura digital do contrato
  const [assinaturaRef, setAssinaturaRef] = useState(null);
  const [hasAssinatura, setHasAssinatura] = useState(false);
  const [assinaturaBase64, setAssinaturaBase64] = useState(null);
  const [mostrarCanvasAssinatura, setMostrarCanvasAssinatura] = useState(false);
  const [contratoPdfBytes, setContratoPdfBytes] = useState(null);
  const [contratoPdfUrl, setContratoPdfUrl] = useState(null);
  const [assinandoContrato, setAssinandoContrato] = useState(false);
  const [pdfKey, setPdfKey] = useState(0); // Para forçar re-render do iframe
  
  // Log quando componente é montado
  useEffect(() => {
    console.log('🚀🚀🚀 [ModalCadastroPacienteClinica] COMPONENTE MONTADO NO DOM!');
    return () => {
      console.log('🚀🚀🚀 [ModalCadastroPacienteClinica] COMPONENTE DESMONTADO!');
    };
  }, []);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    cidade: '',
    estado: '',
    tipo_tratamento: '',
    endereco: '',
    bairro: '',
    numero: '',
    cep: '',
    observacoes: '',
    // Dados do fechamento
    valor_fechado: '',
    valor_fechado_formatado: '',
    valor_parcela: '',
    valor_parcela_formatado: '',
    numero_parcelas: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    vencimento: '',
    contrato_arquivo: null,
    observacoes_fechamento: '',
    tem_interesse_antecipar: 'nao',
    antecipacao_meses: ''
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
  
  // Principais cidades por estado
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
  
  // Detectar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Formatar telefone (mesma lógica do modal antigo)
  const formatarTelefone = (valor) => {
    if (!valor) return '';
    let numbers = valor.replace(/\D/g, '');
    numbers = numbers.replace(/^0+/, '');
    const limitedNumbers = numbers.substring(0, 11);
    
    if (limitedNumbers.length === 11) {
      return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 7)}-${limitedNumbers.substring(7, 11)}`;
    } else if (limitedNumbers.length === 10) {
      return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 6)}-${limitedNumbers.substring(6, 10)}`;
    } else if (limitedNumbers.length > 0) {
      if (limitedNumbers.length <= 2) {
        return `(${limitedNumbers}`;
      } else if (limitedNumbers.length <= 7) {
        return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2)}`;
      } else if (limitedNumbers.length <= 11) {
        return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 7)}-${limitedNumbers.substring(7)}`;
      }
    }
    return limitedNumbers;
  };
  
  // Formatar CPF
  const formatarCPF = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 11) {
      return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return valor;
  };
  
  // Formatar data
  const formatarData = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 8) {
      return apenasNumeros.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    }
    return valor;
  };
  
  // Formatar CEP
  const formatarCEP = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 8) {
      return apenasNumeros.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return valor;
  };
  
  // Formatar valores monetários
  const formatarValorInput = (valor) => {
    const numbers = valor.replace(/[^\d]/g, '');
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numbers / 100);
    return formatted;
  };

  const desformatarValor = (valorFormatado) => {
    return valorFormatado.replace(/[^\d]/g, '') / 100;
  };
  
  // Formatar nome (INITCAP)
  const formatarNome = (value) => {
    if (!value) return '';
    let cleanValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    cleanValue = cleanValue.replace(/\s+/g, ' ').trim();
    if (!cleanValue) return '';
    return cleanValue
      .toLowerCase()
      .split(' ')
      .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(' ');
  };
  
  // Handler de mudança de input
  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      const file = files && files[0];
      if (file) {
        if (file.type !== 'application/pdf') {
          showErrorToast('Apenas arquivos PDF são permitidos!');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          showErrorToast('O arquivo deve ter no máximo 10MB!');
          return;
        }
        setFormData(prev => ({ ...prev, [name]: file }));
      }
      return;
    }
    
    let valorFormatado = value;
    
    if (name === 'telefone') {
      const numbersOnly = value.replace(/\D/g, '');
      valorFormatado = numbersOnly ? formatarTelefone(numbersOnly) : '';
    } else if (name === 'cpf') {
      valorFormatado = formatarCPF(value);
    } else if (name === 'data_nascimento') {
      valorFormatado = formatarData(value);
    } else if (name === 'cep') {
      valorFormatado = formatarCEP(value);
    } else if (name === 'estado') {
      valorFormatado = value.toUpperCase().slice(0, 2);
      // Limpar cidade quando estado muda
      setFormData(prev => ({ ...prev, estado: valorFormatado, cidade: '' }));
      setCidadeCustomizada(false);
      return;
    } else if (name === 'cidade') {
      // Se selecionou "OUTRA", ativar cidade customizada
      if (value === 'OUTRA') {
        setCidadeCustomizada(true);
        setFormData(prev => ({ ...prev, cidade: '' }));
        return;
      }
    } else if (name === 'valor_fechado_formatado') {
      const valorFormatadoMonetario = formatarValorInput(value);
      const valorNumerico = desformatarValor(valorFormatadoMonetario);
      setFormData(prev => ({
        ...prev,
        valor_fechado_formatado: valorFormatadoMonetario,
        valor_fechado: valorNumerico
      }));
      return;
    } else if (name === 'valor_parcela_formatado') {
      const valorFormatadoMonetario = formatarValorInput(value);
      const valorNumerico = desformatarValor(valorFormatadoMonetario);
      setFormData(prev => ({
        ...prev,
        valor_parcela_formatado: valorFormatadoMonetario,
        valor_parcela: valorNumerico
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: valorFormatado
    }));
  };
  
  // Handler para formatar nome quando sair do campo
  const handleNomeBlur = (e) => {
    const { value } = e.target;
    if (value && value.trim()) {
      const nomeFormatado = formatarNome(value);
      setFormData(prev => ({ ...prev, nome: nomeFormatado }));
    }
  };
  
  // Carregar PDF quando arquivo for selecionado
  useEffect(() => {
    const carregarPDF = async () => {
      if (formData.contrato_arquivo && formData.contrato_arquivo instanceof File) {
        try {
          const arrayBuffer = await formData.contrato_arquivo.arrayBuffer();
          setContratoPdfBytes(arrayBuffer);
          
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setContratoPdfUrl(url);
        } catch (error) {
          console.error('Erro ao carregar PDF:', error);
          showErrorToast('Erro ao carregar o PDF do contrato');
        }
      }
    };
    
    carregarPDF();
  }, [formData.contrato_arquivo]);
  
  // Funções para assinatura digital do contrato
  
  // Gerar hash SHA1
  const gerarHashSHA1 = async (arrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hashHex;
  };
  
  // Limpar assinatura
  const limparAssinaturaContrato = () => {
    if (assinaturaRef) {
      assinaturaRef.clear();
      setHasAssinatura(false);
      setAssinaturaBase64(null);
    }
  };
  
  // Salvar assinatura temporariamente
  const salvarAssinaturaTemporaria = () => {
    if (!hasAssinatura || !assinaturaRef) {
      showErrorToast('Por favor, desenhe sua assinatura primeiro.');
      return;
    }
    
    const assinaturaBase64Temp = assinaturaRef.toDataURL('image/png');
    setAssinaturaBase64(assinaturaBase64Temp);
    setMostrarCanvasAssinatura(false);
    showSuccessToast('Assinatura salva! Pronta para ser aplicada ao contrato.');
  };
  
  // Aplicar assinatura ao contrato PDF com áreas fixas para assinaturas
  const aplicarAssinaturaAoContrato = async () => {
    if (!assinaturaBase64 || !contratoPdfBytes) {
      showErrorToast('Por favor, crie sua assinatura primeiro.');
      return;
    }
    
    setAssinandoContrato(true);
    
    try {
      console.log('📝 [ModalCadastroClinica] Aplicando assinatura ao contrato...');
      
      // Carregar o PDF
      const pdfDoc = await PDFDocument.load(contratoPdfBytes);
      const pages = pdfDoc.getPages();
      console.log('📄 [ModalCadastroClinica] PDF carregado, número de páginas:', pages.length);
      
      // Converter assinatura base64 para imagem
      const signatureImage = await pdfDoc.embedPng(assinaturaBase64);
      console.log('✅ [ModalCadastroClinica] Assinatura convertida para imagem');
      
      // Adicionar rodapé estruturado apenas na última página
      const ultimaPagina = pages[pages.length - 1];
      const larguraPagina = ultimaPagina.getWidth();
      const alturaPagina = ultimaPagina.getHeight();
      
      console.log('📐 [ModalCadastroClinica] Dimensões da última página:', {
        largura: larguraPagina,
        altura: alturaPagina
      });
      
      // Configurações do rodapé estruturado - melhor espaçamento
      const alturaRodape = 140; // Altura total do rodapé (aumentada)
      const margemInferior = 20;
      const yBaseRodape = margemInferior;
      const margemLateral = 50;
      const espacoEntreColunas = 20;
      
      // Desenhar área do rodapé
      // Linha superior do rodapé (mais grossa e escura)
      ultimaPagina.drawLine({
        start: { x: margemLateral, y: yBaseRodape + alturaRodape },
        end: { x: larguraPagina - margemLateral, y: yBaseRodape + alturaRodape },
        thickness: 1.5,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      // Calcular posições das 3 áreas de assinatura com melhor distribuição
      const larguraTotal = larguraPagina - (2 * margemLateral);
      const larguraArea = (larguraTotal - (2 * espacoEntreColunas)) / 3;
      const yLinhaAssinatura = yBaseRodape + 90; // Linha de assinatura mais abaixo
      const alturaAssinatura = 35;
      
      // Área 1: ASSINATURA CLÍNICA
      const x1 = margemLateral;
      
      // Desenhar assinatura da clínica primeiro (acima da linha)
      ultimaPagina.drawImage(signatureImage, {
        x: x1 + (larguraArea - 100) / 2, // Centralizar assinatura
        y: yLinhaAssinatura + 8,
        width: 100,
        height: alturaAssinatura,
      });
      console.log('✅ [ModalCadastroClinica] Assinatura da clínica desenhada');
      
      // Linha para assinatura
      ultimaPagina.drawLine({
        start: { x: x1, y: yLinhaAssinatura },
        end: { x: x1 + larguraArea, y: yLinhaAssinatura },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Aplicar informações da clínica
      const nomeClinica = user?.nome || user?.razao_social || 'Clínica';
      const cnpjClinica = user?.cnpj || '';
      
      console.log('👤 [ModalCadastroClinica] Dados da clínica:', {
        nomeClinica,
        cnpjClinica
      });
      
      // Texto centralizado abaixo da linha
      const textoClinica = 'ASSINATURA CLÍNICA';
      const larguraTextoClinica = textoClinica.length * 4.5;
      ultimaPagina.drawText(textoClinica, {
        x: x1 + (larguraArea - larguraTextoClinica) / 2,
        y: yLinhaAssinatura - 12,
        size: 7,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      // Nome da clínica centralizado (com quebra de linha se necessário)
      const larguraNomeClinica = nomeClinica.length * 3.5;
      ultimaPagina.drawText(nomeClinica, {
        x: x1 + (larguraArea - larguraNomeClinica) / 2,
        y: yLinhaAssinatura - 22,
        size: 6,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      if (cnpjClinica) {
        const textoCnpjClinica = `CNPJ: ${cnpjClinica}`;
        const larguraCnpjClinica = textoCnpjClinica.length * 3.5;
        ultimaPagina.drawText(textoCnpjClinica, {
          x: x1 + (larguraArea - larguraCnpjClinica) / 2,
          y: yLinhaAssinatura - 32,
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      // Área 2: ASSINATURA PACIENTE
      const x2 = x1 + larguraArea + espacoEntreColunas;
      
      // Linha para assinatura
      ultimaPagina.drawLine({
        start: { x: x2, y: yLinhaAssinatura },
        end: { x: x2 + larguraArea, y: yLinhaAssinatura },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Texto centralizado abaixo da linha
      const textoPaciente = 'ASSINATURA PACIENTE';
      const larguraTextoPaciente = textoPaciente.length * 4.5;
      ultimaPagina.drawText(textoPaciente, {
        x: x2 + (larguraArea - larguraTextoPaciente) / 2,
        y: yLinhaAssinatura - 12,
        size: 7,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      const nomePaciente = formData.nome || '';
      const cpfPaciente = formData.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
      
      if (nomePaciente) {
        const larguraNomePaciente = nomePaciente.length * 3.5;
        ultimaPagina.drawText(nomePaciente, {
          x: x2 + (larguraArea - larguraNomePaciente) / 2,
          y: yLinhaAssinatura - 22,
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      if (cpfPaciente) {
        const textoCpfPaciente = `CPF: ${cpfPaciente}`;
        const larguraCpfPaciente = textoCpfPaciente.length * 3.5;
        ultimaPagina.drawText(textoCpfPaciente, {
          x: x2 + (larguraArea - larguraCpfPaciente) / 2,
          y: yLinhaAssinatura - 32,
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      
      // Área 3: ASSINATURA GRUPO IM
      const x3 = x2 + larguraArea + espacoEntreColunas;
      
      // Linha para assinatura
      ultimaPagina.drawLine({
        start: { x: x3, y: yLinhaAssinatura },
        end: { x: x3 + larguraArea, y: yLinhaAssinatura },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Texto centralizado abaixo da linha
      const textoGrupoIM = 'ASSINATURA GRUPO IM';
      const larguraTextoGrupoIM = textoGrupoIM.length * 4.5;
      ultimaPagina.drawText(textoGrupoIM, {
        x: x3 + (larguraArea - larguraTextoGrupoIM) / 2,
        y: yLinhaAssinatura - 12,
        size: 7,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      const nomeGrupoIM = 'INVESTMONEY S.A.';
      const larguraNomeGrupoIM = nomeGrupoIM.length * 3.5;
      ultimaPagina.drawText(nomeGrupoIM, {
        x: x3 + (larguraArea - larguraNomeGrupoIM) / 2,
        y: yLinhaAssinatura - 22,
        size: 6,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      const cnpjGrupoIM = 'CNPJ: 41.267.440/0001-97';
      const larguraCnpjGrupoIM = cnpjGrupoIM.length * 3.5;
      ultimaPagina.drawText(cnpjGrupoIM, {
        x: x3 + (larguraArea - larguraCnpjGrupoIM) / 2,
        y: yLinhaAssinatura - 32,
        size: 6,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      // Linha separadora antes do hash e data
      ultimaPagina.drawLine({
        start: { x: margemLateral, y: yBaseRodape + 25 },
        end: { x: larguraPagina - margemLateral, y: yBaseRodape + 25 },
        thickness: 0.3,
        color: rgb(0.6, 0.6, 0.6),
      });
      
      console.log('✅ [ModalCadastroClinica] Rodapé estruturado desenhado');
      
      // Salvar PDF com assinatura e rodapé (antes de adicionar hash)
      const pdfBytesAntesHash = await pdfDoc.save();
      console.log('💾 [ModalCadastroClinica] PDF salvo antes do hash, tamanho:', pdfBytesAntesHash.length);
      
      // Gerar hash SHA1 do PDF com assinatura e rodapé
      const hashRastreamento = await gerarHashSHA1(pdfBytesAntesHash);
      console.log('✅ [ModalCadastroClinica] Hash gerado:', hashRastreamento);
      
      // Recarregar PDF para adicionar hash no rodapé
      const pdfDocComHash = await PDFDocument.load(pdfBytesAntesHash);
      const ultimaPaginaComHash = pdfDocComHash.getPages()[pdfDocComHash.getPages().length - 1];
      const larguraPaginaHash = ultimaPaginaComHash.getWidth();
      
      // Reutilizar as mesmas configurações de margem
      const margemLateralHash = 50;
      const yBaseRodapeHash = 20;
      
      // Data e Hash no final do rodapé - melhor posicionados
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      const horaFormatada = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      ultimaPaginaComHash.drawText(`Data/Hora: ${dataFormatada} ${horaFormatada}`, {
        x: margemLateralHash,
        y: yBaseRodapeHash + 8,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Hash centralizado no rodapé
      const textoHash = `HASH/ID: ${hashRastreamento}`;
      const larguraHashAprox = textoHash.length * 3.5;
      ultimaPaginaComHash.drawText(textoHash, {
        x: (larguraPaginaHash - larguraHashAprox) / 2,
        y: yBaseRodapeHash + 8,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      console.log('✅ [ModalCadastroClinica] Hash adicionado ao rodapé');
      
      // Salvar PDF final COM hash
      const pdfBytesFinal = await pdfDocComHash.save();
      console.log('✅ [ModalCadastroClinica] PDF final gerado:', {
        tamanho: pdfBytesFinal.length,
        hash: hashRastreamento
      });
      
      // Revogar URL antiga se existir
      if (contratoPdfUrl) {
        URL.revokeObjectURL(contratoPdfUrl);
      }
      
      // Atualizar o arquivo do contrato com o PDF assinado
      const blob = new Blob([pdfBytesFinal], { type: 'application/pdf' });
      const file = new File([blob], formData.contrato_arquivo.name, { type: 'application/pdf' });
      setFormData(prev => ({ ...prev, contrato_arquivo: file }));
      setContratoPdfBytes(pdfBytesFinal);
      
      // Criar nova URL do preview
      const url = URL.createObjectURL(blob);
      console.log('🔗 [ModalCadastroClinica] Nova URL criada:', url);
      setContratoPdfUrl(url);
      
      // Forçar re-render do iframe mudando a key
      setPdfKey(prev => prev + 1);
      
      // Aguardar um pouco para garantir que o estado foi atualizado
      setTimeout(() => {
        console.log('🔄 [ModalCadastroClinica] Forçando atualização do iframe...');
        // Forçar atualização do iframe
        const iframe = document.querySelector(`iframe[title="Preview do Contrato"]`);
        if (iframe) {
          iframe.src = '';
          setTimeout(() => {
            iframe.src = url;
            console.log('✅ [ModalCadastroClinica] Iframe atualizado');
          }, 100);
        }
      }, 100);
      
      showSuccessToast('Contrato assinado com sucesso! Hash: ' + hashRastreamento.substring(0, 8) + '...');
      
      // Limpar estados de assinatura
      setAssinaturaBase64(null);
      setHasAssinatura(false);
      setMostrarCanvasAssinatura(false);
      
    } catch (error) {
      console.error('❌ [ModalCadastroClinica] Erro ao assinar contrato:', error);
      showErrorToast(error.message || 'Erro ao assinar contrato. Tente novamente.');
    } finally {
      setAssinandoContrato(false);
    }
  };
  
  // Validar passo 1
  const validarPasso1 = () => {
    if (!formData.nome.trim()) {
      showErrorToast('Por favor, informe o nome do paciente');
      return false;
    }
    if (!formData.telefone.trim() || formData.telefone.replace(/\D/g, '').length < 10) {
      showErrorToast('Por favor, informe um telefone válido');
      return false;
    }
    if (!formData.cpf.trim() || formData.cpf.replace(/\D/g, '').length !== 11) {
      showErrorToast('Por favor, informe um CPF válido');
      return false;
    }
    return true;
  };
  
  // Validar passo 2
  const validarPasso2 = () => {
    if (!formData.estado) {
      showErrorToast('Por favor, selecione o estado!');
      return false;
    }
    if (!formData.cidade || formData.cidade.trim() === '') {
      showErrorToast('Por favor, informe a cidade!');
      return false;
    }
    if (!formData.tipo_tratamento) {
      showErrorToast('Por favor, selecione o tipo de tratamento!');
      return false;
    }
    return true;
  };
  
  // Validar passo 3
  const validarPasso3 = () => {
    // Passo 3 é opcional, pode avançar sem preencher
    return true;
  };
  
  // Validar passo 4 (Fechamento)
  const validarPasso4 = () => {
    if (!formData.valor_fechado || formData.valor_fechado <= 0) {
      showErrorToast('Por favor, informe um valor válido para o fechamento!');
      return false;
    }
    if (!formData.contrato_arquivo) {
      showErrorToast('Por favor, selecione o contrato em PDF!');
      return false;
    }
    return true;
  };
  
  // Validar passo 5 (Parcelamento)
  const validarPasso5 = () => {
    if (!formData.valor_parcela || formData.valor_parcela <= 0) {
      showErrorToast('Por favor, informe um valor válido para a parcela!');
      return false;
    }
    if (!formData.numero_parcelas || formData.numero_parcelas <= 0) {
      showErrorToast('Por favor, informe o número de parcelas!');
      return false;
    }
    if (!formData.vencimento) {
      showErrorToast('Por favor, informe a data de vencimento!');
      return false;
    }
    if (formData.tem_interesse_antecipar === 'sim' && !formData.antecipacao_meses) {
      showErrorToast('Por favor, informe quantas parcelas deseja antecipar!');
      return false;
    }
    return true;
  };
  
  // Avançar passo
  const avancarPasso = () => {
    if (passoAtual === 1 && !validarPasso1()) return;
    if (passoAtual === 2 && !validarPasso2()) return;
    if (passoAtual === 3 && !validarPasso3()) return;
    if (passoAtual === 4 && !validarPasso4()) return;
    if (passoAtual === 5 && !validarPasso5()) return;
    
    if (passoAtual < 6) {
      setPassoAtual(passoAtual + 1);
    }
  };
  
  // Voltar passo
  const voltarPasso = () => {
    if (passoAtual > 1) {
      setPassoAtual(passoAtual - 1);
    }
  };
  
  // Finalizar cadastro
  const handleFinalizarCadastro = async () => {
    // Validar todos os passos obrigatórios
    if (!validarPasso1()) {
      setPassoAtual(1);
      return;
    }
    if (!validarPasso4()) {
      setPassoAtual(4);
      return;
    }
    if (!validarPasso5()) {
      setPassoAtual(5);
      return;
    }
    
    setLoading(true);
    
    try {
      const clinicaId = user?.clinica_id || user?.id;
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? 'https://crminvest-backend.fly.dev/api' 
        : 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      // 1. Criar o paciente
      const pacienteData = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.replace(/\D/g, ''),
        cpf: formData.cpf.replace(/\D/g, ''),
        data_nascimento: formData.data_nascimento && formData.data_nascimento.length === 10
          ? `${formData.data_nascimento.split('/')[2]}-${formData.data_nascimento.split('/')[1]}-${formData.data_nascimento.split('/')[0]}`
          : null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim().toUpperCase() || null,
        tipo_tratamento: formData.tipo_tratamento || null,
        endereco: formData.endereco.trim() || null,
        bairro: formData.bairro.trim() || null,
        numero: formData.numero.trim() || null,
        cep: formData.cep.replace(/\D/g, '') || null,
        observacoes: formData.observacoes.trim() || null,
        status: 'fechado' // Já criamos como fechado
      };
      
      const pacienteResponse = await makeRequest('/pacientes', {
        method: 'POST',
        body: JSON.stringify(pacienteData)
      });
      
      if (!pacienteResponse.ok) {
        const errorData = await pacienteResponse.json();
        throw new Error(errorData.error || 'Erro ao criar paciente');
      }
      
      const pacienteCriado = await pacienteResponse.json();
      
      // 2. Criar o fechamento com contrato
      const fechamentoFormData = new FormData();
      fechamentoFormData.append('paciente_id', pacienteCriado.id);
      fechamentoFormData.append('consultor_id', pacienteCriado.consultor_id || '');
      fechamentoFormData.append('clinica_id', clinicaId);
      fechamentoFormData.append('tipo_tratamento', formData.tipo_tratamento || '');
      fechamentoFormData.append('valor_fechado', parseFloat(formData.valor_fechado));
      fechamentoFormData.append('data_fechamento', formData.data_fechamento);
      fechamentoFormData.append('observacoes', formData.observacoes_fechamento || 'Fechamento criado automaticamente pela clínica');
      fechamentoFormData.append('valor_parcela', parseFloat(formData.valor_parcela));
      fechamentoFormData.append('numero_parcelas', parseInt(formData.numero_parcelas));
      fechamentoFormData.append('vencimento', formData.vencimento);
      
      if (formData.tem_interesse_antecipar === 'sim' && formData.antecipacao_meses) {
        fechamentoFormData.append('antecipacao_meses', parseInt(formData.antecipacao_meses));
      } else {
        fechamentoFormData.append('antecipacao_meses', 0);
      }
      
      if (formData.contrato_arquivo) {
        fechamentoFormData.append('contrato', formData.contrato_arquivo);
      }
      
      const fechamentoResponse = await fetch(`${API_BASE_URL}/fechamentos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fechamentoFormData
      });
      
      if (!fechamentoResponse.ok) {
        const errorData = await fechamentoResponse.json();
        throw new Error(errorData.error || 'Erro ao criar fechamento');
      }
      
      showSuccessToast(`Paciente ${formData.nome} cadastrado com sucesso! Valor: ${formData.valor_fechado_formatado}`);
      onComplete();
    } catch (error) {
      console.error('Erro ao cadastrar paciente completo:', error);
      showErrorToast(`Erro ao cadastrar paciente: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const totalPassos = 6;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: isMobile ? '1rem' : '2rem'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}
    >
      <div 
        ref={modalRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={logoBrasaoPreto} alt="Logo" style={{ height: '32px' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
              Cadastrar Paciente
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
        
        {/* Indicador de Progresso */}
        <div style={{
          padding: '1.5rem 1.5rem 1rem',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
          }}>
            {[1, 2, 3, 4, 5, 6].map((passo) => (
              <React.Fragment key={passo}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: passoAtual >= passo ? '#059669' : '#e2e8f0',
                  color: passoAtual >= passo ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.3s'
                }}>
                  {passoAtual > passo ? '✓' : passo}
                </div>
                {passo < totalPassos && (
                  <div style={{
                    flex: 1,
                    height: '3px',
                    backgroundColor: passoAtual > passo ? '#059669' : '#e2e8f0',
                    margin: '0 0.5rem',
                    transition: 'all 0.3s'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.5rem'
          }}>
            <span style={{ fontWeight: passoAtual === 1 ? '600' : '400', color: passoAtual === 1 ? '#059669' : '#6b7280' }}>Dados Básicos</span>
            <span style={{ fontWeight: passoAtual === 2 ? '600' : '400', color: passoAtual === 2 ? '#059669' : '#6b7280' }}>Informações</span>
            <span style={{ fontWeight: passoAtual === 3 ? '600' : '400', color: passoAtual === 3 ? '#059669' : '#6b7280' }}>Endereço</span>
            <span style={{ fontWeight: passoAtual === 4 ? '600' : '400', color: passoAtual === 4 ? '#059669' : '#6b7280' }}>Fechamento</span>
            <span style={{ fontWeight: passoAtual === 5 ? '600' : '400', color: passoAtual === 5 ? '#059669' : '#6b7280' }}>Parcelamento</span>
            <span style={{ fontWeight: passoAtual === 6 ? '600' : '400', color: passoAtual === 6 ? '#059669' : '#6b7280' }}>Finalizar</span>
          </div>
        </div>
        
        {/* Conteúdo */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {/* Passo 1: Dados Básicos */}
          {passoAtual === 1 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Dados Básicos
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Informe os dados principais do paciente
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Nome do Paciente *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    onBlur={handleNomeBlur}
                    placeholder="Digite o nome completo"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      handleNomeBlur(e);
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    CPF *
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Passo 2: Informações Adicionais */}
          {passoAtual === 2 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Informações Adicionais
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Complete as informações do paciente (opcional)
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Data de Nascimento
                  </label>
                  <input
                    type="text"
                    name="data_nascimento"
                    value={formData.data_nascimento}
                    onChange={handleInputChange}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Estado *
                    </label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    >
                      <option value="">Selecione o estado</option>
                      {estadosBrasileiros.map(estado => (
                        <option key={estado.sigla} value={estado.sigla}>
                          {estado.sigla} - {estado.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Cidade *
                    </label>
                    {formData.estado && cidadesPorEstado[formData.estado] && !cidadeCustomizada ? (
                      <select
                        name="cidade"
                        value={formData.cidade}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'all 0.2s',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      >
                        <option value="">Selecione a cidade</option>
                        {cidadesPorEstado[formData.estado].map(cidade => (
                          <option key={cidade} value={cidade}>{cidade}</option>
                        ))}
                        <option value="OUTRA">Outra cidade</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          name="cidade"
                          value={formData.cidade}
                          onChange={handleInputChange}
                          placeholder="Digite o nome da cidade"
                          disabled={!formData.estado}
                          required
                          style={{
                            flex: 1,
                            padding: '0.875rem',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#059669'}
                          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                        {formData.estado && cidadesPorEstado[formData.estado] && cidadeCustomizada && (
                          <button
                            type="button"
                            onClick={() => {
                              setCidadeCustomizada(false);
                              setFormData(prev => ({ ...prev, cidade: '' }));
                            }}
                            style={{
                              padding: '0.875rem 1rem',
                              background: '#e2e8f0',
                              color: '#1e293b',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Voltar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Tipo de Tratamento *
                  </label>
                  <select
                    name="tipo_tratamento"
                    value={formData.tipo_tratamento}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="">Selecione</option>
                    <option value="Estético">Estético</option>
                    <option value="Odontológico">Odontológico</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Passo 3: Endereço */}
          {passoAtual === 3 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Endereço
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Informe o endereço do paciente (opcional)
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Rua
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    placeholder="Digite o nome da rua"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Bairro
                    </label>
                    <input
                      type="text"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleInputChange}
                      placeholder="Digite o bairro"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Número
                    </label>
                    <input
                      type="text"
                      name="numero"
                      value={formData.numero}
                      onChange={handleInputChange}
                      placeholder="Nº"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      CEP
                    </label>
                    <input
                      type="text"
                      name="cep"
                      value={formData.cep}
                      onChange={handleInputChange}
                      placeholder="00000-000"
                      maxLength={9}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Passo 4: Dados do Fechamento */}
          {passoAtual === 4 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Dados do Fechamento
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Informe os dados do fechamento do paciente
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Valor do Fechamento *
                  </label>
                  <input
                    type="text"
                    name="valor_fechado_formatado"
                    value={formData.valor_fechado_formatado}
                    onChange={handleInputChange}
                    placeholder="R$ 0,00"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Data do Fechamento *
                  </label>
                  <input
                    type="date"
                    name="data_fechamento"
                    value={formData.data_fechamento}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Contrato (PDF) *
                  </label>
                  <input
                    type="file"
                    name="contrato_arquivo"
                    onChange={handleInputChange}
                    accept=".pdf"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  {formData.contrato_arquivo && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.875rem', 
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      {formData.contrato_arquivo.name}
                    </div>
                  )}
                  
                  {/* Preview do PDF e Assinatura Digital */}
                  {contratoPdfUrl && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                        Assinar Contrato
                      </h3>
                      
                      {/* Botões de assinatura */}
                      {!assinaturaBase64 && (
                        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {!mostrarCanvasAssinatura ? (
                            <button
                              type="button"
                              onClick={() => setMostrarCanvasAssinatura(true)}
                              style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
                            >
                              Criar Assinatura
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={salvarAssinaturaTemporaria}
                                disabled={!hasAssinatura}
                                style={{
                                  padding: '0.75rem 1.5rem',
                                  backgroundColor: hasAssinatura ? '#059669' : '#9ca3af',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  cursor: hasAssinatura ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s'
                                }}
                              >
                                Salvar Assinatura
                              </button>
                              <button
                                type="button"
                                onClick={limparAssinaturaContrato}
                                style={{
                                  padding: '0.75rem 1.5rem',
                                  backgroundColor: '#dc2626',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                Limpar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMostrarCanvasAssinatura(false);
                                  limparAssinaturaContrato();
                                }}
                                style={{
                                  padding: '0.75rem 1.5rem',
                                  backgroundColor: '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Canvas de assinatura */}
                      {mostrarCanvasAssinatura && (
                        <div style={{
                          marginBottom: '1rem',
                          padding: '1rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          backgroundColor: '#f9fafb'
                        }}>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                            Desenhe sua assinatura:
                          </label>
                          <div style={{
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            backgroundColor: 'white',
                            padding: '0.5rem'
                          }}>
                            <SignatureCanvas
                              ref={(ref) => setAssinaturaRef(ref)}
                              canvasProps={{
                                width: 400,
                                height: 150,
                                className: 'signature-canvas',
                                style: {
                                  width: '100%',
                                  height: '100%',
                                  touchAction: 'none'
                                }
                              }}
                              onEnd={() => setHasAssinatura(true)}
                              backgroundColor="white"
                            />
                          </div>
                        </div>
                      )}
                      
                       {/* Preview do PDF */}
                       <div style={{
                         position: 'relative',
                         border: '2px solid #e2e8f0',
                         borderRadius: '8px',
                         overflow: 'hidden',
                         backgroundColor: '#f9fafb',
                         minHeight: '500px'
                       }}>
                         {contratoPdfUrl && (
                           <iframe
                             key={`contrato-pdf-iframe-clinica-${pdfKey}`}
                             src={contratoPdfUrl}
                             style={{
                               width: '100%',
                               height: '500px',
                               border: 'none'
                             }}
                             title="Preview do Contrato"
                             onLoad={() => {
                               console.log('✅ [ModalCadastroClinica] Iframe carregado com sucesso');
                             }}
                           />
                         )}
                       </div>
                      
                      {/* Botão para aplicar assinatura */}
                      {assinaturaBase64 && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={aplicarAssinaturaAoContrato}
                            disabled={assinandoContrato}
                            style={{
                              padding: '0.75rem 1.5rem',
                              backgroundColor: assinandoContrato ? '#9ca3af' : '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: assinandoContrato ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {assinandoContrato ? 'Assinando...' : 'Aplicar Assinatura ao Contrato'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssinaturaBase64(null);
                              setHasAssinatura(false);
                              setMostrarCanvasAssinatura(false);
                            }}
                            style={{
                              padding: '0.75rem 1.5rem',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Remover Assinatura
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Observações do Fechamento
                  </label>
                  <textarea
                    name="observacoes_fechamento"
                    value={formData.observacoes_fechamento}
                    onChange={handleInputChange}
                    placeholder="Informações sobre o fechamento..."
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Passo 5: Parcelamento */}
          {passoAtual === 5 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Informações de Parcelamento
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Informe os dados do parcelamento
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Valor da Parcela *
                  </label>
                  <input
                    type="text"
                    name="valor_parcela_formatado"
                    value={formData.valor_parcela_formatado}
                    onChange={handleInputChange}
                    placeholder="R$ 0,00"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Número de Parcelas *
                  </label>
                  <input
                    type="number"
                    name="numero_parcelas"
                    value={formData.numero_parcelas}
                    onChange={handleInputChange}
                    placeholder="Ex: 12"
                    min="1"
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Data de Vencimento Primeiro Boleto *
                    {empresaId === 3 && <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>(Obrigatório para boletos)</span>}
                  </label>
                  <input
                    type="date"
                    name="vencimento"
                    value={formData.vencimento}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  {empresaId === 3 && (
                    <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', marginBottom: 0 }}>
                      * Obrigatório para gerar boletos na Caixa
                    </p>
                  )}
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                    Tem interesse em antecipar? *
                  </label>
                  <select
                    name="tem_interesse_antecipar"
                    value={formData.tem_interesse_antecipar}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#059669'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </div>
                
                {formData.tem_interesse_antecipar === 'sim' && (
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                      Quantas parcelas quer antecipar? *
                    </label>
                    <input
                      type="number"
                      name="antecipacao_meses"
                      value={formData.antecipacao_meses}
                      onChange={handleInputChange}
                      placeholder="Ex: 3"
                      min="1"
                      required
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#059669'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Passo 6: Observações e Finalizar */}
          {passoAtual === 6 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e293b' }}>
                Observações
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Adicione observações sobre o paciente (opcional)
              </p>
              
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Adicione observações sobre o paciente..."
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#059669'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                <strong>⚠️ Revisão:</strong> Verifique se todos os dados estão corretos antes de finalizar o cadastro.
              </div>
            </div>
          )}
        </div>
        
        {/* Footer com botões */}
        <div style={{
          padding: '1.5rem',
          borderTop: '2px solid #e2e8f0',
          backgroundColor: '#f9fafb',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {passoAtual > 1 && (
            <button
              onClick={voltarPasso}
              disabled={loading}
              style={{
                flex: passoAtual === 6 ? 1 : 'none',
                minWidth: passoAtual === 6 ? '100px' : '120px',
                padding: '0.875rem',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                touchAction: 'manipulation'
              }}
            >
              Voltar
            </button>
          )}
          
          {passoAtual < 6 ? (
            <button
              onClick={avancarPasso}
              disabled={loading}
              style={{
                flex: 2,
                minWidth: '150px',
                padding: '0.875rem',
                backgroundColor: loading ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                touchAction: 'manipulation'
              }}
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleFinalizarCadastro}
              disabled={loading}
              style={{
                flex: 2,
                minWidth: '150px',
                padding: '0.875rem',
                backgroundColor: loading ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                touchAction: 'manipulation',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  Cadastrando...
                </>
              ) : (
                'Finalizar Cadastro'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCadastroPacienteClinica;

