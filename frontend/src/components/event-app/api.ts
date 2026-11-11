import type { Attendee, DonationRecord, DrawWinnerRecord, FeedbackRecord, ScanLogEntry, VoteRecord } from "./types";

async function req<T>(backendUrl: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${backendUrl}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const err = new Error((body as { message?: string })?.message ?? `Request failed: ${res.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getAttendees: (backendUrl: string) => req<Attendee[]>(backendUrl, "/api/attendees"),
  register: (
    backendUrl: string,
    payload: {
      name: string;
      email: string;
      mobile: string;
      nokName?: string;
      nokContact?: string;
      division: string;
      functionArea: string;
      dietary?: string;
    },
  ) => req<Attendee>(backendUrl, "/api/attendees", { method: "POST", body: JSON.stringify(payload) }),
  checkin: (backendUrl: string, ticket: string, gate: string) =>
    req<Attendee>(backendUrl, `/api/attendees/${encodeURIComponent(ticket)}/checkin`, {
      method: "POST",
      body: JSON.stringify({ gate }),
    }),
  resetCheckins: (backendUrl: string) =>
    req<{ reset: number }>(backendUrl, "/api/admin/reset-checkins", { method: "POST" }),
  resetVotes: (backendUrl: string) =>
    req<{ reset: number }>(backendUrl, "/api/admin/reset-votes", { method: "POST" }),
  bulkImportAttendees: (
    backendUrl: string,
    rows: {
      name: string;
      email: string;
      mobile?: string;
      nokName?: string;
      nokContact?: string;
      division?: string;
      functionArea?: string;
      dietary?: string;
    }[],
  ) =>
    req<{ importedCount: number; skippedCount: number; skipped: string[]; imported: Attendee[] }>(
      backendUrl,
      "/api/attendees/bulk-import",
      { method: "POST", body: JSON.stringify(rows) },
    ),
  getScanLogs: (backendUrl: string) => req<ScanLogEntry[]>(backendUrl, "/api/scanlogs"),
  getVotes: (backendUrl: string) => req<VoteRecord[]>(backendUrl, "/api/votes"),
  castVote: (backendUrl: string, voterKey: string, candidateName: string) =>
    req<VoteRecord>(backendUrl, "/api/votes", {
      method: "POST",
      body: JSON.stringify({ voterKey, candidateName }),
    }),
  getDrawWinners: (backendUrl: string) => req<DrawWinnerRecord[]>(backendUrl, "/api/draw-winners"),
  addDrawWinner: (backendUrl: string, name: string, division: string, prize: string, prizeCategory: string) =>
    req<DrawWinnerRecord>(backendUrl, "/api/draw-winners", {
      method: "POST",
      body: JSON.stringify({ name, division, prize, prizeCategory }),
    }),
  redeemDrawWinner: (backendUrl: string, id: number) =>
    req<DrawWinnerRecord>(backendUrl, `/api/draw-winners/${id}/redeem`, { method: "POST" }),
  getDonations: (backendUrl: string) => req<DonationRecord[]>(backendUrl, "/api/donations"),
  addDonation: (backendUrl: string, donorName: string, amount: number) =>
    req<DonationRecord>(backendUrl, "/api/donations", { method: "POST", body: JSON.stringify({ donorName, amount }) }),
  deleteDonation: (backendUrl: string, id: number) => req<void>(backendUrl, `/api/donations/${id}`, { method: "DELETE" }),
  getFeedback: (backendUrl: string) => req<FeedbackRecord[]>(backendUrl, "/api/feedback"),
  submitFeedback: (
    backendUrl: string,
    payload: {
      npsScore: number;
      overallRating: number;
      foodRating: number;
      venueRating: number;
      entertainmentRating: number;
      comment?: string;
    },
  ) => req<FeedbackRecord>(backendUrl, "/api/feedback", { method: "POST", body: JSON.stringify(payload) }),
};
