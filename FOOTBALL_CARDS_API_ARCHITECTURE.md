# Football Cards API — Arquitetura

> Versão 4 — revisada contra o dataset real (`data/cards.json`, 1200 cartas, 40 páginas coletadas em 2026-08-14).
> Stack fechada: **Hono + Vercel, sem banco de dados**.
> As seções marcadas com **[dado real]** ou **[verificado em produção]** foram derivadas de medição, não de suposição.
>
> Decisões travadas até aqui: importar as 1200 cartas com flags de qualidade; tratar goleiros
> em bloco separado; adiar a coleta de ratings menores; Hono no lugar de Fastify;
> repositórios separados para API e jogo; **catálogo em memória, carregado do deploy** (§5).

## 1. Visão geral

A **Football Cards API** é uma API REST genérica para consulta de cartas de futebol. Ela existe de forma independente do jogo de leilão e do futuro RPG.

```text
FONTE EXTERNA (Parse.bot / FUTBIN)
     ↓
IMPORTADOR + NORMALIZAÇÃO  (offline, na máquina do desenvolvedor)
     ↓
CATÁLOGO VERSIONADO        (data/normalized/cards.json, no Git)
     ↓
FOOTBALL CARDS API         (/api/v1, catálogo em memória)
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
- carregar e indexar o catálogo na inicialização;
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

Sem ORM e sem banco: o catálogo é carregado do JSON normalizado e servido de memória (§5).

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
- Hono roda em Node, Vercel, Cloudflare Workers, Deno e Bun **sem reescrita**. Sem banco, essa portabilidade fica total: migrar para Workers não exigiria mudança alguma na camada de dados.

Normalização e testes seriam idênticos com qualquer framework. A escolha afeta apenas a camada HTTP.

### Hospedagem

**Vercel** (Hobby). Nenhum outro serviço. Ver §5.

---

## 5. Hospedagem e operação

Alvo: **Vercel (Hobby)**, sem custo, para um projeto acadêmico. **Sem banco de dados.**

### Por que este arranjo

Render foi descartado: o tier gratuito hiberna após ~15 minutos sem tráfego e leva perto de um minuto para responder de novo. Para um projeto avaliado esporadicamente, é o pior perfil possível — o avaliador abre o link e encara uma tela branca. Railway e Fly.io não têm mais tier gratuito real. Cloudflare Workers é tecnicamente superior e continua viável como destino futuro, já que o Hono roda lá sem reescrita.

### Decisão: o catálogo vive no deploy, não em um banco

A documentação previa PostgreSQL no Supabase. Revisto após dimensionar o problema real:

```text
tamanho máximo previsto      ~6000 cartas
volatilidade                 estático; cartas novas entram aos poucos
origem das mudanças          execução manual do importador
```

Um catálogo desse tamanho normalizado ocupa cerca de 8 MB de JSON, algo em torno de 25 MB de heap — contra 1 GB disponível na função. Filtrar e ordenar 6000 objetos em memória custa menos de um milissegundo, contra 20–50 ms de ida e volta até um Postgres em outra região.

Não é só mais simples: é mais rápido e tem menos modos de falha. Some-se o que deixa de existir — pooling de conexões, pausa do projeto por inatividade, latência entre regiões, limite de conexões, migrations em produção, uma credencial a proteger.

O critério que justificaria um banco é **dado que muda independentemente do deploy**. Não é o caso: aqui o dado só muda quando alguém roda o importador e publica. Dado que acompanha o deploy pertence ao deploy.

Consequências assumidas:

- atualizar o catálogo exige um novo deploy — que é justamente como a atualização já aconteceria;
- filtros, busca e ordenação são implementados em código, não em SQL;
- não há escrita em runtime. A API é estritamente somente leitura, o que é o contrato desejado (§3).

O PostgreSQL segue na aplicação consumidora, onde há estado real de usuário — saldo, inventário, leilões. Este catálogo continua genérico e sem estado.

### Se um dia precisar de banco

A camada de dados fica atrás de uma interface de repositório. Trocar a implementação em memória por uma sobre Postgres não toca rotas, schemas nem apresentação — o registro normalizado (§10) já tem exatamente a forma de uma linha de tabela, propositalmente. O gatilho seria o catálogo crescer uma ordem de grandeza, ou passar a mudar sem deploy.

### Cache é a decisão de capacidade

O catálogo tem 1200 registros, é somente leitura e não muda durante a operação normal. Portanto **a CDN, não a função, deve responder à maioria das requisições**:

```http
Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800
```

Mil leitores da mesma listagem consomem uma única invocação de função. É isso que torna o limite do tier gratuito irrelevante na prática — não a generosidade do limite, mas o fato de quase não o consumirmos.

Regras:

- respostas de `GET` de catálogo e metadados são cacheáveis;
- `/health` **não** é cacheável (`Cache-Control: no-store`), senão deixa de medir o que se propõe a medir;
- publicar um catálogo atualizado exige invalidar o cache ou esperar o TTL. Como cada atualização é um deploy novo, e um deploy novo troca o conteúdo servido, isso se resolve sozinho.

### Carga do catálogo

O JSON normalizado é importado estaticamente pelo módulo de dados, com atributo de tipo:

```ts
import payload from '../../data/normalized/cards.json' with { type: 'json' };
```

O import estático é deliberado: sendo analisável em tempo de build, o bundler da Vercel não tem como deixar o arquivo de fora. Ler o mesmo arquivo com `fs` em caminho montado em runtime funcionaria localmente e poderia falhar no deploy, que é a pior categoria de bug.

A carga e a indexação acontecem uma vez, na inicialização do módulo. Como o processo atende várias requisições (§6), esse custo é amortizado — não se paga por requisição.

### O processo é efêmero **[verificado em produção]**

Observado ao acompanhar `uptime_seconds` do `/health`: o processo é reciclado após um período ocioso. Nada guardado em memória sobrevive entre instâncias.

Isso não afeta o catálogo, que é reconstruído a partir do JSON a cada inicialização e é imutável. Mas é a razão de a API não guardar nenhum estado de escrita: contador, cache em variável ou sessão simplesmente desapareceriam.

### Proteção de deployment **[verificado em produção]**

Por padrão a Vercel protege as URLs de branch e preview com autenticação: elas devolvem 302 para o SSO. Apenas o alias de produção é público.

```text
foot-deck.vercel.app                  público
foot-deck-git-<branch>-<org>...       exige login Vercel
foot-deck-<hash>-<org>...             exige login Vercel
```

Manter previews protegidos é desejável. A consequência a não esquecer: qualquer consumidor externo — o jogo, o avaliador do trabalho, qualquer monitoramento — precisa apontar para o domínio de produção.

### Repositórios e CORS

Dois projetos Vercel independentes:

```text
football-cards-api        → api.<dominio>  ou  <projeto>.vercel.app
football-auction-game     → consumidor
```

Como o consumidor está em outra origem, `CORS_ORIGIN` precisa ser configurável por ambiente — permissivo em desenvolvimento, restrito à origem do jogo em produção. Ver §20.

Este era o "plano B" da versão anterior deste documento, quando o alvo ainda era Supabase. Virou o plano A ao dimensionar o problema real — ver a decisão acima.

---

## 6. Estrutura do projeto

```text
football-cards-api/
│
├── src/
│   ├── app.ts                # monta rotas e middlewares, sem escutar porta
│   ├── server.ts             # entrypoint único: local e Vercel
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── catalog/              # camada de dados
│   │   ├── index.ts          # carga do JSON e instância única
│   │   ├── repository.ts     # consultas em memória
│   │   ├── identity.ts       # UUID v5 determinístico
│   │   ├── text.ts           # normalização para busca
│   │   └── types.ts          # CardRepository, CardQuery
│   │
│   ├── normalization/        # bruto -> registro normalizado
│   │   ├── positions.ts
│   │   ├── prices.ts
│   │   ├── attributes.ts
│   │   ├── card.ts
│   │   └── types.ts
│   │
│   ├── modules/
│   │   ├── health/
│   │   │   └── health.routes.ts
│   │   ├── cards/
│   │   │   ├── cards.routes.ts
│   │   │   ├── cards.schemas.ts
│   │   │   └── cards.presenter.ts
│   │   └── metadata/
│   │       └── metadata.routes.ts
│   │
│   ├── middleware/
│   │   ├── cache.ts
│   │   └── error-handler.ts
│   │
│   └── errors.ts
│
├── scripts/
│   └── normalize-cards.ts
│
├── data/
│   ├── cards.json            # bruto, preservado
│   ├── pages/                # respostas cruas da coleta
│   └── normalized/           # artefato servido pela API
│
├── tests/
├── vercel.json
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── ARCHITECTURE.md
```

Três pontos sobre essa organização:

- `src/app.ts` monta o app e **não** escuta porta. Quem escuta é `src/server.ts`, declarado em `package.json` → `main`. Isso mantém o app testável sem rede — o Vitest importa `app` e chama `app.request('/api/v1/cards')` direto.
- **Entrypoint único.** A Vercel executa o mesmo `src/server.ts` do desenvolvimento local, injetando `PORT` (modo servidor). Não existe um segundo entrypoint para a nuvem, então não há como os dois ambientes divergirem. Além disso, um processo que atende várias requisições amortiza a carga e a indexação do catálogo, que acontecem uma única vez na inicialização.
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

Busca por substring em `name`, `club` e `version`, combinados num índice único calculado na carga.

A busca é **insensível a acento e caixa** — o dataset tem `Ibrahimović`, `Nazário`, `Süper Lig`, e quase ninguém digita esses caracteres. Nome, clube e versão são normalizados uma vez (NFD, remoção de diacríticos, minúsculas) e guardados em `search_text`; o termo buscado passa pela mesma função. Comparar formas já normalizadas dispensa qualquer processamento por requisição.

Evolução: coluna `search_vector` com `tsvector` e índice GIN.

---

## 18. Ingestão

Pipeline, separado da API pública:

```text
Parse.bot (import-futbin.mjs)     manual, com créditos limitados
    ↓
