"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Field } from "@/components/ui/Input";
import { Logo } from "@/components/Logo";
import { StyledQrCode } from "@/components/StyledQrCode";
import { deriveBrandSteps } from "@/lib/brandColor";
import { QR_DOT_STYLE_LABEL, QR_DOT_STYLES, type QrDotStyle } from "@/lib/qrStyle";
import { toast } from "@/lib/toastStore";

type SettingsDTO = {
  restaurantName: string;
  logoUrl: string | null;
  brandColorHex: string;
  qrDotStyle: string;
  qrLogoInCenter: boolean;
};

export function SettingsManager({
  settings,
  previewUrl,
}: {
  settings: SettingsDTO;
  previewUrl: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    restaurantName: settings.restaurantName,
    logoUrl: settings.logoUrl ?? "",
    brandColorHex: settings.brandColorHex,
    qrDotStyle: (settings.qrDotStyle as QrDotStyle) || "square",
    qrLogoInCenter: settings.qrLogoInCenter,
  });
  const [saving, setSaving] = useState(false);

  const validHex = /^#[0-9a-fA-F]{6}$/.test(form.brandColorHex);
  const swatches = useMemo(
    () => (validHex ? deriveBrandSteps(form.brandColorHex) : []),
    [form.brandColorHex, validHex]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.restaurantName.trim()) {
      toast.error("Digite o nome do restaurante.");
      return;
    }
    if (!validHex) {
      toast.error("Cor inválida — use o formato #rrggbb.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: form.restaurantName.trim(),
          logoUrl: form.logoUrl.trim() || null,
          brandColorHex: form.brandColorHex,
          qrDotStyle: form.qrDotStyle,
          qrLogoInCenter: form.qrLogoInCenter,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Configurações salvas — já valendo em todo o sistema.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-5">
        <form onSubmit={save} className="space-y-5">
          <Field label="Nome do restaurante">
            <Input
              value={form.restaurantName}
              onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
              placeholder="Ex: Cantina do Zé"
            />
          </Field>

          <Field label="Logo (URL da imagem, opcional)">
            <Input
              icon={<ImageIcon />}
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>

          <Field label="Cor da marca">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={validHex ? form.brandColorHex : "#c1401f"}
                onChange={(e) => setForm({ ...form, brandColorHex: e.target.value })}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-white p-1"
                aria-label="Escolher cor da marca"
              />
              <Input
                value={form.brandColorHex}
                onChange={(e) => setForm({ ...form, brandColorHex: e.target.value })}
                placeholder="#c1401f"
                className="w-32 font-mono"
              />
              {!validHex && (
                <span className="text-xs text-red-600">formato #rrggbb</span>
              )}
            </div>
            {swatches.length > 0 && (
              <div className="mt-2 flex overflow-hidden rounded-lg">
                {swatches.map((s) => (
                  <span
                    key={s.step}
                    className="h-6 flex-1"
                    style={{ background: s.color }}
                    title={`brand-${s.step}`}
                  />
                ))}
              </div>
            )}
          </Field>

          <Field label="Estilo do QR Code">
            <Select
              value={form.qrDotStyle}
              onChange={(e) => setForm({ ...form, qrDotStyle: e.target.value as QrDotStyle })}
            >
              {QR_DOT_STYLES.map((style) => (
                <option key={style} value={style}>
                  {QR_DOT_STYLE_LABEL[style]}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.qrLogoInCenter}
              disabled={!form.logoUrl.trim()}
              onChange={(e) => setForm({ ...form, qrLogoInCenter: e.target.checked })}
              className="h-4 w-4 accent-brand-600 disabled:opacity-40"
            />
            <span className={form.logoUrl.trim() ? "text-stone-700" : "text-stone-400"}>
              Usar o logo no centro do QR Code
              {!form.logoUrl.trim() && " (defina um logo primeiro)"}
            </span>
          </label>

          <Button type="submit" loading={saving} icon={<Save />}>
            Salvar configurações
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Como vai ficar
          </p>
          <Logo
            name={form.restaurantName || "Comandas"}
            logoUrl={form.logoUrl.trim() || null}
          />
        </Card>

        <Card className="flex flex-col items-center gap-3 p-5">
          <p className="self-start text-xs font-semibold tracking-wide text-stone-500 uppercase">
            QR Code de exemplo
          </p>
          {validHex ? (
            <StyledQrCode
              data={previewUrl}
              size={200}
              style={{
                color: form.brandColorHex,
                dotStyle: form.qrDotStyle,
                logoUrl: form.logoUrl.trim() || null,
                useLogo: form.qrLogoInCenter && !!form.logoUrl.trim(),
              }}
            />
          ) : (
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400">
              cor inválida
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
