# Football Cards API — Arquitetura

> Versão 3 — revisada contra o dataset real (`data/cards.json`, 1200 cartas, 40 páginas coletadas em 2026-08-14)
> e fechada a decisão de hospedagem: **Hono + Vercel + Supabase**.
> As seções marcadas com **[dado real]** foram derivadas da inspeção do dataset, não de suposição.
>
> Decisões travadas até aqui: importar as 1200 cartas com flags de qualidade; tratar goleiros
> em bloco separado; adiar a coleta de ratings menores; Hono no lugar de Fastify;
> PostgreSQL como requisito; repositórios separados para API e jogo.

## 1. Visão geral

A **Football Cards API** é uma API REST genérica para consulta de cartas de futebol. Ela existe de forma independente do jogo de leilão e do futuro RPG.

```text
FONTE EXTERNA (Parse.bot / FUTBIN)
     ↓
IMPORTADOR / SYNC          (offline, fora do runtime público)
     ↓
BANCO DA API               (PostgreSQL)
     ↓
FOOTBALL CARDS API         (/api/v1)
     ↓
┌──────────────────────────────┐
│ Jogo de leilão              │
│ RPG de futebol              │
│ Catálogo                    │
│ Outros projetos acadêmicos  │
└──────────────────────────────┘
```

A API não chama Parse.bot/FUTBIN durante requisições de usuários. A fonte externa serve somente para ingestão e atualização do catálogo.

---

## 2. Objetivo do MVP

O MVP deve:

- importar o `cards.json` já coletado;
- normalizar posições, atributos, preços e imagens;
- persistir as cartas em PostgreSQL;
- disponibilizar uma API REST versionada;
- permitir listagem, busca, filtros, ordenação e paginação;
- suportar busca em lote por IDs (hidratação de inventário);
- possuir documentação OpenAPI/Swagger;
- permitir importação idempotente;
- estar preparado para sincronizações incrementais;
- permanecer independente das regras do jogo.

---

## 3. Fora do escopo

Não colocar nesta API:

- usuários do jogo;
- saldo virtual;
- inventário;
- leilões;
- lances;
- batalhas;
- XP;
- níveis;
- ranking;
- matchmaking;
- regras de RPG;
- probabilidade de packs;
- economia interna do jogo.

Esses recursos pertencem ao backend da aplicação consumidora.

---

## 4. Stack

### Backend

- Node.js 20+
- TypeScript (strict)
- **Hono** — framework HTTP
- Zod
- `@hono/zod-openapi` — o mesmo schema Zod valida a entrada e gera o OpenAPI
- Drizzle ORM
- PostgreSQL

### Ferramentas

- OpenAPI 3 / Swagger UI (`@hono/swagger-ui`)
- Vitest
- ESLint
- Prettier
- tsx

### Por que Hono e não Fastify

A documentação anterior previa Fastify. A troca acompanha a decisão de hospedar na Vercel:

- Fastify roda em serverless apenas via adaptador. Paga-se a construção da instância e o registro de todos os plugins a cada cold start, e o roteamento acontece duas vezes — a plataforma roteia até a função, o Fastify roteia de novo por dentro.
- Hono é construído sobre `Request`/`Response` do padrão fetch, que é o modelo nativo da plataforma — e o mesmo vocabulário já usado no frontend.
- `@hono/zod-openapi` entrega exatamente o que o projeto pedia: schema único que valida e documenta.
- Hono roda em Node, Vercel, Cloudflare Workers, Deno e Bun **sem reescrita**. A escolha de hospedagem deixa de ser irreversível: migrar para Workers depois mexe só na camada de banco.

Drizzle, schema, normalização e testes são idênticos nos dois casos. A troca afeta apenas a camada HTTP.

### Banco

PostgreSQL no Supabase (tier gratuito).

### Hospedagem

- API: **Vercel** (Hobby)
- Banco: **Supabase** (Free)

Ver §5 para as decisões operacionais — que é onde esse arranjo costuma falhar.

---

## 5. Hospedagem e operação

Alvo: **Vercel (Hobby) + Supabase (Free)**, sem custo, para um projeto acadêmico.

### Por que este arranjo

Render foi descartado: o tier gratuito hiberna após ~15 minutos sem tráfego e leva perto de um minuto para responder de novo. Para um projeto avaliado esporadicamente, é o pior perfil possível — o avaliador abre o link e encara uma tela branca. Railway e Fly.io não têm mais tier gratuito real. Cloudflare Workers é tecnicamente superior, mas exigiria resolver o acesso ao Postgres de fora do runtime Node; fica como destino futuro, já viabilizado pela escolha do Hono.

