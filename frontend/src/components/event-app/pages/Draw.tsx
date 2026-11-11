"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { PRIZES } from "../data";
import { DONATION_RM_PER_ENTRY, loadMyIdentity, normalize } from "../shared";
import { useToast } from "../ToastContext";
import type { Attendee, DonationRecord, DrawWinnerRecord } from "../types";
import Donations from "./Donations";

interface DrawProps {
  backendUrl: string;
  attendees: Attendee[];
  winners: DrawWinnerRecord[];
  donations: DonationRecord[];
  onDonationsChange: (d: DonationRecord[]) => void;
  isAdmin: boolean;
  onWinnerAdded: (w: DrawWinnerRecord) => void;
  onWinnerRedeemed: (id: number) => void;
}

const ITEM_H = 36;

export default function Draw({ backendUrl, attendees, winners, donations, onDonationsChange, isAdmin, onWinnerAdded, onWinnerRedeemed }: DrawProps) {
  const { toast, confetti } = useToast();
  const [tab, setTab] = useState<"draw" | "donate">("draw");
  const [prizeIdx, setPrizeIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [curIndex, setCurIndex] = useState<number | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [lastWinner, setLastWinner] = useState<{ n: string; div: string } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [me, setMe] = useState<ReturnType<typeof loadMyIdentity>>(null);
  useEffect(() => {
    setMe(loadMyIdentity());
  }, []);

  // ONLY attendees who have confirmed check-in at the venue are eligible — this is the full pool.
  // Past winners are automatically excluded (removed) so nobody wins twice.
  const usedNames = useMemo(() => new Set(winners.map((w) => normalize(w.name))), [winners]);
  const pool = useMemo(
    () => attendees.filter((a) => a.checkedIn && !usedNames.has(normalize(a.name))).map((a) => ({ n: a.name, div: a.division })),
    [attendees, usedNames],
  );
  // Each person gets 1 base entry + 1 extra entry per RM10 donated. Entries are interleaved so
  // repeated names are spread around the wheel instead of sitting in one block.
  const entries = useMemo(() => {
    const extra = new Map<string, number>();
    donations.forEach((d) => {
      const k = normalize(d.donorName);
      extra.set(k, (extra.get(k) ?? 0) + d.amount);
    });
    const counts = pool.map((p) => 1 + Math.floor((extra.get(normalize(p.n)) ?? 0) / DONATION_RM_PER_ENTRY));
    const maxRound = Math.max(0, ...counts);
    const out: { n: string; div: string }[] = [];
    for (let r = 0; r < maxRound; r++) pool.forEach((p, i) => counts[i] > r && out.push(p));
    return out;
  }, [pool, donations]);
  const doublePool = useMemo(() => [...entries, ...entries], [entries]);
  const myEntries = me ? entries.filter((e) => normalize(e.n) === normalize(me.name)).length : 0;
  const category = PRIZES[prizeIdx];
  const item = category.items[Math.min(itemIdx, category.items.length - 1)];
  const prize = { tab: category.tab, label: `${category.tab} — ${item.name}` };
  const wonCount = (label: string) => winners.filter((w) => w.prize === label).length;
  const remainingForItem = item.qty - wonCount(prize.label);
  const iAmEligible = !!me && pool.some((p) => normalize(p.n) === normalize(me.name));
  const iAlreadyWon = !!me && usedNames.has(normalize(me.name));

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function selPrize(i: number) {
    setPrizeIdx(i);
    setItemIdx(0);
    setShowWinner(false);
    setLastWinner(null);
  }

  async function startDraw() {
    if (spinning || pool.length === 0) return;
    if (remainingForItem <= 0) {
      toast("⚠️ All of this prize have been drawn. Pick another prize.", "error");
      return;
    }
    setSpinning(true);
    setShowWinner(false);
    const winIdx = Math.floor(Math.random() * entries.length);
    const winner = entries[winIdx];
    const target = (entries.length + winIdx) * ITEM_H;

    let pos = 0;
    let speed = 20;
    await new Promise<void>((resolve) => {
      const tick = () => {
        pos += speed;
        if (pos >= target - ITEM_H * 3) speed = Math.max(1.5, speed - 1.4);
        if (pos >= target) {
          pos = target;
          setOffset(pos);
          setCurIndex(winIdx);
          resolve();
          return;
        }
        setOffset(pos);
        setCurIndex(Math.floor((pos + 18) / ITEM_H) % entries.length);
        timeoutRef.current = setTimeout(tick, 30);
      };
      tick();
    });

    try {
      const created = await api.addDrawWinner(backendUrl, winner.n, winner.div, prize.label, prize.tab);
      onWinnerAdded(created);
      setLastWinner(winner);
      setShowWinner(true);
      confetti();
      toast(`🎉 Winner: ${winner.n} — ${prize.tab}`, "success");
    } catch {
      toast("❌ Failed to record winner.", "error");
    } finally {
      setSpinning(false);
      setTimeout(() => {
        setOffset(0);
        setCurIndex(null);
      }, 2500);
    }
  }

  function redraw() {
    // The previous winner stays on the record (audit trail) and is already excluded from the pool
    // since they're in `winners` — this just clears the banner so the host can draw the next prize.
    setShowWinner(false);
    setLastWinner(null);
    toast("🔄 Ready to draw again for this prize.", "info");
  }

  async function markRedeem() {
    const latest = winners[0];
    if (!latest) return;
    try {
      await api.redeemDrawWinner(backendUrl, latest.id);
      onWinnerRedeemed(latest.id);
      setShowWinner(false);
      toast("✅ Prize marked as redeemed", "success");
    } catch {
      toast("❌ Failed to update redemption status.", "error");
    }
  }

  const tabBar = (
    <div className="d-draw-prize-tabs" style={{ marginBottom: 12 }}>
      <div className={`d-prize-tab ${tab === "draw" ? "active" : ""}`} onClick={() => setTab("draw")}>🎡 Lucky Draw</div>
      <div className={`d-prize-tab ${tab === "donate" ? "active" : ""}`} onClick={() => setTab("donate")}>💝 Donate</div>
    </div>
  );

  if (tab === "donate") {
    return (
      <div className="d-container-sm">
        {tabBar}
        <Donations backendUrl={backendUrl} attendees={attendees} donations={donations} onChange={onDonationsChange} isAdmin={isAdmin} />
      </div>
    );
  }

  return (
    <div className="d-container-sm">
      {tabBar}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>🏆 Lucky Draw — Disco Bingo</div>
        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>Checked-in attendees only · No repeat winners · No-shows excluded</div>
      </div>

      {me && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 11,
            border: "1px solid var(--disco-border)",
            background: "rgba(0,0,0,.2)",
            color: iAlreadyWon ? "var(--disco-gold)" : iAmEligible ? "var(--disco-green)" : "var(--disco-muted)",
          }}
        >
          {iAlreadyWon
            ? `🎉 ${me.name}, you've already won a prize tonight — congrats!`
            : iAmEligible
              ? `✅ ${me.name}, you're in the draw with ${myEntries} ${myEntries === 1 ? "entry" : "entries"}! Donate RM${DONATION_RM_PER_ENTRY} for each extra one 🍀`
              : `ℹ️ ${me.name}, check in at the gate to join the Lucky Draw.`}
        </div>
      )}

      {!isAdmin && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 10,
            border: "1px dashed var(--disco-border)",
            color: "var(--disco-muted)",
            textAlign: "center",
          }}
        >
          🔒 Draws are conducted live by the event host — you&apos;re watching in real time.
        </div>
      )}

      <div className="d-draw-info-bar">
        <div>
          <span>Eligible Pool: </span>
          <strong>{pool.length}</strong>
        </div>
        <div>
          <span>Wheel Entries: </span>
          <strong>{entries.length}</strong>
        </div>
        <div>
          <span>Draws Done: </span>
          <strong>{winners.length}</strong>
        </div>
        <div>
          <span>Winners: </span>
          <strong>{usedNames.size}</strong>
        </div>
      </div>
      <div className="d-draw-prize-tabs">
        {PRIZES.map((p, i) => (
          <div key={p.tab} className={`d-prize-tab ${i === prizeIdx ? "active" : ""}`} onClick={() => selPrize(i)}>
            {p.short}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {category.items.map((it, i) => {
          const left = it.qty - wonCount(`${category.tab} — ${it.name}`);
          return (
            <div key={it.name} className={`d-prize-tab ${i === itemIdx ? "active" : ""}`} onClick={() => setItemIdx(i)}>
              {it.name} · {Math.max(0, left)}/{it.qty} left
            </div>
          );
        })}
      </div>
      <div className="d-draw-stage">
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--disco-muted)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 5 }}>
          Current Prize
        </div>
        <div style={{ fontSize: "clamp(16px,3vw,24px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>{prize.label} <span style={{ fontSize: 12, color: "var(--disco-muted)" }}>({Math.max(0, remainingForItem)} of {item.qty} left)</span></div>
        <div className="d-bingo-wrap">
          <div className="d-bingo-center-line" />
          <div className="d-bingo-fade-top" />
          <div className="d-bingo-fade-bot" />
          {pool.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 11, color: "var(--disco-muted)", padding: "0 20px", textAlign: "center" }}>
              No eligible attendees checked in yet.
            </div>
          ) : (
            <div className="d-bingo-inner" style={{ transform: `translateY(-${offset}px)` }}>
              {doublePool.map((p, i) => (
                <div key={i} className={`d-bingo-item ${curIndex !== null && i % entries.length === curIndex ? "cur" : ""}`}>
                  <span>{p.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`d-winner-announce ${showWinner ? "show" : ""}`}>
          <div className="d-winner-announce-label">{prize.tab} Winner!</div>
          <div className="d-winner-announce-name">{lastWinner?.n ?? "—"}</div>
          <div className="d-winner-announce-div">{lastWinner?.div ?? "—"}</div>
        </div>
        {isAdmin && (
          <div className="d-draw-btn-row">
            <button className="d-draw-btn spin" disabled={spinning || pool.length === 0 || remainingForItem <= 0} onClick={startDraw}>
              🎲 Draw Winner
            </button>
            {showWinner && (
              <>
                <button className="d-draw-btn redraw" onClick={redraw}>
                  🔄 Draw Again
                </button>
                <button className="d-draw-btn redeem" onClick={markRedeem}>
                  ✅ Mark Redeemed
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="d-winners-table-wrap">
        <table className="d-rep-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Winner</th>
              <th>Division</th>
              <th>Prize</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {winners.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--disco-muted)", padding: 16 }}>
                  No draws yet
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
  );
}
