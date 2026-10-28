# expert-2 事實審閱紀錄

- 審閱對象：`data/draft/expert-2.json` → 輸出 `data/checked/expert-2.json`
- 檢查題數：43 題（expert-031～expert-073）、31 張知識卡（另連到 `data/bank/expert-1.json` 的 `expert-early-modern-europe`、`expert-supply-demand`、`expert-industry-location`）
- 修正數：13 題（expert-032、expert-033、expert-036、expert-037、expert-038、expert-042、expert-044、expert-049、expert-050、expert-053、expert-056、expert-068、expert-072）＋ 6 張知識卡（`expert2-world-war-one`、`expert2-imperialism`、`expert2-southeast-asia`、`expert2-australia`、`expert2-agri-types`、`expert2-climate-agreement`）；沒有任何題目的答案需要更改
- 移到 `held`：0 題
- 驗證：`node scripts/validate-bank.mjs data/checked/expert-2.json` 通過（43 題、31 張知識卡）
- 來源說明：下列網址都是本次實際打開核對過的頁面。Britannica 網站本次一律回應 403 無法開啟，因此改用維基百科（只作為第二來源，並優先對照其引用的原始資料）、各國政府機關、聯合國、學術機構與博物館頁面。
- 撰寫者標記的題號與檔案題號不同（例如標記「expert-040 聯合國會員國數」在檔案中是 expert-038），以下一律依檔案題號，並在相關題目註明撰寫者的標記。

## 作答核對

先不看答案自行作答，43 題的答案（選擇題索引、排序、分類）與檔案中的 `answer`／`items`／`bins` 全部一致；每題答案唯一、誘答確實錯誤，排序與分類只有一種合理答案。

## 108 課綱範圍核對

來源：國家教育研究院《十二年國民基本教育課程綱要國民中小學暨普通型高級中等學校—社會領域》https://www.naer.edu.tw/upload/1/16/doc/819/十二年國民基本教育課程綱要國民中小學暨普通型高級中等學校─社會領域.odt （下載後全文搜尋）。

- 匯率（expert-065）：國中「公 Bp-Ⅳ-4 買賣外幣通常透過銀行，哪些人會想要買外幣？哪些人會想要賣外幣？」說明為「匯率是指 1 單位外國貨幣可以交換多少新臺幣」。匯率的意義在國中範圍；**升值、貶值對進口商與出口商的影響**在條文中沒有明列，屬延伸。
- 直接金融與間接金融（expert-063）：社會領域課綱全文**沒有「金融」一詞**，國中與高中學習內容都沒有直接、間接金融（屬舊課綱內容）。
- 價格上限（expert-061）：「e. 市場機能與價格管制」標示「本項目於第五學習階段學習」（高中，公 Ce-Ⅴ-1～4），國中不學。
- 外部成本（expert-064）：「g. 外部成本」標示「本項目於第五學習階段學習」（高中，公 Cg-Ⅴ-1～2）。
- 刑事訴訟程序（expert-070）：國中「公 Bi-Ⅳ-3」說明「刑事訴訟程序主要有偵查與審判二部分」，在範圍內。
- 法律位階（expert-073）：國中「公 Bf-Ⅳ-2 憲法、法律、命令三者為什麼有位階的關係？」，在範圍內。
- 行政法與行政管制（expert-072）：國中「公 Bh-Ⅳ-1～2」，在範圍內。
- 非政府國際組織（expert-066）：國中公 D 項目有「國際非政府組織……在全球永續發展議題有哪些作為」，在範圍內。
- `data/topics.md` 的挑戰 `economy` 主題列有「貨幣與金融、政府的經濟角色」，所以這幾題符合本專案的主題配額；是否保留超出國中課綱的題目，列在最後「需要人工決定」。

## 逐題查證

### 歷史（world）

- **expert-031** 文藝復興始於義大利的原因（城市商業、富商贊助）。來源：維基百科「Italian Renaissance」https://en.wikipedia.org/wiki/Italian_Renaissance （貿易與銀行致富、梅迪奇家族贊助）；World History Encyclopedia 文藝復興條目 https://www.worldhistory.org/Italian_Renaissance/ （人文主義起源於十四世紀義大利）。誘答「工業革命」「啟蒙運動」時代都在之後，正確。未修改。
- **expert-032** 孟德斯鳩權力分立與美國憲法（撰寫者標記「expert-033 孟德斯鳩改寫是否偏離原意」）。來源：芝加哥大學《The Founders' Constitution》收錄《論法的精神》第 11 卷第 6 章 https://press-pubs.uchicago.edu/founders/documents/v1ch17s9.html ；耶魯 Avalon Project《聯邦黨人文集》第 47 篇 https://avalon.law.yale.edu/18th_century/fed47.asp （麥迪遜稱孟德斯鳩是權力分立問題「總被諮詢與引用的權威」）；維基百科「The Spirit of Law」https://en.wikipedia.org/wiki/The_Spirit_of_Law （1748 年出版）。
  - 查證結果：原文是「立法權與行政權集中在同一個人**或同一個官員團體**手中」，原改寫只寫「同一個人」，範圍縮小。其餘（司法權須與前兩者分開、權力互相牽制）符合原意。
  - 修正：`material.body`「握在同一個人手中」→「握在同一個人或同一群官員手中」。
