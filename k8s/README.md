# ShopPal — Kubernetes manifests

Apply in order:

```bash
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-secret.yaml               # replace placeholders first
kubectl apply -f 05-db-schema-configmap.yaml
kubectl apply -f 10-postgres.yaml
kubectl apply -f 20-server.yaml
kubectl apply -f 30-support.yaml
kubectl apply -f 31-notifications.yaml
kubectl apply -f 40-client.yaml
kubectl apply -f 50-ingress.yaml
kubectl apply -f 60-network-policies.yaml
```

Or all at once:

```bash
kubectl apply -f .
```

## Components

| Manifest | Purpose |
|----------|---------|
| `01-configmap.yaml` | Non-secret config: JWT expiry, cookie settings, CORS origins |
| `02-secret.yaml` | DB credentials, JWT signing secret, connection strings |
| `05-db-schema-configmap.yaml` | The `server` API's SQL schema (tables + enums), mounted into Postgres's init directory |
| `10-postgres.yaml` | PostgreSQL 16 StatefulSet + PVC. Runs the schema ConfigMap above on first boot (empty data dir only) |
| `20-server.yaml` | Node/Express API (auth, users, products, orders, carts, reviews) + HPA |
| `30-support.yaml` | Go support/ticketing service + HPA + hardened SecurityContext (self-migrates its own tables on boot) |
| `31-notifications.yaml` | Go notifications sink (event log for support; no database) |
| `40-client.yaml` | React static bundle served by nginx:alpine |
| `50-ingress.yaml` | nginx-ingress with TLS via cert-manager |
| `60-network-policies.yaml` | Default-deny + explicit allow rules for internal traffic |

Images are expected at `ghcr.io/shoppal/{server,support,notifications,client}:latest`.
Adjust `image:` fields to point at your registry.

## Why the schema ConfigMap exists

The `server` API (TypeORM) ships with `synchronize: false` and no migration
tooling — the upstream project never added one. `support` and
`notifications` (Go) don't have this problem: they `CREATE TABLE IF NOT
EXISTS` their own schema on every boot. For `server`, `05-db-schema-configmap.yaml`
mounts a schema captured with `pg_dump --schema-only` from
`server/db/schema.sql` into Postgres's `/docker-entrypoint-initdb.d/`,
which the official Postgres image runs automatically **once**, only when
its data directory is empty. If you change any TypeORM entity, regenerate
that file (see the "Database schema" section in the root `ARCHITECTURE.md`)
and re-apply — it will *not* auto-update an existing database.
