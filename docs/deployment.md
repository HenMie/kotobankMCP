# Deployment Guide

## Service shape

This repository now targets a **single long-lived HTTP MCP service**.

- `POST /mcp`
- `GET /healthz`
- `GET /readyz`
- no frontend
- no stdio-first delivery path

## Recommended production topology

```text
MCP client -> TLS / reverse proxy -> kotobank-mcp container -> kotobank.jp
```

The proxy / ingress should own:

- TLS termination
- hostname routing
- outer request size limits
- secret injection and rotation
- optional outer IP throttling

## Required production environment

At minimum:

```bash
NODE_ENV=production
KOTOBANK_AUTH_TOKEN=replace-me
KOTOBANK_PORT=3000
```

Auth is required by default in production mode. If the token is missing, the
process fails fast at startup.

## Recommended: Docker Compose with the published image

```bash
cp .env.example .env
# edit .env and set KOTOBANK_AUTH_TOKEN
docker compose up -d
```

The bundled Compose file uses:

```text
chouann/kotobank-mcp:latest
```

Default Compose behavior:

- publishes `HOST_PORT` on the host, default `3000`
- keeps the container listen port fixed at `3000`
- requires bearer auth by default
- restarts automatically with `unless-stopped`

To stop:

```bash
docker compose down
```

To pin a different tag:

```bash
KOTOBANK_MCP_IMAGE=chouann/kotobank-mcp:v0.1.1 docker compose up -d
```

## Direct Docker run

```bash
docker run --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e KOTOBANK_AUTH_TOKEN=replace-me \
  chouann/kotobank-mcp:latest
```

## GitHub Actions -> Docker Hub

This repository includes `.github/workflows/docker-publish.yml`.

The workflow:

- runs only on `v*` release tags
- executes `npm ci`, `npm run build`, and `npm test`
- builds and pushes a multi-arch Docker image to Docker Hub

Required GitHub repository configuration:

- secret `DOCKERHUB_USERNAME`
- secret `DOCKERHUB_TOKEN`

```text
chouann/kotobank-mcp
```

## Health and readiness

Liveness:

```bash
curl -i http://127.0.0.1:3000/healthz
```

Readiness:

```bash
curl -i http://127.0.0.1:3000/readyz
```

Expected responses:

- `/healthz` -> `200` when the process is alive
- `/readyz` -> `200` when the service is ready to accept MCP traffic
- `/readyz` -> `503` during drain / shutdown

## MCP smoke validation

After the container is up, validate with an MCP-capable HTTP client:

1. `initialize`
2. `tools/list`
3. `kotobank_search`
4. `kotobank_lookup`

When auth is enabled, requests without a bearer token must fail explicitly.

## Cache topology

Current release:

- cache mode: `memory`
- cache scope: per process
- runtime scope: per process

Implication:

- repeated requests to the same replica benefit from warm cache
- multiple replicas do **not** share cache state

If you need consistent cache reuse across replicas, add a shared cache in a
future release.
