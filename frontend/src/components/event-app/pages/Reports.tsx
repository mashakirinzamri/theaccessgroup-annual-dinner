"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "../api";
import { colorForName, csvToImportRows, normalize, parseCsv, titleCase } from "../shared";
import { useToast } from "../ToastContext";
import type { Attendee, DrawWinnerRecord, FeedbackRecord, VoteRecord } from "../types";

interface ReportsProps {
  backendUrl: string;
  attendees: Attendee[];
  winners: DrawWinnerRecord[];
  votes: VoteRecord[];
  feedback: FeedbackRecord[];
  onImported: () => void;
  onVotesReset: () => void;
}

type TabId = "att" | "ns" | "draw" | "vote" | "fb";

const TABS: { id: TabId; label: string }[] = [
  { id: "att", label: "👥 Attendance" },
  { id: "ns", label: "🚫 No-Show" },
  { id: "draw", label: "🏆 Lucky Draw" },
  { id: "vote", label: "👗 Best Dress" },
  { id: "fb", label: "⭐ Feedback" },
];

export default function Reports({ backendUrl, attendees, winners, votes, feedback, onImported, onVotesReset }: ReportsProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("att");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleReset() {
    if (!window.confirm("Reset ALL check-ins and lucky draw winners? This cannot be undone.")) return;
    try {
      const r = await api.resetCheckins(backendUrl);
      onImported();
      toast(`✅ Reset ${r.reset} check-in${r.reset === 1 ? "" : "s"}.`, "success");
    } catch {
      toast("⚠️ Reset failed — could not reach the backend.", "error");
    }
  }

  async function handleResetVotes() {
    if (!window.confirm("Reset ALL Best Dress votes? This cannot be undone.")) return;
    try {
      const r = await api.resetVotes(backendUrl);
      onVotesReset();
      toast(`✅ Cleared ${r.reset} vote${r.reset === 1 ? "" : "s"}.`, "success");
    } catch {
      toast("⚠️ Reset failed — could not reach the backend.", "error");
    }
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    const rows = csvToImportRows(parseCsv(text));
    if (!rows.length) {
      toast("⚠️ No rows found. Make sure the first row has headers like Name, Email.", "error");
      return;
    }
    setImporting(true);
    try {
      const result = await api.bulkImportAttendees(backendUrl, rows);
      onImported();
      if (result.importedCount > 0) {
        toast(`✅ Imported ${result.importedCount} attendee${result.importedCount === 1 ? "" : "s"}!`, "success");
      }
      if (result.skippedCount > 0) {
        toast(`⚠️ Skipped ${result.skippedCount} row${result.skippedCount === 1 ? "" : "s"} (duplicate email or missing name).`, "error");
      }
    } catch {
      toast("⚠️ Import failed — could not reach the backend.", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const fbStats = useMemo(() => {
    const total = feedback.length;
    const promoters = feedback.filter((f) => f.npsScore >= 9).length;
    const detractors = feedback.filter((f) => f.npsScore <= 6).length;
    const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
    const rated = feedback.filter((f) => f.overallRating > 0);
    const avg = rated.length ? (rated.reduce((a, f) => a + f.overallRating, 0) / rated.length).toFixed(1) : "—";
    const byCategory = (
      [
        ["Overall Experience", (f: FeedbackRecord) => f.overallRating],
        ["Food & Beverage", (f: FeedbackRecord) => f.foodRating],
        ["Venue & Ambience", (f: FeedbackRecord) => f.venueRating],
        ["Entertainment", (f: FeedbackRecord) => f.entertainmentRating],
      ] as const
    ).map(([label, pick]) => {
      const vals = feedback.map(pick).filter((v) => v > 0);
      const avgCat = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
      const dist = [1, 2, 3, 4, 5].map((star) => (vals.length ? Math.round((vals.filter((v) => v === star).length / vals.length) * 100) : 0));
      return { label, avg: vals.length ? avgCat.toFixed(1) : "—", dist };
    });
    return { total, nps, avg, byCategory };
  }, [feedback]);
  const noShows = attendees.filter((a) => !a.checkedIn);

  const sortedCandidates = useMemo(() => {
    const counts = new Map<string, { display: string; v: number }>();
    votes.forEach((v) => {
      const key = normalize(v.candidateName);
      const existing = counts.get(key);
      if (existing) existing.v++;
      else counts.set(key, { display: titleCase(v.candidateName), v: 1 });
    });
    return Array.from(counts.values()).sort((a, b) => b.v - a.v);
  }, [votes]);
  const voteTotal = votes.length;

  return (
    <div className="d-container">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>📋 Reports & Analytics</div>
        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>Annual Dinner 2026 · Live data from SQLite</div>
      </div>
      <div className="d-rep-tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`d-rep-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === "att" && (
        <div className="d-rep-panel active">
          <div
            style={{
              background: "var(--disco-card)",
              border: "1px dashed var(--disco-teal)",
              borderRadius: 10,
              padding: 14,
              margin: "0 0 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>📤 Bulk Upload Registered Attendees</div>
              <div style={{ fontSize: 10, color: "var(--disco-muted)", marginTop: 2 }}>
                Upload a CSV with columns like <code>Name, Email, Mobile, Division, Function, Dietary</code>. Name and Email are required;
                duplicate emails are skipped automatically.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvFile(file);
                }}
              />
              <button className="d-btn-secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                {importing ? "⏳ Importing…" : "📁 Choose CSV File"}
              </button>
              <button className="d-btn-secondary" onClick={handleReset}>
                🔄 Reset Check-Ins
              </button>
              <button className="d-btn-secondary" onClick={handleResetVotes}>
                👗 Reset Best Dress Votes
              </button>
            </div>
          </div>
          <div className="d-rep-panel-header">
            <div className="d-rep-panel-title">Attendance Report</div>
            <div className="d-export-btns">
              <button className="d-exp-btn xl" onClick={() => toast("📊 Exporting to Excel…", "info")}>
                Excel
              </button>
              <button className="d-exp-btn pdf" onClick={() => toast("📄 Generating PDF…", "info")}>
                PDF
              </button>
              <button className="d-exp-btn csv" onClick={() => toast("📋 Downloading CSV…", "info")}>
                CSV
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
                  <th>Source</th>
                  <th>Check-In</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 9 }}>{a.ticket}</td>
                    <td>
                      <strong>{a.name}</strong>
                    </td>
                    <td>
                      <span className="d-badge d-badge-blue">{a.division}</span>
                    </td>
                    <td>{a.functionArea}</td>
                    <td>
                      <span className={`d-badge ${a.source === "Online" ? "d-badge-blue" : "d-badge-yellow"}`}>{a.source}</span>
                    </td>
                    <td>
                      <span className={`d-badge ${a.checkedIn ? "d-badge-green" : "d-badge-red"}`}>
                        {a.checkedIn ? "✅ Checked In" : "❌ No-Show"}
                      </span>
                    </td>
                    <td>{a.checkedInAt ? new Date(a.checkedInAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ns" && (
        <div className="d-rep-panel active">
          <div className="d-rep-panel-header">
            <div className="d-rep-panel-title">No-Show Report</div>
            <div className="d-export-btns">
              <button className="d-exp-btn xl" onClick={() => toast("📊 Exporting…", "info")}>
                Excel
              </button>
              <button className="d-exp-btn pdf" onClick={() => toast("📄 PDF…", "info")}>
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
      )}

      {tab === "draw" && (
        <div className="d-rep-panel active">
          <div className="d-rep-panel-header">
            <div className="d-rep-panel-title">Lucky Draw Winners</div>
            <div className="d-export-btns">
              <button className="d-exp-btn xl" onClick={() => toast("📊 Exporting…", "info")}>
                Excel
              </button>
              <button className="d-exp-btn pdf" onClick={() => toast("📄 PDF…", "info")}>
                PDF
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="d-rep-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Winner</th>
                  <th>Division</th>
                  <th>Prize</th>
                  <th>Category</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {winners.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--disco-muted)", padding: 16 }}>
                      No draws conducted yet.
                    </td>
                  </tr>
                )}
                {winners.map((w, i) => (
                  <tr key={w.id}>
                    <td>{winners.length - i}</td>
                    <td>
                      <strong>{w.name}</strong>
                    </td>
                    <td>
                      <span className="d-badge d-badge-blue">{w.division}</span>
                    </td>
                    <td>{w.prize}</td>
                    <td>{w.prizeCategory}</td>
                    <td>{new Date(w.wonAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>
                      <span className={`d-badge ${w.redeemed ? "d-badge-green" : "d-badge-yellow"}`}>
                        {w.redeemed ? "✅ Redeemed" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "vote" && (
        <div className="d-rep-panel active">
          <div className="d-rep-panel-header">
            <div className="d-rep-panel-title">Best Dress Results</div>
            <div className="d-export-btns">
              <button className="d-exp-btn xl" onClick={() => toast("📊 Exporting…", "info")}>
                Excel
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="d-rep-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Votes</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {sortedCandidates.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--disco-muted)", padding: 16 }}>
                      No votes cast yet.
                    </td>
                  </tr>
                )}
                {sortedCandidates.map((c, rank) => (
                  <tr key={c.display}>
                    <td>{rank < 3 ? ["🥇", "🥈", "🥉"][rank] : rank + 1}</td>
                    <td>
                      <strong>{c.display}</strong>
                    </td>
                    <td>{c.v}</td>
                    <td style={{ color: colorForName(c.display) }}>{voteTotal ? Math.round((c.v / voteTotal) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "fb" && (
        <div className="d-rep-panel active">
          <div className="d-rep-panel-header">
            <div className="d-rep-panel-title">Feedback Summary (Wootric)</div>
            <div className="d-export-btns">
              <button className="d-exp-btn xl" onClick={() => toast("📊 Exporting…", "info")}>
                Excel
              </button>
              <button className="d-exp-btn pdf" onClick={() => toast("📄 PDF…", "info")}>
                PDF
              </button>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 9, marginBottom: 14 }}>
              <div style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: 11, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--disco-teal)" }}>{fbStats.total}</div>
                <div style={{ fontSize: 9, color: "var(--disco-muted)" }}>Responses</div>
              </div>
              <div style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: 11, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--disco-green)" }}>{fbStats.avg}/5</div>
                <div style={{ fontSize: 9, color: "var(--disco-muted)" }}>Overall Rating</div>
              </div>
              <div style={{ background: "rgba(0,0,0,.25)", borderRadius: 10, padding: 11, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: fbStats.nps >= 0 ? "var(--disco-green)" : "var(--disco-red)" }}>
                  {fbStats.nps > 0 ? "+" : ""}
                  {fbStats.nps}
                </div>
                <div style={{ fontSize: 9, color: "var(--disco-muted)" }}>NPS Score</div>
              </div>
            </div>
            {fbStats.total === 0 ? (
              <div style={{ textAlign: "center", color: "var(--disco-muted)", fontSize: 11, padding: 16 }}>No feedback submitted yet.</div>
            ) : (
              <table className="d-rep-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Avg</th>
                    <th>5★</th>
                    <th>4★</th>
                    <th>3★</th>
                    <th>2★</th>
                    <th>1★</th>
                  </tr>
                </thead>
                <tbody>
                  {fbStats.byCategory.map((c) => (
                    <tr key={c.label}>
                      <td>{c.label}</td>
                      <td>
                        <strong style={{ color: "var(--disco-green)" }}>{c.avg}</strong>
                      </td>
                      <td>{c.dist[4]}%</td>
                      <td>{c.dist[3]}%</td>
                      <td>{c.dist[2]}%</td>
                      <td>{c.dist[1]}%</td>
                      <td>{c.dist[0]}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
