"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { FUNCTIONS } from "../data";

import { findAttendeeMatches, saveMyIdentity } from "../shared";
import { useToast } from "../ToastContext";
import type { Attendee, PageId } from "../types";

interface CheckInProps {
  backendUrl: string;
  attendees: Attendee[];
  prefillTicket: string | null;
  onCheckedIn: (attendee: Attendee) => void;
  onRegistered: () => void;
  goto: (page: PageId) => void;
}

type Step = "intro" | "search" | "confirm" | "walkin" | "success";

export default function CheckIn({ backendUrl, attendees, prefillTicket, onCheckedIn, onRegistered, goto }: CheckInProps) {
  const { toast, confetti } = useToast();
  const [step, setStep] = useState<Step>(prefillTicket ? "confirm" : "intro");
  const [nameQuery, setNameQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [matches, setMatches] = useState<Attendee[]>([]);
  const [selected, setSelected] = useState<Attendee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyIn, setAlreadyIn] = useState(false);
  const triedTicket = useRef(false);

  // Deep link from a personal ticket QR: find the exact attendee once the list has loaded.
  useEffect(() => {
    if (!prefillTicket || triedTicket.current) return;
    if (attendees.length === 0) return;
    triedTicket.current = true;
    const found = attendees.find((a) => a.ticket.toLowerCase() === prefillTicket.toLowerCase());
    if (found) {
      setSelected(found);
      setStep("confirm");
    } else {
      toast("⚠️ We couldn't find that ticket. Please search by name instead.", "error");
      setStep("search");
    }
  }, [prefillTicket, attendees, toast]);

  function runSearch() {
    if (nameQuery.trim().length < 2) {
      toast("⚠️ Please type at least 2 characters of your name.", "error");
      return;
    }
    const found = findAttendeeMatches(attendees, nameQuery, emailQuery);
    setMatches(found);
    setSearched(true);
  }

  function pick(a: Attendee) {
    setSelected(a);
    setStep("confirm");
  }

  async function confirmAttendance(attendee: Attendee) {
    setSubmitting(true);
    try {
      const updated = await api.checkin(backendUrl, attendee.ticket, "Self Check-In (QR)");
      onCheckedIn(updated);
      saveMyIdentity({ ticket: updated.ticket, name: updated.name, division: updated.division });
      setSelected(updated);
      setAlreadyIn(false);
      setStep("success");
      confetti();
      toast(`🎉 Welcome, ${updated.name}! You're checked in.`, "success");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        // Already checked in earlier — not an error from the attendee's point of view.
        saveMyIdentity({ ticket: attendee.ticket, name: attendee.name, division: attendee.division });
        setAlreadyIn(true);
        setStep("success");
        toast(`👋 Welcome back, ${attendee.name}! You were already checked in.`, "info");
      } else {
        toast("❌ Check-in failed. Please try again or see the help desk.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setStep("search");
    setNameQuery("");
    setEmailQuery("");
    setMatches([]);
    setSearched(false);
    setSelected(null);
    setAlreadyIn(false);
  }

  return (
    <div className="d-container-sm">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>✅ Venue Check-In</div>
        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>
          Scan the QR code at the entrance, confirm your name, and you&apos;re in the Lucky Draw!
        </div>
      </div>
      <div className="d-card">
        {step === "intro" && (
          <div style={{ textAlign: "center", padding: "20px 8px" }}>
            <div style={{ fontSize: 46, marginBottom: 10 }}>📷</div>
            <h2 style={{ color: "#fff", fontSize: 17, marginBottom: 6 }}>Arrived at the venue?</h2>
            <p style={{ color: "var(--disco-muted)", fontSize: 11, marginBottom: 18, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Scan the <strong style={{ color: "var(--disco-teal)" }}>Check-In QR</strong> on the entrance poster with your phone
              camera, or tap below to confirm your attendance manually.
            </p>
            <button className="d-btn-primary" onClick={() => setStep("search")}>
              ✅ Confirm My Attendance
            </button>
          </div>
        )}

        {step === "search" && (
          <div>
            <div className="d-section-title">🔍 Find Your Registration</div>
            <div className="d-form-row">
              <div className="d-form-group">
                <label>
                  Full Name <span className="req">*</span>
                </label>
                <input
                  value={nameQuery}
                  onChange={(e) => {
                    setNameQuery(e.target.value);
                    setSearched(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="e.g. Ahmad bin Abdullah"
                  autoFocus
                />
              </div>
              <div className="d-form-group">
                <label>Email Address (optional)</label>
                <input
                  type="email"
                  value={emailQuery}
                  onChange={(e) => setEmailQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="you@theaccessgroup.com"
                />
              </div>
            </div>
            <button className="d-btn-primary" style={{ width: "100%" }} onClick={runSearch}>
              🔍 Find My Name
            </button>

            {searched && matches.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="d-section-title">Is one of these you?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {matches.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => pick(a)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        background: "rgba(0,0,0,.25)",
                        border: "1.5px solid var(--disco-border)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        cursor: "pointer",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#fff", fontSize: 12 }}>{a.name}</strong>
                        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>
                          {a.division} · Ticket {a.ticket} {a.checkedIn ? "· ✅ Already checked in" : ""}
                        </div>
                      </div>
                      <span className="d-btn-ghost">This is me →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searched && matches.length === 0 && (
              <div
                style={{
                  marginTop: 16,
                  background: "rgba(255,138,0,.08)",
                  border: "1px solid var(--disco-orange)",
                  borderRadius: 12,
                  padding: 14,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: "#e0b380", marginBottom: 10 }}>
                  We couldn&apos;t find a pre-registration matching that name.
                </div>
                <button className="d-btn-secondary" onClick={() => setStep("walkin")}>
                  📝 Register as a Walk-In Instead
                </button>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && selected && (
          <div style={{ textAlign: "center", padding: "10px 4px" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
            <h2 style={{ color: "#fff", fontSize: 17, marginBottom: 4 }}>Hi, {selected.name}!</h2>
            <p style={{ color: "var(--disco-muted)", fontSize: 11, marginBottom: 16 }}>
              {selected.division} · Ticket {selected.ticket}
            </p>
            <div
              style={{
                background: "rgba(0,0,0,.25)",
                border: "1px solid var(--disco-border)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                fontSize: 11,
                color: "var(--disco-muted)",
                textAlign: "left",
              }}
            >
              By confirming, your attendance will be marked and you&apos;ll be automatically entered into tonight&apos;s{" "}
              <strong style={{ color: "var(--disco-gold)" }}>Lucky Draw</strong>. You&apos;ll also unlock the Mini Game, Best
              Dress voting and the Feedback survey.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="d-btn-ghost" onClick={startOver}>
                ← Not Me, Search Again
              </button>
              <button className="d-btn-primary" disabled={submitting} onClick={() => confirmAttendance(selected)}>
                {submitting ? "Confirming…" : "✅ Confirm & Join the Fun"}
              </button>
            </div>
          </div>
        )}

        {step === "walkin" && (
          <WalkInForm
            backendUrl={backendUrl}
            prefillName={nameQuery}
            onBack={() => setStep("search")}
            onDone={async (attendee) => {
              onRegistered();
              await confirmAttendance(attendee);
            }}
          />
        )}

        {step === "success" && selected && (
          <div style={{ textAlign: "center", padding: "20px 8px" }}>
            <div style={{ fontSize: 54, marginBottom: 10 }}>🪩</div>
            <h2 style={{ color: "var(--disco-green)", fontSize: 19, marginBottom: 4 }}>
              {alreadyIn ? "Welcome Back!" : "You're Checked In!"}
            </h2>
            <p style={{ color: "var(--disco-muted)", fontSize: 12, marginBottom: 4 }}>
              {selected.name} · {selected.division}
            </p>
            <p style={{ color: "var(--disco-gold)", fontSize: 11, marginBottom: 20 }}>🎟️ You&apos;re eligible for tonight&apos;s Lucky Draw!</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="d-btn-primary" onClick={() => goto("game")}>
                🎮 Play the Game
              </button>
              <button className="d-btn-secondary" onClick={() => goto("vote")}>
                👗 Vote Best Dress
              </button>
              <button className="d-btn-secondary" onClick={() => goto("draw")}>
                🏆 Watch the Draw
              </button>
              <button className="d-btn-ghost" onClick={() => goto("feedback")}>
                ⭐ Feedback
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WalkInForm({
  backendUrl,
  prefillName,
  onBack,
  onDone,
}: {
  backendUrl: string;
  prefillName: string;
  onBack: () => void;
  onDone: (attendee: Attendee) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: prefillName,
    email: "",
    department: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit() {
    if (!form.name.trim() || !form.department) {
      toast("⚠️ Please fill in your name and department.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const attendee = await api.register(backendUrl, {
        name: form.name,
        email: form.email || "walkin@theaccessgroup.com",
        mobile: "—",
        division: form.department,
        functionArea: form.department,
        dietary: "No Preference",
      });
      toast(`📝 Walk-in registration created for ${attendee.name}`, "success");
      onDone(attendee);
    } catch {
      toast("❌ Could not register. Please see the help desk.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="d-section-title">📝 Quick Walk-In Registration</div>
      <div className="d-form-row">
        <div className="d-form-group">
          <label>
            Full Name <span className="req">*</span>
          </label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" />
        </div>
        <div className="d-form-group">
          <label>Email (optional)</label>
          <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@theaccessgroup.com" />
        </div>
      </div>
      <div className="d-form-row">
        <div className="d-form-group">
          <label>
            Department <span className="req">*</span>
          </label>
          <select value={form.department} onChange={(e) => update("department", e.target.value)}>
            <option value="">Select department…</option>
            {FUNCTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="d-btn-ghost" style={{ flex: 1 }} onClick={onBack}>
          ← Back
        </button>
        <button className="d-btn-primary" style={{ flex: 2 }} disabled={submitting} onClick={submit}>
          {submitting ? "Registering…" : "✅ Register & Check In"}
        </button>
      </div>
    </div>
  );
}
