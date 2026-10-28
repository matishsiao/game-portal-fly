# 離線英文單字拼圖

可離線遊玩的英文單字拼字 PWA：看中文意思與挖空的例句，用字母方塊拼出英文單字。屬於「遊戲飛行」大廳的學習遊戲，規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。

單字清單取自大考中心《高中英文參考詞彙表》（111 學年度起適用，Level 1～6），**該清單僅供非營利使用**，來源與授權見 [`data/README.md`](data/README.md)。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 合併詞庫並以開發模式提供 `src/`（不啟用 Service Worker） |
| `npm run words` | 把審閱過的 `data/words/*.json` 依 Level 輸出為 `src/data/level-<n>.json` |
| `npm run list` | 從 `data/ceec/ceec-108.json` 重新整理 `data/list.json` 與 `data/excluded.json` |
| `npm run build` | 合併詞庫並建置到 `dist/` |
| `npm run preview` | 建置並以 `dist/` 啟動，啟用 Service Worker |
| `npm test` | 出題、拼字規則、清單整理與詞庫驗證的單元測試 |
| `npm run validate` | 驗證 `data/words/` 全部詞庫檔 |
| `npm run check:puzzles` | 每個難度 × 每個 Level 各產生 100 局，檢查出題規則與出題時間 |
| `npm run icons` | 重新產生圖示 |

## 專案結構

```
games/spelling/
├── data/        詞庫來源（ceec/）、整理後的清單、撰寫批次、初稿、定稿、審閱紀錄與撰寫規範
├── scripts/     建置、本機伺服器、圖示、清單整理、詞庫驗證與合併、批次驗收
├── src/         index.html、sw.js、manifest、icons/、css/、data/（建置產生的詞庫）、js/
│   └── js/      app.js（畫面）、game.js（拼字規則）、deck.js（出題）、lexicon.js（詞庫載入）、storage.js、speech.js、playlog.js
├── tests/       node:test 單元測試
└── spec.md      遊戲規格
```

## 詞庫流程

1. `npm run list` 整理大考中心清單。
2. `node scripts/make-batches.mjs` 分批（Level 1～2 全部；Level 3～6 先各取 300 個，依字母平均分布）。
3. 撰寫 agent 依 [`data/AUTHORING.md`](data/AUTHORING.md) 寫初稿到 `data/draft/`。
4. 另一個獨立的審閱 agent 逐筆審閱，寫入 `data/words/`（`reviewed: true`）與 `data/reviews/`。
5. `npm run words` 合併；`npm test`、`npm run check:puzzles` 全部通過。

## 發音

使用裝置內建的英文語音（Web Speech API）：出題時可點 🔊 聽單字（不算提示），單字卡可聽單字與例句，拼對時自動唸一次（可在「設定」關閉）。裝置沒有英文語音時不顯示發音按鈕；語音與語速可在「設定」選擇。

## 部署（GitHub Pages）

由專案根目錄的 workflow 與大廳一起組合部署，見根目錄 `README.md`。本遊戲上架到大廳後，網址為 `https://matishsiao.github.io/game-portal-fly/spelling/`。

## 選用：手機透過區網測試 HTTPS

Service Worker 需要 HTTPS（或 localhost）。要用手機透過區網測試離線功能時：

1. 安裝 [mkcert](https://github.com/FiloSottile/mkcert)。
2. `npm run build && node scripts/serve.mjs --dist --https`：第一次會產生本機 CA 簽發的憑證（放在 `.certs/`，不進版本控制）。
3. 依畫面提示在手機安裝並信任本機 CA，再以區網網址開啟。

憑證私鑰與本機 CA 私鑰不得提交。
