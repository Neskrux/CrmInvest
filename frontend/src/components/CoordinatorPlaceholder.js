import React from 'react';
import BaseCard from './dashboard/BaseCard';
import GridContainer from './dashboard/GridContainer';
import MetricCard from './dashboard/MetricCard';
import { gridConfigs, formatCurrency } from '../config/dashboardStyles';
// so vai ser 2 coordenadoras no placeholder
const CoordinatorPlaceholder = ({ coordinators = ['Coordenadora 1', 'Coordenadora 2'] }) => {
  return (
    <BaseCard title="Coordenadoras">
      <GridContainer columns={gridConfigs.coordinators.columns} gap={gridConfigs.coordinators.gap}>
        {coordinators.map((name) => (
          <MetricCard
            key={name}
            title={name}
            value={{ vgv_atual: 0, entrada_atual: 0 }}
            meta={{ meta_vgv: 0, meta_entrada: 0 }}
            formatValue={formatCurrency}
            style={{ opacity: 0.6 }}
          />
        ))}
      </GridContainer>
    </BaseCard>
  );
};

export default CoordinatorPlaceholder;

