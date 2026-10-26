# 審閱紀錄：職業與工作（jobs）

- 審閱日期：2026-10-26
- 初稿：`data/draft/jobs.json`；定稿：`data/words/jobs.json`
- 檢查數量：60
- 通過（原樣保留）：57
- 修正後通過：3
- 退回（重寫或替換）：0
- 常見度分布：基礎 24／一般 24／進階 12

## 修正

| 單字 | 欄位 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- | --- |
| cook | id | `cook` | `cook-n` | id 衝突：kitchen 初稿以 `cook` 表示動詞「煮、烹飪」，本字為名詞「廚師」，改用 `cook-n` 避免建置時合併成同一字 |
| manager | syn | `boss` | （空） | 同義群組過度合併：manager「經理」是明確職稱，與 boss「老闆、上司」、employer「雇主」不易混淆；保留 boss／employer 同群組（兩者中文都可理解為老闆），manager 移出群組 |
| clerk | zh<br>example<br>exampleZh | `店員、職員`<br>`The hotel clerk gave us a map of the city.`<br>`旅館職員給了我們一張市區地圖。` | `店員`<br>`The clerk helped me find a smaller size.`<br>`店員幫我找到小一號的尺寸。` | 中文「職員」與 employee「員工」容易混淆；改取最常用的「店員」，與 shopping 初稿一致，例句改為商店情境 |

## 退回

無。

## 其他檢查說明

- 同義群組檢查：boss／employer 保留同一群組（中文都可理解為「老闆」）；manager 移出（見上表）。job／work（中文同為「工作」）／occupation、worker／employee、coworker／colleague（中文同為「同事」）、cook／chef、quit／resign、salary／wage 群組完整。
- 跨分類 id 檢查：doctor、nurse、driver、waiter、dentist、pilot、busy、tour-guide、chef、cashier、clerk、salary、uniform、receptionist、deadline、pharmacist 在其他分類初稿中詞性與意思一致，可共用 id（中文寫法略有差異者，如 pilot「飛行員、機師」、busy「忙碌的、熱鬧的」，意思相同）。
- 注意：kitchen 初稿的動詞 cook 使用無後綴的 `cook`，不符合「不同詞性加後綴」的慣例；本分類名詞改用 `cook-n` 以確保不衝突。若 kitchen 審閱時改為 `cook-v`，名詞仍維持 `cook-n` 即可，不必再改。
- 常見度、例句文法、form 與翻譯其餘皆正確；無題材問題。
