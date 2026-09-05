/**
 * Workers AI Services for Translation, Suggestions, and Content Moderation
 */

export interface TranslationResult {
  si: string;
  ta: string;
  en: string;
}

export interface ModerationResult {
  status: 'clean' | 'flagged' | 'blocked';
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Detect language script or pattern
 */
export function detectLanguage(text: string): 'si' | 'ta' | 'en' {
  if (!text) return 'en';
  // Sinhala unicode range: 0D80–0DFF
  if (/[\u0D80-\u0DFF]/.test(text)) return 'si';
  // Tamil unicode range: 0B80–0BFF
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  return 'en';
}

/**
 * Auto-translates a message into Sinhala, Tamil, and English.
 */
export async function autoTranslateMessage(
  env: any,
  text: string
): Promise<TranslationResult> {
  const result: TranslationResult = {
    si: text,
    ta: text,
    en: text
  };

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return result;
  }

  const detected = detectLanguage(text);
  result[detected] = text;

  if (!env.AI) {
    return result;
  }

  const targetLangs = (['si', 'ta', 'en'] as const).filter(l => l !== detected);

  for (const target of targetLangs) {
    try {
      // Attempt translation with m2m100 model or instruct model
      const res = await env.AI.run('@cf/meta/m2m100-1.2b', {
        text,
        source_lang: detected,
        target_lang: target
      });

      if (res?.translated_text) {
        result[target] = res.translated_text;
      } else {
        // Fallback: prompt-based translation using instruct model
        const langNames = { si: 'Sinhala', ta: 'Tamil', en: 'English' };
        const promptRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: `Translate the user message strictly into ${langNames[target]}. Respond only with the translated text without explanations.`
            },
            { role: 'user', content: text }
          ]
        });
        if (promptRes?.response) {
          result[target] = promptRes.response.trim();
        }
      }
    } catch (err) {
      console.warn(`[ChatLK AI] Translation to ${target} failed:`, err);
      result[target] = text;
    }
  }

  return result;
}

/**
 * Generates 3 contextual smart replies based on recent chat messages.
 * Uses Workers AI and caches in KV for 5 minutes.
 */
export async function getSmartReplySuggestions(
  env: any,
  chatId: string,
  recentMessages: Array<{ text: string; sender_id: string }>,
  userLang: string = 'en'
): Promise<string[]> {
  const cacheKey = `suggestions:${chatId}:${userLang}`;

  // Check KV cache first (Feature 11 requirement: 5 min TTL)
  if (env.CACHE) {
    try {
      const cached = await env.CACHE.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
  }

  const defaultSuggestions: Record<string, string[]> = {
    en: ['Sounds good!', 'Understood, thanks!', 'I will check and let you know.'],
    si: ['හොඳයි, ස්තූතියි!', 'මම පසුව දන්වන්නම්.', 'තේරුණා, ගැටළුවක් නැහැ.'],
    ta: ['சரி, நன்றி!', 'நான் பார்த்து சொல்கிறேன்.', 'புரிந்தது, பரவாயில்லை.']
  };

  const fallback: string[] = defaultSuggestions[userLang] || defaultSuggestions['en'] || [];

  if (!env.AI || !recentMessages || recentMessages.length === 0) {
    return fallback;
  }

  try {
    const chatSnippet = recentMessages
      .slice(-5)
      .map(m => m.text)
      .filter(Boolean)
      .join('\n');

    const prompt = `Based on the following recent conversation snippet, generate exactly 3 short, friendly, natural reply suggestions in ${userLang === 'si' ? 'Sinhala' : userLang === 'ta' ? 'Tamil' : 'English'}. Return ONLY a valid JSON array of 3 strings, e.g. ["reply 1", "reply 2", "reply 3"]. No other text.\n\nConversation:\n${chatSnippet}`;

    const res = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }]
    });

    let suggestions: string[] = fallback;
    if (res?.response) {
      const match = res.response.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          suggestions = parsed.slice(0, 3).map((s: any) => String(s).trim());
        }
      }
    }

    // Cache in KV for 300 seconds (5 minutes)
    if (env.CACHE) {
      await env.CACHE.put(cacheKey, JSON.stringify(suggestions), { expirationTtl: 300 });
    }

    return suggestions;
  } catch (err) {
    console.warn('[ChatLK AI] Suggestions generation error:', err);
    return fallback;
  }
}

/**
 * AI Content Moderation for text messages.
 * Detects profanity, spam, harassment, and severe safety violations.
 */
export async function moderateMessageText(
  env: any,
  text: string
): Promise<ModerationResult> {
  if (!text || typeof text !== 'string') {
    return { status: 'clean' };
  }

  // Fast-path heuristic for obvious severe spam/phishing/abuse
  const lower = text.toLowerCase();
  const severePatterns = [
    /\b(kill\s+yourself|commit\s+suicide)\b/i,
    /\b(child\s+abuse|csam)\b/i
  ];
  for (const pattern of severePatterns) {
    if (pattern.test(lower)) {
      return {
        status: 'blocked',
        reason: 'Violates safety guidelines (severe harm/abuse)',
        severity: 'high'
      };
    }
  }

  const flaggedPatterns = [
    /\b(spam|free\s+crypto|send\s+otp|bank\s+password)\b/i,
    /\b(idiot|fool|scam)\b/i
  ];
  for (const pattern of flaggedPatterns) {
    if (pattern.test(lower)) {
      return {
        status: 'flagged',
        reason: 'Flagged for suspicious language or harassment',
        severity: 'low'
      };
    }
  }

  if (!env.AI) {
    return { status: 'clean' };
  }

  try {
    const res = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a chat moderation assistant. Classify the message as either "clean", "flagged", or "blocked" (severe harm, violence, or illegal content). Return ONLY a JSON object: {"status": "clean"|"flagged"|"blocked", "reason": "short explanation", "severity": "low"|"medium"|"high"}'
        },
        { role: 'user', content: text }
      ]
    });

    if (res?.response) {
      const match = res.response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (['clean', 'flagged', 'blocked'].includes(parsed.status)) {
          return {
            status: parsed.status,
            reason: parsed.reason || 'AI moderation trigger',
            severity: parsed.severity || 'low'
          };
        }
      }
    }
  } catch (err) {
    console.warn('[ChatLK AI] Moderation run note:', err);
  }

  return { status: 'clean' };
}
