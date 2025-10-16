import { createClient } from '@supabase/supabase-js';

// Interfaces para tipagem
export interface CountResult {
  count: number;
  error?: string;
}

export interface NotificationData {
  count: number;
  timestamp?: string;
}

export class AuxiliaryService {
  private supabaseAdmin: any;
  private updateLeadCountTimeout: NodeJS.Timeout | null = null;
  private updateClinicasCountTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const supabaseUrl = process.env['SUPABASE_URL']!;
    const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY']!;
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }

  // Função auxiliar para contar leads não atribuídos e notificar via Socket.IO
  async updateLeadCount(socketService: any): Promise<void> {
    if (!socketService || !socketService.io) return;
    
    // Debounce: cancelar atualização anterior se ainda não foi executada
    if (this.updateLeadCountTimeout) {
      clearTimeout(this.updateLeadCountTimeout);
    }
    
    this.updateLeadCountTimeout = setTimeout(async () => {
      try {
        const { count, error } = await this.supabaseAdmin
          .from('pacientes')
          .select('*', { count: 'exact', head: true })
          .is('consultor_id', null)
          .eq('status', 'lead');
          
        if (!error) {
          console.log(`📊 Atualizando contagem de leads: ${count || 0}`);
          socketService.io.to('lead-notifications').emit('lead-count-update', { count: count || 0 });
        }
      } catch (error: any) {
        console.error('❌ Erro ao atualizar contagem de leads:', error);
      }
      this.updateLeadCountTimeout = null;
    }, 500); // 500ms de debounce
  }

  // Função auxiliar para contar novas clínicas e notificar via Socket.IO
  async updateClinicasCount(socketService: any): Promise<void> {
    if (!socketService || !socketService.io) return;
    
    // Debounce: cancelar atualização anterior se ainda não foi executada
    if (this.updateClinicasCountTimeout) {
      clearTimeout(this.updateClinicasCountTimeout);
    }
    
    this.updateClinicasCountTimeout = setTimeout(async () => {
      try {
        const { count, error } = await this.supabaseAdmin
          .from('novas_clinicas')
          .select('*', { count: 'exact', head: true });
          
        if (!error) {
          console.log(`📊 Atualizando contagem de novas clínicas: ${count || 0}`);
          socketService.io.to('clinicas-notifications').emit('clinicas-count-update', { count: count || 0 });
        }
      } catch (error: any) {
        console.error('❌ Erro ao atualizar contagem de novas clínicas:', error);
      }
      this.updateClinicasCountTimeout = null;
    }, 500); // 500ms de debounce
  }

  // Contar leads não atribuídos
  async getLeadCount(): Promise<CountResult> {
    try {
      const { count, error } = await this.supabaseAdmin
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .is('consultor_id', null)
        .eq('status', 'lead');
        
      if (error) {
        return { count: 0, error: error.message };
      }
      
      return { count: count || 0 };
    } catch (error: any) {
      return { count: 0, error: error.message };
    }
  }

  // Contar novas clínicas
  async getClinicasCount(): Promise<CountResult> {
    try {
      const { count, error } = await this.supabaseAdmin
        .from('novas_clinicas')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        return { count: 0, error: error.message };
      }
      
      return { count: count || 0 };
    } catch (error: any) {
      return { count: 0, error: error.message };
    }
  }

  // Limpar timeouts (para cleanup)
  cleanup(): void {
    if (this.updateLeadCountTimeout) {
      clearTimeout(this.updateLeadCountTimeout);
      this.updateLeadCountTimeout = null;
    }
    if (this.updateClinicasCountTimeout) {
      clearTimeout(this.updateClinicasCountTimeout);
      this.updateClinicasCountTimeout = null;
    }
  }
}
