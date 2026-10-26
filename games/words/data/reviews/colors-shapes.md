# 審閱紀錄：顏色與形狀（colors-shapes）

- 審閱日期：2026-10-26
- 初稿：`data/draft/colors-shapes.json`；定稿：`data/words/colors-shapes.json`
- 檢查數量：60
- 通過（原樣保留）：43
- 修正後通過：16
- 退回（重寫或替換）：1
- 定稿數量：60；常見度分布：1 基礎 24、2 一般 24、3 進階 12
- 驗證：`node scripts/validate-words.mjs data/words/colors-shapes.json` 無錯誤

## 修正

| 單字 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- |
| orange | id: "orange" | id: "orange-adj" | produce 初稿的 orange 為名詞「柳橙」，本分類為形容詞，依規則加詞性後綴 orange-adj。 |
| color | syn: "" | syn: "color" | color「顏色」與 shade「色調」易混淆，新增 color 群組。 |
| circle | syn: "" | syn: "round" | circle「圓形、圓圈」與 round「圓的、圓形的」易混淆，新增 round 群組。 |
| square | id: "square" | id: "square-shape" | city 初稿的 square 為「廣場」（同 n.），不同意思不可共用 id，改為 square-shape。 |
| star | id: "star" | id: "star-shape" | entertainment 初稿的 star 為「明星」（同 n.），不同意思不可共用 id，改為 star-shape。 |
| heart | id: "heart"<br>zh: "心形" | id: "heart-shape"<br>zh: "心形、愛心" | body 初稿的 heart 為「心臟」（同 n.），改為 heart-shape；例句翻譯用「愛心」，中文補上「愛心」。 |
| line | id: "line" | id: "line-shape" | airport、shopping 的 line 為「隊伍」（同 n.），不同意思不可共用 id，改為 line-shape。 |
| round | syn: "" | syn: "round" | 與 circle 易混淆，同列 round 群組。 |
| dark | id: "dark"<br>zh: "深色的、暗的" | id: "dark-color"<br>zh: "深色的" | adjectives 初稿的 dark 為「暗的、黑暗的」，本分類是顏色深淺的意思（例句 dark blue），改為 dark-color，中文只保留「深色的」。 |
| light | id: "light" | id: "light-color" | home、hotel 初稿的 light 為名詞「燈」，adjectives 初稿的 light 為形容詞「輕的」，本分類是顏色「淺色的」意思，不可共用 id，改為 light-color。 |
| straight | id: "straight" | id: "straight-adj" | directions 初稿的 straight 為副詞「直走」，本分類為形容詞，依規則加詞性後綴 straight-adj。 |
| cube | exampleZh: "把豆腐切成小塊。" | exampleZh: "把豆腐切成小方塊。" | 例句翻譯「小塊」未譯出 cube 的「方塊」意思。 |
| polka dot | pos: "adj."<br>zh: "圓點花紋的"<br>example: "She bought a polka dot umbrella."<br>exampleZh: "她買了一把圓點花紋的傘。"<br>form: "" | pos: "n."<br>zh: "圓點花紋"<br>example: "I love the polka dots on this dress."<br>exampleZh: "我很喜歡這件洋裝上的圓點花紋。"<br>form: "polka dots" | polka dot 為名詞（作形容詞時應寫成 polka-dot），原例句為名詞修飾用法；改為名詞詞性、中文與例句。 |
| bright | id: "bright"<br>zh: "鮮豔的、明亮的"<br>syn: "" | id: "bright-color"<br>zh: "鮮豔的"<br>syn: "colorful" | adjectives 初稿的 bright 為「明亮的」，本分類是顏色鮮豔的意思，改為 bright-color，中文只保留「鮮豔的」；與 colorful「色彩繽紛的」易混淆，新增 colorful 群組。 |
| colorful | syn: "" | syn: "colorful" | 與 bright 易混淆，同列 colorful 群組。 |
| shade | syn: "" | syn: "color" | 與 color 易混淆，同列 color 群組。 |

## 退回

| 單字 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- |
| corner | id: "corner"<br>zh: "角、轉角"<br>example: "The café is on the corner."<br>exampleZh: "咖啡店就在轉角。"<br>form: "" | id: "corner-shape"<br>zh: "角"<br>example: "A square has four corners."<br>exampleZh: "正方形有四個角。"<br>form: "corners" | 原例句「咖啡店就在轉角」是街道轉角的意思，屬於 city／directions，與本分類（形狀）無關，且與 city、directions 初稿 corner（轉角）同 id 不同意思。重寫為幾何「角」的意思與例句，id 改為 corner-shape。 |

## 備註

- 同義群組檢查：light／pale、dot／polka dot 原群組合理；新增 circle／round、color／shade、bright／colorful 三組。
- 跨分類 id：與其他分類同字不同義的 square、star、heart、line、corner 改用意思後綴；與其他分類不同詞性或不同意思的形容詞 orange、straight 加詞性後綴，light、dark、bright 改用 -color 後綴（adjectives 初稿已有 light「輕的」、dark「暗的」、bright「明亮的」）。
