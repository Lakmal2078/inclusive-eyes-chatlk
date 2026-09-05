import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
const ChatSettings = ({
  chatId,
  chatName,
  initialAutoTranslate = true,
  initialMute = false,
  initialGlobalMute = false,
  initialLanguage = "si",
  authToken,
  apiBaseUrl = "",
  onAutoTranslateChange,
  onMuteChange,
  onLanguageChange,
  onSave,
  onClose,
  mode = "card",
  className = ""
}) => {
  const [autoTranslate, setAutoTranslate] = useState(initialAutoTranslate);
  const [isMuted, setIsMuted] = useState(initialMute);
  const [globalMute, setGlobalMute] = useState(initialGlobalMute);
  const [language, setLanguage] = useState(initialLanguage);
  const [muteDuration, setMuteDuration] = useState("always");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState(null);
  useEffect(() => {
    let isMounted = true;
    async function loadSettingsFromDatabase() {
      if (!authToken) return;
      setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${authToken}` };
        const userRes = await fetch(`${apiBaseUrl}/api/users/me/settings`, { headers });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (isMounted) {
            if (typeof userData.autoTranslate === "boolean") {
              setAutoTranslate(userData.autoTranslate);
            }
            if (typeof userData.muteNotifications === "boolean") {
              setGlobalMute(userData.muteNotifications);
              if (!chatId) {
                setIsMuted(userData.muteNotifications);
              }
            }
            if (userData.language && ["si", "ta", "en"].includes(userData.language)) {
              setLanguage(userData.language);
            }
          }
        }
        if (chatId) {
          const chatRes = await fetch(`${apiBaseUrl}/api/chats/${chatId}`, { headers });
          if (chatRes.ok) {
            const chatData = await chatRes.json();
            if (isMounted && typeof chatData.isMuted === "boolean") {
              setIsMuted(chatData.isMuted);
            }
          }
        }
      } catch (err) {
        console.warn("[ChatSettings] Failed to fetch remote settings:", err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSettingsFromDatabase();
    return () => {
      isMounted = false;
    };
  }, [chatId, authToken, credentialsHeader()]);
  function credentialsHeader() {
    return authToken ? `Bearer ${authToken}` : "";
  }
  const handleToggleAutoTranslate = useCallback(async () => {
    const nextState = !autoTranslate;
    setAutoTranslate(nextState);
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);
    try {
      if (authToken) {
        const res = await fetch(`${apiBaseUrl}/api/users/me/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ autoTranslate: nextState })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update auto-translate setting in D1");
        }
      }
      if (onAutoTranslateChange) {
        await onAutoTranslateChange(nextState);
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3e3);
    } catch (err) {
      setAutoTranslate(!nextState);
      setSaveStatus("error");
      setErrorMessage(err.message || "Error updating auto-translate");
    } finally {
      setIsSaving(false);
    }
  }, [autoTranslate, authToken, apiBaseUrl, onAutoTranslateChange]);
  const handleToggleMute = useCallback(async () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);
    try {
      if (authToken) {
        if (chatId) {
          const method = nextState ? "POST" : "DELETE";
          const res = await fetch(`${apiBaseUrl}/api/chats/${chatId}/mute`, {
            method,
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update chat mute status in D1");
          }
        } else {
          const res = await fetch(`${apiBaseUrl}/api/users/me/settings`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({ muteNotifications: nextState })
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update user mute setting in D1");
          }
        }
      }
      if (onMuteChange) {
        await onMuteChange(nextState);
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3e3);
    } catch (err) {
      setIsMuted(!nextState);
      setSaveStatus("error");
      setErrorMessage(err.message || "Error updating mute preference");
    } finally {
      setIsSaving(false);
    }
  }, [isMuted, chatId, authToken, apiBaseUrl, onMuteChange]);
  const handleLanguageSelect = useCallback(
    async (newLang) => {
      setLanguage(newLang);
      setIsSaving(true);
      setSaveStatus("idle");
      setErrorMessage(null);
      try {
        if (authToken) {
          const res = await fetch(`${apiBaseUrl}/api/users/me/settings`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({ language: newLang })
          });
          if (!res.ok) {
            throw new Error("Failed to update language preference in D1");
          }
        }
        if (onLanguageChange) {
          await onLanguageChange(newLang);
        }
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3e3);
      } catch (err) {
        setSaveStatus("error");
        setErrorMessage(err.message || "Failed to save language preference");
      } finally {
        setIsSaving(false);
      }
    },
    [authToken, apiBaseUrl, onLanguageChange]
  );
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);
    const payload = {
      autoTranslate,
      muteNotifications: globalMute,
      language,
      isChatMuted: isMuted
    };
    try {
      if (authToken) {
        await fetch(`${apiBaseUrl}/api/users/me/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            autoTranslate,
            muteNotifications: globalMute,
            language
          })
        });
        if (chatId) {
          await fetch(`${apiBaseUrl}/api/chats/${chatId}/mute`, {
            method: isMuted ? "POST" : "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
          });
        }
      }
      if (onSave) {
        await onSave(payload);
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3e3);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err.message || "Failed to save all settings to D1");
    } finally {
      setIsSaving(false);
    }
  };
  const content = /* @__PURE__ */ jsxs(
    "div",
    {
      id: "chat-settings-card",
      className: `bg-white dark:bg-[#111b21] text-slate-900 dark:text-slate-100 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden font-sans transition-all max-w-lg w-full ${className}`,
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            id: "chat-settings-header",
            className: "flex items-center justify-between px-6 py-4 bg-[#075e54] dark:bg-[#202c33] text-white select-none",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
                /* @__PURE__ */ jsx("div", { className: "w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg", children: "\u2699\uFE0F" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h2", { id: "settings-heading", className: "text-base font-semibold leading-tight", children: chatName ? `${chatName} Settings` : "Chat Preferences" }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-emerald-100 dark:text-slate-300", children: "Synced with ChatLK D1 Database" })
                ] })
              ] }),
              onClose && /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  id: "chat-settings-close-btn",
                  onClick: onClose,
                  className: "text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none",
                  "aria-label": "Close settings",
                  children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M6 18L18 6M6 6l12 12" }) })
                }
              )
            ]
          }
        ),
        isLoading && /* @__PURE__ */ jsxs("div", { id: "settings-loading-banner", className: "bg-emerald-50 dark:bg-emerald-950/40 px-6 py-2 border-b border-emerald-100 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2", children: [
          /* @__PURE__ */ jsx("span", { className: "animate-spin text-sm", children: "\u21BB" }),
          /* @__PURE__ */ jsx("span", { children: "Loading preferences from D1 database..." })
        ] }),
        saveStatus === "success" && /* @__PURE__ */ jsxs(
          "div",
          {
            id: "settings-save-success",
            className: "bg-emerald-100/90 dark:bg-emerald-900/60 border-b border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between transition-all",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                /* @__PURE__ */ jsx("span", { children: "\u2713" }),
                /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Settings successfully updated in D1 database." })
              ] }),
              isSaving && /* @__PURE__ */ jsx("span", { className: "text-[10px] opacity-75", children: "Syncing..." })
            ]
          }
        ),
        saveStatus === "error" && /* @__PURE__ */ jsxs(
          "div",
          {
            id: "settings-save-error",
            className: "bg-rose-100/90 dark:bg-rose-950/60 border-b border-rose-300 dark:border-rose-800 px-6 py-2.5 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                /* @__PURE__ */ jsx("span", { children: "\u26A0\uFE0F" }),
                /* @__PURE__ */ jsx("span", { children: errorMessage || "Failed to sync with D1 database." })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: handleSaveAll,
                  className: "underline font-semibold hover:opacity-80",
                  children: "Retry"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-6", children: [
          /* @__PURE__ */ jsxs("section", { id: "section-auto-translate", className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
              /* @__PURE__ */ jsxs("div", { className: "pr-4", children: [
                /* @__PURE__ */ jsxs(
                  "label",
                  {
                    htmlFor: "toggle-auto-translate",
                    className: "text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-100 cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "\u{1F310} Auto-Translate Messages" }),
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          id: "auto-translate-badge",
                          className: `text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${autoTranslate ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"}`,
                          children: autoTranslate ? "Enabled" : "Disabled"
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed", children: "Automatically translates incoming chats into your preferred Sri Lankan language using Cloudflare Workers AI and D1 caching." })
              ] }),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  id: "toggle-auto-translate",
                  role: "switch",
                  "aria-checked": autoTranslate,
                  disabled: isSaving || isLoading,
                  onClick: handleToggleAutoTranslate,
                  className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#25d366] focus:ring-offset-2 disabled:opacity-50 ${autoTranslate ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`,
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Toggle Auto-Translate" }),
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${autoTranslate ? "translate-x-5" : "translate-x-0"}`
                      }
                    )
                  ]
                }
              )
            ] }),
            autoTranslate && /* @__PURE__ */ jsxs(
              "div",
              {
                id: "language-preference-box",
                className: "mt-3 p-3 bg-slate-50 dark:bg-[#1a2329] rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2 animate-in fade-in duration-200",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-slate-700 dark:text-slate-300 block", children: "Primary Translation Target:" }),
                  /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: [
                    { code: "si", label: "\u0DC3\u0DD2\u0D82\u0DC4\u0DBD (Sinhala)" },
                    { code: "ta", label: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD (Tamil)" },
                    { code: "en", label: "English" }
                  ].map(({ code, label }) => {
                    const isSelected = language === code;
                    return /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        id: `lang-btn-${code}`,
                        disabled: isSaving,
                        onClick: () => handleLanguageSelect(code),
                        className: `px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center ${isSelected ? "bg-[#075e54] text-white border-[#075e54] shadow-sm" : "bg-white dark:bg-[#202c33] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"}`,
                        children: label
                      },
                      code
                    );
                  }) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "border-t border-slate-200 dark:border-slate-800/80" }),
          /* @__PURE__ */ jsxs("section", { id: "section-mute", className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
              /* @__PURE__ */ jsxs("div", { className: "pr-4", children: [
                /* @__PURE__ */ jsxs(
                  "label",
                  {
                    htmlFor: "toggle-mute",
                    className: "text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-100 cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "\u{1F515} Mute Notifications" }),
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          id: "mute-badge",
                          className: `text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isMuted ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"}`,
                          children: isMuted ? "Muted" : "Active"
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed", children: chatName ? `Mutes web push notifications and alert sounds for ${chatName}. Saved in D1 muted_chats.` : "Silences chat notifications across your account. Recorded in D1 database." })
              ] }),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  id: "toggle-mute",
                  role: "switch",
                  "aria-checked": isMuted,
                  disabled: isSaving || isLoading,
                  onClick: handleToggleMute,
                  className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 ${isMuted ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`,
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Toggle Mute" }),
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isMuted ? "translate-x-5" : "translate-x-0"}`
                      }
                    )
                  ]
                }
              )
            ] }),
            isMuted && /* @__PURE__ */ jsxs(
              "div",
              {
                id: "mute-duration-box",
                className: "mt-3 p-3 bg-amber-50/70 dark:bg-[#1a2329] rounded-xl border border-amber-200/60 dark:border-slate-800 space-y-2 animate-in fade-in duration-200",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-amber-900 dark:text-amber-200 block", children: "Mute Duration:" }),
                  /* @__PURE__ */ jsx("div", { className: "flex space-x-2", children: [
                    { key: "8h", label: "8 Hours" },
                    { key: "1w", label: "1 Week" },
                    { key: "always", label: "Always" }
                  ].map(({ key, label }) => /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      id: `mute-duration-${key}`,
                      onClick: () => setMuteDuration(key),
                      className: `flex-1 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${muteDuration === key ? "bg-amber-600 text-white border-amber-600 shadow-sm" : "bg-white dark:bg-[#202c33] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"}`,
                      children: label
                    },
                    key
                  )) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(
            "div",
            {
              id: "d1-sync-notice",
              className: "p-3 bg-slate-50 dark:bg-[#182229] rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
                  /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }),
                  /* @__PURE__ */ jsx("span", { children: "Target Table: D1 users & muted_chats" })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "text-[11px] font-mono opacity-70", children: "Cloudflare D1" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            id: "chat-settings-footer",
            className: "px-6 py-3.5 bg-slate-50 dark:bg-[#202c33] border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between",
            children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: isSaving ? "Saving changes to D1..." : "Changes auto-saved" }),
              /* @__PURE__ */ jsxs("div", { className: "flex space-x-2", children: [
                onClose && /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    id: "settings-cancel-btn",
                    onClick: onClose,
                    className: "px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors",
                    children: "Close"
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    id: "settings-save-all-btn",
                    disabled: isSaving,
                    onClick: handleSaveAll,
                    className: "px-4 py-2 text-xs font-medium bg-[#075e54] hover:bg-[#064e46] text-white rounded-lg shadow-sm transition-all flex items-center space-x-1 disabled:opacity-50",
                    children: [
                      isSaving && /* @__PURE__ */ jsx("span", { className: "animate-spin text-xs", children: "\u21BB" }),
                      /* @__PURE__ */ jsx("span", { children: "Save Preferences" })
                    ]
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
  if (mode === "modal") {
    return /* @__PURE__ */ jsx(
      "div",
      {
        id: "chat-settings-modal-backdrop",
        className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200",
        children: content
      }
    );
  }
  return content;
};
var ChatSettings_default = ChatSettings;
export {
  ChatSettings,
  ChatSettings_default as default
};
