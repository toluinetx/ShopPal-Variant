# ShopPal — Architecture

ShopPal is now a small multi-service e-commerce stack. Each service ships
as an Alpine container and has a Kubernetes manifest under `k8s/`.

```
                                ┌─────────────────────┐     ┌─────────────────────┐
                                │        client       │     │        admin        │  (React + nginx:alpine)
                                └──────────┬──────────┘     └──────────┬──────────┘
                                           │                            │
                    ┌──────────────────────┼──────────────┬────────────┘
                    │                      │              │
             ┌──────▼──────┐        ┌──────▼──────┐       │        ┌───────────────┐
             │   server    │        │   support   │       │        │ notifications │
             │ Node/Express│        │  Go (Alpine)│  ──emits───────▶│  Go (Alpine)  │
             └──────┬──────┘        └──────┬──────┘                └───────────────┘
                    │                      │
                    └──────────┬───────────┘
                               │
                        ┌──────▼──────┐
                        │  postgres   │
                        └─────────────┘
```

## Services

| Service        | Stack                            | Port  | Purpose |
|----------------|----------------------------------|-------|---------|
| `client`       | React 18, Vite, Tailwind, nginx  | 80    | Shopper-facing SPA; new `/support` route calls the Go support API directly |
| `admin`        | React 18, Vite, Tailwind, nginx  | 80    | Admin-only SPA for store configuration (product create/edit/delete, price & stock updates). Calls the same `server` API, but only with an admin access token |
| `server`       | Node 20, Express, TypeORM, PG    | 3000  | Core commerce API (auth, admin auth, users, products, carts, orders, reviews) |
| `support`      | Go 1.22, pgx, stdlib mux         | 8081  | Support tickets: create, list, get, add message, update status |
| `notifications`| Go 1.22, stdlib                  | 8082  | In-memory event log fed by `support` (ticket.created, message_added, status_changed) |
| `postgres`     | Postgres 16-alpine               | 5432  | Persistence for `server` and `support` (separate tables) |

## Admin authentication & authorization

`server` issues two flavors of JWT access token from parallel login flows: a
regular shopper token (`/user/loginByUsername` etc., unchanged) and an
**admin** token (`/admin/loginByUsername` / `/admin/loginByEmail`), which
carries an extra `role: "admin"` claim and is signed against the separate
`Admin` Postgres table (see the `Admin` entity) rather than `User`.

```
POST /admin/loginByUsername   body: {username, password}
POST /admin/loginByEmail      body: {email, password}
GET  /admin/refresh-token     (httpOnly `adminRefreshToken` cookie -> new access token)
POST /admin/logout
```

`adminAuthorization.middleware.ts` verifies the bearer token *and* requires
`role === "admin"`; a valid shopper token is rejected with `403`. It gates
the three product-mutation routes:

```
POST   /product      create product   — admin only
PATCH  /product/:id  update product   — admin only (price, stock, etc.)
DELETE /product/:id  delete product   — admin only
```

`GET /product` and `GET /product/:id` stay public, so the shopper `client`
is unaffected. A default admin account is seeded on first boot for local/dev
use — see `server/db/seed-admin.sql` (**change the password before using
this seed anywhere beyond a demo**):

```
username: admin
email:    admin@shoppal.local
password: Admin123!
```

In production, `server`'s CORS allow-list includes both `CLIENT_PROD_URL`
and `ADMIN_PROD_URL`, since `client` and `admin` are deployed as separate
frontends on separate origins.

## API documentation (OpenAPI)

Every service ships a hand-written OpenAPI 3.0 spec and a Swagger UI:

| Service         | Spec                          | Docs UI (browser)       |
|------------------|-------------------------------|--------------------------|
| `server`         | `GET /openapi.yaml`           | `GET /docs`              |
| `support`        | `GET /openapi.yaml`           | `GET /docs`              |
| `notifications`  | `GET /openapi.yaml`           | `GET /docs`              |

Source files live at `server/openapi.yaml`, `support/openapi.yaml`, and
`notifications/openapi.yaml` (the Go services embed a copy under
`internal/` via `go:embed` so the binary is self-contained; keep both
copies in sync when editing). Locally:

```bash
open http://localhost:3000/docs   # server
open http://localhost:8081/docs   # support
open http://localhost:8082/docs   # notifications
```

## Support service — API