### Cache é a decisão de capacidade

O catálogo tem 1200 registros, é somente leitura e não muda durante a operação normal. Portanto **a CDN, não a função, deve responder à maioria das requisições**:

```http
Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800
```

Mil leitores da mesma listagem consomem uma invocação de função e uma consulta ao banco. É isso que torna o limite do tier gratuito irrelevante na prática — não a generosidade do limite, mas o fato de quase não o consumirmos.

Regras:

- respostas de `GET` de catálogo e metadados são cacheáveis;
- `/health` **não** é cacheável (`Cache-Control: no-store`), senão deixa de medir o que se propõe a medir;
- toda importação que altere dados exige invalidação ou espera do TTL. Como a ingestão é manual e rara, esperar o TTL é aceitável no MVP.

### Três armadilhas conhecidas deste arranjo

**1. Pooling de conexões.** Cada invocação serverless pode abrir uma conexão nova e o PostgreSQL tem teto de conexões. A `DATABASE_URL` da API **deve** apontar para o pooler do Supabase (Supavisor) em *transaction mode*, porta **6543** — não para a conexão direta na 5432. Em transaction mode não há prepared statements no lado do servidor: o driver precisa ser configurado de acordo. A conexão direta (5432) fica reservada aos scripts de migration e importação, que rodam na máquina do desenvolvedor e são de longa duração.

**2. Projetos Supabase gratuitos pausam após ~1 semana sem atividade.** Este é o risco concreto do calendário acadêmico: o trabalho é entregue, e semanas depois o avaliador abre o link com o banco pausado. Mitigação: um cron diário do GitHub Actions batendo em `/api/v1/health` com `no-store` mantém o projeto ativo. Despausar manualmente pelo dashboard também funciona, desde que alguém saiba que precisa fazê-lo.

**3. Região.** A região do projeto Supabase é escolhida na criação e não pode ser trocada depois sem migração. Banco e função em continentes diferentes custam 150 ms+ por ida e volta. Alinhar as duas regiões desde o início.

### Repositórios e CORS

Dois projetos Vercel independentes:

```text
football-cards-api        → api.<dominio>  ou  <projeto>.vercel.app
football-auction-game     → consumidor
```

Como o consumidor está em outra origem, `CORS_ORIGIN` precisa ser configurável por ambiente — permissivo em desenvolvimento, restrito à origem do jogo em produção. Ver §20.

### Plano B documentado

Se o Supabase se tornar um obstáculo operacional, o dataset normalizado (~2 MB) pode ser embarcado no deploy e servido da memória, eliminando banco, pooling e pausa. Não é o caminho escolhido — PostgreSQL é requisito do trabalho e é onde está o aprendizado — mas a arquitetura em camadas (repositório isolado atrás de uma interface) mantém essa saída barata.

---

## 6. Estrutura do projeto

```text
football-cards-api/
│
├── api/
│   └── index.ts              # entrypoint da Vercel: exporta o app Hono
│
├── src/
│   ├── app.ts                # monta rotas e middlewares, sem escutar porta
│   ├── server.ts             # execução local (node server)
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema/
│   │   │   ├── cards.ts
│   │   │   └── import-runs.ts
│   │   └── migrations/
│   │
│   ├── modules/
│   │   ├── cards/
│   │   │   ├── cards.routes.ts
│   │   │   ├── cards.controller.ts
│   │   │   ├── cards.service.ts
│   │   │   ├── cards.repository.ts
│   │   │   ├── cards.schemas.ts
│   │   │   ├── cards.presenter.ts
│   │   │   └── cards.types.ts
│   │   └── metadata/
│   │       ├── metadata.routes.ts
│   │       └── metadata.service.ts
│   │
│   ├── middleware/
│   │   ├── cors.ts
│   │   ├── cache.ts
│   │   └── error-handler.ts
│   │
│   ├── docs/
│   │   └── openapi.ts
│   │
│   └── normalization/
│       ├── positions.ts
│       ├── prices.ts
│       ├── attributes.ts
│       └── card.ts
│
├── scripts/
│   ├── normalize-cards.ts
│   ├── import-cards.ts
│   └── sync-cards.ts
│
├── data/
│   ├── raw/
│   └── normalized/
│
├── tests/
├── drizzle/
├── .github/workflows/keep-alive.yml   # cron anti-pausa do Supabase (§5)
├── vercel.json
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── ARCHITECTURE.md
```

Três pontos sobre essa organização:

