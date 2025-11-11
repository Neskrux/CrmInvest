# 📋 ESPECIFICAÇÕES TÉCNICAS: Boletos Caixa para Homologação

**Documento:** ESPECIFICAÇÕES TÉCNICAS PARA EMISSÃO DE BOLETOS COBRANÇA BANCÁRIA CAIXA - SIGCB  
**Versão:** 67.119 v015 micro

Este documento compila todas as especificações técnicas necessárias para a homologação de boletos da Caixa Econômica Federal, conforme o documento de homologação fornecido.

---

## 📌 OBSERVAÇÕES IMPORTANTES

### Homologação Técnica

- **Antes do envio de boletos aos Pagadores**, o Cliente Beneficiário deve **obrigatoriamente** encaminhar à sua Agência CAIXA amostras dos boletos por ele emitidos, para que haja a devida homologação técnica.
- As amostras devem possuir no mínimo **10 e no máximo 20 boletos**, contendo:
  - Todos os Dígitos Verificadores Geral do Código de Barras possíveis (de 1 a 9)
  - Todos os Dígitos Verificadores do Campo Livre possíveis (de 0 a 9)

### Responsabilidade do Beneficiário

- O Beneficiário assume **total responsabilidade** pelas consequências advindas da emissão/distribuição de boletos sem a prévia validação pela CAIXA.
- A emissão de boleto sem o devido registro na CAIXA ocasiona a impossibilidade de pagamento do boleto por código de barras ou QR Code PIX na rede bancária.

---

## 1. TIPOS DE BOLETOS

### 1.3.1. Boleto de Cobrança
Utilizado para a cobrança e o pagamento de dívidas decorrentes de obrigações de qualquer natureza.

### 1.3.2. Boleto de Proposta
É utilizado para permitir o pagamento resultante da aceitação de uma oferta de produtos e serviços, de uma proposta de contrato civil ou de um convite para associação.

**Texto Obrigatório no Boleto de Proposta:**
```
BOLETO DE PROPOSTA

ESTE BOLETO SE REFERE A UMA PROPOSTA JÁ FEITA A VOCÊ E O SEU PAGAMENTO NÃO É OBRIGATÓRIO.

Deixar de pagá-lo não dará causa a protesto, a cobrança judicial ou extrajudicial, nem a inserção de seu nome em cadastro de restrição ao crédito.

Pagar até a data de vencimento significa aceitar a proposta.

Informações adicionais sobre a proposta e sobre o respectivo contrato poderão ser solicitadas a qualquer momento ao Beneficiário, por meio de seus canais de atendimento.
```

### 1.3.3. Boleto Híbrido
É usado para possibilitar o pagamento por código de barras (cobrança bancária) ou por QR Code (PIX).

**Float Financeiro:**
- **Cobrança Bancária:** Float financeiro ocorre em quantidade de dia(s) após a liquidação, conforme o canal e forma de pagamento negociados
- **PIX:** Float financeiro ocorre online (D-0), com repasse financeiro e liberação do recurso na conta corrente do convênio beneficiário no mesmo dia da liquidação

**Especificações do QR Code:**
- QR Code dinâmico gerado pela CAIXA ou pelo cliente conforme diretrizes do documento
- QR Code pode ser inserido no Recibo do Pagador ou na Ficha de Compensação
- Dimensão mínima: **1 x 1 cm**
- Inserção da chave 'pix copia e cola' é **opcional**

