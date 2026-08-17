/**
 * A página do manual, servida em GET /manual.
 *
 * É uma string e não um arquivo lido com `fs` pela mesma razão que o
 * catálogo é um import estático (catalog/index.ts): ler do disco em runtime
 * funciona local e pode falhar no deploy. Sendo módulo, ou compila ou não
 * existe — nunca "existe e não acha o arquivo".
 *
 * Não use backtick nem \${ no conteúdo: a página vive dentro de uma
 * template literal. Se precisar mostrar código com backtick, escreve a
 * entidade HTML `&#96;`.
 */
export const manualPage = `<style>
  :root {
    --paper: #F1F2ED;
    --surface: #FBFBF9;
    --surface-2: #E7EAE3;
    --ink: #151B18;
    --muted: #5B6560;
    --line: #D4D9D0;
    --line-soft: #E2E6DD;
    --pitch: #10664A;
    --pitch-soft: #E0EDE6;
    --gold: #9A6C1C;
    --gold-soft: #F2E9D6;
    --danger: #9C3226;

    --display: "Bahnschrift SemiCondensed", "DIN Alternate", "Oswald", "Arial Narrow", "Liberation Sans Narrow", system-ui, sans-serif;
    --body: "Segoe UI Variable Text", "Segoe UI", -apple-system, system-ui, "Helvetica Neue", sans-serif;
    --mono: "Cascadia Mono", "JetBrains Mono", "SF Mono", Consolas, "Liberation Mono", ui-monospace, monospace;

    --wrap: 1180px;
    --col: 70ch;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --paper: #0F1411;
      --surface: #161C18;
      --surface-2: #1D251F;
      --ink: #E7EBE4;
      --muted: #929E97;
      --line: #29322C;
      --line-soft: #212a24;
      --pitch: #55C08C;
      --pitch-soft: #16281f;
      --gold: #D3A244;
      --gold-soft: #2A2313;
      --danger: #E27A6A;
    }
  }

  :root[data-theme="dark"] {
    --paper: #0F1411;
    --surface: #161C18;
    --surface-2: #1D251F;
    --ink: #E7EBE4;
    --muted: #929E97;
    --line: #29322C;
    --line-soft: #212a24;
    --pitch: #55C08C;
    --pitch-soft: #16281f;
    --gold: #D3A244;
    --gold-soft: #2A2313;
    --danger: #E27A6A;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--body);
    font-size: 16px;
    line-height: 1.62;
    -webkit-font-smoothing: antialiased;
  }

  a { color: var(--pitch); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  a:focus-visible, summary:focus-visible { outline: 2px solid var(--pitch); outline-offset: 3px; border-radius: 2px; }

  code, pre, .mono { font-family: var(--mono); font-variant-ligatures: none; }

  /* ── Scoreboard header ─────────────────────────────────────── */

  header.top {
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }

  .top-inner {
    max-width: var(--wrap);
    margin: 0 auto;
    padding: 40px 28px 30px;
    display: grid;
    gap: 22px;
  }

  .eyebrow {
    font-family: var(--mono);
    font-size: 11.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
  }

  h1 {
    font-family: var(--display);
    font-weight: 600;
    font-size: clamp(38px, 7vw, 62px);
    line-height: 0.98;
    letter-spacing: -0.005em;
    margin: 0;
    text-wrap: balance;
  }

  .lede {
    margin: 0;
    max-width: 62ch;
    font-size: 17.5px;
    color: var(--muted);
  }

  .scoreline {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    margin: 0;
    border: 1px solid var(--line);
    border-radius: 3px;
    overflow: hidden;
    background: var(--paper);
    width: fit-content;
    max-width: 100%;
  }
  .scoreline > div {
    padding: 10px 20px 11px;
    border-right: 1px solid var(--line);
    min-width: 108px;
  }
  .scoreline > div:last-child { border-right: 0; }
  .scoreline dt {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 2px;
  }
  .scoreline dd {
    margin: 0;
    font-family: var(--display);
    font-size: 23px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  /* ── Layout ────────────────────────────────────────────────── */

  .page {
    max-width: var(--wrap);
    margin: 0 auto;
    padding: 0 28px 96px;
    display: grid;
    grid-template-columns: 208px minmax(0, 1fr);
    gap: 56px;
    align-items: start;
  }

  nav.index {
    position: sticky;
    top: 0;
    padding: 40px 0;
    font-size: 14px;
  }
  nav.index p {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 12px;
  }
  nav.index ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
    counter-reset: nav;
  }
  nav.index a {
    display: block;
    padding: 4px 0 4px 26px;
    color: var(--muted);
    text-decoration: none;
    position: relative;
    border-radius: 2px;
  }
  nav.index li { counter-increment: nav; }
  nav.index a::before {
    content: counter(nav, decimal-leading-zero);
    position: absolute;
    left: 0;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--line);
    top: 6px;
  }
  nav.index a:hover { color: var(--ink); }
  nav.index a:hover::before { color: var(--pitch); }

  main { padding: 40px 0 0; min-width: 0; }

  section { padding-bottom: 52px; }
  section + section { border-top: 1px solid var(--line-soft); padding-top: 44px; }

  h2 {
    font-family: var(--display);
    font-weight: 600;
    font-size: 30px;
    line-height: 1.1;
    margin: 0 0 8px;
    letter-spacing: 0.002em;
  }
  h3 {
    font-family: var(--body);
    font-size: 16.5px;
    font-weight: 650;
    margin: 34px 0 10px;
    letter-spacing: 0.004em;
  }
  h4 {
    font-family: var(--mono);
    font-size: 11.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 500;
    margin: 26px 0 10px;
  }
  p, ul, ol { max-width: var(--col); }
  p { margin: 0 0 14px; }
  main ul, main ol { padding-left: 20px; margin: 0 0 14px; }
  main li { margin-bottom: 6px; }

  .sub {
    color: var(--muted);
    max-width: var(--col);
    margin: 0 0 24px;
  }

  strong { font-weight: 650; }

  main code {
    font-size: 0.885em;
    background: var(--surface-2);
    padding: 1.5px 5px;
    border-radius: 2px;
    white-space: nowrap;
  }

  /* ── Code blocks ───────────────────────────────────────────── */

  .code {
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface);
    margin: 0 0 20px;
    overflow: hidden;
  }
  .code figcaption {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 8px 14px;
    border-bottom: 1px solid var(--line-soft);
    background: var(--surface-2);
  }
  pre {
    margin: 0;
    padding: 14px 16px;
    overflow-x: auto;
    font-size: 13.2px;
    line-height: 1.62;
    tab-size: 2;
  }
  pre code { background: none; padding: 0; white-space: pre; font-size: inherit; }

  .cm { color: var(--muted); }
  .st { color: var(--pitch); }
  .ky { color: var(--gold); }

  /* ── Endpoint rows ─────────────────────────────────────────── */

  .routes {
    border: 1px solid var(--line);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .route {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 14px;
    padding: 12px 16px;
    background: var(--surface);
    align-items: baseline;
  }
  .route + .route { border-top: 1px solid var(--line-soft); }
  .verb {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.08em;
    color: var(--pitch);
    border: 1px solid var(--pitch);
    border-radius: 2px;
    padding: 1px 0;
    text-align: center;
    background: var(--pitch-soft);
  }
  .route .path {
    font-family: var(--mono);
    font-size: 13.4px;
    word-break: break-word;
  }
  .route .path b { font-weight: 600; }
  .route .path span { color: var(--gold); }
  .route .what { color: var(--muted); font-size: 14px; display: block; font-family: var(--body); margin-top: 1px; }

  /* ── Tables ────────────────────────────────────────────────── */

  .scroll { overflow-x: auto; margin: 0 0 22px; border: 1px solid var(--line); border-radius: 3px; }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 14px;
    background: var(--surface);
    min-width: 540px;
  }
  caption {
    text-align: left;
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 9px 14px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--line-soft);
  }
  th, td {
    text-align: left;
    padding: 9px 14px;
    border-bottom: 1px solid var(--line-soft);
    vertical-align: top;
  }
  thead th {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 500;
    white-space: nowrap;
  }
  tbody tr:last-child td { border-bottom: 0; }
  td.p { font-family: var(--mono); font-size: 13px; white-space: nowrap; }
  td.t { font-family: var(--mono); font-size: 12.4px; color: var(--muted); white-space: nowrap; }
  td.n { font-variant-numeric: tabular-nums; }

  /* ── Stat panels (the GK duality) ──────────────────────────── */

  .panels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(258px, 1fr));
    gap: 18px;
    margin: 4px 0 24px;
    max-width: 720px;
  }
  .panel {
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface);
    overflow: hidden;
  }
  .panel > header {
    padding: 9px 14px;
    border-bottom: 1px solid var(--line-soft);
    background: var(--surface-2);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .panel > header b {
    font-family: var(--display);
    font-size: 17px;
    font-weight: 600;
  }
  .panel > header span {
    font-family: var(--mono);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .slots { display: grid; grid-template-columns: 1fr 1fr; }
  .slot {
    padding: 8px 14px;
    border-bottom: 1px solid var(--line-soft);
    border-right: 1px solid var(--line-soft);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .slot:nth-child(2n) { border-right: 0; }
  .slot:nth-last-child(-n+2) { border-bottom: 0; }
  .slot em {
    font-family: var(--mono);
    font-size: 11.5px;
    font-style: normal;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .slot b {
    font-family: var(--display);
    font-size: 18px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .panel .foot {
    padding: 9px 14px;
    border-top: 1px solid var(--line-soft);
    font-size: 13px;
    color: var(--muted);
  }
  .panel .foot code { background: none; padding: 0; color: var(--pitch); }

  /* ── Callout ───────────────────────────────────────────────── */

  .note {
    border-left: 2px solid var(--gold);
    background: var(--gold-soft);
    padding: 13px 16px;
    border-radius: 0 3px 3px 0;
    margin: 0 0 22px;
    max-width: var(--col);
    font-size: 14.6px;
  }
  .note p { margin: 0; max-width: none; }
  .note p + p { margin-top: 8px; }
  .note b { font-weight: 650; }
  .note code { background: rgba(0,0,0,0.06); }
  :root[data-theme="dark"] .note code { background: rgba(255,255,255,0.08); }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .note code { background: rgba(255,255,255,0.08); }
  }

  /* ── Recipes ───────────────────────────────────────────────── */

  .recipe {
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface);
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .recipe h5 {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 650;
    font-family: var(--body);
  }
  .recipe pre { padding: 0; font-size: 12.9px; }
  .recipe p { margin: 8px 0 0; font-size: 14px; color: var(--muted); max-width: none; }

  footer.end {
    border-top: 1px solid var(--line);
    background: var(--surface);
  }
  .end-inner {
    max-width: var(--wrap);
    margin: 0 auto;
    padding: 26px 28px 40px;
    color: var(--muted);
    font-size: 13.5px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 26px;
  }

  @media (max-width: 880px) {
    .page { grid-template-columns: minmax(0, 1fr); gap: 0; }
    nav.index { position: static; padding: 32px 0 0; border-bottom: 1px solid var(--line-soft); padding-bottom: 24px; }
    nav.index ol { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); display: grid; }
    .top-inner, .page, .end-inner { padding-left: 20px; padding-right: 20px; }
  }
</style>

<header class="top">
  <div class="top-inner">
    <div class="eyebrow">
      <span>Football Cards API</span>
      <span>·</span>
      <span>v1</span>
      <span>·</span>
      <span>somente leitura, sem autenticação</span>
    </div>
    <h1>Manual de uso da<br>Football Cards API</h1>
    <p class="lede">
      Catálogo de cartas de futebol servido como JSON. Você faz <code>GET</code>, recebe cartas
      filtradas, ordenadas e paginadas. Não há login, chave, escrita nem estado — o catálogo
      inteiro viaja dentro do deploy e é respondido pela borda.
    </p>
    <dl class="scoreline">
      <div><dt>Cartas</dt><dd>1&nbsp;200</dd></div>
      <div><dt>Ratings</dt><dd>92–99</dd></div>
      <div><dt>Goleiros</dt><dd>53</dd></div>
      <div><dt>Temporada</dt><dd>FC 26</dd></div>
      <div><dt>Coletado</dt><dd>14 ago 2026</dd></div>
    </dl>
  </div>
</header>

<div class="page">
  <nav class="index" aria-label="Índice">
    <p>Índice</p>
    <ol>
      <li><a href="#inicio">Primeira chamada</a></li>
      <li><a href="#convencoes">Convenções</a></li>
      <li><a href="#rotas">Rotas</a></li>
      <li><a href="#parametros">Parâmetros de /cards</a></li>
      <li><a href="#goleiros">A regra dos goleiros</a></li>
      <li><a href="#carta">O objeto Carta</a></li>
      <li><a href="#metadados">Metadados e filtros</a></li>
      <li><a href="#erros">Erros</a></li>
      <li><a href="#receitas">Receitas</a></li>
      <li><a href="#limites">Limites e armadilhas</a></li>
      <li><a href="#local">Rodando local</a></li>
    </ol>
  </nav>

  <main>
    <section id="inicio">
      <h2>Primeira chamada</h2>
      <p class="sub">
        Base de produção: <code>https://foot-deck.vercel.app/api/v1</code>. Nada a configurar —
        cole a URL no navegador e já responde.
      </p>

      <figure class="code">
        <figcaption>curl</figcaption>
<pre><code>curl <span class="st">"https://foot-deck.vercel.app/api/v1/cards?limit=1&amp;sort=rating&amp;order=desc"</span></code></pre>
      </figure>

      <figure class="code">
        <figcaption>Resposta (recortada)</figcaption>
<pre><code>{
  <span class="ky">"data"</span>: [
    {
      <span class="ky">"id"</span>: <span class="st">"051dd1bb-bba7-5bdd-b7ea-ae899db40cbe"</span>,
      <span class="ky">"name"</span>: <span class="st">"Lamine Yamal Nasraoui Ebana"</span>,
      <span class="ky">"rating"</span>: 99,
      <span class="ky">"version"</span>: <span class="st">"Summer Stars Winners"</span>,
      <span class="ky">"club"</span>: <span class="st">"FC Barcelona"</span>,
      <span class="ky">"league"</span>: <span class="st">"LALIGA EA SPORTS"</span>,
      <span class="ky">"position"</span>: <span class="st">"RW"</span>,
      <span class="ky">"attributes"</span>: { <span class="ky">"pace"</span>: 98, <span class="ky">"shooting"</span>: 96, <span class="ky">"passing"</span>: 99,
                       <span class="ky">"dribbling"</span>: 99, <span class="ky">"defending"</span>: 34, <span class="ky">"physical"</span>: 83 }
      <span class="cm">// … imagens, preços, flags</span>
    }
  ],
  <span class="ky">"meta"</span>: { <span class="ky">"page"</span>: 1, <span class="ky">"limit"</span>: 1, <span class="ky">"total"</span>: 1200, <span class="ky">"total_pages"</span>: 1200 }
}</code></pre>
      </figure>

      <figure class="code">
        <figcaption>JavaScript</figcaption>
<pre><code><span class="cm">const</span> API = <span class="st">'https://foot-deck.vercel.app/api/v1'</span>;

<span class="cm">const</span> params = <span class="cm">new</span> URLSearchParams({
  league: <span class="st">'Premier League'</span>,
  position: <span class="st">'ST,LW,RW'</span>,     <span class="cm">// listas são separadas por vírgula</span>
  min_rating: <span class="st">'95'</span>,
  sort: <span class="st">'reference_price'</span>,
  order: <span class="st">'desc'</span>,
  limit: <span class="st">'20'</span>,
});

<span class="cm">const</span> res = <span class="cm">await</span> fetch(API + <span class="st">'/cards?'</span> + params);
<span class="cm">if</span> (!res.ok) <span class="cm">throw new</span> Error((<span class="cm">await</span> res.json()).error.code);

<span class="cm">const</span> { data, meta } = <span class="cm">await</span> res.json();</code></pre>
      </figure>

      <p>
        Se preferir explorar clicando: <a href="https://foot-deck.vercel.app/docs">Swagger UI</a>
        monta as chamadas para você, e
        <a href="https://foot-deck.vercel.app/api/v1/openapi.json">openapi.json</a>
        serve para gerar cliente tipado.
      </p>
    </section>

    <section id="convencoes">
      <h2>Convenções</h2>
      <p class="sub">Sete regras que valem para toda a API. Sabendo estas, o resto é só tabela.</p>

      <h4>Envelope</h4>
      <p>
        Sucesso sempre vem embrulhado em <code>data</code>. Listas trazem também <code>meta</code>
        com <code>page</code>, <code>limit</code>, <code>total</code> e <code>total_pages</code>.
        Erro vem em <code>error</code> com <code>code</code> e <code>message</code>. Nunca um array
        na raiz — dá espaço para crescer sem quebrar cliente.
      </p>

      <h4>Versão no caminho</h4>
      <p>
        Todo endpoint vive sob <code>/api/v1</code>. Mudança incompatível vira <code>/api/v2</code>;
        <code>v1</code> continua respondendo o que respondia.
      </p>

      <h4>Listas por vírgula</h4>
      <p>
        Onde o parâmetro aceita vários valores, use vírgula: <code>?position=ST,CAM</code>.
        Valores do mesmo parâmetro são <em>OU</em> entre si; parâmetros diferentes são <em>E</em>.
        Logo <code>?position=ST,CAM&amp;league=Bundesliga</code> significa “atacante ou meia-atacante,
        <em>e</em> da Bundesliga”.
      </p>

      <h4>Booleanos são palavras</h4>
      <p>
        Query string não tem tipo. Só <code>true</code> e <code>false</code> são aceitos —
        <code>1</code>, <code>yes</code> ou <code>on</code> devolvem 400.
      </p>

      <h4>Acento e caixa não importam</h4>
      <p>
        <code>search=ibrahimovic</code> encontra “Ibrahimović”, e
        <code>club=sao paulo</code> encontra “São Paulo”. A busca é por trecho dentro de nome +
        clube + versão; os filtros de taxonomia (<code>club</code>, <code>league</code>,
        <code>nation</code>, <code>version</code>) exigem o valor inteiro, apenas ignorando acento
        e caixa.
      </p>

      <h4>Cache é do lado de fora</h4>
      <p>
        Respostas de catálogo saem com
        <code>Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate=604800</code>:
        a CDN guarda por um dia, o navegador não guarda cópia própria. Só
        <code>/health</code> é <code>no-store</code>. Na prática a maioria das chamadas nem chega à
        função — não há motivo para você montar cache próprio.
      </p>

      <h4>CORS liberado</h4>
      <p>
        Em produção a origem é <code>*</code> e os métodos permitidos são <code>GET</code> e
        <code>OPTIONS</code>. Chamar direto do front, sem proxy, é o uso esperado.
      </p>
    </section>

    <section id="rotas">
      <h2>Rotas</h2>
      <p class="sub">Nove endpoints, todos <code>GET</code>. Prefixo <code>/api/v1</code> omitido.</p>

      <div class="routes">
        <div class="route">
          <span class="verb">GET</span>
          <span class="path"><b>/health</b>
            <span class="what">Estado do serviço, versão, uptime. Não cacheável.</span></span>
        </div>
        <div class="route">
          <span class="verb">GET</span>
          <span class="path"><b>/cards</b>
            <span class="what">Lista com filtros, busca, ordenação e paginação. É o endpoint principal.</span></span>
        </div>
        <div class="route">
          <span class="verb">GET</span>
          <span class="path"><b>/cards/</b><span>{id}</span>
            <span class="what">Uma carta pelo UUID interno.</span></span>
        </div>
        <div class="route">
          <span class="verb">GET</span>
          <span class="path"><b>/cards/source/</b><span>{source}</span><b>/</b><span>{sourceId}</span>
            <span class="what">Uma carta pelo ID da fonte — ex.: <code>/cards/source/futbin/26486</code>.</span></span>
        </div>
        <div class="route">
          <span class="verb">GET</span>
          <span class="path"><b>/leagues</b> · <b>/clubs</b> · <b>/versions</b> · <b>/nations</b> · <b>/positions</b>
            <span class="what">Valores distintos com contagem, para montar filtros na interface sem hardcode.</span></span>
        </div>
        <div class="route">
          <span class="verb">GET</span>
          <span class="path"><b>/stats</b>
            <span class="what">Resumo do catálogo: totais, faixa de rating e preço, distribuição por posição.</span></span>
        </div>
      </div>
      <p class="sub" style="margin-top:14px">
        Fora do prefixo de versão: <code>/docs</code> (Swagger UI), <code>/manual</code> (esta
        página) e <code>/</code>, que redireciona para o Swagger. Estas três servem HTML, não JSON —
        são documentação, não contrato.
      </p>
    </section>

    <section id="parametros">
      <h2>Parâmetros de <span class="mono" style="font-size:0.8em">/cards</span></h2>
      <p class="sub">
        Todos opcionais e combináveis. Valor fora de faixa ou fora do enum devolve
        <code>VALIDATION_ERROR</code> em vez de ser ignorado em silêncio.
      </p>

      <div class="scroll">
        <table>
          <caption>Paginação e ordenação</caption>
          <thead><tr><th>Parâmetro</th><th>Tipo</th><th>Default</th><th>Observação</th></tr></thead>
          <tbody>
            <tr><td class="p">page</td><td class="t">1–100000</td><td class="n">1</td><td>Página além do fim devolve <code>data</code> vazio, não erro.</td></tr>
            <tr><td class="p">limit</td><td class="t">1–100</td><td class="n">20</td><td>Teto de 100 por resposta.</td></tr>
            <tr><td class="p">sort</td><td class="t">enum</td><td>—</td><td><code>rating</code>, <code>name</code>, <code>reference_price</code>, <code>pace</code>, <code>shooting</code>, <code>passing</code>, <code>dribbling</code>, <code>defending</code>, <code>physical</code>.</td></tr>
            <tr><td class="p">order</td><td class="t">asc · desc</td><td>desc</td><td>Só tem efeito acompanhado de <code>sort</code>.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="scroll">
        <table>
          <caption>Busca e identidade</caption>
          <thead><tr><th>Parâmetro</th><th>Tipo</th><th>O que faz</th></tr></thead>
          <tbody>
            <tr><td class="p">search</td><td class="t">texto</td><td>Trecho em nome + clube + versão, sem acento e sem caixa.</td></tr>
            <tr><td class="p">ids</td><td class="t">lista</td><td>Até 100 UUIDs. IDs inexistentes são omitidos, não geram erro.</td></tr>
            <tr><td class="p">game</td><td class="t">texto</td><td>Igualdade exata. Hoje só existe <code>FC</code>.</td></tr>
            <tr><td class="p">season</td><td class="t">1–99</td><td>Hoje só existe <code>26</code>.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="scroll">
        <table>
          <caption>Rating, posição e taxonomia</caption>
          <thead><tr><th>Parâmetro</th><th>Tipo</th><th>O que faz</th></tr></thead>
          <tbody>
            <tr><td class="p">min_rating<br>max_rating</td><td class="t">1–99</td><td>Faixa inclusiva. O catálogo atual vai de 92 a 99.</td></tr>
            <tr><td class="p">position</td><td class="t">lista enum</td><td>Posição <em>primária</em>. Valores: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST.</td></tr>
            <tr><td class="p">plays_as</td><td class="t">lista enum</td><td>Posição primária <em>ou</em> alternativa — “serve para jogar aqui”.</td></tr>
            <tr><td class="p">include_goalkeepers</td><td class="t">bool</td><td>Ver <a href="#goleiros">a regra dos goleiros</a>. <code>false</code> remove goleiros de qualquer consulta.</td></tr>
            <tr><td class="p">version</td><td class="t">lista</td><td>Ex.: <code>Summer Stars Winners</code>. Valores em <code>/versions</code>.</td></tr>
            <tr><td class="p">club</td><td class="t">lista</td><td>Valores em <code>/clubs</code>.</td></tr>
            <tr><td class="p">nation</td><td class="t">lista</td><td>Valores em <code>/nations</code>.</td></tr>
            <tr><td class="p">league</td><td class="t">lista</td><td>Valores em <code>/leagues</code>.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="scroll">
        <table>
          <caption>Atributos — jogadores de linha</caption>
          <thead><tr><th>Parâmetro</th><th>Tipo</th><th>Piso para</th></tr></thead>
          <tbody>
            <tr><td class="p">min_pace</td><td class="t">0–99</td><td>Velocidade</td></tr>
            <tr><td class="p">min_shooting</td><td class="t">0–99</td><td>Finalização</td></tr>
            <tr><td class="p">min_passing</td><td class="t">0–99</td><td>Passe</td></tr>
            <tr><td class="p">min_dribbling</td><td class="t">0–99</td><td>Drible</td></tr>
            <tr><td class="p">min_defending</td><td class="t">0–99</td><td>Defesa</td></tr>
            <tr><td class="p">min_physical</td><td class="t">0–99</td><td>Físico</td></tr>
          </tbody>
        </table>
      </div>

      <div class="scroll">
        <table>
          <caption>Atributos — goleiros</caption>
          <thead><tr><th>Parâmetro</th><th>Tipo</th><th>Piso para</th></tr></thead>
          <tbody>
            <tr><td class="p">min_diving</td><td class="t">0–99</td><td>Elasticidade</td></tr>
            <tr><td class="p">min_handling</td><td class="t">0–99</td><td>Manejo</td></tr>
            <tr><td class="p">min_kicking</td><td class="t">0–99</td><td>Chute</td></tr>
            <tr><td class="p">min_reflexes</td><td class="t">0–99</td><td>Reflexos</td></tr>
            <tr><td class="p">min_speed</td><td class="t">0–99</td><td>Velocidade</td></tr>
            <tr><td class="p">min_positioning</td><td class="t">0–99</td><td>Posicionamento</td></tr>
          </tbody>
        </table>
      </div>

      <div class="scroll">
        <table>
          <caption>Preço e flags</caption>
          <thead><tr><th>Parâmetro</th><th>Tipo</th><th>O que faz</th></tr></thead>
          <tbody>
            <tr><td class="p">min_price<br>max_price</td><td class="t">inteiro</td><td>Compara com <code>prices.reference</code>. Carta sem preço fica fora de qualquer filtro de preço.</td></tr>
            <tr><td class="p">is_complete</td><td class="t">bool</td><td>Tem imagem do jogador <em>e</em> preço de referência. Use <code>true</code> para vitrines.</td></tr>
            <tr><td class="p">has_image</td><td class="t">bool</td><td>Só a imagem do jogador.</td></tr>
            <tr><td class="p">is_tradeable</td><td class="t">bool</td><td>Negociável na fonte.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="goleiros">
      <h2>A regra dos goleiros</h2>
      <p class="sub">
        A parte da API que mais surpreende quem chega — e a que resolve um problema real dos dados.
      </p>
      <p>
        Uma carta guarda seis números de atributo. Em jogador de linha eles significam Pace,
        Shooting, Passing, Dribbling, Defending, Physical. Em goleiro, os mesmos seis slots
        significam Diving, Handling, Kicking, Reflexes, Speed, Positioning. São escalas diferentes
        no mesmo espaço.
      </p>

      <div class="panels">
        <div class="panel">
          <header><b>Lamine Yamal</b><span>RW · 99</span></header>
          <div class="slots">
            <div class="slot"><em>PAC</em><b>98</b></div>
            <div class="slot"><em>SHO</em><b>96</b></div>
            <div class="slot"><em>PAS</em><b>99</b></div>
            <div class="slot"><em>DRI</em><b>99</b></div>
            <div class="slot"><em>DEF</em><b>34</b></div>
            <div class="slot"><em>PHY</em><b>83</b></div>
          </div>
          <div class="foot">chega no bloco <code>attributes</code></div>
        </div>
        <div class="panel">
          <header><b>Unai Simón</b><span>GK · 99</span></header>
          <div class="slots">
            <div class="slot"><em>DIV</em><b>98</b></div>
            <div class="slot"><em>HAN</em><b>94</b></div>
            <div class="slot"><em>KIC</em><b>94</b></div>
            <div class="slot"><em>REF</em><b>99</b></div>
            <div class="slot"><em>SPD</em><b>65</b></div>
            <div class="slot"><em>POS</em><b>99</b></div>
          </div>
          <div class="foot">chega no bloco <code>goalkeeper</code></div>
        </div>
      </div>

      <p>Por isso a API separa os dois mundos, na resposta e no filtro:</p>
      <ul>
        <li>
          Filtro de linha (<code>min_pace</code>, <code>min_shooting</code>, …)
          <strong>exclui goleiros</strong>. Peça <code>include_goalkeepers=true</code> para
          trazê-los de volta comparando slot a slot.
        </li>
        <li>
          Filtro de goleiro (<code>min_diving</code>, <code>min_reflexes</code>, …)
          <strong>retorna somente goleiros</strong>.
        </li>
        <li>
          <code>include_goalkeepers=false</code> tira goleiros de qualquer consulta, mesmo sem
          filtro de atributo nenhum.
        </li>
        <li>
          Na resposta, a carta traz <code>attributes</code> <em>ou</em> <code>goalkeeper</code> —
          nunca os dois. <code>is_goalkeeper</code> diz qual esperar.
        </li>
      </ul>

      <div class="note">
        <p>
          <b>Consequência prática:</b> se sua tela de busca tem sliders de PAC/SHO/PAS, ela nunca
          vai mostrar goleiro sem que você peça. Monte a busca de goleiro como um modo separado,
          com os seis filtros próprios — é assim que a API foi desenhada para ser consumida.
        </p>
      </div>

      <figure class="code">
        <figcaption>Goleiro com reflexo e elasticidade altos</figcaption>
<pre><code>GET /api/v1/cards?min_reflexes=95&amp;min_diving=95&amp;sort=rating</code></pre>
      </figure>
    </section>

    <section id="carta">
      <h2>O objeto Carta</h2>
      <p class="sub">
        A resposta não espelha a tabela interna: agrupa em <code>images</code>, <code>prices</code>
        e <code>flags</code>, e troca <code>attributes</code> por <code>goalkeeper</code> quando é
        goleiro.
      </p>

      <div class="scroll">
        <table>
          <caption>Campos</caption>
          <thead><tr><th>Campo</th><th>Tipo</th><th>O que é</th></tr></thead>
          <tbody>
            <tr><td class="p">id</td><td class="t">string</td><td>UUID determinístico derivado de <code>source</code> + <code>source_id</code>. Estável entre deploys — pode guardar no seu banco.</td></tr>
            <tr><td class="p">source<br>source_id</td><td class="t">string</td><td>De onde veio e o ID lá. Hoje <code>futbin</code>.</td></tr>
            <tr><td class="p">game<br>season</td><td class="t">string · number</td><td><code>FC</code> e <code>26</code>.</td></tr>
            <tr><td class="p">name</td><td class="t">string</td><td>Nome completo, com acentuação original.</td></tr>
            <tr><td class="p">rating</td><td class="t">number</td><td>Overall.</td></tr>
            <tr><td class="p">version</td><td class="t">string · null</td><td>Tipo de carta, ex.: <code>Summer Stars Winners</code>.</td></tr>
            <tr><td class="p">club<br>nation<br>league</td><td class="t">string · null</td><td>Podem vir nulos quando a fonte não trouxe.</td></tr>
            <tr><td class="p">position</td><td class="t">enum</td><td>Posição primária.</td></tr>
            <tr><td class="p">alt_positions</td><td class="t">enum[]</td><td>Posições alternativas conhecidas.</td></tr>
            <tr><td class="p">alt_positions_hidden</td><td class="t">number</td><td>Quantas a fonte omitiu. Maior que zero significa que a lista acima é parcial — não conclua que o jogador não serve numa posição só porque ela não está lá.</td></tr>
            <tr><td class="p">is_goalkeeper</td><td class="t">bool</td><td>Diz qual bloco de atributo vem na resposta.</td></tr>
            <tr><td class="p">attributes</td><td class="t">objeto?</td><td>Presente só quando <code>is_goalkeeper: false</code>. Seis números ou <code>null</code>.</td></tr>
            <tr><td class="p">goalkeeper</td><td class="t">objeto?</td><td>Presente só quando <code>is_goalkeeper: true</code>.</td></tr>
            <tr><td class="p">images</td><td class="t">objeto</td><td><code>player</code>, <code>player_small</code>, <code>card</code>, <code>card_small</code> — URLs do CDN da fonte, cada uma pode ser <code>null</code>.</td></tr>
            <tr><td class="p">prices</td><td class="t">objeto</td><td><code>playstation</code>, <code>pc</code>, <code>reference</code> (a média usada nos filtros) e <code>updated_at</code>.</td></tr>
            <tr><td class="p">flags</td><td class="t">objeto</td><td><code>is_complete</code>, <code>has_player_image</code>, <code>is_tradeable</code>.</td></tr>
            <tr><td class="p">source_url</td><td class="t">string · null</td><td>Página original, útil para creditar a fonte.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="note">
        <p>
          <b>Preço é fotografia, não cotação.</b> <code>prices.updated_at</code> é o momento da
          coleta — 14/08/2026 no catálogo atual — e não muda em runtime. Se sua tela sugere preço
          ao vivo, mostre essa data ao lado do número.
        </p>
      </div>

      <figure class="code">
        <figcaption>Carta de goleiro, completa</figcaption>
<pre><code>{
  <span class="ky">"id"</span>: <span class="st">"7e95544d-24e6-5b2f-90e0-fc6b8494fe59"</span>,
  <span class="ky">"source"</span>: <span class="st">"futbin"</span>,
  <span class="ky">"source_id"</span>: <span class="st">"26482"</span>,
  <span class="ky">"game"</span>: <span class="st">"FC"</span>,
  <span class="ky">"season"</span>: 26,
  <span class="ky">"name"</span>: <span class="st">"Unai Simón Mendibil"</span>,
  <span class="ky">"rating"</span>: 99,
  <span class="ky">"version"</span>: <span class="st">"Summer Stars Winners"</span>,
  <span class="ky">"club"</span>: <span class="st">"Athletic Club"</span>,
  <span class="ky">"nation"</span>: <span class="st">"Spain"</span>,
  <span class="ky">"league"</span>: <span class="st">"LALIGA EA SPORTS"</span>,
  <span class="ky">"position"</span>: <span class="st">"GK"</span>,
  <span class="ky">"alt_positions"</span>: [],
  <span class="ky">"alt_positions_hidden"</span>: 0,
  <span class="ky">"is_goalkeeper"</span>: <span class="cm">true</span>,
  <span class="ky">"images"</span>: {
    <span class="ky">"player"</span>: <span class="st">"https://cdn.futbin.com/…/p67339733.png"</span>,
    <span class="ky">"player_small"</span>: <span class="st">"https://cdn3.futbin.com/…w=64"</span>,
    <span class="ky">"card"</span>: <span class="st">"https://cdn.futbin.com/…/78_summer_stars_winners.png"</span>,
    <span class="ky">"card_small"</span>: <span class="st">"https://cdn3.futbin.com/…w=64"</span>
  },
  <span class="ky">"prices"</span>: {
    <span class="ky">"playstation"</span>: 270900,
    <span class="ky">"pc"</span>: 310650,
    <span class="ky">"reference"</span>: 290775,
    <span class="ky">"updated_at"</span>: <span class="st">"2026-08-14T13:32:50.900Z"</span>
  },
  <span class="ky">"flags"</span>: { <span class="ky">"is_complete"</span>: <span class="cm">true</span>, <span class="ky">"has_player_image"</span>: <span class="cm">true</span>, <span class="ky">"is_tradeable"</span>: <span class="cm">true</span> },
  <span class="ky">"source_url"</span>: <span class="st">"https://www.futbin.com/26/player/26482/unai-simon-mendibil"</span>,
  <span class="ky">"goalkeeper"</span>: {
    <span class="ky">"diving"</span>: 98, <span class="ky">"handling"</span>: 94, <span class="ky">"kicking"</span>: 94,
    <span class="ky">"reflexes"</span>: 99, <span class="ky">"speed"</span>: 65, <span class="ky">"positioning"</span>: 99
  }
}</code></pre>
      </figure>
    </section>

    <section id="metadados">
      <h2>Metadados e filtros</h2>
      <p class="sub">
        Não escreva lista de ligas no código do front. Pergunte à API: as facetas vêm ordenadas por
        contagem decrescente, então já saem prontas para um select.
      </p>

      <figure class="code">
        <figcaption>GET /api/v1/leagues</figcaption>
<pre><code>{
  <span class="ky">"data"</span>: [
    { <span class="ky">"value"</span>: <span class="st">"Premier League"</span>, <span class="ky">"count"</span>: 243 },
    { <span class="ky">"value"</span>: <span class="st">"Icons"</span>, <span class="ky">"count"</span>: 191 },
    { <span class="ky">"value"</span>: <span class="st">"LALIGA EA SPORTS"</span>, <span class="ky">"count"</span>: 141 }
    <span class="cm">// …</span>
  ]
}</code></pre>
      </figure>

      <p>
        Mesmo formato em <code>/clubs</code>, <code>/versions</code>, <code>/nations</code> e
        <code>/positions</code>. Cartas com o campo nulo não entram na contagem.
      </p>

      <h3>/stats — o catálogo em um objeto</h3>
      <p>
        Serve para calibrar a interface: faixa real dos sliders, quantas cartas têm imagem, quando
        o catálogo foi gerado.
      </p>

      <figure class="code">
        <figcaption>GET /api/v1/stats</figcaption>
<pre><code>{
  <span class="ky">"data"</span>: {
    <span class="ky">"total"</span>: 1200,
    <span class="ky">"complete"</span>: 935,
    <span class="ky">"tradeable"</span>: 980,
    <span class="ky">"goalkeepers"</span>: 53,
    <span class="ky">"rating"</span>: { <span class="ky">"min"</span>: 92, <span class="ky">"max"</span>: 99 },
    <span class="ky">"reference_price"</span>: { <span class="ky">"min"</span>: 9275, <span class="ky">"max"</span>: 5625000 },
    <span class="ky">"seasons"</span>: [26],
    <span class="ky">"positions"</span>: [ { <span class="ky">"value"</span>: <span class="st">"ST"</span>, <span class="ky">"count"</span>: 248 }, <span class="cm">/* … */</span> ],
    <span class="ky">"generated_at"</span>: <span class="st">"2026-08-15T18:42:57.797Z"</span>,
    <span class="ky">"collected_at"</span>: <span class="st">"2026-08-14T13:32:50.900Z"</span>
  }
}</code></pre>
      </figure>

      <p>
        <code>generated_at</code> é quando o catálogo foi normalizado; <code>collected_at</code> é
        quando os dados saíram da fonte. A diferença entre os dois é a idade real dos preços.
      </p>
    </section>

    <section id="erros">
      <h2>Erros</h2>
      <p class="sub">
        Lista fechada de códigos: dá para programar contra ela sem depender da mensagem, que é
        texto humano e pode mudar.
      </p>

      <div class="scroll">
        <table>
          <caption>Códigos</caption>
          <thead><tr><th>code</th><th>HTTP</th><th>Quando acontece</th></tr></thead>
          <tbody>
            <tr><td class="p">VALIDATION_ERROR</td><td class="n">400</td><td>Parâmetro fora de faixa, fora do enum, ou booleano escrito de outra forma. <code>details</code> lista campo e motivo.</td></tr>
            <tr><td class="p">TOO_MANY_IDS</td><td class="n">400</td><td>Mais de 100 valores em <code>ids</code>. Divida em lotes.</td></tr>
            <tr><td class="p">CARD_NOT_FOUND</td><td class="n">404</td><td>ID interno ou par fonte/ID sem carta correspondente.</td></tr>
            <tr><td class="p">INTERNAL_ERROR</td><td class="n">500</td><td>Falha inesperada. Sem detalhe interno na resposta.</td></tr>
          </tbody>
        </table>
      </div>

      <figure class="code">
        <figcaption>Formato</figcaption>
<pre><code>{
  <span class="ky">"error"</span>: {
    <span class="ky">"code"</span>: <span class="st">"CARD_NOT_FOUND"</span>,
    <span class="ky">"message"</span>: <span class="st">"Carta naoexiste não encontrada"</span>
  }
}</code></pre>
      </figure>

      <div class="note">
        <p>
          <b>Lista vazia não é erro.</b> Filtro que não casa com nada devolve 200 com
          <code>data: []</code> e <code>total: 0</code>. Trate no front como “nenhum resultado”,
          não como falha.
        </p>
      </div>
    </section>

    <section id="receitas">
      <h2>Receitas</h2>
      <p class="sub">Consultas reais, do jeito que aparecem em uso.</p>

      <div class="recipe">
        <h5>Vitrine da home: as mais caras, todas com imagem</h5>
<pre><code>/cards?is_complete=true&amp;sort=reference_price&amp;order=desc&amp;limit=12</code></pre>
        <p><code>is_complete=true</code> garante que nenhum card da grade apareça sem foto ou sem preço.</p>
      </div>

      <div class="recipe">
        <h5>Hidratar um inventário salvo</h5>
<pre><code>/cards?ids=051dd1bb-…,7e95544d-…,a1b2c3d4-…&amp;limit=100</code></pre>
        <p>Uma chamada em vez de N. Até 100 IDs por vez; suba o <code>limit</code> junto, senão a resposta pagina em 20.</p>
      </div>

      <div class="recipe">
        <h5>Ponta de lança rápida e forte, dentro do orçamento</h5>
<pre><code>/cards?plays_as=ST&amp;min_pace=93&amp;min_shooting=90&amp;max_price=400000&amp;sort=shooting</code></pre>
        <p><code>plays_as</code> em vez de <code>position</code> traz também quem tem ST como alternativa.</p>
      </div>

      <div class="recipe">
        <h5>Busca por nome enquanto o usuário digita</h5>
<pre><code>/cards?search=ibrahimovic&amp;limit=8&amp;sort=rating&amp;order=desc</code></pre>
        <p>Acento não importa. Faça debounce no cliente — a CDN cuida do resto.</p>
      </div>

      <div class="recipe">
        <h5>Defesa de uma liga só</h5>
<pre><code>/cards?league=Serie A TIM&amp;position=CB,LB,RB&amp;min_rating=94&amp;sort=defending&amp;order=desc</code></pre>
        <p>O valor tem de ser o nome inteiro como a fonte guarda — <code>Serie A</code> não casa com <code>Serie A TIM</code>. Pegue os nomes em <code>/leagues</code> e codifique o espaço com <code>encodeURIComponent</code>.</p>
      </div>

      <div class="recipe">
        <h5>Percorrer o catálogo inteiro</h5>
<pre><code>/cards?sort=rating&amp;order=desc&amp;limit=100&amp;page=1   <span class="cm">→ meta.total_pages = 12</span></code></pre>
        <p>Com <code>sort</code> a paginação é estável: há desempate por <code>id</code>, então nenhuma carta pula de página entre chamadas.</p>
      </div>
    </section>

    <section id="limites">
      <h2>Limites e armadilhas</h2>
      <p class="sub">O que costuma custar uma tarde de depuração.</p>

      <div class="scroll">
        <table>
          <caption>Limites</caption>
          <thead><tr><th>Limite</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>Cartas por resposta (<code>limit</code>)</td><td class="n">100</td></tr>
            <tr><td>IDs por requisição (<code>ids</code>)</td><td class="n">100</td></tr>
            <tr><td>Página máxima</td><td class="n">100 000</td></tr>
            <tr><td>Cache de borda</td><td class="n">24 h + 7 dias de <code>stale-while-revalidate</code></td></tr>
            <tr><td>Rate limit</td><td>nenhum</td></tr>
          </tbody>
        </table>
      </div>

      <ul>
        <li>
          <strong>Sem <code>sort</code>, a ordem é a do dataset</strong> — a ordem em que a fonte
          foi coletada. É estável, mas não significa nada. Peça <code>sort</code> sempre que a
          ordem importar na tela.
        </li>
        <li>
          <strong><code>order</code> sozinho não faz nada.</strong> Sem <code>sort</code> ele é
          ignorado.
        </li>
        <li>
          <strong>Ordenar por <code>reference_price</code> joga carta sem preço para o fim</strong>,
          em <code>asc</code> e em <code>desc</code>. Nulo nunca disputa a primeira posição.
        </li>
        <li>
          <strong><code>ids</code> não preserva a ordem que você mandou.</strong> É filtro, não
          lista ordenada — reordene no cliente se a ordem do inventário importa.
        </li>
        <li>
          <strong><code>ids</code> combina com os outros filtros.</strong>
          <code>?ids=…&amp;min_rating=97</code> devolve só os IDs que também passam do rating.
        </li>
        <li>
          <strong>Filtro de preço descarta carta sem preço</strong>, inclusive
          <code>min_price=0</code>. Para “tudo, com ou sem preço”, não mande o parâmetro.
        </li>
        <li>
          <strong>O catálogo cobre rating 92–99.</strong> A coleta parou no limite de chamadas da
          fonte, não no fim do catálogo — não conclua que um jogador não existe, conclua que a carta
          dele está abaixo de 92.
        </li>
        <li>
          <strong><code>alt_positions</code> pode ser parcial.</strong> Confira
          <code>alt_positions_hidden</code> antes de afirmar que um jogador não joga em determinada
          posição.
        </li>
      </ul>
    </section>

    <section id="local">
      <h2>Rodando local</h2>
      <p class="sub">Node.js 20 ou mais novo. Sem banco, sem serviço externo, sem credencial.</p>

      <figure class="code">
        <figcaption>Setup</figcaption>
<pre><code>npm install
cp .env.example .env
npm run dev      <span class="cm"># http://localhost:3000/docs</span></code></pre>
      </figure>

      <div class="scroll">
        <table>
          <caption>Variáveis de ambiente</caption>
          <thead><tr><th>Variável</th><th>Default</th><th>Para quê</th></tr></thead>
          <tbody>
            <tr><td class="p">PORT</td><td class="n">3000</td><td>Na Vercel é injetada.</td></tr>
            <tr><td class="p">API_VERSION</td><td>v1</td><td>Prefixo das rotas.</td></tr>
            <tr><td class="p">CORS_ORIGIN</td><td>—</td><td><strong>Obrigatória em produção</strong>, de propósito: <code>*</code> tem de ser decisão, não default herdado.</td></tr>
            <tr><td class="p">DEFAULT_PAGE_SIZE</td><td class="n">20</td><td><code>limit</code> quando não informado.</td></tr>
            <tr><td class="p">MAX_PAGE_SIZE</td><td class="n">100</td><td>Teto do <code>limit</code>.</td></tr>
            <tr><td class="p">MAX_IDS_PER_REQUEST</td><td class="n">100</td><td>Teto de <code>ids</code>.</td></tr>
            <tr><td class="p">CACHE_MAX_AGE</td><td class="n">86400</td><td><code>s-maxage</code> em segundos.</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        Variável em branco conta como não definida — painéis de deploy criam chaves vazias a partir
        do <code>.env.example</code>, e um <code>CACHE_MAX_AGE=""</code> desligaria o cache em
        silêncio.
      </p>

      <h3>Publicar cartas novas</h3>
      <p>
        Não há migração a rodar: o catálogo é um arquivo dentro do deploy. Rode o importador, depois
        <code>npm run normalize</code>, commite e dê push — o deploy sai com o catálogo novo.
      </p>
    </section>
  </main>
</div>

<footer class="end">
  <div class="end-inner">
    <span>Football Cards API · v1</span>
    <span><a href="https://foot-deck.vercel.app/docs">Swagger UI</a></span>
    <span><a href="https://foot-deck.vercel.app/api/v1/openapi.json">openapi.json</a></span>
    <span><a href="https://foot-deck.vercel.app/api/v1/health">health</a></span>
    <span>Dados coletados do FUTBIN em 14/08/2026</span>
  </div>
</footer>
`;