```
GET  /healthz
GET  /readyz
GET  /categories
GET  /openapi.yaml · GET /docs
POST /tickets                       body: {user_id,email,subject,category,order_id?,priority?,body}
GET  /tickets?user_id=&limit=&offset=
GET  /tickets/{id}
POST /tickets/{id}/messages         body: {author, author_role, body}
PATCH /tickets/{id}/status          body: {status}
```

Statuses: `open · in_progress · waiting_customer · resolved · closed`
Priorities: `low · normal · high · urgent`

## Notifications service — API

```
GET  /healthz
GET  /openapi.yaml · GET /docs
POST /notify        body: {type, timestamp, payload}   (called by support)
GET  /events?limit= (newest-first)
```

## Database schema

The `server` API (TypeORM) ships `synchronize: false` and has **no
migration tooling** — that's true of the upstream project, not something
this fork added. To make `docker compose up` and the k8s manifests work
out of the box, `server/db/schema.sql` was generated once with:

```bash
pg_dump --schema-only --no-owner --no-privileges -d <a db synced via TypeORM> > server/db/schema.sql
```

It's applied automatically:
- **docker-compose**: mounted into the `postgres` container at
  `/docker-entrypoint-initdb.d/01-schema.sql` (runs once, only on an empty
  data volume — the official Postgres image's convention).
- **k8s**: the same file is wrapped in `k8s/05-db-schema-configmap.yaml`
  and mounted the same way into the Postgres StatefulSet.

`support` and `notifications` don't have this problem — both
self-migrate (`CREATE TABLE IF NOT EXISTS ...`) on every boot.

**If you change a TypeORM entity**, regenerate `server/db/schema.sql` the
same way (point `DB_CONNECTION_URL` at a scratch database, temporarily
flip `synchronize: true` in `pg.data-source.ts`, boot the server once,
`pg_dump --schema-only`, then revert `synchronize` to `false`). It will
not auto-apply to an already-initialized database — that's the tradeoff
of not having real migrations; a follow-up worth doing is adding
`typeorm migration:generate`.

## Running locally

```bash
docker compose up --build
# client:        http://localhost:8080
# admin:         http://localhost:8090  (login: admin / Admin123!)
# server:        http://localhost:3000  (docs at /docs)
# support:       http://localhost:8081  (docs at /docs)
# notifications: http://localhost:8082  (docs at /docs)
```

First boot creates the Postgres schema automatically (see above) — no
manual DB setup needed, and seeds a default admin login for the `admin`
frontend (see "Admin authentication & authorization" above).
`docker-compose.yml` sets dev-only defaults for `JWT_SECRET` and friends;
replace them for anything beyond a demo.

## Deploying to Kubernetes

See [`k8s/README.md`](./k8s/README.md) — same schema-bootstrap approach,
via a mounted ConfigMap instead of a compose volume.

## Enterprise touches included

- **Dedicated microservice per concern** with independent scaling (HPA on `server` and `support`), including a separate `admin` frontend on its own origin, deployment, and ingress host so store configuration is isolated from the shopper-facing `client`.
- **Alpine-based images**, multi-stage builds, non-root runtime users, read-only root filesystems where possible, dropped capabilities.
- **Health and readiness probes** on every service, wired to real endpoints (not bare TCP checks).
- **NetworkPolicies** default-deny east-west traffic, then explicit allow.
- **ConfigMap + Secret** separation; each container gets only the env vars it actually reads (no blanket `envFrom` dumps — that class of bug is exactly what broke `server`'s DB connection before this pass).
- **StatefulSet + PVC** for Postgres, with automatic first-boot schema bootstrap.
- **Ingress + TLS** with cert-manager annotations.
- **Best-effort async notifications** so support flows aren't blocked by downstream outages (uses a detached context, not the request context, so the call actually survives past the response).
- **Self-hosted API docs** (Swagger UI assets vendored, not CDN-loaded) so `/docs` works with no outbound network access.

## Verified end-to-end

This isn't just "it builds." The full stack was run against a real
Postgres instance and exercised with real HTTP traffic: signup → login →
refresh-token → product create/list → cart add/get → review → order
create/list on `server`; ticket create → add message → status update →
notifications event delivery on `support`/`notifications`; and the built
client was driven with a headless browser to submit a real support ticket
against the live API. All three `/docs` pages were confirmed to render
with zero failed network requests.
