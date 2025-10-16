export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: 'admin' | 'consultor' | 'clinica' | 'empresa';
  is_freelancer?: boolean;
  empresa_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isConsultorInterno: boolean;
  isEmpresa: boolean;
  isClinica: boolean;
  isFreelancer: boolean;
  podeVerTodosDados: boolean;
  makeRequest: (url: string, options?: RequestInit) => Promise<any>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
