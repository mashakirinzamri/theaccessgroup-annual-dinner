export type PageId =
  | "home"
  | "checkin"
  | "dashboard"
  | "draw"
  | "vote"
  | "game"
  | "feedback"
  | "reports"
  | "qrcodes";

export interface Attendee {
  id: number;
  ticket: string;
  name: string;
  email: string;
  mobile: string;
  nokName: string;
  nokContact: string;
  division: string;
  functionArea: string;
  dietary: string;
  source: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  checkedInGate: string | null;
  createdAt: string;
}

export interface ScanLogEntry {
  id: number;
  result: "valid" | "duplicate" | "invalid";
  ticket: string | null;
  name: string | null;
  division: string | null;
  gate: string;
  scannedAt: string;
}

export interface VoteRecord {
  id: number;
  voterKey: string;
  candidateName: string;
  votedAt: string;
}

export interface DrawWinnerRecord {
  id: number;
  name: string;
  division: string;
  prize: string;
  prizeCategory: string;
  redeemed: boolean;
  wonAt: string;
}

export interface FeedbackRecord {
  id: number;
  npsScore: number;
  overallRating: number;
  foodRating: number;
  venueRating: number;
  entertainmentRating: number;
  comment: string;
  source: string;
  submittedAt: string;
}

export interface ToastMsg {
  id: number;
  msg: string;
  type: "success" | "error" | "info";
}

export interface DonationRecord {
  id: number;
  donorName: string;
  amount: number;
  donatedAt: string;
}
