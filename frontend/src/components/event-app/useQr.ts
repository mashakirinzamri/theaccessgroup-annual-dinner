"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a real, scannable QR code for the given text as a data URL. */
export function useQr(text: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!text) {
      Promise.resolve().then(() => {
        if (!cancelled) setDataUrl(null);
      });
      return () => {
        cancelled = true;
      };
    }
    QRCode.toDataURL(text, { width: 260, margin: 1, color: { dark: "#12071f", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return dataUrl;
}
