"use client";

import { useCallback, useEffect, useState } from "react";
import { useGetBackendUrl } from "@/lib/platform";
import "./theme.css";
import { api } from "./api";
import { AdminGate, AdminRequired } from "./AdminGate";
import { ADMIN_SESSION_KEY } from "./shared";
import { ToastProvider, useToast } from "./ToastContext";
import type { Attendee, DonationRecord, DrawWinnerRecord, FeedbackRecord, PageId, VoteRecord } from "./types";

import Home from "./pages/Home";
import CheckIn from "./pages/CheckIn";
import Dashboard from "./pages/Dashboard";
import Draw from "./pages/Draw";
import Vote from "./pages/Vote";
import Game from "./pages/Game";
import Feedback from "./pages/Feedback";
import Reports from "./pages/Reports";
import QRCodes from "./pages/QRCodes";

const PUBLIC_NAV: { id: PageId; label: string }[] = [
  { id: "home", label: "🏠 Home" },
  { id: "checkin", label: "✅ Check-In" },
  { id: "game", label: "🎮 Game" },
  { id: "vote", label: "👗 Best Dress" },
  { id: "draw", label: "🏆 Lucky Draw" },
  { id: "feedback", label: "⭐ Feedback" },
];

const ADMIN_NAV: { id: PageId; label: string }[] = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "reports", label: "📋 Reports" },
  { id: "qrcodes", label: "🔑 QR Codes" },
];

