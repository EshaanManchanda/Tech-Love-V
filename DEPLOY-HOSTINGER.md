# Deploying to a Hostinger VPS

This runs all three Node services (`apps/api`, `apps/worker`, `apps/web`) directly on the
VPS under PM2, with MongoDB Atlas and a cloud Redis (Upstash or Redis Cloud) as managed
free-tier services, and Nginx as the public-facing reverse proxy + TLS terminator.

Local development still uses the repo's `docker-compose.yml` (local Mongo + Redis) —
production instead points at cloud instances, so nothing runs in Docker on the VPS.

```
Internet → Nginx (80/443, TLS) → 127.0.0.1:3000  (apps/web, Next.js)
                                → 127.0.0.1:4000  (apps/api, Express)
apps/worker has no HTTP port — it just consumes the email/reminder queue.
MongoDB Atlas and cloud Redis are reached over the internet via TLS connection strings
(mongodb+srv://, rediss://) — no local DB ports to open or secure.
```

## 0. What you need before starting

- A Hostinger VPS (Ubuntu 22.04+ recommended) with root/SSH access.
- A domain, with two DNS A records pointed at the VPS's IP: `yourdomain.com` (the web app)
  and `api.yourdomain.com` (the API). Subdomain routing is simpler and avoids path-rewriting
  the Next.js app and the Express API behind one host.
- A **MongoDB Atlas** free-tier (M0) cluster: https://cloud.mongodb.com → Build a Database →
  M0 Free. Create a DB user, and under Network Access allow the VPS's IP (or `0.0.0.0/0` if
  the VPS has no static IP). Copy the `mongodb+srv://...` connection string.
