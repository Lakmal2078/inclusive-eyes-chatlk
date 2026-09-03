/* Fast Cash page components (ported from the standalone app). */
import React, { useEffect, useRef, useState } from "react";
import { translations, faqListEn, faqListSi, faqListTa } from "@/lib/fastcash/translations.js";
import { api } from "@/lib/fastcash/api";
import ReceiptScanner from "./ReceiptScanner.jsx";
import AdminPanel from "./AdminPanel.jsx";

export { translations };

export const primaryNav = [
  ["🏠", "Home"],
  ["⚡", "Deposit"],
  ["💳", "Withdraw"],
  ["🎲", "1xBet"],
  ["📋", "Transactions"],
];
export const moreNav = [
  ["⚽", "Sports"],
  ["🎰", "Casino"],
  ["🔴", "Live Bet"],
  ["🎁", "Promotions"],
  ["🛡️", "PrivacyPolicy"],
  ["⚙️", "Admin"],
  ["💬", "Support"],
];
export const nav = [...primaryNav, ...moreNav];

export const allKnownPages = [
  "Home",
  "Deposit",
  "Withdraw",
  "1xBet",
  "Transactions",
  "Sports",
  "Casino",
  "Live Bet",
  "Promotions",
  "PrivacyPolicy",
  "Admin",
  "Support",
  "Login",
  "Register",
];

export const getInitialPage = () => {
  if (typeof window === "undefined") return "Home";

  // 1. Check URL Hash (e.g. #/Deposit or #Deposit)
  const hash = window.location.hash.replace(/^#\/?/, "").trim();
  if (hash) {
    const decoded = decodeURIComponent(hash);
    const matched = allKnownPages.find(
      (p) =>
        p.toLowerCase() === decoded.toLowerCase() ||
        p.toLowerCase().replace(/\s+/g, "") === decoded.toLowerCase().replace(/\s+/g, ""),
    );
    if (matched) return matched;
  }

  // 2. Check URL Pathname (e.g. /Deposit)
  const path = window.location.pathname.replace(/^\//, "").replace(/\/$/, "").trim();
  if (path) {
    const decoded = decodeURIComponent(path);
    const matched = allKnownPages.find(
      (p) =>
        p.toLowerCase() === decoded.toLowerCase() ||
        p.toLowerCase().replace(/\s+/g, "") === decoded.toLowerCase().replace(/\s+/g, ""),
    );
    if (matched) return matched;
  }

  // 3. Check localStorage
  const saved = window.localStorage ? window.localStorage.getItem("active_page") : null;
  if (saved && allKnownPages.includes(saved)) {
    return saved;
  }

  return "Home";
};

// --- Helper Utilities ---
export const copyToClipboard = (text, notify, label = "Copied to clipboard!") => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => notify(label))
      .catch(() => {
        fallbackCopy(text);
        notify(label);
      });
  } else {
    fallbackCopy(text);
    notify(label);
  }
};

export const fallbackCopy = (text) => {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand("copy");
  } catch {
    /* ignore */
  }
  document.body.removeChild(el);
};

export const CopyButton = ({ text, label = "Copy", notify, message, t }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    const msg = message || t?.agentAccounts?.accountCopied || "Copied to clipboard!";
    copyToClipboard(text, notify, msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} type="button" className="copy-btn" title={`Copy ${text}`}>
      {copied ? t?.agentAccounts?.copied || "✓ Copied" : `📋 ${label}`}
    </button>
  );
};

export const FIELD_HINTS = {
  amount: { inputMode: "numeric", autoComplete: "off" },
  contactNumber: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  fullName: { autoComplete: "name" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  playerId: { inputMode: "numeric", autoComplete: "off" },
  accountNumber: { inputMode: "numeric", autoComplete: "off" },
};

export const Field = ({
  label,
  name,
  type,
  required = true,
  form,
  setForm,
  placeholder,
  min,
  max,
}) => {
  const hint = FIELD_HINTS[name] || {};
  const resolvedType = type || hint.type || "text";
  const errorId = `${name}-hint`;

  return (
    <label htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        required={required}
        type={resolvedType}
        inputMode={hint.inputMode}
        autoComplete={hint.autoComplete || "off"}
        placeholder={placeholder}
        min={min}
        max={max}
        aria-describedby={placeholder ? errorId : undefined}
        value={form[name] || ""}
        onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
        onWheel={(e) => resolvedType === "number" && e.currentTarget.blur()}
      />
    </label>
  );
};

export const PromoBanner = ({ notify, t }) => {
  const promoCode = "VGSL";
  const registerUrl = "https://1xbet.com/en/user/registration/";

  return (
    <div
      className="promo-banner"
      style={{
        borderRadius: "16px",
        padding: "14px 18px",
        margin: "0 0 20px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "24px" }}>🎁</span>
        <div>
          <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>
            {t?.promoBanner?.title || "🔥 Official 1xBet Promo Code:"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
            <span style={{ font: "800 20px Syne", color: "var(--green)", letterSpacing: "0.08em" }}>
              {promoCode}
            </span>
            <span className="pill" style={{ padding: "3px 8px", fontSize: "11px" }}>
              {t?.promoBanner?.bonus || "✨ 130% Welcome Bonus"}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <CopyButton
          text={promoCode}
          label={t?.promoBanner?.copyBtn || "Copy VGSL"}
          notify={notify}
          message={t?.promotionsPage?.copyCodeSuccess || "Promo Code VGSL copied!"}
          t={t}
        />
        <a
          href={registerUrl}
          target="_blank"
          rel="noreferrer"
          className="green"
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            fontWeight: "800",
            fontSize: "13px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {t?.promoBanner?.registerBtn || "Register on 1xBet"}
        </a>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage = ({ t, embedded = false }) => {
  const Title = embedded ? "h2" : "h1";
  const SectionTitle = embedded ? "h3" : "h2";
  return (
    <section className="panel content-section">
      <span className="eyebrow">{t?.privacyPage?.eyebrow || "Privacy Policy"}</span>
      <Title style={{ fontSize: "32px", margin: "16px 0 8px" }}>
        {t?.privacyPage?.title || "Privacy Policy - Fast_X Official Sri Lanka"}
      </Title>
      <p style={{ color: "var(--muted)", fontSize: "15px", marginBottom: "28px" }}>
        {t?.privacyPage?.subtitle}
      </p>
      <div style={{ display: "grid", gap: "20px" }}>
        <article
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <SectionTitle style={{ color: "var(--green)", margin: "0 0 10px", fontSize: "17px" }}>
            {t?.privacyPage?.section1Title}
          </SectionTitle>
          <p style={{ fontSize: "14px", margin: "0 0 12px", color: "var(--ink)" }}>
            {t?.privacyPage?.section1Desc}
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "8px",
              fontSize: "14px",
              color: "var(--muted)",
            }}
          >
            <li>{t?.privacyPage?.s1Item1}</li>
            <li>{t?.privacyPage?.s1Item2}</li>
            <li>{t?.privacyPage?.s1Item3}</li>
            <li>{t?.privacyPage?.s1Item4}</li>
          </ul>
        </article>
        <article
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <SectionTitle style={{ color: "var(--blue)", margin: "0 0 10px", fontSize: "17px" }}>
            {t?.privacyPage?.section2Title}
          </SectionTitle>
          <p style={{ fontSize: "14px", margin: "0 0 12px", color: "var(--ink)" }}>
            {t?.privacyPage?.section2Desc}
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "8px",
              fontSize: "14px",
              color: "var(--muted)",
            }}
          >
            <li>{t?.privacyPage?.s2Item1}</li>
            <li>{t?.privacyPage?.s2Item2}</li>
          </ul>
        </article>
        <article
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <SectionTitle style={{ color: "var(--green)", margin: "0 0 10px", fontSize: "17px" }}>
            {t?.privacyPage?.section3Title}
          </SectionTitle>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "8px",
              fontSize: "14px",
              color: "var(--muted)",
            }}
          >
            <li>{t?.privacyPage?.s3Item1}</li>
            <li>{t?.privacyPage?.s3Item2}</li>
          </ul>
        </article>
        <article
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "20px",
            borderRadius: "14px",
            border: "1px solid var(--line)",
          }}
        >
          <SectionTitle style={{ color: "#ffc857", margin: "0 0 10px", fontSize: "17px" }}>
            {t?.privacyPage?.section4Title}
          </SectionTitle>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "8px",
              fontSize: "14px",
              color: "var(--muted)",
            }}
          >
            <li>{t?.privacyPage?.s4Item1}</li>
            <li>{t?.privacyPage?.s4Item2}</li>
            <li>{t?.privacyPage?.s4Item3}</li>
          </ul>
        </article>
      </div>
    </section>
  );
};

