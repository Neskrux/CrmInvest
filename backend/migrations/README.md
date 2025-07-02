# 🔄 Sistema de Migrações

Sistema para gerenciar mudanças na estrutura do banco de dados sem perder dados.

## 📋 Como Usar

### **Para Aplicar TODAS as Migrações:**
1. Vá ao **SQL Editor** do Supabase
2. Copie e cole o arquivo `run_migrations.sql`
3. Execute o script completo
4. Todas as migrações serão aplicadas automaticamente

### **Para Aplicar UMA Migração Específica:**
1. Vá ao **SQL Editor** do Supabase  
2. Execute primeiro `000_create_migrations_table.sql` (se ainda não executou)
3. Execute a migração específica (ex: `001_add_clinicas_location_fields.sql`)

### **Para Verificar Migrações Executadas:**
```sql
SELECT * FROM schema_migrations ORDER BY version;
```

## 📁 Arquivos Disponíveis

- `000_create_migrations_table.sql` - Cria tabela de controle (SEMPRE executar primeiro)
- `001_add_clinicas_location_fields.sql` - Adiciona campos bairro/cidade nas clínicas
- `run_migrations.sql` - **SCRIPT COMPLETO** para executar todas as migrações
- `migration-clinicas.sql` - Migração simplificada (compatibilidade)

## ✅ Migrações Disponíveis

| Versão | Nome | Descrição |
|--------|------|-----------|
| 000 | create_migrations_table | Cria tabela de controle de migrações |
| 001 | add_clinicas_location_fields | Adiciona campos bairro e cidade nas clínicas |

## 🚀 Vantagens

- ✅ **Sem perda de dados** - Altera estrutura preservando dados existentes
- ✅ **Controle de versão** - Sabe quais migrações já foram executadas  
- ✅ **Idempotente** - Pode executar várias vezes sem erro
- ✅ **Organizado** - Uma migração por mudança
- ✅ **Documentado** - Cada mudança tem descrição

## 🔮 Próximas Migrações

Quando precisar de novas mudanças no banco:
1. Crie arquivo `002_nome_da_mudanca.sql`
2. Adicione a migração em `run_migrations.sql`
3. Execute no Supabase
4. Sistema fica sempre atualizado sem recriar tabelas!

# 📁 Migrações do Banco de Dados

Execute as migrações no **Supabase SQL Editor** para manter o banco atualizado.

## 🆕 **NOVA MIGRAÇÃO - 008: Emails Automáticos**

**⚠️ EXECUTE PRIMEIRO!** Para habilitar o login flexível dos consultores:

```sql
-- Execute o arquivo completo: 008_add_email_consultores.sql
```

**O que faz:**
- ✅ Adiciona campo `email` na tabela consultores
- ✅ Cria função para normalizar nomes (remove acentos/espaços)
- ✅ Gera emails automáticos: `andre@investmoneysa.com.br`
- ✅ Atualiza consultores existentes
- ✅ Configura trigger para novos consultores

**Resultado:**
- 🎉 Login flexível: `André`, `andre`, `ANDRÉ` - todos funcionam!
- 📧 Emails padronizados automaticamente

---

## 📋 **Migrações Disponíveis**

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `000_create_migrations_table.sql` | Sistema de controle | ✅ Base |
| `001_add_clinicas_location_fields.sql` | Campos localização | ✅ Opcional |
| `002_add_estado_field_clinicas.sql` | Campo estado | ✅ Opcional |
| `003_create_fechamentos_table.sql` | Tabela fechamentos | ✅ Importante |
| `004_add_nicho_field_clinicas.sql` | Campo nicho | ✅ Opcional |
| `005_create_usuarios_table.sql` | Usuários admin | ✅ Importante |
| `006_add_contrato_field_fechamentos.sql` | Contratos PDF | ✅ Importante |
| `007_add_senha_consultores.sql` | Senhas consultores | ✅ Importante |
| **`008_add_email_consultores.sql`** | **Emails automáticos** | 🆕 **NOVO!** |

## 🚀 **Execução Rápida**

Para executar todas as migrações de uma vez:

```sql
-- Execute o arquivo: run_migrations.sql
-- (Será atualizado em breve com a migração 008)
```

## ✅ **Verificar Status**

```sql
SELECT * FROM schema_migrations ORDER BY version;
```

## 🎯 **Próximos Passos**

Após executar a migração 008:

1. ✅ Reinicie o servidor backend
2. ✅ Teste o login com diferentes variações de nome
3. ✅ Verifique os emails gerados na seção Consultores
4. ✅ Aproveite o login mais flexível! 🎉 