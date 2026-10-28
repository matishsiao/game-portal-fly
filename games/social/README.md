# 離線社會探索

可離線遊玩的國小三年級到國中九年級社會科 PWA：歷史、地理、公民與社會，答錯時引導思考，並以間隔複習幫助記憶。屬於「遊戲飛行」大廳的學習遊戲，規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。程式以 [自然探險](../science/) 為範本。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 以開發模式提供 `src/`（不啟用 Service Worker） |
| `npm run bank` | 把審閱定稿 `data/bank/*.json` 合併為 `src/data/questions.json`、`src/data/cards.json` |
| `npm run bank:draft` | 改用初稿 `data/draft/` 合併，**只供本機測試畫面，不可提交或部署** |
| `npm run build` | 建置到 `dist/` |
| `npm run preview` | 建置並以 `dist/` 啟動，啟用 Service Worker |
| `npm test` | 作答規則、挑題與間隔複習、本機儲存、題型模板（每個模板 2,000 題獨立驗算）、上架題庫的規則檢查 |
| `npm run validate -- <檔案>` | 驗證初稿、事實審閱或定稿檔 |
| `npm run check:puzzles` | 題庫檢查：格式與用語，依難度列出科目、題型與資料判讀題數 |
| `npm run check:release` | 未達首次上架門檻（每個難度 200 題等）時失敗 |
| `npm run check:full` | 列出與完整版目標（每個難度 400 題以上）的差距 |
| `npm run check:dates` | 列出有時效性（`asOf`）的題目，供每年重新查核 |
| `npm run icons` | 重新產生圖示 |

## 專案結構

```
games/social/
├── data/
│   ├── AUTHORING.md   撰寫與審閱規範（給撰寫、事實審閱、中立審閱 agent）
│   ├── terms.md       用語對照表（「不使用」的寫法由程式檢查）
│   ├── topics.md      各難度的主題、涵蓋內容與題數規劃
│   ├── draft/         撰寫初稿
│   ├── checked/       事實審閱後
│   ├── bank/          中立審閱後的定稿（遊戲只用這裡）
│   └── reviews/       審閱紀錄（含查證來源）
├── scripts/           建置、本機伺服器、圖示、題庫規則、合併、驗證與檢查
├── src/
│   ├── data/          合併後的題庫與知識卡
│   └── js/            app.js（畫面）、game.js（作答規則）、storage.js、rest.js（休息提醒）、playlog.js、social/（bank、pick、templates）
└── tests/             node:test 單元測試
```

## 題庫流程

1. 撰寫 agent 依 [`data/AUTHORING.md`](data/AUTHORING.md) 與 [`data/topics.md`](data/topics.md) 寫初稿到 `data/draft/`。
2. 事實審閱 agent 不看答案先作答，逐題以兩個可靠來源查證，輸出到 `data/checked/`，紀錄寫在 `data/reviews/<檔名>-fact.md`。
3. 中立審閱 agent 依「內容原則」檢查立場、用語與適讀，輸出定稿到 `data/bank/`，紀錄寫在 `data/reviews/<檔名>-neutral.md`。
4. 有疑慮的題目放在檔案的 `held` 陣列，不上架，等使用者決定。
5. `npm run bank` 合併；`npm test`、`npm run check:puzzles` 全部通過。

## 部署（GitHub Pages）

由專案根目錄的 workflow 與大廳一起組合部署，見根目錄 `README.md`。題庫達到首次上架門檻（`npm run check:release`）並完成驗收後，依共用規格「上架到大廳」加入大廳，網址為 `https://matishsiao.github.io/game-portal-fly/social/`。

## 選用：手機透過區網測試 HTTPS

Service Worker 需要 HTTPS（或 localhost）。安裝 [mkcert](https://github.com/FiloSottile/mkcert) 後執行 `npm run preview:https`，依畫面提示在手機信任本機 CA，再以區網網址開啟。憑證私鑰與本機 CA 私鑰（`.certs/`、`*.pem`）不得提交。
