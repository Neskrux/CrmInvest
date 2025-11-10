# Sistema de Gestão de Boletos - Resumo

## Visão Geral
Sistema completo para gestão manual e automática de boletos bancários, integrado com a API da Caixa Econômica Federal.

## Funcionalidades Implementadas

### 1. Tabela de Gestão (`boletos_gestao`)
- Armazena todos os boletos do sistema
- Campos principais:
  - `fechamento_id`: Vínculo com o fechamento
  - `paciente_id`: Paciente do boleto
  - `numero_parcela`: Número da parcela
  - `valor`: Valor do boleto
  - `data_vencimento`: Data de vencimento
  - `status`: pendente, pago, vencido, cancelado
  - `gerar_boleto`: Flag para geração automática
  - `boleto_gerado`: Indica se já foi gerado na Caixa

### 2. Interface de Gestão (Admin)
**Componente:** `GestaoBoletosAdmin`
- Listagem de todos os boletos
- Filtros por paciente, status, data
- Edição inline de valores e datas
- Alteração de status manual
- Importação de boletos de fechamentos
- Geração manual na Caixa

### 3. Job de Geração Automática
**Arquivo:** `backend/jobs/gerar-boletos-automatico.js`
- Executa periodicamente (configurável)
- Busca boletos com `gerar_boleto = true`
- Gera apenas 20 dias antes do vencimento
- Integração com API da Caixa
- Tratamento de erros e retry

### 4. Fluxo de Importação
Quando um fechamento é aprovado:
1. Sistema chama `importar_boletos_fechamento`
2. Cria registros em `boletos_gestao` para cada parcela
3. Define datas de vencimento progressivas
4. Marca para geração automática

### 5. API Endpoints

#### Boletos Gestão
- `GET /api/boletos-gestao` - Listar boletos com filtros
- `GET /api/boletos-gestao/:id` - Obter boleto específico
- `POST /api/boletos-gestao/importar` - Importar de fechamento
- `PUT /api/boletos-gestao/:id` - Atualizar boleto
- `DELETE /api/boletos-gestao/:id` - Excluir boleto
- `POST /api/boletos-gestao/:id/gerar-caixa` - Gerar na Caixa

## Como Usar

### Para Administradores

1. **Acessar Gestão de Boletos**
   - Menu lateral > "Gestão de Boletos"

2. **Importar Boletos de Fechamento**
   - Selecionar fechamento no dropdown
   - Clicar em "Importar Boletos"
   - Sistema cria boletos para todas as parcelas

3. **Editar Boletos**
   - Clicar no campo desejado (valor, data, status)
   - Fazer alteração
   - Sistema salva automaticamente

4. **Gerar Boleto na Caixa**
   - Clicar em "Gerar Caixa" no boleto desejado
   - Sistema gera e atualiza com dados da Caixa

### Geração Automática

O job roda automaticamente e:
- Verifica boletos pendentes de geração
- Gera apenas quando faltam 20 dias para vencimento
- Atualiza status e dados do boleto
- Registra logs de sucesso/erro

### Status dos Boletos

- **Pendente**: Aguardando pagamento
- **Pago**: Boleto quitado
- **Vencido**: Passou do vencimento
- **Cancelado**: Boleto cancelado

## Configuração do Job

Para executar o job manualmente:
```bash
node backend/jobs/gerar-boletos-automatico.js
```

Para agendar execução automática, adicionar ao cron ou scheduler:
```javascript
// No servidor principal
const geradorBoletos = require('./jobs/gerar-boletos-automatico');
geradorBoletos.iniciarScheduler(60); // Executar a cada 60 minutos
```

## Migrações Necessárias

1. `migration_criar_tabela_gestao_boletos.sql` - Cria tabela principal
2. `migration_adicionar_campos_boletos_gestao.sql` - Adiciona campos extras

## Variáveis de Ambiente

```env
CAIXA_ID_BENEFICIARIO=seu_id_beneficiario
CAIXA_API_KEY=sua_api_key
CAIXA_API_URL=https://api.caixa.gov.br/cobranca/v2
```

## Segurança

- Apenas admins podem acessar gestão de boletos
- Validação de permissões em todos endpoints
- Logs de auditoria para todas operações
- Tratamento seguro de dados sensíveis

## Melhorias Futuras

1. Dashboard com métricas de boletos
2. Notificações automáticas de vencimento
3. Integração com webhook da Caixa para pagamentos
4. Relatórios de inadimplência
5. Envio automático por email/WhatsApp

