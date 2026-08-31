import React, { useState, useRef, useEffect } from "react";

// Zero-dependency SVG Icon components
const UploadCloud = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);

const Sparkles = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const ScanLine = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" x2="17" y1="12" y2="12" />
  </svg>
);

const Loader2 = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const CheckCircle2 = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const Calendar = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="19" y1="10" y2="10" />
  </svg>
);

const Hash = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

const Coins = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
  </svg>
);

const RefreshCw = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const Trash2 = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

const Building2 = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

// ---------------------------------------------------------------------------
// OCR text normalisation + extraction helpers
// ---------------------------------------------------------------------------

// Fix the most common OCR character confusions inside numeric tokens only,
// so bank names ("BOC", "LOLC") are never damaged.
const normalizeOcrText = (raw) => {
  if (!raw) return "";
  let text = String(raw)
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[ \t]{2,}/g, " ");

  // Inside tokens that are mostly digits, map O/o->0, l/I->1, S->5, B->8
  text = text.replace(/[A-Za-z0-9,.]{3,}/g, (token) => {
    const digits = (token.match(/[0-9]/g) || []).length;
    const letters = (token.match(/[A-Za-z]/g) || []).length;
    // Only clean tokens that are essentially numbers (at most one stray letter),
    // so prefixed references like "BOC123456789" stay intact.
    if (letters <= 1 && digits >= Math.ceil(token.replace(/[.,]/g, "").length * 0.6)) {
      return token
        .replace(/[Oo]/g, "0")
        .replace(/[lI]/g, "1")
        .replace(/[S]/g, "5")
        .replace(/[B]/g, "8");
    }
    return token;
  });

  return text;
};

const toNumber = (str) => {
  if (!str) return NaN;
  let s = String(str).trim().replace(/\s/g, "");
  // 1.234,56 (European style) -> 1234.56
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  return parseFloat(s);
};

const AMOUNT_TOKEN = "(\\d{1,3}(?:[,\\s]\\d{3})+(?:\\.\\d{1,2})?|\\d+\\.\\d{2}|\\d{2,7})";

