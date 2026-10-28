# expert-1 事實審閱紀錄

- 審閱對象：`data/draft/expert-1.json` → 輸出 `data/checked/expert-1.json`
- 檢查題數：30 題、24 張知識卡
- 修正數：5 題（expert-004、expert-006、expert-009、expert-029、expert-030）＋ 4 張知識卡（`expert-legality`、`expert-legislation`、`expert-mediterranean`、`expert-inflation`）；沒有任何題目的答案需要更改
- 移到 `held`：0 題
- 驗證：`node scripts/validate-bank.mjs data/checked/expert-1.json` 通過（30 題、24 張知識卡）

- 來源說明：部分政府機關（樂詞網、中央銀行、農業部、環境部、經濟部國際貿易署）列的是網站首頁，需在站內搜尋對應詞條。

## 作答核對

先不看答案自行作答，30 題的答案（選擇題索引、排序、分類）與檔案中的 `answer`／`items`／`bins` 全部一致；每題答案唯一、誘答確實錯誤，排序與分類只有一種合理答案。

## 逐題查證

### 歷史（world）

- **expert-001** 工業革命始於英國的原因（煤鐵資源）。來源：World History Encyclopedia「British Industrial Revolution」https://www.worldhistory.org/British_Industrial_Revolution/ ；John Munro（多倫多大學經濟系）講義 https://www.economics.utoronto.ca/munro5/08steamr.pdf 。誘答「電力與內燃機」屬第二次工業革命（十九世紀後期），正確。未修改。
- **expert-002** 活字印刷（十五世紀中期，美因茲）與知識傳播、宗教改革。來源：Britannica「Johannes Gutenberg」https://www.britannica.com/biography/Johannes-Gutenberg ；Lutheran Reformation（LCMS）Gutenberg 說明 https://lutheranreformation.org/wp-content/uploads/2016/07/ref500-Gutenberg_Handout.pdf 。未修改。
- **expert-003** 新航路的動機（直接取得香料、鄂圖曼控制商路）。來源：Britannica「Age of Discovery」https://www.britannica.com/event/European-exploration/The-Age-of-Discovery ；World History Encyclopedia「Spice Trade」https://www.worldhistory.org/Spice_Trade/ 。提示「工業革命比新航路晚將近三百年」（1490 年代 vs. 1760 年代）正確。未修改。
- **expert-004** 新政（1933 年起，公共工程創造就業、整頓銀行、1935 年社會安全法）。來源：Britannica「New Deal」https://www.britannica.com/event/New-Deal ；University of Groningen「The Second New Deal」https://www.let.rug.nl/usa/outlines/history-2005/the-new-deal-and-world-war-i/the-second-new-deal.php ；Boston Public Library WPA 指南 https://guides.bpl.org/NewDeal/WPA 。三個誘答（完全不干預、廢除銀行、關閉工廠）都與新政內容相反，確實錯。
  - 修正：選項 0 的 `hint`。原本「新政之所以「新」，正是因為它改變了原本政府很少干預經濟的做法。」→「新政改變了過去政府很少干預經濟的做法。如果政府什麼都不做，大量失業能很快解決嗎？」。原因：「New Deal」之名出自羅斯福 1932 年競選演說「a new deal for the American people」，不是因為「改變干預做法」而稱「新」，原寫法是錯誤的名稱由來。
