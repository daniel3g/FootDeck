# Football Cards API

API REST de catálogo de cartas de futebol. Serviço genérico de consulta, independente das regras de qualquer jogo.

Documentação de arquitetura e decisões: [`FOOTBALL_CARDS_API_ARCHITECTURE.md`](./FOOTBALL_CARDS_API_ARCHITECTURE.md).

**Estado atual: Fase 1 (fundação).** Servidor, validação de ambiente, OpenAPI, tratamento de erros e testes. Ainda sem banco de dados.

---

## Rodando localmente

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env
npm run dev
```

| URL | O que é |
| --- | --- |
| http://localhost:3000/docs | Swagger UI |
| http://localhost:3000/api/v1/health | Health check |
| http://localhost:3000/api/v1/openapi.json | Documento OpenAPI |

## Comandos

```bash
npm run dev      # servidor com reload
npm start        # servidor
npm run build    # type-check (tsc --noEmit)
npm test         # testes
npm run lint     # eslint
npm run format   # prettier
```

---

## Deploy na Vercel

O projeto já está configurado: `api/index.ts` é o entrypoint e o `vercel.json` redireciona todas as rotas para ele.

```bash
npx vercel          # preview
npx vercel --prod   # produção
```

Variáveis a configurar no painel da Vercel:

```text
API_VERSION=v1
CORS_ORIGIN=*
```

A Vercel define `NODE_ENV=production` sozinha — não configure essa variável manualmente.

**`CORS_ORIGIN` é obrigatória em produção.** Sem ela a API falha no boot, de propósito: a Vercel já roda em modo produção, então a origem ficaria aberta por default em vez de por decisão. `*` é uma escolha legítima para um catálogo público sem credenciais; troque pela origem do jogo se quiser restringir.

Depois do primeiro deploy, cadastre o secret `API_HEALTH_URL` no GitHub apontando para `https://<projeto>.vercel.app/api/v1/health`. O workflow `keep-alive` usa isso para impedir que o projeto Supabase pause por inatividade.

---

## Estrutura

```text
api/index.ts     entrypoint da Vercel
src/app.ts       monta o app (não escuta porta — permite testar sem rede)
src/server.ts    execução local
src/config/      validação de ambiente
src/middleware/  cors, cache, erros
src/modules/     rotas por domínio
tests/           testes
data/            dataset bruto coletado do FUTBIN
```

---

## Importador FUTBIN / Parse.bot

Script de coleta que gerou `data/cards.json`. Roda **apenas local** e não faz parte do runtime da API.

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
  }
}
node .\import-futbin.mjs
```

O que faz: chama `get_players` página a página, espera 13s entre chamadas, salva cada resposta em `data/pages/`, grava checkpoint para retomar de onde parou, trata HTTP 429, remove duplicatas por `id` e gera `data/cards.json` mais `data/report.json`.

`MAX_CALLS` limita as chamadas por execução para não estourar os créditos do plano gratuito da Parse.bot.

**Estado da coleta:** 40 páginas, 1200 cartas, ratings 92–99. A coleta parou no limite de chamadas, não no fim do catálogo — retomar da página 41 traz cartas de rating menor.
