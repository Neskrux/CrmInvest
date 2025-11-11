# Como Obter Certificado Digital ICP-Brasil

## 📋 O que é ICP-Brasil?

A **ICP-Brasil** (Infraestrutura de Chaves Públicas Brasileira) é o sistema oficial que garante a autenticidade, integridade e validade jurídica de documentos eletrônicos no Brasil.

**Órgão responsável:** ITI (Instituto Nacional de Tecnologia da Informação)

---

## 🎯 Tipos de Certificado Digital

### 1. Por Tipo de Pessoa

#### e-CPF (Pessoa Física)
- Para pessoas físicas
- Validade jurídica equivalente a assinatura física autenticada
- Preço: R$ 150-400/ano

#### e-CNPJ (Pessoa Jurídica)
- Para empresas
- Representa a empresa legalmente
- Preço: R$ 200-500/ano

---

### 2. Por Forma de Armazenamento

#### Certificado A1 (Software)
- **Armazenamento:** No computador ou dispositivo móvel
- **Validade:** 1 ano
- **Vantagens:** Mais barato, fácil de usar, pode ser usado em qualquer computador
- **Desvantagens:** Se o computador for infectado, pode ser comprometido
- **Preço:** R$ 150-300/ano

#### Certificado A3 (Hardware)
- **Armazenamento:** Token USB, cartão inteligente ou nuvem
- **Validade:** 1 a 5 anos
- **Vantagens:** Mais seguro, portátil, não pode ser copiado facilmente
- **Desvantagens:** Mais caro, precisa do dispositivo físico
- **Preço:** R$ 200-500/ano

---

## 🏢 Autoridades Certificadoras Credenciadas

### Principais ACs no Brasil:

1. **Certisign**
   - Site: https://www.certisign.com.br
   - Preços competitivos
   - Atendimento nacional

2. **Serasa Experian**
   - Site: https://www.serasaexperian.com.br/certificado-digital
   - Uma das maiores ACs
   - Boa cobertura nacional

3. **AC Certificadora**
   - Site: https://www.accertificadora.com.br
   - Foco em empresas

4. **SERPRO**
   - Site: https://www.serpro.gov.br
   - Empresa pública
   - Preços acessíveis

5. **CAIXA**
   - Site: https://www.caixa.gov.br/certificado-digital
   - Certificado da Caixa Econômica Federal

6. **SOLUTI**
   - Site: https://www.soluti.com.br
   - Boa cobertura nacional

---

## 📝 Processo de Obtenção (Passo a Passo)

### Passo 1: Escolher a Autoridade Certificadora
1. Acesse o site do ITI: https://www.gov.br/iti/pt-br/assuntos/certificado-digital
2. Consulte a lista de ACs credenciadas
3. Escolha uma AC que atenda sua região
4. Compare preços e serviços

### Passo 2: Solicitar o Certificado
1. Acesse o site da AC escolhida
2. Preencha o formulário de solicitação
3. Escolha o tipo de certificado (e-CPF ou e-CNPJ)
4. Escolha a forma de armazenamento (A1 ou A3)
5. Escolha a forma de validação (presencial ou videoconferência)

### Passo 3: Validação de Identidade

#### Opção A: Validação Presencial
1. Agende atendimento em uma Autoridade de Registro (AR)
2. Compareça no local agendado
3. Apresente documentos:
   - **Pessoa Física:** RG, CPF, comprovante de residência
   - **Pessoa Jurídica:** CNPJ, contrato social, documentos dos sócios
4. Realize coleta biométrica (foto e impressões digitais)

#### Opção B: Validação por Videoconferência
1. Agende videoconferência com a AR
2. Durante a chamada:
   - Apresente documentos via câmera
   - Responda perguntas de segurança
   - Realize reconhecimento facial
3. Mais rápido e conveniente

### Passo 4: Receber e Instalar o Certificado

#### Para Certificado A1 (Software):
1. Receba por email o arquivo .PFX ou instruções de download
2. Instale no computador/dispositivo
3. Configure senha de proteção
4. Teste o certificado

#### Para Certificado A3 (Hardware):
1. Receba o token/cartão por correio
2. Instale drivers do dispositivo
3. Configure o certificado
4. Teste o certificado

---

## 💰 Preços Estimados (2024)

### Certificado A1 (Software)
- **e-CPF:** R$ 150-300/ano
- **e-CNPJ:** R$ 200-400/ano

### Certificado A3 (Hardware)
- **e-CPF:** R$ 200-400/ano
- **e-CNPJ:** R$ 300-500/ano
- **Token USB:** + R$ 50-150 (uma vez)

### Validação
- **Presencial:** Geralmente incluída no preço
- **Videoconferência:** Pode ter custo adicional (R$ 20-50)

---

## 🔧 Integração com Nosso Sistema

### Opção 1: Integração com Certificado A1 (Recomendado para Início)

