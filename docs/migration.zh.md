# 迁移说明

## 边界变化

这个仓库过去主要围绕以下交付物组织：

- `.agents/skills/` 下的本地 skill 包
- 一个可选的 stdio MCP 入口
- skill installer / CLI 打包链路

现在它已经切换为：

- 云端可部署的 HTTP-only MCP 服务
- Docker-first 部署
- 进程级 runtime / cache 复用
- 面向远端 MCP 客户端，而不是本地 skill 安装

## 主线移除了什么

主线服务交付不再包含：

- bunded skill 打包链路
- skill installer 命令
- stdio-first 启动路径
- skill-first README 定位

## 保留下来的部分

核心词典逻辑被刻意保留：

`search -> rank -> canonical word fetch -> parse -> structured result`

也就是说，变的是 transport / deployment 边界，不是词典解析核心。

## 为什么这一期没有改成 Rust

Rust 重写被明确延后。

原因：

- 当前最大的时延收益来自长期常驻进程与共享缓存
- 还没有证据表明语言 runtime 开销是主要瓶颈
- 复用现有 TypeScript 解析栈可以显著降低迁移风险

等服务版本稳定后，再根据真实指标评估是否值得做 Rust 二期重写。
