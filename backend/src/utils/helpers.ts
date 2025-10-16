// Funções utilitárias para normalização e validação

/**
 * Normaliza email convertendo para minúsculas e removendo espaços
 */
export const normalizarEmail = (email: string): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

/**
 * Normaliza telefone removendo caracteres não numéricos
 */
export const normalizarTelefone = (telefone: string): string => {
  if (!telefone) return '';
  return telefone.replace(/\D/g, '');
};

/**
 * Formata telefone brasileiro
 */
export const formatarTelefone = (telefone: string): string => {
  const numeros = normalizarTelefone(telefone);
  
  if (numeros.length === 11) {
    return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
  } else if (numeros.length === 10) {
    return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
  }
  
  return telefone; // Retorna original se não conseguir formatar
};

/**
 * Normaliza nome removendo espaços extras e capitalizando
 */
export const normalizarNome = (nome: string): string => {
  if (!nome) return '';
  return nome
    .trim()
    .replace(/\s+/g, ' ') // Remove espaços múltiplos
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Normaliza CNPJ removendo caracteres não numéricos
 */
export const normalizarCNPJ = (cnpj: string): string => {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
};

/**
 * Formata CNPJ brasileiro
 */
export const formatarCNPJ = (cnpj: string): string => {
  const numeros = normalizarCNPJ(cnpj);
  
  if (numeros.length === 14) {
    return `${numeros.substring(0, 2)}.${numeros.substring(2, 5)}.${numeros.substring(5, 8)}/${numeros.substring(8, 12)}-${numeros.substring(12)}`;
  }
  
  return cnpj; // Retorna original se não conseguir formatar
};

/**
 * Normaliza CPF removendo caracteres não numéricos
 */
export const normalizarCPF = (cpf: string): string => {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
};

/**
 * Formata CPF brasileiro
 */
export const formatarCPF = (cpf: string): string => {
  const numeros = normalizarCPF(cpf);
  
  if (numeros.length === 11) {
    return `${numeros.substring(0, 3)}.${numeros.substring(3, 6)}.${numeros.substring(6, 9)}-${numeros.substring(9)}`;
  }
  
  return cpf; // Retorna original se não conseguir formatar
};

/**
 * Formata valor monetário brasileiro
 */
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

/**
 * Converte string para número monetário
 */
export const parsearMoeda = (valor: string): number => {
  if (!valor) return 0;
  
  // Remove tudo exceto números, vírgulas e pontos
  const limpo = valor.replace(/[^\d,.-]/g, '');
  
  // Se tem vírgula e ponto, vírgula é separador decimal
  if (limpo.includes(',') && limpo.includes('.')) {
    return parseFloat(limpo.replace('.', '').replace(',', '.'));
  }
  
  // Se tem vírgula, pode ser separador decimal
  if (limpo.includes(',') && !limpo.includes('.')) {
    return parseFloat(limpo.replace(',', '.'));
  }
  
  // Caso contrário, tratar como número normal
  return parseFloat(limpo) || 0;
};

/**
 * Formata data para exibição brasileira
 */
export const formatarData = (data: Date | string): string => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  
  if (isNaN(dataObj.getTime())) {
    return '';
  }
  
  return dataObj.toLocaleDateString('pt-BR');
};

/**
 * Formata data e hora para exibição brasileira
 */
export const formatarDataHora = (data: Date | string): string => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  
  if (isNaN(dataObj.getTime())) {
    return '';
  }
  
  return dataObj.toLocaleString('pt-BR');
};

/**
 * Gera código de referência único
 */
