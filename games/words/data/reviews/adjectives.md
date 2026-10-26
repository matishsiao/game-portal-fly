# 審閱紀錄：adjectives

- 審閱日期：2026-10-26
- 來源：`data/draft/adjectives.json`
- 定稿：`data/words/adjectives.json`

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 52 |
| 修正後通過 | 8 |
| 退回（重寫或替換） | 0 |

## 修正

### short（adj.）

- `exampleZh`：`走到海灘只要一下子。` → `走一小段路就到海灘了。`
- 原因：原翻譯「只要一下子」未譯出 short walk，改為較貼切的說法

### cheap（adj.）

- `syn`：`cheap` → （空）
- 原因：affordable 拆出後群組只剩一個字，清除群組 id

### convenient（adj.）

- `example`：`The hotel is close to the subway, very convenient.` → `Staying near the subway station is very convenient.`
- `exampleZh`：`旅館離地鐵很近，非常方便。` → `住在地鐵站附近非常方便。`
- 原因：原例句 "…close to the subway, very convenient." 為逗號接續的不完整句，改寫為完整句

### famous（adj.）

- `syn`：`famous` → （空）
- 原因：「有名的」與 popular「受歡迎的」中文可明確區分，解除群組

### popular（adj.）

- `syn`：`famous` → （空）
- 原因：同 famous，解除群組

### enormous（adj.）

- `syn`：`big` → （空）
- 原因：「巨大的」與 big／large「大的」可明確區分，拆出同義群組，避免 big 群組過大

### tiny（adj.）

- `syn`：`small` → （空）
- `exampleZh`：`浴室很小，但很乾淨。` → `浴室非常小，但很乾淨。`
- 原因：「極小的」與 small／little 可明確區分，拆出群組；例句翻譯補出「非常小」的程度

### affordable（adj.）

- `syn`：`cheap` → （空）
- 原因：「負擔得起的」與 cheap「便宜的」可明確區分，拆出群組

## 退回

無。

## 其他說明

- 保留的同義群組：big（big／large，皆含「大的」）、small（small／little）、tall（tall／high，中文同為「高的」）、hard（hard／difficult，皆含「困難的」）、fast（fast／quick）、beautiful（beautiful／pretty）、noisy（noisy／loud，「吵鬧」與「大聲」常混用）。
- 拆出 enormous、tiny、affordable，並解除 famous／popular，避免中文已能區分的字擠在同一群組。
- 常見度分布：1 級 24、2 級 24、3 級 12。


## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- hot（adj.）：「熱的、燙的」→「熱的」
- busy（adj.）：「忙碌的、熱鬧的」→「忙碌的」
- dry（adj.）：「乾的、乾燥的」→「乾燥的」
