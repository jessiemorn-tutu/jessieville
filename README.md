# Jessieville

fantasticjs.com 的獨立網站版本。以 Astro 產生靜態 HTML，文章使用 Markdown，頁面、字體、配色和布局可直接修改。無需 WordPress，也不需要購買主題。

## 已包含

- 22 篇公開文章、About 和 Contact，保留原有日期及文章網址。
- 極簡雜誌風首頁、文章存檔、三個主題分類與標題／摘要／標籤搜尋。
- 中英文閱讀排版、文章目錄、閱讀進度、前後篇導航。
- 本地圖片、2 個 PDF、1 個 Word 附件、3 段原站影片；4 條歷史留言唯讀保留。
- 原有分類、標籤及作者存檔路徑；RSS、sitemap、404 頁面。
- GitHub Actions 部署流程，可用 GitHub 網址預覽後再綁定 fantasticjs.com。

## 本機執行

安裝 Node.js 24 LTS（最低 22.12），然後在這個資料夾開啟終端機：

```sh
npm install -g pnpm@11.25.0
pnpm install
pnpm dev
```

打開終端機顯示的 Local 網址。編輯並儲存後通常會自動更新。

產生正式網站並檢查：

```sh
pnpm build
pnpm verify
pnpm preview
```

`dist/` 是產生的網站，不要直接修改它。源碼在 `src/`。

## 放到 GitHub Pages

1. 在 GitHub 建立一個空的公開倉庫，例如 `jessieville`。倉庫名稱也可以用 `<你的帳號>.github.io`。
2. 把**本資料夾的內容**放在倉庫根目錄，包含 `.github/workflows/deploy.yml`、`.gitignore`、`pnpm-lock.yaml`。不要上傳 `node_modules/` 或 `dist/`。用 Git 或 GitHub Desktop 較方便，因為有圖片及影片檔案。
3. 主要分支使用 `main`。如果使用其他分支，同步修改工作流程內的 `branches: [main]`。
4. 到倉庫的 **Settings → Pages → Build and deployment → Source**，選 **GitHub Actions**。
5. 推送到 `main`，或到 **Actions → Deploy Jessieville to GitHub Pages → Run workflow** 執行第一次部署。
6. 成功後，Pages 設定或 Actions 會顯示你的網站網址。

流程會讀取 Pages 的實際網址，自動處理 `https://帳號.github.io/倉庫名/` 的路徑；不需要先修改程式裡的 GitHub 帳號。

如果你習慣用終端機，在建立空倉庫後執行下列命令（將遠端地址換成自己的）：

```sh
git init -b main
git add .
git commit -m "Build independent Jessieville website"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

網站倉庫：[jessiemorn-tutu/jessieville](https://github.com/jessiemorn-tutu/jessieville)。自訂域名的 DNS 切換需在 GitHub Pages 驗收後另行完成。

## 切換 fantasticjs.com

先在 GitHub 網址完成驗收，再進行域名切換：

1. 到 Pages 設定填入 Custom domain：`fantasticjs.com`，依 GitHub 官方文件完成網域驗證和 DNS 設定。DNS 的具體值請以當下官方文件為準。
2. 在 GitHub 倉庫 **Settings → Secrets and variables → Actions → Variables**，新增 `SITE_URL`，值為 `https://fantasticjs.com`。這不是密鑰。
3. 新增 `public/CNAME`，內容只有 `fantasticjs.com` 一行，重新部署。
4. 確認 DNS 生效、HTTPS 可以使用，再在 Pages 啟用 **Enforce HTTPS**。
5. 檢查首頁、文章、圖片、影片和下載附件。文章保留 `/年/月/日/原始slug/`，所以網域切換後原有文章連結可繼續使用。

域名可以繼續放在目前的註冊商，網站託管搬到 GitHub 不要求轉移域名註冊。確認新版穩定後，再處理不需要的舊託管服務；保留域名的正常續費。

官方文件：[Astro → GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)、[GitHub Pages 自訂域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)。

## 寫一篇新文章

在 `src/content/posts/` 新增檔案，例如 `2026-10-20-my-notes.md`：