// --- Header & Layout ---
export const Header = ({
  page,
  move,
  user,
  logout,
  drawer,
  setDrawer,
  theme,
  toggleTheme,
  lang,
  setLang,
  t,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const drawerRef = useRef(null);
  const drawerCloseRef = useRef(null);

  // Move focus into the drawer when it opens, and trap Tab inside it.
  useEffect(() => {
    if (drawer && drawerCloseRef.current) drawerCloseRef.current.focus();
  }, [drawer]);

  const onDrawerKeyDown = (e) => {
    if (e.key === "Escape") {
      setDrawer(false);
      return;
    }
    if (e.key !== "Tab" || !drawerRef.current) return;
    const items = drawerRef.current.querySelectorAll(
      'button, a[href], input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreOpen && !e.target.closest(".nav-dropdown-wrap")) {
        setMoreOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [moreOpen]);

  const isMoreActive = moreNav.some(([, p]) => page === p);

  return (
    <>
      <header>
        <button className="brand" onClick={() => move("Home")}>
          FAST <i>CASH</i>
          <small>{t.header.brandSubtitle}</small>
        </button>
        <nav>
          {primaryNav.map(([, p]) => (
            <button className={page === p ? "active" : ""} onClick={() => move(p)} key={p}>
              {t.nav[p] || p}
            </button>
          ))}
          <div className="nav-dropdown-wrap">
            <button
              type="button"
              className={`nav-dropdown-btn ${isMoreActive ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((prev) => !prev);
              }}
              aria-expanded={moreOpen}
            >
              {isMoreActive ? t.nav[page] || page : t?.nav?.More || "More"}{" "}
              <span style={{ fontSize: "10px", opacity: 0.8 }}>{moreOpen ? "▲" : "▼"}</span>
            </button>
            {moreOpen && (
              <div className="nav-dropdown-menu">
                {moreNav.map(([icon, p]) => (
                  <button
                    type="button"
                    className={`nav-dropdown-item ${page === p ? "active" : ""}`}
                    onClick={() => {
                      move(p);
                      setMoreOpen(false);
                    }}
                    key={p}
                  >
                    <span>{icon}</span> {t.nav[p] || p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="head-actions">
          {/* Multi-language Selector */}
          <div
            className="lang-switcher-wrap"
            style={{
              display: "flex",
              gap: "2px",
              background: "rgba(255,255,255,0.06)",
              padding: "2px",
              borderRadius: "10px",
              border: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              style={{
                padding: "6px 9px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "700",
                background: lang === "en" ? "var(--blue)" : "transparent",
                color: lang === "en" ? "#001720" : "var(--muted)",
                cursor: "pointer",
              }}
              onClick={() => setLang("en")}
              title="English"
            >
              EN
            </button>
            <button
              type="button"
              style={{
                padding: "6px 9px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "700",
                background: lang === "si" ? "var(--blue)" : "transparent",
                color: lang === "si" ? "#001720" : "var(--muted)",
                cursor: "pointer",
              }}
              onClick={() => setLang("si")}
              title="සිංහල"
            >
              SI
            </button>
            <button
              type="button"
              style={{
                padding: "6px 9px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "700",
                background: lang === "ta" ? "var(--blue)" : "transparent",
                color: lang === "ta" ? "#001720" : "var(--muted)",
                cursor: "pointer",
              }}
              onClick={() => setLang("ta")}
              title="தமிழ்"
            >
              TA
            </button>
          </div>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
            title={theme === "dark" ? t.header.switchToLight : t.header.switchToDark}
          >
            {theme === "dark" ? t.header.lightMode : t.header.darkMode}
          </button>
          {user?.role === "ADMIN" && (
            <button
              type="button"
              className={`admin-header-btn ${page === "Admin" ? "active" : ""}`}
              onClick={() => move("Admin")}
              aria-current={page === "Admin" ? "page" : undefined}
            >
              <span aria-hidden="true">⚙️</span> {t?.nav?.Admin || "Admin"}
            </button>
          )}
          <button onClick={() => move("Deposit")} className="green">
            {t.header.deposit}
          </button>
          <button onClick={() => move("Withdraw")} className="blue">
            {t.header.withdraw}
          </button>

          {/* Desktop User / Logout Action */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                className="head-user-badge"
                title={`${user.fullName} (${user.playerId || t.header.notSaved})`}
              >
                <span style={{ color: "var(--green)" }}>●</span>
                <span className="head-user-name">{user.fullName.split(" ")[0]}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="logout-btn"
                title={t?.header?.logout || "Log Out"}
              >
                <span>🚪</span> {t?.header?.logout || "Log Out"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => move("Login")}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                fontWeight: "700",
                fontSize: "12px",
              }}
            >
              {t?.nav?.Login || "Login"}
            </button>
          )}
        </div>
        <button
          type="button"
          className="hamburger"
          aria-label="Open menu"
          aria-expanded={drawer}
          aria-controls="mobile-drawer"
          onClick={() => setDrawer(true)}
        >
          ☰
        </button>
      </header>

      <aside
        id="mobile-drawer"
        ref={drawerRef}
        className={drawer ? "drawer open" : "drawer"}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!drawer}
        onKeyDown={onDrawerKeyDown}
      >
        <button
          type="button"
          className="close"
          aria-label="Close menu"
          ref={drawerCloseRef}
          onClick={() => setDrawer(false)}
        >
          ×
        </button>
        <div className="brand">
          FAST <i>CASH</i>
        </div>

        {/* Menu Promo Banner */}
        <div
          style={{
            background: "rgba(182, 255, 53, 0.08)",
            border: "1px solid rgba(182, 255, 53, 0.35)",
            borderRadius: "12px",
            padding: "10px 12px",
            margin: "6px 0 10px",
            display: "grid",
            gap: "6px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "700" }}>
            {t?.promoBanner?.title || "🔥 Official 1xBet Promo Code"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "var(--green)", font: "800 16px Syne", letterSpacing: "1px" }}>
              VGSL
            </strong>
            <a
              href="https://1xbet.com/en/user/registration/"
              target="_blank"
              rel="noreferrer"
              className="green"
              style={{
                padding: "5px 10px",
                borderRadius: "7px",
                fontSize: "11px",
                fontWeight: "800",
                textDecoration: "none",
              }}
            >
              {t?.promoBanner?.registerBtn || "Register"}
            </a>
          </div>
        </div>

        {nav.map(([icon, p]) => (
          <button className={page === p ? "active" : ""} onClick={() => move(p)} key={p}>
            <b>{icon}</b>
            {t.nav[p] || p}
          </button>
        ))}

        <div className="drawer-bottom">
          <div className="lang-switch" role="group" aria-label="Language">
            <button
              type="button"
              className={`lang-btn ${lang === "en" ? "is-active" : ""}`}
              onClick={() => {
                setLang("en");
                setDrawer(false);
              }}
            >
              English
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === "si" ? "is-active" : ""}`}
              onClick={() => {
                setLang("si");
                setDrawer(false);
              }}
            >
              සිංහල
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === "ta" ? "is-active" : ""}`}
              onClick={() => {
                setLang("ta");
                setDrawer(false);
              }}
            >
              தமிழ்
            </button>
          </div>

          <button type="button" className="theme-toggle-btn drawer-action" onClick={toggleTheme}>
            {theme === "dark" ? t.header.switchToLight : t.header.switchToDark}
          </button>

          {user ? (
            <div className="drawer-user-card">
              <div className="drawer-user-card__top">
                <div>
                  <div className="drawer-user-card__name">👤 {user.fullName}</div>
                  <small className="drawer-user-card__id">
                    {t.header.playerId}: {user.playerId || t.header.notSaved}
                  </small>
                </div>
                {user.role === "ADMIN" && (
                  <button
                    type="button"
                    className="admin-pill"
                    onClick={() => {
                      move("Admin");
                      setDrawer(false);
                    }}
                  >
                    ADMIN
                  </button>
                )}
              </div>
              <button type="button" className="logout-btn drawer-action" onClick={logout}>
                <span>🚪</span> {t?.header?.logout || "Log Out"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="drawer-action drawer-action--outline"
              onClick={() => {
                move("Login");
                setDrawer(false);
              }}
            >
              {t.header.loginRegister}
            </button>
          )}

          <button
            type="button"
            className="green drawer-action"
            onClick={() => {
              move("Support");
              setDrawer(false);
            }}
          >
            {t.header.contactAgent}
          </button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
    </>
  );
};

// --- Content Components ---
export const Home = ({ move, notify, t }) => (
  <>
    <PromoBanner notify={notify} t={t} />
    <section className="hero">
      <span className="pill">{t.hero.pill}</span>
      <h1>
        {t.hero.titleStart}
        <em>{t.hero.titleEm}</em>
        {t.hero.titleEnd}
      </h1>
      <p>{t.hero.subtitle}</p>
      <div className="actions">
        <button className="green" onClick={() => move("Deposit")}>
          {t.hero.depositBtn}
        </button>
        <button className="blue" onClick={() => move("Withdraw")}>
          {t.hero.withdrawBtn}
        </button>
        <button onClick={() => move("Support")}>{t.hero.contactBtn}</button>
      </div>
    </section>
    <section className="features">
      {[
        ["⚡", t.features.fastDeposits, t.features.fastDepositsDesc],
        ["💳", t.features.quickWithdrawals, t.features.quickWithdrawalsDesc],
        ["💬", t.features.support247, t.features.support247Desc],
        ["🛡️", t.features.secureAssistance, t.features.secureAssistanceDesc],
      ].map((x) => (
        <article key={x[1]}>
          <b aria-hidden="true">{x[0]}</b>
          <h2>{x[1]}</h2>
          <p>{x[2]}</p>
        </article>
      ))}
    </section>
    <div className="content-sections">
      <Info t={t} />
      <PrivacyPolicyPage t={t} embedded />
      <Responsible t={t} />
    </div>
  </>
);

export const Info = ({ t }) => (
  <section className="panel content-section">
    <h2>{t.info.title}</h2>
    <p>{t.info.desc1}</p>
    <div className="chips">
      {t.info.chips.map((x) => (
        <span key={x}>{x}</span>
      ))}
    </div>
    <p>{t.info.desc2}</p>
  </section>
);

export const Responsible = ({ t }) => (
  <section className="responsible content-section">
    <h2>{t.responsible.title}</h2>
    <p>{t.responsible.desc}</p>
  </section>
);

export const Empty = ({ text, action, t }) => (
  <div className="empty">
    <p>{text}</p>
    <button onClick={action}>{t?.empty?.continue || "Continue"}</button>
  </div>
);

export const maskNumber = (str) => {
  if (!str) return "";
  const s = String(str).trim();
  if (s.length <= 8) {
    return s.slice(0, 4) + "•".repeat(Math.max(2, s.length - 4));
  }
  if (s.length <= 11) {
    return s.slice(0, 4) + " •••• " + s.slice(-3);
  }
  const maskedLength = Math.max(4, s.length - 8);
  return s.slice(0, 4) + " " + "•".repeat(maskedLength) + " " + s.slice(-4);
};

export const defaultAgentAccounts = [
  { id: "boc", name: "BOC (Walasmulla)", number: "95645895", icon: "🏛️", type: "BANK" },
  { id: "peoples", name: "PEOPLE'S BANK", number: "120200380030196", icon: "🏛️", type: "BANK" },
  { id: "sampath", name: "SAMPATH BANK", number: "105456146706", icon: "🏛️", type: "BANK" },
  { id: "lolc", name: "LOLC BANK", number: "01210012722", icon: "🏛️", type: "BANK" },
  { id: "ipay_1", name: "iPay Mobile 1", number: "0740452530", icon: "📱", type: "IPAY" },
  { id: "ipay_2", name: "iPay Mobile 2", number: "0703346455", icon: "📱", type: "IPAY" },
];

export const formattedFullDetails = `🏛️ BOC (Walasmulla): 95645895\n🏛️ PEOPLE'S BANK: 120200380030196\n🏛️ SAMPATH BANK: 105456146706\n🏛️ LOLC BANK: 01210012722\n\n📱 iPay: 0740452530 / 0703346455`;

export const AgentAccountRow = ({ acc, notify, t }) => {
  const [revealed, setRevealed] = useState(false);
  const isIpay = String(acc.type || "").toUpperCase() === "IPAY";
  const initials = String(acc.name || "?")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className={`bank-card ${isIpay ? "bank-card--ipay" : "bank-card--bank"}`}>
      <div className="bank-card__head">
        <span className="bank-badge" aria-hidden="true">
          {initials}
        </span>
        <div className="bank-card__meta">
          <span className="bank-card__name">{acc.name}</span>
          <span className="bank-chip">{isIpay ? "MOBILE" : "BANK"}</span>
        </div>
      </div>

      <div className="bank-number-row">
        <strong className={`bank-number ${revealed ? "is-revealed" : ""}`}>
          {revealed ? acc.number : maskNumber(acc.number)}
        </strong>
      </div>

      <div className="bank-actions">
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="toggle-btn bank-action"
          title={revealed ? t.agentAccounts.hideTitle : t.agentAccounts.showTitle}
        >
          {revealed ? t.agentAccounts.hide : t.agentAccounts.show}
        </button>
        <CopyButton
          text={acc.number}
          label={t.agentAccounts.copy}
          notify={notify}
          message={`${acc.name} ${t.agentAccounts.accountCopied}`}
          t={t}
        />
      </div>
    </div>
  );
};

export const AgentAccountsCard = ({ config, notify, title, t }) => {
  const accounts = Array.isArray(config?.agentBankDetails)
    ? config.agentBankDetails
    : defaultAgentAccounts;
  const cardTitle = title || t.agentAccounts.title;
  const copyText = accounts.map((a) => `${a.icon || "🏦"} ${a.name}: ${a.number}`).join("\n");

  return (
    <div className="agent-details-card">
      <div className="agent-card__header">
        <h2>{cardTitle}</h2>
        <span className="agent-card__badge">{t.agentAccounts.maskedBadge}</span>
      </div>
      <p className="agent-card__desc">{t.agentAccounts.desc}</p>

      <div className="bank-list">
        {accounts.map((acc) => (
          <AgentAccountRow key={acc.id} acc={acc} notify={notify} t={t} />
        ))}
      </div>

      <div className="agent-detail-actions">
        <CopyButton
          text={copyText || formattedFullDetails}
          label={t.agentAccounts.copyAll}
          notify={notify}
          message={t.agentAccounts.copyAllSuccess}
          t={t}
        />
      </div>
    </div>
  );
};

export const getDepositInstructionText = (lang) => {
  if (lang === "si") {
    return `1xBet Deposit පියවර:\n1. පහත නිල Agent ගිණුමකට මුදල් තැන්පත් කරන්න (BOC, People's Bank, Sampath, LOLC) හෝ iPay.\n2. ඔබගේ 1xBet Player ID, මුදල සහ Payment Method ඇතුළත් කරන්න.\n3. 'Submit deposit request' ක්ලික් කර ඔබගේ Request ID ලබා ගන්න.\n24/7 ක්ෂණික සේවාව!`;
  } else if (lang === "ta") {
    return `1xBet Deposit வழிகாட்டி:\n1. எமது வங்கி கணக்குகளுக்கு (BOC, People's Bank, Sampath, LOLC) அல்லது iPay மூலம் பணம் செலுத்துங்கள்.\n2. உங்கள் 1xBet Player ID, தொகை மற்றும் செலுத்திய முறையை உள்ளிடவும்.\n3. 'Submit deposit request' கிளிக் செய்து Request ID பெறுங்கள்.\n24/7 விரைவான சேவை!`;
  }
  return `1xBet Deposit Steps:\n1. Deposit money into any of our official agent bank accounts (BOC, People's Bank, Sampath, LOLC) or iPay numbers.\n2. Enter your 1xBet Player ID, amount, and payment method in the form below.\n3. Click 'Submit deposit request' to receive your Request ID.\n24/7 Fast & Reliable Deposit Service!`;
};

export const DepositInstructionsCard = ({ notify, lang, t }) => (
  <div className="agent-details-card instructions-card instructions-card--green">
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px",
      }}
    >
      <h2 style={{ color: "var(--green)", fontSize: "18px", margin: 0 }}>
        {t.depositPage.stepsTitle}
      </h2>
      {notify && (
        <CopyButton
          text={getDepositInstructionText(lang)}
          label={t.depositPage.copyInstructionsBtn}
          notify={notify}
          message={t.depositPage.copyInstructionsSuccess}
          t={t}
        />
      )}
    </div>
    <div className="instructions-body">
      <p style={{ margin: "0 0 10px", fontWeight: "700", color: "var(--green)" }}>
        {t.depositPage.stepsHeader}
      </p>
      <div className="instructions-steps">
        <div>{t.depositPage.step1}</div>
        <div>{t.depositPage.step2}</div>
        <div>{t.depositPage.step3}</div>
      </div>
      <div className="instructions-note instructions-note--green">{t.depositPage.stepsNote}</div>
    </div>
  </div>
);

