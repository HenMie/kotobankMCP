# kotobankMCP

[English](README.md) | 简体中文

![Node >=20](https://img.shields.io/badge/node-%3E%3D20-43853d)
![License MIT](https://img.shields.io/badge/license-MIT-blue)
![MCP HTTP](https://img.shields.io/badge/mcp-streamable_http-0a7cff)

这是一个**云端可部署、HTTP-only 的 Kotobank MCP 服务**，用于日语词典查词。

## 当前交付物

这个仓库现在只以**纯 MCP 服务**为主交付：

- 没有前端
- 不再以本地 skill 包为主
- 不再以 stdio MCP 为主路径
- 自带 Docker 部署工件
- 每个服务进程复用共享 runtime / cache

如果你想在手机上使用，它的前提是你有一个**支持远端 MCP 的客户端**。
普通浏览器页面不能直接替代 MCP 客户端。

## HTTP 服务契约

服务暴露以下端点：

- `POST /mcp` — Streamable HTTP MCP 主入口
- `GET /healthz` — 存活检查
- `GET /readyz` — 就绪检查

词典处理链路仍然保持显式：

`Kotobank search -> candidate ranking -> canonical word page fetch -> article / anchor parsing -> structured result`

不增加 silent fallback。无结果、歧义、上游失败、DOM 漂移都会显式返回。

## 快速开始

### 推荐方式：Docker Compose + 已发布镜像

现在默认推荐的部署方式是 **Docker Compose + Docker Hub 已发布镜像**：

```text
chouann/kotobank-mcp:latest
```

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 编辑 `.env`，把 `KOTOBANK_AUTH_TOKEN` 改成你自己的值。

3. 启动服务：

```bash
docker compose up -d
```

4. 检查健康状态：

```bash
curl -i http://127.0.0.1:3000/healthz
curl -i http://127.0.0.1:3000/readyz
```

5. 停止服务：

```bash
docker compose down
```

仓库自带的 `docker-compose.yml` 默认会拉取
`chouann/kotobank-mcp:latest`。如果你想固定其他版本，可以在 `.env`
里覆盖 `KOTOBANK_MCP_IMAGE`。

### 从源码本地开发

```bash
npm install
npm run dev:http
```

默认开发模式行为：

- 监听 `http://127.0.0.1:8080`，除非设置了 `KOTOBANK_PORT` 或 `PORT`
- `NODE_ENV=development` 下默认关闭鉴权

### 从源码本地模拟生产运行

```bash
npm install
npm run build
NODE_ENV=production KOTOBANK_AUTH_TOKEN=replace-me KOTOBANK_PORT=3000 node dist/index.js
```

### 直接用 Docker 运行

```bash
docker run --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e KOTOBANK_AUTH_TOKEN=replace-me \
  chouann/kotobank-mcp:latest
```

健康检查：

```bash
curl -i http://127.0.0.1:3000/healthz
curl -i http://127.0.0.1:3000/readyz
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` 下默认要求鉴权 |
| `KOTOBANK_HOST` | `0.0.0.0` | 服务绑定地址 |
| `KOTOBANK_PORT` | `8080` | 服务端口 |
| `PORT` | 未设置 | 云平台常见端口回退值 |
| `KOTOBANK_AUTH_MODE` | 开发环境 `disabled`，生产环境 `required` | `/mcp` 的 Bearer 鉴权策略 |
| `KOTOBANK_AUTH_TOKEN` | 未设置 | 当 auth mode 为 `required` 时必填 |
| `KOTOBANK_LOG_LEVEL` | `info` | 结构化日志级别 |
| `KOTOBANK_REQUEST_TIMEOUT_MS` | `15000` | 上游 Kotobank 请求超时 |
| `KOTOBANK_SHUTDOWN_GRACE_PERIOD_MS` | `10000` | 优雅退出时间预算 |
| `KOTOBANK_CACHE_MODE` | `memory` | 当前版本仅支持 `memory` |
| `KOTOBANK_CACHE_TTL_MS` | `300000` | 进程内缓存 TTL |
| `KOTOBANK_CACHE_MAX_ENTRIES` | `512` | 进程内缓存最大条目数 |
| `KOTOBANK_RATE_LIMIT_WINDOW_MS` | `60000` | 限流窗口 |
| `KOTOBANK_RATE_LIMIT_MAX_REQUESTS` | `60` | 每窗口允许的请求数；当前版本不支持 `0` |

## 部署说明

- TLS 应由反向代理 / ingress 终止。
- 容器内部只提供明文 HTTP。
- 当前缓存是**单进程内存缓存**。
- 如果做横向扩容而不接共享缓存，不同副本之间不会共享热缓存。

推荐部署细节见：

- [部署指南](docs/deployment.zh.md)
- [迁移说明](docs/migration.zh.md)

## 开发与验证

```bash
npm run build
npm test
npm run test:live
```

## License

MIT。见 [LICENSE](LICENSE)。
