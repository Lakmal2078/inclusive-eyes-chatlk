// Deploy with: supabase functions deploy update-sports-tips
// Required secrets: ODDS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional: ODDS_API_SPORT_KEYS (comma-separated provider sport keys), CRON_SECRET

type Json = Record<string, unknown>;
type Candidate = {
  fixture: Json;
  sport: "cricket" | "football";
  bookmaker: string;
  marketKey: string;
  selection: string;
  odds: number;
  score: number;
  capturedAt: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: Json, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const env = (name: string) => Deno.env.get(name) ?? "";
const supabaseUrl = env("SUPABASE_URL").replace(/\/$/, "");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const oddsKey = env("ODDS_API_KEY");

const db = async (table: string, init: RequestInit = {}) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) throw new Error(`${table} ${response.status}: ${String(text).slice(0, 300)}`);
  return data;
};

const oddsApi = async (path: string) => {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `https://api.the-odds-api.com/v4${path}${separator}apiKey=${encodeURIComponent(oddsKey)}`,
    {
      headers: { Accept: "application/json" },
    },
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`The Odds API ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as unknown;
};

const colomboHour = () =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

const updateSlot = () => {
  const hour = colomboHour();
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "noon";
  if (hour >= 16 && hour < 22) return "evening";
  return "manual";
};

const sportForKey = (key: string): "cricket" | "football" | null => {
  if (key.startsWith("cricket_")) return "cricket";
  if (key.startsWith("soccer_") || key.startsWith("football_")) return "football";
  return null;
};

const defaultKeys = [
  "soccer_epl",
  "soccer_uefa_champs_league",
  "cricket_ipl",
  "cricket_test_match",
];
const sportKeys = () =>
  (env("ODDS_API_SPORT_KEYS") || defaultKeys.join(","))
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const iso = (value: unknown) => {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const createRun = async (sport: string, slot: string) => {
  const rows = (await db("sports_update_runs", {
    method: "POST",
    body: JSON.stringify({ sport, slot, status: "running", provider: "the-odds-api" }),
  })) as Json[];
  return String(rows[0].id);
};

const finishRun = async (id: string, patch: Json) => {
  await db(`sports_update_runs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, completed_at: new Date().toISOString() }),
  });
};

const upsertFixture = async (event: Json, sport: string) => {
  const rows = (await db("sports_fixtures?on_conflict=provider,provider_fixture_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      provider: "the-odds-api",
      provider_fixture_id: event.id,
      sport,
      league_key: event.sport_key ?? null,
      league_name: event.sport_title ?? event.sport_key ?? null,
      home_team: event.home_team,
      away_team: event.away_team,
      commence_at: event.commence_time,
      status: new Date(String(event.commence_time)).getTime() > Date.now() ? "upcoming" : "live",
      raw: event,
      updated_at: new Date().toISOString(),
    }),
  })) as Json[];
  return rows[0];
};

const candidatesFromEvent = (event: Json, sport: "cricket" | "football"): Candidate[] => {
  const capturedAt = new Date().toISOString();
  const output: Candidate[] = [];
  const bookmakers = Array.isArray(event.bookmakers) ? event.bookmakers : [];
  for (const book of bookmakers as Json[]) {
    const bookmaker = String(book.title ?? book.key ?? "Bookmaker");
    for (const market of (Array.isArray(book.markets) ? book.markets : []) as Json[]) {
      const marketKey = String(market.key ?? "");
      if (!["h2h", "totals", "spreads"].includes(marketKey)) continue;
      const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
      for (const outcome of outcomes as Json[]) {
        const odds = Number(outcome.price);
        if (!Number.isFinite(odds) || odds <= 1.15 || odds > 4.5) continue;
        const name = String(outcome.name ?? "").trim();
        if (!name || String(outcome.point ?? "").toLowerCase() === "nan") continue;
        // Ranking is deliberately conservative: shorter price + multiple available books.
        output.push({
          fixture: event,
          sport,
          bookmaker,
          marketKey,
          selection: marketKey === "totals" && outcome.point ? `${name} ${outcome.point}` : name,
          odds,
          score: Math.min(0.92, (1 / odds) * 0.82),
          capturedAt,
        });
      }
    }
  }
  return output;
};

