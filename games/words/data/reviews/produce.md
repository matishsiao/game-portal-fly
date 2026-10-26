# 審閱紀錄：水果與蔬菜（produce）

- 審閱日期：2026-10-26
- 來源：`data/draft/produce.json`；定稿：`data/words/produce.json`
- 檢查數量：60
- 通過（原樣保留）：56
- 修正後通過：4
- 退回（重寫或替換）：0
- 驗證：`node scripts/validate-words.mjs data/words/produce.json` 無錯誤

## 修正

| 單字 | 詞性 | 欄位 | 原本 | 修改後 | 原因 |
| --- | --- | --- | --- | --- | --- |
| fresh | adj. | id | fresh | fresh-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| ripe | adj. | id | ripe | ripe-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| juicy | adj. | id | juicy | juicy-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| organic | adj. | id | organic | organic-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |

## 退回

無。所有單字的意思、例句與分類皆正確，不需重寫或替換。

## 跨分類 id 檢查與待協調事項

- colors-shapes 初稿以 `orange` 為形容詞（「橘色的」）id，與本分類名詞 orange（「柳橙」）衝突；依 normalize-ids 規則 colors-shapes 應改為 `orange-adj`。
- nature 初稿的 seed 為「種子」，本分類為「種子、籽」（水果的籽），中文不同，需全域統一或依規則加 `-2`。
- 同義群組檢查：lemon／lime、potato／sweet potato、carrot／radish（紅／白蘿蔔）、onion／green onion、bean／pea、cabbage／lettuce、cucumber／zucchini、broccoli／cauliflower、bell pepper／chili pepper 均保留，未發現漏列。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- seed（n.）：「種子、籽」→「種子」
