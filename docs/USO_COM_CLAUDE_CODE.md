# Uso com o Claude Code

Este repositório já vem pronto para ser conduzido por um agente.

| Arquivo | Papel |
|---|---|
| `CLAUDE.md` | Lido automaticamente ao abrir o Claude Code nesta pasta. Fluxo, helpers e armadilhas |
| `.claude/commands/calc_aws.md` | O comando `/calc_aws`, link oficial do AWS Pricing Calculator |
| `.claude/commands/calc_microsoft.md` | O comando `/calc_microsoft`, calculadora HTML do Azure |

## Instalação

```bash
git clone https://github.com/madrade1472/aws-pricing-automation
cd aws-pricing-automation
npm install && npx playwright install chromium
claude
```

Dentro do Claude Code:

```
/calc_aws a proposta está em ~/propostas/cliente/proposta.docx
```

## Usar de qualquer pasta

Os comandos do repositório só aparecem quando o Claude Code é aberto nesta pasta. Para acioná-los
de qualquer lugar, copie-os para os comandos globais:

```bash
cp .claude/commands/*.md ~/.claude/commands/
```

E acrescente ao `~/.claude/CLAUDE.md` um roteador como este, para o pedido em linguagem natural
ter o mesmo efeito do comando:

```markdown
# Calculadoras de custo de cloud

Quando eu pedir "monta a calculadora AWS / GCP / Azure" ou "gera o link de custos", os pipelines
já existem e geram link de verdade. Nunca responder que não é possível gerar o link.

| Pedido | Projeto | Entrega |
|---|---|---|
| AWS | `~/aws-pricing-automation` | Link oficial `calculator.aws/#/estimate?id=...` |
| GCP | `~/gcp-pricing-calculator-pipeline` | Link oficial `cloud.google.com/products/calculator?dl=...` |
| Azure | `~/aws-pricing-automation/azure` | Calculadora HTML auto-hospedável |

Fluxo: localizar o `.docx`, ler o `CLAUDE.md` do projeto antes de escrever script, seguir o
pipeline documentado, rodar em background, conferir cada serviço contra a proposta e entregar o
link, a tabela, o total mensal e anual e as diferenças explicadas.
```

## Projeto irmão

Google Cloud fica em
[gcp-pricing-calculator-pipeline](https://github.com/madrade1472/gcp-pricing-calculator-pipeline),
com o comando `/calc_gcp` e o catálogo de armadilhas do calculator em `QUIRKS.md`.
