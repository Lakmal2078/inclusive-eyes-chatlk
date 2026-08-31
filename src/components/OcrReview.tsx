import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, RotateCcw, ScanLine, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { scanReceipt, type ExtractedField, type OcrResult } from "@/lib/receipt-ocr";
import { cn } from "@/lib/utils";

type Stage = "idle" | "scanning" | "review" | "saved";

function confidenceTone(confidence: number) {
  if (confidence >= 0.8) return { label: "High", cls: "text-chart-2", bar: "bg-chart-2" };
  if (confidence >= 0.5) return { label: "Medium", cls: "text-chart-5", bar: "bg-chart-5" };
  return { label: "Low", cls: "text-destructive", bar: "bg-destructive" };
}

function FieldRow({
  field,
  edited,
  onChange,
  onReset,
}: {
  field: ExtractedField;
  edited: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const tone = confidenceTone(field.confidence);
  const pct = Math.round(field.confidence * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={field.key} className="text-sm font-medium">
          {field.label}
        </Label>
        <div className="flex items-center gap-2">
          {edited && (
            <Badge variant="secondary" className="gap-1">
              <Pencil className="size-3" /> edited
            </Badge>
          )}
          <span className={cn("text-xs font-semibold tabular-nums", tone.cls)}>
            {tone.label} · {pct}%
          </span>
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          id={field.key}
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.confidence === 0 ? "Not detected — type it in" : ""}
          className="font-mono"
        />
        {edited && (
          <Button variant="ghost" size="icon" onClick={onReset} title="Restore OCR value">
            <RotateCcw className="size-4" />
          </Button>
        )}
      </div>

      {field.source && (
        <p className="mt-2 truncate text-xs text-muted-foreground" title={field.source}>
          Read from: “{field.source}”
        </p>
      )}
    </div>
  );
}

export function OcrReview() {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showRaw, setShowRaw] = useState(false);

  const fields = useMemo(
    () => result?.fields.map((f) => ({ ...f, value: values[f.key] ?? f.value })) ?? [],
    [result, values],
  );
  const lowConfidence = fields.filter((f) => f.confidence < 0.5).length;

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setStage("scanning");
    setProgress(0);
    setValues({});
    try {
      const res = await scanReceipt(file, (p, s) => {
        setProgress(p);
        setStatus(s);
      });
      setResult(res);
      setStage("review");
    } catch (error) {
      console.error(error);
      toast.error("Could not read that image. Try a sharper photo.");
      setStage("idle");
    }
  }

  function save() {
    const missing = fields.filter((f) => !f.value.trim());
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setStage("saved");
    toast.success("Receipt saved with your reviewed values.");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-primary">
          <ScanLine className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Receipt OCR</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Review extracted details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan a deposit slip, check each field's confidence score, correct anything that looks
          wrong, then save.
        </p>
      </header>

      {stage === "idle" && (
        <Card className="border-dashed p-8 text-center">
          <Upload className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">Upload a receipt photo or screenshot</p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG or PNG · processed on your device
          </p>
          <label className="mt-5 inline-flex">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <span className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Choose image
            </span>
          </label>
        </Card>
      )}

      {stage === "scanning" && (
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Scanning receipt…</p>
              <p className="text-xs capitalize text-muted-foreground">{status || "preparing"}</p>
            </div>
          </div>
          <Progress value={progress} className="mt-5" />
          <p className="mt-2 text-right text-xs tabular-nums text-muted-foreground">{progress}%</p>
        </Card>
      )}

      {(stage === "review" || stage === "saved") && result && (
        <div className="space-y-4">
          <Card className="flex items-center gap-4 p-4">
            {preview && (
              <img
                src={preview}
                alt="Uploaded receipt preview"
                className="size-20 rounded-lg border border-border object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Overall OCR confidence {Math.round(result.meanConfidence * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {lowConfidence
                  ? `${lowConfidence} field${lowConfidence > 1 ? "s" : ""} need${lowConfidence > 1 ? "" : "s"} your attention.`
                  : "All fields read cleanly — a quick check is still a good idea."}
              </p>
            </div>
          </Card>

          {fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              edited={values[field.key] !== undefined}
              onChange={(value) => setValues((v) => ({ ...v, [field.key]: value }))}
              onReset={() =>
                setValues((v) => {
                  const next = { ...v };
                  delete next[field.key];
                  return next;
                })
              }
            />
          ))}

          <Card className="p-4">
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              {showRaw ? "Hide" : "Show"} raw OCR text
            </button>
            {showRaw && (
              <>
                <Separator className="my-3" />
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {result.rawText}
                </pre>
              </>
            )}
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={save} disabled={stage === "saved"}>
              {stage === "saved" ? (
                <>
                  <Check className="size-4" /> Saved
                </>
              ) : (
                "Save reviewed details"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStage("idle");
                setResult(null);
                setPreview(null);
                setValues({});
              }}
            >
              Scan another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