export const Deposit = ({ submit, form, setForm, config, notify, lang, t }) => {
  const handleDataExtracted = (extracted) => {
    setForm((prev) => {
      const updated = { ...prev };
      if (extracted.amount) {
        updated.amount = extracted.amount;
      }
      if (extracted.reference) {
        updated.receiptReference = extracted.reference;
      }
      if (extracted.paymentMethod && !prev.paymentMethod) {
        updated.paymentMethod = extracted.paymentMethod;
      }
      return updated;
    });
  };

  return (
    <section className="wizard">
      <p className="eyebrow">{t.depositPage.eyebrow}</p>
      <h1>{t.depositPage.title}</h1>
      <p>{t.depositPage.subtitle}</p>
      <DepositInstructionsCard notify={notify} lang={lang} t={t} />
      <AgentAccountsCard config={config} notify={notify} title={t.agentAccounts.title} t={t} />

      {/* AI OCR Receipt Scanner Component */}
      <ReceiptScanner
        onDataExtracted={handleDataExtracted}
        onImageReady={(dataUrl) => setForm((prev) => ({ ...prev, receiptImage: dataUrl }))}
        receiptImage={form.receiptImage}
        onRemoveImage={() =>
          setForm((prev) => ({ ...prev, receiptImage: null, receiptReference: "" }))
        }
        notify={notify}
        lang={lang}
        t={t}
      />

      <form onSubmit={(e) => submit("Deposit", e)}>
        <Field
          label={t.depositPage.playerIdLabel}
          name="playerId"
          placeholder="e.g. 12345678"
          form={form}
          setForm={setForm}
        />
        <Field
          label={t.depositPage.amountLabel}
          name="amount"
          type="number"
          min={config?.minTransaction || 100}
          max={config?.maxTransaction || 500000}
          placeholder="e.g. 5000"
          form={form}
          setForm={setForm}
        />
        <label>
          {t.depositPage.methodLabel}
          <select
            required
            value={form.paymentMethod || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
          >
            <option value="">{t.depositPage.chooseMethod}</option>
            <option value="BANK_TRANSFER">{t.depositPage.bankTransfer}</option>
            <option value="MOBILE_BANKING">{t.depositPage.mobileBanking}</option>
            <option value="OTHER">{t.depositPage.otherMethod}</option>
          </select>
        </label>
        {form.receiptReference && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(34, 199, 255, 0.1)",
              border: "1px solid rgba(34, 199, 255, 0.3)",
              borderRadius: "10px",
              fontSize: "13px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--muted)" }}>Receipt Ref:</span>
            <span style={{ fontFamily: "monospace", fontWeight: "700", color: "var(--blue)" }}>
              {form.receiptReference}
            </span>
          </div>
        )}
        <button className="green">{t.depositPage.submitBtn}</button>
      </form>
      <small>
        {t.depositPage.limits} {config?.minTransaction?.toLocaleString() || 1000} -{" "}
        {config?.maxTransaction?.toLocaleString() || 500000}.
      </small>
    </section>
  );
};

