# 英文單字拼圖：詞庫來源

## 單字清單

- 來源：財團法人大學入學考試中心基金會《高中英文參考詞彙表》（111 學年度起適用，民國 109 年 7 月公告）。
- 下載網址：<https://www.ceec.edu.tw/xmdoc?xsmsid=0K213553204833715309>（PDF）。
- 下載日期：2026-10-28。
- 使用條款（原文，見 PDF 封面）：「著作權屬財團法人大學入學考試中心基金會所有，僅供非營利目的使用，轉載請註明出處。若作為營利目的使用，應事前經由財團法人大學入學考試中心基金會書面同意授權。」

**授權注意**：本專案其他內容以 Apache License 2.0 授權，但以下資料取自上述詞彙表，**不適用 Apache License 2.0**，僅供非營利目的使用，轉載須註明出處，營利使用須先取得大考中心書面授權：

- `data/ceec/ceec-108.json`：詞彙表「依級別排序」的詞條、詞性與級別。
- 由它整理出的 `data/list.json`、`data/excluded.json`，以及詞庫中的英文單字、詞性與 Level 欄位。

詞庫中的中文意思、例句與例句翻譯為本專案原創撰寫，不是取自詞彙表。

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `ceec/ceec-108.json` | 從 PDF「依級別排序」擷取的原始詞條（`raw` 詞條寫法、`pos` 詞性、`level` 級別），共 6,012 筆；有兩筆因 PDF 換行擷取錯誤已手動修正（`neither`、`sportsman/sportswoman`） |
| `list.json` | 由 `npm run list`（`scripts/normalize-list.mjs`）整理：一個單字一筆，含 `id`、`en`、`pos`、`level` |
| `excluded.json` | 整理時排除的寫法與原因（拼寫變體、複數、縮寫、專有名詞、1 個字母等） |
| `batches/` | 撰寫批次（`npm run` 不使用；由 `scripts/make-batches.mjs` 產生） |
| `draft/` | 撰寫 agent 的初稿 |
| `words/` | 審閱 agent 的定稿（遊戲只使用這裡、且 `reviewed: true` 的單字） |
| `reviews/` | 每個批次的審閱紀錄 |
| `AUTHORING.md` | 撰寫與審閱規範 |

## 重新擷取

PDF 轉文字不屬於遊戲建置流程（需要 PDF 工具）。詞彙表改版時，以任一 PDF 文字擷取工具取出「依級別排序」一節，轉成與 `ceec/ceec-108.json` 相同的格式，再執行 `npm run list` 並檢查 `excluded.json`。
