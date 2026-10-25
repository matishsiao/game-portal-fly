# Agent 工作守則

本專案是「遊戲飛行（PlayFlight）」：遊戲大廳（根目錄 `src/`）與所有遊戲（`games/<目錄>/`）統一開發，組合後部署到 GitHub Pages。所有回覆、文件、註解與 commit 訊息一律使用**繁體中文**。

## 必讀文件

- 開始任何工作前先讀 `README.md`（專案結構、指令、部署）。
- 修改或新增遊戲前必讀 `games/spec.md`（所有遊戲的共用規格），以及該遊戲的規格（例如 `games/numberlink/spec.md`、`games/crossmath/cm_spec.md`）。
- 修改大廳（`src/portal.js`、`scripts/assemble.mjs`）前，先讀 `games/spec.md` 的「大廳整合介面」與「上架到大廳」。
- 規格與程式不一致時，以規格為準；確定是規格需要修改時，先改規格再改程式，並在同一個 commit 提交。

## 專案結構速覽

```
game-portal/
├── AGENTS.md            本文件
├── README.md            專案說明、遊玩網址、指令、部署
├── src/                 大廳原始碼（portal.js 的 GAMES 為大廳遊戲清單）
├── scripts/             大廳建置、組合（assemble.mjs 的 GAMES 為組合清單）、預覽、圖示
├── games/
│   ├── spec.md          共用規格
│   └── <目錄>/          每個遊戲是獨立專案：src/、scripts/、tests/、package.json、README.md、規格
└── site/、dist/         建置產物（不進版本控制）
```

## 新增遊戲

完整要求以 `games/spec.md` 為準，以下是作業流程摘要。

### 1. 決定目錄名稱

- 小寫英文字母（例如 `numberlink`），同時是部署網址 `/<目錄>/`、localStorage 鍵前綴 `<目錄>.`、快取名稱前綴 `<目錄>-`。
- **一經上架不得更改**，否則玩家的存檔、統計與離線快取會失聯。

### 2. 先寫規格

- 建立 `games/<目錄>/spec.md`，格式見下方「文件規範 → 遊戲規格」。
- 規格完成即可單獨 commit（例如「新增成語填字規格」），不必等程式完成。

### 3. 建立遊戲專案

- 以現有遊戲（建議 `games/numberlink/`）為範本，結構如下：

  ```
  games/<目錄>/
  ├── src/                index.html、sw.js、manifest.webmanifest、icons/、css/、js/
  ├── scripts/            build.mjs、serve.mjs、make-icons.mjs、（有出題器時）check-puzzles.mjs
  ├── tests/              node:test 單元測試（*.test.mjs）
  ├── package.json        含 dev、build、preview、test、icons、（有出題器時）check:puzzles
  ├── .gitignore
  ├── README.md
  └── spec.md
  ```

- 不使用 npm 套件，只用 Node.js（16.17 以上）內建模組；所有資源以相對路徑引用，不依賴外部 CDN、API 或遠端字型。
- 遊戲規則、出題、解題等純邏輯放在獨立模組（例如 `src/js/<目錄>/`、`src/js/game.js`），與畫面（`src/js/app.js`）分離，並撰寫單元測試。
- 出題在 Web Worker（`src/js/worker.js`）執行，並有主程式退路。
- 本機儲存集中在 `src/js/storage.js`，所有鍵以 `<目錄>.` 開頭，`.save`／`.stats` 格式須符合「大廳整合介面」。
- `sw.js` 須支援 `CHECK_CACHE`（回覆 `{ ok, missing, version, label }`）與 `SKIP_WAITING`；`build.mjs` 負責填入版本號、版本標籤與預先快取清單。
- 外觀採用「豐富色調」：選定兩色漸層的遊戲主色，做法參考現有遊戲 `src/css/style.css` 末尾的段落。

### 4. 開發期間

- 在遊戲目錄內開發與測試：`cd games/<目錄> && npm run dev`、`npm test`、`npm run check:puzzles`。
- **開發中的遊戲不加入大廳**，不改根目錄的 `src/`、`scripts/`、`package.json`。

### 5. 上架到大廳（遊戲完成後）

遊戲符合 `games/spec.md`「上架前提」後，依序修改：

1. `src/portal.js` 的 `GAMES`：加入 `dir`、`title`、`desc`（手機直向不超過一行半）、`tags`（2 個 `[圖示名稱, 文字]`）。需要新圖示時，在 `src/index.html` 的內嵌圖示集加入 `<symbol id="i-名稱">`。
2. `scripts/assemble.mjs` 的 `GAMES`：加入 `<目錄>: 'games/<目錄>'`。
3. `scripts/make-icons.mjs`：加入 56 × 56 的 `<目錄>.svg`，執行 `npm run icons` 產生 `src/icons/<目錄>.svg`。
4. `src/portal.css`：在淺色與深色 `:root` 加入 `--<目錄>-1`、`--<目錄>-2`，並加入 `.game-card[data-theme="<目錄>"]` 漸層。
5. 根目錄 `package.json`：`test`、`check:puzzles` 串上 `npm --prefix games/<目錄> …`，並新增 `dev:<目錄>`。
6. 使用共用難度代碼（`easy`、`medium`、`hard`、`expert`）以外的代碼時，先更新 `src/portal.js` 的 `DIFFICULTY_LABEL`。
7. 文件：`README.md` 的遊玩網址表、專案結構與網站結構；`games/spec.md` 開頭的遊戲規格舉例與「參考資料」。

### 6. 驗證

