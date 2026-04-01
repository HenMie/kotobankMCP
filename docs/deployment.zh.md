# 部署指南

## 服务形态

当前仓库目标是**单个长期常驻的 HTTP MCP 服务**。

- `POST /mcp`
- `GET /healthz`
- `GET /readyz`
- 无前端
- 不再提供 stdio-first 主路径

## 推荐生产拓扑

```text
MCP 客户端 -> TLS / 反向代理 -> kotobank-mcp 容器 -> kotobank.jp
```

建议由反向代理 / ingress 负责：

- TLS 终止
- 域名与路由分发
- 外层请求体限制
- 密钥注入与轮换
- 可选的外层 IP 限流

## 生产环境最小配置

至少设置：

```bash
NODE_ENV=production
KOTOBANK_AUTH_TOKEN=replace-me
KOTOBANK_PORT=3000
```

生产模式下默认要求鉴权。如果 token 缺失，进程会在启动时显式失败。

## 推荐方式：Docker Compose + 已发布镜像

```bash
cp .env.example .env
# 编辑 .env
docker compose up -d
```

仓库自带的 Compose 文件默认使用：

```text
chouann/kotobank-mcp:latest
```

默认行为：

- 对外暴露 `HOST_PORT`，默认 `3000`
- 容器内部监听端口固定为 `3000`
- 默认使用 `KOTOBANK_AUTH_MODE=required`
- 使用 `unless-stopped` 自动重启策略

鉴权建议：

- 推荐公网部署：
  - `KOTOBANK_AUTH_MODE=required`
  - `KOTOBANK_AUTH_TOKEN` 填非空值
- 如果你明确要无 token：
  - `KOTOBANK_AUTH_MODE=disabled`
  - `KOTOBANK_AUTH_TOKEN=` 可以留空

停止服务：

```bash
docker compose down
```

如果要固定某个版本 tag：

```bash
KOTOBANK_MCP_IMAGE=chouann/kotobank-mcp:v0.1.1 docker compose up -d
```

## 直接用 Docker 运行

```bash
docker run --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e KOTOBANK_AUTH_TOKEN=replace-me \
  chouann/kotobank-mcp:latest
```

## GitHub Actions -> Docker Hub

仓库已经包含 `.github/workflows/docker-publish.yml`。

这个 workflow 会：

- 只在打 `v*` release tag 时运行
- 先执行 `npm ci`、`npm run build`、`npm test`
- 然后构建并推送多架构 Docker 镜像到 Docker Hub

需要在 GitHub 仓库里配置：

- secret `DOCKERHUB_USERNAME`
- secret `DOCKERHUB_TOKEN`

workflow 推送的镜像名固定为：

```text
chouann/kotobank-mcp
```

## 健康检查与就绪检查

存活检查：

```bash
curl -i http://127.0.0.1:3000/healthz
```

就绪检查：

```bash
curl -i http://127.0.0.1:3000/readyz
```

预期行为：

- `/healthz` -> 进程存活时返回 `200`
- `/readyz` -> 服务可接收 MCP 请求时返回 `200`
- `/readyz` -> 排空 / 关闭期间返回 `503`

## MCP smoke 验证

容器启动后，用支持 HTTP MCP 的客户端依次验证：

1. `initialize`
2. `tools/list`
3. `kotobank_search`
4. `kotobank_lookup`

启用鉴权时，不带 bearer token 的请求必须被显式拒绝。

## 缓存拓扑

当前版本：

- cache mode: `memory`
- cache 作用域：单进程
- runtime 作用域：单进程

这意味着：

- 同一个副本上的重复请求可以吃到热缓存
- 多副本之间**不会**共享缓存状态

如果你需要跨副本共享命中率，需要在后续版本接入共享缓存。
