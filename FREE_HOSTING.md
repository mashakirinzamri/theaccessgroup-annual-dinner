# Free hosting test: Render (backend) + Vercel (frontend)

Put the project in a GitHub/GitLab repo first (unzip, `git init`, commit, push).

## 1. Backend on Render (free)
1. render.com -> New -> **Web Service** -> connect your repo.
2. Language: **Docker**. Dockerfile path: `deploy/backend/Dockerfile`. Docker build context: `backend`.
3. Instance type: **Free**. Create the service.
4. Wait for "Live". Copy the address, e.g. `https://dinner-api.onrender.com`.
5. Test `https://dinner-api.onrender.com/api/attendees` -> should list ~455 names.

Notes:
- Free services sleep after ~15 min idle; the first request takes ~1 minute.
- The free disk is wiped on restart/redeploy. The attendee list reloads from `backend/Data/attendees.csv`, but check-ins, votes and draw winners are lost. Fine for testing; for the real event use a paid persistent disk.

## 2. Frontend on Vercel (free)
1. vercel.com -> Add New -> Project -> import the same repo.
2. **Root Directory:** `frontend`. Framework: Next.js (auto-detected).
3. Environment Variables: `NEXT_PUBLIC_API_URL` = your Render address (no trailing slash).
4. Deploy. You get `https://yourproject.vercel.app`.

## 3. Test
- Open the Vercel address -> Home should show ~455 Registered.
- Check-In -> search "Abdeen zamri".
- Admin PIN is `2026` (Reports has the reset buttons).

If you change `NEXT_PUBLIC_API_URL`, redeploy the frontend (it is baked in at build time).
