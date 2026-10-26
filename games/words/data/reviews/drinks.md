# 審閱紀錄：飲料（drinks）

- 審閱日期：2026-10-26
- 來源：`data/draft/drinks.json`；定稿：`data/words/drinks.json`
- 檢查數量：60
- 通過（原樣保留）：51
- 修正後通過：9
- 退回（重寫或替換）：0
- 驗證：`node scripts/validate-words.mjs data/words/drinks.json` 無錯誤

## 修正

| 單字 | 詞性 | 欄位 | 原本 | 修改後 | 原因 |
| --- | --- | --- | --- | --- | --- |
| thirsty | adj. | id | thirsty | thirsty-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| sweet | adj. | id | sweet | sweet-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| sip | v. | id | sip | sip-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| sugar-free | adj. | id | sugar-free | sugar-free-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| iced | adj. | id | iced | iced-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| beverage | n. | exampleZh | 戲院內禁止攜帶外食飲料。 | 戲院內禁止自行攜帶飲料。 | 原翻譯「禁止攜帶外食飲料」用語不通順 |
| decaf | adj. | id | decaf | decaf-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| non-alcoholic | adj. | id | non-alcoholic | non-alcoholic-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| carbonated | adj. | id | carbonated | carbonated-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |

## 退回

無。所有單字的意思、例句與分類皆正確，不需重寫或替換。

## 跨分類 id 檢查與待協調事項

- verbs 初稿以 `drink`（v.「喝」）為 id，與本分類名詞 `drink`（n.「飲料」）衝突；依 normalize-ids 規則 verbs 應改為 `drink-v`（請 verbs 審閱者處理）。
- weather 初稿的 ice（n.「冰」）與本分類 ice（n.「冰塊」）中文不同；本分類以「冰塊」為飲料情境的正確意思，請 weather 審閱者統一中文或改用 `ice-2`。
- home 初稿的 cup、nature 初稿的 water 與本分類一致；feelings 初稿的 thirsty 應同樣改用 `thirsty-adj`。
- 同義群組檢查：drink／beverage（中文同為「飲料」）、soda／soft drink（同為「汽水」）、cup／glass／mug、wine／red wine、milk tea／bubble tea、smoothie／milkshake、mineral water／bottled water 均保留；alcohol「酒、酒精」與 wine「葡萄酒」中文可分辨，不合併。