export const getWithdrawalInstructionText = (lang) => {
  if (lang === "si") {
    return `1xBet මුදල් ලබාගැනීමේ පියවර:\n1. 1xBet App එකෙහි Withdraw වෙත ගොස් 'Cash' තෝරන්න.\n2. City ලෙස Walasmulla සහ Street ලෙස Beliatta Road 24/7 තෝරන්න.\n3. ලැබෙන Security Code එක සහ ඔබගේ Player ID මෙහි ඇතුළත් කරන්න.\nස්ථානය: Walasmulla, Beliatta Road (24/7 Service)`;
  } else if (lang === "ta") {
    return `1xBet பணத்தை திரும்பப் பெறும் வழிமுறை:\n1. 1xBet செயலியில் Withdraw சென்று "Cash" தேர்ந்தெடுக்கவும்.\n2. City: Walasmulla மற்றும் Street: Beliatta Road 24/7 தேர்வு செய்யவும்.\n3. Security Code மற்றும் Player ID இங்கு உள்ளிடவும்.\nஇடம்: Walasmulla, Beliatta Road (24/7 சேவை)`;
  }
  return `Follow these steps to request a cash withdrawal:\n1. Open 1xBet App, go to Withdraw and select 'Cash'.\n2. Select City as Walasmulla and Street as Beliatta Road 24/7.\n3. Enter the Security Code and your Player ID in the form below.\nOur Location: Walasmulla, Beliatta Road (24/7 Service)`;
};