- **expert-033** 北美殖民地反對英國加稅的理由「無代表，不納稅」。來源：維基百科「Stamp Act 1765」https://en.wikipedia.org/wiki/Stamp_Act_1765 （1765 年通過，殖民地在國會沒有代表）；美國國家檔案館《獨立宣言》https://www.archives.gov/milestone-documents/declaration-of-independence （控訴「未經我們同意而課稅」，1776 年）。
  - 修正：`question`「十八世紀中期起」→「1760 年代起」。原因：印花稅法 1765 年、湯森法案（含茶稅）1767 年，寫「中期」不精確。
- **expert-034** 《人權宣言》與啟蒙運動。來源：耶魯 Avalon Project《人權和公民權宣言》https://avalon.law.yale.edu/18th_century/rightsof.asp （1789 年 8 月 26 日國民議會通過；第 1、3、6 條與短文一致）；史丹佛哲學百科「Rousseau」https://plato.stanford.edu/entries/rousseau/ （主權屬於全體人民、法律是公意的表現）。未修改。
- **expert-035** 帝國主義的經濟動機（原料與市場）。來源：課綱「歷 Qb-Ⅳ-1 歐洲帝國的擴張」（同上課綱檔）；維基百科「Berlin Conference」https://en.wikipedia.org/wiki/Berlin_Conference （1880 年代的瓜分非洲背景）。未修改。
- **expert-036** 柏林會議與非洲直線國界。來源：維基百科「Berlin Conference」https://en.wikipedia.org/wiki/Berlin_Conference （1884 年 11 月 15 日～1885 年 2 月 26 日；會議訂定「有效占領」「通知」等宣告殖民地的規則，除剛果外並未實際劃定國界，多數國界是之後列強的雙邊條約劃定）；美國國務院史料室 https://history.state.gov/milestones/1945-1952/asia-and-africa （戰後非洲國家獨立背景）。
  - 修正：`material.body` 原本「討論如何劃分在非洲的勢力範圍。許多國界是在歐洲的會議桌上……畫出來的」→「訂定占領非洲土地的規則，之後列強加快瓜分非洲。許多國界是列強在歐洲以條約議定……畫出來的」；`explain`「歐洲列強在會議中瓜分非洲，常沿經緯線」→「歐洲列強加快瓜分非洲，常在會議桌上沿經緯線」。原因：把柏林會議寫成直接劃分國界的會議是常見的過度簡化。答案（族群被分在不同國家）不受影響。
- **expert-037** 民族自決與東歐新國家。來源：美國國務院史料室「Wilson's Fourteen Points」https://history.state.gov/milestones/1914-1920/fourteen-points （1918 年 1 月 8 日）；維基百科「Self-determination」https://en.wikipedia.org/wiki/Self-determination （威爾遜 1918 年 2 月演說；奧匈帝國瓦解，捷克斯洛伐克成立，波蘭恢復獨立）。
  - 修正：`explain`「第一次世界大戰後，美國總統威爾遜提出」→「第一次世界大戰末期（1918 年），美國總統威爾遜提出……戰後隨著」；知識卡 `expert2-world-war-one`「戰後美國總統威爾遜提出民族自決」→「大戰末期美國總統威爾遜提出民族自決」。原因：十四點原則與「民族自決」演說都在 1918 年停戰（11 月）之前。
- **expert-038** 聯合國會員國數（撰寫者標記「expert-040」）。來源：聯合國「Growth in United Nations membership」https://www.un.org/en/about-us/growth-in-un-membership （1945 年 51、1955 年 76、1960 年 99、1970 年 127，四個數字全部正確；1960 年加入 17 國，其中 16 國是非洲國家、1 國是賽普勒斯）；維基百科「Year of Africa」https://en.wikipedia.org/wiki/Year_of_Africa （1960 年 17 個非洲殖民地獨立）；維基百科「Member states of the United Nations」https://en.wikipedia.org/wiki/Member_states_of_the_United_Nations （51 個創始會員國）。
  - 補充：1955 年新加入的 16 國中有 10 國在歐洲（「一攬子入會」），但題目問的是 1955～1970 年，這段期間新會員幾乎都是亞、非、加勒比海的新獨立國家，答案唯一；誘答「歐洲各國紛紛分裂」不成立。
  - 修正：`material.note`「依聯合國會員國資料整理」→「資料年份：1945～1970，聯合國會員國資料」。原因：依 `AUTHORING.md`，引用真實統計的 `note` 要寫資料年份。
