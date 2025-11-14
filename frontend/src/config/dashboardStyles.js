/**
 * Configuração centralizada de estilos para o Dashboard Incorporadora
 * Facilita modificações futuras mantendo consistência visual
 */

export const dashboardTheme = {
  // Cores principais - Dark Theme inspirado em F1 Dashboard
  colors: {
    primary: '#3b82f6',      // Azul vibrante
    primaryDark: '#2563eb',  // Azul mais escuro
    secondary: '#8b5cf6',    // Roxo
    success: '#10b981',      // Verde
    warning: '#f59e0b',      // Laranja
    danger: '#ef4444',       // Vermelho
    // Dark theme grays
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',        // Background escuro
      900: '#0f172a',        // Background mais escuro
      950: '#020617'         // Background mais escuro ainda
    },
    // Dark theme específico
    dark: {
      bg: '#0f172a',         // Background principal
      bgSecondary: '#1e293b', // Background secundário
      card: '#1e293b',       // Background dos cards
      cardHover: '#334155',  // Hover dos cards
      border: '#334155',     // Bordas
      text: '#f1f5f9',       // Texto principal
      textSecondary: '#cbd5e1', // Texto secundário
      textMuted: '#94a3b8'   // Texto muted
    }
  },

  // Espaçamentos
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem'
  },

  // Tamanhos de fonte
  fontSize: {
    xs: '0.55rem',
    sm: '0.6rem',
    md: '0.65rem',
    base: '0.75rem',
    lg: '0.875rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    '4xl': '2rem'
  },

  // Pesos de fonte
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },

  // Bordas e sombras
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px'
  },

  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 25px rgba(0, 0, 0, 0.15)'
  },

  // Transições
  transitions: {
    default: '0.2s',
    fast: '0.15s',
    slow: '0.3s'
  }
};

/**
 * Estilos padrão para cards do dashboard
 */
export const cardStyles = {
  base: {
    backgroundColor: '#ffffff',
    border: `1px solid ${dashboardTheme.colors.gray[200]}`,
    borderRadius: dashboardTheme.borderRadius.md,
    padding: dashboardTheme.spacing.md,
    boxShadow: dashboardTheme.shadows.sm,
    transition: `box-shadow ${dashboardTheme.transitions.default}`
  },
  hover: {
    boxShadow: dashboardTheme.shadows.md
  }
};

/**
 * Estilos padrão para títulos de seção
 */
export const sectionTitleStyles = {
  fontSize: dashboardTheme.fontSize.md,
  fontWeight: dashboardTheme.fontWeight.semibold,
  color: dashboardTheme.colors.gray[500],
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: dashboardTheme.spacing.sm,
  textAlign: 'center'
};

/**
 * Configurações de grid para diferentes layouts
 */
export const gridConfigs = {
  brokers: {
    columns: 3,
    gap: dashboardTheme.spacing.sm
  },
  coordinators: {
    columns: 3,
    gap: dashboardTheme.spacing.sm
  },
  funnel: {
    columns: 4,
    gap: dashboardTheme.spacing.md
  }
};

/**
 * Configurações de cores para estágios do funil
 */
export const funnelStageColors = {
  leads: dashboardTheme.colors.primary,
  em_andamento: dashboardTheme.colors.secondary,
  agendamento: dashboardTheme.colors.warning,
  fechamento: dashboardTheme.colors.success
};

/**
 * Função helper para criar estilos de grid dinamicamente
 */
export const createGridStyle = (columns, gap = dashboardTheme.spacing.sm) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
  gap
});

/**
 * Função helper para formatar moeda (sem abreviações)
 */
export const formatCurrency = (value) => {
  // Formatar valor completo sem abreviações
  return `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

