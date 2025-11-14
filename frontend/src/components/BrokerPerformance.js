import React from 'react';
import BaseCard from './dashboard/BaseCard';
import GridContainer from './dashboard/GridContainer';
import MetricCard from './dashboard/MetricCard';
import { formatCurrency, gridConfigs } from '../config/dashboardStyles';

const BrokerPerformance = ({ general, brokers }) => {
  return (
    <BaseCard title="Corretores">
      <GridContainer columns={gridConfigs.brokers.columns} gap={gridConfigs.brokers.gap}>
        <MetricCard
          title={general.nome}
          value={general}
          meta={{ meta_vgv: general.meta_vgv, meta_entrada: general.meta_entrada }}
          formatValue={formatCurrency}
          isGeneral
        />
        {brokers.map((broker) => (
          <MetricCard
            key={broker.nome}
            title={broker.nome}
            value={broker}
            meta={{ meta_vgv: broker.meta_vgv, meta_entrada: broker.meta_entrada }}
            formatValue={formatCurrency}
          />
        ))}
      </GridContainer>
    </BaseCard>
  );
};

export default BrokerPerformance;

