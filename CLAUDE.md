# Instruções para um agente conduzir este pipeline

Este arquivo é lido automaticamente por agentes de código como o Claude Code. Ele descreve o
trabalho que **não** é determinístico: transformar uma proposta comercial em uma estimativa
correta e compartilhável de custo de nuvem.

O código deste repositório executa. Quem interpreta o documento e escreve o `build_<caso>.mjs`
ou o spec JSON é você.

## Como é acionado

Um comando por provedor, na convenção `/calc_<cloud>` (em `.claude/commands/`), ou um pedido em
linguagem natural como "monta a calculadora AWS dessa proposta". O comando é só o gatilho e **não
leva nome de cliente como argumento**: o usuário aponta o documento, e a partir dele você localiza
o `.docx` e deriva o nome curto do caso.

| Comando | Provedor | Entrega |
|---|---|---|
| `/calc_aws` | AWS | Link oficial anônimo `https://calculator.aws/#/estimate?id=...`, via Playwright (`aws/`) |
| `/calc_microsoft` | Azure | Calculadora HTML auto-hospedável (`azure/`) |
| `/calc_gcp` | Google Cloud | Repositório irmão [gcp-pricing-calculator-pipeline](https://github.com/madrade1472/gcp-pricing-calculator-pipeline) |

## O que você entrega, sempre nesta forma

1. o link (AWS) ou o arquivo HTML (Azure);
2. a tabela de custos, serviço a serviço;
3. o total mensal e o anual;
4. as diferenças em relação à proposta, explicadas de forma honesta: região, unidade, desconto,
   arredondamento, premissa adotada por não estar no documento.

O item 4 não é opcional.

## Fluxo comum

1. **Ler a proposta.** Extraia o texto do `.docx` (descompactar e ler `word/document.xml` basta) e
   foque na seção de custos de nuvem ou de ambiente de produção: serviços, volumes, preços
   unitários, total mensal.
2. **Validar a matemática** antes de automatizar: volume × preço unitário tem que bater com os
   subtotais.
3. **Adaptar o script ou o spec**, rodar em background e conferir cada serviço contra o alvo no log.
4. **Entregar** na forma acima.

---

# AWS (`/calc_aws`)

**É possível gerar o link compartilhável sem login.** O pipeline Playwright headless dirige o
calculator.aws, salva a estimativa, clica em Share, aceita os termos e extrai a URL. Nunca recuse
essa capacidade.

## Dois caminhos

- **Editar uma estimativa existente** e escalá-la até um alvo: `aws/build_estimate_example.mjs`.
  Abre um link público read-only, clica "Atualizar estimativa" para gerar a cópia editável, ajusta
  os serviços e usa o Athena como dial de fechamento. Copie para `build_<caso>.mjs` e ajuste
  `SRC`, `NAME`, `TARGET` e os `editService()`.
- **Montar do zero** a partir da lista de serviços da proposta, com o padrão de helpers abaixo.

## Padrões de UI do calculator.aws

| Helper | Papel |
|---|---|
| `startService(term)` | Vai para `#/addService`, **dá reload** (limpa o estado do formulário anterior), busca o serviço e clica "Configure" |
| `fillVerify(aria, val)` | Preenche e relê o `inputValue`. Campos re-renderizam; confirmar é obrigatório |
| `readSettled()` | Espera o "Total Monthly cost" estabilizar antes de ler ou salvar |
| `saveSummary()` | Clica "Save and view summary", com retry até sair de `/createCalculator` |
| `openEdit(ariaRe)` | Abre o formulário de edição de um serviço, com retry (o SPA às vezes cai em `/addService`) |
| `saveEdit()` | No formulário de edição o botão é **"Atualizar"**, não "Salvar" |

No fim: botão **Share** → "Agree and continue" → ler a URL dos inputs.

## Armadilhas já descobertas

- **A cópia editável só vive no `localStorage`.** Fechou o browser, ela some. Editar, renomear e
  compartilhar na mesma sessão.
- **Bedrock: requisições por minuto e horas por dia só aceitam inteiros.** Volume mensal =
  `req/min × 60 × horas/dia × 30`. Para cerca de 100 mil requisições/mês com 4.000 tokens de entrada
  e 800 de saída, divididas 70/30: Haiku 4.5 com `13 req/min × 3 h` ≈ 70.200 → US$ 561,60
  (US$ 1 / US$ 5 por milhão); Sonnet 4.6 com `17 req/min × 1 h` ≈ 30.600 → US$ 734,40
  (US$ 3 / US$ 15). O arredondamento para inteiro explica diferenças de cerca de 1% contra a proposta.
- **Não altere a região no Bedrock.** Bug do calculator.aws: a segunda entrada Bedrock Anthropic em
  us-east-1 com rota "Global" cobra a saída pelo preço da entrada (Sonnet caiu de US$ 734 para
  US$ 440). A região US East padrão tem o mesmo preço de token; deixe-a.
- **Não toque na rota de inferência.** O padrão "Global" é o on-demand; "In Region" ou
  "Geo Cross Region" zeram ou corrompem o preço.
- **Bedrock, provedor:** marque o checkbox "Anthropic" e desmarque "Amazon". Um modelo por entrada
  de serviço (o dropdown é único).
- **CloudWatch** de cerca de US$ 30 = `Number of Metrics = 100` (US$ 0,30 por métrica). **Lambda**
  com cerca de 100 mil requisições/mês fica no free tier (US$ 0).
- **Data Transfer tem rótulos ambíguos.** Localize o campo pelo valor atual em vez do rótulo
  (`setByCurrentVal` no exemplo).

---

# Azure (`/calc_microsoft`)

O Azure Pricing Calculator oficial **exige login Microsoft** para Share e Save (os botões ficam
`disabled` sem autenticação; só Export/Excel é anônimo). Por isso a entrega Azure é uma
**calculadora HTML interativa e auto-hospedável**, que vira link de verdade ao publicar em GitHub
Pages ou Netlify. Não dirija o calculator oficial sem uma sessão autenticada fornecida pelo usuário.

**Pipeline:** proposta `.docx` → spec `<caso>.azure.json` →
`node azure/gen_azure_html.mjs <spec> <saida.html>` → `node azure/verify_azure_html.mjs <saida.html>`.

Spec: `{titulo, subtitulo, regiao, rodape, servicos:[{categoria, servico, detalhe, qtd, unidade, preco}]}`.
Agrupe `servicos` por `categoria`; o gerador cria um cabeçalho por categoria, na ordem do array.
Preços em East US, pay-as-you-go, salvo indicação da proposta. Exemplo: `azure/example.spec.json`
→ `azure/example.output.html`.

---

## Regras de trabalho

- **Antes de dizer que algo é impossível, inspecione o projeto.** Provavelmente já foi verificado.
- **Ao encontrar uma armadilha nova, documente aqui** em vez de espalhar gambiarra pelos scripts.
- **Diferenças entre o total do calculator e o da proposta são explicadas, nunca escondidas.**
- **Dados de cliente não entram em repositório público.** Propostas, volumes e custos de casos reais
  ficam fora do git.