export const gerarCodigoReferencia = (prefixo: string = 'REF'): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefixo}-${timestamp}-${random}`.toUpperCase();
};

/**
 * Gera código de consultor único
 */
export const gerarCodigoConsultor = (): string => {
  return gerarCodigoReferencia('CON');
};

/**
 * Gera URL personalizada
 */
export const gerarUrlPersonalizada = (codigo: string, baseUrl: string = 'https://crm.investmoneysa.com.br'): string => {
  return `${baseUrl}/lead/${codigo}`;
};

/**
 * Extrai domínio de um email
 */
export const extrairDominioEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1] || '';
};

/**
 * Verifica se um email é corporativo (não é Gmail, Yahoo, etc.)
 */
export const isEmailCorporativo = (email: string): boolean => {
  const dominio = extrairDominioEmail(email);
  const dominiosPessoais = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br'
  ];
  
  return !dominiosPessoais.includes(dominio.toLowerCase());
};

/**
 * Calcula idade a partir da data de nascimento
 */
export const calcularIdade = (dataNascimento: Date | string): number => {
  const nascimento = typeof dataNascimento === 'string' ? new Date(dataNascimento) : dataNascimento;
  const hoje = new Date();
  
  if (isNaN(nascimento.getTime())) {
    return 0;
  }
  
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
};

/**
 * Converte bytes para formato legível
 */
export const formatarBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gera hash simples para strings
 */
export const gerarHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Verifica se uma string é uma URL válida
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Remove acentos de uma string
 */
export const removerAcentos = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Converte string para slug (URL-friendly)
 */
export const gerarSlug = (str: string): string => {
  return removerAcentos(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Mascara dados sensíveis para logs
 */
export const mascararDados = (dados: any): any => {
  if (typeof dados === 'string') {
    // Mascarar emails
    if (dados.includes('@')) {
      const [usuario, dominio] = dados.split('@');
      return `${usuario?.substring(0, 2) || '**'}***@${dominio}`;
    }
    
    // Mascarar telefones
    if (dados.replace(/\D/g, '').length >= 10) {
      const numeros = dados.replace(/\D/g, '');
      return numeros.substring(0, 2) + '****' + numeros.substring(numeros.length - 2);
    }
    
    // Mascarar CPF/CNPJ
    if (dados.replace(/\D/g, '').length === 11) {
      const numeros = dados.replace(/\D/g, '');
      return numeros.substring(0, 3) + '.***.***-**';
    }
    
    if (dados.replace(/\D/g, '').length === 14) {
      const numeros = dados.replace(/\D/g, '');
      return numeros.substring(0, 2) + '.***.***/****-**';
    }
  }
  
  if (typeof dados === 'object' && dados !== null) {
    const mascarado = Array.isArray(dados) ? [] : {};
    
    for (const [chave, valor] of Object.entries(dados)) {
      if (['email', 'telefone', 'cpf', 'cnpj', 'senha', 'password'].includes(chave.toLowerCase())) {
        (mascarado as any)[chave] = mascararDados(valor);
      } else {
        (mascarado as any)[chave] = valor;
      }
    }
    
    return mascarado;
  }
  
  return dados;
};

/**
 * Valida formato de email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida formato de telefone brasileiro
 */
export const isValidTelefone = (telefone: string): boolean => {
  const numeros = normalizarTelefone(telefone);
  return numeros.length === 10 || numeros.length === 11;
};

/**
 * Valida formato de CEP brasileiro
 */
export const isValidCEP = (cep: string): boolean => {
  const numeros = cep.replace(/\D/g, '');
  return numeros.length === 8;
};

/**
 * Formata CEP brasileiro
 */
export const formatarCEP = (cep: string): string => {
  const numeros = cep.replace(/\D/g, '');
  
  if (numeros.length === 8) {
    return `${numeros.substring(0, 5)}-${numeros.substring(5)}`;
  }
  
  return cep;
};

/**
 * Calcula diferença entre datas em dias
 */
export const calcularDiferencaDias = (dataInicial: Date | string, dataFinal: Date | string): number => {
  const inicio = typeof dataInicial === 'string' ? new Date(dataInicial) : dataInicial;
  const fim = typeof dataFinal === 'string' ? new Date(dataFinal) : dataFinal;
  
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
    return 0;
  }
  
  const diffTime = Math.abs(fim.getTime() - inicio.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Verifica se uma data está em um intervalo
 */
export const isDataNoIntervalo = (data: Date | string, inicio: Date | string, fim: Date | string): boolean => {
  const dataVerificacao = typeof data === 'string' ? new Date(data) : data;
  const dataInicio = typeof inicio === 'string' ? new Date(inicio) : inicio;
  const dataFim = typeof fim === 'string' ? new Date(fim) : fim;
  
  if (isNaN(dataVerificacao.getTime()) || isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
    return false;
  }
  
  return dataVerificacao >= dataInicio && dataVerificacao <= dataFim;
};

/**
 * Gera array de datas entre duas datas
 */
export const gerarArrayDatas = (dataInicial: Date | string, dataFinal: Date | string): Date[] => {
  const inicio = typeof dataInicial === 'string' ? new Date(dataInicial) : dataInicial;
  const fim = typeof dataFinal === 'string' ? new Date(dataFinal) : dataFinal;
  
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
    return [];
  }
  
  const datas: Date[] = [];
  const dataAtual = new Date(inicio);
  
  while (dataAtual <= fim) {
    datas.push(new Date(dataAtual));
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  
  return datas;
};

/**
 * Converte string para boolean
 */
export const stringToBoolean = (value: string | boolean | number): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'sim';
  }
  return false;
};

/**
 * Capitaliza primeira letra de cada palavra
 */
export const capitalizar = (str: string): string => {
  return str.replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Remove tags HTML de uma string
 */
export const removerTagsHTML = (str: string): string => {
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Trunca string com reticências
 */
export const truncarTexto = (texto: string, limite: number): string => {
  if (!texto || texto.length <= limite) return texto;
  return texto.substring(0, limite).trim() + '...';
};

/**
 * Verifica se um objeto está vazio
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (typeof obj === 'string') return obj.trim().length === 0;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Deep clone de um objeto
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
};

/**
 * Merge de objetos profundos
 */
export const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
};
