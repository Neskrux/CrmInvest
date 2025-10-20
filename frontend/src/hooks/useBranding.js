import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBrandingByEmpresa } from '../config/branding';

/**
 * Hook para obter textos dinâmicos baseados no empresa_id do usuário logado
 * Usado nas páginas internas da plataforma (Dashboard, Pacientes, etc.)
 */
export default function useBranding() {
  const { user } = useAuth() || {};

  const empresaId = useMemo(() => {
    return user?.empresa_id || user?.empresaId || null;
  }, [user?.empresa_id, user?.empresaId]);

  const branding = useMemo(() => {
    return getBrandingByEmpresa(empresaId);
  }, [empresaId]);

  return {
    empresaId,
    branding,
    // Aliases para facilitar o uso
    t: branding, // t = texts
    texts: branding,
    // Função helper para obter texto com fallback
    getText: (key, fallback = '') => {
      return branding[key] || fallback;
    },
    // Função helper para obter mensagem
    getMessage: (key, fallback = '') => {
      return branding.mensagens?.[key] || fallback;
    }
  };
}
