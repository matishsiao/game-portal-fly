# 審閱紀錄：emergency（緊急狀況）

審閱日期：2026-10-26　審閱者：審閱 agent

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 56 |
| 修正後通過 | 4 |
| 退回（重寫或替換） | 0 |
| 定稿單字數 | 60 |

常見度分布：level 1 24 個、level 2 24 個、level 3 12 個。

## 修正

### help（help）

- 原本：exampleZh: "救命！有人搶了我的包包！"
- 修改：exampleZh: "救命！有人拿走了我的包包！"
- 原因：took 是「拿走」，譯成「搶」與原文不符。

### safe（safe）

- 原本：id: "safe"
- 修改：id: "safe-adj"
- 原因：hotel 分類以 id「safe」作名詞「保險箱」；依「名詞用原形 id、其他詞性加後綴」原則，形容詞「安全的」改為 safe-adj。

### stop（stop）

- 原本：id: "stop"
- 修改：id: "stop-v"
- 原因：transport 分類以 id「stop」作名詞「站」；動詞「停止、住手」依規範加後綴 -v。

### fall（fall）

- 原本：id: "fall"
- 修改：id: "fall-v"
- 原因：weather 分類以 id「fall」作名詞「秋天」；動詞「跌倒」依規範加後綴 -v。

## 退回（重寫或替換）

無。

## id 規則說明

同一英文字在不同分類以不同詞性出現時，採「名詞用原形 id，其他詞性加詞性後綴（-v、-adj、-adv）」；同 en、同詞性但意思不同時，改收其他詞形或固定詞組，避免一個 id 表示兩個意思。其餘與其他分類初稿共用的 id 已確認 en、pos 一致、意思相同。

## 給其他分類審閱者的提醒

- weather 的 cold（形容詞「冷的」）與本分類／health 的 cold（名詞「感冒」）同 id 不同詞性，建議 weather 改為 cold-adj。
- kitchen 的 cut、burn（動詞）與本分類／health 的名詞同 id，建議改為 cut-v、burn-v。
- health 的 hurt、sick、ill、injury、allergy 與本分類同 id 同詞性，中文略有差異但意思相同，可接受。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- hurt（v.）：「受傷、痛」→「痛、受傷」
- run（v.）：「跑」→「跑步、跑」
- blood（n.）：「血」→「血、血液」
- injury（n.）：「傷害、受傷」→「受傷、傷勢」
