# Instruções para Executar Migração - Solicitações de Cobrança

## ⚠️ IMPORTANTE
As tabelas `solicitacoes_cobranca`, `solicitacao_cobranca_itens` e `solicitacao_cobranca_pacientes` precisam ser criadas no banco de dados Supabase antes de usar a funcionalidade.

## 📋 Como Executar a Migração

### Opção 1: Via Painel do Supabase (Recomendado)

1. Acesse o painel do Supabase: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Copie e cole TODO o conteúdo do arquivo `docs/migration_criar_tabela_solicitacoes_cobranca.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
7. Verifique se apareceu a mensagem de sucesso

### Opção 2: Via CLI do Supabase (Se configurado)

```bash
cd backend
supabase db push
```

## ✅ Verificação

Após executar a migração, verifique se as tabelas foram criadas:

1. No painel do Supabase, vá em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - `solicitacoes_cobranca`
   - `solicitacao_cobranca_itens`
   - `solicitacao_cobranca_pacientes`

## 🔧 Tabelas Criadas

### solicitacoes_cobranca
Tabela principal que armazena as solicitações de serviços de cobrança.

### solicitacao_cobranca_itens
Armazena os serviços solicitados em cada solicitação.

### solicitacao_cobranca_pacientes
Vincula os pacientes a cada solicitação.

## 📝 Notas

- A migração usa `CREATE TABLE IF NOT EXISTS`, então é seguro executar múltiplas vezes
- Os índices são criados automaticamente para melhor performance
- O trigger `update_solicitacoes_cobranca_timestamp` atualiza automaticamente o campo `updated_at`
