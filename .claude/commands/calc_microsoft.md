---
description: (Azure/Microsoft) Lê a proposta apontada pelo usuário e gera a calculadora de custos Azure (HTML auto-hospedável)
---

Gerar a calculadora **Microsoft Azure** a partir de uma proposta comercial.

**Não exija nome de cliente como argumento.** O usuário indica a proposta pelo caminho, pela pasta
atual ou por referência na mensagem.

**Limitação verificada:** o Azure Pricing Calculator oficial só gera link compartilhável
(`azure.com/e/<id>`) **após login Microsoft**. A entrega Azure é uma **calculadora HTML
auto-hospedável**, que vira link de verdade ao hospedar. Não tente dirigir o calculator oficial sem
uma sessão autenticada fornecida pelo usuário.

## Passos

1. **Localize o `.docx` da proposta.** Se houver mais de um candidato, liste e pergunte qual usar.
2. **Leia a seção Azure do `CLAUDE.md`** antes de gerar.
3. Extraia o texto do `.docx` e leia os custos Azure: serviços, SKUs, quantidades, unidades e
   preços unitários (East US, pay-as-you-go, salvo indicação). **Valide a matemática.**
4. Monte o spec `<caso>.azure.json` no formato de `azure/example.spec.json`:
   `{titulo, subtitulo, regiao, rodape, servicos:[{categoria, servico, detalhe, qtd, unidade, preco}]}`,
   agrupando por `categoria`.
5. Rode `node azure/gen_azure_html.mjs <caso>.azure.json calculadora_azure_<caso>.html` e valide
   com `node azure/verify_azure_html.mjs calculadora_azure_<caso>.html`.
6. Entregue o **arquivo HTML**, a **tabela de custos**, o **total mensal e anual**, e como
   transformá-lo em link (GitHub Pages, Netlify Drop) se o usuário quiser uma URL.
