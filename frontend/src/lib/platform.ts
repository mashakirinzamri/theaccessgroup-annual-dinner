"use client";

import { useEffect, useState } from "react";

/**
 * Resolves the backend API base URL for this environment, with no dependency
 * on any private/internal package — safe to use on any public host.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_API_URL` / `VITE_API_URL` env var, if set at build time.
 * 2. Local development (`localhost` / `127.0.0.1`) → `http://localhost:5000`.
 * 3. Otherwise, assume the backend is reachable on the same hostname the
 *    frontend was served from, on port 5000 (typical for a simple VPS/VM
 *    deployment where both containers run on one host). If you deploy the
 *    backend behind its own domain/reverse-proxy path, set
 *    `NEXT_PUBLIC_API_URL` instead and this will be used automatically.
 */
export function getBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  if (typeof window === "undefined") return "http://localhost:5000";

  const { hostname, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }
  // Evo-published apps: {name}[-dev|-test].eu.ai.accessacloud.com
  // → backend at {name}-api[-dev|-test].eu.ai.accessacloud.com
  const deployed = /^(.+?)(-dev|-test)?\.eu\.ai\.accessacloud\.com$/.exec(hostname);
  if (deployed && !hostname.includes(".sandbox.")) {
    return `${protocol}//${deployed[1]}-api${deployed[2] ?? ""}.eu.ai.accessacloud.com`;
  }
  // Sandbox/proxy hosts look like "3000-abc123.example.app": swap the port prefix.
  const prefixed = hostname.match(/^(\d{2,5})-(.+)$/);
  if (prefixed) return `${protocol}//5000-${prefixed[2]}`;
  return `${protocol}//${hostname}:5000`;
}

/** React hook wrapper around {@link getBackendUrl}. */
export function useGetBackendUrl(): string {
  return getBackendUrl();
}

const MOBILE_BREAKPOINT = 768;

/** True when the viewport is narrower than the mobile breakpoint (768px). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
