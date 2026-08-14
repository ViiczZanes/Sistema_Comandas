"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Keyboard, QrCode } from "lucide-react";
import { QrCodeScanner } from "@/components/QrCodeScanner";
import { extractComandaToken } from "@/lib/parseQrScan";
import { ComandaForm } from "./ComandaForm";

export function ComandaIdentify({ tableToken }: { tableToken: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [scanKey, setScanKey] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = useCallback(
    (text: string) => {
      const token = extractComandaToken(text);
      if (!token) {
        setScanError("Esse QR Code não é de uma comanda. Aponte para o QR do seu cartão.");
        setScanKey((k) => k + 1); // remonta o scanner pra tentar de novo
        return;
      }
      router.push(`/m/${tableToken}/c/${token}`);
    },
    [router, tableToken]
  );

  if (mode === "manual") {
    return (
      <div className="w-full space-y-4">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-stone-900">
            Número da sua comanda
          </h1>
          <p className="text-sm text-stone-500">
            Digite o número impresso no cartão.
          </p>
        </div>
        <ComandaForm tableToken={tableToken} />
        <button
          onClick={() => {
            setScanError(null);
            setScanKey((k) => k + 1);
            setMode("scan");
          }}
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-700"
        >
          <QrCode className="h-4 w-4" />
          Escanear o QR da comanda
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold text-stone-900">
          Escaneie sua comanda
        </h1>
        <p className="text-sm text-stone-500">
          Aponte a câmera para o QR Code do seu cartão.
        </p>
      </div>

      <QrCodeScanner
        key={scanKey}
        onScan={handleScan}
        onUnavailable={() => setMode("manual")}
      />

      {scanError && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-left text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {scanError}
        </p>
      )}

      <button
        onClick={() => setMode("manual")}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-700"
      >
        <Keyboard className="h-4 w-4" />
        Prefiro digitar o número
      </button>
    </div>
  );
}
