# 離線奧數挑戰（Math Olympiad）

可離線遊玩的國小奧林匹克數學選擇題：每局 10 題，答錯時依序顯示「解題重點」引導小朋友自己想出答案，答對後才顯示詳解。題目來自經獨立審題的固定題庫，以及「換數字就是新題目」的題型模板。屬於學習遊戲，第一次過關、第一次全對可在口袋地城領獎勵禮包。規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。

- 純靜態網站，不需後端、不需安裝任何 npm 套件（只用 Node.js 內建模組）。
- 需要 Node.js 16.17 以上（用於建置、測試與本機伺服器）。
- 題目全部為本專案原創。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發模式，提供 `src/`，**不啟用** Service Worker。網址 `http://localhost:5173/` |
| `npm run build` | 建置到 `dist/`，並在 `sw.js` 寫入版本號、版本標籤與預先快取清單 |
| `npm run preview` | 建置並以 `dist/` 啟動，**啟用** Service Worker，用於驗證離線功能 |
| `npm run preview:https` | 同上但使用 HTTPS（mkcert 憑證），供手機透過區網測試（選用） |
| `npm test` | 單元測試：題庫格式與洩題檢查、題型模板（批次產生並以暴力列舉驗證答案）、作答規則、挑題、儲存與獎勵、休息提醒 |
| `npm run check:puzzles` | 題庫與模板檢查：格式、洩題、各模板批次產生，並列出各難度的題數、題型數與模板數（數量未達上架門檻只警告） |
| `npm run check:release` | 同上，數量未達上架門檻（每個難度固定題 100 題、題型 8 種、模板 4 個）時視為失敗 |
| `npm run icons` | 重新產生 `src/icons/` 圖示 |

## 專案結構

```
src/
  index.html, css/style.css, manifest.webmanifest, icons/
  sw.js                 Service Worker 樣板（版本與資源清單由 build 填入）
  data/questions.json   固定題庫（題目、選項、正解、2 段解題重點、詳解）
  js/app.js             畫面、作答與解題重點、詳解、完成畫面、錯題本、休息提醒、計時、離線狀態
  js/game.js            遊戲規則（純邏輯）：建立一局、作答判定、解題重點、下一題、重開本局、存檔驗證
  js/rest.js            休息提醒（純邏輯）：累計連續遊玩時間
  js/storage.js         本機儲存（存檔、統計、獎勵紀錄、題目紀錄與錯題本、設定）
  js/playlog.js         遊玩歷程與帳號凍結（大廳 src/playlog.js 的逐字複本，不得修改）
  js/olympiad/          templates（題型模板）、bank（題目查詢）、pick（挑題）
scripts/                build、serve、check-bank、make-icons
tests/                  node:test 單元測試
```

## 新增題目

1. 固定題：在 `src/data/questions.json` 加入題目（格式見規格「題庫」），`id` 接續流水號、不得重複使用；在 `tests/answers/<難度>.mjs` 加上以列舉或模擬實際算出正解的函式（無法計算的題目可省略，每個難度至少六成要有）。
2. 題型模板：在 `src/js/olympiad/templates.js` 的 `TEMPLATES` 加入模板，並在 `tests/templates.test.mjs` 的 `SOLVERS` 加上只讀題目文字的獨立解法。
3. 執行 `npm test` 與 `npm run check:puzzles`。
4. 交給出題者以外的審題者（另一個 agent 或另一個人）在不看答案的情況下獨立解題審查，依結果修改後再提交；審題紀錄寫在 commit 訊息中。

## 部署（GitHub Pages）

上架後本遊戲隨遊戲大廳一起部署，網址：<https://matishsiao.github.io/game-portal-fly/olympiad/>。推送到 `game-portal-fly` 的 `main` 後，由專案根目錄的 workflow 自動測試、組合並部署；本目錄不另設 GitHub Actions。「出發前檢查」由遊戲大廳統一提供。

## 選用：手機透過區網測試 HTTPS

Service Worker 只在 HTTPS 或 `localhost` 下運作，手機用區網 IP 連到開發機時必須使用 HTTPS。

1. 安裝 mkcert（macOS：`brew install mkcert`），執行一次 `mkcert -install`。
2. `npm run preview:https`。首次執行會產生涵蓋 localhost 與本機區網 IP 的憑證（存在 `.certs/`，已被 git 忽略）；之後重用，過期或 IP 改變時自動重新產生。
3. 在手機安裝並信任 mkcert 的根 CA（路徑會顯示在啟動訊息，即 `mkcert -CAROOT` 下的 `rootCA.pem`）：
   - **iOS**：把 `rootCA.pem` 傳到手機（AirDrop 或郵件）→ 安裝描述檔 → 再到「設定 → 一般 → 關於本機 → 憑證信任設定」開啟該 CA 的**完整信任**。
   - **Android**：「設定 → 安全性 → 加密與憑證 → 安裝憑證 → CA 憑證」（各廠牌路徑可能不同）。
4. 用啟動訊息中的區網網址開啟。

**請勿**把 `.certs/` 或 mkcert 的 `rootCA-key.pem` 提交到版本控制或分享給他人。
