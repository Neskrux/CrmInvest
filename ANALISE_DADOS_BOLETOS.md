# 📋 Análise: Dados Necessários para Gerar Boletos Caixa

## ✅ Campos Obrigatórios (Conforme Swagger)

### Campos que JÁ estamos enviando:
1. ✅ **numero_documento** - Gerado automaticamente (`FEC-{id}-P{parcela}`)
2. ✅ **data_vencimento** - Vem do campo `vencimento` do fechamento
3. ✅ **valor** - Vem de `valor_parcela` ou `valor_fechado`
4. ✅ **tipo_especie** - Fixo: `4` (Duplicata de serviço)
5. ✅ **flag_aceite** - Fixo: `'N'` (Não aceite)
6. ✅ **data_emissao** - Data atual (gerada automaticamente)
7. ✅ **valor_abatimento** - Fixo: `0`
8. ✅ **pagador.pessoa_fisica.cpf** - Vem de `paciente.cpf`
9. ✅ **pagador.pessoa_fisica.nome** - Vem de `paciente.nome`

### Campos que PODEM estar faltando:

#### ⚠️ Endereço do Pagador (NÃO é obrigatório no Swagger, mas recomendado)
Atualmente estamos enviando apenas:
- ✅ `cidade` - Vem de `paciente.cidade`
- ✅ `uf` - Vem de `paciente.estado`
- ❌ `cep` - **VAZIO** (não temos no banco)
- ❌ `logradouro` - **VAZIO** (não temos no banco)
- ❌ `bairro` - **VAZIO** (não temos no banco)
- ❌ `numero` - **VAZIO** (não temos no banco)

**Status:** O endereço completo NÃO é obrigatório conforme Swagger, mas pode ser recomendado pela Caixa para boletos bancários.

## 🔍 Verificação dos Dados Disponíveis

### Dados do Paciente que temos:
- ✅ `cpf` - OBRIGATÓRIO ✅
- ✅ `nome` - OBRIGATÓRIO ✅
- ✅ `cidade` - Temos (parcial)
- ✅ `estado` - Temos (parcial)
- ❌ `cep` - **NÃO TEMOS**
- ❌ `endereco` / `logradouro` - **NÃO TEMOS**
- ❌ `numero` - **NÃO TEMOS**
- ❌ `bairro` - **NÃO TEMOS**
- ❌ `complemento` - **NÃO TEMOS**

### Dados do Fechamento que temos:
- ✅ `valor_parcela` ou `valor_fechado` - OBRIGATÓRIO ✅
- ✅ `vencimento` - OBRIGATÓRIO ✅ (agora como DATE)
- ✅ `numero_parcelas` - Para calcular parcelas ✅

## 📊 Resumo

### ✅ Dados MÍNIMOS (Obrigatórios pela API):
**TEMOS TODOS!** ✅

### ⚠️ Dados RECOMENDADOS (Não obrigatórios, mas podem ser necessários):
**FALTANDO:** Endereço completo (CEP, logradouro, número, bairro)

## 💡 Recomendações

### Opção 1: Continuar sem endereço completo
- ✅ **Prós:** Dados mínimos estão completos, boleto deve ser gerado
- ⚠️ **Contras:** Alguns bancos exigem endereço completo para boletos válidos

### Opção 2: Adicionar campos de endereço no cadastro do paciente
- **Campos a adicionar:** `cep`, `endereco`, `numero`, `bairro`, `complemento`
- **Quando:** No cadastro do paciente (formulário completo)
- **Impacto:** Dados mais completos para boletos

### Opção 3: Usar endereço da clínica como fallback
- Se paciente não tiver endereço completo, usar endereço da clínica
- ⚠️ **Não recomendado** - pode causar confusão

## 🎯 Conclusão

**SIM, os dados que fornecemos são suficientes para gerar o boleto!**

Os campos obrigatórios estão todos presentes. O endereço completo seria recomendado, mas não é obrigatório conforme a documentação da Caixa.

**Recomendação:** Testar primeiro com os dados atuais. Se a Caixa exigir endereço completo, adicionar os campos no cadastro do paciente.