- `src/app.ts` monta o app e **não** escuta porta. Quem escuta é `src/server.ts` (local) ou a Vercel via `api/index.ts`. Isso mantém o app testável sem rede — o Vitest importa `app` e chama `app.request('/api/v1/cards')` direto.
- `src/normalization/` é compartilhado entre os scripts de ingestão e os testes. Nenhuma regra de normalização deve viver dentro de `scripts/`.
- `scripts/` roda apenas na máquina do desenvolvedor, com a conexão direta ao banco, e nunca é empacotado no deploy.

---

## 7. Retrato do dataset atual **[dado real]**

Base para todas as decisões de modelagem abaixo.

```text
cartas coletadas            1200
duplicatas por id           0
cartas completas            935   (imagem grande + ao menos um preço)
sem image_large              65
sem card_image_large_url      0
ambos os preços "0"         220
apenas uma plataforma "0"    49
version vazia                 3   (Ícones)
ratings presentes            92 a 99  (8 valores distintos)
ligas distintas              42
clubes distintos            209
nações distintas             70
versões distintas            63
posições primárias           12
strings de posição          237
cartas de goleiro            53
nomes repetidos             234   (mesmo jogador, versões diferentes)
```

Três consequências importantes:

1. **O catálogo está incompleto e enviesado.** A coleta parou no limite de chamadas (`checkpoint.nextPage: 41`), não no fim do catálogo. Só existem cartas 92–99. Para uma economia de leilão crível será necessário retomar o importador e trazer ratings menores. A importação é idempotente, então isso pode ser feito depois sem retrabalho.
2. **`id` da fonte é confiável como chave de reconciliação** — zero colisões em 1200 registros.
3. **Nome não identifica carta.** 234 nomes se repetem. Busca por nome sempre retorna coleção.

---

## 8. Normalização de posições **[dado real]**

O campo de origem é uma string composta:

```text
"ST++LM, LW"        principal ST, alternativas LM e LW
"GK++"              principal GK, sem alternativas
"GK"                principal GK, sem o separador   (1 ocorrência)
"CAM++RM, CM, LM, +3"   principal CAM, 3 alternativas listadas, mais 3 ocultas
```

Regras do parser:

```text
1. se não houver "++", a string inteira é a posição principal
2. antes de "++"  -> position
3. depois de "++" -> separar por ","  e aparar espaços
4. token no formato "+N" NÃO é posição: é a contagem de alternativas
   truncadas pela fonte -> alt_positions_hidden = N
5. descartar tokens vazios
```

**A fonte trunca a lista em 3 posições alternativas.** 238 das 1200 cartas trazem um `+N` — ou seja, `alt_positions` é uma lista *parcial* para 20% do catálogo. Isso precisa ser explícito no contrato da API, e não silenciosamente apresentado como lista completa.

Posições primárias válidas (allowlist derivada dos dados):

```text
GK  CB  LB  RB  CDM  CM  CAM  LM  RM  LW  RW  ST
```

Qualquer valor fora dessa lista na ingestão deve ser registrado como aviso, não descartado silenciosamente.

---

## 9. Goleiros **[dado real]**

A fonte entrega os seis atributos de goleiro nos mesmos campos dos jogadores de linha, com os rótulos errados. Yashin aparece com `SHO: 89` e `DEF: 60` — números que só fazem sentido como Handling 89 e Speed 60.

Mapeamento posicional aplicado quando `position = GK`:

```text
PAC -> diving
SHO -> handling
PAS -> kicking
DRI -> reflexes
DEF -> speed
PHY -> positioning
```

Decisões:

- a coluna `is_goalkeeper` é derivada de `position = 'GK'`;
- os seis valores numéricos são armazenados nas mesmas colunas físicas (`attr_1..attr_6` semanticamente neutras seria excessivo — mantemos `pace..physical`), mas a **representação pública** troca o bloco `attributes` pelo bloco `goalkeeper` quando `is_goalkeeper = true`;
- os filtros `min_pace`, `min_shooting`, `min_passing`, `min_dribbling`, `min_defending`, `min_physical` **excluem goleiros por padrão**, porque comparar Diving com Pace não tem significado. Para incluí-los deliberadamente, `include_goalkeepers=true`;
- filtros equivalentes para goleiros: `min_diving`, `min_handling`, `min_kicking`, `min_reflexes`, `min_speed`, `min_positioning` — que por sua vez só se aplicam a goleiros.

Sem essa separação, o RPG calcularia batalhas com números sem significado e `min_defending=90` retornaria goleiros lentos.

---