export const WithdrawalInstructionsCard = ({ notify, lang, t }) => (
  <div className="agent-details-card instructions-card instructions-card--blue">
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px",
      }}
    >
      <h2 style={{ color: "var(--blue)", fontSize: "18px", margin: 0 }}>
        {t.withdrawPage.stepsTitle}
      </h2>
      {notify && (
        <CopyButton
          text={getWithdrawalInstructionText(lang)}
          label={t.withdrawPage.copyInstructionsBtn}
          notify={notify}
          message={t.withdrawPage.copyInstructionsSuccess}
          t={t}
        />
      )}
    </div>
    <div className="instructions-body">
      <p style={{ margin: "0 0 10px", fontWeight: "700", color: "var(--green)" }}>
        {t.withdrawPage.stepsHeader}
      </p>
      <div className="instructions-steps">
        <div>{t.withdrawPage.step1}</div>
        <div>{t.withdrawPage.step2}</div>
        <div>{t.withdrawPage.step3}</div>
      </div>
      <div className="instructions-note instructions-note--blue">{t.withdrawPage.location}</div>
    </div>
  </div>
);

export const Withdraw = ({ submit, form, setForm, notify, lang, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.withdrawPage.eyebrow}</p>
    <h1>{t.withdrawPage.title}</h1>
    <p>{t.withdrawPage.subtitle}</p>
    <WithdrawalInstructionsCard notify={notify} lang={lang} t={t} />
    <form onSubmit={(e) => submit("Withdraw", e)}>
      <Field
        label={t.withdrawPage.playerIdLabel}
        name="playerId"
        placeholder="e.g. 12345678"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.withdrawPage.securityCodeLabel}
        name="securityCode"
        required={false}
        placeholder="e.g. 48291"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.withdrawPage.fullNameLabel}
        name="fullName"
        placeholder="e.g. A. B. Perera"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.withdrawPage.bankLabel}
        name="bank"
        placeholder="e.g. Commercial Bank"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.withdrawPage.accountNumberLabel}
        name="accountNumber"
        placeholder="e.g. 8001234567"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.withdrawPage.amountLabel}
        name="amount"
        type="number"
        min={100}
        max={500000}
        placeholder="e.g. 5000"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.withdrawPage.contactLabel}
        name="contactNumber"
        required={false}
        placeholder="e.g. 0771234567"
        form={form}
        setForm={setForm}
      />
      <button className="blue">{t.withdrawPage.submitBtn}</button>
    </form>
  </section>
);

