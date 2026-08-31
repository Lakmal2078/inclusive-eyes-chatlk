import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/fastcash/api";

const copy = {
  en: {
    eyebrow: "FREE SPORTS TIPS",
    title: "Today’s Cricket & Football Picks",
    subtitle: "Data-based ranked picks refreshed three times daily. No pick is a guaranteed win.",
    cricket: "🏏 Cricket",
    football: "⚽ Football",
    updated: "Updated",
    captured: "Odds captured",
    kickoff: "Starts",
    source: "Source",
    noTips: "No quality picks are available in this update window.",
    loading: "Loading latest picks…",
    error: "Tips are temporarily unavailable. Please check again shortly.",
    refresh: "Refresh",
    rank: "Rank",
    risk: "Risk band",
    rationale: "Why it ranked",
    disclaimer:
      "18+ only. Gambling involves financial risk. Set a budget, never chase losses, and verify the live odds before placing any bet. These tips are informational, not financial advice.",
  },
  si: {
    eyebrow: "නොමිලේ ක්‍රීඩා TIPS",
    title: "අද Cricket සහ Football Picks",
    subtitle:
      "දිනකට තුන්වරක් යාවත්කාලීන කරන දත්ත-පාදක ranked picks. කිසිදු pick එකක් ජයග්‍රහණයක් සහතික නොකරයි.",
    cricket: "🏏 Cricket",
    football: "⚽ Football",
    updated: "යාවත්කාලීන කළේ",
    captured: "Odds ගත් වේලාව",
    kickoff: "ආරම්භය",
    source: "මූලාශ්‍රය",
    noTips: "මෙම update window එකේ quality picks නොමැත.",
    loading: "නවතම picks ලබාගනිමින්…",
    error: "Tips තාවකාලිකව ලබාගත නොහැක. ටික වේලාවකින් නැවත බලන්න.",
    refresh: "Refresh",
    rank: "අනුපිළිවෙල",
    risk: "අවදානම් මට්ටම",
    rationale: "Rank වීමට හේතුව",
    disclaimer:
      "වයස 18+ පමණි. Gambling තුළ මුදල් අවදානමක් ඇත. Budget එකක් තබාගන්න, පාඩු පසුපස නොයන්න, bet කිරීමට පෙර live odds පරීක්ෂා කරන්න. මෙය තොරතුරු සඳහා පමණි; මූල්‍ය උපදෙසක් නොවේ.",
  },
  ta: {
    eyebrow: "இலவச விளையாட்டு TIPS",
    title: "இன்றைய Cricket மற்றும் Football Picks",
    subtitle:
      "ஒரு நாளில் மூன்று முறை புதுப்பிக்கப்படும் தரவு அடிப்படையிலான picks. எந்த pick-மும் வெற்றியை உறுதி செய்யாது.",
    cricket: "🏏 Cricket",
    football: "⚽ Football",
    updated: "புதுப்பிப்பு",
    captured: "Odds எடுக்கப்பட்ட நேரம்",
    kickoff: "தொடக்கம்",
    source: "மூலம்",
    noTips: "இந்த update window-ல் தரமான picks இல்லை.",
    loading: "சமீபத்திய picks ஏற்றப்படுகிறது…",
    error: "Tips தற்காலிகமாக கிடைக்கவில்லை. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
    refresh: "Refresh",
    rank: "தரவரிசை",
    risk: "ஆபத்து நிலை",
    rationale: "தரவரிசைக்கான காரணம்",
    disclaimer:
      "18+ மட்டும். Gambling-ல் பண இழப்பு ஆபத்து உள்ளது. Budget நிர்ணயிக்கவும், இழப்பை துரத்த வேண்டாம், bet செய்வதற்கு முன் live odds-ஐ சரிபார்க்கவும். இது தகவல் மட்டும்; நிதி ஆலோசனை அல்ல.",
  },
};

