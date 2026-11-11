"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ToastMsg } from "./types";

interface ToastCtxValue {
  toast: (msg: string, type?: ToastMsg["type"]) => void;
  confetti: () => void;
}

const ToastCtx = createContext<ToastCtxValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  duration: number;
  delay: number;
  rotate: number;
}

const CONFETTI_COLORS = ["#ff2e93", "#00e5c7", "#ffd23f", "#39ff8a", "#7c3aed", "#fff", "#ff8a00"];

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const idRef = useRef(0);
  const confettiIdRef = useRef(0);

  const toast = useCallback((msg: string, type: ToastMsg["type"] = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const confetti = useCallback(() => {
    const newPieces: ConfettiPiece[] = Array.from({ length: 70 }, () => ({
      id: ++confettiIdRef.current,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      duration: 1.5 + Math.random() * 2,
      delay: Math.random() * 0.6,
      rotate: Math.random() * 360,
    }));
    setPieces(newPieces);
    setTimeout(() => setPieces([]), 4500);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast, confetti }}>
      {children}
      <div id="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`d-toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
      <div id="confetti-layer">
        {pieces.map((p) => (
          <div
            key={p.id}
            className="cp"
            style={{
              left: `${p.left}%`,
              background: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