data/cards.json                   bruto, preservado
    ↓  normalize-cards.ts         puro: sem banco, sem rede
data/normalized/cards.json        versionado no Git
    ↓  git push
deploy                            os dados sobem junto com o código
```

`normalize-cards.ts` não faz rede nem banco: recebe JSON, devolve JSON. É testável e permite validar as 1200 cartas sem infraestrutura alguma.

O artefato normalizado é **versionado no Git**, e isso é deliberado: cada deploy carrega exatamente o catálogo que foi testado, e `git log` sobre o arquivo vira o histórico de mudanças do catálogo. Não há migration a rodar nem estado a reconciliar.

### Idempotência

A chave de reconciliação continua sendo `source + source_id`, aplicada durante a normalização: o último registro de um mesmo par vence, e rodar a normalização duas vezes produz o mesmo arquivo.

Com o catálogo materializado em arquivo, a idempotência é uma propriedade verificável por inspeção — o resultado é um artefato, não o estado acumulado de um banco.

### Acrescentar cartas

O caso previsto é crescimento incremental, não sincronização contínua:

1. retomar `import-futbin.mjs` a partir do checkpoint;
2. rodar `npm run normalize`;
3. conferir o relatório — contagens, falhas, avisos;
4. rodar os testes, que travam as contagens conhecidas;
5. commitar e publicar.

O passo 4 é a rede de proteção: se a fonte mudar de formato, o teste de regressão falha antes do deploy, não depois.

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
- a API não tem credencial alguma em runtime: não há banco, nem serviço externo, nem chave a vazar. A superfície de ataque se reduz a entrada malformada, e toda entrada passa por Zod.

---

## 20. Variáveis de ambiente

```env
NODE_ENV=development
PORT=3000