- **expert-039** 阿拉伯數字源自印度、經阿拉伯人傳入歐洲。來源：聖安德魯斯大學 MacTutor「The Arabic numeral system」https://mathshistory.st-andrews.ac.uk/HistTopics/Arabic_numerals/ ；維基百科「Hindu–Arabic numeral system」https://en.wikipedia.org/wiki/Hindu%E2%80%93Arabic_numeral_system 。未修改。
- **expert-040** 排序 476、610、1095、1453（撰寫者標記「expert-042 伊斯蘭教開始傳布約 610 年」）。來源：World History Encyclopedia「The Fall of the Western Roman Empire」https://www.worldhistory.org/article/835/the-fall-of-the-western-roman-empire/ 、「Prophet Muhammad」https://www.worldhistory.org/Prophet_Muhammad/ （610 年第一次啟示，613 年公開傳教）、「Crusades」https://www.worldhistory.org/Crusades/ （1095 年 11 月 27 日克萊蒙會議）、「1453: The Fall of Constantinople」https://www.worldhistory.org/article/1180/1453-the-fall-of-constantinople/ ；第二來源：維基百科「Muhammad」https://en.wikipedia.org/wiki/Muhammad （約 610 年、約 613 年）、World History Encyclopedia「Byzantine Empire」https://www.worldhistory.org/Byzantine_Empire/ （476、1453）。
  - 查證結果：「開始傳布」寫 610 年是通行說法（私下傳布始於 610 年前後，公開傳教約 613 年）；即使以 613 年計，排序仍唯一。詳解寫「610 年前後」並使用「信徒尊他為先知」，符合 `terms.md`。未修改。
- **expert-041** 排序 1543、1687、1748、1776（撰寫者標記「expert-043」）。來源：維基百科「De revolutionibus orbium coelestium」https://en.wikipedia.org/wiki/De_revolutionibus_orbium_coelestium （1543 年紐倫堡出版）；美國國會圖書館館藏紀錄 https://www.loc.gov/item/46031925 （1543 年紐倫堡 Petreius 版，以太陽為中心）；美國國會圖書館「World Treasures: Beginnings」https://www.loc.gov/exhibits/world/earth.html （1687 年《原理》奠定萬有引力定律）；維基百科「Philosophiæ Naturalis Principia Mathematica」https://en.wikipedia.org/wiki/Philosophi%C3%A6_Naturalis_Principia_Mathematica ；維基百科「The Spirit of Law」（同 expert-032，1748 年）；Econlib《國富論》https://www.econlib.org/library/Smith/smWN.html 與維基百科「The Wealth of Nations」https://en.wikipedia.org/wiki/The_Wealth_of_Nations （1776 年）。四個年份全部正確。未修改。
- **expert-042** 排序 1869、1884、1914、1920（撰寫者標記「expert-044 柏林會議 1884」）。來源：維基百科「Suez Canal」https://en.wikipedia.org/wiki/Suez_Canal （1869 年 11 月 17 日通航）；維基百科「Berlin Conference」（同 expert-036，1884 年 11 月開幕）；維基百科「Assassination of Archduke Franz Ferdinand」https://en.wikipedia.org/wiki/Assassination_of_Archduke_Franz_Ferdinand （1914 年 6 月 28 日）；聯合國日內瓦辦事處「League of Nations」https://www.ungeneva.org/en/about/league-of-nations/overview （1920 年 1 月 10 日正式成立）；聯合國「Predecessor: The League of Nations」https://www.un.org/en/about-us/history-of-the-un/predecessor （依 1919 年凡爾賽條約設立）。
  - 查證結果：年份正確；國際聯盟以 1919 或 1920 計都不影響排序。柏林會議 1884 年開幕、1885 年閉幕，以 1884 計正確。
  - 修正：`items[1]`「列強在柏林開會劃分非洲勢力」→「列強在柏林開會訂定瓜分非洲的規則」；`explain` 同步；知識卡 `expert2-imperialism`「列強在柏林開會劃分非洲，常以經緯線畫國界」→「列強在柏林開會訂定瓜分非洲的規則，之後常以經緯線畫國界」。原因同 expert-036。
