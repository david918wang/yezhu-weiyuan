# 🏠 智慧家园 · 小区业委会小程序

**微信端可用的业委会管理工具** — 公告发布、选举投票、集资诉讼、信息发布、业主留言板

## 在线体验
👉 [部署后这里填你的网址]（等你搞定了告诉我）

## 功能

| 功能 | 说明 |
|------|------|
| 📢 公告发布 | 管理员发布/置顶/删除公告，标记重要通知 |
| 🗳️ 选举投票 | 发起投票、在线投票、实时计票、自动截止 |
| 💰 集资诉讼 | 发起集资、在线捐款、进度追踪、大额提醒 |
| 📰 信息发布 | 分类发布小区实用信息，浏览量统计 |
| 💬 业主留言板 | 自由留言、管理员回复 |

## 快速部署

### 方案一：Vercel 一键部署（推荐）

1. **Fork/克隆** 本仓库到你的 GitHub
2. 打开 [Vercel](https://vercel.com) → 点击 **New Project**
3. 导入本仓库 → 点击 **Deploy**
4. 部署完成即获得公开网址 ✅

### 方案二：Cloudflare Pages

1. Fork 本仓库
2. 打开 [Cloudflare Pages](https://pages.cloudflare.com) → Create a Project
3. 连接 GitHub 仓库 → 构建配置选 **None**（纯静态）
4. Deploy

### 方案三：本地运行

```bash
cd yezhuweiyuan-app
npm install
node server.js
# 访问 http://localhost:8080
```

## 配置云存储（可选，但推荐）

部署后所有用户需要共享同一份数据，建议配置 Supabase 云存储：

1. 注册 [Supabase](https://supabase.com)（免费，无需绑卡）
2. 创建新项目 → 记下 Project URL 和 anon key
3. 打开 SQL Editor → 运行以下 SQL 创建数据表：

```sql
-- 创建公告表
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  important BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  "createdAt" BIGINT
);

-- 创建投票表
CREATE TABLE elections (
  id TEXT PRIMARY KEY,
  title TEXT,
  desc TEXT,
  candidates JSONB DEFAULT '[]',
  "startDate" BIGINT,
  "endDate" BIGINT,
  status TEXT DEFAULT 'active',
  "createdAt" BIGINT
);

-- 创建集资表
CREATE TABLE fundraisings (
  id TEXT PRIMARY KEY,
  title TEXT,
  desc TEXT,
  target NUMERIC,
  current NUMERIC DEFAULT 0,
  donors JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  "createdAt" BIGINT
);

-- 创建信息表
CREATE TABLE infos (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  category TEXT,
  author TEXT,
  "createdAt" BIGINT,
  views INTEGER DEFAULT 0
);

-- 创建留言表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  author TEXT,
  content TEXT,
  replies JSONB DEFAULT '[]',
  "createdAt" BIGINT
);
```

4. 登录小程序管理后台 → 右上角 **☁️云** → 填入 URL 和 Key → 保存

## 配置飞书/微信群通知

1. 在飞书群或企业微信群添加 **群机器人**
2. 复制机器人的 Webhook URL
3. 登录小程序管理后台 → 右上角 **📨飞书** → 填入 URL → 保存
4. 点击 **测试发送** 验证

## 管理密码

- 默认密码：`123456`
- 登录后可在右上角 **🔐改密** 修改

## 技术栈

- 纯前端 HTML/CSS/JS
- 支持 localStorage 本地存储
- 可选 Supabase 云数据库
- 支持飞书/企业微信机器人通知
- 移动优先设计