API_VERSION=v1
CORS_ORIGIN=*

DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
MAX_IDS_PER_REQUEST=100

CACHE_MAX_AGE=86400
```

Não há `DATABASE_URL`, nem credencial de banco, nem segredo de qualquer espécie no runtime da API (§5). A única variável obrigatória em produção é `CORS_ORIGIN`.

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

### Fase 3 — Camada de dados
Carga do catálogo, índices em memória, repositório atrás de interface, consultas com filtros, ordenação, busca e paginação. Sem HTTP.

### Fase 4 — Catálogo
Rotas de listagem, detalhe, busca em lote por IDs, com schemas Zod e apresentação pública.

### Fase 5 — Metadados
Ligas, clubes, versões, nações, posições, stats.

### Fase 6 — Qualidade
Testes de integração, logs, OpenAPI revisada, README.

### Fase 7 — Futuro
Retomar a coleta a partir da página 41 para trazer ratings menores. API Key, rate limit, métricas.

O deploy deixou de ser uma fase: acontece a cada push desde a Fase 1, e sem banco não há infraestrutura a provisionar.

Duas ordenações deliberadas:

- **Normalização antes de qualquer consulta (Fase 2)**: é onde estão todas as armadilhas do dataset, e pode ser validada sem infraestrutura alguma. Quando as consultas forem escritas, os dados já são confiáveis.
- **Deploy na Fase 1, não no fim**: um `/health` no ar provou o pipeline inteiro — build, rota, ambiente — com um projeto de dois arquivos. Descobrir ali que a Vercel mudou o modelo de entrypoint custou minutos; descobrir o mesmo com o projeto pronto teria custado uma tarde de investigação com muitas variáveis simultâneas.

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

- [x] `/api/v1/health` funcionando
- [x] Swagger publicado em `/docs`
- [x] deploy na Vercel funcionando, com redeploy automático a cada push
- [x] `CORS_ORIGIN` definida explicitamente no ambiente de produção
- [x] normalização das 1200 cartas sem exceções, com testes
- [x] parser de posição cobre os 4 formatos observados
- [x] atributos de goleiro remapeados
- [x] preços convertidos e `reference_price` correto nos 3 cenários
- [x] 1200 cartas normalizadas, 935 marcadas `is_complete`
- [x] normalização idempotente, verificada por teste
- [x] catálogo carregado e indexado na inicialização
- [x] `/api/v1/cards` com busca, filtros, paginação e ordenação
- [x] `/api/v1/cards?ids=` funcionando
- [x] `/api/v1/cards/:id` funcionando, 404 para inexistente
- [x] busca insensível a acento
- [x] endpoints de metadados funcionando
- [x] testes de integração passando
- [ ] headers de cache verificados em produção (`x-vercel-cache: HIT` na segunda requisição)

---

## 30. Decisão arquitetural central

A Football Cards API é:

> **um serviço de catálogo de cartas de futebol**

e não:

> **o backend do jogo de leilão/RPG**.

Essa separação permite reutilizar, evoluir e eventualmente publicar a API sem acoplá-la às regras de um único jogo.