- **expert-043** 排序 1947、1962、1969、1993。來源：維基百科「Indian Independence Act 1947」https://en.wikipedia.org/wiki/Indian_Independence_Act_1947 （1947 年 8 月 15 日）；美國國務院史料室「The Cuban Missile Crisis」https://history.state.gov/milestones/1961-1968/cuban-missile-crisis （1962 年）；NASA「Apollo 11 Mission Overview」https://www.nasa.gov/history/apollo-11-mission-overview/ （1969 年 7 月 20 日）；歐洲議會「The Maastricht and Amsterdam Treaties」https://www.europarl.europa.eu/factsheets/en/sheet/3/the-maastricht-and-amsterdam-treaties （1993 年 11 月 1 日生效，建立歐洲聯盟）。未修改。
- **expert-044** 分類：文藝復興、啟蒙運動、工業革命。來源：維基百科「Mona Lisa」https://en.wikipedia.org/wiki/Mona_Lisa （約 1503～1506 年，或延續到 1517 年）、羅浮宮 https://www.louvre.fr/en/explore/the-palace/from-the-mona-lisa-to-the-wedding-feast-at-cana （1518 年法王購得）；維基百科「David (Michelangelo)」https://en.wikipedia.org/wiki/David_(Michelangelo) （1501～1504 年，佛羅倫斯）；史丹佛哲學百科「Rousseau」（1762 年《社會契約論》）、「Voltaire」https://plato.stanford.edu/entries/voltaire/ （《論寬容》、反對教會權威）；維基百科「James Watt」https://en.wikipedia.org/wiki/James_Watt （分離式冷凝器，1769 年專利；之後改為旋轉運動，擴大用途）、「George Stephenson」https://en.wikipedia.org/wiki/George_Stephenson （1814 年 Blücher、1825 年 Locomotion 運煤）。
  - 修正：卡片「瓦特改良蒸汽機」的 `hint`「這項改良讓機器有了強大動力，工廠不必再依靠水力。」→「這項改良讓蒸汽機更有效率，工廠多了水力以外的強大動力。」原因：瓦特改良後工廠仍有不少使用水力，「不必再依靠水力」說得太絕對。

### 地理（world-geo、economy-geo、climate）

- **expert-045** 泰國、越南的稻作條件（沖積平原）。來源：維基百科「Mekong Delta」https://en.wikipedia.org/wiki/Mekong_Delta （沉積物堆積的平坦氾濫平原，生產越南大部分的稻米）；維基百科「Chao Phraya River」https://en.wikipedia.org/wiki/Chao_Phraya_River （泰國低平沖積平原的中心，沼澤林多已轉為農地）；維基百科「Jasmine rice」https://en.wikipedia.org/wiki/Jasmine_rice （泰國香米主要產於東北部 Thung Kula Ronghai）。答案無疑義。
  - 修正：知識卡 `expert2-southeast-asia` 的 `life`「超市裡的泰國香米，就來自這些河流下游的平原。」→「超市裡常見的泰國米、越南米，就是東南亞稻作出口的例子。」原因：泰國香米（Hom Mali）的主要產區是東北部呵叻高原，不是昭披耶河下游平原，原寫法不正確。
- **expert-046** 印度資訊服務業（英語、理工人才、時差）。來源：維基百科「Information technology in India」https://en.wikipedia.org/wiki/Information_technology_in_India （印度承接約三分之二的全球離岸 IT 工作、出口導向）；維基百科「Business process outsourcing in India」https://en.wikipedia.org/wiki/Business_process_outsourcing_in_India （大量技術人力、英語客服）。時差：印度標準時間 UTC+5:30，美國東部 UTC−5，相差 10.5 小時，「將近半天」正確。未修改。
- **expert-047** 峽灣成因。來源：維基百科「Fjord」https://en.wikipedia.org/wiki/Fjord （冰河侵蝕 U 形谷，冰融後海水灌入；分布於挪威、紐西蘭峽灣區、智利等高緯度山地海岸）；課綱地理歐洲單元。未修改。
- **expert-048** 美國陽光帶。來源：維基百科「Sun Belt」https://en.wikipedia.org/wiki/Sun_Belt （氣候溫暖、冷氣普及、勞力較便宜，航太、國防、石油與高科技產業）。未修改。
- **expert-049** 安地斯山垂直分布（撰寫者標記「海拔範圍與氣溫遞減率」）。來源：WHRO 世界地理課程「Physical Geography of Latin America」https://digitallearning.whro.org/courses/worldgeography/mod5/top1/content.html （熱帶低地香蕉、甘蔗；約 3,000 英尺起咖啡、玉米；約 6,000 英尺起馬鈴薯；約 13,000 英尺起放牧）；維基百科「Tierra templada」https://en.wikipedia.org/wiki/Tierra_templada （赤道附近約 750～1,850 公尺）；維基百科「Lapse rate」https://en.wikipedia.org/wiki/Lapse_rate （國際標準大氣 6.5℃／公里，即每 100 公尺約 0.6～0.65℃，實際值隨地點與天氣變化）。
  - 查證結果：每 100 公尺約 0.6℃ 是國中教科書通用的平均值，可接受；「海拔四千公尺左右只能放牧」與 tierra helada／puna（約 3,500～4,000 公尺以上）相符。
  - 修正：`material.body`「往上到海拔一千多到兩千多公尺」→「往上到海拔約一千到兩千公尺」。原因：咖啡、玉米所在的溫帶帶（tierra templada）上限約 1,850～2,000 公尺，「兩千多公尺」已進入以馬鈴薯為主的冷帶。
