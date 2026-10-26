# 審閱紀錄：hotel（旅館住宿）

審閱日期：2026-10-26　審閱者：審閱 agent

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 53 |
| 修正後通過 | 7 |
| 退回（重寫或替換） | 0 |
| 定稿單字數 | 60 |

常見度分布：level 1 24 個、level 2 24 個、level 3 12 個。

## 修正

### hotel（hotel）

- 原本：syn: ""
- 修改：syn: "hotel"
- 原因：與 hostel「青年旅館」都含「旅館」，玩家容易混淆，設為同一同義群組。

### reservation（reservation）

- 原本：zh: "預訂、訂房"；exampleZh: "我用陳的名字訂了房。"
- 修改：zh: "預訂、預約"；exampleZh: "我有訂房，登記的名字是陳。"
- 原因：restaurant 分類使用同一 id（訂位、預約），改為通用的「預訂、預約」；原例句翻譯「用陳的名字」不通順。

### book（book）

- 原本：id: "book"
- 修改：id: "book-v"
- 原因：school 分類的 book 是名詞「書」；動詞「預訂」依規範加詞性後綴 -v。

### check in（check-in）

- 原本：zh: "入住登記"；exampleZh: "三點以後可以辦理入住。"
- 修改：zh: "報到、辦理入住"；exampleZh: "三點以後可以辦理入住。"
- 原因：與 airport 分類同一 id「check-in」，統一中文為「報到、辦理入住」。

### receptionist（receptionist）

- 原本：syn: ""
- 修改：syn: "front-desk"
- 原因：「櫃檯人員」與 front desk「櫃檯」、reception「接待處」容易混淆，併入同一同義群組。

### password（password）

- 原本：exampleZh: "無線網路密碼是什麼？"
- 修改：exampleZh: "Wi-Fi 密碼是什麼？"
- 原因：台灣一般直接說「Wi-Fi 密碼」，「無線網路密碼」較生硬。

### hostel（hostel）

- 原本：syn: ""
- 修改：syn: "hotel"
- 原因：與 hotel「飯店、旅館」容易混淆，設為同一同義群組。

## 退回（重寫或替換）

無。

## id 規則說明

同一英文字在不同分類以不同詞性出現時，採「名詞用原形 id，其他詞性加詞性後綴（-v、-adj、-adv）」；同 en、同詞性但意思不同時，改收其他詞形或固定詞組，避免一個 id 表示兩個意思。其餘與其他分類初稿共用的 id 已確認 en、pos 一致、意思相同。

## 給其他分類審閱者的提醒

- restaurant 的 book（動詞）應同樣改為 id book-v，school 的 book（名詞）保留原形。
- colors-shapes 的 light（形容詞「淺色的」）與本分類的 light（名詞「燈」）同 id 不同詞性，建議改為 light-adj。
- kitchen 的 clean（動詞）與本分類的 clean（形容詞）同 id 不同詞性，建議改為 clean-v。
- weather 的 shower（陣雨）與本分類／home 的 shower（淋浴）同 id 同詞性但意思不同，建議 weather 另用其他字。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- night（n.）：「晚、夜」→「晚上、夜晚」
- shower（n.）：「淋浴、淋浴間」→「淋浴」
- guest（n.）：「房客、客人」→「客人」
- heater（n.）：「暖氣」→「暖氣機、電暖器」
