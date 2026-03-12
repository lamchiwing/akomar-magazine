# AKOMAR Magazine v6（Automation Final）

這是較完整的最終 starter，方向已更迎合 automation。

## 已包括
- 繁體中文為主
- Homepage 改為 automation-heavy 結構
- lead story + article grid
- Automation 層級展示
- 語言加購示範（繁體中文主版本 + 日文 / 韓文 / 簡體中文）
- category pages
- article pages
- cover image + 3 個內文插圖位
- 社交分享按鈕
- Decap CMS `/admin`
- placeholder 圖片
- Cloudflare `_redirects`

## 上載前先改
1. `public/admin/config.yml`
   - 把 `YOUR_GITHUB_USERNAME/akomar-magazine`
   - 改成你的 GitHub repo

2. `src/layouts/BaseLayout.astro`
   - 把 header / footer 的 social links 改成正式帳號

## Cloudflare Pages build settings
- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`

## 建議
- 解壓後再 upload 到 GitHub，不要直接 upload zip
- 之後可再補 GitHub auth / OAuth，讓同事直接從 `/admin` 發文
