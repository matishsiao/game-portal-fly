# 審閱紀錄：廚房與烹飪（kitchen）

- 審閱日期：2026-10-26
- 來源：`data/draft/kitchen.json`；定稿：`data/words/kitchen.json`
- 檢查數量：60
- 通過（原樣保留）：31
- 修正後通過：29
- 退回（重寫或替換）：0
- 驗證：`node scripts/validate-words.mjs data/words/kitchen.json` 無錯誤

## 修正

| 單字 | 詞性 | 欄位 | 原本 | 修改後 | 原因 |
| --- | --- | --- | --- | --- | --- |
| cook | v. | id | cook | cook-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| sweet | adj. | id | sweet | sweet-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| salty | adj. | id | salty | salty-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| sour | adj. | id | sour | sour-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| bitter | adj. | id | bitter | bitter-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| spicy | adj. | id | spicy | spicy-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| taste | v. | id | taste | taste-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| wash | v. | id | wash | wash-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| clean | v. | id | clean | clean-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| cut | v. | id | cut | cut-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| boil | v. | id | boil | boil-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| fry | v. | id | fry | fry-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| bake | v. | id | bake | bake-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| mix | v. | id | mix | mix-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| oven | n. | syn | oven |  | oven「烤箱」與 microwave「微波爐」玩家可清楚分辨，同義群組過度合併 |
| microwave | n. | syn | oven |  | 與 oven「烤箱」可清楚分辨，同義群組過度合併 |
| rice cooker | n. | zh | 電鍋 | 電子鍋、電鍋 | rice cooker 最精確的台灣用語是「電子鍋」，「電鍋」為大同電鍋類，兩者並列 |
| chop | v. | id | chop | chop-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| peel | v. | id | peel | peel-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| stir | v. | id | stir | stir-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| pour | v. | id | pour | pour-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| heat | v. | id | heat | heat-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| steam | v. | id | steam | steam-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| grill | v. | id | grill | grill-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| burn | v. | id | burn | burn-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| stir-fry | v. | id | stir-fry | stir-fry-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| simmer | v. | id | simmer | simmer-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| marinate | v. | id | marinate | marinate-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| thaw | v. | id | thaw | thaw-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |

## 退回

無。所有單字的意思、例句與分類皆正確，不需重寫或替換。

## 跨分類 id 檢查與待協調事項

- emergency、health 初稿的 cut 為名詞（「傷口、割傷」）、emergency 的 burn 為名詞、jobs 的 cook 為名詞（「廚師」）、weather 的 heat 為名詞、adjectives／hotel 的 clean 為形容詞；本分類對應動詞已改為 `cut-v`、`burn-v`、`cook-v`、`heat-v`、`clean-v`，不再衝突。
- home 初稿的 sink 為「水槽、洗手台」，本分類為「水槽」（廚房情境），中文不同，需全域統一或依規則加 `-2`。
- restaurant 的 bowl、spicy 與本分類一致；drinks 的 sweet 與本分類一致（皆改為 `sweet-adj`）。
- 同義群組檢查：pot／pan／wok、fridge／refrigerator／freezer、wash／clean、cut／chop、boil／simmer、fry／stir-fry、bake／grill、mix／stir、sauce／seasoning、spatula／ladle 保留；oven／microwave 拆開（過度合併）。
