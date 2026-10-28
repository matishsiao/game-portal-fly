# 離線作文工坊（Writing Workshop）

國小到國中的寫作練習遊戲，沿用奧數挑戰的十題闖關、分段提示與待練習流程。目前是四級各 10 題、共 40 題的試玩版，依使用者要求先加入大廳；尚未完成獨立審題與實機離線驗收。寫作小卡與自由選寫草稿可從首頁開啟。規格見 [spec.md](spec.md)。

## 指令

在本目錄執行，使用 Node.js 16.17 以上，不需安裝套件。

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發預覽，網址 `http://localhost:5173/`，不啟用離線快取 |
| `npm run build` | 建置到 `dist/` |
| `npm run preview` | 建置並預覽，啟用離線快取 |
| `npm test` | 檢查作答、挑題、題庫、續玩、儲存與獎勵 |
| `npm run check:puzzles` | 檢查題庫格式，列出上架題量缺口 |
| `npm run check:release` | 檢查正式門檻；目前應失敗，尚缺題量、獨立審題與實機驗收 |
| `npm run icons` | 產生筆記本圖示 |

## 專案結構

- `src/js/app.js`：畫面、題目回饋、寫作小卡與選寫。
- `src/js/game.js`、`src/js/rest.js`：作答與休息提醒邏輯。
- `src/js/writing/`：題庫查詢與挑題。
- `src/js/storage.js`：進度、統計、待練習、獎勵與草稿。
- `src/js/playlog.js`：共用遊玩歷程與凍結模組的原樣複本。
- `src/data/questions.json`：原創固定題庫，尚待獨立審題。
- `scripts/`：建置、預覽、圖示與題庫檢查。
- `tests/`：Node.js 單元測試。

## 部署（GitHub Pages）

已加入大廳組合清單，隨專案下次部署發布至 `/writing/`，口袋地城已註冊其獎勵來源。試玩上架例外見規格；正式題量、獨立審題與實機驗收仍待完成。

## 選用：手機透過區網測試 HTTPS

使用 `npm run preview:https`，需先安裝 mkcert 並在手機信任測試憑證。僅在本機建立憑證，不得提交 `.certs/` 或 `*.pem`。完成測試後停止伺服器。正式上架前仍須確認手機飛航模式、重新開機後續玩與離線開新局。
