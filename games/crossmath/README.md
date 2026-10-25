# 離線數學填字（Crossmath）

可離線遊玩的單機數學填字 PWA：橫向與直向的算式交叉組成盤面，從數字庫選數字填入空格，使所有算式同時成立（先乘除、後加減）。規格見 [cm_spec.md](cm_spec.md)。

- 純靜態網站，不需後端、不需安裝任何 npm 套件（只用 Node.js 內建模組）。
- 需要 Node.js 16.17 以上（用於建置、測試與本機伺服器）。
- 建置、伺服器、Service Worker 與本機儲存架構沿用 sudoku-fly 專案。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發模式，提供 `src/`，**不啟用** Service Worker（避免載入舊程式碼）。網址 `http://localhost:5173/` |
| `npm run build` | 建置到 `dist/`，並在 `sw.js` 寫入版本號與預先快取清單 |
| `npm run preview` | 建置並以 `dist/` 啟動，**啟用** Service Worker，用於在電腦上驗證離線功能 |
| `npm run preview:https` | 同上但使用 HTTPS（mkcert 憑證），供手機透過區網測試（選用） |
| `npm test` | 單元測試：算式計算、骨架解析、解題器、難度判定、出題器、遊戲規則 |
| `npm run check:puzzles` | 驗收：每個難度產生 100 題，檢查排版、數值限制、運算子、唯一解、技巧等級與出題時間 |
| `npm run icons` | 重新產生 `src/icons/` 圖示 |

## 專案結構

```
src/
  index.html, css/style.css, manifest.webmanifest, icons/
  sw.js                 Service Worker 樣板（版本與資源清單由 build 填入）
  js/app.js             畫面、盤面與數字庫、操作、計時、出題排程、離線狀態
  js/game.js            遊戲規則（純邏輯，可單元測試）：填入／替換、數字庫、筆記、提示、復原
  js/storage.js         本機儲存（存檔、統計、設定、預先產生的題目）
  js/worker.js          出題 Web Worker
  js/crossmath/         core（算式計算、骨架解析、驗證）、solver（列舉／唯一解）、
                        logic（技巧解題與難度）、generator（出題）
scripts/                build、serve、check-puzzles、make-icons
tests/                  node:test 單元測試（fixtures.mjs 為共用的小盤面）
```

題目資料格式：`size`（7／9／11）、`layout`（長度 size² 的字串：`.` 空白、`#` 數字格、`+ - x /` 運算子、`=` 等號）、`givens`（題目數值，0 為空格）、`solution`（完整解答）。數字庫由解答與空格推算，不另存。

## 部署（GitHub Pages）

本遊戲隨遊戲大廳一起部署，網址：<https://matishsiao.github.io/game-portal-fly/crossmath/>

推送到 `game-portal-fly` 的 `main` 後，專案根目錄的 `.github/workflows/pages.yml` 會自動測試、組合並部署到 GitHub Pages，HTTPS 憑證由 GitHub 自動提供與續期。本目錄不另設 GitHub Actions；部署細節見根目錄的 `README.md` 與 `games/spec.md`。

## 出發前檢查

1. 用手機開啟正式網址，**加入主畫面**（iPhone：Safari「分享 → 加入主畫面」；Android：Chrome 選單「安裝應用程式」）。
2. 從**主畫面圖示**開啟，確認首頁顯示「✓ 已可離線使用」。
3. 開啟**飛航模式**並將手機**重新開機**，再開啟 App：繼續原局、四種難度都能開始新局。
4. iPhone 注意：主畫面 App 與 Safari 的進度、統計互不相通，請以主畫面 App 為主。

## 選用：手機透過區網測試 HTTPS

Service Worker 只在 HTTPS 或 `localhost` 下運作，手機用區網 IP 連到開發機時必須使用 HTTPS。

1. 安裝 mkcert（macOS：`brew install mkcert`），執行一次 `mkcert -install`。
2. `npm run preview:https`。首次執行會產生涵蓋 localhost 與本機區網 IP 的憑證（存在 `.certs/`，已被 git 忽略）；之後重用，過期或 IP 改變時自動重新產生。
3. 在手機安裝並信任 mkcert 的根 CA（路徑會顯示在啟動訊息，即 `mkcert -CAROOT` 下的 `rootCA.pem`）：
   - **iOS**：把 `rootCA.pem` 傳到手機（AirDrop 或郵件）→ 安裝描述檔 → 再到「設定 → 一般 → 關於本機 → 憑證信任設定」開啟該 CA 的**完整信任**。
   - **Android**：「設定 → 安全性 → 加密與憑證 → 安裝憑證 → CA 憑證」（各廠牌路徑可能不同）。
4. 用啟動訊息中的區網網址開啟。

**請勿**把 `.certs/` 或 mkcert 的 `rootCA-key.pem` 提交到版本控制或分享給他人。
