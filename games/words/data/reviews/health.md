# 審閱紀錄：health（醫療與藥局）

- 審閱日期：2026-10-26
- 來源：`data/draft/health.json`
- 定稿：`data/words/health.json`

## 統計

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 57 |
| 修正後通過 | 3 |
| 退回（重寫或替換） | 0 |

常見度分布：level 1 24 個、level 2 24 個、level 3 12 個。

## 修正

- **toothache**
  - 原本：example: "I need a dentist, I have a bad toothache."；exampleZh: "我需要看牙醫，我牙痛得很厲害。"
  - 修改：example: "I have a bad toothache, so I need a dentist."；exampleZh: "我牙痛得很厲害，所以需要看牙醫。"
  - 原因：原例句以逗號連接兩個獨立子句，改為 so 連接
- **ambulance**
  - 原本：example: "Call an ambulance, someone fainted!"；exampleZh: "快叫救護車，有人昏倒了！"
  - 修改：example: "Call an ambulance! Someone fainted."；exampleZh: "快叫救護車！有人昏倒了。"
  - 原因：原例句以逗號連接兩個獨立子句，改為兩句
- **well**
  - 原本：zh: "身體好的"
  - 修改：zh: "健康的、舒服的"
  - 原因：「身體好的」用語不自然；例句 I don't feel well 對應「不舒服」，改為「健康的、舒服的」（與 healthy 同群組）

## 退回

無。

## 其他審閱說明

- 同義群組檢查：sick／ill、medicine／pill／tablet、cold／flu、pain／hurt、healthy／well、pharmacy／drugstore、cut／injury、allergy／allergic、throw up／vomit 保留。
- cold 在本分類為名詞「感冒」，與 weather 的形容詞「冷的」詞性不同，id 交由 normalize-ids 處理。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- sick（adj.）：「生病的、不舒服」→「生病的」
- ill（adj.）：「生病的」→「生病的、不舒服」
- hurt（v.）：「痛、弄傷」→「痛、受傷」
- cut（n.）：「割傷、傷口」→「傷口、割傷」
- allergy（n.）：「過敏症」→「過敏」
