# Guia de Configuração - Scheduled Jobs do Fly.io para Notificações WhatsApp

Este guia explica como funciona o sistema de envio automático de notificações WhatsApp usando Fly.io Scheduled Jobs nativos.

## Visão Geral

O sistema utiliza **Fly.io Scheduled Jobs** para executar notificações automaticamente, sem dependência de serviços externos. Os jobs são executados diretamente na máquina do Fly.io, garantindo:

- ✅ Servidor sempre ativo (callbacks do Twilio sempre recebidos)
- ✅ Sem dependência de serviços externos
- ✅ Controle total sobre execução e logs
- ✅ Escalabilidade e confiabilidade

## Arquitetura

```
┌─────────────────┐
│  Fly.io App     │
│  (HTTP Server)  │
└────────┬────────┘
         │
         ├─── HTTP API (rotas atuais)
         │
         └─── Scheduled Jobs (3 jobs nativos)
              │
              ├─── Job 1: 08:00 → 3 dias
              ├─── Job 2: 08:00 → 1 dia  
              └─── Job 3: 08:00 → hoje
                    │
                    ▼
         ┌─────────────────┐
         │  cron-handler.js│
         │  (Worker)       │
         └────────┬────────┘
                  │
                  ├─── Query Supabase
                  ├─── Processar em lote
                  ├─── Enviar via Twilio
                  └─── Atualizar flags
```

## Pré-requisitos

1. ✅ Sistema de WhatsApp já configurado e funcionando
2. ✅ Migração do banco de dados executada (colunas `notificado_3_dias`, `notificado_1_dia`, `notificado_hoje`)
3. ✅ Variáveis de ambiente configuradas (TWILIO_*, WHATSAPP_*)

## Configuração no fly.toml

O arquivo `fly.toml` já está configurado com:

```toml
[http_service]
  auto_stop_machines = false  # Servidor sempre ativo
  min_machines_running = 1    # Garantir máquina sempre rodando

# Scheduled Jobs
[[scheduled_jobs]]
  name = "boleto-3-dias"
  schedule = "0 8 * * *"  # 08:00 diariamente (America/Sao_Paulo)
  command = ["node", "workers/cron-handler.js", "3"]

[[scheduled_jobs]]
  name = "boleto-1-dia"
  schedule = "0 8 * * *"
  command = ["node", "workers/cron-handler.js", "1"]

[[scheduled_jobs]]
  name = "boleto-hoje"
  schedule = "0 8 * * *"
  command = ["node", "workers/cron-handler.js", "0"]
```

## Como Funciona

1. **Fly.io executa o scheduled job** no horário configurado (08:00 diariamente)
2. **O worker `cron-handler.js` é executado** com o argumento `dias_vencimento` (3, 1 ou 0)
3. **O worker chama `enviarNotificacoesCron`** internamente (sem HTTP)
4. **O controller processa**:
   - Busca boletos vencendo na data especificada
   - Agrupa por paciente (evita spam)
   - Envia notificações via Twilio
   - Atualiza flags de controle de duplicidade
5. **Logs são registrados** com prefixo `[SCHEDULED JOB]`

## Testando Localmente

### Teste Direto do Worker

```bash
# Testar notificação de 3 dias
node workers/cron-handler.js 3

# Testar notificação de 1 dia
node workers/cron-handler.js 1

# Testar notificação de hoje
node workers/cron-handler.js 0
```

### Teste via Script

```bash
# Testar todos os tipos
node scripts/test-scheduled-job.js

# Testar tipo específico
node scripts/test-scheduled-job.js 3
```

## Monitoramento

### Ver Logs no Fly.io

```bash
# Ver todos os logs
flyctl logs --app crminvest-backend

# Filtrar apenas scheduled jobs
flyctl logs --app crminvest-backend | Select-String "SCHEDULED JOB"

# Ver logs em tempo real
flyctl logs --app crminvest-backend --follow
```

### Verificar Execução dos Jobs

1. Acesse o dashboard do Fly.io: https://fly.io/dashboard
2. Selecione seu app: `crminvest-backend`
3. Vá em **Scheduled Jobs**
4. Veja o histórico de execuções e status

### Verificar Flags no Banco