const refreshSport = async (sport: "cricket" | "football", keys: string[], slot: string) => {
  const runId = await createRun(sport, slot);
  let fixtureCount = 0;
  let tipCount = 0;
  try {
    const candidates: Candidate[] = [];
    for (const key of keys.filter((item) => sportForKey(item) === sport)) {
      const events = (await oddsApi(
        `/sports/${encodeURIComponent(key)}/odds?regions=eu,uk&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`,
      )) as Json[];
      for (const event of events) {
        const commence = iso(event.commence_time);
        if (!commence || new Date(commence).getTime() < Date.now() + 30 * 60_000) continue;
        const fixture = await upsertFixture(event, sport);
        fixtureCount += 1;
        const fixtureId = String(fixture.id);
        for (const candidate of candidatesFromEvent(event, sport)) {
          const implied = 1 / candidate.odds;
          await db("sports_odds_snapshots", {
            method: "POST",
            body: JSON.stringify({
              fixture_id: fixtureId,
              provider: "the-odds-api",
              bookmaker: candidate.bookmaker,
              market_key: candidate.marketKey,
              selection: candidate.selection,
              decimal_odds: candidate.odds,
              implied_probability: implied,
              captured_at: candidate.capturedAt,
              raw: { sportKey: key },
            }),
          });
          candidates.push({
            ...candidate,
            fixture: { ...event, _fixtureId: fixtureId, _commence: commence },
          });
        }
      }
    }

    const bestBySelection = new Map<string, Candidate>();
    for (const candidate of candidates) {
      const key = `${candidate.fixture.id}:${candidate.marketKey}:${candidate.selection}`;
      const previous = bestBySelection.get(key);
      if (!previous || candidate.score > previous.score) bestBySelection.set(key, candidate);
    }
    const ranked = [...bestBySelection.values()].sort((a, b) => b.score - a.score).slice(0, 5);
    const expiry = new Date(Date.now() + 6 * 60 * 60_000).toISOString();
    for (const [index, candidate] of ranked.entries()) {
      const fixture = candidate.fixture;
      await db("sports_tips", {
        method: "POST",
        body: JSON.stringify({
          update_run_id: runId,
          fixture_id: fixture._fixtureId,
          sport,
          rank: index + 1,
          market_key: candidate.marketKey,
          selection: candidate.selection,
          decimal_odds: candidate.odds,
          score: candidate.score,
          risk_band:
            candidate.score >= 0.55 ? "lower" : candidate.score >= 0.32 ? "medium" : "higher",
          rationale: `Ranked from current ${candidate.bookmaker} market odds; compare the live price before placing any wager.`,
          source: "The Odds API",
          captured_at: candidate.capturedAt,
          expires_at: expiry,
        }),
      });
      tipCount += 1;
    }
    await finishRun(runId, {
      status: tipCount ? "succeeded" : "partial",
      fixture_count: fixtureCount,
      tip_count: tipCount,
    });
    return { runId, sport, fixtureCount, tipCount };
  } catch (error) {
    await finishRun(runId, {
      status: "failed",
      fixture_count: fixtureCount,
      tip_count: tipCount,
      error_message: String(error).slice(0, 500),
    });
    throw error;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!oddsKey || !supabaseUrl || !serviceKey)
    return json({ error: "Sports tips service is not configured." }, 503);
  const secret = env("CRON_SECRET");
  if (secret && request.headers.get("x-cron-secret") !== secret)
    return json({ error: "Unauthorized" }, 401);
  try {
    const slot = updateSlot();
    const keys = sportKeys();
    const results = [];
    for (const sport of ["cricket", "football"] as const) {
      try {
        results.push(await refreshSport(sport, keys, slot));
      } catch (error) {
        results.push({ sport, error: String(error).slice(0, 300) });
      }
    }
    return json({ ok: true, slot, updatedAt: new Date().toISOString(), results });
  } catch (error) {
    return json({ ok: false, error: String(error).slice(0, 500) }, 500);
  }
});