- **expert-050** 澳洲大自流盆地。來源：昆士蘭州政府「Great Artesian Basin water use limits」https://www.business.qld.gov.au/industries/mining-energy-water/water/catchments-planning/water-plan-areas/great-artesian-basin/water-use-limits （主要由大分水嶺西坡降雨補注；牲畜與家用占昆州取水的一半）；維基百科「Great Artesian Basin」https://en.wikipedia.org/wiki/Great_Artesian_Basin （東緣高地補注；鑿井後水壓使水自行湧出；供牧場與牲畜，也有灌溉用途）。
  - 修正：`explain`「雖然水中常含鹽分不適合灌溉，卻能供牲畜飲用」→「主要用來供牲畜飲用」；知識卡 `expert2-australia`「水中常含鹽分，不適合灌溉，但可供牲畜飲用」→「這些地下水主要供牲畜飲用」。原因：部分含水層的水質適合灌溉，盆地內也有灌溉用水，「不適合灌溉」說得太絕對；題目答案（鑿井取用的地下水）不受影響。
- **expert-051** 撒赫爾沙漠化（虛構資料）。來源：維基百科「Sahel」https://en.wikipedia.org/wiki/Sahel （撒哈拉南緣、降雨不穩定；過度放牧、過度耕作是沙漠化的主因）；聯合國防治沙漠化公約 UNCCD「Desertification overview」https://www.unccd.int/land-and-life/desertification/overview （人類活動與氣候變遷造成土地生產力喪失）。未修改。
- **expert-052** 魯爾區（煤礦、萊茵河航運）。來源：維基百科「Ruhr」https://en.wikipedia.org/wiki/Ruhr （石炭紀煤層、杜易斯堡內河港、十九世紀鋼鐵業、1958 年後煤業衰退轉型）；課綱地理歐洲單元。未修改。
- **expert-053** 分類：熱帶栽培業、商業性穀物農業、游牧。來源：維基百科「Plantation」https://en.wikipedia.org/wiki/Plantation （油棕通常以大農園種植）；維基百科「Cocoa production in Ghana」https://en.wikipedia.org/wiki/Cocoa_production_in_Ghana （迦納可可「大多由小農在不到 3 公頃的土地種植」）；維基百科「United Fruit Company」https://en.wikipedia.org/wiki/United_Fruit_Company （中美洲大型香蕉農園外銷歐美）；FAO「Bananas」https://www.fao.org/markets-and-trade/commodities/bananas/en （外銷香蕉九成以上來自中南美洲與菲律賓）；維基百科「Agriculture in Argentina」https://en.wikipedia.org/wiki/Agriculture_in_Argentina （小麥是主要出口穀物）；維基百科「Nomad」https://en.wikipedia.org/wiki/Nomad （游牧依季節在牧場間移動）。
  - 修正：卡片「迦納的可可園」→「中美洲的香蕉園」，`hint` 改為「香蕉需要高溫多雨，大型農園種植後大量運到國外販賣。」；`explain` 與知識卡 `expert2-agri-types`（`body`「油棕、可可」→「油棕、香蕉」，`life`「早餐的巧克力和麵包」→「早餐的香蕉和麵包」）同步。原因：迦納可可以小農經營為主，把它當作熱帶栽培業（大農園）的例子不精確；中美洲香蕉大農園是沒有疑義的例子。
- **expert-054** 產業群聚（改寫短文）。來源：維基百科「Business cluster」https://en.wikipedia.org/wiki/Economic_cluster （群聚的好處：人才市場、就近供應商、知識外溢；矽谷例子）；與 bank 卡 `expert-industry-location` 一致。答案唯一。未修改。
- **expert-055** 臺灣與日本鋼鐵廠臨港。來源：維基百科「China Steel」https://en.wikipedia.org/wiki/China_Steel （主廠在高雄小港，臨高雄港）；課綱地理工業區位。臺灣幾乎不產鐵礦、煤，原料仰賴進口，答案正確。未修改。
- **expert-056** 分類：溫帶海洋性、溫帶大陸性、熱帶季風氣候（撰寫者標記「expert-062 孟買、莫斯科、溫尼伯」）。來源：維基百科「Climate of Mumbai」https://en.wikipedia.org/wiki/Climate_of_Mumbai （孟買介於熱帶季風 Am 與熱帶莽原 Aw 之間；1～4 月雨量幾乎為 0）；維基百科「Chittagong」https://en.wikipedia.org/wiki/Chittagong （柯本分類 Am，年雨量 2,964 毫米，夏季西南季風）；維基百科「Yangon」https://en.wikipedia.org/wiki/Yangon （Am）；維基百科「Climate of Moscow」https://en.wikipedia.org/wiki/Climate_of_Moscow （Dfb，1 月均溫 −6.2℃）；維基百科「Winnipeg」https://en.wikipedia.org/wiki/Winnipeg （濕潤大陸性氣候，1 月 −16.4℃、7 月 19.7℃）；維基百科「Climate of London」https://en.wikipedia.org/wiki/Climate_of_London （Cfb，降水全年平均）。
  - 查證結果：莫斯科、溫尼伯屬溫帶大陸性氣候，正確；倫敦、都柏林屬溫帶海洋性氣候，正確。孟買依柯本公式（最乾月雨量低於 100 −年雨量／25）較接近 Aw，各資料分歧，有疑慮。
  - 修正：卡片「印度孟買」→「孟加拉吉大港」（`hint` 不變：終年炎熱、夏季西南風帶來大雨、冬季乾燥）；`explain`「孟買與仰光」→「吉大港與仰光」。原因：依撰寫者指示「有疑慮就換城市」，吉大港在柯本分類明確是 Am。
