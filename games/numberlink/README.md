# 離線數字連線（Numberlink）

可離線遊玩的單機數字連線 PWA：把相同數字（相同顏色）的兩個端點用線連起來，線不能交叉，所有格子都被填滿才算完成。盤面從 4 × 4 到 10 × 10，題目在裝置本機產生且解答唯一。規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。

- 純靜態網站，不需後端、不需安裝任何 npm 套件（只用 Node.js 內建模組）。
- 需要 Node.js 16.17 以上（用於建置、測試與本機伺服器）。
- 建置、伺服器、Service Worker、本機儲存與外觀沿用 crossmath 的做法。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發模式，提供 `src/`，**不啟用** Service Worker（避免載入舊程式碼）。網址 `http://localhost:5173/` |
| `npm run build` | 建置到 `dist/`，並在 `sw.js` 寫入版本號、版本標籤與預先快取清單 |
| `npm run preview` | 建置並以 `dist/` 啟動，**啟用** Service Worker，用於在電腦上驗證離線功能 |
| `npm run preview:https` | 同上但使用 HTTPS（mkcert 憑證），供手機透過區網測試（選用） |
| `npm test` | 單元測試：盤面工具、完整解題器（與暴力搜尋比對）、難度判定、出題器、遊戲規則 |
| `npm run check:puzzles` | 驗收：每個難度產生 100 題，檢查盤面大小、端點對數、路徑長度、唯一解、技巧等級與出題時間 |
| `npm run icons` | 重新產生 `src/icons/` 圖示 |

## 專案結構

```
src/
  index.html, css/style.css, manifest.webmanifest, icons/
  sw.js                 Service Worker 樣板（版本與資源清單由 build 填入）
  js/app.js             畫面、盤面繪製、畫線操作（點選、拖曳、鍵盤）、計時、出題排程、離線狀態
  js/game.js            遊戲規則（純邏輯，可單元測試）：畫線階段、截斷與恢復、清除、提示、復原
  js/storage.js         本機儲存（存檔、統計、設定、預先產生的題目）
  js/worker.js          出題 Web Worker
  js/numberlink/        core（相鄰、路徑與題目驗證）、solver（盤面狀態與回溯解題）、
                        logic（技巧解題與難度）、generator（出題）
scripts/                build、serve、check-puzzles、make-icons
tests/                  node:test 單元測試（fixtures.mjs 為共用的 4 × 4 盤面）
```

題目資料格式：`size`（4～10）、`ends`（每對端點的格子索引 `[a, b]`，索引為編號 − 1）、`solution`（每對端點由 a 走到 b 的格子序列）。格子索引為「列 × size ＋ 行」。存檔另含 `paths`（玩家每條線的格子序列，從端點開始）、`hinted`、`strokes`（筆數）。

## 部署（GitHub Pages）

本遊戲隨遊戲大廳一起部署，網址：<https://matishsiao.github.io/game-portal-fly/numberlink/>

推送到 `game-portal-fly` 的 `main` 後，專案根目錄的 `.github/workflows/pages.yml` 會自動測試、組合並部署到 GitHub Pages。本目錄不另設 GitHub Actions；部署細節見根目錄的 `README.md` 與 `games/spec.md`。「出發前檢查」由遊戲大廳統一提供。

## 選用：手機透過區網測試 HTTPS

Service Worker 只在 HTTPS 或 `localhost` 下運作，手機用區網 IP 連到開發機時必須使用 HTTPS。

1. 安裝 mkcert（macOS：`brew install mkcert`），執行一次 `mkcert -install`。
2. `npm run preview:https`。首次執行會產生涵蓋 localhost 與本機區網 IP 的憑證（存在 `.certs/`，已被 git 忽略）；之後重用，過期或 IP 改變時自動重新產生。
3. 在手機安裝並信任 mkcert 的根 CA（路徑會顯示在啟動訊息，即 `mkcert -CAROOT` 下的 `rootCA.pem`）：
   - **iOS**：把 `rootCA.pem` 傳到手機（AirDrop 或郵件）→ 安裝描述檔 → 再到「設定 → 一般 → 關於本機 → 憑證信任設定」開啟該 CA 的**完整信任**。
   - **Android**：「設定 → 安全性 → 加密與憑證 → 安裝憑證 → CA 憑證」（各廠牌路徑可能不同）。
4. 用啟動訊息中的區網網址開啟。

**請勿**把 `.certs/` 或 mkcert 的 `rootCA-key.pem` 提交到版本控制或分享給他人。
