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
const CATEGORIES = [
  { id: "Male", label: "🤵 Best Dressed — Male" },
  { id: "Female", label: "💃 Best Dressed — Female" },
] as const;

export default function Vote({ backendUrl, attendees: initialAttendees, resetToken = 0 }: VoteProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<VoteRecord[]>([]);
  const [voterKey, setVoterKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({ Male: "", Female: "" });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [guests, setGuests] = useState<Attendee[]>(initialAttendees);

  // Always show the freshest checked-in list: only guests who have checked in can be voted for.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .getAttendees(backendUrl)
        .then((a) => alive && setGuests(a))
        .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [backendUrl]);

  const checkedIn = useMemo(() => guests.filter((a) => a.checkedIn), [guests]);

  useEffect(() => {
    let key = localStorage.getItem(VOTER_KEY_STORAGE);
    if (!key) {
      key = `voter-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      localStorage.setItem(VOTER_KEY_STORAGE, key);
    }
    setVoterKey(key);
    api
      .getVotes(backendUrl)
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
    const id = setInterval(() => api.getVotes(backendUrl).then(setRecords).catch(() => {}), 10000);
    return () => clearInterval(id);
  }, [backendUrl]);

  // Admin cleared all votes: reset this page so voting can start again.
  useEffect(() => {
    if (resetToken === 0) return;
    setRecords([]);
    setNames({ Male: "", Female: "" });
  }, [resetToken]);

  const myVoteFor = (cat: string) => records.find((r) => r.voterKey === voterKey && r.category === cat)?.candidateName ?? null;

  async function castVote(cat: string) {
    const typed = names[cat] ?? "";
    if (!typed.trim()) {
      toast("⚠️ Please type the name of who you're voting for.", "error");
      return;
    }
    const exact = checkedIn.find((a) => normalize(a.name) === normalize(typed));
    if (!exact) {
      toast("⚠️ Name not found. Only guests who have checked in can be voted for.", "error");
      return;
    }
    if (myVoteFor(cat) !== null) {
      toast("⚠️ You have already voted in this category!", "error");
      return;
    }
    setSubmitting(cat);
    try {
      const rec = await api.castVote(backendUrl, voterKey, exact.name, cat);
      setRecords((prev) => [...prev, rec]);
      toast(`🗳️ Voted for ${titleCase(exact.name)}!`, "success");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        api.getVotes(backendUrl).then(setRecords).catch(() => {});
        toast("⚠️ You have already voted in this category!", "error");
      } else if (status === 400) {
        toast("⚠️ That guest isn't checked in yet, so they can't be voted for.", "error");
      } else {
        toast("❌ Could not submit your vote. Please try again.", "error");
      }
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="d-container-sm">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>👗 Best Dress Voting</div>
        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>
          You have 2 votes: 1 for the best dressed male and 1 for the best dressed female. Only checked-in guests appear.
        </div>
      </div>

      {CATEGORIES.map((c) => (
        <CategoryBox
          key={c.id}
          cat={c.id}
          label={c.label}
          loading={loading}
          checkedIn={checkedIn}
          records={records.filter((r) => r.category === c.id)}
          myVote={myVoteFor(c.id)}
          name={names[c.id] ?? ""}
          setName={(v) => setNames((p) => ({ ...p, [c.id]: v }))}
          submitting={submitting === c.id}
          onVote={() => castVote(c.id)}
        />
      ))}
    </div>
  );
}

interface BoxProps {
  cat: string;
  label: string;
  loading: boolean;
  checkedIn: Attendee[];
  records: VoteRecord[];
  myVote: string | null;
  name: string;
  setName: (v: string) => void;
  submitting: boolean;
  onVote: () => void;
}

function CategoryBox({ label, loading, checkedIn, records, myVote, name, setName, submitting, onVote }: BoxProps) {
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

  const matches = useMemo(() => {
    const q = normalize(name);
    if (q.length < 2) return [];
    return checkedIn.filter((a) => normalize(a.name).includes(q)).map((a) => a.name).slice(0, 8);
  }, [checkedIn, name]);
  const exact = checkedIn.find((a) => normalize(a.name) === normalize(name));

  return (
    <div style={{ marginBottom: 18 }}>
      <div className="d-card" style={{ marginBottom: 10 }}>
        <div className="d-section-title">{label}</div>
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
            ✅ You voted for <strong>{titleCase(myVote)}</strong>!
          </div>
        ) : (
          <div>
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
                onKeyDown={(e) => e.key === "Enter" && onVote()}
                placeholder="Type their name…"
                disabled={loading}
              />
              <button className="d-btn-primary" disabled={submitting || loading || !exact} onClick={onVote}>
                {submitting ? "Voting…" : "Vote →"}
              </button>
            </div>
            {!exact && matches.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {matches.map((n) => (
                  <div key={n} className="d-btn-ghost" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setName(n)}>
                    {n}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 9, color: exact ? "var(--disco-green)" : "var(--disco-muted)", marginTop: 8 }}>
              {exact
                ? `✅ ${exact.name} found. You can vote.`
                : name.trim().length >= 2 && matches.length === 0
                  ? "No checked-in guest matches that name."
                  : "Start typing and pick a checked-in guest."}
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
          <div style={{ fontSize: 11, color: "var(--disco-muted)", textAlign: "center", padding: "10px 0" }}>No votes yet — be the first!</div>
        )}
        {!loading &&
          leaderboard.map((c, rank) => {
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
    </div>
  );
}
