# 架构设计方案

这份文档由 Plan 代理生成，用于指导 Cloudflare 提示词库项目的实现。

## 一、总体架构设计（文字描述）

```
┌─────────────────────────────────────────────────────────────┐
│                     用户访问层                              │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │   前端(HTML/JS)  │          │  密码验证页面    │        │
│  │  分类展示        │          │  Session管理     │        │
│  │  搜索过滤        │          │  本地加密密钥    │        │
│  └────────┬─────────┘          └────────┬─────────┘        │
└───────────┼──────────────────────────────┼─────────────────┘
            │                              │
┌───────────▼──────────────────────────────▼─────────────────┐
│                  Cloudflare Workers 层                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  API 路由层 (functions/api/*)                       │  │
│  │  ├─ /api/prompts (GET/POST/PUT/DELETE)            │  │
│  │  ├─ /api/auth (登录)                               │  │
│  │  ├─ /api/sync (GitHub 同步)                        │  │
│  │  └─ /api/categories (分类管理)                     │  │
│  └─────────┬───────────────────────────────────────────┘  │
│            │                                                 │
│  ┌─────────▼────────────────────────────────────────────┐  │
│  │  业务逻辑层                                            │  │
│  │  ├─ Auth Service (密码验证)                         │  │
│  │  ├─ Prompt Service (增删改查)                       │  │
│  │  ├─ Sync Service (GitHub 同步)                      │  │
│  │  └─ Search Service (搜索/分类)                      │  │
│  └─────────┬───────────────────────────────────────────┘  │
│            │                                                 │
│  ┌─────────▼────────────────────────────────────────────┐  │
│  │  数据层                                               │  │
│  │  ├─ Cloudflare KV (缓存+元数据)                     │  │
│  │  └─ GitHub API (源数据存储)                         │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
            │                              │
┌───────────▼──────────────────────────────▼─────────────────┐
│                  外部数据源                                │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │  GitHub 仓库     │          │ Cloudflare KV    │        │
│  │  存储完整数据    │◄────────►│ 缓存+实时数据    │        │
│  │  版本控制        │          │ 访问密钥         │        │
│  └──────────────────┘          └──────────────────┘        │
└───────────────────────────────────────────────────────────┘
```

## 二、分阶段实现步骤

### P0 阶段：基础认证（1-2 天）
- 配置 wrangler.toml（KV 绑定）
- 实现 AuthService 和 /api/auth 端点
- 前端：密码验证页面 + localStorage

### P1 阶段：数据存储（2-3 天）
- 实现 KVService 和 PromptService
- 完整的 CRUD API 端点
- 前端：列表展示、编辑、搜索、复制功能

### P2 阶段：GitHub 集成（3-4 天）
- GitHubStore 和 SyncManager
- /api/sync 端点
- 前端：同步状态显示、冲突解决 UI

### P3 阶段：优化部署（2-3 天）
- 性能优化：缓存策略、ETag
- 安全加固：速率限制、日志审计
- 完整测试和生产部署

## 三、快速开始检查清单

### 前置准备
- [ ] 确认 Cloudflare 账户和域名已托管
- [ ] 安装 Node.js 和 pnpm
- [ ] 获取 Cloudflare API Token 和 Account ID
- [ ] 准备 GitHub Personal Access Token

### 阶段一：本地开发环境
- [ ] 安装 Wrangler CLI：`pnpm install -g @cloudflare/wrangler`
- [ ] 配置 wrangler.toml
- [ ] 创建项目目录结构
- [ ] 实现 AuthService
- [ ] 测试 /api/auth 端点

### 部署命令
```bash
# 创建 KV 命名空间
wrangler kv:namespace create "PROMPTS_KV" --env=production

# 设置 Secrets
wrangler secret put GITHUB_TOKEN --env=production
wrangler secret put ADMIN_PASSWORD_HASH --env=production

# 本地测试
wrangler dev

# 部署到生产
wrangler publish --env=production
```

## 四、关键设计决策

### 数据存储策略
- KV 作为实时缓存和快速访问
- GitHub 作为主数据源和版本控制
- 双向同步：保证数据一致性

### 安全性
- 密码使用 bcrypt 哈希
- API 使用 JWT Token 认证
- 速率限制：防止暴力破解
- CORS：Cloudflare 默认 HTTPS

### 性能优化
- KV 缓存：减少 GitHub API 调用
- ETag 机制：只在文件变化时拉取
- 分页加载：前端本地索引
- 压缩传输：gzip 压缩响应

## 五、技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML/CSS/JavaScript | 无框架依赖，轻量级 |
| 后端 | Cloudflare Workers | 无需管理服务器 |
| 存储 | Cloudflare KV | 键值对存储，免费 |
| 版本控制 | GitHub API | 提示词源数据存储 |
| 认证 | JWT + bcrypt | 安全的密码和会话管理 |
| 部署 | Wrangler CLI | Cloudflare 官方工具 |

## 六、成本预估（免费额度）

- **Workers**：每天 10 万次请求
- **KV**：1 GB 存储空间
- **GitHub API**：每小时 5000 次请求（认证用户）
- **Pages**：无限静态资源托管

足以支持中小规模使用。