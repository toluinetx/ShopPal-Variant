# ShopPal — Architecture

ShopPal is now a small multi-service e-commerce stack. Each service ships
as an Alpine container and has a Kubernetes manifest under `k8s/`.

```
                                ┌─────────────────────┐
                                │        client       │  (React + nginx:alpine)
                                └──────────┬──────────┘
                                           │
                    ┌──────────────────────┼────────────────────────────┐
                    │                      │                            │
             ┌──────▼──────┐        ┌──────▼──────┐             ┌───────▼───────┐
             │   server    │        │   support   │             │ notifications │
             │ Node/Express│        │  Go (Alpine)│  ──emits──▶ │  Go (Alpine)  │
             └──────┬──────┘        └──────┬──────┘             └───────────────┘
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
| `client`       | React 18, Vite, Tailwind, nginx  | 80    | SPA; new `/support` route calls the Go support API directly |
| `server`       | Node 20, Express, TypeORM, PG    | 3000  | Core commerce API (auth, users, products, carts, orders, reviews) |
| `support`      | Go 1.22, pgx, stdlib mux         | 8081  | Support tickets: create, list, get, add message, update status |
| `notifications`| Go 1.22, stdlib                  | 8082  | In-memory event log fed by `support` (ticket.created, message_added, status_changed) |
| `postgres`     | Postgres 16-alpine               | 5432  | Persistence for `server` and `support` (separate tables) |

## Support service — API

```
GET  /healthz
GET  /readyz
GET  /categories
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
POST /notify        body: {type, timestamp, payload}   (called by support)
GET  /events?limit= (newest-first)
```

## Running locally

```bash
docker compose up --build
# client:        http://localhost:8080
# server:        http://localhost:3000
# support:       http://localhost:8081
# notifications: http://localhost:8082
```

## Deploying to Kubernetes

See [`k8s/README.md`](./k8s/README.md).

## Enterprise touches included

- **Dedicated microservice per concern** with independent scaling (HPA on `server` and `support`).
- **Alpine-based images**, multi-stage builds, non-root runtime users, read-only root filesystems where possible, dropped capabilities.
- **Health and readiness probes** on every service.
- **NetworkPolicies** default-deny east-west traffic, then explicit allow.
- **ConfigMap + Secret** separation; secrets referenced via `envFrom`/`secretKeyRef`.
- **StatefulSet + PVC** for Postgres.
- **Ingress + TLS** with cert-manager annotations.
- **Best-effort async notifications** so support flows aren't blocked by downstream outages.
