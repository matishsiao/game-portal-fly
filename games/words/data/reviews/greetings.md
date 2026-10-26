# 審閱紀錄：greetings

- 審閱日期：2026-10-26
- 來源：`data/draft/greetings.json`
- 定稿：`data/words/greetings.json`

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 47 |
| 修正後通過 | 13 |
| 退回（重寫或替換） | 0 |

## 修正

### hello（interj.）

- `exampleZh`：`你好，我有用陳的名字訂位。` → `你好，我用陳這個姓氏訂了位。`
- 原因：原翻譯「我有用陳的名字訂位」不通順

### goodbye（interj.）

- `example`：`We said goodbye at the airport.` → `Goodbye, and thanks for everything!`
- `exampleZh`：`我們在機場道別。` → `再見，謝謝你的一切照顧！`
- 原因：原例句 "We said goodbye…" 譯為「道別」，與 zh「再見」用法不一致且與 farewell「道別」重疊；改為直接說再見的例句

### see you（phr.）

- `syn`：`goodbye` → `see-you`
- 原因：goodbye 群組原有 5 個字過大；「回頭見」與「待會見」彼此難分，另成 see-you 群組

### you're welcome（phr.）

- `syn`：`youre-welcome` → （空）
- 原因：no problem／my pleasure／no worries 拆出後群組只剩一個字，清除群組 id

### no problem（phr.）

- `syn`：`youre-welcome` → （空）
- 原因：「沒問題」與「不客氣」中文可明確區分，例句也是「沒問題」的用法，拆出群組

### name（n.）

- `exampleZh`：`請問您貴姓大名？` → `請問怎麼稱呼您？`
- 原因：「貴姓大名」偏問姓氏且較生硬，改為台灣常用的禮貌問法

### see you later（phr.）

- `syn`：`goodbye` → `see-you`
- 原因：同 see you，另成 see-you 群組

### my pleasure（phr.）

- `syn`：`youre-welcome` → （空）
- 原因：「我的榮幸」與「不客氣」中文可明確區分，拆出群組

### good luck（phr.）

- `zh`：`祝好運` → `祝你好運`
- 原因：「祝好運」不自然，台灣常說「祝你好運」

### after you（phr.）

- `exampleZh`：`您先請，請進。` → `您先請，請先走吧。`
- 原因：原翻譯「請進」與 go ahead 意思不符

### appreciate（v.）

- `syn`：（空） → `thank-you`
- 原因：「感謝、感激」與 thanks「謝謝」、thank you「謝謝你」同盤無法分辨，加入 thank-you 群組

### farewell（n.）

- `syn`：`goodbye` → （空）
- 原因：名詞「告別、道別」與 goodbye「再見」、bye「拜拜」可明確區分，拆出群組

### no worries（phr.）

- `syn`：`youre-welcome` → （空）
- 原因：「別在意、沒關係」與「不客氣」中文可明確區分，例句也是「沒關係」的用法，拆出群組

## 退回

無。

## 其他說明

- 保留的同義群組：hello（hello／hi／how do you do）、goodbye（goodbye／bye）、see-you（新設：see you／see you later）、thank-you（thank you／thanks／thanks a lot／appreciate）、sorry（sorry／excuse me／sorry to bother you，台灣「不好意思」兼作道歉）、good-evening（good evening／good night，台灣兩者都常說「晚安」）、nice-to-meet-you（nice to meet you／nice to see you／pleased to meet you）、how-are-you（how are you／how's it going）、manners（manners／courtesy）。
- 固定詞組皆為 phr.，中文為台灣常用說法；good evening「晚上好」雖略偏書面但可理解，且與 good night 同群組不會同盤出現。
- 常見度分布：1 級 24、2 級 24、3 級 12。

