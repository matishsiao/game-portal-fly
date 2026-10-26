# 審閱紀錄：transport（交通運輸）

審閱日期：2026-10-26　審閱者：審閱 agent

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 53 |
| 修正後通過 | 6 |
| 退回（重寫或替換） | 1 |
| 定稿單字數 | 60 |

常見度分布：level 1 23 個、level 2 25 個、level 3 12 個。

## 修正

### ticket（ticket）

- 原本：zh: "車票、票"
- 修改：zh: "票"
- 原因：與 airport、entertainment 同一 id「ticket」，統一為通用的「票」。

### park（park）

- 原本：id: "park"
- 修改：id: "park-v"
- 原因：sightseeing／city 分類的 park 是名詞「公園」；動詞「停車」依規範 id 加後綴 -v。

### passenger（passenger）

- 原本：zh: "乘客"
- 修改：zh: "乘客、旅客"
- 原因：與 airport 同一 id「passenger」，統一中文為「乘客、旅客」。

### transfer（transfer）

- 原本：pos: "v."；zh: "轉車、轉乘"；example: "You need to transfer at Taipei Main Station."；exampleZh: "你需要在台北車站轉車。"；form: ""
- 修改：pos: "n."；zh: "轉乘、轉車"；example: "This ticket includes one free transfer."；exampleZh: "這張票包含一次免費轉乘。"；form: ""
- 原因：money 分類以同一 id「transfer」作動詞「轉帳、匯款」，同 id 同詞性卻是不同意思。改為名詞「轉乘」並重寫例句；money 的動詞版應改用 transfer-v。

### rush hour（rush-hour）

- 原本：exampleZh: "尖峰時間要避開搭地鐵。"
- 修改：exampleZh: "尖峰時間盡量別搭地鐵。"
- 原因：原翻譯「要避開搭地鐵」不通順。

### license（license）

- 原本：example: "You need an international license to drive here."；exampleZh: "在這裡開車需要國際駕照。"
- 修改：example: "You need an international driver's license to drive here."；exampleZh: "在這裡開車需要國際駕照。"
- 原因：「international license」不是自然說法，改為 international driver's license。

## 退回（重寫或替換）

### MRT（mrt）

- 原本：{"id":"mrt","en":"MRT","pos":"n.","zh":"捷運","syn":"subway","example":"Take the MRT to Taipei 101.","exampleZh":"搭捷運到台北101。","form":""}
- 修改：id: "metro"；en: "metro"；pos: "n."；zh: "地鐵"；level: 2；syn: "subway"；example: "The Paris metro is easy to use."；exampleZh: "巴黎的地鐵很好搭。"；form: ""
- 原因：MRT 是縮寫，且主要只在台灣與新加坡使用，國外旅行實用性低；中文「捷運」也與 subway 重複。改收國際通用的 metro（地鐵），與 subway 同一同義群組。

## id 規則說明

同一英文字在不同分類以不同詞性出現時，採「名詞用原形 id，其他詞性加詞性後綴（-v、-adj、-adv）」；同 en、同詞性但意思不同時，改收其他詞形或固定詞組，避免一個 id 表示兩個意思。其餘與其他分類初稿共用的 id 已確認 en、pos 一致、意思相同。

## 給其他分類審閱者的提醒

- money 的 transfer（動詞「轉帳、匯款」）建議改為 id transfer-v；本分類的 transfer 已改為名詞「轉乘」。
- sightseeing／city 的 park 為名詞「公園」，本分類動詞已改為 park-v。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- bike（n.）：「腳踏車」→「腳踏車、自行車」
- schedule（n.）：「時刻表」→「時刻表、行程表」
