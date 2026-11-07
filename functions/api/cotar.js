/**
 * Cota Seguro Viagem — cotação ao vivo pelo link de parceiro da GTA
 * Cloudflare Pages Function · rota: POST /api/cotar
 *
 * Usa o white label da agência parceira (https://seguro.gtawlabel.com.br/hightrip):
 *  1. POST /cotacao/setup_init.asp?siteNome=hightrip  → cria a cotação na conta do parceiro
 *  2. lê o cotacao_id do redirecionamento
 *  3. GET /cotacao/?cotacao_id=...&siteNome=hightrip  → extrai os planos
 *  4. devolve os planos com o link de compra (/emissao/...&siteNome=hightrip)
 *
 * Corpo (JSON): { destino:"2", perfil:"1", ida:"2026-12-10", volta:"2026-12-20", pax:[1,0,0] }
 *                pax = [até 64 anos, 65 a 85, 86 a 89]
 */

const PARCEIRO = "hightrip"; // código do link de parceiro na GTA
const HOST = "https://seguro.gtawlabel.com.br";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const DESTINOS = {
  "1": "Estados Unidos", "2": "Europa", "3": "Brasil", "4": "América Latina (inclui México)",
  "6": "Canadá", "10": "África, Ásia e Oceania", "11": "Cruzeiro", "13": "Mundial",
};
const PERFIS = { "1": "Lazer", "2": "Estudante", "3": "Cruzeiro", "4": "Multi-viagens", "5": "Receptivo" };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const decode = (s = "") =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&rarr;|&larr;/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim();

const money = (s) => {
  const n = parseFloat(String(s).replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function parsePlanos(html) {
  const planos = [];
  for (const part of html.split(/<article class="gta-plan-card/).slice(1)) {
    const art = part.split("</article>")[0];
    const id = (art.match(/plan-title-(\d+)/) || [])[1];
    if (!id) continue;
    const ben = {};
    for (const m of art.matchAll(/<li>\s*<span>([\s\S]*?)<\/span>\s*<strong>([\s\S]*?)<\/strong>/g)) {
      ben[decode(m[1]).toLowerCase()] = money(m[2]);
    }
    const buy = ((art.match(/class="gta-plan-buy"\s+href="([^"]+)"/) || [])[1] || "").replace(/&amp;/g, "&");
    planos.push({
      id,
      nome: decode((art.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1]),
      selos: [...art.matchAll(/gta-plan-badge[^"]*">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1])),
      dmh: ben["despesas médicas"] ?? null,
      bagagem: ben["perda de bagagem"] ?? null,
      cancelamento: ben["cancelamento de viagem"] ?? null,
      coberturas: parseInt((decode((art.match(/coberturas\.asp[^>]*>([\s\S]*?)<\/a>/) || [])[1]).match(/\d+/) || [])[0], 10) || null,
      brl: money(decode((art.match(/gta-plan-price[\s\S]*?<strong>([\s\S]*?)<\/strong>/) || [])[1])),
      comprar: buy ? HOST + buy : null,
    });
  }
  return planos;
}

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, erro: "Envie os dados da viagem em JSON." }, 400); }

  let destino = String(body.destino || "");
  const perfil = String(body.perfil || "1");
  if (perfil === "3") destino = "11"; // cruzeiro só aceita destino cruzeiro
  const { ida, volta } = body;
  const pax = (Array.isArray(body.pax) ? body.pax : [1, 0, 0]).slice(0, 3).map((n) => Math.max(0, Math.min(5, parseInt(n, 10) || 0)));
  while (pax.length < 3) pax.push(0);

  const isoOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  if (!DESTINOS[destino]) return json({ ok: false, erro: "Escolha o destino da viagem." }, 400);
  if (!PERFIS[perfil]) return json({ ok: false, erro: "Escolha o tipo de viagem." }, 400);
  if (!isoOk(ida) || !isoOk(volta) || volta < ida) return json({ ok: false, erro: "Confira as datas de ida e volta." }, 400);
  const total = pax[0] + pax[1] + pax[2];
  if (total < 1) return json({ ok: false, erro: "Informe pelo menos 1 passageiro." }, 400);

  try {
    // 1. cria a cotação na conta do parceiro
    const form = new URLSearchParams({
      destino, categoria: perfil, data_inicio: ida, data_fim: volta,
      pax_normal: String(pax[0]), pax_idoso: String(pax[1]), pax_idoso2: String(pax[2]),
    });
    const post = await fetch(`${HOST}/cotacao/setup_init.asp?siteNome=${PARCEIRO}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "user-agent": UA,
        "content-type": "application/x-www-form-urlencoded",
        referer: `${HOST}/${PARCEIRO}`,
        origin: HOST,
      },
      body: form.toString(),
    });

    // 2. id da cotação
    let cotacaoId = ((post.headers.get("location") || "").match(/cotacao_id=(\d+)/) || [])[1];
    if (!cotacaoId) {
      const txt = await post.text();
      cotacaoId = (txt.match(/cotacao_id=(\d+)/) || [])[1];
    }
    if (!cotacaoId) throw new Error("sem cotacao_id");

    // 3. planos
    const url = `${HOST}/cotacao/?cotacao_id=${cotacaoId}&siteNome=${PARCEIRO}`;
    const html = await (await fetch(url, { headers: { "user-agent": UA } })).text();
    const planos = parsePlanos(html);
    if (!planos.length) {
      return json({ ok: false, erro: "Não há planos para essa combinação de destino e tipo de viagem. Tente outro tipo de viagem." }, 404);
    }
    planos.sort((a, b) => (a.brl ?? 1e9) - (b.brl ?? 1e9));
    const dias = Math.round((new Date(volta) - new Date(ida)) / 864e5) + 1;

    return json({
      ok: true,
      cotacaoId,
      url,
      destino: DESTINOS[destino],
      perfil: PERFIS[perfil],
      ida, volta, dias,
      passageiros: total,
      planos,
    });
  } catch {
    return json(
      { ok: false, erro: "Não conseguimos buscar os preços agora. Tente de novo em instantes ou fale com a gente no WhatsApp." },
      502
    );
  }
}

export function onRequestGet() {
  return json({ ok: true, info: "Cotação Cota Seguro Viagem no ar. Use POST com { destino, perfil, ida, volta, pax }." });
}
