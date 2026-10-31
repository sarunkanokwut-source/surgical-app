# Ward Round

A shared, password-protected ward round list for phones. One server holds the patient list; the whole team logs in from their own phones and sees the same up-to-date data.

| Screen | What it does |
|---|---|
| **Round** | Patient cards grouped by ward or attending. Filter by ward, attending, primary/consult, *not seen*, *dressing due*, *pending Ix*. Search HN / name / bed / diagnosis. Tap ✓ to mark seen today. |
| **Patient** | HN, name, age/sex, ward, bed, attending, primary vs consult (and consulting team), diagnosis, date of injury (shows injury day), operations (planned / done / cancelled, shows POD), wound dressing (needs dressing, frequency, last dressed), investigations (due date, pending/done, result), important remark. Discharge / re-admit. |
| **To-do** | Every pending investigation, planned operation and due dressing, bucketed **Overdue / Today / Tomorrow / Upcoming / No date**. Tick to mark done. |
| **Settings** | Ward and attending lists, discharged patients, change password. Admins: team accounts, access log, purge old discharged records. |

The app re-fetches every 30 s and whenever the phone returns to the tab, so changes from teammates show up automatically. If two people edit the same patient at once, the second save is rejected rather than silently overwriting the first.

## Security and PDPA

- **Login required.** No self-registration: an admin creates each account with a temporary password, and the user has to change it on first login.
- Passwords hashed with scrypt. Sessions are random tokens in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production). They expire after 8 h idle or 24 h total (`SESSION_IDLE_HOURS`, `SESSION_MAX_HOURS`).
- After 8 failed logins, that username is locked out from that IP for 15 minutes.
- **Audit log** records logins, failed logins, and every patient create / update / discharge / delete, with user and IP.
- **No patient data is stored on the phone.** API responses are `no-store`, and the offline cache (service worker) holds only the app shell.
- Strict security headers (CSP, no framing, no referrer). Write requests need a custom header, which blocks CSRF.
- **Data minimisation:** discharged patients leave the active list. Admins can purge discharged records older than N days, or set `AUTO_PURGE_DAYS` to do it automatically.
- Only admins can permanently delete a patient.

**What you still need to do for PDPA:**
1. Serve the app **over HTTPS only**.
2. Host it somewhere your department/hospital approves, ideally in Thailand or on the hospital network.
3. Restrict and encrypt backups of `ward.db`.
4. Disable accounts when people rotate off the team.
5. Check with your hospital's DPO / IT before putting real patient data on it.

## Run locally

Requires **Node 22.13+** (uses the built-in `node:sqlite`, so there are no native modules).

```bash
npm install
npm run create-admin -- admin 'a-strong-password' "Dr Admin"
npm run build
npm run server            # http://localhost:3000
```

Development with hot reload: run `npm run dev:server` and `npm run dev` in two terminals, then open the Vite URL (it proxies `/api` to port 3000).

## Deploy

The app is one Node process plus one SQLite file. Any host with a **persistent disk** works.

**Docker (hospital server / VPS):**
```bash
docker build -t ward-round .
docker run -d --name ward-round -p 3000:3000 -v ward-data:/data --restart unless-stopped ward-round
docker exec ward-round node --disable-warning=ExperimentalWarning server/create-admin.js admin 'a-strong-password' "Dr Admin"
```
Put it behind an HTTPS reverse proxy (nginx / Caddy / Cloudflare Tunnel) and set `TRUST_PROXY=1` so the access log records real client IPs.

**Without Docker:** `npm ci && npm run build && npm start`, with `DB_PATH` pointing at a persistent location.

### Environment variables

| Variable | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `DB_PATH` | `./data/ward.db` | SQLite file. Back it up. |
| `NODE_ENV` | — | Set to `production` for `Secure` cookies + HSTS (needs HTTPS). |
| `TRUST_PROXY` | — | Set to `1` when behind a reverse proxy. |
| `SESSION_IDLE_HOURS` | `8` | |
| `SESSION_MAX_HOURS` | `24` | |
| `AUTO_PURGE_DAYS` | off | Delete discharged patients after N days. |

### Install on phone
Open the URL in Safari/Chrome, then use **Share → Add to Home Screen**. The app then opens full-screen like a native app.