// Text extraction regex helpers
export const parseReceiptText = (input) => {
  const text = normalizeOcrText(input);
  if (!text) {
    return { amount: "", reference: "", date: "", paymentMethod: "", bankName: "", rawText: "" };
  }

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ---------------------------------------------------------------- amount
  const candidates = [];
  const pushCandidate = (value, score) => {
    if (!isFinite(value)) return;
    if (value < 20 || value > 10000000) return;
    candidates.push({ value, score });
  };

  const strongLabel =
    /(transfer(?:red)?\s*amount|deposit\s*amount|transaction\s*amount|total\s*amount|amount\s*paid|paid\s*amount|amount|total|sum|value|debit(?:ed)?|credit(?:ed)?)/i;

  lines.forEach((line) => {
    const hasStrongLabel = strongLabel.test(line);
    const hasCurrency = /\b(lkr|rs\.?|rupees)\b/i.test(line);
    // Ignore lines that are clearly not amounts
    if (
      /(account|acc\s*no|a\/c|card|reference|ref\s*no|journal|txn|trace|mobile|phone|date|time|balance)/i.test(
        line,
      ) &&
      !hasStrongLabel
    ) {
      return;
    }

    const re = new RegExp(`${AMOUNT_TOKEN}`, "g");
    let m;
    while ((m = re.exec(line)) !== null) {
      const token = m[1];
      const value = toNumber(token);
      const formatted = /[,.]/.test(token);
      let score = 0;
      if (hasStrongLabel) score += 6;
      if (hasCurrency) score += 4;
      if (formatted) score += 3;
      if (/\.\d{2}\b/.test(token)) score += 2;
      if (!formatted && token.length > 7) score -= 6; // looks like an account no
      if (score <= 0) continue;
      pushCandidate(value, score);
    }
  });

  let amount = "";
  if (candidates.length) {
    candidates.sort((a, b) => b.score - a.score || b.value - a.value);
    const best = candidates[0].value;
    amount = Number.isInteger(best) ? String(best) : String(Number(best.toFixed(2)));
  }

  // ------------------------------------------------------------- reference
  let reference = "";
  const refLabel =
    /(reference(?:\s*(?:no|number|id))?|ref(?:\s*(?:no|number|id))?|transaction(?:\s*(?:no|id))?|txn(?:\s*(?:no|id))?|journal(?:\s*(?:no|entry))?|trace(?:\s*no)?|receipt(?:\s*no)?|slip(?:\s*no)?|approval(?:\s*code)?|confirmation(?:\s*(?:no|code))?|doc(?:\s*no)?)\s*[:#.\-]?\s*([A-Z0-9][A-Z0-9\-_/]{4,25})/i;

  for (const line of lines) {
    const m = line.match(refLabel);
    if (m && m[2]) {
      const cand = m[2].replace(/[-_/]+$/, "");
      if (!/^\d{1,2}[-/.]\d{1,2}/.test(cand) && cand.replace(/\D/g, "").length >= 4) {
        reference = cand;
        break;
      }
    }
  }

  if (!reference) {
    // Longest standalone alphanumeric sequence that is not the amount/date
    const generic = text.match(/\b(?:[A-Z]{2,4}\d{6,18}|\d{8,18})\b/g) || [];
    const filtered = generic.filter((v) => v !== String(amount) && !/^20\d{6}$/.test(v));
    if (filtered.length) {
      reference = filtered.sort((a, b) => b.length - a.length)[0];
    }
  }

  // ------------------------------------------------------------------ date
  let date = "";
  const dateMatch =
    text.match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/) ||
    text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/) ||
    text.match(
      /\b(\d{1,2}\s?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?20\d{2})\b/i,
    );
  if (dateMatch) date = dateMatch[1];

  // -------------------------------------------------------- payment method
  let paymentMethod = "";
  let bankName = "";
  const lower = text.toLowerCase();
  const bankMap = [
    [["ipay", "i-pay", "lolc finance"], "MOBILE_BANKING", "iPay (LOLC)"],
    [
      ["frimi", "genie", "ez cash", "ezcash", "mcash", "m-cash", "helapay"],
      "MOBILE_BANKING",
      "Mobile Wallet",
    ],
    [["bank of ceylon", "boc"], "BANK_TRANSFER", "Bank of Ceylon (BOC)"],
    [["people's bank", "peoples bank"], "BANK_TRANSFER", "People's Bank"],
    [["sampath"], "BANK_TRANSFER", "Sampath Bank"],
    [["commercial bank", "combank"], "BANK_TRANSFER", "Commercial Bank"],
    [["hatton", "hnb"], "BANK_TRANSFER", "HNB"],
    [["seylan"], "BANK_TRANSFER", "Seylan Bank"],
    [["lolc"], "BANK_TRANSFER", "LOLC Bank"],
    [["nsb", "national savings"], "BANK_TRANSFER", "NSB"],
    [["dfcc"], "BANK_TRANSFER", "DFCC Bank"],
    [["ndb"], "BANK_TRANSFER", "NDB"],
  ];
  for (const [keys, method, name] of bankMap) {
    if (keys.some((k) => lower.includes(k))) {
      paymentMethod = method;
      bankName = name;
      break;
    }
  }
  if (!paymentMethod && /(transfer|deposit|slip|payment)/i.test(lower)) {
    paymentMethod = "BANK_TRANSFER";
  }

  return {
    amount: amount || "",
    reference: reference || "",
    date: date || "",
    paymentMethod: paymentMethod || "",
    bankName,
    rawText: text,
  };
};

