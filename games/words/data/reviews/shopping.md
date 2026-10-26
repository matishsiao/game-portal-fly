# 審閱紀錄：購物與商店（shopping）

- 審閱日期：2026-10-26
- 初稿：`data/draft/shopping.json`；定稿：`data/words/shopping.json`
- 檢查數量：60
- 通過（原樣保留）：38
- 修正後通過：22
- 退回（重寫或替換）：0
- 定稿數量：60；常見度分布：1 基礎 25、2 一般 24、3 進階 11
- 驗證：`node scripts/validate-words.mjs data/words/shopping.json` 無錯誤

## 修正

| 單字 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- |
| shop | zh: "商店、店" | zh: "店、小店" | 與 city 初稿同 id（shop），中文統一為「店、小店」，避免同一 id 有兩種中文。 |
| cheap | syn: "" | syn: "cheap" | 與 bargain（便宜貨）易混淆，新增 cheap 群組。 |
| expensive | example: "Shoes in the airport are really expensive." | example: "Shoes at the airport are really expensive." | 介系詞不自然：in the airport 改為 at the airport。 |
| bag | zh: "袋子、包包" | zh: "包包、袋子" | 與 airport 初稿同 id，中文統一為「包包、袋子」。 |
| supermarket | zh: "超市" | zh: "超市、超級市場" | 與 city 初稿同 id，中文統一為「超市、超級市場」。 |
| mall | zh: "購物中心、商場" | zh: "購物中心" | 與 city 初稿同 id，中文統一為「購物中心」（「商場」為贅詞）。 |
| open | zh: "營業中的、開著的" | zh: "開放的、營業中" | 與 sightseeing 初稿同 id（open, adj.），中文統一為「開放的、營業中」。 |
| choose | zh: "選擇、挑選" | zh: "選擇" | 與 verbs 初稿同 id（choose, v.），中文統一為「選擇」。 |
| line | zh: "隊伍、排隊的行列" | zh: "隊伍" | 「排隊的行列」冗贅；與 airport 初稿同 id，中文統一為「隊伍」。 |
| customer | level: 2 | level: 1 | customer 為國中基礎字，常見度由 2 改為 1。 |
| clerk | zh: "店員" | zh: "店員、職員" | 與 jobs 初稿同 id，中文統一為「店員、職員」。 |
| bargain | syn: "" | syn: "cheap" | 「便宜貨」與 cheap「便宜的」易混淆，與 cheap 同列 cheap 群組。 |
| aisle | zh: "走道、貨架通道"<br>level: 3 | zh: "走道"<br>level: 2 | 與 airport 初稿同 id，中文統一為「走道」；aisle 為高中常見字，常見度 3 改為 2。 |
| return | id: "return"<br>zh: "退貨、歸還" | id: "return-goods"<br>zh: "退貨" | verbs 初稿的 return 為「歸還、返回」，本分類例句是購物退貨的意思，不同意思不可共用 id，改為 return-goods，中文只保留「退貨」。 |
| exchange | id: "exchange"<br>zh: "換貨、交換" | id: "exchange-goods"<br>zh: "換貨" | verbs 初稿的 exchange 為「兌換、交換」，本分類例句是購物換貨的意思，改為 exchange-goods，中文只保留「換貨」。 |
| counter | zh: "櫃台"<br>exampleZh: "請在櫃台等候您的商品。" | zh: "櫃檯"<br>exampleZh: "請在櫃檯等候您的商品。" | 與 restaurant 初稿同 id，中文統一為「櫃檯」，例句翻譯同步。 |
| price tag | zh: "價格標籤、價目牌" | zh: "價格標籤、標價" | 「價目牌」指價目表看板，與 price tag 不同；改為「價格標籤、標價」。 |
| deliver | zh: "送貨、配送" | zh: "遞送、送貨" | 與 verbs 初稿同 id（deliver, v.），中文統一為「遞送、送貨」。 |
| outlet | id: "outlet"<br>zh: "暢貨中心、過季商品店" | id: "outlet-store"<br>zh: "暢貨中心" | home 初稿的 outlet 為「插座」（同 n.），不同意思不可共用 id，改為 outlet-store；「過季商品店」冗贅刪除。 |
| loyalty card | syn: "" | syn: "membership" | 「會員集點卡」與 membership「會員資格」易混淆，新增 membership 群組。 |
| membership | syn: "" | syn: "membership" | 與 loyalty card 易混淆，新增 membership 群組。 |
| complimentary | zh: "免費贈送的" | zh: "免費的、贈送的" | 與 hotel、restaurant 初稿同 id，中文統一為 hotel 版本「免費的、贈送的」。 |

## 退回

無。

## 備註

- 同義群組檢查：cashier／clerk（收銀員／店員）保留同群組，因為收銀員本身就是店員，玩家可能把 cashier 配到「店員」；checkout／counter（結帳處／櫃檯）保留同群組，因為英文常說 pay at the counter，配對時答案可能不唯一。mall／department store 保留同群組（台灣常把購物中心與百貨公司混稱）。新增 cheap／bargain、loyalty card／membership 兩組。
- 跨分類 id：open（adj.）與 sightseeing 一致；verbs 初稿的 open 為動詞，建議 verbs 改用 open-v。complimentary 統一為 hotel 版本「免費的、贈送的」，restaurant 初稿為「免費招待的」，需由 restaurant 審閱時一併統一。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- clerk（n.）：「店員、職員」→「店員」