function EventAppInner() {
  const backendUrl = useGetBackendUrl();
  const { toast } = useToast();
  const [page, setPage] = useState<PageId>("home");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [winners, setWinners] = useState<DrawWinnerRecord[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [voteResetToken, setVoteResetToken] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [prefillTicket, setPrefillTicket] = useState<string | null>(null);

  const refreshAttendees = useCallback(() => {
    api
      .getAttendees(backendUrl)
      .then(setAttendees)
      .catch(() => toast("⚠️ Could not reach backend API.", "error"));
  }, [backendUrl, toast]);

  useEffect(() => {
    Promise.allSettled([
      api.getAttendees(backendUrl).then(setAttendees),
      api.getDrawWinners(backendUrl).then(setWinners),
      api.getVotes(backendUrl).then(setVotes),
      api.getFeedback(backendUrl).then(setFeedback),
      api.getDonations(backendUrl).then(setDonations),
    ]).finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl]);

  // Deep link support: scanning the venue/ticket QR opens ?checkin=1(&ticket=...) which should
  // land the guest straight on the self-service check-in flow. Also restore admin session.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "true") setIsAdmin(true);
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkin") === "1") {
      setPage("checkin");
      setPrefillTicket(params.get("ticket"));
    }
  }, []);

  // Auto-simulate a check-in every so often while the dashboard is open, for a lively demo feel.
  useEffect(() => {
    if (page !== "dashboard") return;
    const id = setInterval(() => {
      simulateCheckin();
    }, 16000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, attendees]);

  function goto(p: PageId) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requestAdmin() {
    setShowAdminGate(true);
  }

  function handleAdminSuccess() {
    setIsAdmin(true);
    setShowAdminGate(false);
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
  }

  function exitAdmin() {
    setIsAdmin(false);
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      /* ignore */
    }
    if (ADMIN_NAV.some((n) => n.id === page)) goto("home");
    toast("🚪 Exited admin mode", "info");
  }

  async function simulateCheckin() {
    const candidate = attendees.find((a) => !a.checkedIn);
    if (!candidate) return;
    try {
      const updated = await api.checkin(backendUrl, candidate.ticket, ["Gate A", "Gate B", "VIP"][Math.floor(Math.random() * 3)]);
      setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      /* ignore */
    }
  }

  const totalReg = attendees.length;

  return (
    <div className="disco-app">
      <nav className="d-nav">
        <div className="d-nav-logo">
          🪩 Access <span style={{ color: "var(--disco-pink)" }}>Annual Dinner 2026</span>
        </div>
        {PUBLIC_NAV.map((item) => (
          <button key={item.id} className={`d-nav-btn ${page === item.id ? "active" : ""}`} onClick={() => goto(item.id)}>
            {item.label}
          </button>
        ))}
        {isAdmin && (
          <>
            <span style={{ width: 1, height: 20, background: "var(--disco-border)", margin: "0 4px", flexShrink: 0 }} />
            {ADMIN_NAV.map((item) => (
              <button key={item.id} className={`d-nav-btn ${page === item.id ? "active" : ""}`} onClick={() => goto(item.id)}>
                {item.label}
              </button>
            ))}
          </>
        )}
        <button className="d-nav-btn" onClick={isAdmin ? exitAdmin : requestAdmin} style={{ marginLeft: 4 }}>
          {isAdmin ? "🚪 Exit Admin" : "🔐 Admin"}
        </button>
        <div className="d-nav-live">
          <div className="d-pulse" />
          LIVE
        </div>
      </nav>

      <AdminGate open={showAdminGate} onClose={() => setShowAdminGate(false)} onSuccess={handleAdminSuccess} />

      <div className={`d-page ${page === "home" ? "active" : ""}`}>
        <Home
          totalReg={totalReg}
          totalCI={attendees.filter((a) => a.checkedIn).length}
          isAdmin={isAdmin}
          goto={goto}
          onRequestAdmin={requestAdmin}
        />
      </div>
      <div className={`d-page ${page === "checkin" ? "active" : ""}`}>
        <CheckIn
          backendUrl={backendUrl}
          attendees={attendees}
          prefillTicket={prefillTicket}
          onRegistered={refreshAttendees}
          onCheckedIn={(a) => setAttendees((prev) => prev.map((x) => (x.id === a.id ? a : x)))}
          goto={goto}
        />
      </div>
      <div className={`d-page ${page === "dashboard" ? "active" : ""}`}>
        {isAdmin ? loaded && <Dashboard attendees={attendees} onSimulateCheckin={simulateCheckin} /> : <AdminRequired onLogin={requestAdmin} />}
      </div>
      <div className={`d-page ${page === "draw" ? "active" : ""}`}>
        <Draw
          backendUrl={backendUrl}
          attendees={attendees}
          winners={winners}
          donations={donations}
          onDonationsChange={setDonations}
          isAdmin={isAdmin}
          onWinnerAdded={(w) => setWinners((prev) => [w, ...prev])}
          onWinnerRedeemed={(id) => setWinners((prev) => prev.map((w) => (w.id === id ? { ...w, redeemed: true } : w)))}
        />
      </div>
      <div className={`d-page ${page === "vote" ? "active" : ""}`}>
        <Vote backendUrl={backendUrl} attendees={attendees} resetToken={voteResetToken} />
      </div>
      <div className={`d-page ${page === "game" ? "active" : ""}`}>
        <Game />
      </div>
      <div className={`d-page ${page === "feedback" ? "active" : ""}`}>
        <Feedback backendUrl={backendUrl} onSubmitted={(f) => setFeedback((prev) => [f, ...prev])} />
      </div>
      <div className={`d-page ${page === "reports" ? "active" : ""}`}>
        {isAdmin ? (
          <Reports backendUrl={backendUrl} attendees={attendees} winners={winners} votes={votes} feedback={feedback} onImported={refreshAttendees} onVotesReset={() => { setVotes([]); setVoteResetToken((t) => t + 1); }} />
        ) : (
          <AdminRequired onLogin={requestAdmin} />
        )}
      </div>
      <div className={`d-page ${page === "qrcodes" ? "active" : ""}`}>
        {isAdmin ? <QRCodes attendees={attendees} /> : <AdminRequired onLogin={requestAdmin} />}
      </div>
    </div>
  );
}

export default function EventApp() {
  return (
    <ToastProvider>
      <EventAppInner />
    </ToastProvider>
  );
}
