# 離線密碼偵探（Code Detective）

可離線遊玩的單機猜顏色密碼遊戲：電腦隨機設定一組顏色密碼，玩家依每次猜測得到的「● 命中」「○ 接近」回饋推理出密碼。結束後的「推理回顧」列出每一步還剩幾種可能。規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。

- 純靜態網站，不需後端、不需安裝任何 npm 套件（只用 Node.js 內建模組）。
- 需要 Node.js 16.17 以上（用於建置、測試與本機伺服器）。
- 玩法屬於公眾熟知的猜碼遊戲類型；「Mastermind」為他人的註冊商標，本遊戲不使用其名稱與外觀。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發模式，提供 `src/`，**不啟用** Service Worker。網址 `http://localhost:5173/` |
| `npm run build` | 建置到 `dist/`，並在 `sw.js` 寫入版本號、版本標籤與預先快取清單 |
| `npm run preview` | 建置並以 `dist/` 啟動，**啟用** Service Worker，用於驗證離線功能 |
| `npm run preview:https` | 同上但使用 HTTPS（mkcert 憑證），供手機透過區網測試（選用） |
| `npm test` | 單元測試：回饋計算、密碼列舉、候選篩選、參考策略、遊戲規則 |
| `npm run check:puzzles` | 次數上限驗證：參考策略的最差猜測次數 ≤ 上限 − 2（簡單、中等完整展開；困難、專家模擬 2,000 局），並檢查連續出題不重複 |
| `npm run icons` | 重新產生 `src/icons/` 圖示 |

## 專案結構

```
src/
  index.html, css/style.css, manifest.webmanifest, icons/
  sw.js                 Service Worker 樣板（版本與資源清單由 build 填入）
  js/app.js             畫面、猜測紀錄與輸入列、調色盤、提示與筆記、推理回顧、計時、離線狀態
  js/game.js            遊戲規則（純邏輯）：輸入列編輯、送出與回饋、不合理猜測、提示、復原、存檔驗證
  js/storage.js         本機儲存（存檔、統計、設定、最近 50 局的密碼）
  js/worker.js          推理回顧 Web Worker（完整列舉計算每次猜測後的剩餘數）
  js/codebreaker/       core（難度、回饋計算、列舉與出題）、strategy（參考策略，只用於驗收）
scripts/                build、serve、check-puzzles、make-icons
tests/                  node:test 單元測試
```

## 部署（GitHub Pages）

本遊戲隨遊戲大廳一起部署，網址：<https://matishsiao.github.io/game-portal-fly/codebreaker/>。推送到 `game-portal-fly` 的 `main` 後，由專案根目錄的 workflow 自動測試、組合並部署；本目錄不另設 GitHub Actions。「出發前檢查」由遊戲大廳統一提供。

## 選用：手機透過區網測試 HTTPS

Service Worker 只在 HTTPS 或 `localhost` 下運作，手機用區網 IP 連到開發機時必須使用 HTTPS。

1. 安裝 mkcert（macOS：`brew install mkcert`），執行一次 `mkcert -install`。
2. `npm run preview:https`。首次執行會產生涵蓋 localhost 與本機區網 IP 的憑證（存在 `.certs/`，已被 git 忽略）；之後重用，過期或 IP 改變時自動重新產生。
3. 在手機安裝並信任 mkcert 的根 CA（路徑會顯示在啟動訊息，即 `mkcert -CAROOT` 下的 `rootCA.pem`）：
   - **iOS**：把 `rootCA.pem` 傳到手機（AirDrop 或郵件）→ 安裝描述檔 → 再到「設定 → 一般 → 關於本機 → 憑證信任設定」開啟該 CA 的**完整信任**。
   - **Android**：「設定 → 安全性 → 加密與憑證 → 安裝憑證 → CA 憑證」（各廠牌路徑可能不同）。
4. 用啟動訊息中的區網網址開啟。

**請勿**把 `.certs/` 或 mkcert 的 `rootCA-key.pem` 提交到版本控制或分享給他人。