## 10. Modelo de dados

### Tabela `cards`

```text
id                        UUID PK
source                    VARCHAR      NOT NULL   -- 'futbin'
source_id                 VARCHAR      NOT NULL
game                      VARCHAR      NOT NULL   -- 'FC'
season                    SMALLINT     NOT NULL   -- 26

name                      VARCHAR      NOT NULL
rating                    SMALLINT     NOT NULL
version                   VARCHAR      NULL       -- 3 Ícones vêm vazios
club                      VARCHAR      NULL
nation                    VARCHAR      NULL
league                    VARCHAR      NULL

position                  VARCHAR      NOT NULL   -- primária, allowlist de 12
alt_positions             TEXT[]       NOT NULL DEFAULT '{}'
alt_positions_hidden      SMALLINT     NOT NULL DEFAULT 0
position_raw              VARCHAR      NOT NULL   -- string original da fonte
is_goalkeeper             BOOLEAN      NOT NULL DEFAULT FALSE

pace                      SMALLINT     NULL       -- diving,      se GK
shooting                  SMALLINT     NULL       -- handling,    se GK
passing                   SMALLINT     NULL       -- kicking,     se GK
dribbling                 SMALLINT     NULL       -- reflexes,    se GK
defending                 SMALLINT     NULL       -- speed,       se GK
physical                  SMALLINT     NULL       -- positioning, se GK

player_image_url          TEXT NULL               -- image_large
player_image_small_url    TEXT NULL               -- image (64px)
card_image_url            TEXT NULL               -- card_image_large_url
card_image_small_url      TEXT NULL               -- card_image_url (64px)

price_ps                  INTEGER NULL
price_pc                  INTEGER NULL
price_ps_raw              VARCHAR NULL            -- "2.03M", auditoria
price_pc_raw              VARCHAR NULL
reference_price           INTEGER NULL
prices_updated_at         TIMESTAMPTZ NULL

has_player_image          BOOLEAN NOT NULL DEFAULT FALSE
has_price                 BOOLEAN NOT NULL DEFAULT FALSE
is_complete               BOOLEAN NOT NULL DEFAULT FALSE
is_tradeable              BOOLEAN NOT NULL DEFAULT FALSE

source_url                TEXT NULL
raw                       JSONB NOT NULL          -- payload original íntegro
is_active                 BOOLEAN NOT NULL DEFAULT TRUE

created_at                TIMESTAMPTZ NOT NULL
updated_at                TIMESTAMPTZ NOT NULL
```

Restrição única:

```text
UNIQUE(source, source_id)
```

Índices:

```text
(source, source_id)          -- único, usado pelo UPSERT
rating
position
version
club
nation
league
reference_price
is_complete
GIN (alt_positions)          -- filtro plays_as
GIN (search_vector)          -- ver §17
```

Campos derivados — calculados na normalização, nunca enviados pelo cliente:

```text
is_goalkeeper     = position == 'GK'
has_player_image  = player_image_url != null
has_price         = price_ps != null OR price_pc != null
is_tradeable      = has_price
is_complete       = has_player_image AND card_image_url != null AND has_price
game / season     = extraídos de source_url  ("/26/" -> FC, 26)
```

A coluna `raw` preserva o objeto original. Isso permite recalcular qualquer normalização depois — inclusive corrigir o mapeamento de goleiros — sem nova coleta.

### Tabela `import_runs`

```text
id                UUID PK
source            VARCHAR
started_at        TIMESTAMPTZ
finished_at       TIMESTAMPTZ NULL
status            VARCHAR       -- running | success | failed
records_received  INTEGER
records_inserted  INTEGER
records_updated   INTEGER
records_skipped   INTEGER
error_message     TEXT NULL
```

---

## 11. Identificadores

O ID da fonte não é a chave primária interna.

```json
{
  "id": "uuid-interna",
  "source": "futbin",
  "source_id": "26230"
}
```

Isso permite trocar/adicionar fontes sem quebrar o contrato da API.

---

## 12. Imagens

No MVP, apenas URLs. Quatro variantes, todas presentes na fonte:

```text
image_large            -> player_image_url          (alta resolução)
image                  -> player_image_small_url    (64px, assinada)
card_image_large_url   -> card_image_url            (HD)
card_image_url         -> card_image_small_url      (64px, assinada)
```

As variantes pequenas carregam querystring assinada (`?s=...`) e podem expirar. As grandes são URLs limpas de CDN. Preferir as grandes como canônicas; as pequenas servem a grids de catálogo e reduzem payload de listagem.

