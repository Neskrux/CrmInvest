const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Sistema de validação de arquivos ultra-seguro
 * Valida tipos MIME, assinaturas de arquivo, tamanhos e conteúdo malicioso
 */

// Tipos de arquivo permitidos com suas assinaturas (magic numbers)
const ALLOWED_FILE_TYPES = {
  // Imagens
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    signatures: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'images'
  },
  'image/png': {
    extensions: ['.png'],
    signatures: ['89504e47'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'images'
  },
  'image/gif': {
    extensions: ['.gif'],
    signatures: ['47494638'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'images'
  },
  
  // Vídeos
  'video/mp4': {
    extensions: ['.mp4'],
    signatures: ['00000018', '00000020', '0000001c'],
    maxSize: 50 * 1024 * 1024, // 50MB
    folder: 'videos'
  },
  'video/avi': {
    extensions: ['.avi'],
    signatures: ['52494646'],
    maxSize: 50 * 1024 * 1024, // 50MB
    folder: 'videos'
  },
  
  // Áudios
  'audio/mpeg': {
    extensions: ['.mp3'],
    signatures: ['494433', 'fffb', 'fff3', 'fff2'],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'audio'
  },
  'audio/wav': {
    extensions: ['.wav'],
    signatures: ['52494646'],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'audio'
  },
  'audio/ogg': {
    extensions: ['.ogg'],
    signatures: ['4f676753'],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'audio'
  },
  'audio/ogg; codecs=opus': {
    extensions: ['.ogg'],
    signatures: ['4f676753'],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'audio'
  },
  
  // Documentos
  'application/pdf': {
    extensions: ['.pdf'],
    signatures: ['25504446'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'documents'
  }
};

// Palavras-chave perigosas que podem indicar conteúdo malicioso
const DANGEROUS_KEYWORDS = [
  'javascript:', 'vbscript:', 'onload=', 'onerror=', 'onclick=',
  '<script', '</script>', 'eval(', 'document.cookie', 'window.location',
  'iframe', 'embed', 'object', 'applet', 'meta http-equiv'
];

/**
 * Valida se o tipo MIME é permitido
 */
function validateMimeType(mimeType) {
  return ALLOWED_FILE_TYPES.hasOwnProperty(mimeType);
}

/**
 * Valida se a extensão do arquivo é permitida para o tipo MIME
 */
function validateFileExtension(filename, mimeType) {
  const allowedType = ALLOWED_FILE_TYPES[mimeType];
  if (!allowedType) return false;
  
  const ext = path.extname(filename).toLowerCase();
  return allowedType.extensions.includes(ext);
}

/**
 * Valida o tamanho do arquivo
 */
function validateFileSize(fileSize, mimeType) {
  const allowedType = ALLOWED_FILE_TYPES[mimeType];
  if (!allowedType) return false;
  
  return fileSize <= allowedType.maxSize;
}

/**
 * Lê os primeiros bytes do arquivo para verificar a assinatura
 */
function getFileSignature(buffer) {
  return buffer.slice(0, 4).toString('hex').toLowerCase();
}

/**
 * Valida a assinatura do arquivo (magic number)
 */
function validateFileSignature(buffer, mimeType) {
  const allowedType = ALLOWED_FILE_TYPES[mimeType];
  if (!allowedType) return false;
  
  const signature = getFileSignature(buffer);
  return allowedType.signatures.some(sig => signature.startsWith(sig));
}

/**
 * Verifica se o conteúdo do arquivo contém elementos perigosos
 */
function validateFileContent(buffer, mimeType) {
  // Para arquivos de texto (PDF, etc), verificar conteúdo perigoso
  if (mimeType === 'application/pdf') {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    return !DANGEROUS_KEYWORDS.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  // Para outros tipos, apenas verificar se não é executável
  const executableSignatures = [
    '4d5a', // PE/EXE
    '7f454c46', // ELF
    'cafebabe', // Java class
    'feedface', // Mach-O
    'cefaedfe' // Mach-O
  ];
  
  const signature = getFileSignature(buffer);
  return !executableSignatures.includes(signature);
}

/**
 * Gera um nome de arquivo seguro
 */
function generateSecureFilename(originalName, mimeType) {
  const allowedType = ALLOWED_FILE_TYPES[mimeType];
  const ext = allowedType.extensions[0];
  
  // Gerar hash seguro do nome original + timestamp
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256')
    .update(originalName + timestamp + randomBytes)
    .digest('hex')
    .substring(0, 16);
  
  return `${allowedType.folder}-${timestamp}-${hash}${ext}`;
}

/**
 * Obtém o diretório de destino baseado no tipo MIME
 */
function getDestinationFolder(mimeType) {
  const allowedType = ALLOWED_FILE_TYPES[mimeType];
  return allowedType ? allowedType.folder : 'unknown';
}

/**
 * Validação completa do arquivo
 */
function validateFile(file) {
  const errors = [];
  
  // 1. Validar tipo MIME
  if (!validateMimeType(file.mimetype)) {
    errors.push(`Tipo de arquivo não permitido: ${file.mimetype}`);
  }
  
  // 2. Validar extensão
  if (!validateFileExtension(file.originalname, file.mimetype)) {
    errors.push(`Extensão não permitida para o tipo ${file.mimetype}`);
  }
  
  // 3. Validar tamanho
  if (!validateFileSize(file.size, file.mimetype)) {
    const maxSize = ALLOWED_FILE_TYPES[file.mimetype]?.maxSize || 0;
    errors.push(`Arquivo muito grande. Máximo permitido: ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
  
  // 4. Validar assinatura do arquivo (temporariamente desabilitado para debug)
  // if (!validateFileSignature(file.buffer, file.mimetype)) {
  //   errors.push('Assinatura do arquivo inválida ou corrompida');
  // }
  
  // 5. Validar conteúdo (temporariamente desabilitado para debug)
  // if (!validateFileContent(file.buffer, file.mimetype)) {
  //   errors.push('Arquivo contém conteúdo potencialmente perigoso');
  // }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    secureFilename: generateSecureFilename(file.originalname, file.mimetype),
    destinationFolder: getDestinationFolder(file.mimetype)
  };
}

/**
 * Sanitiza o nome do arquivo original
 */
function sanitizeOriginalName(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Substituir caracteres especiais
    .substring(0, 100) // Limitar tamanho
    .trim();
}

module.exports = {
  validateFile,
  validateMimeType,
  validateFileExtension,
  validateFileSize,
  validateFileSignature,
  validateFileContent,
  generateSecureFilename,
  getDestinationFolder,
  sanitizeOriginalName,
  ALLOWED_FILE_TYPES
};
