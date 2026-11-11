// Shared helpers used across the self-service check-in, voting, lucky draw and admin-gating features.
import type { Attendee } from "./types";

export const ADMIN_PIN = "2026";
export const ADMIN_SESSION_KEY = "disco-dinner-is-admin";
export const ME_STORAGE_KEY = "disco-dinner-me";
export const VOTER_KEY_STORAGE = "disco-dinner-voter-key";

export interface MyIdentity {
  ticket: string;
  name: string;
  division: string;
}

export function loadMyIdentity(): MyIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ME_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MyIdentity) : null;
  } catch {
    return null;
  }
}

export function saveMyIdentity(me: MyIdentity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ME_STORAGE_KEY, JSON.stringify(me));
}

export function normalize(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

export function titleCase(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** Find attendees whose name loosely matches the typed query (substring, either direction), optionally narrowed by email. */
export function findAttendeeMatches(attendees: Attendee[], nameQuery: string, emailQuery?: string): Attendee[] {
  const q = normalize(nameQuery);
  if (q.length < 2 && !emailQuery) return [];
  const emailQ = emailQuery ? normalize(emailQuery) : "";
  const scored = attendees
    .map((a) => {
      const n = normalize(a.name);
      let score = -1;
      if (n === q) score = 100;
      else if (n.startsWith(q)) score = 80;
      else if (n.includes(q)) score = 60;
      else if (q.includes(n)) score = 50;
      else {
        const qt = q.split(" ");
        const nt = n.split(" ");
        if (qt.every((t) => nt.some((w) => w.startsWith(t)))) score = 40;
      }
      if (score < 0 && emailQ.includes("@") && normalize(a.email) === emailQ) score = 90;
      if (score < 0) return null;
      if (emailQ && normalize(a.email).includes(emailQ)) score += 10;
      return { a, score };
    })
    .filter((x): x is { a: Attendee; score: number } => x !== null)
    .sort((x, y) => y.score - x.score);
  return scored.slice(0, 6).map((x) => x.a);
}

/** Deterministic colour for a free-text candidate name, used for vote bars. */
const VOTE_PALETTE = ["#ff2e93", "#7c3aed", "#00e5c7", "#ffd23f", "#39ff8a", "#22d3ee", "#ff8a00", "#a855f7", "#ff3860", "#d61fb0"];
export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return VOTE_PALETTE[hash % VOTE_PALETTE.length];
}

/** Minimal CSV parser (handles quoted fields with commas) — good enough for a simple name/email import sheet. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  return rows;
}

export interface ImportRow {
  name: string;
  email: string;
  mobile?: string;
  division?: string;
  functionArea?: string;
  dietary?: string;
  nokName?: string;
  nokContact?: string;
}

/** Maps a parsed CSV (first row = headers) into attendee import rows, matching flexible/aliased column names. */
export function csvToImportRows(rows: string[][]): ImportRow[] {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => normalize(h).replace(/[\s_-]+/g, ""));
  const idx = (...aliases: string[]) => {
    for (const a of aliases) {
      const i = headers.indexOf(a);
      if (i !== -1) return i;
    }
    return -1;
  };
  const col = {
    name: idx("name", "fullname"),
    email: idx("email", "emailaddress"),
    mobile: idx("mobile", "phone", "mobilenumber", "contact"),
    division: idx("division", "softcodivision", "dept", "department"),
    functionArea: idx("function", "functionarea", "role"),
    dietary: idx("dietary", "diet", "dietaryrequirement"),
    nokName: idx("nokname", "nextofkin", "emergencycontact"),
    nokContact: idx("nokcontact", "emergencycontactnumber", "nokphone"),
  };
  return rows
    .slice(1)
    .map((r) => ({
      name: (col.name !== -1 ? r[col.name] : "")?.trim() ?? "",
      email: (col.email !== -1 ? r[col.email] : "")?.trim() ?? "",
      mobile: col.mobile !== -1 ? r[col.mobile]?.trim() : undefined,
      division: col.division !== -1 ? r[col.division]?.trim() : undefined,
      functionArea: col.functionArea !== -1 ? r[col.functionArea]?.trim() : undefined,
      dietary: col.dietary !== -1 ? r[col.dietary]?.trim() : undefined,
      nokName: col.nokName !== -1 ? r[col.nokName]?.trim() : undefined,
      nokContact: col.nokContact !== -1 ? r[col.nokContact]?.trim() : undefined,
    }))
    .filter((r) => r.name);
}

export function checkinUrl(ticket?: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("checkin", "1");
  if (ticket) url.searchParams.set("ticket", ticket);
  return url.toString();
}

/** RM10 donated = 1 extra lucky draw entry. */
export const DONATION_RM_PER_ENTRY = 10;
/** Link encoded in the donation QR (Give.Asia campaign). If public/donation-qr.png exists, that image is shown instead. */
export const DONATION_QR_TEXT = "https://give.asia/campaign/empowering-workforces-while-supporting-children#/donations";
