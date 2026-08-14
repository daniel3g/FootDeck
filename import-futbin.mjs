import fs from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.PARSE_API_KEY;
const BASE_URL = process.env.PARSE_BASE_URL;

if (!API_KEY) {
  console.error("❌ PARSE_API_KEY não definida.");
  process.exit(1);
}

if (!BASE_URL) {
  console.error("❌ PARSE_BASE_URL não definida.");
  process.exit(1);
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const PAGES_DIR = path.join(DATA_DIR, "pages");
const CHECKPOINT_FILE = path.join(DATA_DIR, "checkpoint.json");
const FINAL_FILE = path.join(DATA_DIR, "cards.json");
const REPORT_FILE = path.join(DATA_DIR, "report.json");

const START_PAGE = Number(process.env.START_PAGE || 1);
const MAX_CALLS = Number(process.env.MAX_CALLS || 5);
const DELAY_MS = Number(process.env.DELAY_MS || 13000);
const MIN_PACE = Number(process.env.MIN_PACE || 0);
const EXPECTED_PAGE_SIZE = Number(process.env.EXPECTED_PAGE_SIZE || 30);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanBaseUrl = (url) => url.replace(/\/+$/, "");

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

function pageFile(page) {
  return path.join(PAGES_DIR, `page-${String(page).padStart(4, "0")}.json`);
}

function normalizeCard(card) {
  return {
    ...card,
    player_image: card.image_large || card.image || null,
    card_image: card.card_image_large_url || card.card_image_url || null,
    image_small: card.image || null,
    image_large: card.image_large || null,
    card_image_small: card.card_image_url || null,
    card_image_large: card.card_image_large_url || null,
  };
}

async function loadStartPage() {
  const checkpoint = await readJson(CHECKPOINT_FILE);
  if (
    checkpoint &&
    Number.isInteger(checkpoint.nextPage) &&
    checkpoint.nextPage >= START_PAGE
  ) {
    return checkpoint.nextPage;
  }
  return START_PAGE;
}

async function requestPage(page) {
  const url = new URL(`${cleanBaseUrl(BASE_URL)}/get_players`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("min_pace", String(MIN_PACE));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": API_KEY,
      Accept: "application/json",
    },
  });

  const raw = await response.text();
  let body;

  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw };
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  if (body?.status !== "success" || !Array.isArray(body?.data?.players)) {
    throw new Error(`Resposta inesperada na página ${page}`);
  }

  return body;
}

async function fetchWithRetry(page) {
  while (true) {
    try {
      return await requestPage(page);
    } catch (error) {
      if (error.status === 429) {
        console.warn(`⚠️ Rate limit na página ${page}. Aguardando 65s...`);
        await sleep(65000);
        continue;
      }
      throw error;
    }
  }
}

async function buildFinalDataset() {
  const files = (await fs.readdir(PAGES_DIR))
    .filter((name) => /^page-\d{4}\.json$/.test(name))
    .sort();

  const byId = new Map();

  let pagesRead = 0;
  let rawCards = 0;
  let withoutLargePlayerImage = 0;
  let withoutLargeCardImage = 0;
  let withoutAnyPlayerImage = 0;
  let withoutAnyCardImage = 0;
  let zeroPrices = 0;

  for (const file of files) {
    const payload = await readJson(path.join(PAGES_DIR, file));
    const players = payload?.data?.players;
    if (!Array.isArray(players)) continue;

    pagesRead += 1;

    for (const original of players) {
      rawCards += 1;
      if (!original?.id) continue;

      const card = normalizeCard(original);

      if (!card.image_large) withoutLargePlayerImage += 1;
      if (!card.card_image_large_url) withoutLargeCardImage += 1;
      if (!card.player_image) withoutAnyPlayerImage += 1;
      if (!card.card_image) withoutAnyCardImage += 1;
      if (card.price_ps === "0" && card.price_pc === "0") zeroPrices += 1;

      byId.set(String(card.id), card);
    }
  }

  const cards = [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));

  await writeJsonAtomic(FINAL_FILE, {
    generated_at: new Date().toISOString(),
    total: cards.length,
    cards,
  });

  const report = {
    generated_at: new Date().toISOString(),
    pages_read: pagesRead,
    raw_cards: rawCards,
    unique_cards: cards.length,
    duplicates_removed: rawCards - cards.length,
    without_large_player_image: withoutLargePlayerImage,
    without_large_card_image: withoutLargeCardImage,
    without_any_player_image: withoutAnyPlayerImage,
    without_any_card_image: withoutAnyCardImage,
    cards_with_zero_prices: zeroPrices,
    final_file: FINAL_FILE,
  };

  await writeJsonAtomic(REPORT_FILE, report);
  return report;
}