- A **cloud Redis** instance — either Upstash (https://upstash.com, serverless, free tier) or
  Redis Cloud (https://redis.io/try-free, 30MB free). Copy the `rediss://...` connection
  string (TLS).
- A Stripe account (live keys, for real payments) and a Resend account (for real emails) —
  or skip both and run without them (checkout/emails just won't work — see §4).

## 1. Initial server setup

SSH in as root, then:

```bash
apt update && apt upgrade -y

# Non-root user (never run the app as root)
adduser deploy
usermod -aG sudo deploy
su - deploy

# Firewall — only SSH, HTTP, HTTPS reach the outside. 3000/4000 stay internal;
# MongoDB Atlas / cloud Redis are reached outbound over TLS, no inbound ports needed for them.
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # confirm v20.x

# PM2 — keeps api/worker/web running, restarts on crash, restarts on reboot
sudo npm install -g pm2

# Nginx + Certbot — reverse proxy and free TLS certs
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 2. Get the code onto the server

```bash
cd ~
git clone <your-repo-url> certificate-license-platform
cd certificate-license-platform
npm install   # installs all workspaces (apps/api, apps/web, apps/worker) in one pass
```

## 3. MongoDB Atlas + cloud Redis

Nothing to start on the VPS — both are managed services you already created in §0. Just
have their connection strings ready for the next step:

- Atlas: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/certificate-license-platform?retryWrites=true&w=majority`
- Upstash / Redis Cloud: `rediss://default:<password>@<host>:<port>`

## 4. Environment variables

Each app reads its own env file from its own directory — copy the `.example` and fill it in.
**Never commit the real files** (already gitignored).

```bash
cp apps/api/.env.example       apps/api/.env
cp apps/worker/.env.example    apps/worker/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/api/.env`:
- `NODE_ENV=production` — enables secure (HTTPS-only) cookies and locks CORS to `APP_URL` only.
- `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/certificate-license-platform?retryWrites=true&w=majority` — from §0/§3.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate two different values: `openssl rand -hex 32`
- `APP_URL=https://yourdomain.com`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / the four `STRIPE_PRICE_*` vars — see §8
- `REDIS_URL=rediss://default:<password>@<host>:<port>` — from §0/§3 (note `rediss://`, not
  `redis://` — the extra `s` is TLS, required by Upstash/Redis Cloud).

Edit `apps/worker/.env`:
- Same `MONGODB_URI` / `REDIS_URL` as above (must point at the same Atlas cluster / Redis instance).
- `RESEND_API_KEY` — leave blank and emails just get logged instead of sent (fine for a
  soft launch; not fine if you're relying on invite/renewal emails reaching customers).
- `EMAIL_FROM`

Edit `apps/web/.env.local`:
- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

## 5. Build

```bash
npm run build -w apps/api
npm run build -w apps/worker
npm run build -w apps/web
```

## 6. Run under PM2

The repo root has `ecosystem.config.js` already set up for all three apps (each with the
right `cwd` so it picks up its own `.env`).

```bash
pm2 start ecosystem.config.js
pm2 save                 # persist this process list
pm2 startup              # prints a systemd command — copy/run it so PM2 survives a reboot
pm2 logs                 # tail all three apps' logs; Ctrl+C to stop tailing (doesn't stop the apps)
```

## 7. Nginx reverse proxy + HTTPS

Create `/etc/nginx/sites-available/yourdomain.com`:

```nginx
server {
  listen 80;
  server_name yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name api.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Certbot rewrites the above to redirect 80→443 and adds the cert config automatically
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

Certbot auto-renews via a systemd timer it installs — nothing further to do.

## 8. Point Stripe at production

1. Stripe Dashboard → switch to **live mode** → Developers → API keys → copy the secret key
   into `apps/api/.env` as `STRIPE_SECRET_KEY`, then `pm2 restart api`.
2. Create the four prices (Pro/Business × monthly/yearly) if you haven't already:
   `cd apps/api && npm run stripe:setup-prices` — copy the printed price IDs into `.env`,
   restart `api` again.
3. Stripe Dashboard → Developers → Webhooks → Add endpoint →
   `https://api.yourdomain.com/api/webhooks/stripe` → select the `checkout.session.completed`,
   `invoice.paid`, and `customer.subscription.deleted` events → copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`, restart `api` once more.

## 9. Create your admin account

```bash
# Register a normal account at https://yourdomain.com/register first, then:
cd ~/certificate-license-platform/apps/api
npx tsx src/scripts/set-user-role.ts you@yourdomain.com admin
```

Log in, then use the account dropdown (top right) → "Switch to admin portal", or go directly
to `https://yourdomain.com/admin`.

## 10. Verify

```bash
curl -I https://yourdomain.com          # 200, and security headers (helmet) present
curl -I https://api.yourdomain.com/health   # {"ok":true}
pm2 status                              # all three "online", no restart loops
```

Then in the browser: register → log in → (promote to admin per §9) → issue a test license
from `/admin/licenses` → confirm it shows up.

## 11. Redeploying updates

```bash
cd ~/certificate-license-platform
git pull
npm install
npm run build -w apps/api
npm run build -w apps/worker
npm run build -w apps/web
pm2 restart ecosystem.config.js
```

## 12. Troubleshooting

- `pm2 logs api` / `pm2 logs worker` / `pm2 logs web` — per-app logs.
- Mongo connection errors in `pm2 logs api` → double-check the Atlas Network Access list
  includes the VPS's IP, and the DB user's password doesn't contain unescaped `@`/`:`/`/`
  characters (URL-encode them if it does).
- Redis connection errors → confirm you used `rediss://` (TLS) not `redis://`, and that the
  Upstash/Redis Cloud instance isn't paused (free tiers can idle-pause on some providers).
- API won't boot at all → check `pm2 logs api` for "Missing required environment
  variable(s)" (it fails fast if `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` are unset).
- Login works but cookies don't stick → confirm `NODE_ENV=production` is actually set for
  `api` (secure cookies require HTTPS, which only exists once Nginx+Certbot are wired up).
- Stripe webhook 400s → the signing secret in `.env` doesn't match the endpoint you created
  in §8.3, or you copied the test-mode secret instead of the live-mode one.
