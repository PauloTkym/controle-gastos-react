# Controle de Gastos 2.0 em React

Aplicacao React baseada no app original em Google Planilhas e Apps Script.

## Como rodar

```bash
pnpm install
pnpm dev
```

Depois abra `http://127.0.0.1:5173/`.

## O que foi mantido

- Abas de novo lancamento e extrato.
- Tipos Entrada e Saida.
- Categorias e formas de pagamento dinamicas.
- Valores de saida salvos como negativos.
- Resumo com entradas, saidas e saldo.
- Historico do mais recente para o mais antigo.

## Diferencas da versao React

- Os dados ficam salvos no `localStorage` do navegador.
- O extrato tem botao para remover lancamentos.
- O botao de download exporta um CSV com os lancamentos.
