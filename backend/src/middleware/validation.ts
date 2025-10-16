import { Request, Response, NextFunction } from 'express';

// Middleware para validação de email
export const validateEmail = (req: Request, res: Response, next: NextFunction): void => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400).json({
      success: false,
      error: 'Email é obrigatório'
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      error: 'Formato de email inválido'
    });
    return;
  }

  next();
};

// Middleware para validação de telefone brasileiro
export const validatePhone = (req: Request, res: Response, next: NextFunction): void => {
  const { telefone } = req.body;
  
  if (!telefone) {
    res.status(400).json({
      success: false,
      error: 'Telefone é obrigatório'
    });
    return;
  }

  // Remove todos os caracteres não numéricos
  const cleanPhone = telefone.replace(/\D/g, '');
  
  // Verifica se tem 10 ou 11 dígitos (com ou sem DDD)
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    res.status(400).json({
      success: false,
      error: 'Telefone deve ter 10 ou 11 dígitos'
    });
    return;
  }

  next();
};

// Middleware para validação de CNPJ
export const validateCNPJ = (req: Request, res: Response, next: NextFunction): void => {
  const { cnpj } = req.body;
  
  if (!cnpj) {
    res.status(400).json({
      success: false,
      error: 'CNPJ é obrigatório'
    });
    return;
  }

  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) {
    res.status(400).json({
      success: false,
      error: 'CNPJ deve ter 14 dígitos'
    });
    return;
  }

  // Validação de dígitos verificadores do CNPJ
  if (!isValidCNPJ(cleanCNPJ)) {
    res.status(400).json({
      success: false,
      error: 'CNPJ inválido'
    });
    return;
  }

  next();
};

// Função auxiliar para validar CNPJ
const isValidCNPJ = (cnpj: string): boolean => {
  // Elimina CNPJs conhecidos como inválidos
  if (cnpj === '00000000000000' || 
      cnpj === '11111111111111' || 
      cnpj === '22222222222222' || 
      cnpj === '33333333333333' || 
      cnpj === '44444444444444' || 
      cnpj === '55555555555555' || 
      cnpj === '66666666666666' || 
      cnpj === '77777777777777' || 
      cnpj === '88888888888888' || 
      cnpj === '99999999999999') {
    return false;
  }

  // Valida DVs
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  return resultado === parseInt(digitos.charAt(1));
};

// Middleware para validação de CPF
export const validateCPF = (req: Request, res: Response, next: NextFunction): void => {
  const { cpf } = req.body;
  
  if (!cpf) {
    res.status(400).json({
      success: false,
      error: 'CPF é obrigatório'
    });
    return;
  }

  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    res.status(400).json({
      success: false,
      error: 'CPF deve ter 11 dígitos'
    });
    return;
  }

  // Validação de dígitos verificadores do CPF
  if (!isValidCPF(cleanCPF)) {
    res.status(400).json({
      success: false,
      error: 'CPF inválido'
    });
    return;
  }

  next();
};

// Função auxiliar para validar CPF
const isValidCPF = (cpf: string): boolean => {
  // Elimina CPFs conhecidos como inválidos
  if (cpf === '00000000000' || 
      cpf === '11111111111' || 
      cpf === '22222222222' || 
      cpf === '33333333333' || 
      cpf === '44444444444' || 
      cpf === '55555555555' || 
      cpf === '66666666666' || 
      cpf === '77777777777' || 
      cpf === '88888888888' || 
      cpf === '99999999999') {
    return false;
  }

  // Valida 1o dígito
  let add = 0;
  for (let i = 0; i < 9; i++) {
    add += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  // Valida 2o dígito
  add = 0;
  for (let i = 0; i < 10; i++) {
    add += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(cpf.charAt(10));
};

// Middleware para validação de senha
export const validatePassword = (req: Request, res: Response, next: NextFunction): void => {
  const { senha } = req.body;
  
  if (!senha) {
    res.status(400).json({
      success: false,
      error: 'Senha é obrigatória'
    });
    return;
  }

  // Mínimo 6 caracteres
  if (senha.length < 6) {
    res.status(400).json({
      success: false,
      error: 'Senha deve ter pelo menos 6 caracteres'
    });
    return;
  }

  next();
};

// Middleware para validação de campos obrigatórios
export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];
    
    fields.forEach(field => {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: `Campos obrigatórios: ${missingFields.join(', ')}`
      });
      return;
    }

    next();
  };
};

// Middleware para sanitização de strings
export const sanitizeStrings = (req: Request, _res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitizeObject(req.body);
  next();
};

// Middleware para validação de data
export const validateDate = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dateValue = req.body[fieldName];
    
    if (!dateValue) {
      res.status(400).json({
        success: false,
        error: `${fieldName} é obrigatório`
      });
      return;
    }

    const date = new Date(dateValue);
    
    if (isNaN(date.getTime())) {
      res.status(400).json({
        success: false,
        error: `${fieldName} deve ser uma data válida`
      });
      return;
    }

    // Atualizar o valor com a data válida
    req.body[fieldName] = date;
    next();
  };
};

// Middleware para validação de valor monetário
export const validateMoney = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const moneyValue = req.body[fieldName];
    
    if (moneyValue === undefined || moneyValue === null) {
      res.status(400).json({
        success: false,
        error: `${fieldName} é obrigatório`
      });
      return;
    }

    const numericValue = parseFloat(moneyValue);
    
    if (isNaN(numericValue) || numericValue < 0) {
      res.status(400).json({
        success: false,
        error: `${fieldName} deve ser um valor numérico positivo`
      });
      return;
    }

    // Atualizar o valor com o número válido
    req.body[fieldName] = numericValue;
    next();
  };
};

// Middleware para validação de status específicos
export const validateStatus = (fieldName: string, allowedStatuses: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const status = req.body[fieldName];
    
    if (!status) {
      res.status(400).json({
        success: false,
        error: `${fieldName} é obrigatório`
      });
      return;
    }

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `${fieldName} deve ser um dos seguintes valores: ${allowedStatuses.join(', ')}`
      });
      return;
    }

    next();
  };
};

// Middleware para validação de ID numérico
export const validateNumericId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: `${paramName} é obrigatório`
      });
      return;
    }

    const numericId = parseInt(id);
    
    if (isNaN(numericId) || numericId <= 0) {
      res.status(400).json({
        success: false,
        error: `${paramName} deve ser um número inteiro positivo`
      });
      return;
    }

    // Atualizar o parâmetro com o número válido
    req.params[paramName] = numericId.toString();
    next();
  };
};
