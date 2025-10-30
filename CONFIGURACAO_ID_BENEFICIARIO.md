# 🔑 Configuração do ID do Beneficiário Caixa

## 📋 O que é o ID do Beneficiário?

O **ID do Beneficiário** é o código que identifica sua empresa na Caixa para geração de boletos.

## 📄 Como encontrar no boleto

No boleto da Caixa, você verá:
- **"Ag./Cod. Beneficiário"**: `0374/1242669`

Onde:
- `0374` = Código da Agência
- `1242669` = **Código do Beneficiário** (este é o que você precisa!)

## ⚙️ Configuração

No arquivo `.env` do backend, configure:

```env
# Opção 1: Apenas o código numérico (recomendado)
CAIXA_ID_BENEFICIARIO=1242669

# Opção 2: Formato completo (agência/código) - também funciona
CAIXA_ID_BENEFICIARIO=0374/1242669
```

O sistema automaticamente extrai apenas o código numérico (`1242669`) se você fornecer o formato completo.

## ✅ Exemplo do seu boleto

Baseado no boleto que você mostrou:
- **Ag./Cod. Beneficiário**: `0374/1242669`
- **Configure no .env**: `CAIXA_ID_BENEFICIARIO=1242669` ou `CAIXA_ID_BENEFICIARIO=0374/1242669`

Ambos funcionarão! O sistema trata automaticamente.

