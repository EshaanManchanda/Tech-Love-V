# Deploying: web on Vercel, API + worker on a Hostinger VPS

Production is split across two hosts:

- **`apps/web`** (Next.js) is deployed on **Vercel**, which builds it from GitHub on every push to `main`.
- **`apps/api`** (Express) and **`apps/worker`** (email/reminder queue) run on a **Hostinger VPS** under
  PM2, behind Nginx for TLS.
- **Data** lives in managed free-tier services: **MongoDB Atlas** and a **cloud Redis** (Upstash or Redis
  Cloud). Nothing runs in Docker in production; `docker-compose.yml` is for local development only.

```
Browser ──► app.example.com ──► Vercel (apps/web, Next.js)
   │                                  │  server-side calls (middleware, admin layout)
   └──────► api.example.com ──► VPS: Nginx (443, TLS) → 127.0.0.1:4000 (apps/api, PM2)
                                      apps/worker (PM2, no HTTP port) consumes the Redis queue
API + worker → MongoDB Atlas (mongodb+srv://) and cloud Redis (rediss://), outbound over TLS
```

> **The web app and the API must be subdomains of the same parent domain**, e.g. `app.example.com` and
> `api.example.com`. The API sets the login cookies for `COOKIE_DOMAIN=.example.com`, and the web app's
> middleware reads them on its own domain. On a raw `*.vercel.app` URL, the cookies never reach the web
> app: login appears to succeed, then bounces straight back to `/login`. Always use the custom domain.
>
> Live setup for reference: web `techlovev.in`, API `tlvapi.techlovev.in`,
> `COOKIE_DOMAIN=.techlovev.in`. The rest of this guide uses `app.example.com` / `api.example.com`.

## 0. What you need before starting

- **A Hostinger VPS** (Ubuntu 22.04+) with root/SSH access.
- **A domain** where you can add DNS records:
  - `api.example.com` → an **A record** pointing at the VPS's IP.
  - `app.example.com` → the **CNAME** Vercel gives you when you add the domain (§6).
