# 英文單字連線

可離線遊玩的英文單字配對連線 PWA，屬於「遊戲飛行」大廳的一款遊戲。規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 合併詞庫並以開發模式提供 `src/`（不啟用 Service Worker） |
| `npm run words` | 把審閱過的 `data/words/*.json` 合併為 `src/js/words-data.js` |
| `npm run build` | 合併詞庫並建置到 `dist/` |
| `npm run preview` | 建置並以 `dist/` 啟動，啟用 Service Worker |
| `npm test` | 出題器、遊戲規則與詞庫的單元測試 |
| `npm run validate` | 驗證 `data/words/` 全部詞庫檔 |
| `npm run check:puzzles` | 每個分類、每個難度各產生 50 局，檢查同盤規則與出題條件 |
| `npm run icons` | 重新產生圖示 |

## 詞庫

- 分類清單：`data/categories.json`（34 個分類，id 不可更改）。
- 撰寫與審閱規範：[`data/AUTHORING.md`](data/AUTHORING.md)。
- 流程：撰寫 agent 產生初稿 `data/draft/<分類>.json` → 獨立的審閱 agent 逐筆審閱，寫入 `data/words/<分類>.json`（每筆 `reviewed: true`）並留下審閱紀錄 `data/reviews/<分類>.md` → `node scripts/unify-meanings.mjs` 統一跨分類同義字的中文寫法 → `node scripts/normalize-ids.mjs` 統一 id → `npm run words`。
- 只有審閱過的單字會進入遊戲；`npm run words -- --draft` 可用初稿建置，只供本機測試畫面，**不可提交或部署**。
- 上限 5,000 個單字；新增單字時依同樣流程分批撰寫與審閱。

## 發音

使用裝置內建的英文語音（Web Speech API），只在玩家點按 🔊 時播放；裝置沒有英文語音時不顯示發音按鈕，可在「設定」關閉。

語音會自動挑選裝置上音質最好的英文語音（排除 Albert、Zarvox 等趣味語音，離線時不用網路語音）；也可在「設定」自選語音與語速（正常／慢速）。iPhone、iPad 與 Mac 可在系統的「朗讀內容」下載加強版英文語音，音質會更自然。
