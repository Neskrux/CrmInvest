/**
 * Funções de formatação de dados para exibição
 */

/**
 * Formata nome aplicando INITCAP (primeira letra de cada palavra maiúscula)
 */
export function formatarNome(value) {
  if (!value) return '';
  
  // Remove números e caracteres especiais, mantém apenas letras, espaços e acentos
  let cleanValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
  
  // Remove espaços duplos/múltiplos, mas mantém espaços simples
  cleanValue = cleanValue.replace(/\s+/g, ' ');
  
  // Remove espaços apenas do início e fim
  cleanValue = cleanValue.trim();
  
  if (!cleanValue) return '';
  
  // Aplica INITCAP - primeira letra de cada palavra maiúscula
  const nomeFormatado = cleanValue
    .toLowerCase()
    .split(' ')
    .map(palavra => {
      if (!palavra) return '';
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
  
  return nomeFormatado;
}

/**
 * Formata cidade aplicando title case com tratamento de preposições
 */
export function formatarCidade(value) {
  if (!value) return '';
  
  // Remove apenas números e caracteres especiais perigosos, mantém letras, espaços, acentos e hífen
  let cleanValue = value.replace(/[0-9!@#$%^&*()_+=\[\]{}|\\:";'<>?,./~`]/g, '');

  // Não aplicar formatação completa se o usuário ainda está digitando (termina com espaço)
  const isTyping = value.endsWith(' ') && value.length > 0;
  
  if (isTyping) {
    // Durante a digitação, apenas remove caracteres inválidos
    return cleanValue;
  }
  
  // Remove espaços extras apenas quando não está digitando
  cleanValue = cleanValue.replace(/\s+/g, ' ').trim();
  
  // Não permite string vazia
  if (!cleanValue) return '';
  
  // Se tem menos de 2 caracteres, não formatar ainda
  if (cleanValue.length < 2) return cleanValue;
  
  // Verifica se está todo em maiúscula (mais de 3 caracteres) e converte para title case
  const isAllUpperCase = cleanValue.length > 3 && cleanValue === cleanValue.toUpperCase();
  
  if (isAllUpperCase) {
    // Converte para title case
    return cleanValue.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }
  
  // Para entradas normais, aplica title case
  return cleanValue
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      // Palavras que devem ficar em minúscula (exceto se for a primeira)
      const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
      
      // Primeira palavra sempre maiúscula
      if (index === 0) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      }
      
      if (preposicoes.includes(palavra)) {
        return palavra;
      }
      
      // Primeira letra maiúscula
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
}

/**
 * Formata data para exibição: DD/MM/YYYY
 */
export function formatarData(data) {
  if (!data) return '';
  return new Date(data).toLocaleDateString('pt-BR');
}

/**
 * Formata telefone para exibição
 */
export function formatarTelefone(telefone) {
  if (!telefone) return '';
  const numbers = telefone.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
  }
  return telefone;
}

/**
 * Formata CPF para exibição: XXX.XXX.XXX-XX
 */
export function formatarCPF(cpf) {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `${numbers.substring(0, 3)}.${numbers.substring(3, 6)}.${numbers.substring(6, 9)}-${numbers.substring(9)}`;
  }
  return cpf;
}

/**
 * Formata valor monetário: R$ X.XXX,XX
 */
export function formatarMoeda(valor) {
  if (!valor) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

/**
 * Limita caracteres de um texto adicionando "..."
 */
export function limitarCaracteres(texto, limite = 20) {
  if (!texto) return '';
  if (texto.length <= limite) return texto;
  return texto.substring(0, limite) + '...';
}

/**
 * Formata valor de input monetário durante digitação
 */
export function formatarValorInput(valor) {
  const numbers = valor.replace(/[^\d]/g, '');
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numbers / 100);
  return formatted;
}

/**
 * Remove formatação de valor monetário
 */
export function desformatarValor(valorFormatado) {
  return valorFormatado.replace(/[^\d]/g, '') / 100;
}

