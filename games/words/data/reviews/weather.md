# 審閱紀錄：weather（天氣與季節）

- 審閱日期：2026-10-26
- 來源：`data/draft/weather.json`
- 定稿：`data/words/weather.json`

## 統計

| 項目 | 數量 |
| --- | --- |
| 檢查數量 | 60 |
| 通過（原樣保留） | 55 |
| 修正後通過 | 5 |
| 退回（重寫或替換） | 0 |

常見度分布：level 1 24 個、level 2 24 個、level 3 12 個。

## 修正

- **cool**
  - 原本：syn: ""
  - 修改：syn: "cold"
  - 原因：「涼爽的」與 chilly「涼颼颼的」意思相近，玩家會混淆，補入 cold 群組
- **thunder**
  - 原本：syn: "thunder"
  - 修改：syn: ""
  - 原因：同義群組過度合併：雷聲與閃電中文不同、意思可清楚分辨
- **lightning**
  - 原本：syn: "thunder"；exampleZh: "打閃電時要遠離高大的樹木。"
  - 修改：syn: ""；exampleZh: "有閃電時要遠離高大的樹木。"
  - 原因：同義群組過度合併（同 thunder）；翻譯「打閃電」不是台灣慣用說法
- **cold**
  - 原本：example: "Bring a jacket, it gets cold at night."；exampleZh: "帶件外套，晚上會變冷。"
  - 修改：example: "Bring a jacket because it gets cold at night."；exampleZh: "晚上會變冷，帶件外套吧。"
  - 原因：原例句以逗號連接兩個獨立子句，改為 because
- **umbrella**
  - 原本：example: "Don't forget your umbrella, it might rain."
  - 修改：example: "Don't forget your umbrella. It might rain."
  - 原因：原例句以逗號連接兩個獨立子句，改為兩句

## 退回

無。

## 其他審閱說明

- 同義群組檢查：fall／autumn、sun／sunshine、rain／shower／heavy rain／drizzle、cloudy／overcast、cold／freezing／chilly（加入 cool）、warm／mild、wet／humid、storm／stormy／thunderstorm、typhoon／hurricane 保留。
- shower 在本分類為「陣雨」，與 home 的「淋浴」不同義；temperature 在本分類為「氣溫、溫度」。id 交由 normalize-ids 處理。