**65 cartas não têm `player_image_url`**, incluindo Ícones importantes (Maradona, Pelé, Zidane). Nenhuma carta ficou sem `card_image_url`. Como a decisão foi importar todas as 1200, essas cartas entram com `has_player_image = false` e o consumidor decide o fallback — a arte da carta sempre existe.

O dataset bruto é preservado mesmo para registros incompletos.

---

## 13. Preços **[dado real]**

Formatos observados na fonte: `"0"`, `"455K"`, `"69.5K"`, `"2.03M"`. Nenhum outro formato ocorre nas 2400 leituras de preço.

Conversão:

```text
"1.2M"   -> 1200000
"29.5K"  ->   29500
"930K"   ->  930000
"0"      -> null
""       -> null
```

O parser deve rejeitar (com erro de ingestão, não silenciosamente) qualquer string fora de `^\d+(\.\d+)?[KM]?$`.

Preço de referência:

```text
PS e PC existem   -> reference_price = média dos dois
apenas um existe  -> reference_price = o valor existente
nenhum existe     -> reference_price = null
```

Atenção: **49 cartas têm exatamente uma plataforma zerada**. A regra acima já as trata corretamente, mas elas não devem ser confundidas com as 220 sem preço algum — só as segundas são realmente não-negociáveis.

`price_ps_raw` / `price_pc_raw` guardam a string original porque `"2.03M"` já é um arredondamento da fonte; o inteiro derivado não é o preço exato de mercado. `prices_updated_at` existe porque preço é o único campo volátil do dataset: o sync incremental precisa distinguir "carta mudou" de "só o preço mudou".

O preço de referência não é o valor econômico interno do jogo. O jogo define sua própria economia.

---

## 14. Endpoints v1

Prefixo: `/api/v1`

### Health

```http
GET /api/v1/health
```

### Listar cartas

```http
GET /api/v1/cards
```

Parâmetros:

```text
paginação    page, limit
busca        search
identidade   ids, source, game, season
atributos    min_rating, max_rating
posição      position, plays_as, include_goalkeepers
catálogo     version, club, nation, league
linha        min_pace, min_shooting, min_passing,
             min_dribbling, min_defending, min_physical
goleiro      min_diving, min_handling, min_kicking,
             min_reflexes, min_speed, min_positioning
preço        min_price, max_price
qualidade    is_complete, has_image, is_tradeable
ordenação    sort, order
```

Todos os filtros de valores múltiplos aceitam lista separada por vírgula:

```http
GET /api/v1/cards?position=ST,CAM&league=Premier League&min_rating=95
```

### Busca em lote por ID

```http
GET /api/v1/cards?ids=uuid1,uuid2,uuid3
```

Máximo de 100 IDs por requisição. Este é o endpoint que o jogo de leilão mais usará: hidratar um inventário de 10 cartas sem 10 requisições. IDs inexistentes são simplesmente omitidos da resposta — não geram 404.

### Carta por ID interno

```http
GET /api/v1/cards/:id
```

### Carta por ID da fonte

```http
GET /api/v1/cards/source/:source/:sourceId
```

### Metadados

```http
GET /api/v1/leagues
GET /api/v1/clubs
GET /api/v1/versions
GET /api/v1/nations
GET /api/v1/positions
```

Cada um retorna valores distintos com contagem, permitindo montar filtros na UI sem hardcode:

```json
{ "data": [{ "value": "Premier League", "count": 243 }] }
```

### Estatísticas do catálogo

```http
GET /api/v1/stats
```

Totais, faixa de ratings, contagem de completas. Útil para a defesa acadêmica e para monitorar a ingestão.

---

## 15. Estrutura de resposta

