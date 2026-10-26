# 審閱紀錄：directions（問路與方向）

審閱日期：2026-10-26　審閱者：審閱 agent

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 55 |
| 修正後通過 | 4 |
| 退回（重寫或替換） | 1 |
| 定稿單字數 | 60 |

常見度分布：level 1 24 個、level 2 24 個、level 3 12 個。

## 修正

### straight（straight）

- 原本：id: "straight"
- 修改：id: "straight-adv"
- 原因：colors-shapes 分類以 id「straight」作形容詞「直的」；本分類為副詞，依規範 id 加詞性後綴。

### corner（corner）

- 原本：syn: ""
- 修改：syn: "corner"
- 原因：與 around the corner「轉角處」中文幾乎相同，玩家會混淆，設為同一同義群組。

### around the corner（around-the-corner）

- 原本：syn: ""
- 修改：syn: "corner"
- 原因：與 corner「轉角」中文幾乎相同，設為同一同義群組。

### downtown（downtown）

- 原本：zh: "在市中心"
- 修改：zh: "市中心"
- 原因：city 分類同一 id 使用「市中心」；「在市中心」不符合例句 get downtown（去市中心）的用法，統一為「市中心」。

## 退回（重寫或替換）

### lost（lost）

- 原本：{"id":"lost","en":"lost","pos":"adj.","zh":"迷路的","syn":"","example":"I think we are lost.","exampleZh":"我想我們迷路了。","form":""}
- 修改：id: "get-lost"；en: "get lost"；pos: "phr."；zh: "迷路"；example: "I think we got lost."；exampleZh: "我想我們迷路了。"；form: "got lost"
- 原因：emergency 分類以同一 id「lost」（形容詞）表示「遺失的」，同 id 同詞性卻是不同意思；改收固定詞組 get lost（迷路）。

## id 規則說明

同一英文字在不同分類以不同詞性出現時，採「名詞用原形 id，其他詞性加詞性後綴（-v、-adj、-adv）」；同 en、同詞性但意思不同時，改收其他詞形或固定詞組，避免一個 id 表示兩個意思。其餘與其他分類初稿共用的 id 已確認 en、pos 一致、意思相同。

## 給其他分類審閱者的提醒

- colors-shapes 的 straight（形容詞）保留原形 id；本分類副詞已改為 straight-adv。
- emergency 的 lost（遺失的）保留 id lost；本分類已改收 get lost。
