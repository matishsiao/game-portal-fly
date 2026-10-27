# 遊戲飛行（PlayFlight）

可離線遊玩的小遊戲合集，適合搭機、搭車等沒有網路的時候打發時間。

**線上遊玩：<https://matishsiao.github.io/game-portal-fly/>**

| 遊戲 | 網址 |
| --- | --- |
| 遊戲大廳 | <https://matishsiao.github.io/game-portal-fly/> |
| 數獨 | <https://matishsiao.github.io/game-portal-fly/sudoku/> |
| 數學填字 | <https://matishsiao.github.io/game-portal-fly/crossmath/> |
| 數字連線 | <https://matishsiao.github.io/game-portal-fly/numberlink/> |
| 成語填字 | <https://matishsiao.github.io/game-portal-fly/idiom/> |
| 滾滾解謎 | <https://matishsiao.github.io/game-portal-fly/roll/> |
| 英文單字連線 | <https://matishsiao.github.io/game-portal-fly/words/> |
| 密碼偵探 | <https://matishsiao.github.io/game-portal-fly/codebreaker/> |
| 口袋地城 | <https://matishsiao.github.io/game-portal-fly/pocketdungeon/> |

用手機開啟大廳並加入主畫面，連網時會自動下載所有遊戲，之後沒有網路也能玩。

遊戲大廳與所有遊戲的原始碼都在這個專案統一開發。部署時大廳在網站根目錄，每個遊戲放在自己的目錄，各自擁有 Service Worker 與快取，彼此互不影響。

```
game-portal/
├── src/                 大廳原始碼
├── scripts/             大廳建置、組合（assemble）、預覽、部署
├── games/
│   ├── sudoku/          數獨（自成一個專案：src/、scripts/、tests/、spec.md）
│   ├── crossmath/       數學填字（自成一個專案：src/、scripts/、tests/、cm_spec.md）
│   ├── numberlink/      數字連線（自成一個專案：src/、scripts/、tests/、spec.md）
│   ├── idiom/           成語填字（自成一個專案：src/、scripts/、tests/、data/、spec.md；詞庫取自教育部《成語典》）
│   ├── roll/            滾滾解謎（自成一個專案：src/、scripts/、tests/、levels/、spec.md）
│   ├── codebreaker/     密碼偵探（自成一個專案：src/、scripts/、tests/、spec.md）
│   └── pocketdungeon/   口袋地城（自成一個專案：src/、scripts/、tests/、spec.md）
└── site/                組合結果（不進版本控制），內容即網站根目錄
```

部署後的網站結構：

```
網站根目錄（GitHub Pages：https://matishsiao.github.io/game-portal-fly/）
├── index.html、portal.js、portal.css、sw.js、manifest.webmanifest、icons/   ← 大廳
├── sudoku/       ← games/sudoku 的 dist/
├── crossmath/    ← games/crossmath 的 dist/
├── numberlink/   ← games/numberlink 的 dist/
├── idiom/        ← games/idiom 的 dist/
├── roll/         ← games/roll 的 dist/
├── codebreaker/  ← games/codebreaker 的 dist/
└── pocketdungeon/ ← games/pocketdungeon 的 dist/
```

## 功能

- 遊戲大廳：依時段的問候、離線就緒標記、「繼續遊戲」卡片、各遊戲主視覺卡片（完成局數、最佳紀錄）與戰績總覽（完成局數、無提示完成、累計遊玩時間）。
  進度與戰績以唯讀方式讀取各遊戲在同網域 localStorage 的 `<目錄>.save`、`<目錄>.stats`，資料不完整時忽略。
