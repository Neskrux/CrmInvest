# 📦 Configurar Supabase Storage para Contratos

## Passo a Passo

### 1. Acessar o Supabase Dashboard
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto

### 2. Criar o Bucket "contratos"
1. No menu lateral, clique em **Storage**
2. Clique em **New bucket**
3. Configure:
   - **Name**: `contratos`
   - **Public bucket**: ❌ Desmarcar (manter privado)
   - **File size limit**: 10MB
   - **Allowed MIME types**: `application/pdf`
4. Clique em **Create bucket**

### 3. Configurar Políticas de Acesso
1. Clique no bucket `contratos`
2. Vá na aba **Policies**
3. Clique em **New Policy**
4. Selecione **For full customization**
5. Configure:

#### Política de INSERT (Upload)
```sql
-- Nome: Permitir upload autenticado
-- Operação: INSERT

(auth.role() = 'authenticated'::text)
```

#### Política de SELECT (Download)
```sql
-- Nome: Permitir download autenticado
-- Operação: SELECT

(auth.role() = 'authenticated'::text)
```

#### Política de DELETE (Remover)
```sql
-- Nome: Permitir delete autenticado
-- Operação: DELETE

(auth.role() = 'authenticated'::text)
```

### 4. Verificar Variáveis de Ambiente
No Vercel, confirme que tem:
- `SUPABASE_URL`: Sua URL do projeto
- `SUPABASE_KEY`: Sua chave anon

### 5. Testar
1. Faça o deploy das alterações
2. Tente criar um fechamento com PDF
3. O arquivo será salvo no Supabase Storage

## ⚠️ Importante
- O bucket deve se chamar exatamente `contratos`
- Mantenha o bucket privado para segurança
- As políticas devem permitir operações autenticadas

## 🎉 Pronto!
Agora os PDFs serão salvos no Supabase Storage e funcionarão perfeitamente no Vercel! 