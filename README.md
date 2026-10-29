# Cloudflare Worker & Hono 專案部署與開發指南

本專案基於 **Node.js**、**Hono 框架** 與 **Cloudflare Workers** 構建，提供了安全的 API 服務、設備 UUID 驗證、RSA-OAEP 非對稱加密以及 D1 資料庫操作。

---

## 📋 目錄
1. [環境準備與下載](#1-環境準備與下載)
2. [專案配置 (Wrangler & D1)](#2-專案配置-wrangler--d1)
3. [程式碼編制與本地開發](#3-程式碼編制與本地開發)
4. [發布部署至 Cloudflare](#4-發布部署至-cloudflare)
5. [啟動與運行驗證](#5-啟動與運行驗證)

---

## 1. 環境準備與下載

### 前置需求
* **Node.js**: `v18.0.0` 或以上版本
* **npm** / **pnpm** 包管理器
* **git**
* **Cloudflare 帳號**（需開啟 Cloudflare Workers 與 D1 功能）

### 下載與安裝依賴

1. 克隆/下載專案程式碼至本地：
   ```bash
   git clone https://github.com/morte6210-setupxderlinux/-Virtual_BT_server.git
   cd ./-Virtual_BT_server
   ```

2. 安裝專案所需的依賴套件：
   ```bash
   npm install
   ```

---

## 2. 專案配置 (Wrangler & D1)

### 2.1 登入 Cloudflare 帳號
使用 Cloudflare CLI 工具 `wrangler` 進行身分驗證：
```bash
npx wrangler login
```

### 2.2 配置 `wrangler.toml`
確保專案根目錄下的 `wrangler.toml` 包含正確的配置與 D1 資料庫綁定：

```toml
name = "cf-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 資料庫綁定 (請更換為你的 d1 database_id)
[[d1_databases]]
binding = "DB"
database_name = "device_db"
database_id = "your-d1-database-id-here"
```

### 2.3 初始化 D1 資料庫結構
如果尚未建立資料庫表格，請執行以下 SQL 初始化設定：

```bash
# 本地開發資料庫初始化
npx wrangler d1 execute device_db --local --command="
CREATE TABLE IF NOT EXISTS device_rate_limits (
  device_id TEXT PRIMARY KEY,
  request_count INTEGER,
  window_start INTEGER,
  blocked_until INTEGER
);
CREATE TABLE IF NOT EXISTS request_nonces (
  nonce TEXT PRIMARY KEY,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS ip_rate_limits (
  ip TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  blocked_until INTEGER DEFAULT 0
);
"
```

---

## 3. 程式碼編制與本地開發

### 3.1 生成 Cloudflare 綁定型態 (TypeScript)
當修改了 `wrangler.toml` 中的綁定（如 D1、KV 等）後，執行以下命令自動生成型態定義：

```bash
npm run cf-typegen
```

在 TypeScript 程式碼中（例如 `src/index.ts`），帶入泛型綁定：

```typescript
import { Hono } from 'hono'

// 使用自動生成的 CloudflareBindings
const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => c.text('Cloudflare Worker API Running!'))

export default app
```

### 3.2 啟動本地開發伺服器
執行以下命令啟動本地模擬環境（支援 D1 本地資料庫與熱重載）：

```bash
npm run dev
```
預設服務會啟動於 `http://localhost:8787`。

---

## 4. 發布部署至 Cloudflare

當本地測試完成後，可以將 Worker 與資料庫部署至 Cloudflare 生態系。

### 4.1 初始化線上 D1 資料庫
第一次部署前，確保線上 D1 資料庫已建立好相應表格：

```bash
npx wrangler d1 execute device_db --remote --command="
CREATE TABLE IF NOT EXISTS device_rate_limits (
  device_id TEXT PRIMARY KEY,
  request_count INTEGER,
  window_start INTEGER,
  blocked_until INTEGER
);
CREATE TABLE IF NOT EXISTS request_nonces (
  nonce TEXT PRIMARY KEY,
  created_at INTEGER
);
"
```

### 4.2 發布 Worker
執行部署指令，將程式碼編譯並上傳至 Cloudflare：

```bash
npm run deploy
```

部署成功後，Terminal 會顯示線上存取的 URL（例如：`https://cf-backend.<your-subdomain>.workers.dev`）。

---

## 5. 啟動與運行驗證

### 5.1 測試 API 端點
可使用 `curl` 或 Postman 測試線上 API：

```bash
curl -X POST https://cf-backend.<your-subdomain>.workers.dev/api/auth/payselect \
  -H "Content-Type: application/json" \
  -H "x-device-uuid: test-device-12345" \
  -H "x-request-nonce: nonce-abc123456" \
  -H "x-request-timestamp: 1710000000" \
  -d '{"encrypted": "BASE64_CIPHER_TEXT"}'
```

### 5.2 查看即時日誌 (Live Logs)
在運行期間若需除錯，可即時追蹤線上 Worker 的運行日誌與 `console.log`：

```bash
npx wrangler tail
```