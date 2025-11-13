/**
 * Funções de validação de dados
 */

/**
 * Valida data no formato DD/MM/YYYY
 * Retorna a data formatada se válida, string vazia se inválida
 */
export function validarDataDDMMYYYY(data) {
  if (!data || data.length < 10) return '';
  const [d, m, y] = data.split('/');
  const dt = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return isNaN(dt.getTime()) ? '' : data;
}

/**
 * Valida telefone brasileiro
 */
export function validarTelefone(telefone) {
  if (!telefone) return false;
  const numbers = telefone.replace(/\D/g, '');
  // Telefone válido tem entre 10 e 11 dígitos
  return numbers.length >= 10 && numbers.length <= 11;
}

/**
 * Valida CPF básico (formato)
 */
export function validarCPF(cpf) {
  if (!cpf) return false;
  const numbers = cpf.replace(/\D/g, '');
  return numbers.length === 11;
}

/**
 * Valida email básico
 */
export function validarEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida se um campo obrigatório está preenchido
 */
export function validarObrigatorio(valor) {
  return valor && valor.trim().length > 0;
}

/**
 * Validação completa de novo cliente/paciente
 */
export function validarNovoCliente(formData) {
  const errors = {};
  
  if (!formData.nome || !formData.nome.trim()) {
    errors.nome = 'Nome é obrigatório';
  }
  
  if (!formData.telefone || !validarTelefone(formData.telefone)) {
    errors.telefone = 'Telefone inválido';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

