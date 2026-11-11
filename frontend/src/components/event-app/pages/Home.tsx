"use client";

import type { PageId } from "../types";

interface HomeProps {
  totalReg: number;
  totalCI: number;
  isAdmin: boolean;
  goto: (page: PageId) => void;
  onRequestAdmin: () => void;
}

const MODULES: { id: PageId; icon: string; title: string; desc: string; admin?: boolean }[] = [
  { id: "checkin", icon: "✅", title: "Venue Check-In", desc: "Scan the entrance QR, confirm your name, and join the Lucky Draw" },
  { id: "game", icon: "🎮", title: "Mini Game", desc: "Catch the prize! Play before dinner starts" },
  { id: "vote", icon: "👗", title: "Best Dress Vote", desc: "Type the name of the best dressed colleague of the night" },
  { id: "draw", icon: "🏆", title: "Lucky Draw", desc: "Live bingo-style prize draws for checked-in attendees" },
  { id: "feedback", icon: "⭐", title: "Feedback", desc: "Rate the event via our Wootric-powered survey" },
  { id: "dashboard", icon: "📊", title: "Live Dashboard", desc: "Real-time attendance monitoring and analytics", admin: true },
  { id: "reports", icon: "📋", title: "Reports", desc: "Attendance, no-show, draw and feedback analytics", admin: true },
  { id: "qrcodes", icon: "🔑", title: "QR Codes", desc: "Generate the venue and personal check-in QR codes", admin: true },
];

export default function Home({ totalReg, totalCI, isAdmin, goto, onRequestAdmin }: HomeProps) {
  const rate = totalReg > 0 ? Math.round((totalCI / totalReg) * 100) : 0;

  const visibleModules = MODULES.filter((m) => !m.admin || isAdmin);

  function openModule(m: (typeof MODULES)[number]) {
    if (m.admin && !isAdmin) {
      onRequestAdmin();
      return;
    }
    goto(m.id);
  }

  return (
    <div>
      <div className="d-hero">
        <div className="d-hero-badge">🪩 15 August 2026 &nbsp;|&nbsp; 🏨 Grand Ballroom, KL &nbsp;|&nbsp; 🕖 7:00 PM</div>
        <h1>
          MTV Retro Rewind
          <br />
          <span className="disco-glow-text">Access Annual Dinner 2026</span>
        </h1>
        <p>A night of glitter, groove and gold — celebration, recognition, lucky draws, games and connection. Get on the dance floor!</p>
        <div className="d-hero-btns">
          <button className="d-btn-primary" onClick={() => goto("checkin")}>
            📷 Scan to Check In
          </button>
          <button className="d-btn-secondary" onClick={() => goto("vote")}>
            👗 Vote Best Dress
          </button>
        </div>
      </div>
      <div className="d-home-stats">
        <div className="d-home-stat">
          <div className="d-home-stat-val" style={{ color: "var(--disco-teal)" }}>
            {totalReg}
          </div>
          <div className="d-home-stat-label">Registered</div>
        </div>
        <div className="d-home-stat">
          <div className="d-home-stat-val">{totalCI}</div>
          <div className="d-home-stat-label">Checked In</div>
        </div>
        <div className="d-home-stat">
          <div className="d-home-stat-val" style={{ color: "var(--disco-red)" }}>
            500
          </div>
          <div className="d-home-stat-label">Capacity</div>
        </div>
        <div className="d-home-stat">
          <div className="d-home-stat-val">{rate}%</div>
          <div className="d-home-stat-label">Attendance Rate</div>
        </div>
      </div>
      <div className="d-home-modules">
        {visibleModules.map((m) => (
          <div key={m.id} className="d-home-module" onClick={() => openModule(m)} style={{ position: "relative" }}>
            {m.admin && (
              <span style={{ position: "absolute", top: 10, right: 12, fontSize: 13 }} title="Admin section">
                🔑
              </span>
            )}
            <div className="d-home-module-icon">{m.icon}</div>
            <div className="d-home-module-title">{m.title}</div>
            <div className="d-home-module-desc">{m.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