- **expert-005** 德國分裂、柏林圍牆（1961 年 8 月築、1989 年 11 月 9 日開放、1990 年 10 月 3 日統一）、冷戰。來源：Britannica Student「Berlin Wall」https://kids.britannica.com/students/article/Berlin-Wall/310181 ；英國帝國戰爭博物館（IWM）https://www.iwm.org.uk/history/what-was-the-berlin-wall-and-how-did-it-fall ；CVCE https://www.cvce.eu/en/berlin-wall 。未修改。
- **expert-006** 排序：漢摩拉比法典（-1754）→ 雅典民主改革（-508）→ 亞歷山大東征（-334）→ 屋大維建立羅馬帝國（-27）。
  - 漢摩拉比在位約西元前 1792～1750 年，法典約成於在位晚期，-1754 是通行的約略年份（各家在 1755～1750 年之間）。來源：Britannica「Code of Hammurabi」https://www.britannica.com/topic/Code-of-Hammurabi ；World History Encyclopedia https://www.worldhistory.org/Hammurabi's_Code/ 。詳解寫「約在西元前 18 世紀」，正確。
  - 克里斯提尼改革一般記為西元前 508／507 年。來源：World History Encyclopedia「Cleisthenes」https://www.worldhistory.org/Cleisthenes/ ；Britannica「Cleisthenes of Athens」https://www.britannica.com/biography/Cleisthenes-of-Athens 。項目「雅典推行民主政治改革」即使被理解為梭倫（-594）或伯里克里斯時期（約 -460），仍介於另外兩件事之間，排序唯一。
  - 亞歷山大東征 -334、屋大維 -27 年獲「奧古斯都」稱號：Britannica「Alexander the Great」https://www.britannica.com/biography/Alexander-the-Great 、「Augustus」https://www.britannica.com/biography/Augustus-Roman-emperor 。
  - 修正：`keys[1]`。原本「兩河流域文明、希臘城邦、希臘化時代與羅馬，哪一個文明最早出現？」→「羅馬、兩河流域文明、希臘化時代與希臘城邦，各自在什麼時候興盛？哪一個文明最早出現？」。原因：原句依正確順序列出四個文明，等於直接給出排序答案。
- **expert-007** 1492、1517、1688、1776、1789。來源：Britannica「Christopher Columbus」https://www.britannica.com/biography/Christopher-Columbus 、「Ninety-five Theses」https://www.britannica.com/event/Ninety-five-Theses 、「Glorious Revolution」https://www.britannica.com/event/Glorious-Revolution 、「Declaration of Independence」https://www.britannica.com/topic/Declaration-of-Independence 、「French Revolution」https://www.britannica.com/event/French-Revolution ；第二來源：美國國家檔案館 https://www.archives.gov/founding-docs/declaration 。未修改。
- **expert-008** 1919、1929、1945、1989、1991。來源：Britannica「Treaty of Versailles」https://www.britannica.com/event/Treaty-of-Versailles-1919 、「United Nations」https://www.britannica.com/topic/United-Nations ；聯合國「History of the UN」https://www.un.org/en/about-us/history-of-the-un ；IWM 柏林圍牆（同 expert-005）。未修改。
- **expert-009** 分類：兩河（楔形文字、漢摩拉比法典）、埃及（金字塔、尼羅河氾濫）、古印度（摩亨卓達羅、種姓制度）。來源：Britannica「Indus civilization」https://www.britannica.com/topic/Indus-civilization 、「varna」https://www.britannica.com/topic/varna-Hinduism ；World History Encyclopedia「Caste System in Ancient India」https://www.worldhistory.org/article/1152/ 。
  - 查證結果：種姓（瓦爾納）制度形成於雅利安人進入後的吠陀時期，不屬於印度河流域文明（哈拉帕文化）本身；國中教科書的「古印度文明」單元涵蓋兩個時期，分類答案唯一（另兩類都不可能）。
  - 修正：卡片「形成種姓制度」的 `hint` 與 `explain`，明確寫出「印度河流域的城市衰落後，雅利安人進入南亞」，避免學生誤以為種姓制度是印度河流域城市文明的特色。原 `hint`「雅利安人進入南亞後，把社會分成不同階層，是哪一個古文明的特色？」→「印度河流域的城市衰落後，雅利安人進入南亞，社會逐漸分成世襲的階層，這發生在哪一個地區？」；原 `explain` 末句「古印度文明有印度河流域的摩亨卓達羅遺址，雅利安人進入後形成種姓制度。」→「古印度文明早期有印度河流域的摩亨卓達羅等城市，城市文明衰落後，雅利安人進入南亞，逐漸形成種姓制度。」
