"use client";

import { useMemo, useState } from "react";
import { api } from "../api";
import { DONATION_QR_TEXT, DONATION_RM_PER_ENTRY, normalize } from "../shared";
import { useToast } from "../ToastContext";
import type { Attendee, DonationRecord } from "../types";
import { useQr } from "../useQr";

interface DonationsProps {
  backendUrl: string;
  attendees: Attendee[];
  donations: DonationRecord[];
  onChange: (d: DonationRecord[]) => void;
  isAdmin: boolean;
}

export default function Donations({ backendUrl, attendees, donations, onChange, isAdmin }: DonationsProps) {
  const { toast, confetti } = useToast();
  const generatedQr = useQr(DONATION_QR_TEXT);
  const [customQrFailed, setCustomQrFailed] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const board = useMemo(() => {
    const m = new Map<string, { name: string; total: number }>();
    donations.forEach((d) => {
      const k = normalize(d.donorName);
      const cur = m.get(k) ?? { name: d.donorName, total: 0 };
      cur.total += d.amount;
      m.set(k, cur);
    });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [donations]);
  const grandTotal = donations.reduce((s, d) => s + d.amount, 0);
  const amt = Math.floor(Number(amount) || 0);
  const newEntries = Math.floor(amt / DONATION_RM_PER_ENTRY);
  const suggestions = useMemo(() => {
    const q = normalize(name);
    if (q.length < 2) return [];
    return attendees.filter((a) => normalize(a.name).includes(q)).slice(0, 6);
  }, [attendees, name]);
  const exact = attendees.find((a) => normalize(a.name) === normalize(name));

  async function submit() {
    if (!exact) {
      toast("⚠️ Please pick your name from the list. Anonymous donations aren't accepted.", "error");
      return;
    }
    if (amt < DONATION_RM_PER_ENTRY) {
      toast(`⚠️ Minimum donation is RM${DONATION_RM_PER_ENTRY}.`, "error");
      return;
    }
    setBusy(true);
    try {
      const created = await api.addDonation(backendUrl, exact.name, amt);
      onChange([created, ...donations]);
      setAmount("");
      setName("");
      confetti();
      toast(`💝 Thank you ${exact.name}! +${newEntries} lucky draw ${newEntries === 1 ? "entry" : "entries"}.`, "success");
    } catch (e) {
      toast(`❌ ${(e as Error).message || "Could not record donation."}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this donation? Their extra entries will be removed too.")) return;
    try {
      await api.deleteDonation(backendUrl, id);
      onChange(donations.filter((d) => d.id !== id));
    } catch {
      toast("❌ Could not remove donation.", "error");
    }
  }

  return (
    <div>
      <div className="d-card" style={{ textAlign: "center", marginBottom: 12 }}>
        <div className="d-section-title">💝 Donate &amp; Win More</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customQrFailed ? (generatedQr ?? "") : "/donation-qr.png"}
          alt="Donation QR code"
          onError={() => setCustomQrFailed(true)}
          style={{ width: 200, height: 200, background: "#fff", borderRadius: 12, padding: 6, display: customQrFailed && !generatedQr ? "none" : "inline-block" }}
        />
        <p style={{ fontSize: 11, color: "var(--disco-muted)", margin: "10px 0 0" }}>
          Scan to donate. Every <strong style={{ color: "var(--disco-gold)" }}>RM{DONATION_RM_PER_ENTRY}</strong> = <strong style={{ color: "var(--disco-gold)" }}>1 extra Lucky Draw entry</strong>.
          After paying, record your donation below.
        </p>
      </div>

      <div className="d-card" style={{ marginBottom: 12 }}>
        <div className="d-section-title">📝 Record My Donation</div>
        <div className="d-form-row">
          <div className="d-form-group">
            <label>Your Name <span className="req">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Start typing your name…" />
            {!exact && suggestions.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                {suggestions.map((a) => (
                  <div key={a.id} className="d-btn-ghost" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setName(a.name)}>
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="d-form-group">
            <label>Amount (RM) <span className="req">*</span></label>
            <input type="number" inputMode="numeric" min={DONATION_RM_PER_ENTRY} step={DONATION_RM_PER_ENTRY} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" />
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--disco-muted)", marginBottom: 10 }}>
          {newEntries > 0 ? `🎟️ RM${amt} = ${newEntries} extra ${newEntries === 1 ? "entry" : "entries"}` : "Enter RM10 or more to earn extra entries."} · Your name is required, anonymous isn&apos;t allowed.
        </div>
        <button className="d-btn-primary" style={{ width: "100%" }} disabled={busy} onClick={submit}>
          {busy ? "Saving…" : "💝 I've Donated"}
        </button>
      </div>

      <div className="d-winners-table-wrap">
        <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
          🏅 Live Donation Leaderboard · Total raised <span style={{ color: "var(--disco-gold)" }}>RM{grandTotal}</span>
        </div>
        <table className="d-rep-table">
          <thead>
            <tr><th>#</th><th>Donor</th><th>Total</th><th>Extra Entries</th></tr>
          </thead>
          <tbody>
            {board.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--disco-muted)", padding: 16 }}>No donations yet. Be the first!</td></tr>
            )}
            {board.map((b, i) => (
              <tr key={b.name}>
                <td>{["🥇", "🥈", "🥉"][i] ?? i + 1}</td>
                <td><strong>{b.name}</strong></td>
                <td>RM{b.total}</td>
                <td>{Math.floor(b.total / DONATION_RM_PER_ENTRY)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && donations.length > 0 && (
        <div className="d-winners-table-wrap" style={{ marginTop: 12 }}>
          <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#fff" }}>🔧 Admin: recent donations</div>
          <table className="d-rep-table">
            <tbody>
              {donations.slice(0, 20).map((d) => (
                <tr key={d.id}>
                  <td>{d.donorName}</td>
                  <td>RM{d.amount}</td>
                  <td><button className="d-btn-ghost" onClick={() => remove(d.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
