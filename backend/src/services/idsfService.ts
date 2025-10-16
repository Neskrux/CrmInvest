import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Interfaces para tipagem da IDSF API
export interface IDSFConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

export interface IDSFHeaders {
  'Authorization': string;
  'Content-Type': string;
  'Accept': string;
  'User-Agent': string;
}

export interface IDSFResponse<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  status?: number;
  headers?: any;
}

export interface IDSFClinica {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  contato?: {
    telefone?: string;
    email?: string;
    site?: string;
  };
  responsavel?: {
    nome: string;
    cpf: string;
    telefone?: string;
    email?: string;
  };
  atividade_principal?: string;
  data_abertura?: string;
  situacao_cadastral?: string;
}

export interface IDSFFinanciamento {
  cnpj: string;
  valor_solicitado: number;
  prazo_meses?: number;
  taxa_juros?: number;
  status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'liberado';
  data_solicitacao: string;
  data_analise?: string;
  observacoes?: string;
  documentos_enviados?: string[];
  valor_aprovado?: number;
  data_liberacao?: string;
}

export interface IDSFAnalise {
  cnpj: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'rejeitada';
  data_inicio: string;
  data_conclusao?: string;
  pontuacao?: number;
  observacoes?: string;
  documentos_analisados?: string[];
  recomendacoes?: string[];
}

export interface IDSFDocumento {
  id: string;
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  formato_aceito: string[];
  tamanho_maximo?: string;
  categoria: string;
}

export interface IDSFHealthCheck {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
  uptime?: number;
}

export class IDSFService {
  private config: IDSFConfig;

  constructor() {
    this.config = {
      baseUrl: process.env['IDSF_BASE_URL'] || 'https://api.idsf.com.br',
      apiKey: process.env['IDSF_API_KEY'] || '',
      timeout: 30000, // 30 segundos
      retryAttempts: 3
    };
  }

