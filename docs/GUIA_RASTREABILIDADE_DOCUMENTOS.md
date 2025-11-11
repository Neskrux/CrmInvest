# 🔍 GUIA COMPLETO: Como Verificar Rastreabilidade de Documentos Assinados

## 📄 ONDE ENCONTRAR O HASH NO PDF

### 1. **No Rodapé do PDF Assinado**
Quando você assina um documento, o sistema **automaticamente adiciona** o hash no rodapé de **TODAS as páginas**:

```
─────────────────────────────────────
        HASH/ID: A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0
```

**Localização:** Parte inferior centralizada de cada página

### 2. **No Sistema (Após Assinar)**
Quando você assina um documento, o sistema mostra:
- ✅ Hash SHA1 completo
- ✅ Chave de validação (primeiros 10 caracteres)
- ✅ URL de validação direta

---

## ✅ COMO VERIFICAR A RASTREABILIDADE

### **OPÇÃO 1: Página Pública de Validação** (Mais Fácil)

1. **Acesse a página de validação:**
   ```
   http://seudominio.com/validar-documento-assinado
   ```

2. **Escolha o método:**

   **Método A - Por Hash:**
   - Abra o PDF assinado
   - Copie o hash que aparece no rodapé (ex: `A1B2C3D4E5F6...`)
   - Cole no campo "Hash SHA1 do Documento"
   - Clique em "Validar Integridade"

   **Método B - Por Arquivo:**
   - Clique em "Validar por Arquivo PDF"
   - Selecione o PDF que você quer verificar
   - O sistema calcula o hash automaticamente
   - Clique em "Validar Integridade"

3. **Veja o resultado:**
   - ✅ **Documento Íntegro:** Aparece todas as informações (nome, assinante, data, etc.)
   - ❌ **Documento Alterado:** Mostra que o hash não corresponde

---

### **OPÇÃO 2: URL Direta com Hash**

Cada documento assinado tem uma URL única:

```
http://seudominio.com/validar-documento-assinado?hash=A1B2C3D4E5F6...
```

**Como usar:**
1. Copie o hash do rodapé do PDF
2. Cole após `?hash=` na URL
3. A página valida automaticamente

---

### **OPÇÃO 3: Consultar no Banco de Dados (Supabase)**

#### **Consulta Rápida - Ver Todos os Documentos:**

```sql
SELECT 
    id,
    nome AS "Documento",
    assinante AS "Assinado Por",
    hash_sha1 AS "Hash (Rastreabilidade)",
    chave_validacao AS "Chave",
    data_assinatura AS "Data",
    ip_assinatura AS "IP",
    integridade_status AS "Status"
FROM documentos_assinados
ORDER BY data_assinatura DESC;
```

#### **Verificar um Documento Específico:**

```sql
-- Substitua 'HASH_AQUI' pelo hash do documento
SELECT 
    id,
    nome,
    assinante,
    documento AS cpf_cnpj,
    hash_sha1 AS "Hash de Rastreabilidade",
    chave_validacao AS "Chave de Validação",
    data_assinatura,
    ip_assinatura AS "IP do Assinante",
    dispositivo_info AS "Dispositivo",
    auditoria_log AS "Histórico de Validações",
    integridade_status AS "Status",
    integridade_verificada AS "Última Verificação"
FROM documentos_assinados
WHERE hash_sha1 = 'HASH_AQUI';
```

#### **Ver Histórico de Validações:**

```sql
-- Ver todas as validações realizadas em um documento
SELECT 
    nome,
    hash_sha1,
    jsonb_array_elements(auditoria_log) AS evento
FROM documentos_assinados
WHERE hash_sha1 = 'HASH_AQUI'
ORDER BY evento->>'data' DESC;
```

---

## 🔒 COMO FUNCIONA A RASTREABILIDADE

### **1. Quando o Documento é Assinado:**
- ✅ Hash SHA1 é gerado do conteúdo do PDF
- ✅ Hash é inserido no rodapé de todas as páginas
- ✅ Hash é salvo no banco de dados com:
  - IP do assinante
  - Informações do dispositivo
  - Data/hora da assinatura
  - Log de auditoria inicial

### **2. Quando o Documento é Validado:**
- ✅ Sistema calcula o hash do PDF enviado
- ✅ Compara com o hash salvo no banco
- ✅ Se corresponder = Documento Íntegro ✅
- ✅ Se não corresponder = Documento Alterado ❌
- ✅ Registra a validação no log de auditoria

### **3. Se o Documento For Alterado:**
- ❌ Qualquer alteração no PDF muda o hash
- ❌ Hash não corresponderá mais ao original
- ❌ Sistema detecta e alerta sobre a alteração

---

## 📊 INFORMAÇÕES DE RASTREABILIDADE DISPONÍVEIS

Para cada documento assinado, você tem acesso a:

| Campo | Descrição |
|-------|-----------|
| **hash_sha1** | Hash único do documento (aparece no PDF) |
| **chave_validacao** | Primeiros 10 caracteres do hash |
| **ip_assinatura** | IP de quem assinou |
| **dispositivo_info** | Navegador, sistema operacional, etc. |
| **data_assinatura** | Data e hora exata da assinatura |
| **auditoria_log** | Histórico completo de todas as validações |
| **integridade_status** | Status: `nao_verificado`, `integro`, `alterado` |
| **integridade_verificada** | Data da última verificação |

---

## 🎯 EXEMPLO PRÁTICO

### **Cenário: João assina um contrato**

1. **João assina:**
   - Hash gerado: `A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0`
   - Aparece no rodapé: `HASH/ID: A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0`
   - Salvo no banco com IP e dispositivo

2. **Maria quer verificar:**
   - Abre o PDF
   - Copia o hash do rodapé
   - Acessa `/validar-documento-assinado`
   - Cola o hash e valida
   - ✅ Resultado: "Documento íntegro - Assinado por João em 15/01/2024"

3. **Se alguém alterar o PDF:**
   - Hash muda para: `X9Y8Z7W6V5U4T3S2R1Q0P9O8N7M6L5K4J3I2H1G0`
   - Maria valida novamente
   - ❌ Resultado: "Documento não encontrado ou foi alterado"

---

## 📝 QUER VER TODAS AS CONSULTAS?

Execute o arquivo `consultas_rastreabilidade_documentos.sql` no Supabase SQL Editor para ver:
- Todos os documentos com seus hashes
- Histórico de validações
- Estatísticas do sistema
- Dispositivos usados
- IPs que assinaram
- E muito mais!

---

## ✅ RESUMO RÁPIDO

1. **Hash está no PDF?** ✅ Sim, no rodapé de todas as páginas
2. **Como verificar?** ✅ Acesse `/validar-documento-assinado` e cole o hash ou envie o PDF
3. **O que posso rastrear?** ✅ IP, dispositivo, data, histórico de validações
4. **Alteração é detectada?** ✅ Sim, qualquer mudança no PDF invalida o hash

