# 審閱紀錄：餐廳點餐（restaurant）

- 審閱日期：2026-10-26
- 來源：`data/draft/restaurant.json`；定稿：`data/words/restaurant.json`
- 檢查數量：60
- 通過（原樣保留）：41
- 修正後通過：19
- 退回（重寫或替換）：0
- 驗證：`node scripts/validate-words.mjs data/words/restaurant.json` 無錯誤

## 修正

| 單字 | 詞性 | 欄位 | 原本 | 修改後 | 原因 |
| --- | --- | --- | --- | --- | --- |
| eat | v. | id | eat | eat-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| table | n. | zh | 桌子、餐桌 | 桌子 | 與 home 初稿的 table（n.「桌子」）同 id，中文統一為「桌子」 |
| check | n. | level | 1 | 2 | check 作「帳單」為美式用法，非國中基礎程度，常見度改為 2 |
| hungry | adj. | id | hungry | hungry-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| full | adj. | id<br>zh | full<br>飽的 | full-adj<br>滿的、飽的 | 與 adjectives 初稿的 full（adj.「滿的、飽的」）為同字同詞性同義，中文統一；依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| delicious | adj. | id | delicious | delicious-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| spicy | adj. | id | spicy | spicy-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| share | v. | id<br>zh | share<br>分享、一起吃 | share-v<br>分享、共用 | 「一起吃」不是 share 的詞義，改為最常用意思「分享、共用」（例句翻譯「分著吃」仍正確）；依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| reservation | n. | exampleZh | 我訂了七點兩位。 | 我訂了七點兩位的位子。 | 原翻譯「我訂了七點兩位」語意不完整 |
| book | v. | id<br>zh | book<br>預訂、訂位 | book-v<br>預訂 | 與 hotel、verbs 初稿的 book（v.「預訂」）同字同詞性同義，中文統一為「預訂」；依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| vegetarian | adj. | id | vegetarian | vegetarian-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| allergic | adj. | id | allergic | allergic-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| recommend | v. | id | recommend | recommend-v | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| chef | n. | zh | 主廚、廚師 | 主廚 | 與 jobs 初稿的 chef（n.「主廚」）同 id，中文統一為「主廚」 |
| tasty | adj. | id | tasty | tasty-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| rare | adj. | id | rare | rare-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| well-done | adj. | id | well-done | well-done-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| complimentary | adj. | id<br>zh | complimentary<br>免費招待的 | complimentary-adj<br>免費的、贈送的 | 與 hotel 初稿的 complimentary（adj.「免費的、贈送的」）同字同詞性同義，中文統一；依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |
| gluten-free | adj. | id | gluten-free | gluten-free-adj | 依 scripts/normalize-ids.mjs 的全域 id 規則（名詞與詞組不加後綴，其他詞性加詞性後綴），避免與其他分類同字不同詞性／意思的 id 衝突 |

## 退回

無。所有單字的意思、例句與分類皆正確，不需重寫或替換。

## 跨分類 id 檢查與待協調事項

- verbs 初稿以 `order`、`check`、`eat`、`recommend` 為動詞 id：其中 `order`、`check` 與本分類名詞 id 衝突（order n.「餐點、點單」、check n.「帳單」），verbs 應改為 `order-v`、`check-v`（與本分類 order-v 的 en、pos、zh 一致）；`eat`、`recommend` 應改為 `eat-v`、`recommend-v`。
- money 初稿的 bill 中文為「帳單、紙鈔」，本分類為「帳單」；「紙鈔」是不同意思，建議 money 拆分（或統一為「帳單」），否則依 normalize-ids 規則本分類會變成 `bill-2`。
- hotel 初稿的 reservation 為「預訂、訂房」，本分類為「訂位、預約」（餐廳情境不能用「訂房」），中文不同，需全域統一或依規則加 `-2`。
- shopping 初稿的 counter 寫「櫃台」，本分類為「櫃檯」，用字需統一；shopping 的 complimentary 為「免費贈送的」，與本分類及 hotel 的「免費的、贈送的」不同。
- money 初稿的 tip、service charge，jobs 的 waiter、cashier，airport 的 seat，health 的 allergic，city 的 restaurant 均與本分類一致（形容詞與動詞 id 依規則加後綴）。
- 同義群組檢查：waiter／waitress、bill／check、delicious／tasty、reservation／book、takeout／to go、for here／dine in、set meal／combo、side dish／appetizer、rare／well-done 均保留，未發現漏列。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- order（v.）：「點餐、訂購」→「點餐」
- reservation（n.）：「訂位、預約」→「預訂、預約」
