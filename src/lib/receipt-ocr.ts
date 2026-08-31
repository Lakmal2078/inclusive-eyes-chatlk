export type FieldKey = "amount" | "date" | "reference" | "bank" | "accountNumber";

export type ExtractedField = {
  key: FieldKey;
  label: string;
  value: string;
  /** 0..1 model confidence for this field */
  confidence: number;
  /** raw OCR line the value was taken from */
  source: string;
};

export type OcrResult = {
  fields: ExtractedField[];
  rawText: string;
  meanConfidence: number;
};

const FIELD_LABELS: Record<FieldKey, string> = {
  amount: "Amount",
  date: "Date",
  reference: "Reference / Transaction ID",
  bank: "Bank / Wallet",
  accountNumber: "Account number",
};

const BANKS = [
  "Bank of Ceylon",
  "BOC",
  "Sampath Bank",
  "Sampath",
  "People's Bank",
  "Commercial Bank",
  "ComBank",
  "HNB",
  "Hatton National Bank",
  "NSB",
  "Seylan Bank",
  "NDB",
  "DFCC",
  "Pan Asia Bank",
  "Union Bank",
  "LOLC",
  "iPay",
  "eZ Cash",
  "FriMi",
];

/** Fix common OCR character confusion inside mostly-numeric tokens. */
export function normalizeOcrText(raw: string): string {
  if (!raw) return "";
  const text = raw
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[ \t]{2,}/g, " ");

  return text.replace(/[A-Za-z0-9,.]{3,}/g, (token) => {
    const digits = (token.match(/[0-9]/g) || []).length;
    const letters = (token.match(/[A-Za-z]/g) || []).length;
    const len = token.replace(/[.,]/g, "").length;
    if (letters <= 1 && digits >= Math.ceil(len * 0.6)) {
      return token
        .replace(/[Oo]/g, "0")
        .replace(/[lI]/g, "1")
        .replace(/S/g, "5")
        .replace(/B/g, "8");
    }
    return token;
  });
}

type Line = { text: string; confidence: number };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pickAmount(lines: Line[]): ExtractedField {
  let best: { value: string; score: number; conf: number; source: string } | null = null;

  for (const line of lines) {
    const lower = line.text.toLowerCase();
    const matches = line.text.matchAll(
      /(?:lkr|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]+\.[0-9]{2})/gi,
    );
    for (const m of matches) {
      const raw = m[1] ?? "";
      if (!raw) continue;
      const numeric = Number(raw.replace(/,/g, ""));
      if (!Number.isFinite(numeric) || numeric <= 0) continue;

      let score = 1;
      if (/lkr|rs\.?/i.test(m[0])) score += 3;
      if (/amount|total|paid|transfer|credit|value/.test(lower)) score += 3;
      if (raw.includes(".") || raw.includes(",")) score += 1;
      // account / phone / date-like numbers are penalised
      if (/account|acc no|a\/c|ref|card|phone|mobile|date/.test(lower)) score -= 3;
      if (!raw.includes(".") && !raw.includes(",") && raw.length > 6) score -= 3;

      if (!best || score > best.score) {
        best = {
          value: numeric.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          score,
          conf: line.confidence,
          source: line.text.trim(),
        };
      }
    }
  }

  return {
    key: "amount",
    label: FIELD_LABELS.amount,
    value: best?.value ?? "",
    confidence: best ? clamp01(best.conf * (0.6 + Math.min(best.score, 7) / 17.5)) : 0,
    source: best?.source ?? "",
  };
}

function pickByRegex(
  key: FieldKey,
  lines: Line[],
  regex: RegExp,
  keywords: RegExp,
  transform: (m: RegExpMatchArray) => string = (m) => (m[1] ?? m[0]).trim(),
): ExtractedField {
  let best: { value: string; conf: number; source: string } | null = null;
  for (const line of lines) {
    const m = line.text.match(regex);
    if (!m) continue;
    const bonus = keywords.test(line.text.toLowerCase()) ? 0.15 : -0.15;
    const conf = clamp01(line.confidence + bonus);
    if (!best || conf > best.conf) {
      best = { value: transform(m), conf, source: line.text.trim() };
    }
  }
  return {
    key,
    label: FIELD_LABELS[key],
    value: best?.value ?? "",
    confidence: best ? best.conf : 0,
    source: best?.source ?? "",
  };
}

function pickBank(lines: Line[]): ExtractedField {
  for (const line of lines) {
    for (const bank of BANKS) {
      const re = new RegExp(`\\b${bank.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(line.text)) {
        return {
          key: "bank",
          label: FIELD_LABELS.bank,
          value: bank,
          confidence: clamp01(line.confidence),
          source: line.text.trim(),
        };
      }
    }
  }
  return { key: "bank", label: FIELD_LABELS.bank, value: "", confidence: 0, source: "" };
}

export function parseReceiptText(rawText: string, lines: Line[]): ExtractedField[] {
  const normalized = lines.map((l) => ({
    text: normalizeOcrText(l.text),
    confidence: clamp01(l.confidence),
  }));
  void rawText;

  return [
    pickAmount(normalized),
    pickByRegex(
      "date",
      normalized,
      /(\d{2,4}[-/.]\d{1,2}[-/.]\d{2,4}(?:[ ,]+\d{1,2}:\d{2}(?::\d{2})?)?)/,
      /date|time|on\b/,
    ),
    pickByRegex(
      "reference",
      normalized,
      /(?:ref(?:erence)?(?:\s*(?:no|id|#))?|txn|transaction(?:\s*id)?|trace)\D{0,4}([A-Z0-9-]{5,24})/i,
      /ref|txn|transaction|trace/,
    ),
    pickBank(normalized),
    pickByRegex(
      "accountNumber",
      normalized,
      /(?:a\/c|acc(?:ount)?)\D{0,10}([0-9X*]{6,20})/i,
      /account|a\/c/,
    ),
  ];
}

/** Upscale + grayscale + contrast stretch to help Tesseract with faint receipts. */
async function preprocess(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(3, Math.max(1, 1400 / Math.max(bitmap.width, bitmap.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return URL.createObjectURL(file);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0);
    const c = clamp01((g / 255 - 0.5) * 1.45 + 0.5) * 255;
    d[i] = d[i + 1] = d[i + 2] = c;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function scanReceipt(
  file: File,
  onProgress?: (progress: number, status: string) => void,
): Promise<OcrResult> {
  const image = await preprocess(file);
  const { default: Tesseract } = await import("tesseract.js");

  const result = await Tesseract.recognize(image, "eng", {
    logger: (m: { progress?: number; status?: string }) =>
      onProgress?.(Math.round((m.progress ?? 0) * 100), m.status ?? "working"),
  });

  const data = result.data as unknown as {
    text: string;
    confidence?: number;
    lines?: { text: string; confidence: number }[];
  };

  const lines: Line[] =
    data.lines?.map((l) => ({ text: l.text, confidence: (l.confidence ?? 0) / 100 })) ??
    data.text.split("\n").map((text) => ({ text, confidence: (data.confidence ?? 0) / 100 }));

  return {
    fields: parseReceiptText(data.text, lines),
    rawText: data.text,
    meanConfidence: clamp01((data.confidence ?? 0) / 100),
  };
}
