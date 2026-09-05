import React, { useState, useEffect, useCallback } from 'react';
import type { UserChatSettings } from '../types/index.js';

export interface ChatSettingsProps {
  /** Optional chat ID if configuring settings for a specific chat */
  chatId?: string;
  /** Name/title of the chat or contact */
  chatName?: string;
  /** Initial auto-translate toggle state (defaults to true) */
  initialAutoTranslate?: boolean;
  /** Initial mute toggle state for this chat or user (defaults to false) */
  initialMute?: boolean;
  /** Initial global mute state for notifications */
  initialGlobalMute?: boolean;
  /** User preferred translation language */
  initialLanguage?: 'si' | 'ta' | 'en';
  /** Auth token for authorized D1 backend API requests */
  authToken?: string;
  /** API Base URL (default is relative path '') */
  apiBaseUrl?: string;
  /** Callback fired when auto-translate toggle changes */
  onAutoTranslateChange?: (enabled: boolean) => void | Promise<void>;
  /** Callback fired when mute toggle changes */
  onMuteChange?: (muted: boolean) => void | Promise<void>;
  /** Callback fired when language changes */
  onLanguageChange?: (language: 'si' | 'ta' | 'en') => void | Promise<void>;
  /** Callback fired when settings are saved */
  onSave?: (settings: UserChatSettings) => void | Promise<void>;
  /** Optional callback fired when close button is clicked */
  onClose?: () => void;
  /** Display mode: standalone 'card' or dialog 'modal' */
  mode?: 'card' | 'modal';
  /** Custom CSS classes */
  className?: string;
}

