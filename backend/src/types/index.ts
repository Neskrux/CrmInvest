import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user: User;
  token?: string;
}

// Tipos básicos do sistema
export interface User {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  tipo: 'admin' | 'consultor' | 'clinica' | 'empresa';
  is_freelancer?: boolean;
  empresa_id?: string;
  clinica_id?: string;
  telefone?: string;
  podealterarstatus?: boolean;
  pode_ver_todas_novas_clinicas?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Paciente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  status: 'novo' | 'contatado' | 'agendado' | 'confirmado' | 'fechado' | 'perdido';
  consultor_id?: string;
  clinica_id?: string;
  observacoes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Clinica {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  status: 'ativa' | 'inativa' | 'bloqueada';
  consultor_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Agendamento {
  id: string;
  paciente_id: string;
  clinica_id: string;
  consultor_id: string;
  data_agendamento: Date;
  horario: string;
  status: 'agendado' | 'confirmado' | 'cancelado' | 'realizado';
  observacoes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Fechamento {
  id: string;
  paciente_id: string;
  clinica_id: string;
  consultor_id: string;
  valor_fechado: number;
  data_fechamento: Date;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes?: string;
  tipo_contrato?: string;
  arquivo_contrato?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  status: 'novo' | 'contatado' | 'qualificado' | 'convertido' | 'perdido';
  fonte?: string;
  consultor_id?: string;
  clinica_id?: string;
  observacoes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
  razao_social?: string;
  email: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  responsavel?: string;
  ativo?: boolean;
  senha?: string;
  created_at?: string;
}

export interface Consultor {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  senha?: string;
  pix?: string;
  cidade?: string;
  estado?: string;
  is_freelancer?: boolean;
  empresa_id?: string;
  codigo_referencia?: string;
  podealterarstatus?: boolean;
  pode_ver_todas_novas_clinicas?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos para requisições
export interface LoginRequest {
  email: string;
  senha: string;
}

export interface CreateUserRequest {
  nome: string;
  email: string;
  senha: string;
  tipo: User['tipo'];
  telefone?: string;
  empresa_id?: string;
}

export interface UpdateUserRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  tipo?: User['tipo'];
}

export interface UpdateEmpresaRequest {
  nome?: string;
  telefone?: string;
  email?: string;
  senhaAtual?: string;
  novaSenha?: string;
  responsavel?: string;
  cidade?: string;
  estado?: string;
}

export interface CreateConsultorRequest {
  nome: string;
  telefone?: string;
  email: string;
  senha: string;
  pix?: string;
  cidade?: string;
  estado?: string;
  is_freelancer?: boolean;
}

export interface UpdateConsultorRequest {
  nome?: string;
  telefone?: string;
  email?: string;
  pix?: string;
  cidade?: string;
  estado?: string;
  is_freelancer?: boolean;
}

export interface CreatePacienteRequest {
  nome: string;
  email: string;
  telefone: string;
  status?: Paciente['status'];
  observacoes?: string;
  consultor_id?: string;
  clinica_id?: string;
}

export interface UpdatePacienteRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  status?: Paciente['status'];
  observacoes?: string;
  consultor_id?: string;
  clinica_id?: string;
}

export interface CreateClinicaRequest {
  nome: string;
  email: string;
  telefone: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  status?: Clinica['status'];
  consultor_id?: string;
}

export interface UpdateClinicaRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  status?: Clinica['status'];
  consultor_id?: string;
}

export interface CreateAgendamentoRequest {
  paciente_id: string;
  clinica_id: string;
  consultor_id?: string;
  data_agendamento: string;
  horario: string;
  status?: Agendamento['status'];
  observacoes?: string;
}

export interface UpdateAgendamentoRequest {
  paciente_id?: string;
  clinica_id?: string;
  consultor_id?: string;
  data_agendamento?: string;
  horario?: string;
  status?: Agendamento['status'];
  observacoes?: string;
}

export interface CreateFechamentoRequest {
  paciente_id: string;
  clinica_id: string;
  consultor_id?: string;
  valor_fechado: number;
  data_fechamento: string;
  status?: Fechamento['status'];
  observacoes?: string;
  tipo_contrato?: string;
  arquivo_contrato?: string;
}

export interface UpdateFechamentoRequest {
  paciente_id?: string;
  clinica_id?: string;
  consultor_id?: string;
  valor_fechado?: number;
  data_fechamento?: string;
  status?: Fechamento['status'];
  observacoes?: string;
  tipo_contrato?: string;
  arquivo_contrato?: string;
}

export interface CreateLeadRequest {
  nome: string;
  email: string;
  telefone: string;
  clinica_id?: string;
  consultor_id?: string;
  fonte?: string;
  observacoes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface UpdateLeadRequest {
  nome?: string;
  email?: string;
  telefone?: string;
  clinica_id?: string;
  consultor_id?: string;
  status?: Lead['status'];
  observacoes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// Tipos para respostas da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos para autenticação
export interface AuthToken {
  userId: string;
  email: string;
  tipo: User['tipo'];
  iat: number;
  exp: number;
}


// Tipo para handlers de rotas autenticadas
export type AuthenticatedHandler = (req: Request, res: Response, next?: NextFunction) => void | Promise<void>;

// Tipos para upload de arquivos
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Tipos para configurações
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

export interface AppConfig {
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: string;
  uploadPath: string;
  maxFileSize: number;
}
