# 審閱紀錄：城市與地點（city）

- 審閱日期：2026-10-26
- 初稿：`data/draft/city.json`；定稿：`data/words/city.json`
- 檢查數量：60
- 通過（原樣保留）：57
- 修正後通過：3
- 退回（重寫或替換）：0
- 常見度分布：基礎 24／一般 24／進階 12

## 修正

| 單字 | 欄位 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- | --- |
| square | id | `square` | `square-plaza` | id 衝突：colors-shapes 初稿以 `square` 表示「正方形」，本字為「廣場」，改用 `square-plaza` |
| gas station | exampleZh | `我們需要停一下加油站。` | `我們得找個加油站停一下。` | 例句翻譯「我們需要停一下加油站」不通順 |
| construction site | exampleZh | `請繞過施工工地。` | `請繞過工地。` | 例句翻譯「施工工地」語意重複 |

## 退回

無。

## 其他檢查說明

- 同義群組檢查：city／town、street／road／avenue、store／shop、department store／mall、building／skyscraper、square／plaza（中文同為「廣場」）群組完整。village「村莊」與 town「城鎮、小鎮」中文可區分，未合併。
- 跨分類 id 檢查：park（名詞「公園」）與 sightseeing 初稿一致；但 transport 初稿以無後綴的 `park` 表示動詞「停車」，該衝突應由 transport 審閱時改為 `park-v`，本分類維持 `park`。其餘 street、road、bank、corner、downtown、block、alley、intersection 等與其他分類意思一致。
- 常見度、例句文法、form 與翻譯其餘皆正確；無題材問題。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- street（n.）：「街道、街」→「街道」
- road（n.）：「路、道路」→「道路、馬路」
- corner（n.）：「轉角、角落」→「轉角」
- hotel（n.）：「旅館、飯店」→「飯店、旅館」
- crosswalk（n.）：「斑馬線、行人穿越道」→「斑馬線」
- intersection（n.）：「十字路口、路口」→「十字路口」
