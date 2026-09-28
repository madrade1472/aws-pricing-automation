---
description: (AWS) Lê a proposta apontada pelo usuário e gera a estimativa compartilhável no AWS Pricing Calculator
---

Gerar a calculadora **AWS** (AWS Pricing Calculator) compartilhável a partir de uma proposta
comercial.

**Não exija nome de cliente como argumento.** O usuário indica a proposta pelo caminho, pela pasta
atual ou por referência na mensagem.

**Capacidade verificada:** o pipeline Playwright dirige o calculator.aws, salva a estimativa, clica
em Share, aceita os termos e extrai a URL. Não declare que não é possível gerar o link.

## Passos

1. **Localize o `.docx` da proposta.** Se houver mais de um candidato, liste e pergunte qual usar.
   Derive o nome curto do caso.
2. **Leia `CLAUDE.md` por inteiro antes de escrever qualquer script.** Ele tem as armadilhas já
   descobertas (Bedrock só aceita inteiros em req/min e horas/dia, não alterar a região, não tocar
   na rota de inferência, padrões de UI do calculator.aws).
3. Extraia o texto do `.docx`, leia a seção de custos de nuvem e **valide a matemática** da
   proposta antes de automatizar.
4. Copie `aws/build_estimate_example.mjs` para `build_<caso>.mjs`, ajuste os serviços e rode em
   background. Confira o custo de cada serviço contra o alvo no log e re-rode se algum sair fora.
5. Entregue o **link** (`https://calculator.aws/#/estimate?id=...`), a **tabela de custos**, o
   **total mensal e anual**, e as **diferenças em relação à proposta** explicadas de forma honesta.
