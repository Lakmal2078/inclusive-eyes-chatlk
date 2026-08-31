/**
 * Fast Cash data layer.
 *
 * The original app talked to an Express server through `api('/api/...')`.
 * This module keeps that call shape but reads and writes through Lovable Cloud
 * so every page component keeps working unchanged.
 */
import { supabase } from "@/integrations/supabase/client";

type Options = { method?: string; body?: string; headers?: Record<string, string> };

export type FastCashUser = {
  id: string;
  email: string | null;
  fullName: string;
  playerId: string | null;
  role: "ADMIN" | "USER";
};

const fail = (message: string, status = 400) => {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  throw err;
};

const parse = (options: Options) => (options.body ? JSON.parse(options.body) : {});

const camelTx = (row: Record<string, unknown>) => ({
  id: row["reference"] as string,
  rowId: row["id"] as string,
  userId: row["user_id"] as string | null,
  type: row["type"] as string,
  status: row["status"] as string,
  amount: Number(row["amount"]),
  playerId: row["player_id"] as string | null,
  paymentMethod: row["payment_method"] as string | null,
  receiptReference: row["receipt_reference"] as string | null,
  receiptImage: row["receipt_image"] as string | null,
  securityCode: row["security_code"] as string | null,
  fullName: row["full_name"] as string | null,
  bank: row["bank"] as string | null,
  accountNumber: row["account_number"] as string | null,
  contactNumber: row["contact_number"] as string | null,
  createdAt: row["created_at"] as string,
  rejectionReason: row["rejection_reason"] as string | null,
  timeline: (row["timeline"] as any[]) ?? [],
});

const camelEvent = (row: Record<string, unknown>) => ({
  id: row["id"] as string,
  status: row["status"] as string,
  note: row["note"] as string | null,
  createdAt: row["created_at"] as string,
});

const camelAccount = (row: Record<string, unknown>) => ({
  id: row["id"] as string,
  name: row["name"] as string,
  number: row["number"] as string,
  icon: row["icon"] as string,
  type: row["type"] as string,
  active: row["active"] as boolean,
});

