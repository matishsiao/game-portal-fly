# 審閱紀錄：科技與網路（tech）

- 審閱日期：2026-10-26
- 初稿：`data/draft/tech.json`；定稿：`data/words/tech.json`
- 檢查數量：60
- 通過（原樣保留）：48
- 修正後通過：12
- 退回（重寫或替換）：0
- 常見度分布：基礎 24／一般 24／進階 12

## 修正

| 單字 | 欄位 | 原本內容 | 修改內容 | 原因 |
| --- | --- | --- | --- | --- |
| call | syn | （空） | `phone` | call「打電話」與 phone「電話、手機」中文重疊，玩家容易混淆，加入 phone 群組 |
| internet | syn | （空） | `internet` | internet「網路」、Wi-Fi「無線網路」、online「在網路上」中文重疊，原本沒有同義群組，新增 internet 群組 |
| Wi-Fi | syn | （空） | `internet` | 同上，加入 internet 群組 |
| online | syn | （空） | `internet` | 同上，加入 internet 群組 |
| mouse | id | `mouse` | `mouse-computer` | id 衝突：animals 初稿以 `mouse` 表示「老鼠」，本字為「滑鼠」，改用 `mouse-computer` |
| button | id | `button` | `button-push` | id 衝突：clothing 初稿以 `button` 表示「鈕扣」，本字為「按鈕」，改用 `button-push` |
| account | id<br>zh<br>syn | `account`<br>`帳號、帳戶`<br>（空） | `account-online`<br>`帳號`<br>`account` | id 衝突：money 初稿以 `account` 表示銀行「帳戶」，本字在科技分類是「帳號」，改用 `account-online` 並只保留「帳號」；另與 username「使用者名稱」（台灣介面常稱帳號）易混淆，新增 account 群組 |
| username | syn | （空） | `account` | 與 account「帳號」易混淆，加入 account 群組 |
| save | id | `save` | `save-file` | id 衝突：money 初稿以 `save` 表示「存錢、省錢」，本字為「儲存、存檔」，改用 `save-file` |
| folder | example<br>exampleZh | `I put all my travel tickets in one folder.`<br>`我把所有旅行票券放在同一個資料夾。` | `Save the photos in a new folder.`<br>`把照片存到新的資料夾。` | 原例句「把旅行票券放在資料夾」是實體文件夾，不是電腦資料夾的意思，重寫例句 |
| tablet | id | `tablet` | `tablet-device` | id 衝突：health 初稿以 `tablet` 表示「藥片」，本字為「平板電腦」，改用 `tablet-device` |
| hotspot | zh | `熱點、無線熱點` | `熱點、行動熱點` | 原「無線熱點」與 Wi-Fi「無線網路」字面相近；例句是手機分享網路，台灣常稱「行動熱點」 |

## 退回

無。

## 其他檢查說明

- 含英文字母的中文：SIM card「SIM卡」是台灣最常見說法，保留；QR code「QR碼、二維條碼」台灣口語也常說「QR Code」，但中文欄位須含中文，「QR碼」通行且自然，保留；Wi-Fi 取「無線網路」，自然且不含英文字母，保留。
- 同義群組檢查：phone／cellphone／call、computer／laptop／tablet（中文都含「電腦」）、message／text、plug／adapter、internet／Wi-Fi／online、account／username 群組完整。
- 跨分類 id 檢查：phone、password、photo、camera、call、selfie 與其他分類意思一致；mouse、button、account、save、tablet 改用加後綴的 id（見上表）。
- 常見度、例句文法、form 與翻譯其餘皆正確；無題材問題。

## 跨分類統一（整合階段）

同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：

- selfie（n.）：「自拍、自拍照」→「自拍」
