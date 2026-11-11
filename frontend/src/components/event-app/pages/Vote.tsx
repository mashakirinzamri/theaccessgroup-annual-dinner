"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { colorForName, normalize, titleCase, VOTER_KEY_STORAGE } from "../shared";
import { useToast } from "../ToastContext";
import type { Attendee, VoteRecord } from "../types";

interface VoteProps {
  backendUrl: string;
  attendees: Attendee[];
  resetToken?: number;
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export default function Vote({ backendUrl, attendees, resetToken = 0 }: VoteProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<VoteRecord[]>([]);
  const [voterKey, setVoterKey] = useState<string>("");
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let key = localStorage.getItem(VOTER_KEY_STORAGE);
    if (!key) {
      key = `voter-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      localStorage.setItem(VOTER_KEY_STORAGE, key);
    }
    setVoterKey(key);
    api
      .getVotes(backendUrl)
      .then((v) => {
        setRecords(v);
        const mine = v.find((r) => r.voterKey === key);
        if (mine) setMyVote(mine.candidateName);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backendUrl]);

  // Admin cleared all votes: reset this page so voting can start again.
  useEffect(() => {
    if (resetToken === 0) return;
    setRecords([]);
    setMyVote(null);
    setName("");
  }, [resetToken]);

  // Group votes case/whitespace-insensitively so "jane doe" and "Jane Doe" count together.
  const leaderboard = useMemo(() => {
    const counts = new Map<string, { display: string; count: number }>();
    records.forEach((r) => {
      const key = normalize(r.candidateName);
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { display: titleCase(r.candidateName), count: 1 });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [records]);

  const total = records.length;
  const maxV = leaderboard[0]?.count ?? 0;

  const suggestions = useMemo(() => attendees.filter((a) => a.checkedIn).map((a) => a.name).slice(0, 100), [attendees]);

  async function castVote() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast("⚠️ Please type the name of who you're voting for.", "error");
      return;
    }
    if (trimmed.length < 2) {
      toast("⚠️ Please enter a full name.", "error");
      return;
    }
    if (myVote !== null) {
      toast("⚠️ You have already voted!", "error");
      return;
    }
    setSubmitting(true);
    try {
      const rec = await api.castVote(backendUrl, voterKey, trimmed);
      setRecords((prev) => [...prev, rec]);
      setMyVote(trimmed);
      toast(`🗳️ Voted for ${titleCase(trimmed)}!`, "success");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setMyVote(trimmed);
        toast("⚠️ You have already voted!", "error");
      } else {
        toast("❌ Could not submit your vote. Please try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="d-container-sm">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>👗 Best Dress Voting</div>
        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>
          Type the name of the best dressed colleague of the night — one vote per person
        </div>
      </div>

      <div className="d-card" style={{ marginBottom: 14 }}>
        {myVote !== null ? (
          <div
            style={{
              background: "rgba(57,255,138,.1)",
              border: "1px solid var(--disco-green)",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 12,
              color: "var(--disco-green)",
              textAlign: "center",
            }}
          >
            ✅ You voted for <strong>{titleCase(myVote)}</strong>! Watch the live results below.
          </div>
        ) : (
          <div>
            <div className="d-section-title">🗳️ Cast Your Vote</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                style={{
                  flex: "1 1 220px",
                  background: "rgba(0,0,0,.25)",
                  border: "1.5px solid var(--disco-border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#fff",
                  fontSize: 12,
                  outline: "none",
                }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && castVote()}
                placeholder="Type their full name…"
                list="vote-name-suggestions"
                disabled={loading}
              />
              <datalist id="vote-name-suggestions">
                {suggestions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <button className="d-btn-primary" disabled={submitting || loading} onClick={castVote}>
                {submitting ? "Voting…" : "Vote →"}
              </button>
            </div>
            <div style={{ fontSize: 9, color: "var(--disco-muted)", marginTop: 8 }}>
              Tip: start typing to see suggestions from checked-in attendees, or enter any name.
            </div>
          </div>
        )}
      </div>

      <div className="d-vote-results">
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--disco-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          📊 Live Results — {total} vote{total === 1 ? "" : "s"}
        </div>
        {loading && <div style={{ fontSize: 11, color: "var(--disco-muted)" }}>Loading results…</div>}
        {!loading && leaderboard.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--disco-muted)", textAlign: "center", padding: "10px 0" }}>
            No votes yet — be the first to vote for the best dressed!
          </div>
        )}
        {!loading && leaderboard.length > 0 && (
          <div>
            {leaderboard.map((c, rank) => {
              const pct = total ? Math.round((c.count / total) * 100) : 0;
              const barW = maxV ? Math.round((c.count / maxV) * 100) : 0;
              return (
                <div className="d-vote-result-row" key={c.display}>
                  <div className="d-vote-result-rank">{RANK_ICONS[rank] ?? rank + 1}</div>
                  <div className="d-vote-result-name">{c.display}</div>
                  <div className="d-vote-result-bar-bg">
                    <div className="d-vote-result-bar" style={{ width: `${barW}%`, background: colorForName(c.display) }} />
                  </div>
                  <div className="d-vote-result-pct">
                    {c.count} · {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