Coleção:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 935, "total_pages": 47 }
}
```

Registro:

```json
{ "data": { "id": "uuid", "name": "Kylian Mbappé", "rating": 98 } }
```

Erro:

```json
{ "error": { "code": "CARD_NOT_FOUND", "message": "Card not found" } }
```

Códigos de erro previstos:

```text
VALIDATION_ERROR      400
CARD_NOT_FOUND        404
TOO_MANY_IDS          400
INTERNAL_ERROR        500
```

---

## 16. Representação pública

Jogador de linha:

```json
{
  "id": "uuid",
  "source": "futbin",
  "source_id": "26230",
  "game": "FC",
  "season": 26,
  "name": "Kylian Mbappé",
  "rating": 98,
  "version": "Summer Stars",
  "club": "Real Madrid",
  "nation": "France",
  "league": "LALIGA EA SPORTS",
  "position": "ST",
  "alt_positions": ["LM", "LW"],
  "alt_positions_hidden": 0,
  "is_goalkeeper": false,
  "attributes": {
    "pace": 99, "shooting": 98, "passing": 91,
    "dribbling": 99, "defending": 60, "physical": 84
  },
  "images": {
    "player": "https://...",
    "player_small": "https://...",
    "card": "https://...",
    "card_small": "https://..."
  },
  "prices": {
    "playstation": 2150000,
    "pc": 2650000,
    "reference": 2400000,
    "updated_at": "2026-08-14T13:32:50.916Z"
  },
  "flags": {
    "is_complete": true,
    "has_player_image": true,
    "is_tradeable": true
  },
  "source_url": "https://www.futbin.com/26/player/26230/kylian-mbappe"
}
```

Goleiro — mesmo formato, com `goalkeeper` no lugar de `attributes`:

```json
{
  "position": "GK",
  "is_goalkeeper": true,
  "goalkeeper": {
    "diving": 93, "handling": 89, "kicking": 75,
    "reflexes": 94, "speed": 60, "positioning": 93
  }
}
```

Carta incompleta — nada é omitido, os campos vêm nulos e as flags explicam:

```json
{
  "name": "Maradona",
  "images": { "player": null, "card": "https://..." },
  "prices": { "playstation": null, "pc": null, "reference": null },
  "flags": { "is_complete": false, "has_player_image": false, "is_tradeable": false }
}
```

A representação pública não precisa espelhar as colunas do banco. A conversão vive em `cards.presenter.ts` e é testada isoladamente.

---

## 17. Paginação, ordenação e busca

### Paginação

```text
page  >= 1
limit padrão = 20
limit máximo = 100
```

Cursor pagination pode ser introduzida depois.

### Ordenação

```text
sort=rating&order=desc
```

Allowlist — nunca aceitar nome arbitrário de coluna vindo do cliente:

```text
rating  name  reference_price  pace  shooting  passing
dribbling  defending  physical  created_at
```

Ordenar por `reference_price` deve usar `NULLS LAST` em ambas as direções: 220 cartas sem preço não podem ocupar a primeira página de "mais caras". A ordenação também precisa de desempate estável (`, id ASC`), senão a paginação repete registros.

### Busca

```text
search=ronaldo
```

MVP: `ILIKE` sobre `name`, `club` e `version`. A busca deve ser insensível a acentos — o dataset tem `Ibrahimović`, `Nazário`, `Süper Lig`. Usar `unaccent` do PostgreSQL desde o início; deixar para depois custa uma migration e retrabalho no índice.

Evolução: coluna `search_vector` com `tsvector` e índice GIN.

---

## 18. Ingestão

Pipeline, separado da API pública:

```text
data/raw/cards.json
    ↓  normalize-cards.ts     (puro, sem banco, sem rede)
data/normalized/cards.json
    ↓  import-cards.ts        (UPSERT)
PostgreSQL
```

`normalize-cards.ts` não faz rede nem banco: recebe JSON, devolve JSON. Isso o torna testável e permite validar a normalização de 1200 cartas sem subir infraestrutura.

### Idempotência

Chave de reconciliação:

```text
source + source_id
```

```text
não existe -> INSERT
já existe  -> UPDATE
```

Via `INSERT ... ON CONFLICT (source, source_id) DO UPDATE`. Rodar o mesmo arquivo duas vezes não pode criar duplicatas — e é um teste automatizado, não uma promessa.

`created_at` nunca é sobrescrito no UPDATE.

### Atualização incremental

```text
Parse.bot -> sync-cards.ts -> normalização -> UPSERT -> import_runs
```

O sincronizador deve:

1. buscar novas páginas a partir do checkpoint;
2. normalizar;
3. reconciliar por `source_id`;
4. inserir novas cartas;
5. atualizar existentes;
6. registrar a execução em `import_runs`.

A API continua disponível mesmo com a fonte externa fora do ar.

### Dados brutos

```text
data/
└── raw/
    ├── 2026-08-14/
    │   ├── page-0001.json … page-0040.json
    │   └── cards.json
    └── ...
