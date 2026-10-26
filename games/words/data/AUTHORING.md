# 英文單字連線：詞庫撰寫與審閱規範

本規範同時給撰寫 agent 與審閱 agent 使用。規格見 `games/words/spec.md` 的「詞庫」一節。

## 檔案

- 分類清單：`data/categories.json`（34 個分類，`id` 不可更改）。
- 撰寫初稿：`data/draft/<分類 id>.json`。
- 審閱後定稿：`data/words/<分類 id>.json`（只有審閱 agent 會寫這裡）。
- 審閱紀錄：`data/reviews/<分類 id>.md`。
- 驗證：`node scripts/validate-words.mjs <檔案>`，必須沒有任何錯誤。

## 每個分類的內容

- **每個分類 60 個單字**（至少 50 個），單字在分類內不可重複。
- 常見度分布約為：`level` 1 基礎 40%、2 一般 40%、3 進階 20%。
  - 1 基礎：台灣國中程度、日常最常用（如 *water*, *bus*, *hot*）。
  - 2 一般：高中程度、生活中常見（如 *luggage*, *receipt*, *pharmacy*）。
  - 3 進階：較少見但出國時實用（如 *itinerary*, *customs declaration*, *prescription*）。
- 以**出國旅行與日常生活實用**為優先；避免冷僻字、俚語、髒話，以及政治、宗教、暴力、歧視性題材。
- 可以收錄固定詞組（如 *boarding pass*, *check out*），但不收錄完整句子。

## 每個單字的欄位（JSON 物件）

```json
{
  "id": "boarding-pass",
  "en": "boarding pass",
  "pos": "n.",
  "zh": "登機證",
  "categories": ["airport"],
  "level": 2,
  "syn": "",
  "example": "Please show your boarding pass at the gate.",
  "exampleZh": "請在登機門出示您的登機證。",
  "form": ""
}
```

| 欄位 | 規則 |
| --- | --- |
| `id` | `en` 轉小寫、空格與撇號改為連字號（`boarding-pass`、`dont`），**名詞與固定詞組不加後綴，其他詞性一律加後綴**：`-v`、`-adj`、`-adv`、`-num`、`-prep`、`-pron`、`-conj`、`-det`、`-interj`（例如 `park` 名詞、`park-v` 動詞、`light-adj` 形容詞）。同一個英文與詞性在不同分類有不同意思時加 `-2`。審閱後由 `scripts/normalize-ids.mjs` 統一檢查與修正。只能有小寫英文、數字與連字號。 |
| `en` | 美式拼寫；一般小寫，專有名詞或星期、月份等首字母大寫（`Monday`）。只能有英文字母、空格、連字號、撇號。 |
| `pos` | `n.`、`v.`、`adj.`、`adv.`、`prep.`、`conj.`、`pron.`、`num.`、`det.`、`interj.`、`phr.`（固定詞組） 其中之一。 |
| `zh` | **台灣用語、繁體中文**，12 字以內；取最常用的 1～2 個意思，兩個意思以「、」分隔（如「票、車票」）。不要寫詞性、不要寫括號說明。 |
| `categories` | 陣列，第一個必須是本檔的分類；如果這個字也很適合其他分類，可以再加（必須是分類清單中的 id）。 |
| `level` | 1、2、3。 |
| `syn` | 同義群組 id：**同一分類中**意思相近、玩家會混淆的單字（如 *big*／*large*、*taxi*／*cab*、*fall*／*autumn*）填相同的 id（小寫英文與連字號，例如 `big`）；沒有就填空字串。中文意思完全相同的兩個字一定要填同一個群組。 |
| `example` | 自然的生活例句，**15 個英文單字以內**，必須包含該單字；以旅行與日常情境為主。 |
| `exampleZh` | 例句的通順中文翻譯（台灣用語）。 |
| `form` | 例句中該單字以**變化形**出現時，填例句中實際出現的字（如 *buy* 的例句用 *bought*，填 `"bought"`；名詞複數 *tickets* 填 `"tickets"`）；例句中是原形時填空字串。 |

## 撰寫 agent 的工作

- 依指派的分類，各寫 60 個單字到 `data/draft/<分類 id>.json`（JSON 陣列，UTF-8，縮排 2 格）。
- 每寫完一個檔案就執行 `node scripts/validate-words.mjs data/draft/<分類 id>.json`，修到沒有錯誤。
- 內容須**原創撰寫**，不得複製字典、教材或出版品的解釋與例句。

## 審閱 agent 的工作

- 審閱 agent **不是撰寫者**，只依本規範判斷，對每一個單字逐筆檢查：
  1. 中文意思正確、為台灣用語與繁體中文、是最常用的意思（例：*subway* →「地鐵、捷運」；*parking lot* →「停車場」）。
  2. 詞性正確；分類合理；常見度合理。
  3. 例句文法正確、自然、確實用到這個單字的這個意思；`form` 與例句一致；例句翻譯正確通順。
  4. 同義群組完整：同一分類中會混淆的單字是否在同一群組；中文相同者是否同群組。
  5. 符合題材限制；沒有與本分類無關的字。
- 結果：
  - **通過**：原樣保留。
  - **修正後通過**：小錯直接修正（中文用詞、例句文法、詞性、群組等）。
  - **退回**：問題太大（意思錯誤、例句不自然需重寫、與分類無關）時，可直接重寫一個正確的版本，或換成同分類更適合的單字，並在紀錄中註明。
- 審閱完成後：
  - 把結果寫到 `data/words/<分類 id>.json`，每個單字加上 `"reviewed": true`；確保仍有 60 個（至少 50 個）。
  - 執行 `node scripts/validate-words.mjs data/words/<分類 id>.json`，必須沒有錯誤。
  - 寫審閱紀錄 `data/reviews/<分類 id>.md`：檢查數量、通過數、修正數、退回（重寫或替換）數，並逐一列出修正與退回的單字、原本內容、修改內容與原因。