async function currentUser(): Promise<FastCashUser | null> {
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return null;

  const [{ data: existingProfile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, player_id, email")
      .eq("id", authUser.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", authUser.id),
  ]);

  let profile = existingProfile;
  if (!profile) {
    // First sign-in after email confirmation: create the profile from signup metadata.
    const meta = (authUser.user_metadata ?? {}) as {
      full_name?: string;
      player_id?: string | null;
    };
    const row = {
      id: authUser.id,
      full_name: meta.full_name ?? "",
      player_id: meta.player_id ? String(meta.player_id) : null,
      email: authUser.email ?? null,
    };
    const { data: created } = await supabase
      .from("profiles")
      .upsert(row)
      .select("full_name, player_id, email")
      .maybeSingle();
    profile = created ?? { full_name: row.full_name, player_id: row.player_id, email: row.email };
  }

  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");

  return {
    id: authUser.id,
    email: profile?.email ?? authUser.email ?? null,
    fullName: profile?.full_name || (authUser.email ?? "Player"),
    playerId: profile?.player_id ?? null,
    role: isAdmin ? "ADMIN" : "USER",
  };
}

async function settings() {
  const { data } = await supabase
    .from("app_settings")
    .select("whatsapp_number, min_transaction, max_transaction, promo_code")
    .eq("id", 1)
    .maybeSingle();
  return {
    whatsappNumber: data?.whatsapp_number ?? "+94765865387",
    minTransaction: data?.min_transaction ?? 1000,
    maxTransaction: data?.max_transaction ?? 500000,
    promoCode: data?.promo_code ?? "VGSL",
  };
}

async function submitTransaction(type: "DEPOSIT" | "WITHDRAWAL", body: Record<string, string>) {
  const amount = Number(body["amount"]);
  if (!amount || Number.isNaN(amount)) fail("Please enter a valid amount.");
  if (!body["playerId"]) fail("Please enter your Player ID.");

  const config = await settings();
  if (amount < config.minTransaction || amount > config.maxTransaction) {
    fail(
      `Amount must be between LKR ${config.minTransaction.toLocaleString()} and LKR ${config.maxTransaction.toLocaleString()}.`,
    );
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  const reference = `TXN${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const payload = {
    reference,
    user_id: userId,
    type,
    amount,
    player_id: body["playerId"] ?? null,
    payment_method: body["paymentMethod"] ?? null,
    receipt_reference: body["receiptReference"] ?? null,
    receipt_image: body["receiptImage"] ?? null,
    security_code: body["securityCode"] ?? null,
    full_name: body["fullName"] ?? null,
    bank: body["bank"] ?? null,
    account_number: body["accountNumber"] ?? null,
    contact_number: body["contactNumber"] ?? null,
  };

  // Guests cannot read rows back (no anonymous read access), so never ask for a
  // representation when there is no session — that read is what RLS rejects.
  if (!userId) {
    const { error } = await supabase.from("transactions").insert(payload);
    if (error) fail(error.message);
    return {
      transaction: camelTx({
        ...payload,
        id: reference,
        status: "PENDING",
        created_at: new Date().toISOString(),
      } as Record<string, unknown>),
    };
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select()
    .maybeSingle();
  if (error || !data) fail(error?.message ?? "Could not submit your request.");
  await supabase.from("transaction_events").insert({
    transaction_id: data.id,
    status: "PENDING",
    note: "Request submitted",
    created_by: userId,
  });
  return {
    transaction: camelTx({
      ...(data as Record<string, unknown>),
      timeline: [{ status: "PENDING", note: "Request submitted", created_at: data.created_at }],
    }),
  };
}

function supportReply(message: string) {
  const text = message.toLowerCase();
  if (text.includes("deposit")) {
    return "For a deposit: transfer to one of the agent accounts on the Deposit page, then submit the request with your Player ID, amount and receipt. An agent confirms it after review.";
  }
  if (text.includes("withdraw")) {
    return "For a withdrawal: choose Cash in the 1xBet app (City: Walasmulla, Street: Beliatta Road 24/7), then submit the security code and your bank details on the Withdraw page.";
  }
  if (text.includes("player") || text.includes("id")) {
    return "Your Player ID is shown in the 1xBet app under your account or profile section. It is the numeric ID used for every deposit and withdrawal.";
  }
  if (text.includes("time") || text.includes("long")) {
    return "Requests are reviewed by an agent during service hours. Sending the details on WhatsApp after submitting speeds up the review.";
  }
  return "I can help with deposit and withdrawal requests, finding a Player ID, support and responsible gambling. Account-specific information requires sign-in.";
}

export async function api(url: string, options: Options = {}): Promise<any> {
  const method = (options.method ?? "GET").toUpperCase();

  if (url === "/api/config" && method === "GET") return settings();

  if (url === "/api/auth/me") return { user: await currentUser() };

  if (url === "/api/auth/login" && method === "POST") {
    const body = parse(options);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(body.email ?? "").trim(),
      password: String(body.password ?? ""),
    });
    if (error) fail("Email or password is incorrect.", 401);
    return { user: await currentUser() };
  }

  if (url === "/api/auth/register" && method === "POST") {
    const body = parse(options);
    const email = String(body.email ?? "").trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(body.password ?? ""),
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: body.fullName ?? "", player_id: body.playerId ?? null },
      },
    });
    if (error) fail(error.message);
    // With email confirmation on, signUp returns no session; the profile write
    // would then be rejected. Only write it when the user is actually signed in.
    if (data.user && data.session) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: String(body.fullName ?? ""),
        player_id: body.playerId ? String(body.playerId) : null,
        email,
      });
    }
    if (!data.session) {
      return {
        user: null,
        pendingConfirmation: true,
        message: "Check your email to confirm your account, then sign in.",
      };
    }
    return { user: await currentUser() };
  }

  if (url === "/api/auth/logout" && method === "POST") {
    await supabase.auth.signOut();
    return {};
  }

  if (url === "/api/transactions" && method === "GET") {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) fail(error.message);
    const rows = data ?? [];
    const ids = rows.map((row) => row.id);
    const { data: events } = ids.length
      ? await supabase
          .from("transaction_events")
          .select("*")
          .in("transaction_id", ids)
          .order("created_at", { ascending: true })
      : { data: [] };
    const byTx = new Map<string, any[]>();
    (events ?? []).forEach((event) => {
      const list = byTx.get(event.transaction_id) ?? [];
      list.push(camelEvent(event as Record<string, unknown>));
      byTx.set(event.transaction_id, list);
    });
    return {
      transactions: rows.map((row) =>
        camelTx({
          ...(row as Record<string, unknown>),
          timeline: byTx.get(row.id) ?? [
            { status: row.status, note: "Request submitted", created_at: row.created_at },
          ],
        }),
      ),
    };
  }

  if (url === "/api/notifications" && method === "GET") {
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) return { notifications: [] };
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", auth.data.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) fail(error.message);
    return { notifications: data ?? [] };
  }

  if (url === "/api/notifications/read" && method === "POST") {
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) fail("Sign in required.", 401);
    const body = parse(options);
    const query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.data.user.id);
    const { error } = body.id ? await query.eq("id", body.id) : await query.is("read_at", null);
    if (error) fail(error.message);
    return {};
  }

  if (url === "/api/deposits" && method === "POST")
    return submitTransaction("DEPOSIT", parse(options));
  if (url === "/api/withdrawals" && method === "POST")
    return submitTransaction("WITHDRAWAL", parse(options));

  if (url === "/api/bank-details" && method === "GET") {
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("sort_order", { ascending: true });
    return {
      agentBankDetails: (data ?? []).map((row) => camelAccount(row as Record<string, unknown>)),
    };
  }

  if (url === "/api/support/chat" && method === "POST") {
    const body = parse(options);
    const messages: { role: string; content: string }[] = body.messages ?? [];
    const last = [...messages].reverse().find((m) => m.role === "user");
    return { reply: supportReply(last?.content ?? "") };
  }

  if (url === "/api/sports-tips" && method === "GET") {
    const { data, error } = await supabase
      .from("sports_tips")
      .select(
        "id, sport, rank, market_key, selection, decimal_odds, risk_band, rationale, source, captured_at, published_at, expires_at, sports_fixtures(home_team, away_team, league_key, league_name, commence_at)",
      )
      .lte("published_at", new Date().toISOString())
      .gt("expires_at", new Date().toISOString())
      .order("rank", { ascending: true });
    if (error) fail(error.message);
    const grouped = {
      cricket: [] as Record<string, unknown>[],
      football: [] as Record<string, unknown>[],
    };
    for (const row of data ?? []) {
      const fixture = Array.isArray(row.sports_fixtures)
        ? row.sports_fixtures[0]
        : row.sports_fixtures;
      const item = {
        id: row.id,
        sport: row.sport,
        rank: row.rank,
        marketKey: row.market_key,
        selection: row.selection,
        decimalOdds: Number(row.decimal_odds),
        riskBand: row.risk_band,
        rationale: row.rationale,
        source: row.source,
        capturedAt: row.captured_at,
        publishedAt: row.published_at,
        expiresAt: row.expires_at,
        homeTeam: fixture?.home_team ?? "Home",
        awayTeam: fixture?.away_team ?? "Away",
        leagueKey: fixture?.league_key ?? null,
        leagueName: fixture?.league_name ?? null,
        commenceAt: fixture?.commence_at ?? null,
      };
      if (grouped[row.sport]) grouped[row.sport].push(item);
    }
    return {
      cricket: grouped.cricket.slice(0, 5),
      football: grouped.football.slice(0, 5),
      meta: {
        cricket: grouped.cricket[0]
          ? { publishedAt: grouped.cricket[0].publishedAt, count: grouped.cricket.length }
          : null,
        football: grouped.football[0]
          ? { publishedAt: grouped.football[0].publishedAt, count: grouped.football.length }
          : null,
      },
    };
  }

  if (url === "/api/admin/sports-tips" && method === "GET") {
    const admin = await currentUser();
    if (admin?.role !== "ADMIN") fail("Administrator access required.", 403);
    const [{ data: runs, error: runsError }, { data: tips, error: tipsError }] = await Promise.all([
      supabase
        .from("sports_update_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(30),
      supabase
        .from("sports_tips")
        .select("id, sport, rank, selection, decimal_odds, risk_band, published_at, result")
        .order("published_at", { ascending: false })
        .limit(30),
    ]);
    if (runsError || tipsError)
      fail(
        runsError?.message ?? tipsError?.message ?? "Could not load sports administration data.",
      );
    return { runs: runs ?? [], tips: tips ?? [] };
  }

  if (url === "/api/admin/overview" && method === "GET") {
    const user = await currentUser();
    if (user?.role !== "ADMIN") fail("Administrator access required.", 403);
    const [txRes, accRes, profileRes, config] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("bank_accounts").select("*").order("sort_order", { ascending: true }),
      supabase.from("profiles").select("id, full_name, player_id, email, created_at"),
      settings(),
    ]);
    const transactions = (txRes.data ?? []).map((row) => camelTx(row as Record<string, unknown>));
    return {
      stats: {
        totalUsers: (profileRes.data ?? []).length,
        totalTransactions: transactions.length,
        pending: transactions.filter((tx) => tx.status === "PENDING").length,
        completed: transactions.filter(
          (tx) => tx.status === "COMPLETED" || tx.status === "APPROVED",
        ).length,
        deposits: transactions.filter((tx) => tx.type === "DEPOSIT").length,
        withdrawals: transactions.filter((tx) => tx.type === "WITHDRAWAL").length,
      },
      transactions,
      agentBankDetails: (accRes.data ?? []).map((row) =>
        camelAccount(row as Record<string, unknown>),
      ),
      systemSettings: config,
      users: (profileRes.data ?? []).map((row: Record<string, unknown>) => ({
        id: row["id"],
        fullName: row["full_name"],
        playerId: row["player_id"],
        email: row["email"],
        createdAt: row["created_at"],
      })),
    };
  }

  if (url === "/api/admin/bank-details" && method === "GET") {
    const [{ data }, config] = await Promise.all([
      supabase.from("bank_accounts").select("*").order("sort_order", { ascending: true }),
      settings(),
    ]);
    return {
      agentBankDetails: (data ?? []).map((row) => camelAccount(row as Record<string, unknown>)),
      systemSettings: config,
    };
  }

  if (url === "/api/admin/bank-details" && (method === "PUT" || method === "POST")) {
    const body = parse(options);
    const accounts: ReturnType<typeof camelAccount>[] = body.agentBankDetails ?? [];
    const rows = accounts.map((acc, index) => ({
      id: acc.id,
      name: acc.name,
      number: acc.number,
      icon: acc.icon || "🏦",
      type: acc.type || "BANK",
      active: acc.active !== false,
      sort_order: index + 1,
    }));
    if (rows.length) {
      const { error } = await supabase.from("bank_accounts").upsert(rows);
      if (error) fail(error.message);
    }
    if (body.systemSettings) {
      const { error } = await supabase
        .from("app_settings")
        .update({
          whatsapp_number: body.systemSettings.whatsappNumber,
          min_transaction: Number(body.systemSettings.minTransaction),
          max_transaction: Number(body.systemSettings.maxTransaction),
          promo_code: body.systemSettings.promoCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) fail(error.message);
    }
    return api("/api/admin/bank-details");
  }

  if (url.startsWith("/api/admin/bank-details/") && method === "DELETE") {
    const id = url.split("/").pop()!;
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) fail(error.message);
    return api("/api/admin/bank-details");
  }

  if (url.startsWith("/api/admin/transactions/") && method === "PATCH") {
    const admin = await currentUser();
    if (admin?.role !== "ADMIN") fail("Administrator access required.", 403);
    const reference = url.split("/").pop()!;
    const body = parse(options);
    const nextStatus = String(body.status);
    const rejectionReason =
      nextStatus === "REJECTED"
        ? String(body.rejectionReason ?? "Request could not be verified.")
        : null;
    const { data, error } = await supabase
      .from("transactions")
      .update({ status: nextStatus, rejection_reason: rejectionReason })
      .eq("reference", reference)
      .select()
      .maybeSingle();
    if (error || !data) fail(error?.message ?? "Could not update this request.");
    const eventNote =
      nextStatus === "REJECTED" ? rejectionReason : body.note ? String(body.note) : null;
    await supabase.from("transaction_events").insert({
      transaction_id: data.id,
      status: nextStatus,
      note: eventNote,
      created_by: admin.id,
    });
    if (data.user_id) {
      const title =
        nextStatus === "REJECTED" ? "Request rejected" : `Request ${nextStatus.toLowerCase()}`;
      const message =
        nextStatus === "REJECTED"
          ? `${data.reference}: ${rejectionReason}`
          : `${data.reference} is now ${nextStatus.toLowerCase()}.`;
      await supabase
        .from("notifications")
        .insert({ user_id: data.user_id, transaction_id: data.id, title, message });
    }
    return { transaction: camelTx({ ...(data as Record<string, unknown>), timeline: [] }) };
  }

  if (url === "/api/promotions" && method === "GET") return { promotions: [] };

  return fail("This service is not available.", 503);
}
