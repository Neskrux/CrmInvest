import { 
  STATUS_PACIENTE, 
  STATUS_CLINICA, 
  STATUS_AGENDAMENTO, 
  STATUS_FECHAMENTO, 
  TIPOS_USUARIO,
  TIPOS_ARQUIVO,
  REGEX_PATTERNS 
} from './constants';

/**
 * Validações de dados específicos do sistema
 */

/**
 * Valida se o status do paciente é válido
 */
export const isValidStatusPaciente = (status: string): status is keyof typeof STATUS_PACIENTE => {
  return Object.values(STATUS_PACIENTE).includes(status as any);
};

/**
 * Valida se o status da clínica é válido
 */
export const isValidStatusClinica = (status: string): status is keyof typeof STATUS_CLINICA => {
  return Object.values(STATUS_CLINICA).includes(status as any);
};

/**
 * Valida se o status do agendamento é válido
 */
export const isValidStatusAgendamento = (status: string): status is keyof typeof STATUS_AGENDAMENTO => {
  return Object.values(STATUS_AGENDAMENTO).includes(status as any);
};

/**
 * Valida se o status do fechamento é válido
 */
export const isValidStatusFechamento = (status: string): status is keyof typeof STATUS_FECHAMENTO => {
  return Object.values(STATUS_FECHAMENTO).includes(status as any);
};

/**
 * Valida se o tipo de usuário é válido
 */
export const isValidTipoUsuario = (tipo: string): tipo is keyof typeof TIPOS_USUARIO => {
  return Object.values(TIPOS_USUARIO).includes(tipo as any);
};

/**
 * Valida se o tipo de arquivo é permitido
 */
export const isValidTipoArquivo = (mimeType: string): boolean => {
  return Object.values(TIPOS_ARQUIVO).includes(mimeType as any);
};

/**
 * Valida CPF brasileiro
 */
export const isValidCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Elimina CPFs conhecidos como inválidos
  if (cleanCPF === '00000000000' || 
      cleanCPF === '11111111111' || 
      cleanCPF === '22222222222' || 
      cleanCPF === '33333333333' || 
      cleanCPF === '44444444444' || 
      cleanCPF === '55555555555' || 
      cleanCPF === '66666666666' || 
      cleanCPF === '77777777777' || 
      cleanCPF === '88888888888' || 
      cleanCPF === '99999999999') {
    return false;
  }

  // Valida 1o dígito
  let add = 0;
  for (let i = 0; i < 9; i++) {
    add += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;

  // Valida 2o dígito
  add = 0;
  for (let i = 0; i < 10; i++) {
    add += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(cleanCPF.charAt(10));
};

/**
 * Valida CNPJ brasileiro
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Elimina CNPJs conhecidos como inválidos
  if (cleanCNPJ === '00000000000000' || 
      cleanCNPJ === '11111111111111' || 
      cleanCNPJ === '22222222222222' || 
      cleanCNPJ === '33333333333333' || 
      cleanCNPJ === '44444444444444' || 
      cleanCNPJ === '55555555555555' || 
      cleanCNPJ === '66666666666666' || 
      cleanCNPJ === '77777777777777' || 
      cleanCNPJ === '88888888888888' || 
      cleanCNPJ === '99999999999999') {
    return false;
  }

  // Valida DVs
  let tamanho = cleanCNPJ.length - 2;
  let numeros = cleanCNPJ.substring(0, tamanho);
  const digitos = cleanCNPJ.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cleanCNPJ.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  return resultado === parseInt(digitos.charAt(1));
};

/**
 * Valida email
 */
export const isValidEmail = (email: string): boolean => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

/**
 * Valida telefone brasileiro
 */
export const isValidTelefone = (telefone: string): boolean => {
  const cleanPhone = telefone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

/**
 * Valida CEP brasileiro
 */
export const isValidCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
};

/**
 * Valida URL
 */
export const isValidURL = (url: string): boolean => {
  return REGEX_PATTERNS.URL.test(url);
};

/**
 * Valida senha forte
 */
export const isValidPassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }
  
  if (password.length > 128) {
    errors.push('Senha deve ter no máximo 128 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Valida data de nascimento
 */
export const isValidDataNascimento = (data: string | Date): boolean => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  
  if (isNaN(dataObj.getTime())) {
    return false;
  }
  
  const hoje = new Date();
  const idade = hoje.getFullYear() - dataObj.getFullYear();
  
  // Verificar se a idade é razoável (entre 0 e 150 anos)
  return idade >= 0 && idade <= 150;
};

/**
 * Valida horário no formato HH:MM
 */
export const isValidHorario = (horario: string): boolean => {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(horario);
};

/**
 * Valida se o horário está dentro do horário comercial
 */
export const isHorarioComercial = (horario: string): boolean => {
  if (!isValidHorario(horario)) return false;
  
  const [horaStr, minutoStr] = horario.split(':');
  const hora = parseInt(horaStr || '0');
  const minuto = parseInt(minutoStr || '0');
  const minutosTotais = hora * 60 + minuto;
  
  // Horário comercial: 08:00 às 18:00
  const inicioComercial = 8 * 60; // 08:00
  const fimComercial = 18 * 60; // 18:00
  
  return minutosTotais >= inicioComercial && minutosTotais <= fimComercial;
};

/**
 * Valida se uma data não é no passado
 */
export const isDataFutura = (data: string | Date): boolean => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Zerar horário para comparar apenas a data
  
  return dataObj >= hoje;
};

