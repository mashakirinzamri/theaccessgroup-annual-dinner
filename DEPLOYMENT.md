# 🚀 Making This Public — Deployment Guide

You have **two** ways to put this app on the public internet. Read the
caveat in Option B before you pick one.

---

## Option A (recommended): Use Evo Builder's built-in Publish

This project was built and is currently hosted inside **Evo Builder**,
which has a one-click **Publish** action in the editor UI (top of the
workspace). It:

- Builds and hosts both the frontend and backend for you
- Wires up the correct public URLs automatically (no manual config)
- Is the only option that doesn't hit the private-package issue below

I can't trigger it from chat — look for the **"Publish"** button in the
Evo Builder interface, review the changes, and confirm. That's it.

If you want this app public **today** with the least risk, use this
option.

---

## Option B: Self-host on your own server (e.g. a VPS)

This repo includes a `Dockerfile` for the backend, a `Dockerfile` for the
frontend, and a `docker-compose.yml` at the project root so you can run
both on any server with [Docker](https://docs.docker.com/get-docker/)
installed.

### ✅ No private packages — this now installs anywhere

Earlier builds of this app depended on a private, internally-hosted
package (`@evo-builder/templates-common`) plus a few unused internal
scaffold packages (`@access-evo/*`). Those have all been removed:

- The two small things that package provided — resolving the backend's
  URL, and detecting a mobile viewport — are now plain local code in
  `frontend/src/lib/platform.ts`, with no external dependency.
- The unused internal scaffold packages were dropped from
  `package.json` entirely (they were never imported anywhere in the
  app's code).
- `frontend/.npmrc` (which pointed at the internal registry) has been
  removed — it's no longer needed.

A plain `npm install` / `npm ci` now works on any machine with no special
credentials, which is what the `Dockerfile` below relies on.

### Steps

1. **Copy this whole project folder** onto your server (e.g. `git clone`
   from your repository, or `scp`/`rsync` the folder).

2. **Pick the public URL/IP your server will be reached at.** Say it's
   `http://203.0.113.10` — the backend will be reachable on port `5000`
   and the frontend on port `3000` by default.

3. **Build and start both containers:**

   ```bash
   cd demo-abdeen-zamri-784   # or wherever you copied the project
   NEXT_PUBLIC_API_URL=http://203.0.113.10:5000 docker compose up -d --build
   ```

   > `NEXT_PUBLIC_API_URL` **must** be the address your visitors' browsers
   > will use to reach the backend — not `localhost`, not `backend` (the
   > internal Docker service name). Next.js bakes this value into the
   > frontend at build time, so if you change it later you must rebuild
   > the frontend image.

4. **Open `http://203.0.113.10:3000`** in a browser — that's your live app.

5. **Put a domain + HTTPS in front of it** (strongly recommended for a
   public event tool). The simplest way is a reverse proxy like
   [Caddy](https://caddyserver.com/) or [nginx](https://nginx.org/) with
   a free [Let's Encrypt](https://letsencrypt.org/) certificate, pointed
   at ports 3000 (frontend) and 5000 (backend).

### Data persistence

The backend container stores its SQLite database file inside a Docker
named volume (`dinner_data`), so attendee check-ins, votes, draw winners,
and feedback survive container restarts and rebuilds. To fully reset the
event data, run:

```bash
docker compose down -v
```

(This deletes the volume — only do this if you want a clean slate.)

### Stopping / updating

```bash
docker compose down            # stop everything
docker compose up -d --build   # rebuild & restart after a code change
```

---

## Before going live, either way

- **Admin PIN** (`2026`, in `frontend/src/components/event-app/shared.ts`)
  is a lightweight gate, not real security — anyone can read it from the
  browser's JavaScript. Fine for an internal event tool; change it if you
  want something less guessable.
- **CORS** is already configured wide-open (`AllowAnyOrigin`-equivalent)
  in `backend/Program.cs`, appropriate for this kind of public single-event
  tool — no changes needed there.
- Consider doing one **final walkthrough** of Check-In → Game → Best Dress
  → Lucky Draw → Feedback on the live public URL before announcing it to
  attendees, to confirm the frontend is talking to the right backend URL.
