# Football Cards API

API REST de catálogo de cartas de futebol. Serviço genérico de consulta, independente das regras de qualquer jogo.

**No ar:** https://foot-deck.vercel.app/docs

| Recurso | URL |
| --- | --- |
| Swagger UI | https://foot-deck.vercel.app/docs |
| Health | https://foot-deck.vercel.app/api/v1/health |
| OpenAPI | https://foot-deck.vercel.app/api/v1/openapi.json |

Use sempre o domínio de produção acima. As URLs de branch e preview (`foot-deck-git-main-…`, `foot-deck-<hash>-…`) ficam atrás da autenticação da Vercel e devolvem 302.

Documentação de arquitetura e decisões: [`FOOTBALL_CARDS_API_ARCHITECTURE.md`](./FOOTBALL_CARDS_API_ARCHITECTURE.md).

**Estado atual: Fase 4.** Catálogo completo em memória — listagem, filtros, busca, ordenação, paginação, busca em lote e metadados. Sem banco de dados: as 1200 cartas viajam dentro do deploy.

## Endpoints

```http
GET /api/v1/health
GET /api/v1/cards
GET /api/v1/cards/{id}
GET /api/v1/cards/source/{source}/{sourceId}
GET /api/v1/leagues | /clubs | /versions | /nations | /positions
GET /api/v1/stats
```

Exemplos:

```bash
# atacantes da Premier League acima de 95, do mais caro para o mais barato
/api/v1/cards?league=Premier League&position=ST&min_rating=95&sort=reference_price&order=desc

# hidratar um inventário de uma vez só (até 100 IDs)
/api/v1/cards?ids=uuid1,uuid2,uuid3

# goleiros com boa defesa — atributos com o nome correto
/api/v1/cards?min_reflexes=90&min_diving=90

# só cartas com imagem e preço
/api/v1/cards?is_complete=true&search=ibrahimovic
```

Filtros de atributo de linha (`min_pace`, `min_shooting`, …) **excluem goleiros**, porque comparar Diving com Pace não tem significado. Use `include_goalkeepers=true` para incluí-los. A lista completa de parâmetros está em `/docs`.

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

A Vercel roda o projeto em **modo servidor**: executa `src/server.ts` (declarado em `package.json` → `main`) e injeta `PORT`. É o mesmo processo que roda localmente — não existe um segundo entrypoint para a nuvem.

Importe o repositório em [vercel.com/new](https://vercel.com/new) e todo push na `main` passa a deployar sozinho.

Variáveis a configurar no painel da Vercel:

```text
API_VERSION=v1
CORS_ORIGIN=*
```

A Vercel define `NODE_ENV=production` sozinha — não configure essa variável manualmente.

**`CORS_ORIGIN` é obrigatória em produção.** Sem ela a API falha no boot, de propósito: a Vercel já roda em modo produção, então a origem ficaria aberta por default em vez de por decisão. `*` é uma escolha legítima para um catálogo público sem credenciais; troque pela origem do jogo se quiser restringir.

Não há banco de dados, credencial ou serviço externo a provisionar — o catálogo viaja dentro do deploy. Para publicar cartas novas: rode o importador, `npm run normalize`, commite e dê push.

---

## Estrutura

```text
src/app.ts       monta o app (não escuta porta — permite testar sem rede)
src/server.ts    entrypoint: local e Vercel
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
