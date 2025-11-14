import React from 'react';
import { dashboardTheme, formatCurrency } from '../../config/dashboardStyles';

/**
 * Componente reutilizável para exibir métricas (VGV, Entrada, etc.)
 * Facilita modificações futuras mantendo consistência visual
 */
const MetricCard = ({ 
  title,
  value,
  meta,
  valueColor,
  metaColor,
  formatValue = (v) => v,
  isGeneral = false,
  style = {}
}) => {
  // Calcular porcentagem da meta para VGV e Entrada
  const vgvAtual = parseFloat(value?.vgv_atual || value?.vgv || 0);
  const vgvMeta = parseFloat(meta?.vgv || meta?.meta_vgv || 0);
  const entradaAtual = parseFloat(value?.entrada_atual || value?.entrada || 0);
  const entradaMeta = parseFloat(meta?.entrada || meta?.meta_entrada || 0);
  
  const percentualVGV = vgvMeta > 0 ? (vgvAtual / vgvMeta) * 100 : 0;
  const percentualEntrada = entradaMeta > 0 ? (entradaAtual / entradaMeta) * 100 : 0;
  
  // Cores baseadas na porcentagem da meta: >= 50% = verde, < 50% = azul
  const corVGV = percentualVGV >= 50 ? dashboardTheme.colors.success : dashboardTheme.colors.primary;
  const corEntrada = percentualEntrada >= 50 ? dashboardTheme.colors.success : dashboardTheme.colors.primary;

  const cardStyle = {
    backgroundColor: dashboardTheme.colors.gray[50],
    border: `1px solid ${dashboardTheme.colors.gray[200]}`,
    borderRadius: dashboardTheme.borderRadius.sm,
    padding: dashboardTheme.spacing.sm,
    paddingTop: dashboardTheme.spacing.sm, // Garante padding-top consistente
    textAlign: 'center',
    transition: `all ${dashboardTheme.transitions.default}`,
    overflow: 'hidden', // SEM SCROLL - nunca
    marginTop: '0', // Remove qualquer margin-top extra
    ...(isGeneral && {
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      borderColor: dashboardTheme.colors.primary
    }),
    ...style
  };

  return (
    <div style={cardStyle}>
      {title && (
        <div style={{
          fontSize: dashboardTheme.fontSize.lg, // Aumentado de md para lg
          fontWeight: dashboardTheme.fontWeight.semibold,
          color: dashboardTheme.colors.gray[800],
          marginBottom: dashboardTheme.spacing.sm, // Reduzido de md para sm para melhor alinhamento
          marginTop: '0' // Remove qualquer margin-top extra
        }}>
          {title}
        </div>
      )}

      <div style={{ marginBottom: dashboardTheme.spacing.md }}>
        <div style={{
          fontSize: dashboardTheme.fontSize.base, // Aumentado de sm para base
          color: dashboardTheme.colors.gray[500],
          marginBottom: dashboardTheme.spacing.xs
        }}>
          VGV
        </div>
        <div style={{
          fontSize: dashboardTheme.fontSize['2xl'] || '1.5rem', // Aumentado de lg para 2xl
          fontWeight: dashboardTheme.fontWeight.bold,
          color: valueColor || corVGV // Usa cor dinâmica baseada na meta
        }}>
          {formatValue(value?.vgv_atual || value?.vgv || 0)}
        </div>
        {meta && (
          <div style={{
            fontSize: dashboardTheme.fontSize.lg, // Aumentado de base para lg
            color: dashboardTheme.colors.gray[400]
          }}>
            Meta: {formatValue(meta?.vgv || meta?.meta_vgv || 0)}
          </div>
        )}
      </div>

      <div>
        <div style={{
          fontSize: dashboardTheme.fontSize.base, // Aumentado de sm para base
          color: dashboardTheme.colors.gray[500],
          marginBottom: dashboardTheme.spacing.xs
        }}>
          Entrada
        </div>
        <div style={{
          fontSize: dashboardTheme.fontSize['2xl'] || '1.5rem', // Aumentado de lg para 2xl
          fontWeight: dashboardTheme.fontWeight.bold,
          color: metaColor || corEntrada // Usa cor dinâmica baseada na meta
        }}>
          {formatValue(value?.entrada_atual || value?.entrada || 0)}
        </div>
        {meta && (
          <div style={{
            fontSize: dashboardTheme.fontSize.lg, // Aumentado de base para lg
            color: dashboardTheme.colors.gray[400]
          }}>
            Meta: {formatValue(meta?.entrada || meta?.meta_entrada || 0)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;

