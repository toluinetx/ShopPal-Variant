# ShopPal — Kubernetes manifests

Apply in order:

```bash
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-secret.yaml    # replace placeholders first
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
| `10-postgres.yaml` | PostgreSQL 16 StatefulSet + PVC |
| `20-server.yaml` | Node/Express API (auth, users, products, orders, carts, reviews) + HPA |
| `30-support.yaml` | Go support/ticketing service + HPA + hardened SecurityContext |
| `31-notifications.yaml` | Go notifications sink (event log for support) |
| `40-client.yaml` | React static bundle served by nginx:alpine |
| `50-ingress.yaml` | nginx-ingress with TLS via cert-manager |
| `60-network-policies.yaml` | Default-deny + explicit allow rules for internal traffic |

Images are expected at `ghcr.io/shoppal/{server,support,notifications,client}:latest`.
Adjust `image:` fields to point at your registry.
