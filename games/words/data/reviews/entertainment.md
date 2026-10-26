# 審閱紀錄：娛樂與媒體（entertainment）

- 審閱日期：2026-10-26
- 初稿：`data/draft/entertainment.json`；定稿：`data/words/entertainment.json`
- 檢查數量：60
- 通過（原樣保留）：59
- 修正後通過：1
- 退回（重寫或替換）：0
- 常見度分布：基礎 24／一般 24／進階 12

## 修正

| 單字 | 欄位 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- | --- |
| star | id | `star` | `star-person` | id 衝突：colors-shapes、nature 初稿以 `star` 表示「星星、星形」，本字為「明星」，改用 `star-person` |

## 退回

無。

## 其他檢查說明

- 含英文字母的中文：podcast「Podcast節目」——台灣普遍直接說 Podcast，「播客」偏中國用語，保留原寫法；karaoke「卡拉OK、KTV」兩者都是台灣常用說法，保留。
- 同義群組檢查：movie／film（中文同為「電影」）、show／program／performance、actor／actress、theater／movie theater、series／drama、star／celebrity、band／orchestra 群組完整。
- 跨分類 id 檢查：tv、ticket、funny、music、festival、exhibition 與其他分類意思一致；star（明星）改用 `star-person`（見上表）。
- 常見度、例句文法、form 與翻譯其餘皆正確；無題材問題。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- ticket（n.）：「票、門票」→「票」