```

O normalizador nunca altera arquivos brutos. Coletas futuras vão para uma nova pasta datada.

---

## 19. Segurança

- `.env` fora do Git;
- validação Zod de todos os parâmetros de entrada;
- queries parametrizadas via ORM;
- `limit` máximo aplicado no servidor, não confiando no cliente;
- teto de 100 IDs no filtro `ids`;
- allowlist de ordenação;
- CORS definido explicitamente em produção, nunca herdado de um default (§20);
- tratamento uniforme de erros, sem vazar stack trace em produção;
- endpoints administrativos separados;
- `PARSE_API_KEY` fora do runtime público — o servidor da API não a conhece;
- `DIRECT_DATABASE_URL` fora do runtime público — só existe na máquina do desenvolvedor;
- a chave `service_role` do Supabase nunca sai do ambiente local. A API acessa o banco por conexão Postgres com um usuário próprio, não pela API do Supabase.

---

## 20. Variáveis de ambiente

```env
NODE_ENV=development
PORT=3000

# Runtime da API — pooler Supavisor, transaction mode, porta 6543
DATABASE_URL=postgresql://...@...pooler.supabase.com:6543/postgres

# Migrations e importação — conexão direta, porta 5432, apenas local
DIRECT_DATABASE_URL=postgresql://...@db....supabase.co:5432/postgres

API_VERSION=v1
CORS_ORIGIN=*

DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
MAX_IDS_PER_REQUEST=100

