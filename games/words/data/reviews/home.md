# 審閱紀錄：home（家居用品）

- 審閱日期：2026-10-26
- 來源：`data/draft/home.json`
- 定稿：`data/words/home.json`

## 統計

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 56 |
| 修正後通過 | 4 |
| 退回（重寫或替換） | 0 |

常見度分布：level 1 24 個、level 2 24 個、level 3 12 個。

## 修正

- **TV**
  - 原本：exampleZh: "我們昨晚看了電視上的一部電影。"
  - 修改：exampleZh: "我們昨晚在電視上看了一部電影。"
  - 原因：例句翻譯「看了電視上的一部電影」不通順
- **floor**
  - 原本：example: "Please take off your shoes before walking on the floor."；exampleZh: "走上地板前請先脫鞋。"；form: ""
  - 修改：example: "I dropped my phone on the floor."；exampleZh: "我把手機掉在地板上了。"；form: ""
  - 原因：原例句「走上地板前請先脫鞋」語意不自然（本來就走在地板上）
- **curtain**
  - 原本：example: "Please close the curtains, the sun is too bright."
  - 修改：example: "Please close the curtains. The sun is too bright."
  - 原因：原例句兩個獨立子句以逗號相連（comma splice），改為兩句
- **smoke detector**
  - 原本：exampleZh: "我煎魚的時候，煙霧偵測器就會嗶嗶叫。"
  - 修改：exampleZh: "我煮魚的時候，煙霧偵測器就會嗶嗶叫。"
  - 原因：cook 譯為「煎」過度特定，改為「煮」

## 退回

無。

## 其他審閱說明

- 同義群組檢查：sofa／couch（沙發）、closet／wardrobe（衣櫥／衣櫃）、carpet／rug（地毯／小地毯）、bathroom／toilet（共用「廁所」）、lamp／light（共用「燈」）皆為玩家無法分辨的組合，保留。
- table／desk（桌子／書桌）：desk 在口語中也常稱「桌子」，同盤出現時容易混淆，保留同群組。
- light bulb（燈泡）、shower（淋浴、蓮蓬頭）等與其他分類同字不同義的情況，於本分類內意思明確，id 交由 normalize-ids 處理。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- light（n.）：「燈、電燈」→「燈」
- bathroom（n.）：「浴室、廁所」→「浴室」
- air conditioner（n.）：「冷氣機」→「冷氣」
- shower（n.）：「淋浴、蓮蓬頭」→「淋浴」
