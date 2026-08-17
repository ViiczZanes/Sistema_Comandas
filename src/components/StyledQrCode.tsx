"use client";

import { useEffect, useRef } from "react";
import type QRCodeStylingType from "qr-code-styling";
import { buildQrCodeOptions, type QrStyleOptions } from "@/lib/qrStyle";

export function StyledQrCode({
  data,
  style,
  size = 220,
  className,
}: {
  data: string;
  style: QrStyleOptions;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStylingType | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !ref.current) return;
      ref.current.innerHTML = "";
      const qr = new QRCodeStyling(buildQrCodeOptions(data, style, size));
      qrRef.current = qr;
      qr.append(ref.current);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, size, style.color, style.dotStyle, style.logoUrl, style.useLogo]);

  return <div ref={ref} className={className} style={{ width: size, height: size }} />;
}