- **expert-010** 分類：佛教、基督教、伊斯蘭教。卡片內容為創始人、節慶、象徵、齋戒、朝聖，屬信仰習俗與文化，未涉及教義比較。麥加為穆罕默德出生地（約西元 570 年）。來源：Britannica「Muhammad」https://www.britannica.com/biography/Muhammad 、「hajj」https://www.britannica.com/topic/hajj 、「Ramadan」https://www.britannica.com/topic/Ramadan ；Britannica「Buddha」https://www.britannica.com/biography/Buddha-founder-of-Buddhism 。未修改。

### 地理（world-geo、economy-geo、climate）

- **expert-011** 埃及人口集中尼羅河谷與三角洲。來源：Britannica「Egypt – Settlement patterns」https://www.britannica.com/place/Egypt/Settlement-patterns ；CIA World Factbook「Egypt」https://www.cia.gov/the-world-factbook/countries/egypt/ 。未修改。
- **expert-012** 非洲單一經濟、價格波動。來源：聯合國貿發會議（UNCTAD）「State of Commodity Dependence」https://unctad.org/topic/commodities/state-of-commodity-dependence ；世界銀行 Commodity Markets https://www.worldbank.org/en/research/commodity-markets 。未修改。
- **expert-013** 西伯利亞嚴寒、永凍土、人口稀疏。來源：Britannica「Siberia」https://www.britannica.com/place/Siberia ；Britannica「Russia – Settlement patterns」https://www.britannica.com/place/Russia/Settlement-patterns 。提示「西伯利亞西部有廣大平原」（西西伯利亞平原）、「火山集中東部沿海」（堪察加、千島）正確。未修改。
- **expert-014** 沙烏地阿拉伯：唯一同時臨紅海與波斯灣的國家、原油出口、麥加。阿拉伯聯合大公國臨波斯灣與阿曼灣，不臨紅海。來源：CIA World Factbook「Saudi Arabia」https://www.cia.gov/the-world-factbook/countries/saudi-arabia/ 、「United Arab Emirates」https://www.cia.gov/the-world-factbook/countries/united-arab-emirates/ ；Saudipedia「Geography of Saudi Arabia」https://saudipedia.com/en/article/191/geography/saudi-geography/geography-of-the-kingdom 。未修改。
- **expert-015** 環太平洋地震帶：日本、智利、紐西蘭在帶上；埃及、波蘭、沙烏地阿拉伯不在。來源：USGS「Ring of Fire」https://www.usgs.gov/programs/VHP/ring-fire ；National Geographic Education「Ring of Fire」https://education.nationalgeographic.org/resource/ring-fire/ 。知識卡 `expert-ring-of-fire` 所列印尼、臺灣：兩來源皆將印尼與臺灣列入環太平洋帶（印尼的巽他弧同時與歐亞地震帶相接，教科書通例列入環太平洋地震帶），交通部中央氣象署地震測報中心 https://scweb.cwa.gov.tw/ 亦說明臺灣位於環太平洋地震帶。未修改。
- **expert-016** 研發留本國、組裝移往低工資國家（勞力成本）。來源：國家教育研究院樂詞網「勞力密集產業」https://terms.naer.edu.tw/ ；OECD「Global value chains」https://www.oecd.org/en/topics/global-value-and-supply-chains.html 。未修改。
- **expert-017** 虛構資料判讀，乙地（工資低、近港口）唯一同時符合兩條件。邏輯題，概念來源同 expert-016。未修改。
- **expert-018** 義大利南部地中海型氣候與地中海式農業。來源：Britannica「Mediterranean climate」https://www.britannica.com/science/Mediterranean-climate ；美國氣象學會（AMS）詞彙「Mediterranean climate」https://glossary.ametsoc.org/wiki/Mediterranean_climate 。未修改。
- **expert-019** 虛構氣候表：1 月 23 °C、7 月 12 °C → 南半球；1 月降水 10 毫米、7 月 95 毫米 → 夏乾冬雨。
  - 能否排除「南半球的溫帶海洋性氣候」：可以。依柯本分類，溫帶海洋性氣候（Cfb）終年有雨、最熱月均溫低於 22 °C；表中最熱月 23 °C、最乾月 10 毫米（低於 30 毫米且不到最濕月的三分之一），符合地中海型（Cs）定義，不符合海洋性氣候。答案唯一。
  - 來源：AMS 詞彙（同上）；Britannica「Köppen climate classification」https://www.britannica.com/science/Koppen-climate-classification ；澳洲氣象局伯斯氣候統計 http://www.bom.gov.au/climate/averages/tables/cw_009021.shtml 。未修改。