CACHE_MAX_AGE=86400
```

As duas URLs de banco são intencionais e não intercambiáveis (§5): a API usa o pooler, os scripts usam a conexão direta. `DIRECT_DATABASE_URL` nunca é configurada na Vercel.

`env.ts` valida com Zod e falha no boot se algo estiver ausente ou inválido.

Sobre `CORS_ORIGIN`: em produção ela precisa ser definida **explicitamente**, e `*` é um valor válido. A primeira versão desta documentação recusava `*` em produção; a regra foi revista porque estava errada em mérito. CORS protege credenciais do usuário contra leitura cross-origin, e este catálogo é público, somente leitura e sem autenticação — não há credencial a proteger. Restringir origem aqui é atrito sem ganho.

O que a regra preserva é o essencial: como a Vercel define `NODE_ENV=production` automaticamente, sem essa checagem a origem ficaria aberta por herdar um default, não por decisão de quem publicou.

---

## 21. Testes mínimos

### Unitários (normalização)

- `"2.03M"` → `2030000`; `"69.5K"` → `69500`; `"0"` → `null`; string inválida → erro;
- `reference_price` nos três cenários, incluindo o de uma só plataforma;
- parser de posição: `"ST++LM, LW"`, `"GK++"`, `"GK"`, `"CAM++RM, CM, LM, +3"`;
- remapeamento de atributos de goleiro;
- derivação de `game`/`season` a partir da URL;
- derivação de `is_complete`, `has_price`, `is_tradeable`;
- normalização das 1200 cartas reais sem lançar exceção (teste de regressão contra o dataset).

### Integração

- `GET /health`;
- `GET /cards` — listagem, busca, filtros, paginação;
- ordenação por preço com `NULLS LAST`;
- busca acentuada (`ibrahimovic` encontra `Ibrahimović`);
- `?ids=` com IDs válidos e inválidos misturados;
- `min_pace` não retorna goleiros;
- `GET /cards/:id` e carta inexistente → 404;
- parâmetros inválidos → 400;
- importação rodada duas vezes → mesma contagem de registros.

---

## 22. Fases de implementação

### Fase 1 — Fundação
Node + TypeScript strict, Hono, Zod, `env.ts`, `/health`, Swagger, tratamento global de erros, CORS, ESLint, Prettier, Vitest. Sem banco.

### Fase 2 — Normalização
`src/normalization/` completo, com testes unitários rodando contra o dataset real. **Sem banco ainda.** Saída: `data/normalized/cards.json` validado.

### Fase 3 — Banco
Schema `cards` e `import_runs`, migrations, índices, `import-cards.ts` idempotente.

### Fase 4 — Catálogo
Listagem, detalhe, busca, filtros, paginação, ordenação, busca em lote por IDs.

### Fase 5 — Metadados
Ligas, clubes, versões, nações, posições, stats.

### Fase 6 — Qualidade
Testes de integração, logs, OpenAPI revisada, README.

### Fase 7 — Deploy acadêmico
Projeto Supabase (região definida agora, é irreversível), deploy na Vercel, variáveis de ambiente, migrations de produção via conexão direta, importação inicial, headers de cache, cron anti-pausa.

### Fase 8 — Futuro
Retomar a coleta a partir da página 41 para trazer ratings menores. API Key, rate limit, métricas.

Duas ordenações deliberadas:

- **Normalização antes do banco (Fase 2)**: é onde estão todas as armadilhas do dataset, e pode ser validada sem infraestrutura alguma.
- **Fundação sem banco (Fase 1)**: um `/health` no ar prova o pipeline Vercel inteiro — build, rota, ambiente — antes de somar a variável "conexão com Postgres" à investigação. Vale fazer o primeiro deploy já na Fase 1, e não só na Fase 7. Descobrir um problema de plataforma com um projeto de dois arquivos é muito mais barato do que descobri-lo com o projeto pronto.

---

## 23. Versionamento e OpenAPI

Começar em `/api/v1`. Publicar:

```text
/docs
/openapi.json
```

Com `@hono/zod-openapi`, os mesmos schemas Zod que validam a entrada geram a documentação — não há um segundo documento para manter em sincronia. `@hono/swagger-ui` serve a interface em `/docs`.

---

## 24. Relação com o jogo de leilão

A API fornece catálogo:

```http
GET /api/v1/cards
GET /api/v1/cards/:id
GET /api/v1/cards?ids=...
```

O backend do jogo decide saldo inicial, quais cartas o usuário recebe, probabilidades, inventário, leilões, lances e transferências.

Não criar `GET /cards/random-starter-pack` nesta API. O jogo sorteia; o catálogo apenas informa.

Se o jogo precisar de amostragem sem carregar o catálogo inteiro, a extensão genérica aceitável é `sort=random&seed=<int>` — determinística e reprodutível, sem nenhuma regra de pack embutida.

---

## 25. Relação com o futuro RPG

O RPG poderá usar `rating`, `position`, `alt_positions` e os seis atributos (na versão correta para goleiros, conforme §9).

Conceitos como `attack_power`, `damage`, `energy`, `XP`, `level`, `cooldown` e `skills` pertencem ao jogo, não ao catálogo.

---

## 26. Temporadas futuras

`game` e `season` existem desde o início e são derivados da URL da fonte, não fixados em código. FC 26, FC 27 etc. coexistem na mesma tabela; `season` é filtro de primeira classe.

---

## 27. Dados de origem e publicação

O dataset vem de uma integração não oficial associada ao FUTBIN.

Antes de tornar a API pública, revisar os termos aplicáveis e os direitos de redistribuição sobre dados, imagens de jogadores, artes das cartas, logos e marcas.

Disponibilidade técnica não equivale a autorização de redistribuição. Enquanto isso, o projeto é acadêmico/experimental.

Nota prática: as URLs de imagem apontam para o CDN da FUTBIN. A API redistribui *links*, não arquivos. Hospedar cópias das imagens seria uma decisão diferente, com implicações diferentes.

---

## 28. Separação de repositórios

Dois repositórios e dois projetos Vercel independentes:

```text
football-cards-api        → catálogo, este documento
football-auction-game     → consumidor
```

Deploys independentes: publicar o jogo não redeploya a API, e vice-versa. O custo é o CORS (§5) e o fato de o jogo acessar o catálogo pela rede em vez de importá-lo — o que é exatamente o comportamento que se quer exercitar num trabalho sobre APIs.

O RPG entra depois como terceiro consumidor, sem mudança estrutural na API.

---

## 29. Critérios de aceite do MVP

- [ ] PostgreSQL criado e migrations reproduzem o schema do zero
- [ ] normalização das 1200 cartas sem exceções, com testes
- [ ] parser de posição cobre os 4 formatos observados
- [ ] atributos de goleiro remapeados
- [ ] preços convertidos e `reference_price` correto nos 3 cenários
- [ ] 1200 cartas importadas, 935 marcadas `is_complete`
- [ ] importação idempotente, verificada por teste
- [ ] `/api/v1/health` funcionando
- [ ] `/api/v1/cards` com busca, filtros, paginação e ordenação
- [ ] `/api/v1/cards?ids=` funcionando
- [ ] `/api/v1/cards/:id` funcionando, 404 para inexistente
- [ ] busca insensível a acento
- [ ] endpoints de metadados funcionando
- [ ] Swagger publicado em `/docs`
- [ ] testes unitários e de integração passando
- [ ] deploy na Vercel funcionando, apontando para o Supabase via pooler (6543)
- [ ] headers de cache verificados em produção (`x-vercel-cache: HIT` na segunda requisição)
- [ ] CORS_ORIGIN definida explicitamente no ambiente de produção
- [ ] cron anti-pausa do Supabase ativo

---

## 30. Decisão arquitetural central

A Football Cards API é:

> **um serviço de catálogo de cartas de futebol**

e não:

> **o backend do jogo de leilão/RPG**.

Essa separação permite reutilizar, evoluir e eventualmente publicar a API sem acoplá-la às regras de um único jogo.
