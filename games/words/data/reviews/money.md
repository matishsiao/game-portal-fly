# 審閱紀錄：金錢與付款（money）

- 審閱日期：2026-10-26
- 初稿：`data/draft/money.json`；定稿：`data/words/money.json`
- 檢查數量：60
- 通過（原樣保留）：40
- 修正後通過：20
- 退回（重寫或替換）：0
- 定稿數量：60；常見度分布：1 基礎 24、2 一般 24、3 進階 12
- 驗證：`node scripts/validate-words.mjs data/words/money.json` 無錯誤

## 修正

| 單字 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- |
| money | syn: "" | syn: "money" | money「錢」與 cash「現金」玩家易混淆，新增 money 群組。 |
| cash | syn: ""<br>example: "Does this taxi accept cash only?" | syn: "money"<br>example: "Does this taxi only accept cash?" | 與 money 同群組；例句語序 accept cash only 改為較自然的 only accept cash。 |
| coin | syn: "" | syn: "coin" | coin「硬幣、銅板」與 change「零錢」易混淆，新增 coin 群組。 |
| pay | zh: "付錢、支付" | zh: "付錢" | 與 verbs 初稿同 id（pay, v.），中文統一為「付錢」。 |
| cost | zh: "價錢為、花費" | zh: "花費、要價" | 「價錢為」不是自然的中文釋義，改為「花費、要價」。 |
| change | syn: "" | syn: "coin" | 與 coin 易混淆，同列 coin 群組。 |
| free | zh: "免費的" | zh: "免費的、自由的" | 與 adjectives 初稿同 id（free, adj.），中文統一為「免費的、自由的」。 |
| save | id: "save" | id: "save-money" | tech 初稿的 save 為「儲存、存檔」（同 v.），不同意思不可共用 id，改為 save-money。 |
| wallet | zh: "皮夾、錢包"<br>syn: "wallet" | zh: "錢包、皮夾"<br>syn: "" | 與 emergency 初稿同 id，中文統一為「錢包、皮夾」；本分類沒有其他同群組字，群組清空。 |
| bill | zh: "帳單、紙鈔"<br>syn: "bill" | zh: "帳單"<br>syn: "bill" | 原本「帳單、紙鈔」一個 id 混用兩個意思，且 restaurant 初稿的 bill 為「帳單」；統一為「帳單」，「紙鈔」改由 banknote 表示。invoice 與帳單易混淆，同列 bill 群組。 |
| borrow | zh: "借入、向人借" | zh: "借用、借入" | 與 verbs 初稿同 id，中文統一為「借用、借入」（「向人借」冗贅）。 |
| lend | zh: "借出、借給" | zh: "借給、借出" | 與 verbs 初稿同 id，中文統一為「借給、借出」。 |
| total | zh: "總額、總計" | zh: "總數、總計" | 與 numbers 初稿同 id（total, n.），中文統一為「總數、總計」。 |
| deposit | zh: "押金、訂金" | zh: "押金" | 與 hotel 初稿同 id，中文統一為「押金」（例句為押金意思）。 |
| banknote | syn: "bill" | syn: "" | bill 已改為只表示「帳單」，banknote（紙鈔）不再與 bill 同群組。 |
| transfer | id: "transfer" | id: "transfer-money" | transport 初稿的 transfer 為「轉車、轉乘」（同 v.），不同意思不可共用 id，改為 transfer-money。 |
| account | id: "account" | id: "account-bank" | tech 初稿的 account 為「帳號、帳戶」（網路帳號），與銀行帳戶意思不同，改為 account-bank。 |
| mobile payment | syn: "" | syn: "payment" | 「行動支付」與 contactless payment「感應支付」易混淆，新增 payment 群組。 |
| invoice | syn: "" | syn: "bill" | 「請款單、發票」與 bill「帳單」易混淆，同列 bill 群組。 |
| contactless payment | syn: "" | syn: "payment" | 與 mobile payment 易混淆，同列 payment 群組。 |

## 退回

無。

## 備註

- 同義群組檢查：fee／charge／service charge／commission 保留同群組（費用、收費、服務費、手續費在付款情境中容易互配）；borrow／lend、pay back／repay、cost／spend／expense 保留。新增 money／cash、coin／change、bill／invoice、mobile payment／contactless payment 四組；bill 改為只表示「帳單」後，banknote（紙鈔）移出群組。
- 跨分類 id：change（n.）保留原 id；verbs 初稿的 change 為動詞，依 park／park-v 規則建議 verbs 改用 change-v。