- **expert-020** 熱帶雨林（亞馬孫、剛果盆地）、沙漠（撒哈拉、阿拉伯半島內陸）、苔原（加拿大與西伯利亞北極海沿岸）。來源：Britannica「tundra」https://www.britannica.com/science/tundra 、「tropical rainforest」https://www.britannica.com/science/tropical-rainforest ；National Geographic Education「Desert」https://education.nationalgeographic.org/resource/desert/ 。未修改。

### 公民（economy、global、law）

- **expert-021** 機會成本＝放棄選項中價值最高者（900 元）。來源：國家教育研究院樂詞網「機會成本」https://terms.naer.edu.tw/ ；Britannica「opportunity cost」https://www.britannica.com/money/opportunity-cost 。未修改。
- **expert-022** 均衡價格（需求量＝供給量，40 元）。來源：Britannica「supply and demand」https://www.britannica.com/money/supply-and-demand ；國家教育研究院樂詞網「均衡價格」https://terms.naer.edu.tw/ 。未修改。
- **expert-023** 颱風使供給減少、價格上漲。來源：同 expert-022；農業部農產品批發市場交易行情站（颱風後菜價上漲的新聞稿）https://amis.afa.gov.tw/ 。未修改。
- **expert-024** 通貨膨脹定義。來源：中央銀行「物價與貨幣政策」https://www.cbc.gov.tw/ ；Britannica「inflation」https://www.britannica.com/money/inflation-economics 。未修改題目；知識卡見下方。
- **expert-025** 公共財（無排他性、無敵對性）與路燈。來源：Britannica「public good」https://www.britannica.com/money/public-good-economics ；Newcastle University 經濟學講義「Public Goods」https://www.staff.ncl.ac.uk/david.harvey/AES829/Public.html 。未修改。
- **expert-026** WTO 1995 年 1 月 1 日成立、推動自由貿易並設爭端解決機制；WHO、國際紅十字會、聯合國教科文組織的職能。來源：WTO「What is the WTO?」https://www.wto.org/english/thewto_e/whatis_e/whatis_e.htm ；經濟部國際貿易署「WTO 簡介」https://www.trade.gov.tw/ ；WTO 爭端解決手冊 https://wto-ilibrary.org/content/books/9789287046567 ；UNESCO World Heritage https://whc.unesco.org/ 。未修改。
- **expert-027** 公平貿易（保證最低收購價、社區發展、禁止童工、環境）。來源：Fairtrade International「What is Fairtrade?」https://www.fairtrade.net/about/faq 、「Fairtrade Premium」https://www.fairtrade.net/impact/fairtrade-premium-overview 。誘答「傾銷」「保護主義」「貿易壁壘」定義正確。未修改。
- **expert-028** 食物里程與在地食材。來源：農業部「食農教育」https://www.moa.gov.tw/ ；環境部「低碳飲食／食物里程」https://www.moenv.gov.tw/ 。未修改。
- **expert-029** 罪刑法定主義。刑法第 1 條：「行為之處罰，以行為時之法律有明文規定者為限。」短文改寫「必須在行為發生的當時，就已經有法律明文規定這個行為是犯罪，以及要受到什麼處罰」符合學理（罪與刑皆須法定），沒有失真；題目答案正確。來源：全國法規資料庫「中華民國刑法」https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=C0000001 ；臺北市法規查詢系統刑法全文 https://www.laws.taipei.gov.tw/law/LawSearch/LawExport/FL001424?type=0 ；法律百科「罪刑法定原則」https://www.legis-pedia.com/dictionary/5167 。
  - 修正：`explain` 與知識卡 `expert-legality`。原本「事後才修訂的法律不能拿來處罰修法前的行為」「事後新訂的法律不能處罰以前的行為」說得太廣：依刑法第 2 條第 1 項但書，行為時已有處罰、修法後新法較有利時，仍適用新法處罰修法前的行為。改為「行為時法律不處罰的行為，不能因為事後修法而受罰」「行為時不處罰的行為，不能因事後新訂的法律而受罰」。