async function main() {
  await fs.mkdir(PAGES_DIR, { recursive: true });

  let page = await loadStartPage();
  let calls = 0;
  let finishedNaturally = false;

  console.log("════════════════════════════════════════════");
  console.log(" FUTBIN / Parse.bot — importador de cartas v2");
  console.log("════════════════════════════════════════════");
  console.log(`Página inicial      : ${page}`);
  console.log(`Máx. chamadas       : ${MAX_CALLS}`);
  console.log(`Intervalo           : ${DELAY_MS} ms`);
  console.log(`min_pace            : ${MIN_PACE}`);
  console.log(`Saída               : ${DATA_DIR}`);
  console.log("Imagens principais  : image_large / card_image_large_url");
  console.log("");

  while (calls < MAX_CALLS) {
    const file = pageFile(page);

    if (await exists(file)) {
      const existing = await readJson(file);
      const players = existing?.data?.players;

      if (Array.isArray(players)) {
        console.log(`↪ Página ${page} já salva (${players.length} cartas). Pulando.`);

        if (players.length < EXPECTED_PAGE_SIZE) {
          finishedNaturally = true;
          break;
        }

        page += 1;
        await writeJsonAtomic(CHECKPOINT_FILE, {
          nextPage: page,
          updated_at: new Date().toISOString(),
        });
        continue;
      }
    }

    console.log(`→ Buscando página ${page}...`);

    try {
      const payload = await fetchWithRetry(page);
      calls += 1;

      const players = payload.data.players;
      const apiPage = Number(payload.data.page ?? page);
      const total = Number(payload.data.total ?? players.length);

      await writeJsonAtomic(file, payload);

      const withLargePlayerImage = players.filter((p) => Boolean(p.image_large)).length;
      const withLargeCardImage = players.filter((p) => Boolean(p.card_image_large_url)).length;

      page += 1;

      await writeJsonAtomic(CHECKPOINT_FILE, {
        nextPage: page,
        lastCompletedPage: apiPage,
        callsThisRun: calls,
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ Página ${apiPage}: ${players.length} cartas (total informado: ${total})`);
      console.log(`   ↳ image_large: ${withLargePlayerImage}/${players.length}`);
      console.log(`   ↳ card_image_large_url: ${withLargeCardImage}/${players.length}`);

      if (players.length < EXPECTED_PAGE_SIZE) {
        console.log(`🏁 Página com menos de ${EXPECTED_PAGE_SIZE} cartas. Fim do catálogo detectado.`);
        finishedNaturally = true;
        break;
      }

      if (calls < MAX_CALLS) {
        console.log(`⏳ Aguardando ${Math.ceil(DELAY_MS / 1000)}s...`);
        await sleep(DELAY_MS);
      }
    } catch (error) {
      console.error(`❌ Erro na página ${page}: ${error.message}`);
      if (error.body) {
        console.error(JSON.stringify(error.body, null, 2).slice(0, 2000));
      }
      console.error(`Checkpoint preservado. Execute novamente para continuar da página ${page}.`);
      process.exitCode = 1;
      break;
    }
  }

  if (!finishedNaturally && calls >= MAX_CALLS) {
    console.log(`🛑 Limite de ${MAX_CALLS} chamadas desta execução atingido.`);
    console.log("Execute novamente para continuar; o checkpoint será utilizado.");
  }

  const report = await buildFinalDataset();

  console.log("");
  console.log("════════════════════════════════════════════");
  console.log(" RESUMO");
  console.log("════════════════════════════════════════════");
  console.log(`Páginas salvas                 : ${report.pages_read}`);
  console.log(`Registros recebidos            : ${report.raw_cards}`);
  console.log(`Cartas únicas                  : ${report.unique_cards}`);
  console.log(`Duplicatas removidas           : ${report.duplicates_removed}`);
  console.log(`Sem image_large                : ${report.without_large_player_image}`);
  console.log(`Sem card_image_large_url       : ${report.without_large_card_image}`);
  console.log(`Sem nenhuma imagem de jogador  : ${report.without_any_player_image}`);
  console.log(`Sem nenhuma imagem de carta    : ${report.without_any_card_image}`);
  console.log(`Preços zerados                 : ${report.cards_with_zero_prices}`);
  console.log(`Arquivo final                  : ${FINAL_FILE}`);
  console.log(`Relatório                      : ${REPORT_FILE}`);
}

main().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
