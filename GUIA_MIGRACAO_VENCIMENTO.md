# 🔄 Migração de Dados: Converter Vencimento de Número para Data

## 📋 O que precisa ser feito

Se você tem fechamentos antigos no banco de dados que foram salvos com `vencimento` como número (dia do mês: 1-31), você precisa convertê-los para data completa (YYYY-MM-DD).

---

## ✅ Solução Automática (Backend)

O backend já foi atualizado para **converter automaticamente** quando recebe um número:

- Se receber `vencimento = "15"` → Converte para data completa usando `data_fechamento` como base
- Se receber `vencimento = "2025-12-15"` → Usa como está (já é data completa)

**Isso significa que:**
- ✅ Novos fechamentos funcionarão corretamente
- ✅ Edições de fechamentos antigos serão convertidas automaticamente
- ⚠️ Mas dados antigos no banco ainda precisam ser migrados

---

## 🔧 Migração SQL (Opcional mas Recomendado)

Se você quer corrigir os dados existentes no banco de dados, execute o script SQL:

**Arquivo:** `migration_converter_vencimento_numero_para_data.sql`

### O que o script faz:

1. **Identifica** fechamentos com `vencimento` como número (1-31)
2. **Converte** para data completa usando `data_fechamento` como base
3. **Valida** se a conversão funcionou

### Como usar:

```sql
-- 1. Verificar quantos precisam ser convertidos
SELECT 
  COUNT(*) as total_para_converter,
  empresa_id
FROM fechamentos
WHERE vencimento IS NOT NULL 
  AND vencimento::text ~ '^[0-9]{1,2}$'
  AND empresa_id = 3
GROUP BY empresa_id;

-- 2. Executar conversão (script completo no arquivo)
```

---

## ⚠️ Importante

### Não é obrigatório executar a migração se:

- Você não tem fechamentos antigos com `vencimento` como número
- Os fechamentos antigos não precisam gerar boletos
- O backend está convertendo automaticamente quando você edita

### É recomendado executar a migração se:

- Você tem muitos fechamentos antigos
- Você quer garantir que todos os dados estão corretos
- Você quer evitar problemas futuros

---

## 🎯 Resumo

| Situação | O que fazer |
|----------|-------------|
| **Novos fechamentos** | ✅ Já funciona (campo date) |
| **Editar fechamento antigo** | ✅ Backend converte automaticamente |
| **Dados antigos no banco** | ⚠️ Executar migração SQL (opcional) |

---

## 📝 Próximos Passos

1. **Testar criação de novo fechamento** → Deve funcionar com data completa
2. **Verificar se há fechamentos antigos** → Executar query de verificação
3. **Se necessário, executar migração SQL** → Converter dados antigos

