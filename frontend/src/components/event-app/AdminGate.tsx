"use client";

import { useState } from "react";
import { ADMIN_PIN } from "./shared";
import { useToast } from "./ToastContext";

interface AdminGateProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminGate({ open, onClose, onSuccess }: AdminGateProps) {
  const { toast } = useToast();
  const [pin, setPin] = useState("");

  if (!open) return null;

  function submit() {
    if (pin === ADMIN_PIN) {
      toast("🔐 Admin mode enabled", "success");
      setPin("");
      onSuccess();
    } else {
      toast("❌ Incorrect PIN", "error");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,1,16,.72)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div className="d-card" style={{ maxWidth: 320, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>🔐</div>
        <h3 style={{ color: "#fff", textAlign: "center", fontSize: 15, marginBottom: 4 }}>Event Admin Login</h3>
        <p style={{ color: "var(--disco-muted)", fontSize: 10, textAlign: "center", marginBottom: 14 }}>
          Enter the admin PIN to access Dashboard, Reports and QR Codes.
        </p>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Admin PIN"
          autoFocus
          style={{
            width: "100%",
            background: "rgba(0,0,0,.3)",
            border: "1.5px solid var(--disco-border)",
            borderRadius: 10,
            padding: "10px 12px",
            color: "#fff",
            fontSize: 14,
            textAlign: "center",
            letterSpacing: 4,
            outline: "none",
            marginBottom: 12,
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="d-btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button className="d-btn-primary" style={{ flex: 1 }} onClick={submit}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminRequired({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="d-container-sm">
      <div className="d-card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
        <h2 style={{ color: "#fff", fontSize: 16, marginBottom: 6 }}>Admin Access Required</h2>
        <p style={{ color: "var(--disco-muted)", fontSize: 11, marginBottom: 16 }}>
          This section is for event organisers only. Please log in with the admin PIN.
        </p>
        <button className="d-btn-primary" onClick={onLogin}>
          🔐 Admin Login
        </button>
      </div>
    </div>
  );
}
