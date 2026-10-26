# 審閱紀錄：學校與學習（school）

- 審閱日期：2026-10-26
- 初稿：`data/draft/school.json`；定稿：`data/words/school.json`
- 檢查數量：60
- 通過（原樣保留）：57
- 修正後通過：3
- 退回（重寫或替換）：0
- 常見度分布：基礎 24／一般 24／進階 12

## 修正

| 單字 | 欄位 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- | --- |
| book | id | `book` | `book-n` | id 衝突：hotel、restaurant、verbs 初稿以 `book` 表示動詞「預訂」，本字為名詞「書」，改用 `book-n` |
| degree | id | `degree` | `degree-academic` | id 衝突：weather 初稿以 `degree` 表示「度」，本字為「學位」，改用 `degree-academic` |
| lecture | zh<br>example<br>exampleZh | `講課、演講`<br>`The lecture is in Room 201.`<br>`這堂課在 201 教室上。` | `講座、演講`<br>`There's a free lecture on Japanese art tonight.`<br>`今晚有一場關於日本藝術的免費講座。` | 原中文「講課、演講」與原例句翻譯「這堂課」和 class「課」、lesson「一堂課」混淆；改取「講座、演講」並重寫例句 |

## 退回

無。

## 其他檢查說明

- 同義群組檢查：test／exam 中文同為「考試」必須同群組；quiz「小考」也常譯為「測驗」，與 test「考試、測驗」確實會混淆，保留同群組，不屬於過度合併。class／lesson／course、learn／study、homework／assignment、university／college 群組完整。
- 跨分類 id 檢查：desk、music、classmate、explain 與其他分類初稿意思一致；book（名詞）改為 `book-n`、degree（學位）改為 `degree-academic`（見上表）。
- student 例句的 form 填 `Students`（句首大寫的複數），驗證不分大小寫，保留。
- 常見度、例句文法、form 與翻譯其餘皆正確；無題材問題。