- **expert-030** 立法程序：提案 → 委員會審查 → 院會三讀通過 → 總統公布。來源：立法院全球資訊網「立法程序」https://www.ly.gov.tw/Pages/List.aspx?nodeid=151 、「立法院議案審議的讀會程序為何？」https://www.ly.gov.tw/Pages/Detail.aspx?nodeid=217&pid=37534 、「三讀條文是否立即生效」https://www.ly.gov.tw/Pages/Detail.aspx?nodeid=217&pid=37536 ；全國法規資料庫「立法院職權行使法」https://law.moj.gov.tw/LawClass/LawAll.aspx?PCode=A0020058 ；憲法第 72 條。
  - 省略一讀、二讀：一讀在委員會審查之前、二讀與三讀在審查之後，項目「立法院院會三讀通過」位於審查之後，省略的步驟不影響四個項目的先後，沒有簡化成錯；題目已寫「大致要經過」，也涵蓋一讀時可決議逕付二讀的例外。
  - 提案機關：除行政院與立法委員（含黨團）外，司法院、考試院、監察院也可提出法律案。原項目「行政院或立法委員提出法律案」不算錯，但會讓學生以為只有兩者有提案權。
  - 修正：`items[0]`「行政院或立法委員提出法律案」→「行政院等機關或立法委員提出法律案」；`explain` 與知識卡 `expert-legislation` 的「法律案由行政院、立法委員等提出」→「法律案可由行政院、司法院、考試院、監察院或立法委員等提出」；`explain` 的「一讀後交付相關委員會審查」→「一讀後原則上交付相關委員會審查」。

## 知識卡

- `expert-mediterranean`：修正。原本「分布在南北緯約 30～40 度的大陸西岸」→「主要分布在南北緯約 30～40 度的大陸西岸與地中海沿岸」。原因：30～40 度大陸西岸是教科書通用範圍（AMS 詞彙寫約 30～45 度），但地中海盆地的分布沿地中海向東延伸到西亞沿岸，不限於大陸西岸。來源：AMS 詞彙 https://glossary.ametsoc.org/wiki/Mediterranean_climate ；Britannica「Mediterranean climate」https://www.britannica.com/science/Mediterranean-climate 。
- `expert-inflation`：修正語句。「中央銀行會調整利率等方式」→「中央銀行會以調整利率等方式」（缺動詞「以」）。事實來源：中央銀行 https://www.cbc.gov.tw/ 。
- `expert-legality`、`expert-legislation`：見 expert-029、expert-030。
- `expert-ring-of-fire`：印尼、臺灣位在環太平洋地震帶，查證正確（見 expert-015）。未修改。
- `expert-intl-org`：WTO 1995 年成立正確（見 expert-026）。未修改。
- 其餘 18 張知識卡的事實與對應題目的查證來源相同，未發現錯誤。

