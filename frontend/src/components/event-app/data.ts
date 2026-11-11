// Demo/decorative data used purely for dashboard visual richness (hourly trend widget).
// All core features — attendees, check-ins, votes, draw winners, feedback — are 100% real data from the SQLite backend.

export const HOURLY = [
  { l: "<7PM", v: 12 },
  { l: "7-7:30", v: 98 },
  { l: "7:30-8", v: 112 },
  { l: "8-8:30", v: 52 },
  { l: "8:30-9", v: 15 },
  { l: ">9PM", v: 0 },
];

export const LIVE_NAMES = [
  { n: "Hafizuddin bin Ramli", div: "ES", gate: "Gate A" },
  { n: "Jasmine Wong", div: "GTS", gate: "Gate B" },
  { n: "Vikram Nair", div: "ERP", gate: "Gate A" },
  { n: "Grace Tan", div: "Finance", gate: "VIP" },
  { n: "Amirul Hakim", div: "PS", gate: "Gate B" },
  { n: "Norzaini binti Othman", div: "P&P", gate: "Gate A" },
  { n: "Lee Chee Keong", div: "GTS", gate: "Gate A" },
  { n: "Patrick Lim", div: "P&P", gate: "Gate B" },
  { n: "Suraya binti Ahmad", div: "ERP", gate: "VIP" },
];

export interface PrizeItem {
  name: string;
  qty: number;
}
export interface PrizeCategory {
  tab: string;
  short: string;
  items: PrizeItem[];
}

export const PRIZES: PrizeCategory[] = [
  { tab: "Grand Prize", short: "🏆 Grand", items: [{ name: "Sony PlayStation 5", qty: 1 }] },
  {
    tab: "Gold Prize",
    short: "🥇 Gold",
    items: [
      { name: '55" Crystal UHD U8000H 4K Samsung Vision AI Smart TV', qty: 1 },
      { name: "Westin Hotel 1 Night Stay including breakfast for 2 Voucher", qty: 4 },
    ],
  },
  {
    tab: "Silver Prize",
    short: "🥈 Silver",
    items: [
      { name: "Samsung Galaxy Tab S10 Lite", qty: 2 },
      { name: "Dreame F20 Robot Vacuum", qty: 2 },
      { name: "Insta360 GO 3S", qty: 1 },
    ],
  },
  {
    tab: "Bronze Prize",
    short: "🥉 Bronze",
    items: [
      { name: "Klook Travel e-voucher RM500", qty: 4 },
      { name: "Touch 'n Go voucher RM250", qty: 4 },
      { name: "AEON Cash voucher RM200", qty: 8 },
    ],
  },
];

export const DIVISIONS = [
  "P&P — People & Payroll",
  "ERP — Enterprise Resource Planning",
  "GTS — Global Technology Services",
  "PS — Professional Services",
  "Finance",
  "ES — Employee Solutions",
];

export const FUNCTIONS = ["Finance", "GTS", "CX (Support, Renewal)", "CS (CSM, PS)", "Marketing", "Sales", "ES", "Outsourcing", "P&E"];

export const DIETARY = ["No Preference", "Halal", "Vegetarian", "Vegan", "Gluten-Free"];

export const GAME_ITEMS = ["🎁", "💰", "⭐", "🏆", "💎"];
export const GAME_OBSTACLES = ["🚧", "💣", "❌"];
