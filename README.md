# 🪩 Access Annual Dinner 2026 — Event Management System

A full-stack, retro-disco themed event management web app built for the **Access Annual Dinner 2026**. Attendees check themselves in via QR code, vote for Best Dress, enter the Lucky Draw, play a mini-game, and leave feedback — while admins get a live dashboard, reports, and QR code generation, all gated behind a PIN.

---

## ✨ Features

### Attendee-facing (no login required)
- **🏠 Home** — event overview and quick links
- **✅ Check-In** — self-service venue check-in: search your name (optionally with email to disambiguate), confirm, and you're automatically added to the Lucky Draw pool. Unmatched names fall back to walk-in registration.
- **🎮 Mini Game** — catch-the-prize arcade game with a live leaderboard
- **👗 Best Dress Voting** — type in the name of who you're voting for; a live, real-time leaderboard tallies votes as they come in
- **🏆 Lucky Draw** — watch a rolling draw wheel pull a winner from checked-in attendees only; once picked, a winner is automatically removed from future draws (no repeat winners)
- **⭐ Feedback** — Wootric-style NPS micro-survey (single 0–10 score, contextual follow-up question, optional star ratings)

### Admin-only (PIN-gated)
- **📊 Dashboard** — live KPIs (registrations, check-ins, attendance rate, no-shows), hourly check-in trend, check-ins by gate, live check-in feed, division breakdown, no-show report
- **📋 Reports** — exportable-style tables for Attendance, No-Show, Lucky Draw winners, Best Dress results, and Feedback summary
- **🏷️ QR Codes** — generate the venue check-in QR and per-attendee ticket QR codes

Admin access is PIN-protected (default PIN: `2026`) and persists per browser tab for the session.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React 19, TypeScript, Tailwind CSS v4 |
| UI Components | Radix UI primitives + custom shadcn-style component library |
| Backend | .NET 10 Web API |
| Database | SQLite (via EF Core) |
| API Docs | Scalar (OpenAPI UI) at `/swagger` |
| QR Codes | `qrcode` (client-generated, scannable) |

---

## 📁 Project Structure

```
.
├── backend/
│   ├── Backend.csproj          # .NET 10 Web API project
│   ├── Program.cs              # API endpoints, CORS, OpenAPI/Scalar setup
│   ├── Data/
│   │   └── AppDbContext.cs     # EF Core SQLite context
│   └── Models/
│       └── Models.cs           # Attendee, Vote, DrawWinner, Feedback entities
│
└── frontend/
    ├── src/
    │   ├── app/                 # Next.js routes (page.tsx, layout.tsx, /compare)
    │   ├── components/
    │   │   ├── event-app/       # The core application
    │   │   │   ├── EventApp.tsx # Root component: nav, routing, admin gating
    │   │   │   ├── pages/       # Home, CheckIn, Game, Vote, Draw, Feedback,
    │   │   │   │                # Dashboard, Reports, QRCodes
    │   │   │   ├── api.ts       # Backend API client
    │   │   │   ├── shared.ts    # Admin PIN, identity storage, name matching
    │   │   │   ├── types.ts     # Shared TypeScript types
    │   │   │   └── theme.css    # Retro-disco theme styles
    │   │   └── ui/               # Reusable design-system components
    │   └── providers/            # React Query provider, theme provider
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 20+
- [.NET 10 SDK](https://dotnet.microsoft.com/download)

### Backend

```bash
cd backend
dotnet restore
dotnet run
```

The API runs on `http://localhost:5000` by default. A SQLite database file is created automatically on first run and seeded with sample attendee data. Interactive API docs are available at `http://localhost:5000/swagger`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000` by default.

> The frontend automatically resolves the correct backend URL for local development, sandbox, and deployed environments via `frontend/src/lib/platform.ts` (no external/private package required).

---

## ⚙️ Configuration

| Setting | Location | Default |
|---|---|---|
| Admin PIN | `frontend/src/components/event-app/shared.ts` → `ADMIN_PIN` | `2026` |
| Event capacity / seed data | `backend/Program.cs` (seed logic) | 12 sample attendees |
| Database file | `backend/` (SQLite, created at runtime) | `eventapp.db` |

> ⚠️ The admin PIN is a simple client-side gate suitable for an internal event tool — it is visible in the frontend bundle and should not be treated as a real authentication secret for sensitive deployments.

---

## 🧪 Validation

- **Frontend type-check:** `cd frontend && npx tsc --noEmit`
- **Frontend lint:** `cd frontend && npm run lint`
- **Backend build:** `cd backend && dotnet build`

---

## 📄 License

Internal tool — not licensed for external distribution.