## 需要人工決定

本批沒有移到 `held` 的題目。以下兩點不屬於事實錯誤，提供給中立審閱與使用者參考：

1. 知識卡 `expert-world-religions` 寫「伊斯蘭教由穆罕默德創立」：這是 Britannica 與國中教科書的通用寫法，事實上沒有錯；但伊斯蘭教信徒視穆罕默德為「最後的先知」而非創立者，是否改成「由穆罕默德在阿拉伯半島傳布」，請中立審閱判斷。expert-010 的提示中使用「先知穆罕默德」，同樣請中立審閱確認用語。
2. expert-009 的「古印度文明」類別同時涵蓋印度河流域文明與雅利安人時期，與國中教科書的單元劃分一致；已在提示與詳解寫明時間先後。若希望分類題只考單一時期，可改為「印度河流域文明」並換掉「形成種姓制度」這張卡片。

## 原始來源核對（2026-10-28）

- 範圍：本批原紀錄沒有標示來源是否實際開啟，且多數以 Britannica 為主要來源；這次以 WebFetch 重新開啟原始頁面，逐題核對有具體事實（年份、地名、法條、氣候分類、制度內容）的題目。觀念題（expert-001、012、016、017、021～025、028：機會成本、均衡價格、公共財、工業區位等，沒有需要查證的具體事實）略過。
- 開啟情況：Britannica 全站回應 403；CIA World Factbook 已停刊（國家頁面只剩停刊公告），原紀錄 expert-011、expert-014 引用的 Factbook 頁面已失效，改用下列來源。本輪後段 WebSearch 額度用盡，無法再搜尋新網址。
- 結果：核對 19 題，全部一致；沒有修改題目、答案或知識卡。

