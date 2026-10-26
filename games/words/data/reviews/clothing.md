# 審閱紀錄：衣物與配件（clothing）

- 審閱日期：2026-10-26
- 初稿：`data/draft/clothing.json`；定稿：`data/words/clothing.json`
- 檢查數量：60
- 通過（原樣保留）：52
- 修正後通過：8
- 退回（重寫或替換）：0
- 定稿數量：60；常見度分布：1 基礎 25、2 一般 23、3 進階 12
- 驗證：`node scripts/validate-words.mjs data/words/clothing.json` 無錯誤

## 修正

| 單字 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- |
| socks | syn: "" | syn: "socks" | socks「襪子」與 stockings「絲襪」易混淆，新增 socks 群組。 |
| take off | id: "take-off"<br>level: 2 | id: "take-off-clothes"<br>level: 1 | airport 初稿的 take off 為「起飛」（同 phr.），不同意思不可共用 id，改為 take-off-clothes；脫衣服的 take off 為基礎片語，常見度 2 改為 1。 |
| slippers | zh: "拖鞋、室內拖鞋" | zh: "拖鞋" | 與 hotel 初稿同 id，中文統一為「拖鞋」。 |
| tie | id: "tie" | id: "tie-necktie" | sports 初稿的 tie 為「平手」（同 n.），不同意思不可共用 id，改為 tie-necktie。 |
| button | id: "button" | id: "button-clothes" | tech 初稿的 button 為「按鈕」（同 n.），不同意思不可共用 id，改為 button-clothes。 |
| stockings | syn: "" | syn: "socks" | 與 socks 易混淆，同列 socks 群組。 |
| accessory | syn: "" | syn: "jewelry" | 「配件、飾品」與 jewelry「珠寶、首飾」易混淆，新增 jewelry 群組。 |
| jewelry | syn: "" | syn: "jewelry" | 與 accessory 易混淆，同列 jewelry 群組。 |

## 退回

無。

## 備註

- 同義群組檢查：coat／jacket、hat／cap、shirt／blouse、sweater／cardigan、wear／put on 原群組合理；新增 socks／stockings、accessory／jewelry 兩組。
- 跨分類 id：watch（n. 手錶）保留原 id；verbs 初稿的 watch 為動詞，建議 verbs 改用 watch-v。
