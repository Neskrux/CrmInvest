// Constantes do sistema

/**
 * Status de pacientes
 */
export const STATUS_PACIENTE = {
  NOVO: 'novo',
  CONTATADO: 'contatado',
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  FECHADO: 'fechado',
  PERDIDO: 'perdido'
} as const;

export type StatusPaciente = typeof STATUS_PACIENTE[keyof typeof STATUS_PACIENTE];

/**
 * Status de clínicas
 */
export const STATUS_CLINICA = {
  ATIVA: 'ativa',
  INATIVA: 'inativa',
  BLOQUEADA: 'bloqueada'
} as const;

export type StatusClinica = typeof STATUS_CLINICA[keyof typeof STATUS_CLINICA];

/**
 * Status de agendamentos
 */
export const STATUS_AGENDAMENTO = {
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  CANCELADO: 'cancelado',
  REALIZADO: 'realizado'
} as const;

export type StatusAgendamento = typeof STATUS_AGENDAMENTO[keyof typeof STATUS_AGENDAMENTO];

/**
 * Status de fechamentos
 */
export const STATUS_FECHAMENTO = {
  PENDENTE: 'pendente',
  APROVADO: 'aprovado',
  REJEITADO: 'rejeitado'
} as const;

export type StatusFechamento = typeof STATUS_FECHAMENTO[keyof typeof STATUS_FECHAMENTO];

/**
 * Tipos de usuários
 */
export const TIPOS_USUARIO = {
  ADMIN: 'admin',
  CONSULTOR: 'consultor',
  CLINICA: 'clinica',
  EMPRESA: 'empresa',
  ROOT: 'root'
} as const;

export type TipoUsuario = typeof TIPOS_USUARIO[keyof typeof TIPOS_USUARIO];

/**
 * Tipos de arquivo permitidos
 */
export const TIPOS_ARQUIVO = {
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  JPG: 'image/jpg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp'
} as const;

/**
 * Extensões de arquivo permitidas
 */
export const EXTENSOES_PERMITIDAS = {
  PDF: 'pdf',
  JPEG: 'jpg',
  JPG: 'jpg',
  PNG: 'png',
  GIF: 'gif',
  WEBP: 'webp'
} as const;

/**
 * Tipos de upload
 */
export const TIPOS_UPLOAD = {
  CONTRATO: 'contrato',
  EVIDENCIA: 'evidencia',
  PRINT_CONFIRMACAO: 'print_confirmacao',
  DOCUMENTO: 'documento'
} as const;

export type TipoUpload = typeof TIPOS_UPLOAD[keyof typeof TIPOS_UPLOAD];

/**
 * Limites de arquivo
 */
export const LIMITES_ARQUIVO = {
  TAMANHO_MAXIMO: 10 * 1024 * 1024, // 10MB
  TAMANHO_MAXIMO_EVIDENCIA: 5 * 1024 * 1024, // 5MB para evidências
  TIMEOUT_UPLOAD: 60000 // 60 segundos
} as const;

/**
 * Configurações de rate limiting
 */
export const RATE_LIMITS = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 5
  },
  LEAD_CAPTURE: {
    WINDOW_MS: 60 * 1000, // 1 minuto
    MAX_REQUESTS: 10
  },
  UPLOAD: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hora
    MAX_REQUESTS: 50
  },
  API_EXTERNA: {
    WINDOW_MS: 60 * 1000, // 1 minuto
    MAX_REQUESTS: 30
  },
  NOTIFICACAO: {
    WINDOW_MS: 60 * 1000, // 1 minuto
    MAX_REQUESTS: 20
  },
  GLOBAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 100
  }
} as const;

/**
 * Mensagens de erro padrão
 */
export const MENSAGENS_ERRO = {
  TOKEN_REQUERIDO: 'Token de acesso requerido',
  TOKEN_INVALIDO: 'Token inválido',
  ACESSO_NEGADO: 'Acesso negado',
  APENAS_ADMIN: 'Apenas administradores podem acessar',
  APENAS_ADMIN_OU_CONSULTOR: 'Apenas administradores ou consultores podem acessar',
  APENAS_ADMIN_OU_EMPRESA: 'Apenas administradores ou empresas podem acessar',
  APENAS_PROPRIA_EMPRESA: 'Você só pode acessar dados da sua própria empresa',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
  SENHA_INCORRETA: 'Senha incorreta',
  EMAIL_OBRIGATORIO: 'Email é obrigatório',
  SENHA_OBRIGATORIA: 'Senha é obrigatória',
  DADOS_INVALIDOS: 'Dados inválidos',
  ARQUIVO_OBRIGATORIO: 'Arquivo é obrigatório',
  ARQUIVO_MUITO_GRANDE: 'Arquivo muito grande',
  TIPO_ARQUIVO_NAO_PERMITIDO: 'Tipo de arquivo não permitido',
  ROTA_NAO_ENCONTRADA: 'Rota não encontrada',
  ERRO_INTERNO: 'Erro interno do servidor',
  MUITAS_TENTATIVAS: 'Muitas tentativas. Tente novamente mais tarde.',
  ORIGEM_NAO_PERMITIDA: 'Origem não permitida',
  REQUISICAO_MALICIOSA: 'Requisição maliciosa detectada',
  IP_BLOQUEADO: 'IP bloqueado por tentativas excessivas'
} as const;