export const getWhatsAppUrl = (tx, lang = "en", user = null) => {
  const phone = "94765865387";
  if (!tx) {
    const userPlayerId = user?.playerId;
    const userId = user?.id;
    const userInfoStr = userPlayerId
      ? `\n👤 Player ID: ${userPlayerId}`
      : userId && userId !== "GUEST"
        ? `\n👤 User ID: ${userId}`
        : "";

    let generalMsg = "";
    if (lang === "si") {
      generalMsg = `ආයුබෝවන් Fast Cash Agent!\nමට 1xBet Deposit / Withdrawal සඳහා සහය අවශ්‍යයි.${userInfoStr}`;
    } else if (lang === "ta") {
      generalMsg = `வணக்கம் Fast Cash Agent!\nஎனக்கு 1xBet உதவி தேவைப்படுகிறது.${userInfoStr}`;
    } else {
      generalMsg = `Hello Fast Cash Agent!\nI need assistance with 1xBet Deposit / Withdrawal.${userInfoStr}`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(generalMsg)}`;
  }

  const txTypeRaw = String(tx.type || "").toUpperCase();
  const isDeposit = txTypeRaw.includes("DEP") || txTypeRaw === "DEPOSIT";
  const resolvedPlayerId = tx.playerId || user?.playerId || "N/A";
  const resolvedUserId = tx.userId || user?.id || null;
  const refId = tx.id || "N/A";
  const formattedAmount = Number(tx.amount || 0).toLocaleString();
  const dateStr = tx.createdAt ? new Date(tx.createdAt) : new Date();

  let message = "";
  if (lang === "si") {
    if (isDeposit) {
      message =
        `⚡ *නව තැන්පතු ඉල්ලීම - FAST CASH*\n` +
        `----------------------------------\n` +
        `🔖 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== "GUEST" ? `🆔 *User ID:* ${resolvedUserId}\n` : "") +
        `💰 *මුදල:* LKR ${formattedAmount}\n` +
        `🏦 *ගෙවූ ක්‍රමය:* ${tx.paymentMethod || "Bank Deposit"}\n` +
        (tx.receiptReference ? `🧾 *රිසිට්පත් Ref:* ${tx.receiptReference}\n` : "") +
        `${tx.receiptImage ? "📸 *රිසිට්පත:* Portal එකෙහි අමුණා ඇත\n" : ""}` +
        `📅 *දිනය:* ${dateStr.toLocaleString("si-LK")}\n\n` +
        `කරුණාකර මගේ තැන්පතුව තහවුරු කරන්න. ස්තූතියි!`;
    } else {
      message =
        `💳 *නව මුදල් ලබාගැනීමේ ඉල්ලීම - FAST CASH*\n` +
        `----------------------------------\n` +
        `🔖 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== "GUEST" ? `🆔 *User ID:* ${resolvedUserId}\n` : "") +
        `🔐 *Security Code:* ${tx.securityCode || "N/A"}\n` +
        `👤 *නම:* ${tx.fullName || "N/A"}\n` +
        `🏦 *බැංකුව:* ${tx.bank || "N/A"}\n` +
        `🔢 *ගිණුම් අංකය:* ${tx.accountNumber || "N/A"}\n` +
        `💰 *මුදල:* LKR ${formattedAmount}\n` +
        `📞 *දුරකථන:* ${tx.contactNumber || "N/A"}\n` +
        `📅 *දිනය:* ${dateStr.toLocaleString("si-LK")}\n\n` +
        `කරුණාකර මුදල් මගේ ගිණුමට බැර කරන්න. ස්තූතියි!`;
    }
  } else if (lang === "ta") {
    if (isDeposit) {
      message =
        `⚡ *புதிய வைப்பு கோரிக்கை - FAST CASH*\n` +
        `----------------------------------\n` +
        `🔖 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== "GUEST" ? `🆔 *User ID:* ${resolvedUserId}\n` : "") +
        `💰 *தொகை:* LKR ${formattedAmount}\n` +
        `🏦 *முறை:* ${tx.paymentMethod || "Bank Deposit"}\n` +
        (tx.receiptReference ? `🧾 *Receipt Ref:* ${tx.receiptReference}\n` : "") +
        `${tx.receiptImage ? "📸 *ரசீது இணைக்கப்பட்டுள்ளது*\n" : ""}` +
        `📅 *தேதி:* ${dateStr.toLocaleString("ta-LK")}\n\n` +
        `தயவுசெய்து எனது வைப்பை சரிபார்க்கவும். நன்றி!`;
    } else {
      message =
        `💳 *புதிய பணப் பரிமாற்ற கோரிக்கை - FAST CASH*\n` +
        `----------------------------------\n` +
        `🔖 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== "GUEST" ? `🆔 *User ID:* ${resolvedUserId}\n` : "") +
        `🔐 *Security Code:* ${tx.securityCode || "N/A"}\n` +
        `👤 *பெயர்:* ${tx.fullName || "N/A"}\n` +
        `🏦 *வங்கி:* ${tx.bank || "N/A"}\n` +
        `🔢 *கணக்கு எண்:* ${tx.accountNumber || "N/A"}\n` +
        `💰 *தொகை:* LKR ${formattedAmount}\n` +
        `📞 *தொடர்பு:* ${tx.contactNumber || "N/A"}\n` +
        `📅 *தேதி:* ${dateStr.toLocaleString("ta-LK")}\n\n` +
        `தயவுசெய்து எனது வங்கிக் கணக்கிற்கு பணத்தை மாற்றவும். நன்றி!`;
    }
  } else {
    if (isDeposit) {
      message =
        `⚡ *NEW DEPOSIT REQUEST - FAST CASH*\n` +
        `----------------------------------\n` +
        `🔖 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== "GUEST" ? `🆔 *User ID:* ${resolvedUserId}\n` : "") +
        `💰 *Amount:* LKR ${formattedAmount}\n` +
        `🏦 *Payment Method:* ${tx.paymentMethod || "Bank Deposit"}\n` +
        (tx.receiptReference ? `🧾 *Receipt Ref:* ${tx.receiptReference}\n` : "") +
        `${tx.receiptImage ? "📸 *Payment Slip:* Attached in portal\n" : ""}` +
        `📅 *Date:* ${dateStr.toLocaleString()}\n\n` +
        `Please process my deposit request. Thank you!`;
    } else {
      message =
        `💳 *NEW WITHDRAWAL REQUEST - FAST CASH*\n` +
        `----------------------------------\n` +
        `🔖 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== "GUEST" ? `🆔 *User ID:* ${resolvedUserId}\n` : "") +
        `🔐 *Security Code:* ${tx.securityCode || "N/A"}\n` +
        `👤 *Full Name:* ${tx.fullName || "N/A"}\n` +
        `🏦 *Bank:* ${tx.bank || "N/A"}\n` +
        `🔢 *Account No:* ${tx.accountNumber || "N/A"}\n` +
        `💰 *Amount:* LKR ${formattedAmount}\n` +
        `📞 *Contact:* ${tx.contactNumber || "N/A"}\n` +
        `📅 *Date:* ${dateStr.toLocaleString()}\n\n` +
        `Please process my withdrawal to my bank account. Thank you!`;
    }
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const WhatsAppModal = ({ tx, onClose, lang, user, t }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!tx) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [tx, onClose]);

  if (!tx) return null;
  const url = getWhatsAppUrl(tx, lang, user);

  return (
    <div className="wa-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="wa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t.whatsapp.modalTitle}
        tabIndex={-1}
        ref={dialogRef}
      >
        <h2>{t.whatsapp.modalTitle}</h2>
        <p>{t.whatsapp.modalDesc}</p>

        {tx.receiptImage && (
          <div style={{ margin: "10px 0 16px", textAlign: "center" }}>
            <span
              style={{
                fontSize: "12px",
                color: "#25d366",
                display: "block",
                marginBottom: "6px",
                fontWeight: "600",
              }}
            >
              {t.whatsapp.slipAttached}
            </span>
            <img
              src={tx.receiptImage}
              alt="Attached Receipt"
              style={{
                maxHeight: "140px",
                maxWidth: "100%",
                borderRadius: "10px",
                border: "1px solid rgba(37,211,102,0.4)",
                objectFit: "contain",
              }}
            />
          </div>
        )}

        <div className="wa-modal-actions">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="wa-btn"
            style={{ padding: "14px", fontSize: "15px" }}
          >
            {t.whatsapp.sendNowBtn}
          </a>
          <button
            onClick={onClose}
            style={{
              padding: "10px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.08)",
              color: "var(--muted)",
            }}
          >
            {t.whatsapp.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Transactions = ({ user, transactions, move, lang, t }) => (
  <section className="panel" style={{ width: "100%", margin: "30px auto" }}>
    <h1>{t.transactionsPage.title}</h1>
    {!user ? (
      <Empty text={t.transactionsPage.signInPrompt} action={() => move("Login")} t={t} />
    ) : transactions.length ? (
      <div className="transactions">
        {transactions.map((tItem) => (
          <article key={tItem.id}>
            <span className={"status " + tItem.status}>
              {t.status[tItem.status] || tItem.status}
            </span>
            <h3>
              {t.type[tItem.type] || tItem.type} • LKR {Number(tItem.amount).toLocaleString()}
            </h3>
            <p>
              {tItem.id} • {t.transactionsPage.playerID} {tItem.playerId}
            </p>
            <small style={{ display: "block", marginBottom: "8px" }}>
              {new Date(tItem.createdAt).toLocaleString()}
            </small>
            {tItem.rejectionReason && (
              <div
                style={{
                  margin: "10px 0",
                  padding: "10px",
                  borderRadius: 8,
                  background: "rgba(255,77,77,.12)",
                  border: "1px solid rgba(255,77,77,.35)",
                }}
              >
                <strong>Rejection reason</strong>
                <div>{tItem.rejectionReason}</div>
              </div>
            )}
            {tItem.timeline?.length > 0 && (
              <div
                style={{
                  margin: "12px 0 8px",
                  paddingLeft: 12,
                  borderLeft: "2px solid var(--green)",
                }}
              >
                <strong style={{ fontSize: 12 }}>Request timeline</strong>
                {tItem.timeline.map((event, index) => (
                  <div
                    key={event.id || `${event.status}-${index}`}
                    style={{ marginTop: 8, display: "grid", gap: 2 }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      {t.status[event.status] || event.status}
                    </span>
                    <small>
                      {event.note || "Status updated"} ·{" "}
                      {new Date(event.createdAt || tItem.createdAt).toLocaleString()}
                    </small>
                  </div>
                ))}
              </div>
            )}

            {tItem.receiptImage && (
              <div
                style={{
                  margin: "8px 0",
                  textAlign: "center",
                  background: "rgba(0,0,0,0.2)",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--green)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {t.whatsapp.attachedSlip}
                </span>
                <img
                  src={tItem.receiptImage}
                  alt="Receipt"
                  style={{
                    maxHeight: "130px",
                    maxWidth: "100%",
                    borderRadius: "6px",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}

            <a
              href={getWhatsAppUrl(tItem, lang, user)}
              target="_blank"
              rel="noreferrer"
              className="wa-btn-sleek"
              style={{ width: "100%", marginTop: "6px" }}
            >
              {t.whatsapp.sendDetails}
            </a>
          </article>
        ))}
      </div>
    ) : (
      <Empty text={t.transactionsPage.noRequests} action={() => move("Deposit")} t={t} />
    )}
  </section>
);

export const FAQSection = ({ lang, t }) => {
  const [openIndex, setOpenIndex] = useState(null);
  const list = lang === "si" ? faqListSi : lang === "ta" ? faqListTa : faqListEn;

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div className="faq-section">
      <h2>{t.faq.title}</h2>
      <p>{t.faq.subtitle}</p>
      <div className="faq-container">
        {list.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div className={`faq-item ${isOpen ? "open" : ""}`} key={index}>
              <button
                type="button"
                className="faq-header"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                <span className="faq-icon">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div className="faq-body">
                  {item.a.split("\n").map((line, lIdx) => (
                    <p key={lIdx} style={{ margin: "4px 0" }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Support = ({ chat, chatText, setChatText, sendChat, config, notify, lang, t }) => {
  const phone = config?.whatsappNumber || "+94765865387";
  const chatRef = useRef(null);

  // Keep the newest message visible inside the scrollable chat box.
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  return (
    <section className="support">
      <h1>{t.supportPage.title}</h1>
      <p>{t.supportPage.subtitle}</p>
      <div className="agent-details-card">
        <h2>{t.supportPage.contactCardTitle}</h2>
        <div className="agent-detail-row">
          <div>
            <span className="detail-label">{t.supportPage.phoneLabel}</span>
            <strong className="detail-value">{phone}</strong>
          </div>
          <CopyButton
            text={phone}
            label={t.supportPage.copyPhoneBtn}
            notify={notify}
            message={t.supportPage.copyPhoneSuccess}
            t={t}
          />
        </div>
      </div>
      <AgentAccountsCard config={config} notify={notify} title={t.agentAccounts.title} t={t} />
      <FAQSection lang={lang} t={t} />
      <h2>{t.supportPage.assistantTitle}</h2>
      <p>{t.supportPage.assistantSubtitle}</p>
      <div
        className="chat"
        ref={chatRef}
        role="log"
        aria-live="polite"
        aria-label={t.supportPage.assistantTitle}
      >
        {chat.map((m, i) => (
          <p className={m.role} key={i}>
            {m.content}
          </p>
        )) || null}
      </div>
      <form onSubmit={sendChat}>
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder={t.supportPage.inputPlaceholder}
          aria-label={t.supportPage.inputPlaceholder}
          autoComplete="off"
        />
        <button>{t.supportPage.sendBtn}</button>
      </form>
      <Responsible t={t} />
    </section>
  );
};

export const Login = ({ login, logout, user, form, setForm, move, t }) => (
  <section className="wizard" style={{ maxWidth: "540px", margin: "30px auto" }}>
    <h1>{t.login.title}</h1>
    {user ? (
      <div className="agent-details-card" style={{ marginTop: "20px" }}>
        <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "14px" }}>
          {t.login.alreadyLoggedIn || "You are currently signed in as:"}
        </p>
        <div className="agent-detail-row" style={{ marginBottom: "18px", padding: "14px" }}>
          <div>
            <strong className="detail-value" style={{ fontSize: "18px", display: "block" }}>
              👤 {user.fullName}
            </strong>
            <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
              {user.email} {user.playerId ? `• ID: ${user.playerId}` : ""}
            </div>
          </div>
          {user.role === "ADMIN" && (
            <span
              style={{
                fontSize: "11px",
                background: "rgba(182,255,53,0.18)",
                border: "1px solid var(--green)",
                color: "var(--green)",
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: "800",
              }}
            >
              ADMIN
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="green"
            onClick={() => move("Home")}
            style={{ padding: "10px 18px", borderRadius: "10px", fontWeight: "800" }}
          >
            {t.nav.Home}
          </button>
          <button
            type="button"
            className="logout-btn"
            onClick={logout}
            style={{ padding: "10px 18px", borderRadius: "10px", fontSize: "13px" }}
          >
            <span>🚪</span> {t.login.logoutBtn || t.header.logout}
          </button>
        </div>
      </div>
    ) : (
      <>
        <form onSubmit={login}>
          <Field
            label={t.login.emailLabel}
            name="email"
            type="email"
            placeholder="e.g. name@example.com"
            form={form}
            setForm={setForm}
          />
          <Field
            label={t.login.passwordLabel}
            name="password"
            type="password"
            placeholder="••••••••"
            form={form}
            setForm={setForm}
          />
          <button className="green">{t.login.loginBtn}</button>
        </form>
        <p>
          {t.login.newHere}{" "}
          <button type="button" className="link" onClick={() => move("Register")}>
            {t.login.createAccountBtn}
          </button>
        </p>
      </>
    )}
  </section>
);

export const Register = ({ form, setForm, notify, setUser, move, t }) => (
  <section className="wizard" style={{ maxWidth: "540px", margin: "30px auto" }}>
    <h1>{t.register.title}</h1>
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          console.log("[Register] Submitting account creation form:", {
            email: form.email,
            fullName: form.fullName,
            playerId: form.playerId,
          });
          const x = await api("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
          setForm({});
          if (x.pendingConfirmation) {
            notify(x.message);
            move("Login");
            return;
          }
          setUser(x.user);
          notify(t.messages.accountCreated);
          move("Home");
        } catch (error) {
          console.error("[Register Failure]", error);
          notify(error.message);
        }
      }}
    >
      <Field
        label={t.register.fullNameLabel}
        name="fullName"
        placeholder="e.g. John Silva"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.register.emailLabel}
        name="email"
        type="email"
        placeholder="e.g. john@example.com"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.register.passwordLabel}
        name="password"
        type="password"
        placeholder="Minimum 6 characters"
        form={form}
        setForm={setForm}
      />
      <Field
        label={t.register.playerIdLabel}
        name="playerId"
        required={false}
        placeholder="e.g. 12345678 (Optional)"
        form={form}
        setForm={setForm}
      />
      <button className="green">{t.register.registerBtn}</button>
    </form>
  </section>
);

export const PromotionsPage = ({ move, notify, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.promotionsPage.eyebrow}</p>
    <h1>{t.promotionsPage.title}</h1>
    <p>{t.promotionsPage.subtitle}</p>
    <div
      className="agent-details-card"
      style={{ borderColor: "rgba(182, 255, 53, 0.4)", background: "rgba(8, 23, 32, 0.95)" }}
    >
      <h2 style={{ color: "var(--green)", fontSize: "20px", margin: "0 0 8px" }}>
        {t.promotionsPage.bonusTitle}
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--ink)" }}>
        {t.promotionsPage.bonusDesc}
      </p>
      <div
        className="agent-detail-row"
        style={{ background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: "12px" }}
      >
        <div>
          <span className="detail-label">{t.promotionsPage.promoCodeLabel}</span>
          <strong
            className="detail-value"
            style={{ color: "var(--green)", fontSize: "18px", letterSpacing: "1px" }}
          >
            {t.promotionsPage.promoCode}
          </strong>
        </div>
        <CopyButton
          text={t.promotionsPage.promoCode}
          label={t.promotionsPage.copyCodeBtn}
          notify={notify}
          message={t.promotionsPage.copyCodeSuccess}
          t={t}
        />
      </div>
      <div style={{ marginTop: "16px", fontSize: "13px", lineHeight: "1.7", color: "var(--ink)" }}>
        <b>{t.promotionsPage.howToClaimTitle}</b>
        <div style={{ display: "grid", gap: "6px", marginTop: "6px" }}>
          <div>{t.promotionsPage.step1}</div>
          <div>{t.promotionsPage.step2}</div>
          <div>{t.promotionsPage.step3}</div>
          <div>{t.promotionsPage.step4}</div>
        </div>
      </div>
    </div>
    <div
      className="agent-details-card"
      style={{ borderColor: "rgba(34, 199, 255, 0.4)", background: "rgba(8, 23, 32, 0.95)" }}
    >
      <h2 style={{ color: "var(--blue)", fontSize: "18px", margin: "0 0 8px" }}>
        {t.promotionsPage.agentCashbackTitle}
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--ink)" }}>
        {t.promotionsPage.cashbackDesc}
      </p>
      <button className="green" onClick={() => move("Deposit")}>
        {t.promotionsPage.depositNowBtn}
      </button>
    </div>
    <Responsible t={t} />
  </section>
);

export const Guide1xBetPage = ({ move, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.guide1xBetPage.eyebrow}</p>
    <h1>{t.guide1xBetPage.title}</h1>
    <p>{t.guide1xBetPage.subtitle}</p>
    <div className="agent-details-card">
      <h2 style={{ color: "var(--green)", fontSize: "18px", margin: "0 0 8px" }}>
        {t.guide1xBetPage.downloadTitle}
      </h2>
      <p style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--ink)" }}>
        {t.guide1xBetPage.downloadDesc}
      </p>
    </div>
    <div className="agent-details-card" style={{ borderColor: "rgba(182, 255, 53, 0.35)" }}>
      <h2 style={{ color: "var(--green)", fontSize: "18px", margin: "0 0 8px" }}>
        {t.guide1xBetPage.playerIDTitle}
      </h2>
      <div style={{ display: "grid", gap: "8px", fontSize: "14px", color: "var(--ink)" }}>
        <div>{t.guide1xBetPage.step1}</div>
        <div>{t.guide1xBetPage.step2}</div>
        <div>{t.guide1xBetPage.step3}</div>
        <div>{t.guide1xBetPage.step4}</div>
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
        <button className="green" onClick={() => move("Deposit")}>
          {t.guide1xBetPage.actionDeposit}
        </button>
        <button className="blue" onClick={() => move("Support")}>
          {t.guide1xBetPage.actionContact}
        </button>
      </div>
    </div>
    <Info t={t} />
  </section>
);

export const GuideSportsPage = ({ move, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.guideSportsPage.eyebrow}</p>
    <h1>{t.guideSportsPage.title}</h1>
    <p>{t.guideSportsPage.subtitle}</p>
    <div className="agent-details-card" style={{ borderColor: "rgba(182, 255, 53, 0.35)" }}>
      <h2 style={{ color: "var(--green)", fontSize: "18px", margin: "0 0 8px" }}>
        {t.guideSportsPage.cardTitle}
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--ink)" }}>
        {t.guideSportsPage.cardDesc}
      </p>
      <button className="green" onClick={() => move("Deposit")}>
        {t.guideSportsPage.btnDeposit}
      </button>
    </div>
    <div className="agent-details-card" style={{ borderColor: "rgba(34, 199, 255, 0.35)" }}>
      <h2 style={{ color: "var(--blue)", fontSize: "18px", margin: "0 0 8px" }}>
        {t.guideSportsPage.withdrawTitle}
      </h2>
      <p style={{ margin: "0 0 10px", fontSize: "14px", color: "var(--ink)" }}>
        {t.guideSportsPage.withdrawDesc}
      </p>
      <div
        style={{
          padding: "8px 12px",
          background: "rgba(34, 199, 255, 0.08)",
          borderRadius: "8px",
          fontSize: "13px",
          margin: "0 0 14px",
        }}
      >
        {t.guideSportsPage.locationNote}
      </div>
      <button className="blue" onClick={() => move("Withdraw")}>
        {t.guideSportsPage.btnWithdraw}
      </button>
    </div>
    <Responsible t={t} />
  </section>
);

export const GuideCasinoPage = ({ move, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.guideCasinoPage.eyebrow}</p>
    <h1>{t.guideCasinoPage.title}</h1>
    <p>{t.guideCasinoPage.subtitle}</p>
    <div className="agent-details-card" style={{ borderColor: "rgba(182, 255, 53, 0.35)" }}>
      <h2 style={{ color: "var(--green)", fontSize: "18px", margin: "0 0 8px" }}>
        {t.guideCasinoPage.cardTitle}
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--ink)" }}>
        {t.guideCasinoPage.cardDesc}
      </p>
      <button className="green" onClick={() => move("Deposit")}>
        {t.guideCasinoPage.btnDeposit}
      </button>
    </div>
    <div className="agent-details-card" style={{ borderColor: "rgba(34, 199, 255, 0.35)" }}>
      <h2 style={{ color: "var(--blue)", fontSize: "18px", margin: "0 0 8px" }}>
        {t.guideCasinoPage.withdrawTitle}
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--ink)" }}>
        {t.guideCasinoPage.withdrawDesc}
      </p>
      <button className="blue" onClick={() => move("Withdraw")}>
        {t.guideCasinoPage.btnWithdraw}
      </button>
    </div>
    <Responsible t={t} />
  </section>
);

// --- PWA App Install Popup Banner ---
const PWA_DISMISS_KEY = "fast_cash_pwa_dismissed_v2";

export const PwaInstallBanner = ({ t }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installHelp, setInstallHelp] = useState("");

  useEffect(() => {
    const isDismissed =
      typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(PWA_DISMISS_KEY)
        : null;
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true);
    if (isDismissed || isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallHelp("");
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setShowBanner(false);
      setInstallHelp("");
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timer = setTimeout(() => {
      if (!isDismissed && !isStandalone) {
        setShowBanner(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          setShowBanner(false);
          setInstallHelp("");
        } else {
          setInstallHelp(
            t?.pwaBanner?.dismissedHelp ||
              "Installation was not completed. Tap Install App again when you are ready.",
          );
        }
      } catch (err) {
        console.warn("Install prompt error:", err);
        setInstallHelp(
          t?.pwaBanner?.browserHelp ||
            "Use your browser menu and choose Install app or Add to Home screen.",
        );
      }
      setDeferredPrompt(null);
      return;
    }

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isAndroid = /android/i.test(window.navigator.userAgent);
    setInstallHelp(
      isIOS
        ? t?.pwaBanner?.iosHelp || "On iPhone/iPad, tap Share and choose Add to Home Screen."
        : isAndroid
          ? t?.pwaBanner?.androidHelp ||
            "Open the browser menu and choose Install app or Add to Home screen."
          : t?.pwaBanner?.browserHelp ||
            "Use your browser menu and choose Install app or Add to Home screen.",
    );
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setInstallHelp("");
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(PWA_DISMISS_KEY, "1");
    }
  };

  if (!showBanner) return null;

  const bannerText = t?.pwaBanner || {
    title: "Install Fast Cash App",
    desc: "Install our web app for instant 1-tap access, offline mode & fast receipt OCR scanning.",
    installBtn: "Install App",
    dismissBtn: "Not Now",
  };

  return (
    <div className="pwa-install-banner" role="region" aria-label="Install App Prompt">
      <div className="pwa-banner-left">
        <div className="pwa-banner-icon" aria-hidden="true">
          ⚡
        </div>
        <div className="pwa-banner-text">
          <p className="pwa-banner-title">{bannerText.title}</p>
          <p>{bannerText.desc}</p>
        </div>
      </div>
      <div className="pwa-banner-actions">
        <button type="button" className="pwa-install-btn" onClick={handleInstallClick}>
          {bannerText.installBtn}
        </button>
        <button type="button" className="pwa-dismiss-btn" onClick={handleDismiss}>
          {bannerText.dismissBtn}
        </button>
      </div>
      {installHelp && (
        <div className="pwa-install-help" role="status">
          <span>{installHelp}</span>
          <button
            type="button"
            className="pwa-install-help-close"
            onClick={() => setInstallHelp("")}
            aria-label={t?.pwaBanner?.closeHelp || "Close installation guidance"}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
