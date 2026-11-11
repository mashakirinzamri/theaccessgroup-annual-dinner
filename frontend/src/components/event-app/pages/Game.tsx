"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_ITEMS, GAME_OBSTACLES } from "../data";
import { useToast } from "../ToastContext";

interface GameObj {
  id: string;
  x: number;
  y: number;
  type: "c" | "o";
  emoji: string;
}

interface LBEntry {
  n: string;
  s: number;
}

const AREA_W = 400;
const AREA_H = 220;
const PLAYER_Y = 175;

const INITIAL_LB: LBEntry[] = [
  { n: "Mohd Hafiz", s: 420 },
  { n: "Siti Rahimah", s: 380 },
  { n: "Raj Kumar", s: 310 },
  { n: "Lim Wei Ling", s: 290 },
  { n: "Farah Nadia", s: 250 },
];
const RANK_ICONS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

export default function Game() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [px, setPx] = useState(183);
  const [objs, setObjs] = useState<GameObj[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [lb, setLb] = useState<LBEntry[]>(INITIAL_LB);

  const tickRef = useRef(0);
  const dirRef = useRef(0);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef({ running: false, score: 0, lives: 3, px: 183 });

  useEffect(() => {
    stateRef.current = { running, score, lives, px };
  }, [running, score, lives, px]);

  useEffect(() => {
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, []);

  function startGame() {
    if (loopRef.current) clearInterval(loopRef.current);
    tickRef.current = 0;
    setScore(0);
    setLives(3);
    setPx(183);
    setObjs([]);
    setGameOver(false);
    setRunning(true);
    stateRef.current = { running: true, score: 0, lives: 3, px: 183 };

    loopRef.current = setInterval(() => {
      if (!stateRef.current.running) return;
      tickRef.current++;
      const tick = tickRef.current;

      setObjs((prevObjs) => {
        let next = [...prevObjs];
        if (tick % 38 === 0) {
          next.push({
            id: "o" + tick,
            x: Math.floor(Math.random() * 340 + 5),
            y: -24,
            type: "c",
            emoji: GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)],
          });
        }
        if (tick % 52 === 0) {
          next.push({
            id: "o" + tick + "b",
            x: Math.floor(Math.random() * 340 + 5),
            y: -24,
            type: "o",
            emoji: GAME_OBSTACLES[Math.floor(Math.random() * GAME_OBSTACLES.length)],
          });
        }
        const speed = 3 + Math.floor(stateRef.current.score / 80) * 0.5;
        next = next.map((o) => ({ ...o, y: o.y + (o.type === "o" ? speed + 1 : speed) }));

        const curPx = stateRef.current.px;
        const filtered: GameObj[] = [];
        let scoreDelta = 0;
        let lifeDelta = 0;
        for (const o of next) {
          if (o.y > 220) continue;
          if (Math.abs(o.x - curPx) < 26 && Math.abs(o.y - PLAYER_Y) < 26) {
            if (o.type === "c") {
              scoreDelta += 10;
            } else {
              lifeDelta -= 1;
            }
            continue;
          }
          filtered.push(o);
        }
        if (scoreDelta > 0) {
          setScore((s) => s + scoreDelta);
          toast("⭐ +10 pts!", "success");
        }
        if (lifeDelta < 0) {
          setLives((l) => {
            const nl = l + lifeDelta;
            toast("💥 Ouch! -1 life", "error");
            if (nl <= 0) {
              endGame();
            }
            return nl;
          });
        }
        return filtered;
      });
    }, 50);
  }

  function endGame() {
    stateRef.current.running = false;
    setRunning(false);
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    setGameOver(true);
    setLb((prev) => {
      const updated = [...prev, { n: "You", s: stateRef.current.score }].sort((a, b) => b.s - a.s).slice(0, 5);
      return updated;
    });
    toast(`🎮 Game over! Score: ${stateRef.current.score}`, "info");
  }

  function gMove(dir: number) {
    dirRef.current = dir;
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      if (!stateRef.current.running) return;
      setPx((p) => {
        const np = Math.max(5, Math.min(360, p + dir * 14));
        stateRef.current.px = np;
        return np;
      });
    }, 55);
  }
  function gStop() {
    dirRef.current = 0;
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }

  const level = Math.floor(score / 80) + 1;

  return (
    <div className="d-container-sm">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2 }}>🎮 Mini Game — Catch the Prize!</div>
        <div style={{ fontSize: 10, color: "var(--disco-muted)" }}>Catch 🎁💰⭐🏆💎 for points · Avoid 🚧💣❌ obstacles · Use ◀ ▶ to move</div>
      </div>
      <div className="d-game-wrap">
        <div className="d-game-score-bar">
          <div className="d-game-score-card">
            <div className="d-game-score-val">{score}</div>
            <div className="d-game-score-label">Score</div>
          </div>
          <div className="d-game-score-card">
            <div className="d-game-score-val">{"❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, 3 - lives))}</div>
            <div className="d-game-score-label">Lives</div>
          </div>
          <div className="d-game-score-card">
            <div className="d-game-score-val">{level}</div>
            <div className="d-game-score-label">Level</div>
          </div>
        </div>
        <div className="d-game-area" style={{ maxWidth: AREA_W }}>
          <div className="d-game-ground" />
          <div className="d-game-player" style={{ left: px }}>
            🧑
          </div>
          {objs.map((o) => (
            <div key={o.id} className={`d-game-obj ${o.type === "c" ? "collectible" : "obstacle"}`} style={{ left: o.x, top: o.y }}>
              {o.emoji}
            </div>
          ))}
          {gameOver && (
            <div className="d-game-over-overlay">
              <div className="d-game-over-title">💥 Game Over!</div>
              <div className="d-game-over-score">Score: {score}</div>
              <button className="d-game-start-btn" onClick={startGame}>
                🔄 Play Again
              </button>
            </div>
          )}
        </div>
        <div className="d-game-ctrl-row">
          <button
            className="d-game-ctrl-btn"
            onMouseDown={() => gMove(-1)}
            onMouseUp={gStop}
            onMouseLeave={gStop}
            onTouchStart={() => gMove(-1)}
            onTouchEnd={gStop}
          >
            ◀
          </button>
          <button className="d-game-start-btn" onClick={startGame} disabled={running}>
            {running ? "▶ Playing…" : "▶ Start Game"}
          </button>
          <button
            className="d-game-ctrl-btn"
            onMouseDown={() => gMove(1)}
            onMouseUp={gStop}
            onMouseLeave={gStop}
            onTouchStart={() => gMove(1)}
            onTouchEnd={gStop}
          >
            ▶
          </button>
        </div>
        <div className="d-game-lb">
          <div className="d-game-lb-header">🏆 Leaderboard</div>
          <div>
            {lb.map((e, i) => (
              <div className="d-game-lb-row" key={e.n + i}>
                <div className="d-game-lb-rank">{RANK_ICONS[i] ?? i + 1}</div>
                <div className="d-game-lb-name">{e.n}</div>
                <div className="d-game-lb-score">{e.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
