# kotobankMCP

English | [简体中文](README.zh.md)

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![MCP HTTP](https://img.shields.io/badge/mcp-streamable_http-0a7cff)

A cloud-deployable, HTTP-only MCP service for Kotobank Japanese dictionary lookup.

## What ships now

This repository now ships **one primary artifact only**: a long-lived MCP server
that exposes a Streamable HTTP endpoint at `/mcp`.

- no frontend
- no bundled skill package
- no stdio-first mainline
- Docker deployment included
- process-wide shared runtime/cache per service instance

Mobile use requires an **MCP-capable client** that can talk to a remote MCP
server over HTTP. A normal browser tab is not a substitute for an MCP client.

## HTTP service contract

The service exposes:

- `POST /mcp` — Streamable HTTP MCP endpoint
- `GET /healthz` — liveness probe
- `GET /readyz` — readiness probe

Behavior stays explicit:

`Kotobank search -> candidate ranking -> canonical word page fetch -> article / anchor parsing -> structured result`

No silent fallback is added. Empty results, ambiguity, upstream failures, and
DOM drift are surfaced explicitly.

## Quick start

### Recommended: Docker Compose with the published image

The default deployment path is now **Docker Compose + the published Docker Hub
image**:

```text
chouann/kotobank-mcp:latest
```

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env`.

   - For public or internet-facing deployment, keep:
     - `KOTOBANK_AUTH_MODE=required`
     - and set a non-empty `KOTOBANK_AUTH_TOKEN`
   - If you explicitly want no token, set:
     - `KOTOBANK_AUTH_MODE=disabled`
     - and leave `KOTOBANK_AUTH_TOKEN=` empty

3. Start the service:

```bash
docker compose up -d
```

4. Verify health:

```bash
curl -i http://127.0.0.1:3000/healthz
curl -i http://127.0.0.1:3000/readyz
```

5. Stop it when needed:

```bash
docker compose down
```

The bundled `docker-compose.yml` pulls `chouann/kotobank-mcp:latest` by default.
You can pin another tag by overriding `KOTOBANK_MCP_IMAGE` in `.env`.

### Local development from source

```bash
npm install
npm run dev:http
```

Default development mode:

- listens on `http://127.0.0.1:8080` unless `KOTOBANK_PORT` or `PORT` is set
- auth disabled by default in `NODE_ENV=development`

### Production-like local run from source

```bash
npm install
npm run build
NODE_ENV=production KOTOBANK_AUTH_TOKEN=replace-me KOTOBANK_PORT=3000 node dist/index.js
```

### Direct Docker run

```bash
docker run --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e KOTOBANK_AUTH_TOKEN=replace-me \
  chouann/kotobank-mcp:latest
```

Health checks:

```bash
curl -i http://127.0.0.1:3000/healthz
curl -i http://127.0.0.1:3000/readyz
```

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` enables auth by default |
| `KOTOBANK_HOST` | `0.0.0.0` | Bind host |
| `KOTOBANK_PORT` | `8080` | Service port |
| `PORT` | unset | Fallback port for cloud platforms |
| `KOTOBANK_AUTH_MODE` | `disabled` in dev, `required` in prod | Bearer auth policy for `/mcp` |
| `KOTOBANK_AUTH_TOKEN` | empty | May be empty only when auth mode is `disabled`; required when auth mode is `required` |
| `KOTOBANK_LOG_LEVEL` | `info` | Structured log verbosity |
| `KOTOBANK_REQUEST_TIMEOUT_MS` | `15000` | Upstream Kotobank request timeout |
| `KOTOBANK_SHUTDOWN_GRACE_PERIOD_MS` | `10000` | Graceful shutdown budget |
| `KOTOBANK_CACHE_MODE` | `memory` | Current release supports `memory` only |
| `KOTOBANK_CACHE_TTL_MS` | `300000` | In-process cache TTL |
| `KOTOBANK_CACHE_MAX_ENTRIES` | `512` | Max in-process cache entries |
| `KOTOBANK_RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `KOTOBANK_RATE_LIMIT_MAX_REQUESTS` | `60` | Per-client requests allowed per window; `0` is invalid in this release |

## Deployment notes

- TLS is expected to terminate at your reverse proxy / ingress.
- This container serves plain HTTP internally.
- The current cache is process-local memory only.
- Horizontal scale without a shared cache will reduce cache hit rate across replicas.

Recommended deployment details:

- [Deployment guide](docs/deployment.md)
- [Migration notes](docs/migration.md)

## Development and verification

```bash
npm run build
npm test
npm run test:live
```

## License

MIT. See [LICENSE](LICENSE).