export const ChatSettings: React.FC<ChatSettingsProps> = ({
  chatId,
  chatName,
  initialAutoTranslate = true,
  initialMute = false,
  initialGlobalMute = false,
  initialLanguage = 'si',
  authToken,
  apiBaseUrl = '',
  onAutoTranslateChange,
  onMuteChange,
  onLanguageChange,
  onSave,
  onClose,
  mode = 'card',
  className = ''
}) => {
  const [autoTranslate, setAutoTranslate] = useState<boolean>(initialAutoTranslate);
  const [isMuted, setIsMuted] = useState<boolean>(initialMute);
  const [globalMute, setGlobalMute] = useState<boolean>(initialGlobalMute);
  const [language, setLanguage] = useState<'si' | 'ta' | 'en'>(initialLanguage);
  const [muteDuration, setMuteDuration] = useState<'8h' | '1w' | 'always'>('always');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing preferences from D1 database on mount if authToken is available
  useEffect(() => {
    let isMounted = true;

    async function loadSettingsFromDatabase() {
      if (!authToken) return;
      setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Fetch user level preferences
        const userRes = await fetch(`${apiBaseUrl}/api/users/me/settings`, { headers });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (isMounted) {
            if (typeof userData.autoTranslate === 'boolean') {
              setAutoTranslate(userData.autoTranslate);
            }
            if (typeof userData.muteNotifications === 'boolean') {
              setGlobalMute(userData.muteNotifications);
              if (!chatId) {
                setIsMuted(userData.muteNotifications);
              }
            }
            if (userData.language && ['si', 'ta', 'en'].includes(userData.language)) {
              setLanguage(userData.language);
            }
          }
        }

        // 2. If chatId is provided, fetch chat specific mute state
        if (chatId) {
          const chatRes = await fetch(`${apiBaseUrl}/api/chats/${chatId}`, { headers });
          if (chatRes.ok) {
            const chatData = await chatRes.json();
            if (isMounted && typeof chatData.isMuted === 'boolean') {
              setIsMuted(chatData.isMuted);
            }
          }
        }
      } catch (err: any) {
        console.warn('[ChatSettings] Failed to fetch remote settings:', err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSettingsFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [chatId, authToken, credentialsHeader()]);

  function credentialsHeader(): string {
    return authToken ? `Bearer ${authToken}` : '';
  }

  // Update auto-translate in D1 database
  const handleToggleAutoTranslate = useCallback(async () => {
    const nextState = !autoTranslate;
    setAutoTranslate(nextState);
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage(null);

    try {
      // Direct D1 update if authToken is present
      if (authToken) {
        const res = await fetch(`${apiBaseUrl}/api/users/me/settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ autoTranslate: nextState })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update auto-translate setting in D1');
        }
      }

      // Trigger user callback
      if (onAutoTranslateChange) {
        await onAutoTranslateChange(nextState);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      // Rollback on failure
      setAutoTranslate(!nextState);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Error updating auto-translate');
    } finally {
      setIsSaving(false);
    }
  }, [autoTranslate, authToken, apiBaseUrl, onAutoTranslateChange]);

  // Update mute preference in D1 database
  const handleToggleMute = useCallback(async () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage(null);

    try {
      if (authToken) {
        if (chatId) {
          // Chat-specific mute in D1 muted_chats table
          const method = nextState ? 'POST' : 'DELETE';
          const res = await fetch(`${apiBaseUrl}/api/chats/${chatId}/mute`, {
            method,
            headers: { Authorization: `Bearer ${authToken}` }
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update chat mute status in D1');
          }
        } else {
          // Global user notification mute in D1 users table
          const res = await fetch(`${apiBaseUrl}/api/users/me/settings`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({ muteNotifications: nextState })
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update user mute setting in D1');
          }
        }
      }

      // Trigger user callback
      if (onMuteChange) {
        await onMuteChange(nextState);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      // Rollback
      setIsMuted(!nextState);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Error updating mute preference');
    } finally {
      setIsSaving(false);
    }
  }, [isMuted, chatId, authToken, apiBaseUrl, onMuteChange]);

  // Update language preference
  const handleLanguageSelect = useCallback(
    async (newLang: 'si' | 'ta' | 'en') => {
      setLanguage(newLang);
      setIsSaving(true);
      setSaveStatus('idle');
      setErrorMessage(null);

      try {
        if (authToken) {
          const res = await fetch(`${apiBaseUrl}/api/users/me/settings`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({ language: newLang })
          });

          if (!res.ok) {
            throw new Error('Failed to update language preference in D1');
          }
        }

        if (onLanguageChange) {
          await onLanguageChange(newLang);
        }

        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (err: any) {
        setSaveStatus('error');
        setErrorMessage(err.message || 'Failed to save language preference');
      } finally {
        setIsSaving(false);
      }
    },
    [authToken, apiBaseUrl, onLanguageChange]
  );

  // Explicit Save All handler
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage(null);

    const payload: UserChatSettings = {
      autoTranslate,
      muteNotifications: globalMute,
      language,
      isChatMuted: isMuted
    };

    try {
      if (authToken) {
        // Save user level settings
        await fetch(`${apiBaseUrl}/api/users/me/settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            autoTranslate,
            muteNotifications: globalMute,
            language
          })
        });

        // Save chat mute if chatId exists
        if (chatId) {
          await fetch(`${apiBaseUrl}/api/chats/${chatId}/mute`, {
            method: isMuted ? 'POST' : 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` }
          });
        }
      }

      if (onSave) {
        await onSave(payload);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save all settings to D1');
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <div
      id="chat-settings-card"
      className={`bg-white dark:bg-[#111b21] text-slate-900 dark:text-slate-100 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden font-sans transition-all max-w-lg w-full ${className}`}
    >
      {/* Header */}
      <div
        id="chat-settings-header"
        className="flex items-center justify-between px-6 py-4 bg-[#075e54] dark:bg-[#202c33] text-white select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg">
            ⚙️
          </div>
          <div>
            <h2 id="settings-heading" className="text-base font-semibold leading-tight">
              {chatName ? `${chatName} Settings` : 'Chat Preferences'}
            </h2>
            <p className="text-xs text-emerald-100 dark:text-slate-300">
              Synced with ChatLK D1 Database
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            id="chat-settings-close-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Loading Bar */}
      {isLoading && (
        <div id="settings-loading-banner" className="bg-emerald-50 dark:bg-emerald-950/40 px-6 py-2 border-b border-emerald-100 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <span className="animate-spin text-sm">↻</span>
          <span>Loading preferences from D1 database...</span>
        </div>
      )}

      {/* Notification / Error / Success Banners */}
      {saveStatus === 'success' && (
        <div
          id="settings-save-success"
          className="bg-emerald-100/90 dark:bg-emerald-900/60 border-b border-emerald-300 dark:border-emerald-700 px-6 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between transition-all"
        >
          <div className="flex items-center space-x-2">
            <span>✓</span>
            <span className="font-medium">Settings successfully updated in D1 database.</span>
          </div>
          {isSaving && <span className="text-[10px] opacity-75">Syncing...</span>}
        </div>
      )}

      {saveStatus === 'error' && (
        <div
          id="settings-save-error"
          className="bg-rose-100/90 dark:bg-rose-950/60 border-b border-rose-300 dark:border-rose-800 px-6 py-2.5 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{errorMessage || 'Failed to sync with D1 database.'}</span>
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            className="underline font-semibold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Settings Form Body */}
      <div className="p-6 space-y-6">
        {/* Section 1: Auto-Translate Toggle */}
        <section id="section-auto-translate" className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="pr-4">
              <label
                htmlFor="toggle-auto-translate"
                className="text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <span>🌐 Auto-Translate Messages</span>
                <span
                  id="auto-translate-badge"
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    autoTranslate
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {autoTranslate ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Automatically translates incoming chats into your preferred Sri Lankan language using Cloudflare Workers AI and D1 caching.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              id="toggle-auto-translate"
              role="switch"
              aria-checked={autoTranslate}
              disabled={isSaving || isLoading}
              onClick={handleToggleAutoTranslate}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#25d366] focus:ring-offset-2 disabled:opacity-50 ${
                autoTranslate ? 'bg-[#25d366]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span className="sr-only">Toggle Auto-Translate</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoTranslate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Preferred Language Selection (visible when Auto-Translate is enabled) */}
          {autoTranslate && (
            <div
              id="language-preference-box"
              className="mt-3 p-3 bg-slate-50 dark:bg-[#1a2329] rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2 animate-in fade-in duration-200"
            >
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                Primary Translation Target:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'si', label: 'සිංහල (Sinhala)' },
                  { code: 'ta', label: 'தமிழ் (Tamil)' },
                  { code: 'en', label: 'English' }
                ].map(({ code, label }) => {
                  const isSelected = language === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      id={`lang-btn-${code}`}
                      disabled={isSaving}
                      onClick={() => handleLanguageSelect(code as 'si' | 'ta' | 'en')}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center ${
                        isSelected
                          ? 'bg-[#075e54] text-white border-[#075e54] shadow-sm'
                          : 'bg-white dark:bg-[#202c33] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="border-t border-slate-200 dark:border-slate-800/80" />

        {/* Section 2: Mute Preferences Toggle */}
        <section id="section-mute" className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="pr-4">
              <label
                htmlFor="toggle-mute"
                className="text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <span>🔕 Mute Notifications</span>
                <span
                  id="mute-badge"
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    isMuted
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {isMuted ? 'Muted' : 'Active'}
                </span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {chatName
                  ? `Mutes web push notifications and alert sounds for ${chatName}. Saved in D1 muted_chats.`
                  : 'Silences chat notifications across your account. Recorded in D1 database.'}
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              id="toggle-mute"
              role="switch"
              aria-checked={isMuted}
              disabled={isSaving || isLoading}
              onClick={handleToggleMute}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 ${
                isMuted ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span className="sr-only">Toggle Mute</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isMuted ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Mute Duration Selector (visible when muted) */}
          {isMuted && (
            <div
              id="mute-duration-box"
              className="mt-3 p-3 bg-amber-50/70 dark:bg-[#1a2329] rounded-xl border border-amber-200/60 dark:border-slate-800 space-y-2 animate-in fade-in duration-200"
            >
              <span className="text-xs font-medium text-amber-900 dark:text-amber-200 block">
                Mute Duration:
              </span>
              <div className="flex space-x-2">
                {[
                  { key: '8h', label: '8 Hours' },
                  { key: '1w', label: '1 Week' },
                  { key: 'always', label: 'Always' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    id={`mute-duration-${key}`}
                    onClick={() => setMuteDuration(key as any)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                      muteDuration === key
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-[#202c33] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Database Synchronization Notice */}
        <div
          id="d1-sync-notice"
          className="p-3 bg-slate-50 dark:bg-[#182229] rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Target Table: D1 users &amp; muted_chats</span>
          </div>
          <span className="text-[11px] font-mono opacity-70">Cloudflare D1</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        id="chat-settings-footer"
        className="px-6 py-3.5 bg-slate-50 dark:bg-[#202c33] border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
      >
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isSaving ? 'Saving changes to D1...' : 'Changes auto-saved'}
        </span>
        <div className="flex space-x-2">
          {onClose && (
            <button
              type="button"
              id="settings-cancel-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
          )}
          <button
            type="button"
            id="settings-save-all-btn"
            disabled={isSaving}
            onClick={handleSaveAll}
            className="px-4 py-2 text-xs font-medium bg-[#075e54] hover:bg-[#064e46] text-white rounded-lg shadow-sm transition-all flex items-center space-x-1 disabled:opacity-50"
          >
            {isSaving && <span className="animate-spin text-xs">↻</span>}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );

  // If modal mode, wrap in backdrop overlay
  if (mode === 'modal') {
    return (
      <div
        id="chat-settings-modal-backdrop"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      >
        {content}
      </div>
    );
  }

  return content;
};

export default ChatSettings;