- **expert-057** 溫帶海洋性氣候表（虛構資料）。數值與倫敦 Kew 的月雨量 45～68 毫米、冬季均溫約 5℃ 相近（同上「Climate of London」）。答案唯一：1 月 4℃ 不是大陸性、7 月 50 毫米不是夏乾、17℃ 不是熱帶。未修改。
- **expert-058** 倫敦冬季比札幌溫和。來源：維基百科「Sapporo」https://en.wikipedia.org/wiki/Sapporo （北緯約 43°，1 月均溫 −3.2℃）；維基百科「Climate of London」（北緯約 51.5°，1 月均溫約 5℃）；維基百科「North Atlantic Current」https://en.wikipedia.org/wiki/North_Atlantic_Current （北大西洋暖流對歐洲有暖化影響，研究指出風的作用可能更大）。正確選項同時寫「北大西洋暖流與西風」，詳解也寫出西風的作用，符合現有研究與教科書。未修改。

### 公民（economy、global、law）

- **expert-059** 生產要素分類。來源：維基百科「Factors of production」https://en.wikipedia.org/wiki/Factors_of_production （土地包含水等自然資源與生產場地；勞動是人力付出；資本是人造、用來生產的物品）。未修改。
- **expert-060** 需求增加 vs. 需求量增加。來源：維基百科「Demand curve」https://en.wikipedia.org/wiki/Demand_curve （只有本身價格改變才是沿線移動；天氣等非價格因素使需求線移動）；bank 卡 `expert-supply-demand`。未修改。
- **expert-061** 價格上限造成短缺（撰寫者標記「expert-065 只寫目的」）。來源：維基百科「Price ceiling」https://en.wikipedia.org/wiki/Price_ceiling （政府設上限通常是為了讓必需品買得起；低於均衡價格時出現超額需求）；課綱「e. 市場機能與價格管制」（高中）。計算：15 元時需求量 75、供給量 45，短缺 30，正確。題目只寫「為了讓民眾買得起」這個目的，沒有評價政策好壞，符合要求。未修改（課綱範圍見最後）。
- **expert-062** 貨幣的計價單位功能。來源：維基百科「Money」https://en.wikipedia.org/wiki/Money （交易媒介、計價單位、價值儲存、延期支付標準四種功能）；課綱「公 Bp-Ⅳ-1」。未修改。
- **expert-063** 直接金融（撰寫者標記「expert-066」）。來源：維基百科中文「直接金融」https://zh.wikipedia.org/zh-tw/直接金融 （資金需求者發行股票、債券等原始證券向市場籌資）；維基百科「Financial intermediary」https://en.wikipedia.org/wiki/Financial_intermediary （透過銀行等中介是間接金融，直接在金融市場借貸則排除中介）。定義正確，未修改（課綱範圍見最後）。
- **expert-064** 外部成本與向污染者收費。來源：維基百科「Externality」https://en.wikipedia.org/wiki/Externality （工廠水污染是負外部性；皮古稅讓外部成本內部化）；全國法規資料庫《水污染防治法》第 11 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=O0040001&flno=11 （依排放水質水量徵收水污染防治費）。未修改（課綱範圍見最後）。
- **expert-065** 新臺幣升值對進口商有利（撰寫者標記「expert-068」）。來源：維基百科「Currency appreciation and depreciation」https://en.wikipedia.org/wiki/Currency_appreciation_and_depreciation （本幣升值使進口品變便宜、對出口不利）；課綱「公 Bp-Ⅳ-4」（匯率是 1 單位外幣可換多少新臺幣）。32 元→28 元是新臺幣升值，答案正確；誘答（出口商、美國觀光客、持有美元者）都相對不利。未修改（課綱範圍見最後）。
- **expert-066** 政府間與非政府國際組織。來源：國際貨幣基金「About the IMF」https://www.imf.org/en/About （191 個會員國，提供貸款）；無國界醫生「Who we are」https://www.msf.org/who-we-are （1971 年由醫師與記者創立，98% 經費來自民間捐款）；國際特赦組織「Who we are」https://www.amnesty.org/en/who-we-are/ （獨立於任何政治意識形態與經濟利益，關注人權）；綠色和平「About」https://www.greenpeace.org/international/explore/about/ （環境組織，1971 年由民間人士發起）。未修改。
- **expert-067** 全球在地化。來源：維基百科「Glocalization」https://en.wikipedia.org/wiki/Glocalization （全球化與在地化並行，舉速食業在印度推出米飯餐點為例）；維基百科「International availability of McDonald's products」https://en.wikipedia.org/wiki/International_availability_of_McDonald%27s_products （印度門市不供應牛肉與豬肉，以雞肉與素食餐點為主）。題目未寫出品牌名稱。未修改。
- **expert-068** 《巴黎協定》。來源：聯合國氣候變化綱要公約 UNFCCC「The Paris Agreement」https://unfccc.int/process-and-meetings/the-paris-agreement （遠低於 2℃，努力限制在 1.5℃）；維基百科「Paris Agreement」https://en.wikipedia.org/wiki/Paris_Agreement （2015 年 12 月 12 日於 COP21 通過；各國自定減量目標）；維基百科「Montreal Protocol」https://en.wikipedia.org/wiki/Montreal_Protocol （提示所說的臭氧層保護，1987 年）。
  - 修正：`explain` 與知識卡 `expert2-climate-agreement`「控制在比工業化前高 2℃ 以內」→「控制在遠低於比工業化前高 2℃ 的範圍」。原因：協定原文是「well below 2℃」，比「2℃ 以內」嚴格。
