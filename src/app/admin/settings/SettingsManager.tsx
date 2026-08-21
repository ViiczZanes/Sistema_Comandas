"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Field } from "@/components/ui/Input";
import { Logo } from "@/components/Logo";
import { StyledQrCode } from "@/components/StyledQrCode";
import { deriveBrandSteps } from "@/lib/brandColor";
import { reaisToCents } from "@/lib/money";
import { QR_DOT_STYLE_LABEL, QR_DOT_STYLES, type QrDotStyle } from "@/lib/qrStyle";
import { toast } from "@/lib/toastStore";

type SettingsDTO = {
  restaurantName: string;
  logoUrl: string | null;
  brandColorHex: string;
  qrDotStyle: string;
  qrLogoInCenter: boolean;
  serviceFeeEnabled: boolean;
  serviceFeePercent: number;
  couvertEnabled: boolean;
  couvertCents: number;
  kioskEnabled: boolean;
  deliveryEnabled: boolean;
  scheduledPickupEnabled: boolean;
};

export function SettingsManager({
  settings,
  previewUrl,
  slug,
}: {
  settings: SettingsDTO;
  previewUrl: string;
  /** Identificador do restaurante nas telas públicas que não chegam via QR
   * Code de mesa/comanda (totem físico, /pedir remoto) — ver
   * src/app/totem/[slug] e src/app/pedir/[slug]. */
  slug: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    restaurantName: settings.restaurantName,
    logoUrl: settings.logoUrl ?? "",
    brandColorHex: settings.brandColorHex,
    qrDotStyle: (settings.qrDotStyle as QrDotStyle) || "square",
    qrLogoInCenter: settings.qrLogoInCenter,
    serviceFeeEnabled: settings.serviceFeeEnabled,
    serviceFeePercent: settings.serviceFeePercent,
    couvertEnabled: settings.couvertEnabled,
    couvertReais: (settings.couvertCents / 100).toFixed(2),
    kioskEnabled: settings.kioskEnabled,
    deliveryEnabled: settings.deliveryEnabled,
    scheduledPickupEnabled: settings.scheduledPickupEnabled,
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
    if (form.serviceFeePercent < 0 || form.serviceFeePercent > 100) {
      toast.error("A taxa de serviço precisa estar entre 0 e 100%.");
      return;
    }
    const couvertCents = reaisToCents(Number(form.couvertReais) || 0);
    if (form.couvertEnabled && couvertCents <= 0) {
      toast.error("Informe um valor de couvert maior que zero.");
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
          serviceFeeEnabled: form.serviceFeeEnabled,
          serviceFeePercent: form.serviceFeePercent,
          couvertEnabled: form.couvertEnabled,
          couvertCents,
          kioskEnabled: form.kioskEnabled,
          deliveryEnabled: form.deliveryEnabled,
          scheduledPickupEnabled: form.scheduledPickupEnabled,
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

          <Field label="Taxa de serviço">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.serviceFeeEnabled}
                  onChange={(e) =>
                    setForm({ ...form, serviceFeeEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-stone-700">
                  Cobrar taxa de serviço no fechamento
                </span>
              </label>
              {form.serviceFeeEnabled && (
                <div className="flex items-center gap-2 pl-7">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.serviceFeePercent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        serviceFeePercent: Number(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-stone-500">
                    % somado ao total na hora de fechar a comanda no PDV — não
                    aparece na conta que o cliente vê antes disso.
                  </span>
                </div>
              )}
            </div>
          </Field>

          <Field label="Taxa de couvert">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.couvertEnabled}
                  onChange={(e) =>
                    setForm({ ...form, couvertEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-stone-700">
                  Cobrar couvert por comanda
                </span>
              </label>
              {form.couvertEnabled && (
                <div className="flex items-center gap-2 pl-7">
                  <span className="text-sm text-stone-500">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.couvertReais}
                    onChange={(e) =>
                      setForm({ ...form, couvertReais: e.target.value })
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-stone-500">
                    somado assim que a comanda senta numa mesa — diferente da
                    taxa de serviço, o cliente já vê isso na própria conta.
                  </span>
                </div>
              )}
            </div>
          </Field>

          <Field label="Totem de autoatendimento">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.kioskEnabled}
                  onChange={(e) => setForm({ ...form, kioskEnabled: e.target.checked })}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-stone-700">
                  Ativar totem — pedido e pagamento no balcão, com senha
                </span>
              </label>
              {form.kioskEnabled && (
                <div className="flex flex-wrap gap-3 pl-7 text-sm">
                  <Link
                    href={`/totem/${slug}`}
                    target="_blank"
                    className="flex items-center gap-1 text-brand-600 hover:underline"
                  >
                    Abrir o totem <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/totem/${slug}/painel`}
                    target="_blank"
                    className="flex items-center gap-1 text-brand-600 hover:underline"
                  >
                    Abrir painel de senhas <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </Field>

          <Field label="Pedido remoto (entrega e retirada agendada)">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.deliveryEnabled}
                  onChange={(e) => setForm({ ...form, deliveryEnabled: e.target.checked })}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-stone-700">
                  Ativar entrega — cliente paga e recebe no endereço
                </span>
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.scheduledPickupEnabled}
                  onChange={(e) =>
                    setForm({ ...form, scheduledPickupEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-stone-700">
                  Ativar retirada agendada — cliente escolhe um horário fixo e
                  retira no balcão
                </span>
              </label>
              {(form.deliveryEnabled || form.scheduledPickupEnabled) && (
                <div className="flex flex-wrap gap-3 pl-7 text-sm">
                  <Link
                    href={`/pedir/${slug}`}
                    target="_blank"
                    className="flex items-center gap-1 text-brand-600 hover:underline"
                  >
                    Abrir tela de pedido remoto <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </Field>

          <Field label="Integrações">
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/admin/ifood"
                className="flex items-center gap-1 text-brand-600 hover:underline"
              >
                Conectar com o iFood <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/admin/mercadopago"
                className="flex items-center gap-1 text-brand-600 hover:underline"
              >
                Conectar com o Mercado Pago <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Field>

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