- 圖示為頁面內嵌的 SVG 圖示集（`index.html` 開頭的 `<symbol>`），不依賴外部資源，離線也能顯示。
- 各遊戲卡片顯示離線狀態（離線可玩／尚未下載／下載中）。
- 自動下載：開啟大廳且有網路時，自動在背景安裝每個遊戲的 Service Worker（全部約 400 KB），不必逐一開啟遊戲；省數據模式下不自動下載，改用「下載全部遊戲的離線資源」按鈕（也用於失敗重試）。
- 新版本檢查：有網路時（開啟、回到前景最多每 10 分鐘、恢復連線），大廳替每個已下載的遊戲檢查新版本並在背景下載完成，遊戲卡片顯示「有新版本」。不直接切換版本，由玩家進入遊戲後按「重新整理以更新」，避免影響進行中的局。
- 大廳自己的更新：開啟、回到前景與恢復連線時（最多每分鐘一次）檢查大廳新版本。新版啟用後，玩家還沒操作或大廳在背景時直接重新載入；正在操作時在畫面下方顯示「大廳有新版本，點此更新」。iOS 主畫面 App 常從背景恢復而不重新載入，所以不能只在開啟時檢查。
- 主打遊戲：遊戲清單中 `featured` 的遊戲顯示在最上方「主打遊戲」，不列在下方遊戲列表；`record: 'rpg'` 的卡片讀取 `<dir>.save` 與 `<dir>.areaStats`，顯示角色等級與樓層（冒險中）或擊敗 Boss、擊倒數與最深樓層。
- 版本號：大廳底部顯示大廳版本，遊戲卡片與遊戲首頁顯示該遊戲版本，格式為「最後修改 `src/` 的 commit 日期・內容雜湊前 7 碼」（例如 `2026.10.25・c27e2a1`），由各專案的 `scripts/build.mjs` 產生；只改文件不會產生新版本。
- 選單本身也可離線開啟，並可加入主畫面（只用一個圖示就能玩所有遊戲）。
- 選單會在 localStorage 記錄自己的路徑（`games.portal`），同網域的遊戲首頁據此顯示「‹ 所有遊戲」連結。
- 選單的 Service Worker 只處理選單自己的檔案，不攔截遊戲目錄的請求，只清除 `portal-` 開頭的快取。

## 指令

在專案根目錄執行：

| 指令 | 用途 |
| --- | --- |
| `npm test` | 執行所有遊戲的單元測試 |
| `npm run check:puzzles` | 所有遊戲各難度批次出題驗收（口袋地城為地城生成與數值平衡檢查） |
| `npm run dev:sudoku`／`npm run dev:crossmath`／`npm run dev:numberlink`／`npm run dev:idiom`／`npm run dev:roll`／`npm run dev:codebreaker`／`npm run dev:pocketdungeon` | 單獨開發某個遊戲（不啟用離線快取） |
| `npm run preview` | 建置大廳與所有遊戲、組合成 `site/`，以 `http://localhost:5180/` 預覽 |
| `npm run assemble` | 只建置並組合成 `site/`（加 `-- --no-build` 則不重新建置遊戲） |
| `npm run build` | 只建置大廳到 `dist/` |
| `npm run icons` | 重新產生大廳圖示 |

各遊戲也可以在自己的目錄單獨執行原本的指令（例如 `cd games/sudoku && npm test`）。遊戲位置設定在 `scripts/assemble.mjs` 的 `GAMES`；遊戲尚無 `src/index.html` 或建置失敗時會略過。

## 新增遊戲

開發中的遊戲放在 `games/<目錄>/` 單獨開發，不加入大廳；**遊戲完成後必須加入大廳才算上架**。上架前提、步驟（大廳清單、組合清單、卡片圖示與主色、根目錄指令、文件）與驗證方式見 [`games/spec.md`「上架到大廳」](games/spec.md#上架到大廳遊戲完成後)。

## 部署（GitHub Pages）

推送到 `main` 後，`.github/workflows/pages.yml` 會自動執行所有遊戲的單元測試、組合 `site/`，並部署到 GitHub Pages：

- 網址：`https://matishsiao.github.io/game-portal-fly/`（大廳），遊戲在 `/sudoku/`、`/crossmath/`、`/numberlink/`、`/idiom/`、`/roll/`、`/codebreaker/`、`/pocketdungeon/`。
- HTTPS 憑證由 GitHub 自動提供與續期。
- 首次使用需在 repo 的 **Settings → Pages** 把 Source 設為 **GitHub Actions**。公開 repo 使用 GitHub Actions 與 Pages 不需付費。
- 也可在 Actions 分頁對「Deploy to GitHub Pages」按 **Run workflow** 手動重新部署。

## iPhone 注意

每個主畫面圖示的資料（進度、統計）各自獨立，也和 Safari 不相通。請固定一種入口：只把選單加到主畫面，或只把各遊戲分別加到主畫面，不要混用。

## 授權

本專案以 [Apache License 2.0](LICENSE) 授權，任何人都可以**免費**使用、修改、散布，包含商業用途。

唯一的要求是**註明出處**：fork、修改或散布本專案（含衍生作品）時，請

1. 保留 [`LICENSE`](LICENSE) 與 [`NOTICE`](NOTICE) 檔案；
2. 在你的 README 或關於頁面註明源自本專案，例如：

   > 本作品 fork 自「遊戲飛行（PlayFlight）」：<https://github.com/matishsiao/game-portal-fly>

3. 修改過的檔案請標示已修改。

完整條款以 [`LICENSE`](LICENSE) 為準。
