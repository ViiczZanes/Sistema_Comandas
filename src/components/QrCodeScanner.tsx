"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Spinner } from "@/components/ui/Spinner";

// Worker servido como arquivo estático (public/qr-scanner-worker.min.js) em
// vez de deixar o bundler resolver o import do worker — é o jeito mais
// robusto de usar essa lib fora de Vite/webpack5 com worker-loader.
QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";

type Status = "loading" | "active" | "unavailable";

// Leitor de QR Code pela câmera. Depende de `getUserMedia`, que só existe
// em contexto seguro (https:// ou localhost) — em http:// puro (ex: acesso
// direto pelo IP da rede local) o navegador bloqueia o acesso à câmera e
// isso aqui cai automaticamente no fallback `onUnavailable`, sem travar a
// tela. Ver README > "HTTPS" para o que isso implica em produção.
export function QrCodeScanner({
  onScan,
  onUnavailable,
}: {
  onScan: (text: string) => void;
  onUnavailable?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const onScanRef = useRef(onScan);
  const onUnavailableRef = useRef(onUnavailable);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    onScanRef.current = onScan;
    onUnavailableRef.current = onUnavailable;
  }, [onScan, onUnavailable]);

  useEffect(() => {
    let cancelled = false;
    let scanner: QrScanner | null = null;

    async function start() {
      if (!videoRef.current) return;
      try {
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera || cancelled) throw new Error("no-camera");

        scanner = new QrScanner(
          videoRef.current,
          (result) => {
            // Já achou — para de escanear pra não disparar de novo enquanto
            // a página troca de rota.
            scanner?.stop();
            onScanRef.current(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: "environment",
          }
        );
        scannerRef.current = scanner;
        await scanner.start();
        if (!cancelled) setStatus("active");
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          onUnavailableRef.current?.();
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
      scannerRef.current = null;
    };
  }, []);

  if (status === "unavailable") return null;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-stone-900 shadow-xl shadow-stone-900/20">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
          <Spinner className="h-6 w-6 text-white" />
        </div>
      )}

      {status === "active" && (
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
      )}
    </div>
  );
}