- **A MongoDB Atlas** M0 cluster (https://cloud.mongodb.com → Build a Database → M0 Free):
  1. Create a database user.
  2. Under Network Access, allow the VPS's IP.
  3. Copy the `mongodb+srv://...` connection string.
- **A cloud Redis**, either Upstash (https://upstash.com) or Redis Cloud (https://redis.io/try-free). Copy the
  `rediss://...` (TLS) connection string.
- **A Vercel account** with access to this GitHub repo.
- **A Stripe account** (live keys) and **a Resend account** (emails). You can skip both: checkout and
  outgoing emails just won't work (see §3).

## 1. VPS setup (API + worker)

SSH in, then:

```bash
apt update && apt upgrade -y

# Firewall — only SSH, HTTP, HTTPS reach the outside; 4000 stays internal behind Nginx.
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # confirm v20.x

# PM2 keeps api/worker running and restarts them on crash/reboot; Nginx + Certbot for TLS.
npm install -g pm2
apt install -y nginx certbot python3-certbot-nginx
```

## 2. Get the code onto the VPS

```bash
cd /var/www
git clone <your-repo-url> certificate-license-platform
cd certificate-license-platform
npm install   # installs every workspace in one pass
```

The web app is also installed here, but it isn't built or run on the VPS.

## 3. VPS environment variables

Each app reads its own env file from its own directory. Copy the example and fill it in. **Never commit
the real files** (they're gitignored).

```bash
cp apps/api/.env.example    apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```

`apps/api/.env`:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production`. This makes cookies HTTPS-only and restricts CORS to `APP_URL`. |
| `MONGODB_URI` | The Atlas connection string, e.g. `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/certificate-license-platform?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two **different** random values. Generate each with `openssl rand -hex 32`. |
| `APP_URL` | `https://app.example.com`. This is the **web** domain: the CORS allow-list, links in emails, and Stripe's success/cancel pages all use it. It must match the browser's origin exactly, with no trailing slash. |
| `COOKIE_DOMAIN` | `.example.com`. Note the leading dot. See the note at the top. |
| `REDIS_URL` | `rediss://default:<password>@<host>:<port>`. `rediss://` (TLS), not `redis://`. |
| `STRIPE_*` | See §8. |

`apps/worker/.env`:

| Variable | Value |
|---|---|
| `MONGODB_URI`, `REDIS_URL` | Same as the API's. |
| `RESEND_API_KEY` | Leave blank and emails are logged instead of sent. |
| `EMAIL_FROM` | The sender address for outgoing emails. |

## 4. Build and run the API + worker under PM2

```bash
npm run build -w apps/api
npm run build -w apps/worker

pm2 start ecosystem.config.js   # starts "api" and "worker", each with the right cwd for its .env
pm2 save                        # persist this process list
pm2 startup                     # prints a systemd command — run it so PM2 survives a reboot
pm2 status                      # both "online"
```

## 5. Nginx + HTTPS for the API

Create `/etc/nginx/sites-available/api.example.com`:

```nginx
server {
  listen 80;
  server_name api.example.com;
  client_max_body_size 50m;   # plugin ZIP uploads in Admin → Products → Versions
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
ln -s /etc/nginx/sites-available/api.example.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.example.com   # adds TLS + 80→443 redirect; auto-renews via a systemd timer
curl https://api.example.com/health   # {"ok":true}
```

## 6. Deploy the web app on Vercel

1. Vercel → **Add New → Project** → import this GitHub repo.
2. Set **Root Directory** to `apps/web`. Next.js is detected automatically.
3. Under **Environment Variables** (Production), add:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://api.example.com`. The browser, the middleware's session renewal, and server components all call the API here. |
   | `NEXT_PUBLIC_SITE_URL` | `https://app.example.com`, with no trailing slash. Canonical URLs, `sitemap.xml`, `robots.txt`, `llms.txt` and structured data all use it. If it's missing, they point at `http://localhost:3000`. |

   `NEXT_PUBLIC_*` values are baked in **at build time**. After adding or changing one, redeploy (Deployments
   → ⋯ → Redeploy, with "Use existing Build Cache" **unticked**). Changing the value alone does nothing.
4. **Deploy.**
5. **Settings → Domains → add `app.example.com`**, and create the DNS record Vercel shows (§0).
6. **Optional:** in Vercel's firewall settings, check that search and AI crawlers aren't challenged. §10 has a
   test for this.

From then on, **every push to `main` redeploys the web app automatically.**

## 7. Create your admin account

```bash
# Register a normal account at https://app.example.com/register first, then on the VPS:
cd /var/www/certificate-license-platform/apps/api
npx tsx src/scripts/set-user-role.ts you@example.com admin
```

Log in, then open `https://app.example.com/admin`, or use the account menu → "Switch to admin portal".

## 8. Stripe

1. **Add the live key.** Stripe Dashboard → **live mode** → Developers → API keys. Copy the secret key into
   `apps/api/.env` as `STRIPE_SECRET_KEY`, then run `pm2 restart api`.
2. **Set prices for the two original products.** Certificate Generator Pro/Business and Dynamic Tags Paid use
   the six `STRIPE_PRICE_*` env vars. To create them, run
   `cd apps/api && npm run stripe:setup-prices`, paste the printed price IDs into `.env`, then
   `pm2 restart api`.
3. **Set prices for any product created in the admin.** Admin → Products → (product) → Plans → **Edit** →
   enter the plan's Stripe monthly/yearly price IDs, its sites per license, and (optionally) its license key
   prefix. No env vars or restart needed. Checkout for a billing cycle stays disabled until its price ID is set.
4. **Add the webhook.** Stripe Dashboard → Developers → Webhooks → Add endpoint →
   `https://api.example.com/api/webhooks/stripe`. Select the events `checkout.session.completed`,
   `invoice.paid` and `customer.subscription.deleted`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`,
   then run `pm2 restart api`.

## 9. Upload plugin releases

Admin → Products → (product) → **Versions** → upload the ZIP and mark it current. The customer
Downloads page lists every active product, and shows a download button once the product has a current
version.

## 10. Verify

```bash
# API
curl https://api.example.com/health                 # {"ok":true}
curl https://api.example.com/api/products           # active products with current_version

# Web — crawler files must show your real domain, not localhost
curl -s https://app.example.com/robots.txt | tail -1   # Sitemap: https://app.example.com/sitemap.xml
curl -s https://app.example.com/sitemap.xml | head -5
curl -s https://app.example.com/llms.txt | head -5

# Search/AI crawlers aren't blocked (each should print 200)
for ua in Googlebot Bingbot OAI-SearchBot GPTBot PerplexityBot; do
  curl -s -o /dev/null -w "$ua %{http_code}\n" -A "$ua" https://app.example.com/
done
```

Then, in the browser:
1. Register and log in.
2. Promote yourself to admin (§7).
3. Issue a test license from `/admin/licenses` and confirm it appears under the customer's Licenses.
4. Open `/dashboard/downloads` and confirm the products are listed.

## 11. Redeploying updates

**Web:** push to `main`. Vercel builds and deploys automatically.

**API + worker (VPS):**

```bash
cd /var/www/certificate-license-platform
git pull
npm install
npm run build -w apps/api
npm run build -w apps/worker
pm2 restart api worker
pm2 logs api --lines 50   # clean boot, no Mongo/env errors
```

When a change touches both, deploy the API first. Older web builds keep working against a newer API.

**Rollback:**
- **Web:** Vercel → Deployments → previous deployment → **Promote to Production**.
- **API/worker:** `git checkout <previous-commit>`, rebuild, then `pm2 restart api worker`.

## 12. Troubleshooting

- **Login succeeds but you land back on `/login`:**
  - `COOKIE_DOMAIN` isn't set to the shared parent domain, or
  - you're on a `*.vercel.app` URL instead of the custom domain, or
  - `NODE_ENV` isn't `production` on the API (secure cookies need HTTPS).
- **CORS errors in the browser console:** `APP_URL` in `apps/api/.env` doesn't exactly match the web origin
  (scheme, host, no trailing slash). Restart `api` after fixing it.
- **`robots.txt` / canonical URLs show `localhost:3000`:** `NEXT_PUBLIC_SITE_URL` is missing in Vercel, or
  the build ran before you added it. Redeploy without the build cache.
- **Pages load but show no data or versions:** `NEXT_PUBLIC_API_URL` in Vercel is wrong, or the API is down
  (`pm2 status`, `pm2 logs api`).
- **Mongo connection errors** in `pm2 logs api`:
  - the Atlas Network Access list must include the VPS's IP, and
  - URL-encode `@`, `:` or `/` in the database password.
- **Redis errors:**
  - use `rediss://` (TLS), and
  - check that the free-tier instance isn't paused.
- **API won't boot:** check `pm2 logs api` for "Missing required environment variable(s)". It fails fast if
  `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is unset.
- **Checkout says "No monthly price is set up for this plan yet":** add the plan's Stripe price ID (§8.2 or
  §8.3).
- **Stripe webhook 400s:** the signing secret doesn't match the endpoint, or it's the test-mode secret.
- **Uploading a plugin ZIP fails with 413:** raise `client_max_body_size` in the Nginx config (§5), then run
  `systemctl reload nginx`.
