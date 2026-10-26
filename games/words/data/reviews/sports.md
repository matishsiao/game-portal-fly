# 審閱紀錄：運動與休閒（sports）

- 審閱日期：2026-10-26
- 初稿：`data/draft/sports.json`；定稿：`data/words/sports.json`
- 檢查數量：60
- 通過（原樣保留）：50
- 修正後通過：10
- 退回（重寫或替換）：0
- 常見度分布：基礎 24／一般 24／進階 12

## 修正

| 單字 | 欄位 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- | --- |
| run | syn | （空） | `run` | run「跑步、跑」與 jog「慢跑」意思相近易混淆，新增 run 群組 |
| jog | syn | （空） | `run` | 同上，加入 run 群組 |
| bike | syn | （空） | `bike` | bike「腳踏車、自行車」與 cycling「騎單車、自行車運動」中文重疊，新增 bike 群組 |
| cycling | syn | （空） | `bike` | 同上，加入 bike 群組 |
| diving | syn | （空） | `diving` | diving「潛水」與 snorkeling「浮潛」皆為水下活動，玩家容易混淆，新增 diving 群組 |
| snorkeling | syn | （空） | `diving` | 同上，加入 diving 群組 |
| exercise | id | `exercise` | `exercise-v` | id 衝突：health 初稿以 `exercise` 表示名詞「運動」，本字為動詞，依規則改用 `exercise-v` |
| medal | example<br>exampleZh | `He won a gold medal at the games.`<br>`他在運動會上贏得一面金牌。` | `He won a gold medal in swimming.`<br>`他在游泳項目贏得一面金牌。` | 原例句「at the games」小寫語意不清，翻譯「運動會」與英文不對應，重寫例句 |
| fan | id | `fan` | `fan-person` | id 衝突：home 初稿以 `fan` 表示「電扇」，本字為「球迷、粉絲」，改用 `fan-person` |
| tie | id | `tie` | `tie-score` | id 衝突：clothing 初稿以 `tie` 表示「領帶」，本字為「平手」，改用 `tie-score` |

## 退回

無。

## 其他檢查說明

- 同義群組檢查：sport／exercise／workout、game／match／race／tournament、player／athlete 群組合理；新增 run／jog、bike／cycling、diving／snorkeling 群組。fan「球迷」與 spectator「觀眾」中文可區分，未合併。
- 跨分類 id 檢查：run、bike、helmet 與其他分類意思一致；exercise、fan、tie 改用加後綴的 id（見上表）。
- 注意：建置時同一 id 以第一個出現的檔案內容為準，run、bike 的 syn 可能被 emergency／transport 的版本覆蓋，本分類新增的群組在跨分類合併後可能失效。
- yoga 中文「瑜珈」與「瑜伽」在台灣都通行，保留。常見度、例句文法、form 與翻譯其餘皆正確；無題材問題。