- **expert-069** 全球化與相互依賴（改寫短文）。概念判讀題，短文是虛構情境，不涉及需查證的真實數據；概念依課綱公民「全球化」學習內容（同上課綱檔）。答案唯一。未修改。
- **expert-070** 刑事訴訟程序排序。來源：全國法規資料庫《刑事訴訟法》第 228 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0010001&flno=228 （檢察官知有犯罪嫌疑應即開始偵查）、第 251 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0010001&flno=251 （足認有犯罪嫌疑者應提起公訴）、第 457 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0010001&flno=457 （執行裁判由檢察官指揮）；課綱「公 Bi-Ⅳ-3」。未修改。
- **expert-071** 押金爭議屬民事，提起民事訴訟。來源：課綱「公 Bj-Ⅳ-5」（契約不履行的責任）；全國法規資料庫《國家賠償法》第 1 條頁面 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=I0020004&flno=1 （確認國家賠償是另一種制度，與私人契約無關）。詳解提到鄉（鎮、市、區）公所調解委員會：本次以法規資料庫查詢《鄉鎮市調解條例》時開到的是其他法規頁面，未能直接開啟條文；此為國中教科書通用內容，未修改，中立審閱或使用者可再確認。
- **expert-072** 交通罰鍰屬行政責任（撰寫者標記「行政責任的簡化」）。來源：全國法規資料庫《道路交通管理處罰條例》第 31 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=K0040012&flno=31 （未戴安全帽處駕駛人新臺幣五百元罰鍰）、第 8 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=K0040012&flno=8 （違反第 12～68 條由公路主管機關處罰）；《刑法》第 33 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=33 （罰金是刑罰的主刑）。
  - 查證結果：罰鍰屬行政罰、行政責任，答案正確；但未戴安全帽是由警察**舉發**，**處罰機關**是公路主管機關（監理機關），不是警察。
  - 修正：`explain`「由警察等行政機關依行政法規處以罰鍰」→「由警察舉發、再由公路主管機關（監理機關）等行政機關依行政法規處以罰鍰」。短文「警察……開立罰單」（即舉發通知單）是一般用語，保留。
- **expert-073** 法律位階。來源：全國法規資料庫《中華民國憲法》第 172 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=A0000001&flno=172 （命令與憲法或法律牴觸者無效）；《中央法規標準法》第 11 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=A0030133&flno=11 。未修改。

## 知識卡

- 已隨上方題目修正：`expert2-world-war-one`（expert-037）、`expert2-imperialism`（expert-042）、`expert2-southeast-asia`（expert-045）、`expert2-australia`（expert-050）、`expert2-agri-types`（expert-053）、`expert2-climate-agreement`（expert-068）。
- 其餘知識卡內容與上方對應題目的來源一致，未修改。`expert2-decolonization`「聯合國會員國……將近 200 國」：聯合國頁面（同 expert-038）列出 193 國，正確。`expert2-glacial-landforms`「挪威、紐西蘭南島等高緯度海岸」：維基百科「Fjord」寫「主要在高緯度、多山的海岸」，保留。

## 需要人工決定

1. **超出 108 課綱國中範圍的公民題**（題目事實都正確，暫不移到 `held`，由使用者決定是否保留為挑戰難度的延伸題）：
   - expert-061（價格上限）、expert-064（外部成本）：課綱列為「第五學習階段」（高中）內容。
   - expert-063（直接金融與間接金融）：108 課綱國中、高中都沒有列入。
   - expert-065（升值與貶值對進出口的影響）：國中只列「匯率的意義、哪些人買賣外幣」，升貶值的影響屬延伸。
   - 若要嚴格對齊國中課綱，建議 expert-063、expert-061、expert-064 移到 `held`，expert-065 可改問「進口商付貨款時要買外幣還是賣外幣」這類課綱內容。