- **expert-002** 已開啟 World History Encyclopedia「Johannes Gutenberg」https://www.worldhistory.org/Johannes_Gutenberg/ ：印刷機約 1450 年在美因茲運作、推動以本地語言印行、促進宗教改革。一致。
- **expert-003** 已開啟 World History Encyclopedia「Ottoman Empire」https://www.worldhistory.org/Ottoman_Empire/ ：鄂圖曼控制商路，迫使歐洲國家另尋新航路、葡萄牙繞過非洲。一致。
- **expert-004** 已開啟 美國國家檔案館「Social Security Act (1935)」https://www.archives.gov/milestone-documents/social-security-act （1935 年 8 月簽署）；美國國家檔案館「Tennessee Valley Authority Act (1933)」https://www.archives.gov/milestone-documents/tennessee-valley-authority-act （1933 年 5 月 18 日簽署，興建水壩、創造就業）。「1933 年起」「興建水壩等公共工程」「建立社會保險」一致。
- **expert-005** 已開啟 德國政府入口網站 deutschland.de「Day of German Unity」https://www.deutschland.de/en/topic/politics/day-of-german-unity （1989 年 11 月 9 日圍牆開放、1990 年 10 月 3 日統一）；柏林圍牆基金會「1961 | 1989. The Berlin Wall」https://www.stiftung-berliner-mauer.de/en/node/247 （1961～1989）。一致。
- **expert-006** 已開啟 羅浮宮館藏「漢摩拉比法典」https://collections.louvre.fr/en/ark:/53355/cl010174436 （漢摩拉比在位 -1792～-1750，與「約西元前 18 世紀」、`years` -1754 一致）；World History Encyclopedia「Cleisthenes」https://www.worldhistory.org/Cleisthenes/ （約 -508）、「Alexander the Great」https://www.worldhistory.org/Alexander_the_Great/ （-334 渡海進入小亞細亞）、「Augustus」https://www.worldhistory.org/augustus/ （-27 獲「奧古斯都」稱號）。一致。
- **expert-007** 已開啟 World History Encyclopedia「Christopher Columbus」https://www.worldhistory.org/Christopher_Columbus/ （1492 年 10 月 12 日）、「Martin Luther's 95 Theses」https://worldhistory.org/article/1891 （1517 年 10 月 31 日）、「French Revolution」https://www.worldhistory.org/French_Revolution/ （1789 年，受美國革命與啟蒙思想影響）；英國王室官網「William III and Mary II」https://www.royal.uk/william-and-mary （光榮革命後《權利法案》限制王權，議會成為政治的常設部分）；美國國家檔案館「Declaration of Independence」https://www.archives.gov/founding-docs/declaration （1776 年 7 月 4 日）。一致。
- **expert-008** 已開啟 凡爾賽宮官網「1919: the Treaty of Versailles」https://en.chateauversailles.fr/history/the-significant-dates/most-important-dates/1919-the-treaty-of-versailles （1919 年 6 月 28 日）；美國聯邦準備體系 Federal Reserve History「Stock Market Crash of 1929」https://www.federalreservehistory.org/essays/stock-market-crash-of-1929 （1929 年 10 月）；聯合國「History of the UN」https://www.un.org/en/about-us/history-of-the-un （1945 年 10 月 24 日）；deutschland.de（同 expert-005，1989）；美國國務院史料室「The Collapse of the Soviet Union」https://history.state.gov/milestones/1989-1992/collapse-soviet-union （1991 年 12 月）。一致。
- **expert-009** 已開啟 World History Encyclopedia「Caste System in Ancient India」https://www.worldhistory.org/article/1152/ （瓦爾納首見於《梨俱吠陀》，吠陀時期約 -1500～-1000，後來逐漸世襲化）；羅浮宮館藏（同 expert-006，楔形文字、巴比倫）。種姓制度形成於印度河流域城市文明之後的吠陀時期，與現行卡片提示、詳解一致。摩亨卓達羅：UNESCO 世界遺產頁面 https://whc.unesco.org/en/list/138/ 回應 403，**仍只有摘錄**。
- **expert-010** 習俗題（浴佛節、聖誕節、齋戒月、麥加朝聖），本輪未另開啟頁面，**仍只有原紀錄的 Britannica 來源（本輪 403）**。
- **expert-011** 已開啟 聯合國糧農組織 FAO「Egypt: Geography and population」https://www.fao.org/4/W4356E/w4356e0c.HTM （尼羅河谷與三角洲只占全國面積約 4%，人口密度極高；年雨量約 18 毫米，農業幾乎全靠灌溉）。一致。
- **expert-013** 已開啟 NASA Science「Tundra」https://science.nasa.gov/kids/earth/mission-biomes/biotundra （苔原橫跨北美、歐洲、西伯利亞，有永凍土、生長季短）。「冬季漫長嚴寒、永凍土、生長季短」一致。
- **expert-014** 已開啟 Saudipedia（沙烏地官方百科）「Geography of the Kingdom」https://saudipedia.com/en/article/191/geography/saudi-geography/geography-of-the-kingdom （西臨紅海、東臨阿拉伯灣〔波斯灣〕）。一致。
- **expert-015** 已開啟 美國國家地理教育「Plate Tectonics and the Ring of Fire」https://education.nationalgeographic.org/resource/plate-tectonics-ring-fire/ （日本、紐西蘭、印尼、智利都在環太平洋火山帶上）；USGS「What is the Ring of Fire?」https://www.usgs.gov/faqs/what-ring-fire?page=1 （太平洋板塊與周圍板塊交界，未列國名）。一致。知識卡「臺灣也是」：中央氣象署地震測報中心頁面沒有相關內容，**仍只有摘錄**（國家發展委員會公務出國報告 https://report.nat.gov.tw/ReportFront/PageSystem/reportFileDownload/C10700955/001 的搜尋摘要：臺灣位於環太平洋地震帶、菲律賓海板塊與歐亞板塊交界）。
- **expert-018** 已開啟 俄亥俄大學地理系「Mediterranean Climate」https://people.ohio.edu/dyer/TPE/tpe_3e/climate_systems/mediterranean.html （南北緯約 30～40 度的大陸西岸與地中海盆地；夏季副熱帶高壓、冬季西風帶來雨）；LibreTexts（Ritter《The Physical Environment》）9.5.01 https://geo.libretexts.org/Bookshelves/Geography_(Physical)/The_Physical_Environment_(Ritter)/09%3A_Climate_Systems/9.05%3A_Midlatitude_and_Subtropical_Climates/9.5.01%3A_Mediterranean_or_Dry_Summer_Subtropical_Climate 。與題目及知識卡 `expert-mediterranean` 一致。
- **expert-019** 已開啟 俄亥俄大學、LibreTexts（同 expert-018）：開普敦一帶、澳洲西南部屬地中海型氣候，與詳解「開普敦、伯斯附近」一致。柯本分類 Cs（最乾夏月少於 30 毫米且不到最濕冬月三分之一）、Cfb（最熱月低於 22 °C）的門檻：維也納獸醫大學 Köppen-Geiger 頁面沒有列定義、Springer 表格需登入、澳洲氣象局伯斯統計回應 403，**仍只有摘錄**。答案判斷（夏乾冬雨、南半球）不依賴這兩個門檻，維持原結論。
- **expert-020** 已開啟 NASA Science「Tundra」（同 expert-013）、「Rainforest」https://science.nasa.gov/kids/earth/mission-biomes/biorainforest （位於南北回歸線之間、近赤道）、「Desert」https://science.nasa.gov/kids/earth/mission-biomes/biodesert 。一致；頁面未逐一點名亞馬孫、剛果盆地、撒哈拉，屬通用地理知識。
- **expert-026** 已開啟 WTO「What is the WTO?」https://www.wto.org/english/thewto_e/whatis_e/whatis_e.htm （1995 年 1 月 1 日成立，處理貿易爭端、作為貿易談判場所）。一致。
- **expert-027** 已開啟 Fairtrade International「FAQ」https://www.fairtrade.net/about/faq （最低價格是價格下跌時的安全網、另付溢價金用於社區）；Fairtrade International 新聞稿 https://www.fairtrade.net/en/get-involved/Press-centre/fairtrade-international-secures-a-stronger-safety-net-for-coffee.html （最低價格「based on the sustainable cost of production」）。與短文「不低於生產成本的收購價格」、詳解「保障價格」一致。
- **expert-029** 已開啟 全國法規資料庫《中華民國刑法》第 1 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0000001&flno=1 （「行為之處罰，以行為時之法律有明文規定者為限。」）。一致。
- **expert-030** 已開啟 立法院「立法院議案審議的讀會程序為何？」https://www.ly.gov.tw/Pages/Detail.aspx?nodeid=217&pid=37534 （法律案一讀後交付委員會審查，亦可逕付二讀；二讀、三讀）；全國法規資料庫《中華民國憲法》第 72 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=A0000001&flno=72 （總統公布）、第 87 條 https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=A0000001&flno=87 （考試院得提出法律案）。一致。司法院、監察院的提案權（釋字第 175 號、第 3 號）：司法院英文解釋網頁出現資料庫連線錯誤、大法官解釋 PDF 無文字內容，**仍只有摘錄**（司法院 cons.judicial.gov.tw 解釋文的搜尋摘要）。

### 統計

- 核對 19 題（全部至少開啟 1 個原始頁面）；其中仍有部分細節只有摘錄的 4 題：expert-009（摩亨卓達羅）、expert-015（臺灣）、expert-019（柯本門檻）、expert-030（釋字第 175、3 號）；另 expert-010 本輪未開啟新頁面。
- 不一致：0 題；`data/bank/expert-1.json` 未修改。