// Prepare the image for OCR: upscale small slips, grayscale + contrast stretch.
// Returns { dataUrl, ocrDataUrl } — the first for preview/upload, the second
// (higher contrast, larger) is what actually gets fed to the OCR engine.
export const processReceiptImageToDataUrl = (file, callback) => {
  const reader = new FileReader();
  reader.onerror = () => callback(null, null);
  reader.onload = (e) => {
    const img = new Image();
    img.onerror = () => callback(null, null);
    img.onload = () => {
      // --- preview / upload copy (max 1200px) ---
      const makeCanvas = (maxDim) => {
        let width = img.width;
        let height = img.height;
        const scale = maxDim / Math.max(width, height);
        if (scale !== 1 && isFinite(scale)) {
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        return { canvas, ctx, width, height };
      };

      const preview = makeCanvas(Math.min(1200, Math.max(img.width, img.height)));
      const dataUrl = preview.canvas.toDataURL("image/jpeg", 0.85);

      // --- OCR copy: upscale to ~1800px longest side, grayscale + contrast ---
      const target = Math.min(2000, Math.max(1400, Math.max(img.width, img.height)));
      const { canvas, ctx, width, height } = makeCanvas(target);
      let ocrDataUrl = dataUrl;
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const d = imageData.data;
        // grayscale + collect histogram bounds
        let min = 255;
        let max = 0;
        for (let i = 0; i < d.length; i += 4) {
          const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
          d[i] = d[i + 1] = d[i + 2] = g;
          if (g < min) min = g;
          if (g > max) max = g;
        }
        const range = Math.max(1, max - min);
        for (let i = 0; i < d.length; i += 4) {
          // contrast stretch + slight gamma to sharpen thin printed digits
          let v = ((d[i] - min) / range) * 255;
          v = 255 * Math.pow(v / 255, 0.85);
          v = Math.max(0, Math.min(255, v));
          d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(imageData, 0, 0);
        ocrDataUrl = canvas.toDataURL("image/png");
      } catch (err) {
        // Tainted canvas or memory issue — fall back to the plain copy
        ocrDataUrl = dataUrl;
      }

      callback(dataUrl, ocrDataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

const ReceiptScanner = ({
  onDataExtracted,
  onImageReady,
  receiptImage,
  onRemoveImage,
  notify,
  lang = "si",
  t,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Multi-language text fallback (prefer t?.ocr if passed)
  const texts = t?.ocr || {
    dropzoneTitle:
      lang === "si"
        ? "බැංකු රිසිට්පත මෙතැනට Drag කරන්න, නැතහොත්"
        : lang === "ta"
          ? "ரசீதை இங்கே Drag செய்யவும், அல்லது"
          : "Drag & drop bank receipt here, or",
    browseBtn: lang === "si" ? "Browse Files" : lang === "ta" ? "Browse Files" : "Browse Files",
    dropzoneDesc:
      lang === "si"
        ? "OCR මඟින් රිසිට්පතේ ඇති මුදල සහ Reference ID එක ස්වයංක්‍රීයව Form එකට පුරවයි"
        : lang === "ta"
          ? "OCR மூலம் தொகை மற்றும் Ref ID தானாகவே Form இல் நிரப்பப்படும்"
          : "AI OCR automatically detects and fills Amount and Reference ID into the form",
    scanning:
      lang === "si"
        ? "රිසිට්පත Scan වෙමින් පවතී..."
        : lang === "ta"
          ? "ரசீது ஸ்கேன் செய்யப்படுகிறது..."
          : "Analyzing receipt with AI OCR...",
    detectedHeader:
      lang === "si"
        ? "රිසිට්පතෙන් හඳුනාගත් තොරතුරු"
        : lang === "ta"
          ? "ரசீதில் கண்டறியப்பட்ட விவரங்கள்"
          : "Receipt Details Detected by OCR",
    amount: lang === "si" ? "හඳුනාගත් මුදල" : lang === "ta" ? "தொகை" : "Detected Amount",
    ref: lang === "si" ? "Ref / Journal No" : lang === "ta" ? "Ref ID" : "Ref / Txn ID",
    date: lang === "si" ? "දිනය" : lang === "ta" ? "தேதி" : "Date",
    bankType: lang === "si" ? "ගෙවූ ක්‍රමය" : lang === "ta" ? "செலுத்தும் முறை" : "Payment Method",
    removeBtn: lang === "si" ? "රිසිට්පත ඉවත් කරන්න" : lang === "ta" ? "நீக்குக" : "Remove Slip",
    scanAnother:
      lang === "si"
        ? "වෙනත් රිසිට්පතක් තෝරන්න"
        : lang === "ta"
          ? "வேறொரு ரசீது"
          : "Scan Another Slip",
    successToast:
      lang === "si"
        ? "රිසිට්පත සාර්ථකව Scan කර Form එකට තොරතුරු ඇතුළත් කරන ලදී!"
        : lang === "ta"
          ? "ரசீது வெற்றிகரமாக ஸ்கேன் செய்யப்பட்டு விவரங்கள் நிரப்பப்பட்டன!"
          : "Receipt scanned successfully! Form auto-filled.",
    errorToast:
      lang === "si"
        ? "රිසිට්පත Scan කිරීමට නොහැකි විය. කරුණාකර තොරතුරු කෙලින්ම ඇතුළත් කරන්න."
        : lang === "ta"
          ? "ரசீதை ஸ்கேன் செய்ய முடியவில்லை. விவரங்களை கைமுறையாக உள்ளிடவும்."
          : "Could not scan receipt text. Please enter details manually.",
    invalidImageToast:
      lang === "si"
        ? "කරුණාකර වලංගු Image ෆයිල් එකක් (JPG/PNG/WEBP) තෝරන්න."
        : lang === "ta"
          ? "சரியான படக் கோப்பைத் தேர்ந்தெடுக்கவும் (JPG/PNG/WEBP)."
          : "Please select a valid image file (JPG/PNG/WEBP).",
  };

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Run OCR in the browser with tesseract.js (works even when the server has
  // no Python/PaddleOCR installed, which was why scanning kept failing).
  const runBrowserOcr = async (ocrDataUrl) => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          setProgress(Math.min(95, 25 + Math.round(m.progress * 70)));
        }
      },
    });
    try {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "6",
      });
      const { data } = await worker.recognize(ocrDataUrl);
      return data?.text || "";
    } finally {
      try {
        await worker.terminate();
      } catch (_) {
        /* ignore */
      }
    }
  };

  // Server OCR as a secondary source (Paddle/Tesseract on the host, if any).
  const runServerOcr = async (dataUrl, filename) => {
    const endpoints = ["/api/ocr/scan-receipt", "/api/ocr/deposit-slip"];
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl, filename }),
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.rawText) return data.rawText;
        if (data?.extracted?.rawText) return data.extracted.rawText;
      } catch (_) {
        // try the next endpoint
      }
    }
    return "";
  };

  const hasUsefulData = (d) => Boolean(d && (d.amount || d.reference));

  const processFile = async (file) => {
    if (
      !file ||
      (!file.type.startsWith("image/") && !file.name.match(/\.(png|jpg|jpeg|webp|bmp)$/i))
    ) {
      if (notify) notify(texts.invalidImageToast);
      return;
    }

    setIsScanning(true);
    setProgress(8);
    setStatusText(texts.scanning);
    setExtractedInfo(null);

    // Gentle progress creep until the OCR engine reports real progress
    let currentP = 8;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      currentP = Math.min(24, currentP + 2);
      setProgress((p) => (p < currentP ? currentP : p));
    }, 220);

    processReceiptImageToDataUrl(file, async (dataUrl, ocrDataUrl) => {
      if (!dataUrl) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        setIsScanning(false);
        if (notify) notify(texts.invalidImageToast);
        return;
      }

      if (onImageReady) onImageReady(dataUrl);

      let extractedData = null;
      let ocrFailed = false;

      try {
        let rawText = "";
        try {
          rawText = await runBrowserOcr(ocrDataUrl || dataUrl);
        } catch (err) {
          console.error("[OCR] browser engine failed", err);
        }

        if (progressTimerRef.current) clearInterval(progressTimerRef.current);

        extractedData = parseReceiptText(rawText);

        // If the local pass found nothing useful, ask the server engine too.
        if (!hasUsefulData(extractedData)) {
          setStatusText(texts.scanning);
          setProgress(96);
          const serverText = await runServerOcr(dataUrl, file.name);
          if (serverText) {
            const serverData = parseReceiptText(serverText);
            if (hasUsefulData(serverData)) extractedData = serverData;
          }
        }

        ocrFailed = !hasUsefulData(extractedData);
      } catch (error) {
        console.error("[OCR Error]", error);
        ocrFailed = true;
        extractedData = extractedData || parseReceiptText("");
      } finally {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        setProgress(100);
        setStatusText(
          ocrFailed
            ? lang === "si"
              ? "තොරතුරු හඳුනාගත නොහැකි විය"
              : "No details detected"
            : lang === "si"
              ? "OCR සාර්ථකයි!"
              : "OCR Complete!",
        );

        setExtractedInfo(extractedData);
        if (onDataExtracted && extractedData) onDataExtracted(extractedData);

        if (notify) {
          if (ocrFailed) {
            notify(texts.errorToast);
          } else {
            let msg = texts.successToast;
            if (extractedData?.amount) {
              msg += ` (LKR ${Number(extractedData.amount).toLocaleString()})`;
            }
            notify(msg);
          }
        }

        setTimeout(() => setIsScanning(false), 400);
      }
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isScanning) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isScanning) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleTriggerInput = () => {
    if (fileInputRef.current && !isScanning) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTriggerInput();
    }
  };

  return (
    <div className="ocr-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={isScanning}
        style={{ display: "none" }}
        id="ocr-receipt-file-input"
      />

      {!receiptImage ? (
        <div
          className={`ocr-dropzone ${isDragOver ? "drag-active" : ""} ${isScanning ? "is-scanning" : ""}`}
          onClick={handleTriggerInput}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload and scan deposit receipt"
        >
          <div className="ocr-upload-icon-badge">
            {isScanning ? (
              <Loader2 className="ocr-spin-icon" size={32} />
            ) : isDragOver ? (
              <Sparkles size={32} />
            ) : (
              <UploadCloud size={32} />
            )}
          </div>

          <div>
            <p className="ocr-dropzone-title">
              {texts.dropzoneTitle} <em>{texts.browseBtn}</em>
            </p>
            <p className="ocr-dropzone-desc">{texts.dropzoneDesc}</p>
          </div>

          <div className="ocr-badges-row">
            <span className="ocr-tag">PNG, JPG, WEBP</span>
            <span className="ocr-tag">BOC</span>
            <span className="ocr-tag">Sampath</span>
            <span className="ocr-tag">ComBank</span>
            <span className="ocr-tag">People's</span>
            <span className="ocr-tag">LOLC</span>
            <span className="ocr-tag">iPay / FriMi</span>
          </div>

          {isScanning && (
            <div
              className="ocr-scan-progress-wrap"
              onClick={(e) => e.stopPropagation()}
              role="status"
              aria-live="polite"
            >
              <div className="ocr-scan-header">
                <div className="ocr-scan-status">
                  <ScanLine size={18} className="ocr-spin-icon" />
                  <span>{statusText || texts.scanning}</span>
                </div>
                <span className="ocr-progress-percent">{progress}%</span>
              </div>
              <div
                className="ocr-progress-bar-track"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Receipt scanning progress"
              >
                <div
                  className="ocr-progress-bar-fill"
                  style={{ width: `${Math.max(progress, 6)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="ocr-result-card">
          <div className="ocr-result-body">
            <div className="ocr-receipt-thumb-wrap">
              <img src={receiptImage} alt="Deposit Receipt Preview" className="ocr-receipt-thumb" />
            </div>

            <div className="ocr-extracted-details">
              <div className="ocr-detected-title">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>{texts.detectedHeader}</span>
              </div>

              <div style={{ display: "grid", gap: "6px" }}>
                {extractedInfo?.amount && (
                  <div className="ocr-data-pill">
                    <span
                      className="ocr-data-label"
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Coins size={14} color="var(--green)" />
                      {texts.amount}:
                    </span>
                    <span className="ocr-data-val-amount">
                      LKR {Number(extractedInfo.amount).toLocaleString()}
                    </span>
                  </div>
                )}

                {extractedInfo?.reference && (
                  <div className="ocr-data-pill">
                    <span
                      className="ocr-data-label"
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Hash size={14} color="var(--blue)" />
                      {texts.ref}:
                    </span>
                    <span className="ocr-data-val-ref">{extractedInfo.reference}</span>
                  </div>
                )}

                {extractedInfo?.date && (
                  <div className="ocr-data-pill">
                    <span
                      className="ocr-data-label"
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Calendar size={14} />
                      {texts.date}:
                    </span>
                    <span style={{ color: "var(--ink)", fontWeight: "600" }}>
                      {extractedInfo.date}
                    </span>
                  </div>
                )}

                {extractedInfo?.paymentMethod && (
                  <div className="ocr-data-pill">
                    <span
                      className="ocr-data-label"
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Building2 size={14} />
                      {texts.bankType}:
                    </span>
                    <span style={{ color: "var(--green)", fontWeight: "700" }}>
                      {extractedInfo.paymentMethod === "BANK_TRANSFER"
                        ? "Bank Transfer"
                        : "Mobile Banking"}
                    </span>
                  </div>
                )}

                {!extractedInfo?.amount && !extractedInfo?.reference && !isScanning && (
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: "12px",
                      fontStyle: "italic",
                      padding: "4px 0",
                    }}
                  >
                    {lang === "si"
                      ? "ඡායාරූපය සාර්ථකව සම්බන්ධ විය. තොරතුරු පහත Form එකෙන්ද වෙනස් කළ හැක."
                      : "Receipt attached. You can adjust details in the form below."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isScanning && (
            <div className="ocr-scan-progress-wrap">
              <div className="ocr-scan-header">
                <div className="ocr-scan-status">
                  <ScanLine size={18} className="ocr-spin-icon" />
                  <span>{statusText || texts.scanning}</span>
                </div>
                <span className="ocr-progress-percent">{progress}%</span>
              </div>
              <div
                className="ocr-progress-bar-track"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Receipt scanning progress"
              >
                <div
                  className="ocr-progress-bar-fill"
                  style={{ width: `${Math.max(progress, 6)}%` }}
                />
              </div>
            </div>
          )}

          <div className="ocr-actions-row">
            <button
              type="button"
              className="ocr-btn-secondary"
              onClick={handleTriggerInput}
              disabled={isScanning}
            >
              <RefreshCw size={14} />
              {texts.scanAnother}
            </button>
            <button
              type="button"
              className="ocr-btn-danger"
              onClick={() => {
                setExtractedInfo(null);
                if (onRemoveImage) onRemoveImage();
              }}
            >
              <Trash2 size={14} />
              {texts.removeBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptScanner;