/**
 * Valida se uma data não é muito distante no futuro
 */
export const isDataRazoavel = (data: string | Date, limiteAnos: number = 2): boolean => {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  const hoje = new Date();
  const limite = new Date();
  limite.setFullYear(hoje.getFullYear() + limiteAnos);
  
  return dataObj <= limite;
};

/**
 * Valida tamanho de arquivo
 */
export const isValidFileSize = (size: number, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

/**
 * Valida nome de arquivo
 */
export const isValidFileName = (fileName: string): boolean => {
  // Verificar caracteres inválidos
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) return false;
  
  // Verificar se não está vazio
  if (fileName.trim().length === 0) return false;
  
  // Verificar tamanho máximo
  if (fileName.length > 255) return false;
  
  return true;
};

/**
 * Valida se o valor monetário é válido
 */
export const isValidMoneyValue = (valor: string | number): boolean => {
  const numValor = typeof valor === 'string' ? parseFloat(valor) : valor;
  
  if (isNaN(numValor)) return false;
  if (numValor < 0) return false;
  if (numValor > 999999999.99) return false; // Limite de R$ 999.999.999,99
  
  return true;
};

/**
 * Valida se o código de referência tem formato válido
 */
export const isValidCodigoReferencia = (codigo: string): boolean => {
  const regex = /^[A-Z]{2,4}-\w{6,}-\w{4,}$/;
  return regex.test(codigo);
};

/**
 * Valida se o estado brasileiro é válido
 */
export const isValidEstadoBrasil = (estado: string): boolean => {
  const estados = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
                  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
                  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  return estados.includes(estado.toUpperCase());
};

/**
 * Valida se o dia da semana é válido
 */
export const isValidDiaSemana = (dia: string): boolean => {
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return dias.includes(dia.toLowerCase());
};

/**
 * Valida se o mês é válido
 */
export const isValidMes = (mes: string | number): boolean => {
  const mesNum = typeof mes === 'string' ? parseInt(mes) : mes;
  return mesNum >= 1 && mesNum <= 12;
};

/**
 * Valida se o ano é válido
 */
export const isValidAno = (ano: string | number): boolean => {
  const anoNum = typeof ano === 'string' ? parseInt(ano) : ano;
  const anoAtual = new Date().getFullYear();
  return anoNum >= 1900 && anoNum <= anoAtual + 10;
};

/**
 * Valida se o ID é um número válido
 */
export const isValidId = (id: string | number): boolean => {
  const idNum = typeof id === 'string' ? parseInt(id) : id;
  return !isNaN(idNum) && idNum > 0 && Number.isInteger(idNum);
};

/**
 * Valida se o UUID é válido
 */
export const isValidUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

/**
 * Valida se o token JWT tem formato válido
 */
export const isValidJWTFormat = (token: string): boolean => {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    parts.forEach(part => {
      Buffer.from(part, 'base64url');
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Valida se o IP é válido
 */
export const isValidIP = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Valida se a latitude é válida
 */
export const isValidLatitude = (lat: string | number): boolean => {
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  return !isNaN(latNum) && latNum >= -90 && latNum <= 90;
};

/**
 * Valida se a longitude é válida
 */
export const isValidLongitude = (lng: string | number): boolean => {
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  return !isNaN(lngNum) && lngNum >= -180 && lngNum <= 180;
};

/**
 * Valida se as coordenadas são válidas
 */
export const isValidCoordinates = (lat: string | number, lng: string | number): boolean => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};

/**
 * Valida se o código de barras EAN-13 é válido
 */
export const isValidEAN13 = (code: string): boolean => {
  const cleanCode = code.replace(/\D/g, '');
  
  if (cleanCode.length !== 13) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCode.charAt(i)) * (i % 2 === 0 ? 1 : 3);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleanCode.charAt(12));
};

/**
 * Valida se o código de barras UPC é válido
 */
export const isValidUPC = (code: string): boolean => {
  const cleanCode = code.replace(/\D/g, '');
  
  if (cleanCode.length !== 12) return false;
  
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(cleanCode.charAt(i)) * (i % 2 === 0 ? 3 : 1);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleanCode.charAt(11));
};

/**
 * Função genérica para validar múltiplos campos
 */
export const validateFields = (data: Record<string, any>, rules: Record<string, (value: any) => boolean>): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    if (!validator(data[field])) {
      errors[field] = `Campo ${field} é inválido`;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};