- 根目錄執行 `npm test` 與 `npm run check:puzzles`，全部通過。
- 執行 `npm run preview`，在 `http://localhost:5180/` 依 `games/spec.md`「上架驗證與發布」逐項確認（卡片、離線可玩、繼續遊戲、戰績、「‹ 所有遊戲」、離線開新局）。
- 預覽結束後停止本機伺服器。
- 回報時清楚區分「本機自動化測試已通過」與「需要實機（手機、飛航模式）確認」的項目，不得把未實測的項目寫成已驗證。

## 文件規範

### 通則

- 一律使用繁體中文與全形標點（，。：；「」（）、）；中文與英文、數字或程式碼之間加一個半形空格（例如「localStorage 前綴」「最近 50 題」）。
- 程式碼、檔名、指令、localStorage 鍵、訊息名稱一律以反引號標示，例如 `npm test`、`numberlink.save`。
- 介面上的文字以「」標示，例如「繼續遊戲」「‹ 所有遊戲」。
- 用語統一：遊戲大廳（或「大廳」）、目錄名稱、上架、離線可玩、豐富色調、難度代碼；尺寸寫成 `44 × 44 CSS px` 的格式。
- 規格以條列為主，句子簡短、可驗證；避免「盡量」「適當」等無法驗收的字眼，數值要寫明。
- 標題層級最多到 `###`；連結其他文件使用相對路徑。
- 不寫入敏感資訊（憑證私鑰、本機 CA、`.certs/`、`*.pem`）。

### 各文件的職責

| 文件 | 內容 | 不放 |
| --- | --- | --- |
| `README.md`（根目錄） | 遊玩網址、專案與網站結構、大廳功能、根目錄指令、部署、iPhone 注意 | 遊戲規則細節 |
| `games/spec.md` | 所有遊戲共通的產品原則、大廳整合介面、操作、儲存、離線、部署、共用驗收、上架流程 | 單一遊戲特有內容 |
| `games/<目錄>/spec.md` | 該遊戲的規則、難度、出題、畫面操作，以及對共用規格的補充或例外 | 重複共用規格的內容 |
| `games/<目錄>/README.md` | 該遊戲的指令、專案結構、部署、選用的區網 HTTPS 測試 | 規格內容 |
| `AGENTS.md` | Agent 作業流程與文件規範 | 規格內容（改為引用） |

### 遊戲規格（`games/<目錄>/spec.md`）

- 標題：`# <遊戲名稱>網頁版規格`，英文名稱放括號，例如「數字連線（Numberlink）網頁版規格」。
- 標題下第一段固定寫明：共通要求依 [`games/spec.md`](../spec.md)，本文件只寫該遊戲特有的內容與對共用規格的補充、例外。
- 建議章節（依遊戲需要增減，順序維持一致）：
  1. `## 產品範圍`：第一條寫目錄名稱、部署網址、localStorage 前綴、快取前綴與大廳顯示名稱；列出不在本版範圍的功能。
  2. `## 共用規格的例外`（有放寬時才需要）：每一項寫明例外內容與理由。
  3. `## 規則`
  4. `## 遊戲流程`（可寫「依共用規格，另補充：」）
  5. 畫面與操作相關章節（例如 `## 畫面與操作`、`## 復原與提示`）
  6. `## 難度與出題`（或 `## 關卡與章節`）
  7. `## 統計`、`## 本機儲存`（列出所有 localStorage 鍵）
  8. `## 外觀`：遊戲主色。
  9. `## 驗收條件`：只寫遊戲特有的項目，共用項目引用 `games/spec.md`。
  10. `## 開發順序`：最後一步固定為「**上架到大廳**：依共用規格「上架到大廳」完成並驗收」。
  11. `## 參考資料`：第一條為共用規格連結。
- 遊戲規格只能**加嚴或補充**共用規格；需要放寬時必須寫在「共用規格的例外」並說明理由。
- 實作後若行為與規格不同，同步更新規格（例如「依實作更新 numberlink 規格」）。

### 遊戲 README（`games/<目錄>/README.md`）

- 標題：`# 離線<遊戲名稱>`，例如「離線數字連線（Numberlink）」。
- 章節：`## 指令`、`## 專案結構`、`## 部署（GitHub Pages）`、`## 選用：手機透過區網測試 HTTPS`。

### 需要同步更新文件的情況

- 新增或上架遊戲：根目錄 `README.md`、`games/spec.md` 的遊戲規格舉例與「參考資料」。
- 修改大廳與遊戲之間的約定（儲存鍵格式、難度代碼、Service Worker 訊息、版本標籤）：先改 `games/spec.md`「大廳整合介面」，並同步修改大廳程式與**所有**遊戲。
- 新增或變更根目錄指令：`README.md`「指令」表。
- 變更部署方式：`README.md`「部署」與 `games/spec.md`「部署與 HTTPS」。
- 新增作業流程或文件規範：更新本文件。

## 程式碼規範

- 每個函式（含 class 方法、箭頭函式、回呼）前都要有說明用途的繁體中文註解；公開或較複雜的函式使用 JSDoc，寫明參數、回傳值與副作用。
- 每個檔案開頭以一行 `//` 註解說明檔案用途。
- 常數以 `/** … */` 單行註解說明意義與單位，例如 `/** 前景出題逾時（毫秒）。 */`。
- 沿用周圍程式碼的命名、縮排與寫法；修改既有函式時，若缺註解一併補上。

## Commit 規範

- commit 訊息使用繁體中文，第一行以動詞開頭簡述變更，例如「新增數字連線（Numberlink）並上架到大廳」「規格新增「上架到大廳」：遊戲完成後須加入大廳」。
- 變更較多時，空一行後以條列分別說明遊戲、大廳、規格各自的變更。
- 只有在使用者要求時才 commit 或 push；推送到 `main` 會觸發正式部署。
- 不提交 `dist/`、`site/`、`node_modules/`、`.certs/`、`*.pem`。
