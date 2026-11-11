"use client";

import { useMemo, useState } from "react";
import { HOURLY } from "../data";
import { useToast } from "../ToastContext";
import type { Attendee } from "../types";

interface DashboardProps {
  attendees: Attendee[];
  onSimulateCheckin: () => void;
}

const CAPACITY = 500;
const DIV_COLORS: Record<string, string> = {
  "P&P": "var(--disco-teal)",
  ERP: "var(--disco-cyan)",
  GTS: "var(--disco-red)",
  PS: "var(--disco-green)",
  Finance: "var(--disco-gold)",
  ES: "var(--disco-purple)",
};

export default function Dashboard({ attendees, onSimulateCheckin }: DashboardProps) {
  const { toast } = useToast();
  const [refreshTick] = useState(5);

  const totalReg = attendees.length;
  const totalCI = attendees.filter((a) => a.checkedIn).length;
  const noShows = attendees.filter((a) => !a.checkedIn);
  const rate = totalReg > 0 ? Math.round((totalCI / totalReg) * 100) : 0;

  const gateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attendees
      .filter((a) => a.checkedIn)
      .forEach((a) => {
        const key = a.checkedInGate || "Unspecified";
        counts[key] = (counts[key] || 0) + 1;
      });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [attendees]);

  const divCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attendees.forEach((a) => {
      const key = a.division.split(" ")[0].replace(/[—-].*/, "").trim() || a.division;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [attendees]);

  const divTotal = Object.values(divCounts).reduce((a, b) => a + b, 0) || 1;
  const maxHourly = Math.max(...HOURLY.map((d) => d.v));

  const liveFeed = attendees
    .filter((a) => a.checkedIn)
    .slice(0, 6)
    .map((a, i) => ({ ...a, ago: [2, 5, 8, 12, 18, 25][i] ?? 30 }));

  return (
    <div className="d-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>📊 Live Event Console</div>
          <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>
            Annual Dinner 2026 &nbsp;|&nbsp; Grand Ballroom, KL &nbsp;|&nbsp;{" "}
            <span style={{ color: "var(--disco-green)" }}>● Live</span> &nbsp;|&nbsp; Refresh: {refreshTick}s
          </div>
        </div>
        <button
          className="d-btn-ghost"
          onClick={() => {
            onSimulateCheckin();
            toast("✅ Simulated check-in added", "success");
          }}
        >
          ⚡ Simulate Check-In
        </button>
      </div>

      <div className="d-kpi-grid">
        <div className="d-kpi-card teal">
          <div className="d-kpi-val">{totalReg}</div>
          <div className="d-kpi-label">Total Registrations</div>
          <div className="d-kpi-sub up">Live from database</div>
        </div>
        <div className="d-kpi-card green">
          <div className="d-kpi-val">{totalCI}</div>
          <div className="d-kpi-label">Checked In</div>
          <div className="d-kpi-sub up">↑ live from check-ins</div>
        </div>
        <div className="d-kpi-card blue">
          <div className="d-kpi-val">{rate}%</div>
          <div className="d-kpi-label">Attendance Rate</div>
          <div className="d-prog-bg" style={{ marginTop: 5 }}>
            <div className="d-prog-fill" style={{ width: `${rate}%`, background: "linear-gradient(90deg,var(--disco-teal),var(--disco-cyan))" }} />
          </div>
        </div>
        <div className="d-kpi-card red">
          <div className="d-kpi-val">{Math.max(0, CAPACITY - totalCI)}</div>
          <div className="d-kpi-label">Remaining Capacity</div>
          <div className="d-kpi-sub">of {CAPACITY} total</div>
        </div>
        <div className="d-kpi-card orange">
          <div className="d-kpi-val">{noShows.length}</div>
          <div className="d-kpi-label">No-Shows</div>
          <div className="d-kpi-sub warn">{totalReg ? Math.round((noShows.length / totalReg) * 100) : 0}% of registered</div>
        </div>
        <div className="d-kpi-card yellow">
          <div className="d-kpi-val">{Math.max(0, totalReg - totalCI - noShows.length)}</div>
          <div className="d-kpi-label">Pending Check-In</div>
          <div className="d-kpi-sub">registered, not yet arrived</div>
        </div>
      </div>

      <div className="d-dash-grid">
        <div className="d-dash-panel">
          <div className="d-dash-panel-title">⏰ Hourly Check-In Trend</div>
          <div className="d-bar-chart">
            {HOURLY.map((d) => (
              <div className="d-bar-col" key={d.l}>
                <div className="d-bar-v">{d.v}</div>
                <div
                  className="d-bar"
                  style={{
                    height: d.v === 0 ? 3 : Math.max(6, (d.v / maxHourly) * 72),
                    background: d.v === maxHourly ? "var(--disco-pink)" : "var(--disco-teal)",
                  }}
                />
                <div className="d-bar-lbl">{d.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "var(--disco-muted)", marginTop: 8 }}>
            Peak: <strong style={{ color: "#fff" }}>7:30–8:00 PM (112 check-ins)</strong>
          </div>
        </div>
        <div className="d-dash-panel">
          <div className="d-dash-panel-title">🚪 Check-Ins by Gate</div>
          <div className="d-scanner-list">
            {gateCounts.length === 0 && <div style={{ fontSize: 11, color: "var(--disco-muted)" }}>No check-ins yet.</div>}
            {gateCounts.map(([gate, count]) => (
              <div className="d-scanner-row" key={gate}>
                <div className="d-s-dot on" />
                <div className="d-s-name">{gate}</div>
                <div className="d-s-cnt">{count}</div>
                <div className="d-s-status">checked in</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="d-dash-grid">
        <div className="d-dash-panel">
          <div className="d-dash-panel-title">🔴 Live Check-In Feed</div>
          <div className="d-live-feed">
            {liveFeed.length === 0 && <div style={{ fontSize: 11, color: "var(--disco-muted)" }}>No check-ins yet.</div>}
            {liveFeed.map((p) => (
              <div className="d-feed-item" key={p.id}>
                <div className="d-feed-av">{p.name[0]}</div>
                <div>
                  <div className="d-feed-name">{p.name}</div>
                  <div className="d-feed-div">
                    {p.division} · {p.checkedInGate ?? "Gate A"}
                  </div>
                </div>
                <div className="d-feed-time">{p.ago}m ago</div>
              </div>
            ))}
          </div>
        </div>
        <div className="d-dash-panel">
          <div className="d-dash-panel-title">🏢 By SoftCo Division</div>
          <div>
            {Object.entries(divCounts).map(([k, v]) => (
              <div className="d-prog-wrap" key={k}>
                <div className="d-prog-label">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
                <div className="d-prog-bg">
                  <div className="d-prog-fill" style={{ width: `${Math.round((v / divTotal) * 100)}%`, background: DIV_COLORS[k] ?? "var(--disco-teal)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="d-noshow-panel">
        <div className="d-noshow-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#ccc", textTransform: "uppercase", letterSpacing: 1 }}>
              🚫 No-Show Report
            </div>
            <span className="d-badge d-badge-orange">{noShows.length} no-shows</span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button className="d-exp-btn xl" onClick={() => toast("📊 Exporting No-Show to Excel…", "info")}>
              Excel
            </button>
            <button className="d-exp-btn pdf" onClick={() => toast("📄 Generating No-Show PDF…", "info")}>
              PDF
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="d-rep-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Name</th>
                <th>Division</th>
                <th>Function</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>NOK</th>
                <th>Fee Status</th>
              </tr>
            </thead>
            <tbody>
              {noShows.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 9 }}>{a.ticket}</td>
                  <td>
                    <strong>{a.name}</strong>
                  </td>
                  <td>
                    <span className="d-badge d-badge-blue">{a.division}</span>
                  </td>
                  <td>{a.functionArea}</td>
                  <td style={{ fontSize: 10 }}>{a.email}</td>
                  <td style={{ fontSize: 10 }}>{a.mobile}</td>
                  <td style={{ fontSize: 10 }}>
                    {a.nokName} {a.nokContact ? `/ ${a.nokContact}` : ""}
                  </td>
                  <td>
                    <span className="d-badge d-badge-orange">Fee Pending</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