const formatDate = (value, lang) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(
      lang === "si" ? "si-LK" : lang === "ta" ? "ta-LK" : "en-LK",
      {
        timeZone: "Asia/Colombo",
        dateStyle: "medium",
        timeStyle: "short",
      },
    );
  } catch {
    return value;
  }
};

const riskColor = (risk) =>
  risk === "lower" ? "var(--green)" : risk === "medium" ? "#ffc857" : "#ff8b8b";

export default function SportsTips({ lang = "en" }) {
  const t = copy[lang] || copy.en;
  const [sport, setSport] = useState("cricket");
  const [tips, setTips] = useState({ cricket: [], football: [] });
  const [meta, setMeta] = useState({ cricket: null, football: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/sports-tips");
      setTips({ cricket: data.cricket || [], football: data.football || [] });
      setMeta({ cricket: data.meta?.cricket || null, football: data.meta?.football || null });
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  const currentTips = useMemo(() => tips[sport] || [], [tips, sport]);
  const currentMeta = meta[sport];

  return (
    <section className="wizard">
      <p className="eyebrow">{t.eyebrow}</p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1>{t.title}</h1>
          <p style={{ marginBottom: 0 }}>{t.subtitle}</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="green">
          ↻ {t.refresh}
        </button>
      </div>

      <div
        className="agent-details-card"
        style={{ marginTop: 18, borderColor: "rgba(182, 255, 53, 0.35)" }}
      >
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          role="tablist"
          aria-label="Sports tips"
        >
          {[
            ["cricket", t.cricket],
            ["football", t.football],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              role="tab"
              aria-selected={sport === value}
              onClick={() => setSport(value)}
              className={sport === value ? "green" : "blue"}
              style={{ minWidth: 140 }}
            >
              {label}
            </button>
          ))}
        </div>
        {currentMeta?.publishedAt && (
          <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12 }}>
            {t.updated}: {formatDate(currentMeta.publishedAt, lang)} · {currentMeta.count || 0}/5
          </div>
        )}
      </div>

      {loading && <div className="agent-details-card">{t.loading}</div>}
      {!loading && error && (
        <div className="agent-details-card" style={{ borderColor: "#ff6b6b", color: "#ffb0b0" }}>
          {t.error}
        </div>
      )}
      {!loading && !error && currentTips.length === 0 && (
        <div className="agent-details-card">{t.noTips}</div>
      )}

      {!loading && !error && currentTips.length > 0 && (
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          {currentTips.map((tip) => (
            <article
              key={tip.id}
              className="agent-details-card"
              style={{ borderColor: "rgba(34, 199, 255, 0.28)" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div>
                  <span className="pill">
                    #{tip.rank} · {tip.leagueName || tip.leagueKey || sport}
                  </span>
                  <h2 style={{ fontSize: 18, margin: "10px 0 4px" }}>
                    {tip.homeTeam} <span style={{ color: "var(--muted)" }}>vs</span> {tip.awayTeam}
                  </h2>
                  <p style={{ margin: 0, color: "var(--green)", fontWeight: 800 }}>
                    {tip.marketKey}: {tip.selection}
                  </p>
                </div>
                <div style={{ textAlign: "right", minWidth: 84 }}>
                  <strong style={{ display: "block", fontSize: 22 }}>
                    {Number(tip.decimalOdds).toFixed(2)}
                  </strong>
                  <span style={{ fontSize: 11, color: riskColor(tip.riskBand) }}>
                    {t.risk}: {tip.riskBand}
                  </span>
                </div>
              </div>
              <p style={{ margin: "12px 0 8px", color: "var(--ink)", fontSize: 13 }}>
                {tip.rationale}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px 14px",
                  color: "var(--muted)",
                  fontSize: 11,
                }}
              >
                <span>
                  {t.kickoff}: {formatDate(tip.commenceAt, lang)}
                </span>
                <span>
                  {t.captured}: {formatDate(tip.capturedAt, lang)}
                </span>
                <span>
                  {t.source}: {tip.source}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="instructions-note instructions-note--blue" style={{ marginTop: 18 }}>
        {t.disclaimer}
      </div>
    </section>
  );
}