### 1.3.4. Boleto de Depósito e Aporte
Possui como característica a vinculação da informação de pagador e beneficiário final a qual o valor financeiro é devido, sendo utilizado como meio de depósito para carteiras digitais (wallet's) ou fintech's que fazem uso do serviço de cobrança bancária CAIXA como solução de recebimento.

**Requisitos:**
- Exige informação de nome/razão social e CPF/CNPJ do beneficiário final
- Os dados do beneficiário final são **idênticos** aos dados do pagador
- Indicação da espécie correspondente na ficha de compensação: **33 - BDA**

### 1.3.5. Boleto de Terceiro Habilitado
Possui como característica a vinculação da informação de pagador e beneficiário final a qual o valor financeiro é devido, sendo utilizado como meio de identificação do favorecido final referente à prestação de um serviço ou obrigação de dívida com o beneficiário.

**Requisitos:**
- Exige informação de nome/razão social e CPF/CNPJ do beneficiário final
- Os dados do beneficiário final são **diferentes** dos dados do pagador

---

## 2. ESPECIFICAÇÕES GERAIS

### 2.1. Disposição das Vias

- A **Ficha de Compensação** deve ser impressa na **parte inferior** do papel
- Recomenda-se a utilização de **microsserrilhas** entre as vias (recibo do pagador e ficha de compensação) para evitar danos às informações quando do destacamento
- No caso de carnê, a Ficha de Compensação deve ser impressa na parte inferior ou à direita do Recibo do Pagador

### 2.2. Gramatura do Papel

- **Mínima:** 50 g/m²
- **Recomendável:** 75 g/m²

### 2.3. Dimensão

| Composição | Altura (mm) | Comprimento (mm) |
|------------|-------------|------------------|
| Ficha de Compensação - Boleto | 95 a 108 | 170 (Papel A4) a 216 (Papel Carta) |
| Ficha de Compensação - Carnê | 60 a 108 | 145 a 216 |
| Recibo do Pagador | - | A critério do Cliente Beneficiário, condicionado à aprovação pela CAIXA |

### 2.4. Número de Vias ou Partes

**Duas vias obrigatórias:**
1. Ficha de Compensação
2. Recibo do Pagador

**Terceira via (opcional):**
- A critério do Cliente Beneficiário, sem prejuízo das dimensões definidas para a Ficha de Compensação
- O Recibo do Pagador poderá ser reduzido para inclusão de 3ª via ou parte
- Utilizada como controle interno ou protocolo de entrega

### 2.5. Cor da Via/Impressão

**Preferencialmente:**
- Fundo branco e impressão azul; ou
- Fundo branco e impressão preta

**Permitido:**
- Utilização de fundo diferente de branco (por exemplo: papel reciclável), desde que em tonalidade clara e sem prejuízo para a leitura dos campos, especialmente o Código de Barras

---

## 3. ESPECIFICAÇÃO DO RECIBO DO PAGADOR

### 3.1. Leiaute

A critério do Beneficiário, sem prejuízo das definições deste manual, condicionado à aprovação pela CAIXA.

### 3.2. Informações Obrigatórias

**Campos obrigatórios no Recibo do Pagador:**
1. Nome do Beneficiário
2. Endereço do Beneficiário
3. CNPJ/CPF do Beneficiário
4. Agência/Código do Beneficiário
5. Valor do título (limitado a R$ 9.999.999,99)
6. Vencimento
7. Nosso Número
8. Número do Documento (Seu Número)

**Informações Recomendadas:**
- Nosso Número
- Número do Documento (Seu Número)
- Nome do Pagador
- Recibo do Pagador (expressão para identificação da via ou parte)

**Regras:**
- As informações devem ser as mesmas constantes na Ficha de Compensação
- O CPF/CNPJ do Pagador é obrigatório na Cobrança Registrada

### 3.3. Logomarca

**Beneficiário:**
- Qualquer logomarca do beneficiário (se presente) deve ter dimensões proporcionais à logomarca CAIXA

**Marca d'água:**
- Se a logomarca do beneficiário for usada como marca d'água, sua retícula deve ser no máximo de **30%** (correspondendo a 70% de transparência)

### 3.4. Boleto de Proposta

**Regulamentação:**
- A emissão e apresentação do boleto de proposta são regidas pela Circular BACEN 3.598/2013, com redação específica fornecida pela Circular nº 3.656, de 2/4/2013
- A emissão é condicionada à manifestação prévia do pagador de sua vontade de receber aquele boleto

**Texto Obrigatório:**
Tanto no Recibo do Pagador quanto na Ficha de Compensação, dentro de uma caixa claramente definida, deve constar:

```
BOLETO DE PROPOSTA

ESTE BOLETO SE REFERE A UMA PROPOSTA JÁ FEITA A VOCÊ E O SEU PAGAMENTO NÃO É OBRIGATÓRIO.
```

### 3.5. Boleto Híbrido

**QR Code Dinâmico:**
- Gerado pela CAIXA com base em informações de inclusão, alteração ou consulta recebidas via arquivo remessa padrão CNAB, e-Cobrança, webservice ou API
- Alternativamente, pode ser gerado diretamente pelo cliente conforme diretrizes do documento

**Inserção do QR Code:**
- Pode ser inserido no Recibo do Pagador ou na Ficha de Compensação, conforme diretrizes especificadas
- Dimensão mínima: **1 x 1 cm**
- Inserção da chave 'pix copia e cola' é **opcional**, servindo como alternativa para o cliente

### 3.6. Boleto de Depósito e Aporte

- Exige informação de nome/razão social e CPF/CNPJ do beneficiário final
- Os dados do beneficiário final são **idênticos** aos dados do pagador
- Indicação da espécie correspondente na ficha de compensação: **33 - BDA**

### 3.7. Boleto de Terceiro Habilitado

- Exige informação de nome/razão social e CPF/CNPJ do beneficiário final
- Os dados do beneficiário final são **diferentes** dos dados do pagador

### 3.8. Modelos de Recibo do Pagador

#### 3.8.1. Modelo I - Recibo do pagador padrão FEBRABAN adaptado
Modelo padrão com layout FEBRABAN adaptado.

#### 3.8.2. Modelo II - Recibo do pagador sem logomarca do beneficiário
Modelo sem logomarca do beneficiário.

#### 3.8.3. Modelo III - Recibo do pagador com logomarca do beneficiário
Modelo com área dedicada para logomarca do beneficiário no lado direito do header.

#### 3.8.4. Modelo IV - Recibo do pagador c/ logomarca do beneficiário estilo marca d'água
Modelo com logomarca do beneficiário como marca d'água.

#### 3.8.5. Modelo V - Recibo do pagador com QR Code
Modelo com QR Code PIX integrado no lado direito.

**Observação:** Os modelos são meramente ilustrativos e não estão corretamente dimensionados.

### 3.9. Informações de Contato CAIXA (Obrigatório)

Se no Recibo do Pagador houver a impressão da logomarca CAIXA, é obrigatório constar (em cumprimento ao Artigo 7º do Decreto 6.523, de 31/07/08, e na Circular BACEN 3.370/07):

```
SAC CAIXA: 0800 726 0101 (informações, reclamações, sugestões e elogios)
Para pessoas com deficiência auditiva ou de fala: 0800 726 2492
Ouvidoria: 0800 725 7474
caixa.gov.br
```

**Recomendação:**
É recomendável que também no Recibo do Pagador conste a Linha Digitável (Representação Numérica), de forma a facilitar eventual consulta.

---

## 4. ESPECIFICAÇÃO DA FICHA DE COMPENSAÇÃO

### 4.1. Modelos de Ficha de Compensação

#### 4.1.1. Modelo I - Ficha de compensação: boleto de cobrança padrão - itens (F) (G) resumidos
Modelo padrão com campos de desconto e juros/multa resumidos.

#### 4.1.2. Modelo II - Ficha de compensação: boleto de cobrança padrão - itens (F) (G) estendidos
Modelo padrão com campos de desconto e juros/multa estendidos.

#### 4.1.3. Modelo III - Ficha de compensação: boleto de cobrança com qrcode - itens (F) (G) resumidos
Modelo com QR Code PIX e campos resumidos.

#### 4.1.4. Modelo IV - Ficha de compensação: boleto de cobrança com qrcode - itens (F) (G) estendidos
Modelo com QR Code PIX e campos estendidos.

#### 4.1.5. Modelo IV - Ficha de compensação para boleto de proposta
Modelo específico para boleto de proposta.

**Observação:** Os modelos são meramente ilustrativos e não estão corretamente dimensionados.

### 4.2. Descrição dos Campos

**Regras Gerais:**
- Os campos marcados com `*` são de preenchimento obrigatório
- O tamanho de cada campo (número de posições) pode variar, desde que obedecida a mesma disposição do modelo e as dimensões mínimas do formulário
- Os campos não utilizados podem ficar em branco

#### 4.2.1. Item/Agrupamento [A]

##### 4.2.1.1. Identificação do banco*
- **Localização:** Na parte superior à esquerda vem a identificação do Banco Destinatário
- **Preferencialmente:** Preencher com a Logomarca: CAIXA
- **Excepcionalmente:** Em caso de impossibilidade de inserção de imagem no boleto, pode conter a expressão CAIXA, preferencialmente na fonte Arial Normal, com dimensões proporcionais ao Código do Banco na Compensação

##### 4.2.1.2. Código do banco na compensação*
- **Localização:** À direita da identificação do Banco
- **Formato:** `104-0` em negrito
- **Dimensões:**
  - Caracteres: **5 mm**
  - Traços ou fios: **1,2 mm**

##### 4.2.1.3. Representação numérica/linha digitável*
- **Localização:** Na parte superior direita
- **Dimensões:**
  - Caracteres: **3,5 mm a 4 mm** de altura
  - Traços ou fios: **0,3 mm** de espessura
- **Composição:** Ver Anexo V para composição da Linha Digitável e cálculo do Dígito Verificador

**Observação:** O DV do Campo Livre admite 0 (zero), diferentemente do DV Geral do Código de Barras.

#### 4.2.2. Item/Agrupamento [B]

##### 4.2.2.1. Local de pagamento*
- **Valor:** `EM TODA A REDE BANCÁRIA E SEUS CORRESPONDENTES ATÉ O VALOR LIMITE`

##### 4.2.2.2. Vencimento*
- **Formato:** DD/MM/AAAA
- **Cálculo:** De acordo com o Fator de Vencimento informado no Código de Barras (ANEXO II)

#### 4.2.3. Item/Agrupamento [C]

##### 4.2.3.1. Beneficiário*
- **Nome*:** Razão Social ou Nome Fantasia do Beneficiário
- **CPF/CNPJ***
- **Endereço**

**Observação Legal (Lei Federal 12.039/2009):**
Conforme Lei Federal 12.039/2009, os documentos de cobrança de dívida encaminhados ao consumidor devem constar o Nome, o Endereço e o CPF/CNPJ do fornecedor do produto ou serviço. Dessa forma, caso o Endereço do Beneficiário não conste na Ficha de Compensação, deve constar no Recibo do Pagador.

##### 4.2.3.2. Agência / Código do beneficiário*
- **Descrição:** Código do Cliente no sistema de Cobrança, informado pela CAIXA
- **Formato:** `AAAA / XXXXXXX-DV`
  - **AAAA:** Código da Agência do Beneficiário
  - **XXXXXXX:** Código do Beneficiário (7 posições)
  - **DV:** Dígito Verificador do Código do Beneficiário (Módulo 11), conforme Anexo VI
- **Cálculo:** Para calcular o Dígito Verificador considerar apenas as 07 posições do Código do Beneficiário

**Observação:** O DV do Código do Beneficiário admite 0 (zero), diferentemente do DV Geral do Código de Barras.

#### 4.2.4. Item/Agrupamento [D]

##### 4.2.4.1. Data do documento*
- **Formato:** DD/MM/AAAA
- **Descrição:** Data de emissão do documento que originou o boleto

##### 4.2.4.2. Nr. do documento*
- **Descrição:** Também chamado de "Seu Número", é o número utilizado e controlado pelo Beneficiário para identificar o título de cobrança

##### 4.2.4.3. Espécie Doc*
- **Descrição:** Tipo de documento que originou o boleto
- **Exemplos:** DM (Duplicata Mercantil), DS (Duplicata de Serviço), NP (Nota Promissória), BDA (Boleto de Depósito e Aporte), etc.

##### 4.2.4.4. Aceite*
- **Descrição:** Para identificar se o título de cobrança foi aceito (reconhecimento da dívida pelo Pagador, expressa por sua assinatura no título)
- **Valores:** Preencher com `A` (Aceite) ou `N` (Não Aceite)

##### 4.2.4.5. Data do processamento*
- **Formato:** DD/MM/AAAA
- **Descrição:** Data de impressão do boleto

##### 4.2.4.6. Nosso Número*
- **Descrição:** Número de identificação do título, que permite o Banco e o Beneficiário identificar os dados da cobrança que deram origem ao boleto
- **Composição:** O Nosso Número no SIGCB é composto de **17 posições**, sendo:
  - As **02 posições iniciais** para identificar a Carteira e a Entrega do Boleto
  - As **15 posições restantes** são para livre utilização pelo Beneficiário
- **Formato:** `XYNNNNNNNNNNNNNNN-D`
  - **X:** Modalidade/Carteira de Cobrança (1-Registrada)
  - **Y:** Emissão do boleto (4-Beneficiário)
  - **NNNNNNNNNNNNNNN:** Nosso Número (15 posições livres do Beneficiário)
  - **D:** Dígito Verificador do Nosso Número calculado através do Módulo 11, conforme ANEXO IV
- **Observação:** Admite 0 (zero), diferentemente do DV Geral do Código de Barras

#### 4.2.5. Item/Agrupamento [E]

##### 4.2.5.1. Uso do banco
- **Instrução:** Não preencher

##### 4.2.5.2. Carteira
- **Instrução:** Informar `RG` para título da modalidade REGISTRADA

##### 4.2.5.3. Espécie moeda*
- **Valor:** `R$`

##### 4.2.5.4. Qtde moeda
- **Instrução:** Não preencher

##### 4.2.5.5. xValor
- **Instrução:** Não preencher

##### 4.2.5.6. (=) Valor do documento*
- **Instrução:** Informar o Valor do título, em Real
- **Limite:** Não pode exceder R$ 9.999.999,99

#### 4.2.6. Item/Agrupamento [F]

##### 4.2.6.1. Instruções (Texto de responsabilidade do beneficiário)*
- **Primeira linha:** Deve conter a expressão `"Instruções (Texto de Responsabilidade do Beneficiário)"`
- **Linhas subsequentes:** Utilizadas para especificar as condições de recebimento do título
- **Responsabilidade:** Todas as informações são de responsabilidade do Beneficiário e requerem aprovação prévia da CAIXA

**Observações:**

**Cobrança Registrada:**
- Qualquer instrução relacionada a MULTA, JUROS, DESCONTO e ABATIMENTO impressa no boleto deve corresponder exatamente às informações registradas nos campos específicos do título
- Em caso de liquidação, prevalecerão as informações registradas no título sobre as instruções impressas no boleto

**Boleto de Proposta:**
- Se o documento for um Boleto de Proposta, deve conter o seguinte texto dentro de uma caixa claramente definida:
  ```
  BOLETO DE PROPOSTA
  
  ESTE BOLETO SE REFERE A UMA PROPOSTA JÁ FEITA A VOCÊ E O SEU PAGAMENTO NÃO É OBRIGATÓRIO.
  
  Deixar de pagá-lo não dará causa a protesto, a cobrança judicial ou extrajudicial, nem a inserção de seu nome em cadastro de restrição ao crédito.
  
  Pagar até a data de vencimento significa aceitar a proposta.
  
  Informações adicionais sobre a proposta e sobre o respectivo contrato poderão ser solicitadas a qualquer momento ao Beneficiário, por meio de seus canais de atendimento.
  ```

##### 4.2.6.2. (-) Desconto/Abatimento
- **Instrução:** Não preencher. Campo destinado ao preenchimento no momento do pagamento
- **Formato:** Pode vir no formato:
  - `(-) DESCONTO`
  - `(-) OUTRAS DEDUÇÕES/ABATIMENTOS`

#### 4.2.7. Item/Agrupamento [G]

##### 4.2.7.1. (+) Juros/Multa
- **Instrução:** Não preencher. Campo destinado ao preenchimento no momento do pagamento
- **Formato:** Pode vir no formato:
  - `(+) MORA/MULTA/JUROS`
  - `(+) OUTROS ACRÉSCIMOS`
- **Observação:** Não incluir este campo em Boleto de Proposta

#### 4.2.8. Item/Agrupamento [H]

##### 4.2.8.1. (=) Valor Cobrado
- **Instrução:** Não preencher. Campo destinado ao preenchimento no momento do pagamento

#### 4.2.9. Item/Agrupamento [I]

##### 4.2.9.1. Pagador*
- **Nome/Razão Social*** (Nome ou Razão Social do pagador - obrigatório)
- **Endereço** (Endereço do pagador)
- **CPF/CNPJ*** (CPF ou CNPJ do pagador - obrigatório)

##### 4.2.9.2. Sacador/Avalista ou Beneficiário Final
- **Descrição:** Nome e CPF/CNPJ do favorecido final
- **Regra Especial (BDA):** Quando espécie de boleto 33 – Depósito e Aporte (BDA), o nome do campo deve constar como 'Beneficiário Final', sendo os mesmos dados do campo 'Pagador'

#### 4.2.10. Item/Agrupamento [J]

##### 4.2.10.1. Código de barras*
- **Localização:** Na parte inferior à esquerda vem o Código de Barras
- **Posicionamento:**
  - **12 mm** desde a margem inferior da Ficha de Compensação até o centro do código de barras
  - **5 mm** da lateral esquerda da Ficha de Compensação até o início do código de barras (zona de silêncio)
- **Dimensão:** **103 mm** de comprimento por **13 mm** de altura
- **Tipo:** "2 de 5 intercalado" (Interleaved 2 of 5)
  - "2 de 5" significa que 5 barras definem 1 caractere, sendo que duas delas são barras longas
  - "intercalado" significa que os espaços entre barras também têm significado, de maneira análoga às barras

##### 4.2.10.1.1. Composição do código de barras

O código de barras para a cobrança contém **44 posições** dispostas da seguinte forma:

| Posição | Tamanho | Picture | Conteúdo | Observação |
|---------|---------|---------|----------|------------|
| 01-03 | 3 | 9(3) | Identificação do banco (104) | |
| 04-04 | 1 | 9 | Código da moeda (9 - Real) | |
| 05-05 | 1 | 9 | DV Geral do Código de Barras | Nota 2 / Anexo I |
| 06-09 | 4 | 9 | Fator de Vencimento | Anexo II |
| 10-19 | 10 | 9(8)V99 | Valor do Documento | |
| 20-26 | 7 | 9(7) | Código do Beneficiário | Nota 3 / Anexo VI |
| 27-29 | 3 | 9(3) | Nosso Número - Sequência 1 | |
| 30-30 | 1 | 9(1) | Constante 1 | |
| 31-33 | 3 | 9(3) | Nosso Número - Sequência 2 | Nota 1 |
| 34-34 | 1 | 9(1) | Constante 2 | |
| 35-43 | 9 | 9(9) | Nosso Número - Sequência 3 | |
| 44-44 | 1 | 9(1) | DV do Campo Livre | Nota 4 / Anexo III |

**Campo Livre:** Posições 27-43 (excluindo o DV na posição 44)

**NOTA 1 - NOSSO NÚMERO DO SIGCB:**
- O Nosso Número é composto de **17 posições**
- As **02 posições iniciais** identificam a Carteira e a Entrega do Boleto
- As **15 posições restantes** são para livre utilização pelo Beneficiário
- **Estrutura no Código de Barras:**
  - **Constante 1 (posição 30):** 1ª posição do Nosso Número = Tipo de Cobrança (1-Registrada)
  - **Constante 2 (posição 34):** 2ª posição do Nosso Número = Identificador de Emissão do Boleto (4-Beneficiário)
  - **Sequência 1 (posições 27-29):** 3ª a 5ª posição do Nosso Número
  - **Sequência 2 (posições 31-33):** 6ª a 8ª posição do Nosso Número
  - **Sequência 3 (posições 35-43):** 9ª a 17ª posição do Nosso Número

**NOTA 2 - DV GERAL DO CÓDIGO DE BARRAS (posição 5):**
- Calculado através do **Módulo 11**, conforme ANEXO I
- **ATENÇÃO:** Não admite 0 (zero)
- Se o RESULTADO for igual 0 (zero) ou maior que 9 (nove), o DV será 1 (um)

**NOTA 3 - CÓDIGO DO BENEFICIÁRIO:**
- **Para códigos entre 000001 e 999999:**
  - Posições 20-25: Código do Beneficiário
  - Posição 26: DV do Código do Beneficiário (calculado com Módulo 11, conforme Anexo VI)
- **Para códigos a partir de 1100000:**
  - Posições 20-26: Código do Beneficiário (sem cálculo de DV)
- **Observação:** O DV do Código do Beneficiário admite 0 (zero), diferentemente do DV Geral do Código de Barras

**NOTA 4 - DV DO CAMPO LIVRE (posição 44):**
- Calculado através do **Módulo 11**, conforme ANEXO III
- **Observação:** Admite 0 (zero), diferentemente do DV Geral do Código de Barras

##### 4.2.10.1.2. Autenticação mecânica - Ficha de compensação*
- **Localização:** Na parte inferior à direita vem a expressão "Autenticação Mecânica - Ficha de Compensação"
- **Dimensões:**
  - Dimensão máxima: **2 mm**
  - Traços ou fios: **0,3 mm**

---

## 5. ANEXOS

### 5.1. Anexo I – Cálculo do dígito verificador geral do código de barras

#### 5.1.1. 1º passo
- **Método:** Aplicar o módulo 11, com peso de 2 a 9
- **Direção:** O primeiro dígito da direita para a esquerda será multiplicado por 2, o segundo por 3 e assim sucessivamente até o 9
- **Posições consideradas:** Posições 1 a 4 e 6 a 44 (iniciando pela posição 44 e saltando a posição 5)

#### 5.1.2. 2º passo
- **Instrução:** Somar o resultado da multiplicação
- **Exemplo:** `Total da Soma = 788`

#### 5.1.3. 3º passo
- **Instrução:** Dividir o Total da Soma por 11
- **Exemplo:** `788/11 = 71 (Resto 7)`

#### 5.1.4. 4º passo
- **Instrução:** O Resto da divisão deve ser subtraído de 11
- **Exemplo:** `11 - 7 = 4`
- **Resultado:** `DV = 4`

**Regra Especial:**
- **ATENÇÃO:** Em nenhuma hipótese poderá ser utilizado o dígito igual a 0 (zero) como DV Geral
- Se o RESULTADO for igual 0 (zero) ou maior que 9 (nove), o DV será 1 (um)
- Regra exclusiva para cálculo do DV geral do código de barras que não admite 0 (zero)

### 5.2. Anexo II – Fator de Vencimento

#### 5.2.1. Fator de Vencimento (Posições 06 a 09 do campo 5)
- **Definição:** Resultado da subtração da DATA BASE da data de vencimento do título
- **DATA BASE:** 07/10/1997
- **Formato:** Referência numérica de 4 dígitos
- **Localização:** Primeiras 4 posições do campo "valor"
- **Significado:** Número de dias decorridos da data base até a data de vencimento do título
- **Uso:** Para boletos emitidos a partir de 01/09/2000, devem conter esta característica

#### 5.2.2. Cálculo do Fator de Vencimento
- **Fórmula:** (Data de Vencimento - Data Base) = Fator
- **Data Base:** 07/10/1997
- **Exemplo:**
  - Vencimento: 03/07/2000
  - Data Base: 07/10/1997
  - Fator de Vencimento: 1000

#### 5.2.3. Observações
- **Reset do Fator:** A partir do dia 22/02/2025 o fator de vencimento retornará ao seu contador inicial (FATOR "1000")
- Isso significa que o vencimento em 22/02/2025 terá o fator 1000, seguindo a regra já existente

**Tabela de Correlação Data X Fator:**
| Fator | Vencimento |
|-------|------------|
| 1000 | 22/02/2025 |
| 1002 | 24/02/2025 |
| 1667 | 21/12/2026 |
| 4789 | 09/07/2035 |
| 9999 | 13/10/2049 |

**Observação Importante:**
Quando a primeira posição do campo "valor" (fator de vencimento + valor) for zero, significa que no código de barras/linha digitável desse título, não consta o fator de vencimento.

### 5.3. Anexo III – Campo Livre do Código de Barras

#### 5.3.1. Cálculo do Dígito Verificador do Campo Livre

O Campo Livre contém **25 posições** dispostas da seguinte forma:

| Descrição | Posição no Código de Barras | Observação |
|-----------|----------------------------|------------|
| Código do Beneficiário | 20-25 | |
| DV do Código do Beneficiário | 26-26 | Anexo VI |
| Nosso Número – Sequência 1 | 27-29 | 3ª a 5ª posição do Nosso Número |
| Constante 1 | 30-30 | 1ª posição do Nosso Número: Tipo de Cobrança (1-Registrada) |
| Nosso Número – Sequência 2 | 31-33 | 6ª a 8ª posição do Nosso Número |
| Constante 2 | 34-34 | 2ª posição do Nosso Número: Identificador da Emissão do Boleto (4-Beneficiário) |
| Nosso Número – Sequência 3 | 35-43 | 9ª a 17ª posição do Nosso Número |
| DV do Campo Livre | 44-44 | Item 5.3.1 (abaixo) |

##### 5.3.1.1. 1º passo
- **Método:** Aplicar o módulo 11, o primeiro dígito da direita para a esquerda será multiplicado por 2, o segundo por 3 e assim sucessivamente até o 9

##### 5.3.1.2. 2º passo
- **Instrução:** Somar o resultado da multiplicação
- **Observação:** Quando o Total da Soma for MENOR que o quociente (no caso 11), pular o 3º passo, ou seja, o Total da Soma deverá ser diminuído diretamente do quociente, obtendo-se o DV como resultado

##### 5.3.1.3. 3º passo
- **Instrução:** Dividir o Total da Soma por 11
- **Exemplo:** `538/11 = 48 (Resto = 10)`

##### 5.3.1.4. 4º passo
- **Instrução:** Subtrair o resto da divisão de 11
- **Exemplo:** `11 - 10 = 1`
- **Resultado:** `DV = 1`

**Regra Especial:**
- Se o RESULTADO for maior que 9 (nove), o DV será 0 (zero)*, caso contrário o RESULTADO será o DV
- **Observação:** O DV do Campo Livre admite 0 (zero), diferentemente do DV Geral do Código de Barras

### 5.4. Anexo IV – Cálculo do Dígito Verificador do Nosso Número

#### 5.4.1. 1º passo
- **Método:** Aplicar o módulo 11, com peso de 2 a 9
- **Direção:** O primeiro dígito da direita para a esquerda será multiplicado por 2, o segundo por 3 e assim sucessivamente até o 9
- **Posições:** Considerar 17 posições do Nosso Número

#### 5.4.2. 2º passo
- **Instrução:** Somar o resultado da multiplicação
- **Exemplo:** `Total da Soma = 59`

#### 5.4.3. 3º passo
- **Instrução:** Dividir o Total da Soma por 11
- **Exemplo:** `59/11 = 5 (Resto 4)`

#### 5.4.4. 4º passo
- **Instrução:** O Resto da divisão deve ser subtraído de 11
- **Exemplo:** `11 - 4 = 7`
- **Resultado:** `DV = 7`

**Regra Especial:**
- Se o RESULTADO for maior que 9 (nove), o DV será 0 (zero), caso contrário o RESULTADO será o DV
- **Observação:** Admite 0 (zero), diferentemente do DV Geral do Código de Barras

### 5.5. Anexo V – Linha Digitável / Representação Numérica

#### 5.5.1. Composição da Linha Digitável

A Linha Digitável é composta de **5 campos**:

**1º Campo:**
- Posições 1 a 3 do código de barras (Banco)
- Posição 4 do código de barras (Moeda)
- Primeiras 5 posições do Campo Livre (posições 20 a 24 do código de barras)
- Dígito Verificador do Campo 1 (Módulo 10)

**2º Campo:**
- Posições 6 a 15 do Campo Livre (posições 25 a 34 do código de barras)
- Dígito Verificador do Campo 2 (Módulo 10)

**3º Campo:**
- Posições 16 a 25 do Campo Livre (posições 35 a 44 do código de barras)
- Dígito Verificador do Campo 3 (Módulo 10)

**4º Campo:**
- Dígito Verificador Geral do Código de Barras (posição 5 do código de barras)

**5º Campo:**
- Fator de Vencimento (posições 6 a 9 do código de barras)
- Valor do Documento (posições 10 a 19 do código de barras)
- Total: 14 posições, sem formatação (sem pontos ou vírgulas)
- **Limite:** Apesar de ter 10 posições para o valor nominal, o valor não pode exceder R$ 9.999.999,99

**Regras de Formatação:**
- Os três primeiros campos devem ser editados, após as cinco primeiras posições, com um ponto ".", a fim de facilitar a visualização para a digitação
- Os campos são separados por espaço, equivalente a um caractere
- Os dados da representação numérica não se apresentam na mesma ordem do código de barras, mas sim de acordo com a sequência descrita acima
- Os dígitos verificadores referentes aos campos 1, 2 e 3 não são representados no código de barras

**Campo 5 - Regras Especiais:**
- Não deverá haver separação por pontos, vírgulas ou espaços
- A existência de "0000" no campo "fator de vencimento" da linha digitável do boleto de cobrança é indicativo de que o código de barras não contém fator de vencimento

#### 5.5.1. Cálculo do Dígito Verificador da Linha Digitável (campos 1, 2 e 3)

##### 5.5.1.1. 1º passo
- **Método:** Calcular através de MÓDULO 10, com peso 2 e 1 alternados
- **Direção:** Cada dígito do número, começando da direita para a esquerda é multiplicado, na ordem, por 2, depois 1, depois 2, depois 1 e assim sucessivamente
- **Regra para produtos de 2 dígitos:** Quando o resultado da multiplicação for um número com 2 dígitos, somar os 2 algarismos (exemplo: se uma multiplicação der 12, será somado 1 + 2 = 3)

##### 5.5.1.2. 2º passo
- **Instrução:** Somar o resultado da multiplicação
- **Exemplo:** `Total da Soma = 25`

##### 5.5.1.3. 3º passo
- **Instrução:** Dividir o resultado da multiplicação por 10
- **Exemplo:** `25/10 = 2 (Resto = 5)`

##### 5.5.1.4. 4º passo
- **Instrução:** Subtrair o resto da divisão de 10
- **Exemplo:** `10 - 5 = 5`
- **Resultado:** `DV = 5`

**Regras Especiais:**
- Quando o resultado da multiplicação for um número com 2 dígitos, somar os 2 algarismos
- Se o Total da Soma for inferior a 10, o DV corresponde à diferença entre 10 e o Total da Soma
- Se o resto da divisão for 0 (zero), o DV será 0 (zero)

### 5.6. Anexo VI – Cálculo do Dígito Verificador do Código Do Beneficiário

**Aplicabilidade:** Aplica-se somente para códigos de beneficiários cadastrados entre as faixas 000001 e 999999.

**Método:** O DV do Código do Beneficiário é calculado através do MÓDULO 11, com peso de 2 a 9.

**Escopo:** Para calcular o Dígito Verificador considerar apenas as 06 posições do Código do Beneficiário.

#### 5.6.1. 1º passo
- **Método:** Aplicar o módulo 11 aos dados do Código de Barras, o primeiro dígito da direita para a esquerda será multiplicado por 2, o segundo por 3 e assim sucessivamente até o 9

#### 5.6.2. 2º passo
- **Instrução:** Somar o resultado da multiplicação
- **Exemplo:** `Total da Soma = 59`
- **Observação:** Quando o Total da Soma for MENOR que o quociente (no caso 11), pular o 3º passo, ou seja, o Total da Soma deverá ser diminuído diretamente do quociente, obtendo-se o DV como resultado

#### 5.6.3. 3º passo
- **Instrução:** Dividir o Total da Soma por 11
- **Exemplo:** `59/11 = 5 (Resto = 4)`

#### 5.6.4. 4º passo
- **Instrução:** Subtrair o resto da divisão de 11
- **Exemplo:** `11 - 4 = 7`
- **Resultado:** `DV = 7`

**Regra Especial:**
- Se o RESULTADO for maior que 9 (nove), o DV será 0 (zero), caso contrário o RESULTADO será o DV
- **Observação:** Admite 0 (zero), diferentemente do DV Geral do Código de Barras

### 5.7. Anexo VII – Geração de QR Code PIX e código 'copia e cola'

#### 5.7.1. Requisitos Gerais

- **Padrão:** Conforme orientação do Banco Central (BACEN), o QR Code dinâmico gerado pelo cliente deve seguir os padrões BR Code
- **Modo:** O QR Code deverá ser definido como modo recebedor (Merchant Presented Mode – MPM)
- **Funcionamento:** O modo de QR Code MPM (dinâmico) permite a utilização de uma URL configurável e que é acessada no ato da leitura. Sendo assim, as informações dispostas no QR Code são reduzidas e demais informações de pagamento são acessadas pela URL

#### 5.7.2. Estrutura dos Campos do QR Code PIX

**Campo 1:**
- **Definição:** Fixo
- **Valor:** `000201`

**Campo 2:**
- **Definição:** Fixo
- **Valor:** `010212`

**Campo 3:**
- **Definição:** Variável
- **Valor:** `26 + quantidade de caracteres do campo 4 e campo 5`

**Campo 4:**
- **Definição:** Fixo
- **Valor:** `0014br.gov.bcb.pix`

**Campo 5:**
- **Definição:** Variável
- **Valor:** `25 + quantidade de caracteres do campo 6 e campo 7`

**Campo 6:**
- **Definição:** Fixo
- **Valor:** `pix-qrcode.caixa.gov.br/api/v2/cobv/`

**Campo 7:**
- **Definição:** Variável
- **Valor:** `Fixo (CO011) + Variável (0CCCCCCCONNNNNNNNNNNNNNNNN)`
  - `CCCCCCC` = Código do convênio beneficiário
  - `NNNNNNNNNNNNNNNNN` = Nosso Número

**Campo 8:**
- **Definição:** Fixo
- **Valor:** `5204000053039865802BR`

**Campo 9:**
- **Definição:** Variável
- **Valor:** `59 + quantidade de caracteres do campo 10`
- **Exemplo:** `59 + 23 (CAIXA ECONOMICA FEDERAL) = 23`

**Campo 10:**
- **Definição:** Fixo
- **Valor:** 'Merchant Name' é nome/razão social do convênio beneficiário da cobrança (CAIXA ECONOMICA FEDERAL)

**Campo 11:**
- **Definição:** Fixo
- **Valor:** `60 + quantidade de caracteres do campo 12`
- **Exemplo:** `60 + 08 (BRASILIA) = 08`

**Campo 12:**
- **Definição:** Variável
- **Valor:** 'Merchant City' é a localidade do convênio beneficiário de cobrança (BRASILIA)

**Campo 13:**
- **Definição:** Fixo
- **Valor:** `62070503***`

**Campo 14:**
- **Definição:** Variável
- **Valor:** `6304 + Gerar HASH CRC16 da cobrança`

#### 5.7.3. Decodificação do QR Code

A decodificação do QR Code segue o padrão EMV (Europay, MasterCard, and Visa), com campos identificados por IDs de 2 dígitos:

| Campo | ID | Nome EMV | Tam | Definição | Valor |
|-------|----|----------|-----|-----------|-------|
| 1 | 00 | Payload Format Indicator | 02 | Fixo | 01 |
| 2 | 01 | Point of Initiation Method | 02 | Fixo | 12 |
| 3 | 26 | Merchant Account Information | 89 | Variável | br.gov.bcb.pix2567pix-qrcode.caixa.gov.br/api/v2/cobv/CO01101100689014000000154746633 |
| 4 | 00 | Globally Unique Identifier | 14 | Fixo | br.gov.bcb.pix |
| 5 | 25 | URL do Payload | 67 | Variável | pix-qrcode.caixa.gov.br/api/v2/cobv/CO01101100689014000000154746633 |
| 6 | 52 | Merchant Category Code | 04 | Fixo | 0000 |
| 7 | 53 | Transaction Currency | 03 | Fixo | 986 |
| 8 | 58 | Country Code | 02 | Fixo | BR |
| 9 | 59 | Merchant Name | 23 | Variável | CAIXA ECONOMICA FEDERAL |
| 10 | 60 | Merchant City | 08 | Variável | BRASILIA |
| 11 | 62 | Additional Data Field Template | 07 | Fixo | 0503*** |
| 12 | 05 | Reference Label | 03 | Fixo | *** |
| 13 | 63 | CRC | 04 | Variável | DBOF |

---

## 📝 RESUMO DAS ESPECIFICAÇÕES CRÍTICAS

### Dimensões e Posicionamento

- **Ficha de Compensação:** 95-108mm altura × 170-216mm comprimento
- **Código de Barras:** 103mm × 13mm, posicionado a 12mm da margem inferior e 5mm da lateral esquerda
- **Linha Digitável:** Caracteres de 3,5-4mm altura, traços de 0,3mm espessura
- **Código do Banco:** Caracteres de 5mm, traços de 1,2mm
- **Autenticação Mecânica:** Dimensão máxima de 2mm, traços de 0,3mm

### Cores e Impressão

- **Preferencial:** Fundo branco e impressão azul ou preta
- **Permitido:** Fundo claro (ex: papel reciclável), desde que não prejudique a leitura do código de barras

### Cálculos de Dígitos Verificadores

1. **DV Geral do Código de Barras (Módulo 11):** Não admite 0 (zero). Se resultado for 0 ou >9, usar 1.
2. **DV do Campo Livre (Módulo 11):** Admite 0 (zero). Se resultado >9, usar 0.
3. **DV do Nosso Número (Módulo 11):** Admite 0 (zero). Se resultado >9, usar 0.
4. **DV do Código do Beneficiário (Módulo 11):** Admite 0 (zero). Se resultado >9, usar 0.
5. **DV da Linha Digitável - Campos 1, 2, 3 (Módulo 10):** Se resto da divisão for 0, DV = 0.

### Campos Obrigatórios

**Recibo do Pagador:**
- Nome do Beneficiário
- Endereço do Beneficiário
- CNPJ/CPF do Beneficiário
- Agência/Código do Beneficiário
- Valor do título (limitado a R$ 9.999.999,99)
- Vencimento
- Nosso Número
- Número do Documento (Seu Número)

**Ficha de Compensação:**
- Todos os campos marcados com `*` são obrigatórios
- Código de Barras (44 posições)
- Linha Digitável (5 campos formatados)
- Informações de contato CAIXA (se logomarca CAIXA presente)

---

## ⚠️ PONTOS CRÍTICOS PARA IMPLEMENTAÇÃO

1. **Homologação Obrigatória:** Enviar 10-20 amostras à CAIXA antes da distribuição
2. **Cálculos de DV:** Implementar corretamente todos os algoritmos de Módulo 10 e Módulo 11
3. **Formatação da Linha Digitável:** Seguir exatamente o padrão de 5 campos com pontos e espaços
4. **Código de Barras:** Gerar no formato Interleaved 2 of 5 com dimensões exatas
5. **Boleto de Proposta:** Incluir texto obrigatório em caixa claramente definida
6. **QR Code PIX:** Seguir padrão BR Code para boletos híbridos
7. **Valores Máximos:** Valor do documento limitado a R$ 9.999.999,99
8. **Fator de Vencimento:** Considerar reset em 22/02/2025 (volta para 1000)

---

**Última atualização:** Baseado nas imagens fornecidas do documento de homologação  
**Versão do documento:** 67.119 v015 micro