```sql
-- Ver boletos notificados hoje (3 dias)
SELECT id, paciente_id, data_vencimento, notificado_3_dias 
FROM boletos_caixa 
WHERE notificado_3_dias IS NOT NULL 
  AND DATE(notificado_3_dias) = CURRENT_DATE;

-- Ver boletos notificados hoje (1 dia)
SELECT id, paciente_id, data_vencimento, notificado_1_dia 
FROM boletos_caixa 
WHERE notificado_1_dia IS NOT NULL 
  AND DATE(notificado_1_dia) = CURRENT_DATE;

-- Ver boletos notificados hoje (hoje)
SELECT id, paciente_id, data_vencimento, notificado_hoje 
FROM boletos_caixa 
WHERE notificado_hoje IS NOT NULL 
  AND DATE(notificado_hoje) = CURRENT_DATE;
```

## Troubleshooting

### Job não está executando

1. **Verificar configuração no fly.toml**:
   ```bash
   flyctl config show --app crminvest-backend
   ```

2. **Verificar se máquina está rodando**:
   ```bash
   flyctl status --app crminvest-backend
   ```

3. **Verificar logs de erro**:
   ```bash
   flyctl logs --app crminvest-backend | Select-String "error\|ERROR\|Error"
   ```

### Job executa mas não envia mensagens

1. **Verificar variáveis de ambiente**:
   ```bash
   flyctl secrets list --app crminvest-backend
   ```

2. **Verificar se há boletos para notificar**:
   ```sql
   SELECT COUNT(*) 
   FROM boletos_caixa 
   WHERE data_vencimento = CURRENT_DATE + INTERVAL '3 days'
     AND situacao = 'EM ABERTO';
   ```

3. **Verificar logs detalhados**:
   ```bash
   flyctl logs --app crminvest-backend | Select-String "CRON\|SCHEDULED"
   ```

### Erro ao executar worker localmente

1. **Verificar se .env está configurado**:
   ```bash
   # Verificar variáveis necessárias
   cat .env | grep TWILIO
   ```

2. **Verificar se dependências estão instaladas**:
   ```bash
   npm install
   ```

3. **Verificar conexão com Supabase**:
   ```bash
   # Testar conexão
   node -e "require('./config/database').supabaseAdmin.from('pacientes').select('id').limit(1).then(r => console.log(r))"
   ```

## Estrutura de Logs

Os logs dos scheduled jobs seguem este formato:

```
🚀 [SCHEDULED JOB] Iniciando notificações para 3 dia(s)
📅 [SCHEDULED JOB] Timestamp: 2025-11-05T08:00:00.000Z
📅 [CRON] Processando notificações para 3 dia(s) - Data vencimento: 2025-11-08
✅ [CRON] Encontrados 5 boleto(s) para notificar
✅ [SCHEDULED JOB] Concluído com sucesso (status 200)
📊 [SCHEDULED JOB] Resultado: { ... }
```

## Variáveis de Ambiente Necessárias

```env
# Twilio
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_SID=MG...  # Produção
TWILIO_WHATSAPP_NUMBER=whatsapp:+...  # Sandbox

# WhatsApp
WHATSAPP_ADMIN_EMAIL=admin@exemplo.com
WHATSAPP_RETRY_MAX_ATTEMPTS=2
WHATSAPP_RETRY_DELAY_MS=1000

# Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
```

**NOTA**: `CRON_SECRET` não é mais necessário (removido na migração).

## Próximos Passos

1. ✅ Deploy da configuração atualizada
2. ✅ Verificar execução dos scheduled jobs no dashboard
3. ✅ Monitorar logs por alguns dias
4. ✅ Verificar se flags estão sendo atualizadas corretamente
5. ✅ Ajustar horários se necessário

## Notas Importantes

- **Custo**: O servidor ficará sempre ativo (~$5-10/mês), garantindo que callbacks do Twilio sejam sempre recebidos
- **Duplicidade**: O sistema evita enviar notificações duplicadas usando flags de timestamp
- **Retry**: Erros são automaticamente tentados novamente (2 tentativas por padrão)
- **Alertas**: Admin será notificado em caso de erros críticos ou alta taxa de erros (>50%)
- **Performance**: No Sandbox, há delay de 3 segundos entre envios. Em produção, não há delay
- **Timezone**: Os jobs são executados no timezone `America/Sao_Paulo` (configurado no Fly.io)

## Suporte

Em caso de problemas:

1. Verifique logs do Fly.io: `flyctl logs --app crminvest-backend`
2. Verifique scheduled jobs no dashboard do Fly.io
3. Verifique tabela `boletos_caixa` no Supabase
4. Verifique configuração de variáveis de ambiente
5. Teste localmente primeiro: `node workers/cron-handler.js 3`

