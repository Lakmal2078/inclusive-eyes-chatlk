/* Shared Fast Cash app state: language, theme, session, config, requests, chat. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { api, type FastCashUser } from "@/lib/fastcash/api";
import { translations } from "@/lib/fastcash/translations.js";
import { getWhatsAppUrl } from "@/components/fastcash/pages.jsx";

export const PAGE_ROUTES: Record<string, string> = {
  Home: "/",
  Deposit: "/deposit",
  Withdraw: "/withdraw",
  Transactions: "/transactions",
  "1xBet": "/1xbet",
  Sports: "/sports",
  Casino: "/casino",
  "Live Bet": "/live-bet",
  Promotions: "/promotions",
  PrivacyPolicy: "/privacy-policy",
  Support: "/support",
  Admin: "/admin",
  Login: "/login",
  Register: "/register",
};

const ROUTE_PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([page, path]) => [path, page]),
);

type FastCashState = {
  t: any;
  lang: string;
  setLang: (lang: string) => void;
  theme: string;
  toggleTheme: () => void;
  user: FastCashUser | null;
  setUser: (user: FastCashUser | null) => void;
  notify: (message: string) => void;
  toast: string;
  config: {
    minTransaction: number;
    maxTransaction: number;
    whatsappNumber?: string;
    promoCode?: string;
  };
  transactions: any[];
  notifications: any[];
  unreadNotifications: number;
  markNotificationsRead: (id?: string) => Promise<void>;
  reloadTransactions: () => void;
  form: Record<string, any>;
  setForm: (updater: any) => void;
  submit: (type: string, event: { preventDefault: () => void }) => Promise<void>;
  login: (event: { preventDefault: () => void }) => Promise<void>;
  logout: () => Promise<void>;
  chat: { role: string; content: string }[];
  chatText: string;
  setChatText: (value: string) => void;
  sendChat: (event: { preventDefault: () => void }) => Promise<void>;
  page: string;
  move: (page: string) => void;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  waModalTx: any;
  closeWaModal: () => void;
};

const FastCashCtx = createContext<FastCashState | null>(null);

export function useFastCash() {
  const ctx = useContext(FastCashCtx);
  if (!ctx) throw new Error("useFastCash must be used inside FastCashProvider");
  return ctx;
}

export function FastCashProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const page = ROUTE_PAGES[pathname.replace(/\/$/, "") || "/"] ?? "Home";

  const [theme, setTheme] = useState("dark");
  const [lang, setLangState] = useState("en");
  const [drawer, setDrawer] = useState(false);
  const [user, setUser] = useState<FastCashUser | null>(null);
  const [toast, setToast] = useState("");
  const [config, setConfig] = useState({ minTransaction: 1000, maxTransaction: 500000 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [chatText, setChatText] = useState("");
  const [waModalTx, setWaModalTx] = useState<any>(null);

  const t = (translations as any)[lang] || (translations as any).en;

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  // Restore saved preferences after hydration so SSR markup stays stable.
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const savedLang = window.localStorage.getItem("lang");
    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLangState(savedLang);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute("content", theme === "dark" ? "#08131d" : "#f0f4f8"));
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  // Keep the document language in sync with the chosen interface language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!drawer) return undefined;
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add("scroll-locked");
    return () => {
      document.body.classList.remove("scroll-locked");
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    };
  }, [drawer]);

  const reloadTransactions = useCallback(() => {
    api("/api/transactions")
      .then((x) => setTransactions(x.transactions))
      .catch(() => setTransactions([]));
  }, []);

  const reloadNotifications = useCallback(() => {
    if (!user) return;
    api("/api/notifications")
      .then((x) => setNotifications(x.notifications || []))
      .catch(() => setNotifications([]));
  }, [user]);

  const markNotificationsRead = useCallback(async (id?: string) => {
    await api("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify(id ? { id } : {}),
    });
    setNotifications((prev) =>
      prev.map((item) =>
        id && item.id !== id ? item : { ...item, read_at: new Date().toISOString() },
      ),
    );
  }, []);

  useEffect(() => {
    api("/api/config")
      .then(setConfig)
      .catch(() => {});
    api("/api/auth/me")
      .then((x) => {
        setUser(x.user);
        if (x.user) reloadTransactions();
      })
      .catch(() => {});
  }, [reloadTransactions]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return undefined;
    }
    reloadNotifications();
    const timer = window.setInterval(reloadNotifications, 20000);
    return () => window.clearInterval(timer);
  }, [user, reloadNotifications]);

  const setLang = (nextLang: string) => {
    setLangState(nextLang);
    window.localStorage.setItem("lang", nextLang);
  };

  const move = useCallback(
    (target: string) => {
      setDrawer(false);
      setForm({});
      const to = PAGE_ROUTES[target] ?? "/";
      navigate({ to });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate],
  );

  const submit = async (type: string, event: { preventDefault: () => void }) => {
    event.preventDefault();
    try {
      const endpoint = type === "Deposit" ? "/api/deposits" : "/api/withdrawals";
      const data = await api(endpoint, { method: "POST", body: JSON.stringify(form) });
      notify(`${t.type[type] || type} ${t.messages.requestSubmitted} ${data.transaction.id}`);
      setForm({});
      reloadTransactions();
      setWaModalTx(data.transaction);
      move("Transactions");
    } catch (error) {
      notify((error as Error).message);
    }
  };

  const login = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    try {
      const x = await api("/api/auth/login", { method: "POST", body: JSON.stringify(form) });
      setUser(x.user);
      setForm({});
      reloadTransactions();
      notify(t.messages.welcomeBack);
      move("Home");
    } catch (error) {
      notify((error as Error).message);
    }
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    setTransactions([]);
    notify(t.messages.loggedOut || "Logged out successfully.");
    move("Home");
  };

  const sendChat = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    const messages = [...chat, { role: "user", content: chatText }];
    setChat(messages);
    setChatText("");
    try {
      const x = await api("/api/support/chat", {
        method: "POST",
        body: JSON.stringify({ messages }),
      });
      setChat([...messages, { role: "assistant", content: x.reply }]);
    } catch (error) {
      notify((error as Error).message);
    }
  };

  const value = useMemo<FastCashState>(
    () => ({
      t,
      lang,
      setLang,
      theme,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
      user,
      setUser,
      notify,
      toast,
      config,
      transactions,
      notifications,
      unreadNotifications: notifications.filter((item) => !item.read_at).length,
      markNotificationsRead,
      reloadTransactions,
      form,
      setForm,
      submit,
      login,
      logout,
      chat,
      chatText,
      setChatText,
      sendChat,
      page,
      move,
      drawer,
      setDrawer,
      waModalTx,
      closeWaModal: () => setWaModalTx(null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      t,
      lang,
      theme,
      user,
      toast,
      config,
      transactions,
      notifications,
      form,
      chat,
      chatText,
      page,
      drawer,
      waModalTx,
      markNotificationsRead,
    ],
  );

  return <FastCashCtx.Provider value={value}>{children}</FastCashCtx.Provider>;
}

export { getWhatsAppUrl };
