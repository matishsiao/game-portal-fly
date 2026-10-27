# 離線口袋地城（Pocket Dungeon）

可離線遊玩的單機復古像素俯視角動作 RPG：建立戰士、弓箭手、法師、盜賊或武僧（各有 4 個基本技能、6 個轉職技能與 5 個被動技能），在村莊整備後進入隨機生成的地城，即時移動、攻擊與閃避，擊敗 Boss 帶回經驗值、金幣與裝備，再挑戰更深的地城。一趟約 5～10 分鐘，角色等級與裝備永久保存。規格見 [spec.md](spec.md)，共通要求見 [`games/spec.md`](../spec.md)。

- 純靜態網站，不需後端、不需安裝任何 npm 套件（只用 Node.js 內建模組）。
- 需要 Node.js 16.17 以上（用於建置、測試與本機伺服器）。
- 角色、怪物、Boss、地圖與像素圖全部原創，像素圖以程式中的像素資料繪製（`src/js/pd/sprites.js`），不使用外部素材。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發模式，提供 `src/`，**不啟用** Service Worker。網址 `http://localhost:5173/` |
| `npm run build` | 建置到 `dist/`，並在 `sw.js` 寫入版本號、版本標籤與預先快取清單 |
| `npm run preview` | 建置並以 `dist/` 啟動，**啟用** Service Worker，用於驗證離線功能 |
| `npm run preview:https` | 同上但使用 HTTPS（mkcert 憑證），供手機透過區網測試（選用） |
| `npm test` | 單元測試：經驗與屬性公式、傷害、裝備與強化、地城生成、碰撞、攻擊範圍、閃避與無敵、怪物（29 種）與 Boss（6 種）行為（回復、進化）、技能（解鎖、技能點、30 個技能的效果、轉職後的技能欄）、異常狀態（中毒、睡眠、暈眩）、寶石（鑲嵌、合成、加成、護盾）、快照還原、村莊規則 |
| `npm run check:dungeons` | 地城生成驗證：每個區域、深度 1～5 各 200 層，檢查連通性、樓梯可到達、配置規則與生成時間（≤ 50 ms） |
| `npm run check:balance` | 數值平衡驗證：練到 Lv.30 的探險次數（40～70 趟）、Boss 擊殺時間（≤ 120 秒）與單次傷害（≤ 35% HP）、怪物不會 3 下打倒玩家 |
| `npm run icons` | 重新產生 `src/icons/` 圖示 |

## 專案結構

```
src/
  index.html, css/style.css, manifest.webmanifest, icons/
  sw.js                 Service Worker 樣板（版本與資源清單由 build 填入）
  js/app.js             首頁、村莊（地城入口、商店、鐵匠、寶石、倉庫、技能、角色）、地城畫面、遊戲迴圈、輸入、HUD、離線狀態
  js/storage.js         本機儲存：IndexedDB（角色、探險、設定）與 localStorage（大廳摘要、統計、設定）
  js/pd/data.js         資料表：職業、區域、怪物、Boss、異常狀態、寶石、稀有度、裝備名稱、強化與道具價格
  js/pd/rules.js        成長與裝備規則（純邏輯）：經驗曲線、屬性、傷害公式、怪物強度、裝備產生與強化、寶石加成
  js/pd/dungeon.js      地城生成（純邏輯）：房間、通道、怪物、寶箱與陷阱配置，生成驗證
  js/pd/world.js        戰鬥模擬（純邏輯）：玩家、怪物與 Boss 行為、預警、投射物、掉落、樓層切換、快照
  js/pd/skills.js       技能資料與規則（純邏輯）：解鎖、技能點、升級、技能欄、等級數值
  js/pd/village.js      村莊規則（純邏輯）：商店、買賣、穿脫、強化、分解與合成、寶石鑲嵌與合成、解鎖、探險結算
  js/pd/render.js       畫面繪製：地圖、角色、預警、效果、戰爭迷霧、小地圖
  js/pd/sprites.js      原創像素圖資料
scripts/                build、serve、check-dungeons、check-balance、make-icons
tests/                  node:test 單元測試
```

## 部署（GitHub Pages）

本遊戲隨遊戲大廳一起部署，網址：<https://matishsiao.github.io/game-portal-fly/pocketdungeon/>。推送到 `game-portal-fly` 的 `main` 後，由專案根目錄的 workflow 自動測試、組合並部署；本目錄不另設 GitHub Actions。「出發前檢查」由遊戲大廳統一提供。

## 選用：手機透過區網測試 HTTPS

Service Worker 只在 HTTPS 或 `localhost` 下運作，手機用區網 IP 連到開發機時必須使用 HTTPS。

1. 安裝 mkcert（macOS：`brew install mkcert`），執行一次 `mkcert -install`。
2. `npm run preview:https`。首次執行會產生涵蓋 localhost 與本機區網 IP 的憑證（存在 `.certs/`，已被 git 忽略）；之後重用，過期或 IP 改變時自動重新產生。
3. 在手機安裝並信任 mkcert 的根 CA（路徑會顯示在啟動訊息，即 `mkcert -CAROOT` 下的 `rootCA.pem`）：
   - **iOS**：把 `rootCA.pem` 傳到手機（AirDrop 或郵件）→ 安裝描述檔 → 再到「設定 → 一般 → 關於本機 → 憑證信任設定」開啟該 CA 的**完整信任**。
   - **Android**：「設定 → 安全性 → 加密與憑證 → 安裝憑證 → CA 憑證」（各廠牌路徑可能不同）。
4. 用啟動訊息中的區網網址開啟。

**請勿**把 `.certs/` 或 mkcert 的 `rootCA-key.pem` 提交到版本控制或分享給他人。