  // Verificar se a API está configurada
  public isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl);
  }

  // Obter headers padrão para autenticação
  private getDefaultHeaders(): IDSFHeaders {
    if (!this.config.apiKey) {
      throw new Error('IDSF API Key não configurada. Entre em contato com developers@idsf.com.br');
    }

    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'CrmInvest/1.0'
    };
  }

  // Fazer requisições à API IDSF
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data: any = null,
    customHeaders: Record<string, string> = {}
  ): Promise<IDSFResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: `${this.config.baseUrl}${endpoint}`,
        headers: {
          ...this.getDefaultHeaders(),
          ...customHeaders
        },
        timeout: this.config.timeout
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      console.log(`🔄 Fazendo requisição IDSF: ${method} ${config.url}`);
      
      const response: AxiosResponse<T> = await axios(config);
      
      console.log(`✅ Resposta IDSF recebida: ${response.status}`);
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers
      };
      
    } catch (error: any) {
      console.error('❌ Erro na requisição IDSF:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  // Testar conexão com IDSF
  public async testConnection(): Promise<IDSFResponse<IDSFHealthCheck>> {
    return await this.makeRequest<IDSFHealthCheck>('GET', '/health');
  }

  // Buscar informações de uma clínica no IDSF
  public async getClinica(cnpj: string): Promise<IDSFResponse<IDSFClinica>> {
    if (!cnpj || cnpj.length !== 14) {
      return {
        success: false,
        error: 'CNPJ inválido. Deve conter 14 dígitos'
      };
    }

    return await this.makeRequest<IDSFClinica>('GET', `/clinicas/${cnpj}`);
  }

  // Enviar dados de uma clínica para o IDSF
  public async createClinica(clinicaData: Partial<IDSFClinica>): Promise<IDSFResponse<IDSFClinica>> {
    if (!clinicaData.cnpj || !clinicaData.razao_social) {
      return {
        success: false,
        error: 'CNPJ e Razão Social são obrigatórios'
      };
    }

    return await this.makeRequest<IDSFClinica>('POST', '/clinicas', clinicaData);
  }

  // Atualizar dados de uma clínica no IDSF
  public async updateClinica(cnpj: string, clinicaData: Partial<IDSFClinica>): Promise<IDSFResponse<IDSFClinica>> {
    if (!cnpj || cnpj.length !== 14) {
      return {
        success: false,
        error: 'CNPJ inválido. Deve conter 14 dígitos'
      };
    }

    return await this.makeRequest<IDSFClinica>('PUT', `/clinicas/${cnpj}`, clinicaData);
  }

  // Buscar status de financiamento
  public async getFinanciamento(cnpj: string): Promise<IDSFResponse<IDSFFinanciamento>> {
    if (!cnpj || cnpj.length !== 14) {
      return {
        success: false,
        error: 'CNPJ inválido. Deve conter 14 dígitos'
      };
    }

    return await this.makeRequest<IDSFFinanciamento>('GET', `/financiamentos/${cnpj}`);
  }

  // Solicitar financiamento
  public async createFinanciamento(financiamentoData: Partial<IDSFFinanciamento>): Promise<IDSFResponse<IDSFFinanciamento>> {
    if (!financiamentoData.cnpj || !financiamentoData.valor_solicitado) {
      return {
        success: false,
        error: 'CNPJ e valor solicitado são obrigatórios'
      };
    }

    return await this.makeRequest<IDSFFinanciamento>('POST', '/financiamentos', financiamentoData);
  }

  // Buscar documentos necessários
  public async getDocumentosNecessarios(tipo: string): Promise<IDSFResponse<IDSFDocumento[]>> {
    return await this.makeRequest<IDSFDocumento[]>('GET', `/documentos/${tipo}`);
  }

  // Verificar status de análise
  public async getAnalise(cnpj: string): Promise<IDSFResponse<IDSFAnalise>> {
    if (!cnpj || cnpj.length !== 14) {
      return {
        success: false,
        error: 'CNPJ inválido. Deve conter 14 dígitos'
      };
    }

    return await this.makeRequest<IDSFAnalise>('GET', `/analises/${cnpj}`);
  }

  // Validar CNPJ
  public validateCNPJ(cnpj: string): boolean {
    if (!cnpj || cnpj.length !== 14) {
      return false;
    }

    // Remover caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) {
      return false;
    }

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) {
      return false;
    }

    // Validar dígitos verificadores
    let soma = 0;
    let peso = 2;

    // Primeiro dígito verificador
    for (let i = 11; i >= 0; i--) {
      const digit = cleanCNPJ[i];
      if (digit) {
        soma += parseInt(digit) * peso;
        peso = peso === 9 ? 2 : peso + 1;
      }
    }

    let digito = soma % 11;
    digito = digito < 2 ? 0 : 11 - digito;

    const firstCheckDigit = cleanCNPJ[12];
    if (!firstCheckDigit || parseInt(firstCheckDigit) !== digito) {
      return false;
    }

    // Segundo dígito verificador
    soma = 0;
    peso = 2;

    for (let i = 12; i >= 0; i--) {
      const digit = cleanCNPJ[i];
      if (digit) {
        soma += parseInt(digit) * peso;
        peso = peso === 9 ? 2 : peso + 1;
      }
    }

    digito = soma % 11;
    digito = digito < 2 ? 0 : 11 - digito;

    const secondCheckDigit = cleanCNPJ[13];
    return !!(secondCheckDigit && parseInt(secondCheckDigit) === digito);
  }

  // Formatar CNPJ
  public formatCNPJ(cnpj: string): string {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  // Limpar CNPJ (remover formatação)
  public cleanCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  // Obter configuração atual
  public getConfig(): Partial<IDSFConfig> & { apiKeyConfigured: boolean } {
    return {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts,
      // Não retornar a API key por segurança
      apiKeyConfigured: !!this.config.apiKey
    };
  }
}