**Vantagens:**
- Mais fácil de integrar
- Usuário já tem certificado instalado
- Não precisa de hardware adicional

**Como funciona:**
1. Usuário acessa nosso sistema
2. Sistema detecta certificado instalado no navegador
3. Usuário seleciona o certificado
4. Usuário digita senha do certificado
5. Sistema usa certificado para assinar PDF

**Requisitos técnicos:**
- Biblioteca JavaScript para ler certificados (ex: `pkijs`)
- Servidor para validar certificado ICP-Brasil
- Integração com serviço TSA (timestamp confiável)

---

### Opção 2: Integração com Certificado A3

**Vantagens:**
- Mais seguro
- Não pode ser copiado

**Como funciona:**
1. Usuário conecta token USB
2. Sistema detecta certificado no token
3. Usuário digita PIN do token
4. Sistema usa certificado para assinar PDF

**Requisitos técnicos:**
- Drivers do token instalados
- Biblioteca para comunicação com token
- Mesmas validações do A1

---

### Opção 3: Integração com Certificado na Nuvem (Cloud)

**Vantagens:**
- Acesso de qualquer lugar
- Não precisa instalar nada
- Mais seguro que A1 local

**Como funciona:**
1. Usuário faz login na plataforma da AC
2. Sistema solicita assinatura via API
3. Usuário autoriza na plataforma da AC
4. Sistema recebe assinatura certificada

**Requisitos técnicos:**
- Integração com API da AC escolhida
- OAuth/autenticação com AC
- Validação de certificado na nuvem

---

## 🚀 Implementação Técnica no Nosso Sistema

### Arquitetura Proposta:

```
Frontend (React)
    ↓
Usuário seleciona certificado
    ↓
Biblioteca JavaScript lê certificado
    ↓
Backend (Node.js)
    ↓
Valida certificado ICP-Brasil
    ↓
Assina PDF com certificado
    ↓
Carimba com TSA (timestamp confiável)
    ↓
Salva no banco com metadados completos
```

### Bibliotecas Necessárias:

1. **Frontend:**
   - `pkijs` - Para ler certificados no navegador
   - `pdf-lib` - Para manipular PDF (já temos)

2. **Backend:**
   - `node-forge` - Para operações criptográficas
   - `pdf-lib` - Para assinar PDF (já temos)
   - Integração com serviço TSA

3. **Validação:**
   - API do ITI para validar certificados ICP-Brasil
   - Serviço TSA para timestamp confiável

---

## 📋 Próximos Passos para Implementação

### Fase 1: Preparação (1-2 semanas)
1. ✅ Escolher AC para parceria
2. ✅ Contratar certificados de teste
3. ✅ Estudar APIs das ACs
4. ✅ Definir arquitetura técnica

### Fase 2: Desenvolvimento (2-4 semanas)
1. ✅ Implementar leitura de certificado no frontend
2. ✅ Implementar validação no backend
3. ✅ Integrar assinatura criptográfica
4. ✅ Integrar serviço TSA

### Fase 3: Testes (1-2 semanas)
1. ✅ Testar com certificados reais
2. ✅ Validar assinaturas
3. ✅ Testar validação jurídica
4. ✅ Ajustes finais

### Fase 4: Produção
1. ✅ Documentação para usuários
2. ✅ Treinamento
3. ✅ Lançamento

---

## 💡 Recomendações

### Para Usuários Finais:
1. **Comece com Certificado A1** - Mais barato e fácil
2. **Escolha validação por videoconferência** - Mais rápido
3. **Compare preços** - Variam bastante entre ACs
4. **Renove antes de vencer** - Evite problemas

### Para Nossa Empresa:
1. **Parceria com AC** - Pode negociar preços melhores
2. **Integração com múltiplas ACs** - Oferecer opções
3. **Certificado Cloud** - Melhor experiência do usuário
4. **Suporte técnico** - Ajudar usuários com problemas

---

## 📞 Contatos Úteis

- **ITI (Instituto Nacional de Tecnologia da Informação)**
  - Site: https://www.gov.br/iti
  - Telefone: 0800 978 0000

- **Lista de ACs Credenciadas:**
  - https://www.gov.br/iti/pt-br/assuntos/certificado-digital/autoridades-certificadoras

---

## 🔗 Links Importantes

- Portal do Certificado Digital: https://www.gov.br/iti/pt-br/assuntos/certificado-digital
- Validador de Documentos Digitais: https://www.gov.br/pt-br/servicos/validador-de-documentos-digitais
- Validador de Certificados: https://www.gov.br/pt-br/servicos/validar-certificado-digital-icp-brasil

---

## ⚠️ Importante

- Certificados ICP-Brasil têm **validade jurídica equivalente** a assinatura física autenticada
- Não podem ser contestados facilmente em processos judiciais
- São reconhecidos por todos os órgãos públicos brasileiros
- Recomendados para contratos de alto valor e documentos importantes

