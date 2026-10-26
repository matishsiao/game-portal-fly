# 審閱紀錄：airport（機場與飛行）

審閱日期：2026-10-26　審閱者：審閱 agent

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 52 |
| 修正後通過 | 6 |
| 退回（重寫或替換） | 2 |
| 定稿單字數 | 60 |

常見度分布：level 1 24 個、level 2 24 個、level 3 12 個。

## 修正

### ticket（ticket）

- 原本：zh: "票、機票"
- 修改：zh: "票"
- 原因：transport、entertainment 也使用同一個 id「ticket」，建置時以第一個分類檔的內容為準；改為通用的「票」，避免在交通分類顯示「機票」。

### pilot（pilot）

- 原本：exampleZh: "機長歡迎大家登機。"
- 修改：exampleZh: "機師歡迎大家搭乘本班機。"
- 原因：例句翻譯把 pilot 譯成「機長」並把 on board 譯成「登機」，與原文不符。

### early（early）

- 原本：pos: "adj."；zh: "早的"
- 修改：pos: "adv."；zh: "早、提早"
- 原因：例句 get to the airport early 中 early 是副詞；且 time 分類以同一 id「early」作副詞，改為一致的詞性與中文。

### suitcase（suitcase）

- 原本：syn: ""
- 修改：syn: "luggage"
- 原因：「行李箱」與 luggage／baggage「行李」容易混淆，併入同一同義群組。

### check in（check-in）

- 原本：zh: "報到、辦理登機"；exampleZh: "我們需要提早兩小時辦理登機。"
- 修改：zh: "報到、辦理入住"；exampleZh: "我們需要提早兩小時辦理報到。"
- 原因：hotel 分類使用同一 id「check-in」（入住登記），兩分類中文不一致；統一為涵蓋機場與旅館兩種情境的「報到、辦理入住」。

### overhead bin（overhead-bin）

- 原本：zh: "頭頂置物櫃"；exampleZh: "把你的外套放進頭頂置物櫃。"
- 修改：zh: "上方置物櫃"；exampleZh: "把你的外套放進上方置物櫃。"
- 原因：「頭頂置物櫃」非台灣常用說法，機上廣播多說「上方置物櫃」。

## 退回（重寫或替換）

### line（line）

- 原本：{"id":"line","en":"line","pos":"n.","zh":"隊伍","syn":"","example":"The line at security is very long.","exampleZh":"安檢的隊伍很長。","form":""}
- 修改：id: "line-up"；en: "line up"；pos: "phr."；zh: "排隊"；example: "Please line up here for the security check."；exampleZh: "安檢請在這裡排隊。"；form: ""
- 原因：id「line」在 colors-shapes 分類表示「線、線條」（同為名詞、意思不同），同一 id 不能表示不同意思；改收同樣實用的固定詞組 line up（排隊）。

### take off（take-off）

- 原本：{"id":"take-off","en":"take off","pos":"phr.","zh":"起飛","syn":"","example":"The plane will take off soon.","exampleZh":"飛機很快就要起飛了。","form":""}
- 修改：id: "takeoff"；en: "takeoff"；pos: "n."；zh: "起飛"；example: "Please turn off your phone before takeoff."；exampleZh: "起飛前請將手機關機。"；form: ""
- 原因：id「take-off」在 clothing 分類是 take off（脫掉），en 與詞性相同但意思不同，無法以詞性後綴區分；改用名詞 takeoff（起飛）。

## id 規則說明

同一英文字在不同分類以不同詞性出現時，採「名詞用原形 id，其他詞性加詞性後綴（-v、-adj、-adv）」；同 en、同詞性但意思不同時，改收其他詞形或固定詞組，避免一個 id 表示兩個意思。其餘與其他分類初稿共用的 id 已確認 en、pos 一致、意思相同。

## 給其他分類審閱者的提醒

- colors-shapes 的 line（線）與 shopping 的 line（隊伍）同 id 同詞性但意思不同，建議其中一方改用其他字。
- clothing 的 take off（脫掉）保留 id take-off 即可；本分類已改用 takeoff。
- time 的 early（副詞）與本分類一致。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- pilot（n.）：「飛行員、機師」→「機師、飛行員」
- late（adj.）：「遲到的、晚的」→「晚的、遲到的」
- travel（v.）：「旅行、旅遊」→「旅行」
- arrive（v.）：「抵達、到達」→「抵達」
- leave（v.）：「離開、出發」→「離開」
- toilet（n.）：「廁所」→「馬桶、廁所」
