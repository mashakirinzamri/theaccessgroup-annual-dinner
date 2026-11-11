"use client";

import { useState } from "react";
import { checkinUrl, findAttendeeMatches } from "../shared";
import { useQr } from "../useQr";
import type { Attendee } from "../types";

interface QRCodesProps {
  attendees: Attendee[];
}

export default function QRCodes({ attendees }: QRCodesProps) {
  const venueUrl = checkinUrl();
  const venueQr = useQr(venueUrl || null);

  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Attendee | null>(null);
  const matches = findAttendeeMatches(attendees, search);
  const ticketUrl = picked ? checkinUrl(picked.ticket) : null;
  const ticketQr = useQr(ticketUrl);

  return (
    <div className="d-container">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>🔑 QR Codes</div>
        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>
          Print or project these codes — scanning either one opens the self-service check-in page on a guest&apos;s phone.
        </div>
      </div>

      <div className="d-dash-grid">
        <div className="d-dash-panel" style={{ textAlign: "center" }}>
          <div className="d-dash-panel-title">📺 Venue Entrance QR (project on screen / print as poster)</div>
          {venueQr ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamically generated data: URL, not a static asset
            <img src={venueQr} alt="Venue check-in QR code" style={{ width: 220, height: 220, borderRadius: 14, margin: "10px auto" }} />
          ) : (
            <div style={{ padding: 40, color: "var(--disco-muted)", fontSize: 11 }}>Generating…</div>
          )}
          <div style={{ fontSize: 10, color: "var(--disco-muted)", wordBreak: "break-all", padding: "0 8px" }}>{venueUrl}</div>
          <p style={{ fontSize: 10, color: "var(--disco-muted)", marginTop: 8 }}>
            Any guest who scans this is taken straight to &quot;Find My Registration&quot; so they can type their name and confirm
            attendance.
          </p>
        </div>

        <div className="d-dash-panel">
          <div className="d-dash-panel-title">🎟️ Personal Ticket QR (for a specific attendee)</div>
          <div className="d-form-group" style={{ marginBottom: 10 }}>
            <label>Search attendee by name</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPicked(null);
              }}
              placeholder="Type a name…"
            />
          </div>
          {search.trim().length >= 2 && !picked && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10, maxHeight: 180, overflowY: "auto" }}>
              {matches.length === 0 && <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>No matches.</div>}
              {matches.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setPicked(a)}
                  style={{
                    background: "rgba(0,0,0,.2)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{a.name}</span>
                  <span style={{ color: "var(--disco-muted)", fontSize: 10 }}>{a.ticket}</span>
                </div>
              ))}
            </div>
          )}
          {picked && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, marginBottom: 2 }}>{picked.name}</div>
              <div style={{ fontSize: 10, color: "var(--disco-muted)", marginBottom: 10 }}>
                {picked.division} · {picked.ticket}
              </div>
              {ticketQr ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamically generated data: URL, not a static asset
                <img src={ticketQr} alt={`QR for ${picked.name}`} style={{ width: 180, height: 180, borderRadius: 12, margin: "0 auto" }} />
              ) : (
                <div style={{ padding: 30, color: "var(--disco-muted)", fontSize: 11 }}>Generating…</div>
              )}
              <button className="d-btn-ghost" style={{ marginTop: 10 }} onClick={() => setPicked(null)}>
                ← Search Another
              </button>
            </div>
          )}
          {!picked && search.trim().length < 2 && (
            <div style={{ fontSize: 10, color: "var(--disco-muted)", textAlign: "center", padding: "20px 0" }}>
              Search for an attendee to generate their personal check-in QR (e.g. to email ahead of the event).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