/**
 * Mensagens de sucesso padrão
 */
export const MENSAGENS_SUCESSO = {
  LOGIN_REALIZADO: 'Login realizado com sucesso',
  LOGOUT_REALIZADO: 'Logout realizado com sucesso',
  USUARIO_CRIADO: 'Usuário criado com sucesso',
  USUARIO_ATUALIZADO: 'Usuário atualizado com sucesso',
  SENHA_ALTERADA: 'Senha alterada com sucesso',
  ARQUIVO_UPLOADED: 'Arquivo enviado com sucesso',
  DADOS_SALVOS: 'Dados salvos com sucesso',
  OPERACAO_REALIZADA: 'Operação realizada com sucesso'
} as const;

/**
 * Configurações de cache
 */
export const CACHE_CONFIG = {
  TTL_DEFAULT: 300, // 5 minutos
  TTL_LONG: 3600, // 1 hora
  TTL_SHORT: 60, // 1 minuto
  MAX_ENTRIES: 1000
} as const;

/**
 * Configurações de paginação
 */
export const PAGINACAO = {
  LIMITE_DEFAULT: 20,
  LIMITE_MAXIMO: 100,
  PAGINA_DEFAULT: 1
} as const;

/**
 * Configurações de notificação Socket.IO
 */
export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth_error',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  PING: 'ping',
  PONG: 'pong',
  GET_ONLINE_USERS: 'get_online_users',
  ONLINE_USERS: 'online_users',
  GET_ROOM_INFO: 'get_room_info',
  ROOM_INFO: 'room_info',
  NOTIFICATION: 'notification',
  ERROR: 'error'
} as const;

/**
 * Tipos de notificação
 */
export const TIPOS_NOTIFICACAO = {
  NEW_LEAD: 'new_lead',
  NEW_PATIENT: 'new_patient',
  NEW_APPOINTMENT: 'new_appointment',
  NEW_CLINIC: 'new_clinic',
  NEW_CLOSING: 'new_closing',
  STATUS_UPDATE: 'status_update',
  SYSTEM: 'system'
} as const;

export type TipoNotificacao = typeof TIPOS_NOTIFICACAO[keyof typeof TIPOS_NOTIFICACAO];

/**
 * Configurações de email
 */
export const EMAIL_CONFIG = {
  FROM_DEFAULT: 'noreply@solumn.com.br',
  TEMPLATES: {
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password_reset',
    NEW_LEAD: 'new_lead',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    STATUS_UPDATE: 'status_update'
  }
} as const;

/**
 * Configurações de Meta Ads
 */
export const META_ADS_CONFIG = {
  API_VERSION: 'v18.0',
  TIMEOUT: 30000, // 30 segundos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 segundo
} as const;

/**
 * Configurações de IDSF
 */
export const IDSF_CONFIG = {
  TIMEOUT: 30000, // 30 segundos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 segundo
} as const;

/**
 * Estados brasileiros
 */
export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

/**
 * Dias da semana
 */
export const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
] as const;

/**
 * Meses do ano
 */
export const MESES_ANO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
] as const;

/**
 * Horários de funcionamento
 */
export const HORARIOS_FUNCIONAMENTO = {
  INICIO: '08:00',
  FIM: '18:00',
  INTERVALO_INICIO: '12:00',
  INTERVALO_FIM: '13:00',
  DURACAO_PADRAO: 60 // minutos
} as const;

/**
 * Configurações de logs
 */
export const LOG_CONFIG = {
  LEVELS: ['error', 'warn', 'info', 'debug'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  DATE_PATTERN: 'YYYY-MM-DD'
} as const;

/**
 * Regex patterns úteis
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TELEFONE: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CEP: /^\d{5}-\d{3}$/,
  URL: /^https?:\/\/.+/,
  ALPHA_NUMERIC: /^[a-zA-Z0-9]+$/,
  ONLY_NUMBERS: /^\d+$/,
  ONLY_LETTERS: /^[a-zA-ZÀ-ÿ\s]+$/
} as const;

/**
 * Configurações de segurança
 */
export const SECURITY_CONFIG = {
  JWT_EXPIRES_IN: '24h',
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutos
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 horas
} as const;