2. expert-056 把「印度孟買」換成「孟加拉吉大港」：吉大港對國中生較陌生，若希望保留孟買（國中教科書依季風定義通常把孟買列為熱帶季風氣候），請使用者決定。
3. expert-071 詳解中的「鄉（鎮、市、區）公所調解委員會」本次未能開啟條文頁面核對，請中立審閱或使用者順手確認。

## 原始來源核對（2026-10-28）

- 範圍：原紀錄的來源都已開啟，但有多題只以維基百科（加上課綱）為依據，或只有一個非維基的已開啟頁面。這次以 WebFetch 補開政府機關、國際組織、博物館或官方網站的原始頁面；觀念題（expert-059 生產要素、060 需求變動、061 價格上限計算、062 貨幣功能、063 直接金融、065 匯率、069 相互依賴）略過。課綱範圍外的題目依使用者決定保留為課外學習；expert-056 依使用者決定保留「孟加拉吉大港」。
- 開啟情況：Britannica 仍回應 403；本輪後段 WebSearch 額度用盡，無法再搜尋新網址，只能開啟已知網址。
- 結果：核對 7 題，沒有不一致；沒有修改題目、答案或知識卡。

- **expert-036** 已開啟 南非歷史線上 South African History Online「The Berlin Conference」https://www.sahistory.org.za/article/berlin-conference （1884 年 11 月 15 日～1885 年 2 月 26 日）。年份一致。該頁以「會議畫出非洲國界」的簡化說法描述；現行短文「訂定占領非洲土地的規則，之後列強……以條約議定國界」較保守，兩者不矛盾，答案（族群被分在不同國家）不受影響，未修改。
- **expert-047** 已開啟 美國國家地理教育「Fjord」https://education.nationalgeographic.org/resource/fjord/ （冰期冰河刻蝕出深谷；峽灣主要分布在挪威、智利、紐西蘭、加拿大、格陵蘭與阿拉斯加）。與題目、知識卡 `expert2-glacial-landforms` 一致。
- **expert-052** 已開啟 魯爾區工業文化之路官網 Route Industriekultur https://www.route-industriekultur.ruhr/en/ （魯爾採煤已有 300 多年歷史、區內最早的煉鐵廠、杜易斯堡為歐洲最大內河港）。「盛產煤礦，又有萊茵河航運」一致。
- **expert-055** 已開啟 中國鋼鐵公司官網 https://www.csc.com.tw/index.html （配合高雄市政府減排，確認主要廠區在高雄）。臨港與原料進口的細節頁面（https://www.csc.com.tw/csc_e/hr/csc.htm）回應 404，**原料進口仍只有原紀錄的維基百科來源**。
- **expert-056** 吉大港氣候：孟加拉氣象局正常雨量表 https://mdass.bmd.gov.bd/file/2016/08/17/pdf/53.pdf 已下載，但 PDF 無法解析文字，**仍只有摘錄**（同一份表格的搜尋摘要：吉大港 6～8 月雨量最多、7 月約 727 毫米，冬季少雨）。與卡片提示「夏季西南風帶來大雨、冬季乾燥」一致。依使用者決定保留城市名稱。
- **expert-058** 已開啟 日本氣象廳「札幌 平年值（1991～2020）」https://www.data.jma.go.jp/stats/etrn/view/nml_sfc_ym.php?prec_no=14&block_no=47412 （1 月平均氣溫 −3.2 °C）。一致。倫敦：英國氣象局 Heathrow 平年值頁 https://www.metoffice.gov.uk/research/climate/maps-and-data/uk-climate-averages/gcpsvg3nc 已開啟但數值以互動圖表載入、無法讀取，北大西洋暖流說明頁回應 404，**倫敦數值與暖流說明仍只有原紀錄的維基百科來源**；題目沒有寫出倫敦的具體氣溫。
- **expert-071** 已開啟 全國法規資料庫《鄉鎮市調解條例》https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0020003 （第 1 條：鄉、鎮、市公所應設調解委員會，辦理民事事件與告訴乃論之刑事事件；第 10 條：當事人以書面或言詞聲請調解）與第 35 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=I0020003&flno=35 （本條例於直轄市、市之區調解委員會準用）。詳解與知識卡 `expert2-civil-remedy` 的「鄉（鎮、市、區）公所的調解委員會」一致，原紀錄「需要人工決定」第 3 點已確認。
- **仍只有維基百科（本輪未能開啟原始頁面）**：expert-045（湄公河委員會頁面 https://www.mrcmekong.org/about/mekong-basin/ 已開啟但沒有稻作內容）、expert-046（印度資訊服務業、時差）、expert-048（陽光帶，美國國家地理教育頁面 404）、expert-067（印度速食店菜單，官網首頁 https://www.mcdonaldsindia.com/ 沒有內容）。內容都是國中地理、公民的通行說法，判斷可以保留。

### 統計

- 核對 7 題；其中 expert-055、expert-056、expert-058 仍有部分細節只有摘錄或維基百科；另有 4 題（expert-045、046、048、067）本輪未能開啟原始頁面。
- 不一致：0 題；`data/bank/expert-2.json` 未修改。
