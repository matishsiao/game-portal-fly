# 審閱紀錄：食物（food）

- 審閱日期：2026-10-26
- 來源：`data/draft/food.json`；定稿：`data/words/food.json`
- 檢查數量：60
- 通過（原樣保留）：53
- 修正後通過：7
- 退回（重寫或替換）：0
- 驗證：`node scripts/validate-words.mjs data/words/food.json` 無錯誤

## 修正

| 單字 | 詞性 | 欄位 | 原本 | 修改後 | 原因 |
| --- | --- | --- | --- | --- | --- |
| chicken | n. | id | chicken | chicken-2 | animals 初稿的 chicken（n.）中文為「雞」（動物），本分類為「雞肉」（食物），意思不同不可共用 id；依 normalize-ids 規則後出現者加 -2 |
| fish | n. | zh | 魚、魚肉 | 魚 | 與 animals 初稿的 fish（n.「魚」）同 id，中文統一為「魚」；「魚」本身即涵蓋食用的魚，「魚肉」為多餘 |
| snack | n. | syn |  | dessert | 「點心、零食」與 dessert「甜點」中文相近，玩家容易混淆，應同群組 |
| dessert | n. | syn |  | dessert | 與 snack「點心、零食」中文相近，玩家容易混淆，應同群組 |
| meal | n. | zh | 一餐、餐點 | 餐點 | 與 airport 初稿的 meal（n.「餐點」）同 id，中文統一為「餐點」 |
| sushi | n. | level | 3 | 2 | 壽司為台灣日常極常見的外來詞，常見度應為 2 一般 |
| curry | n. | level | 3 | 2 | 咖哩為台灣日常常見食物，常見度應為 2 一般 |

## 退回

無。所有單字的意思、例句與分類皆正確，不需重寫或替換。

## 跨分類 id 檢查與待協調事項

- animals 初稿的 crab（n.「螃蟹」）與本分類一致，可共用 id。
- hotel 初稿的 breakfast 與本分類一致。
- 同義群組檢查：pancake／waffle（鬆餅／格子鬆餅）保留；新增 snack／dessert。其他如 bread／toast、meat／beef／pork 中文可清楚分辨，不合併。
