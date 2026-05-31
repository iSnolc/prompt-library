# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Cloudflare 全栈服务的**提示词库管理系统**：
- **前端**：静态 HTML + 原生 JavaScript（index.html），无框架依赖
- **后端**：Cloudflare Workers 函数（functions/api/prompts.js）
- **存储**：Cloudflare KV（键值存储）
- **部署**：Cloudflare Pages + Workers

## 架构与文件结构

```
index.html              # 前端应用入口，包含 UI 和所有 JavaScript 逻辑
functions/
  └── api/
      └── prompts.js    # Workers 函数，处理 GET（获取）/ POST（保存）请求
wrangler.toml          # Cloudflare 项目配置
```

## 核心概念

### Cloudflare KV
所有提示词数据存储在 KV 中，键为 `all_prompts`，值为 JSON 字符串。POST 请求直接覆写整个数据集（原子操作）。

### 前端架构
- **单文件应用**：HTML + 内联 CSS + 内联 JavaScript
- **数据流**：初始化时 `promptsData` 数组硬编码，后期应通过 API 动态加载
- **交互**：标签过滤、搜索、卡片展示、复制、详情弹窗

### 后端 API
- `GET /api/prompts`：返回所有提示词（JSON）
- `POST /api/prompts`：保存提示词（请求体为 JSON）
- CORS 支持所有来源

## 开发命令

```bash
# 安装依赖
pnpm install

# 本地开发（Hot reload）
pnpm wrangler dev

# 部署到 Cloudflare
pnpm wrangler deploy

# 发布到 Pages + Workers（需配置 wrangler.toml）
pnpm wrangler deploy --env production
```

## 待实现功能

根据用户需求，以下功能需要开发：

1. **访问密码保护**
   - 前端：登录页面 + 密码校验（可用 localStorage 存储 token）
   - 后端：API 需要验证请求中的密码或 token
   - 建议：在 wrangler.toml 中配置 `PROMPT_PASSWORD` 环境变量

2. **数据持久化到 GitHub**
   - 在 KV 中维护提示词后，通过 Workers 定时同步到 GitHub（或手动触发）
   - 需要：GitHub API token、仓库信息（owner/repo/branch）
   - 考虑：git commit 消息格式与 GitHub 工作流集成

3. **前端动态加载数据**
   - 替换硬编码的 `promptsData`，改为 `fetch('/api/prompts')`
   - 处理 API 加载状态、错误处理

4. **管理界面**
   - 增删改查提示词的 UI 页面
   - 权限管理（仅授权用户可编辑）

## 关键配置

### wrangler.toml
```toml
name = "prompt-library"
type = "javascript"
compatibility_date = "2024-01-01"

# KV binding（需要在 Cloudflare 控制面板创建 KV 命名空间）
[[kv_namespaces]]
binding = "PROMPTS_KV"
id = "your-kv-id"
preview_id = "your-preview-kv-id"

# 环境变量
[env.production]
vars = { PROMPT_PASSWORD = "your-password" }
```

## 数据结构

```javascript
// 单个提示词对象
{
  id: number,           // 唯一标识
  title: string,        # 提示词名称
  tags: string[],       # 分类标签数组
  preview: string,      # 首页卡片显示的摘要（3 行截断）
  content: string       # 完整提示词内容
}

// KV 存储格式
all_prompts: JSON.stringify([...prompts])
```

## 本地开发流程

1. 修改 index.html（前端）或 functions/api/prompts.js（后端）
2. 运行 `pnpm wrangler dev`，本地服务运行在 `http://localhost:8787`
3. 修改代码自动热更新
4. 测试 API：`curl http://localhost:8787/api/prompts`
5. 提交后用 `pnpm wrangler deploy` 发布

## 注意事项

- **KV 数据限制**：单个值最大 25 MB，当前硬编码数据很小，但规模扩大时需考虑分页或分片存储
- **CORS**：当前允许所有来源访问，生产环境建议限制到特定域名
- **密码安全**：不应在客户端存储密码，API 应使用 token/session 认证
- **GitHub 同步**：需要额外的 Cloudflare Worker 来定时或手动触发同步任务
