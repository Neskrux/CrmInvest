/**
 * Máscaras de input para formatação em tempo real
 */

/**
 * Formata telefone brasileiro: (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskTelefone(value) {
  if (!value) return '';
  
  // Remove todos os caracteres não numéricos (apenas números)
  let numbers = value.replace(/\D/g, '');
  
  // Remove zeros à esquerda (ex: 041 → 41)
  numbers = numbers.replace(/^0+/, '');
  
  // Limita a 11 dígitos (máximo para celular brasileiro)
  const limitedNumbers = numbers.substring(0, 11);
  
  // Aplica formatação baseada no tamanho
  if (limitedNumbers.length === 11) {
    // Celular: (XX) 9XXXX-XXXX
    return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 7)}-${limitedNumbers.substring(7, 11)}`;
  } else if (limitedNumbers.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 6)}-${limitedNumbers.substring(6, 10)}`;
  } else if (limitedNumbers.length > 0) {
    // Formatação parcial conforme vai digitando
    if (limitedNumbers.length <= 2) {
      return `(${limitedNumbers}`;
    } else if (limitedNumbers.length <= 7) {
      return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2)}`;
    } else if (limitedNumbers.length <= 11) {
      return `(${limitedNumbers.substring(0, 2)}) ${limitedNumbers.substring(2, 7)}-${limitedNumbers.substring(7)}`;
    }
  }
  
  return limitedNumbers;
}

/**
 * Formata CPF: XXX.XXX.XXX-XX
 */
export function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Formata data: DD/MM/YYYY
 */
export function maskData(value) {
  if (!value) return '';
  
  // Remove todos os caracteres não numéricos
  let numbers = value.replace(/\D/g, '');
  
  // Limita a 8 dígitos
  numbers = numbers.substring(0, 8);
  
  // Aplica formatação
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}`;
  } else {
    return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}/${numbers.substring(4, 8)}`;
  }
}

/**
 * Formata CEP: XXXXX-XXX
 */
export function maskCEP(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length > 5) {
    return `${numbers.substring(0, 5)}-${numbers.substring(5, 8)}`;
  }
  return numbers;
}

