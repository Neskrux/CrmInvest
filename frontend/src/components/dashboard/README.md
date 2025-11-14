# Sistema de Componentes do Dashboard - Documentação

Este sistema foi criado para tornar mais fácil e maleável a modificação dos componentes do dashboard incorporadora.

## Estrutura

### Arquivos de Configuração

- **`../../config/dashboardStyles.js`**: Arquivo centralizado com todas as configurações de estilo, cores, espaçamentos, fontes, etc.

### Componentes Base

- **`BaseCard.js`**: Componente base para todos os cards do dashboard
- **`GridContainer.js`**: Container flexível com grid para layouts
- **`MetricCard.js`**: Componente reutilizável para exibir métricas (VGV, Entrada, etc.)

## Como Usar

### Modificando Cores

Edite `frontend/src/config/dashboardStyles.js`:

```javascript
export const dashboardTheme = {
  colors: {
    primary: '#3b82f6',  // Altere aqui para mudar a cor primária
    // ...
  }
};
```

### Modificando Espaçamentos

Edite `frontend/src/config/dashboardStyles.js`:

```javascript
export const dashboardTheme = {
  spacing: {
    xs: '0.25rem',  // Altere aqui para mudar espaçamentos
    sm: '0.5rem',
    // ...
  }
};
```

### Modificando Layout de Grid

Edite `frontend/src/config/dashboardStyles.js`:

```javascript
export const gridConfigs = {
  brokers: {
    columns: 3,  // Altere aqui para mudar número de colunas
    gap: dashboardTheme.spacing.sm
  },
  // ...
};
```

### Criando um Novo Card

```javascript
import BaseCard from './dashboard/BaseCard';
import { dashboardTheme } from '../config/dashboardStyles';

const MeuCard = ({ dados }) => {
  return (
    <BaseCard title="Meu Título">
      {/* Seu conteúdo aqui */}
    </BaseCard>
  );
};
```

### Criando um Grid de Métricas

```javascript
import BaseCard from './dashboard/BaseCard';
import GridContainer from './dashboard/GridContainer';
import MetricCard from './dashboard/MetricCard';
import { formatCurrency, gridConfigs } from '../config/dashboardStyles';

const MeuGrid = ({ itens }) => {
  return (
    <BaseCard title="Meu Grid">
      <GridContainer columns={3} gap={gridConfigs.brokers.gap}>
        {itens.map((item) => (
          <MetricCard
            key={item.id}
            title={item.nome}
            value={item}
            meta={item.meta}
            formatValue={formatCurrency}
          />
        ))}
      </GridContainer>
    </BaseCard>
  );
};
```

## Benefícios

1. **Centralização**: Todas as configurações de estilo estão em um único arquivo
2. **Consistência**: Componentes usam os mesmos estilos base
3. **Facilidade de Modificação**: Mude cores/espaçamentos em um lugar e afeta todo o dashboard
4. **Reutilização**: Componentes base podem ser usados em qualquer lugar
5. **Manutenibilidade**: Código mais limpo e organizado

## Componentes Refatorados

- ✅ `FunnelTotals.js` - Usa `BaseCard` e `dashboardTheme`
- ✅ `BrokerPerformance.js` - Usa `BaseCard`, `GridContainer` e `MetricCard`
- ✅ `CoordinatorPlaceholder.js` - Usa `BaseCard`, `GridContainer` e `MetricCard`
- ✅ `SDRRankingCard.js` - Usa `BaseCard` e `dashboardTheme`

