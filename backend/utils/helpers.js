// Função para normalizar emails (converter para minúsculas e limpar espaços)
// Normalizar email (lowercase + trim)
const normalizarEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Validar email
const validarEmail = (email) => {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Formatar CPF/CNPJ
const formatarDocumento = (documento) => {
  if (!documento) return '';
  const apenasNumeros = documento.replace(/\D/g, '');
  
  if (apenasNumeros.length === 11) {
    // CPF: 000.000.000-00
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (apenasNumeros.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return documento;
};

// Formatar telefone
const formatarTelefone = (telefone) => {
  if (!telefone) return '';
  const apenasNumeros = telefone.replace(/\D/g, '');
  
  if (apenasNumeros.length === 10) {
    // Telefone fixo: (00) 0000-0000
    return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (apenasNumeros.length === 11) {
    // Celular: (00) 00000-0000
    return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return telefone;
};

// Formatar CEP
const formatarCEP = (cep) => {
  if (!cep) return '';
  const apenasNumeros = cep.replace(/\D/g, '');
  
  if (apenasNumeros.length === 8) {
    return apenasNumeros.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  
  return cep;
};

// Gerar código aleatório
const gerarCodigoAleatorio = (tamanho = 8) => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  
  for (let i = 0; i < tamanho; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  
  return codigo;
};

// Validar URL
const validarURL = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Capitalizar primeira letra
const capitalizar = (texto) => {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

// Formatar moeda (BRL)
const formatarMoeda = (valor) => {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

// Formatar data (DD/MM/YYYY)
const formatarData = (data) => {
  if (!data) return '';
  const date = new Date(data);
  return date.toLocaleDateString('pt-BR');
};

// Formatar data e hora (DD/MM/YYYY HH:MM)
const formatarDataHora = (data) => {
  if (!data) return '';
  const date = new Date(data);
  return date.toLocaleString('pt-BR');
};

// Calcular idade
const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
};

// Sanitizar string (remover caracteres especiais)
const sanitizarString = (texto) => {
  if (!texto) return '';
  return texto.replace(/[^a-zA-Z0-9\s]/g, '').trim();
};

// Truncar texto
const truncarTexto = (texto, tamanho = 50) => {
  if (!texto) return '';
  if (texto.length <= tamanho) return texto;
  return texto.substring(0, tamanho) + '...';
};

module.exports = {
  normalizarEmail,
  validarEmail,
  formatarDocumento,
  formatarTelefone,
  formatarCEP,
  gerarCodigoAleatorio,
  validarURL,
  capitalizar,
  formatarMoeda,
  formatarData,
  formatarDataHora,
  calcularIdade,
  sanitizarString,
  truncarTexto
};

