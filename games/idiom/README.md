# 離線成語填字

可離線遊玩的單機成語填字 PWA：從字庫選字填入空格完成成語，每完成一個成語都能看到成語卡（注音、釋義、例句）。初級、中級逐題作答，高級、專家為交叉填字盤。規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。

詞庫取自**中華民國教育部（Ministry of Education, R.O.C.）《成語典》**（版本編號：2020_20260929，<https://dict.idioms.moe.edu.tw/>），授權條款為[創用CC 姓名標示-禁止改作 3.0 臺灣](https://creativecommons.org/licenses/by-nd/3.0/tw/legalcode)。遊戲中顯示的《成語典》內容皆為原文，未經修改；公眾授權使用說明保留在 `data/moe/`，並隨網站散布（`moe/idiomsdict_10409.pdf`、`.odt`）。

- 純靜態網站，不需後端、不需安裝任何 npm 套件（只用 Node.js 內建模組，xlsx 也以內建模組讀取）。
- 需要 Node.js 16.17 以上。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發模式，提供 `src/`，**不啟用** Service Worker。網址 `http://localhost:5173/` |
| `npm run build` | 建置到 `dist/`（含教育部使用說明），並在 `sw.js` 寫入版本號、版本標籤與預先快取清單 |
| `npm run preview` | 建置並以 `dist/` 啟動，**啟用** Service Worker，用於驗證離線功能 |
| `npm test` | 單元測試：詞庫驗證（與教育部原始資料逐字比對）、解題器、出題器、釋義遮蔽、遊戲規則 |
| `npm run check:puzzles` | 驗收：初級、中級各 200 題，高級、專家各 100 盤，檢查一題多解、不需猜測、排版與數量 |
| `npm run import` | 從 `data/moe/` 的教育部下載檔重新產生 `src/data/` 的遊戲資料 |
| `npm run icons` | 重新產生 `src/icons/` 圖示 |

## 詞庫

```
data/moe/dict_idioms_<版本>.zip   教育部原始下載檔（原樣保存，匯入時直接讀取其中的 xlsx）
data/moe/idiomsdict_10409.pdf     《成語典》公眾授權使用說明（須完整保留並隨網站散布）
data/moe/idiomsdict_10409.odt
data/levels.txt                   常見度分級（本專案整理，[1] 常見、[3] 進階，其餘一般）
src/data/idioms.json              遊戲可用成語（id、成語、注音、釋義、例句群組；皆為原文）
src/data/idiom-check.json         檢查用成語表（下載檔中的全部成語，用來避免一題多解）
src/data/idiom-levels.json        常見度與易混淆字（由 levels.txt 與「辨識-形音辨誤」欄位產生）
src/data/source.json              資料來源、版本與授權資訊
```

更新詞庫版本：

1. 到[教育部國語辭典公眾授權網](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html)確認最新的授權條款、使用說明與版本編號。
2. 下載新的 `dict_idioms_<版本>.zip` 放到 `data/moe/`（使用說明有新版時一併更新）。
3. `npm run import`，再 `npm test`：詞庫驗證會逐字比對遊戲資料與原始檔，並檢查上架數量。
4. 新版本中消失的成語 id，玩家的存檔會依「資料損毀」處理，成語本中會略過。

**禁止改作**：不得手動修改 `src/data/idioms.json` 的任何文字。發現原始內容錯誤時，把該條目排除並回報教育部。常見度分級（`data/levels.txt`）是本專案自己的資料，可以修改，目前為初稿、尚待人工確認。

## 專案結構

```
src/
  index.html, css/style.css, manifest.webmanifest, icons/, data/
  sw.js                 Service Worker 樣板（版本與資源清單由 build 填入）
  js/app.js             畫面、盤面與字庫、成語卡、成語本、資料來源、計時、出題排程、離線狀態
  js/game.js            遊戲規則（純邏輯）：填字、替換、清除、復原、提示、作答結果、存檔驗證
  js/storage.js         本機儲存（存檔、統計、成語本、設定、預先產生的題目）
  js/worker.js          出題 Web Worker（自行載入詞庫）
  js/idiom/             data（詞庫索引）、board（盤面結構）、solver（邏輯推導與唯一解）、
                        generator（逐題與交叉盤出題）、mask（作答時的釋義遮蔽範圍）
scripts/                xlsx（ZIP／xlsx 讀取）、moe-source（原始資料解析）、import-moe、build、serve、
                        check-puzzles、make-icons
tests/                  node:test 單元測試
```

## 部署（GitHub Pages）

本遊戲隨遊戲大廳一起部署，網址：<https://matishsiao.github.io/game-portal-fly/idiom/>。推送到 `game-portal-fly` 的 `main` 後，由專案根目錄的 workflow 自動測試、組合並部署；本目錄不另設 GitHub Actions。「出發前檢查」由遊戲大廳統一提供。
## 選用：手機透過區網測試 HTTPS

Service Worker 只在 HTTPS 或 `localhost` 下運作，手機用區網 IP 連到開發機時必須使用 HTTPS。

1. 安裝 mkcert（macOS：`brew install mkcert`），執行一次 `mkcert -install`。
2. `npm run preview:https`。首次執行會產生涵蓋 localhost 與本機區網 IP 的憑證（存在 `.certs/`，已被 git 忽略）；之後重用，過期或 IP 改變時自動重新產生。
3. 在手機安裝並信任 mkcert 的根 CA（路徑會顯示在啟動訊息，即 `mkcert -CAROOT` 下的 `rootCA.pem`）：
   - **iOS**：把 `rootCA.pem` 傳到手機（AirDrop 或郵件）→ 安裝描述檔 → 再到「設定 → 一般 → 關於本機 → 憑證信任設定」開啟該 CA 的**完整信任**。
   - **Android**：「設定 → 安全性 → 加密與憑證 → 安裝憑證 → CA 憑證」（各廠牌路徑可能不同）。
4. 用啟動訊息中的區網網址開啟。

**請勿**把 `.certs/` 或 mkcert 的 `rootCA-key.pem` 提交到版本控制或分享給他人。