```md
---
title: "一篇新的讀書筆記"
permalink: "/2026/10/20/my-new-notes/"
date: "2026-10-20T10:00:00-07:00"
description: "用一兩句話介紹這篇文章。"
categories: ["Books"]
tags: ["reading", "讀書筆記"]
group: "books"
cover: "/media/my-book.jpg"
readingMinutes: 5
draft: false
---

文章從這裡開始。

## 第一個想法

這是一般段落。可以使用 **粗體**、*斜體*、清單和圖片。

![圖片說明](/media/my-book.jpg)
```

- 把圖片放到 `public/media/`。`cover` 可省略；省略時以文字呈現最新文章。
- `group` 選 `books`（讀書筆記）、`screen`（影劇評論）或 `life`（生活與旅行）。`categories` 和 `tags` 可以自己新增。
- 設定 `draft: true` 會排除這篇文章。草稿源碼仍會存在於倉庫，公開倉庫中的源碼可被讀取。
- `permalink` 必須唯一，並以 `/` 開頭、結尾。已發布文章的路徑保持穩定，可以延續舊連結。
- `readingMinutes` 是顯示的預估閱讀分鐘數；遷移文章已按字數估算，新文章可自行設定。
- 儲存、預覽、推送到 GitHub 後即可自動部署，不需要在 WordPress 另外發文。

## 修改設計

| 想改的部分 | 檔案 |
| --- | --- |
| 配色、字體、留白、手機布局 | `src/styles/global.css`；檔案開頭是配色與字體變數 |
| 首頁布局和文字 | `src/pages/index.astro` |
| 頂部導航、頁尾、分享資訊 | `src/layouts/Base.astro` |
| 網站名稱、連結、分類顯示名稱 | `src/lib/site.ts` |
| 文章閱讀頁、目錄和前後篇 | `src/pages/[...path].astro` |
| 文章存檔、搜尋、篩選 | `src/pages/archive.astro` |
| About / Contact 內容 | `src/content/pages/1.md`、`src/content/pages/1063.md` |

## 遷移範圍與核對

此次使用 WordPress 公開 API，沒有登入你的帳戶。公開正文與原有頁面逐一比對通過，24 個原始頁面路徑、整站本地連結及 RSS 已驗證；也測試了 GitHub 倉庫子路徑。

- `migration/url-map.json`：舊網址與新路徑。
- `migration/assets.json`：圖片、附件及影片的來源與保存結果。
- `migration/comments.json`：原站公開留言。
- `migration/content-audit.json`：初次遷移時用來核對文字的記錄。
- `migration/embeds.json`：保留的兩處 YouTube 外部嵌入。

`pnpm verify` 檢查連結、原始路徑和 RSS，可在後續修改文章後持續使用。若需要重做**初次遷移的文字比對**，執行 `node scripts/verify.mjs --migration-audit`；你之後主動修改舊文，這項比對自然會顯示差異，不影響一般部署驗證。

可重用的 `scripts/import-wordpress.mjs` 能重新抓取公開內容，但會拒絕覆寫既有 Markdown。只有在備份你自己的編輯、確定要重做匯入時，才使用 `--replace`。

### 需要另行處理的功能

- WordPress 的電子郵件訂閱者、後台草稿、私密文章及統計資料不在此次公開匯入範圍。
- 新版 RSS 為 `/feed/index.xml`，原先使用 WordPress RSS 地址的讀者需要更新訂閱網址。
- 歷史留言保留為唯讀；新增留言及電子郵件訂閱目前沒有接後端服務。
- YouTube 影片仍由 YouTube 提供；3 段原站 VideoPress 影片已保存為本地 MP4。

### 本次預覽驗證

正式靜態網站已在瀏覽器測試桌面與 390px 手機布局、分類／搜尋／空結果／重設、文章目錄和 GitHub 子路徑。當前執行環境的 Astro 開發伺服器未完成啟動，因此本次使用正式 build 的靜態伺服器做瀏覽器驗收；熱更新未驗證。

內容來源：[fantasticjs.com](https://fantasticjs.com/)。本次導入日期：2026-10-14。
