# expert-3 事實審閱紀錄

- 審閱對象：`data/draft/expert-3.json` → 輸出 `data/checked/expert-3.json`
- 檢查題數：43 題（expert-074～expert-116）、37 張知識卡（另連到 `data/bank/expert-1.json` 的 `expert-ancient-civ`、`expert-cold-war`、`expert-climate-types`）
- 修正數：7 題（expert-079、expert-083、expert-087、expert-089、expert-091、expert-110、expert-115）＋ 3 張知識卡（`expert3-french-revolution`、`expert3-european-integration`、`expert3-islamic-learning`）；**沒有任何題目的答案需要更改**
- 移到 `held`：0 題
- 驗證：`node scripts/validate-bank.mjs data/checked/expert-3.json` 通過（43 題、37 張知識卡）
- 來源說明：每題列出這次實際打開核對過的頁面。標示「（搜尋摘要）」的來源只看到搜尋結果摘要，頁面本身無法開啟（403 或 PDF 無法解析），只作為輔助，不算入「兩個來源」。Britannica 全站回應 403，這次沒有使用。

## 作答核對

先不看答案自行作答，43 題的答案（選擇題索引、排序、分類）與檔案中的 `answer`／`items`／`bins` 全部一致；每題答案唯一、誘答確實錯誤，排序與分類只有一種合理答案。

## 逐題查證

### 歷史（world）

- **expert-074** 尼羅河氾濫與幾何學、太陽曆。來源：Perseus 希羅多德《歷史》2.109（洪水沖走土地後派員丈量、希臘人由此學到測地術）https://fgh.perseids.org/read/greekLit/tlg0016/tlg001/perseus-eng2/2.109.1-2.109.3 ；Wikipedia「Egyptian calendar」（365 天曆法與天狼星、尼羅河氾濫及三個農業季節的關係）https://en.wikipedia.org/wiki/Egyptian_calendar 。未修改。備註：學界對曆法是否「為了預測氾濫」而制定仍有討論，但國中教科書的通行說法如此，誘答明顯錯誤，答案唯一。
- **expert-075** 希臘多山、平原分散而形成城邦。來源：LibreTexts「Geography and Topography」https://socialsci.libretexts.org/Courses/Mizzou_Academy/World_History_A_B/04%3A_The_Greek_World/4.02%3A_Geography_and_Topography ；World History Encyclopedia「Polis」https://www.worldhistory.org/polis/ （城邦各自獨立的制度）。未修改。
- **expert-076** 阿拉伯帝國翻譯運動與傳入西歐的路線。來源：Wikipedia「Graeco-Arabic translation movement」（8 世紀中期到 10 世紀末，巴格達、智慧宮，翻譯哲學、醫學、數學、天文）https://en.wikipedia.org/wiki/Graeco-Arabic_translation_movement ；Wikipedia「Latin translations of the 12th century」（托雷多、西西里島把阿拉伯文著作譯成拉丁文）https://en.wikipedia.org/wiki/Latin_translations_of_the_12th_century ；Revista Tradumàtica／Málaga 大學期刊論文摘要（巴格達智慧宮與托雷多翻譯學校比較）https://revistas.uma.es/index.php/revtracom/article/view/9569 。題目材料「八到十世紀」「經由西班牙、西西里島」正確。
  - 查證結果：十二世紀的拉丁文譯本首先影響經院哲學與大學，與文藝復興的關係是「基礎之一」，詳解已寫「成為文藝復興重新研究古典文化的基礎之一」，屬合理簡化；選項 D 與三個明顯錯誤的誘答相比答案唯一。
  - 修正：知識卡 `expert3-islamic-learning` 的 `body`。原本「…研究古希臘的哲學、醫學與數學，並傳入印度的數字。」→「…研究古希臘的哲學、醫學與數學，也吸收了印度的數字。」原因：「傳入印度的數字」主詞不清，容易讀成阿拉伯人把數字傳入印度；實際上是阿拉伯學者吸收印度的數字系統，再傳到西歐。
- **expert-077** 封建制度的背景（王權衰弱、外族侵擾）。來源：Wikipedia「Feudalism」（封建制度通常在帝國權力分散時出現，例如九世紀的加洛林帝國；以土地換取軍事服務與效忠）https://en.wikipedia.org/wiki/Feudalism ；World History Encyclopedia「Charlemagne」（加洛林帝國的背景）https://www.worldhistory.org/Charlemagne/ 。未修改。
- **expert-078** 黑死病使勞力短缺、農民地位提高、莊園制度瓦解。來源：World History Encyclopedia「Black Death」（1347 年傳入歐洲；工資上漲、勞動力更獨立、農奴制走向終結）https://www.worldhistory.org/Black_Death/ ；Wikipedia「Consequences of the Black Death」（勞力短缺、英格蘭農業工資在 1350～1450 年約倍增、西歐的莊園制度到 1500 年大致瓦解）https://en.wikipedia.org/wiki/Consequences_of_the_Black_Death 。詳解寫「莊園制度逐漸瓦解」，與「原本已在衰退、黑死病加速」的說法相容。未修改。
- **expert-079** 法國三個等級。撰寫者要求特別查證。
  - 人口：World History Encyclopedia「The Three Estates of Pre-Revolutionary France」（引 Lefebvre：約 2,700 萬人中，教士不超過 10 萬、貴族約 40 萬、第三等級約 2,650 萬）https://www.worldhistory.org/article/1960/the-three-estates-of-pre-revolutionary-france/ 。換算約 0.4%、1.5%、98%，表中「0.5%、1.5%、98%」是教學上通用的約略值（另見 Lumen Learning 世界史教材的 1.5%／98%，搜尋摘要）。
  - 稅賦：同一篇文章指出教士不必向國家繳稅，只以「自願捐獻」給王室；貴族免繳主要的土地稅（taille），但路易十六時期仍須繳人頭稅與二十分之一稅。因此「幾乎免稅」對貴族而言簡化過頭。
  - 修正 1：表格「稅賦」欄第一、二等級。原本「享有特權，幾乎免稅」→「享有特權，免繳許多稅」。
  - 修正 2：`material.note`。原本「改寫」→「約略估計，1789 年前後」。原因：表中是真實歷史的估計值，不是改寫的短文，依規格「引用真實統計時標示資料年份」。
  - 修正 3：`explain`。原本「…卻享有特權、幾乎免稅；」→「…卻享有特權、免繳許多稅（例如教士不必向國家繳稅，貴族免繳主要的土地稅）；」。
  - 修正 4：知識卡 `expert3-french-revolution` 的 `body`。原本「享有特權、幾乎免稅」→「享有特權、免繳許多稅」。
  - 答案不受影響（A：多數人負擔稅賦卻沒有特權）。
- **expert-080** 拉丁美洲獨立的背景。來源：World History Encyclopedia「Napoleon Bonaparte」（1808 年出兵西班牙、立其兄約瑟夫為王）https://www.worldhistory.org/Napoleon_Bonaparte/ ；美國國家檔案館與 World History Encyclopedia 的美國獨立、法國大革命年代（見 expert-1 紀錄）。誘答「冷戰」「聯合國」「世界工廠」年代都不合。未修改。
- **expert-081** 舒曼宣言與歐洲煤鋼共同體。撰寫者要求特別查證。來源：歐盟官網「Schuman declaration May 1950」（1950 年 5 月 9 日法國外長舒曼提出；法德煤鋼交由共同的高級機構管理、開放其他歐洲國家加入；戰爭「not merely unthinkable, but materially impossible」）https://european-union.europa.eu/principles-countries-history/history-eu/1945-59/schuman-declaration-may-1950_en ；歐洲議會「Treaty of Paris」（1951 年 4 月 18 日簽署、1952 年 7 月 23 日生效）https://www.europarl.europa.eu/about-parliament/en/in-the-past/the-parliament-and-the-treaties/treaty-of-paris 。
  - 材料的意譯「不只難以想像，而且實際上不可能發生」與原文相符；「1952 年，歐洲煤鋼共同體正式運作」正確。
  - 修正：知識卡 `expert3-european-integration` 的 `body`。原本「1952 年成立歐洲煤鋼共同體」→「1951 年簽約成立歐洲煤鋼共同體（1952 年開始運作）」。原因：「成立」易被理解為簽約年，寫明兩個年份避免與教科書的 1951 年說法衝突。
- **expert-082** 食鹽進軍（1930）與非暴力不合作。來源：中文維基百科「食鹽進軍」（1930 年 3 月 12 日出發、4 月 6 日抵達丹地；抗議食鹽專營與鹽稅）https://zh.wikipedia.org/zh-tw/食鹽進軍 ；聯合國「International Day of Non-Violence」（10 月 2 日為甘地生日，2007 年大會決議）https://www.un.org/en/observances/non-violence-day 。印度 1947 年獨立。未修改。
- **expert-083** 哥倫布大交換的作物分類。撰寫者要求特別查證。來源：Wikipedia「Columbian exchange」（美洲傳出：馬鈴薯、玉米、番茄、可可；傳入美洲：甘蔗、咖啡、小麥；咖啡約 1720 年由非洲與中東傳入美洲；甘蔗由印度次大陸傳到西印度群島）https://en.wikipedia.org/wiki/Columbian_exchange ；NOAA Voluntary Observing Ship「The Great Exchange」（哥倫布 1493 年第二次航行帶甘蔗到美洲；馬鈴薯原產安地斯、玉米原產墨西哥、可可由墨西哥送回西班牙；小麥由歐洲人帶入）https://vos.noaa.gov/MWL/dec_08/great_exchange.shtml 。
  - 查證結果：甘蔗最早在新幾內亞馴化（Wikipedia「Sugarcane」、「History of sugar」，搜尋摘要），再經南亞傳到地中海與大西洋島嶼。新幾內亞屬大洋洲，不屬「歐亞非」，原本類別「原產於歐亞非」對甘蔗不精確。
  - 修正 1：`bins`。原本「原產於美洲」「原產於歐亞非」→「從美洲傳到歐亞非」「從歐亞非傳到美洲」。原因：改成傳播方向，甘蔗確實由歐洲人從舊大陸帶到美洲，分類正確且唯一。
  - 修正 2：`question`。原本「…請把下列作物放到它的原產地。」→「…請依傳播的方向，把下列作物分類。」
  - 修正 3：甘蔗卡片 `hint`。原本「歐洲人把它帶到加勒比海地區大量種植，用來製糖。」→「哥倫布第二次航行時把它帶到加勒比海地區，後來大量種植、用來製糖。」原因：依 NOAA 頁面補上可查證的細節。
  - 其他卡片：咖啡原生於衣索比亞一帶正確；番茄傳入歐洲初期被當觀賞植物是通行說法。詳解與知識卡內容（以傳播方向描述）不必修改。
- **expert-084** 排序：吉薩大金字塔（-2560）→ 古代奧運（-776）→ 阿育王（-268）→ 基督教成為國教（380）。撰寫者要求特別查證。
  - 金字塔：World History Encyclopedia「Great Pyramid of Giza」（約西元前 2560 年，古夫在位 2589～2566 BCE）https://www.worldhistory.org/Great_Pyramid_of_Giza/ ；中文維基百科「吉薩大金字塔」（約西元前 2560 年完成）https://zh.wikipedia.org/zh-tw/吉薩大金字塔 。
  - 奧運：World History Encyclopedia「Olympic Games」（始於西元前 776 年）https://www.worldhistory.org/Olympic_Games/ ；詳解已寫「傳統上認為」，與通行說法一致。
  - 阿育王：World History Encyclopedia「Ashoka the Great」（在位 268～232 BCE）https://www.worldhistory.org/Ashoka_the_Great/ ；中文維基百科「阿育王」（約前 268～前 232 年，另有前 272 年即位之說）https://zh.wikipedia.org/zh-tw/阿育王 。不論取哪一說都介於前後兩事件之間，排序唯一。
  - 國教：中文維基百科「帖撒羅尼迦敕令」（380 年 2 月 27 日，狄奧多西一世等宣布尼西亞派基督教為國教）https://zh.wikipedia.org/zh-tw/帖撒羅尼迦敕令 。
  - 未修改。
- **expert-085** 排序：800、1215、1347、1498。來源：World History Encyclopedia「Charlemagne」（800 年聖誕節由教宗利奧三世加冕）https://www.worldhistory.org/Charlemagne/ ；「Magna Carta」（1215 年 6 月約翰王在蘭尼米德簽署，限制王權）https://www.worldhistory.org/Magna_Carta/ ；「Black Death」（1347 年傳入歐洲）https://www.worldhistory.org/Black_Death/ ；「Vasco da Gama」（1497 年 11 月繞過好望角、1498 年 5 月抵達卡利卡特）https://www.worldhistory.org/Vasco_da_Gama/ 。四件事相隔都超過百年，排序唯一。未修改。
- **expert-086** 排序：1804、1848、1863、1871。撰寫者要求查證解放奴隸宣言。來源：美國國家檔案館「The Emancipation Proclamation」（1863 年 1 月 1 日發布）https://www.archives.gov/exhibits/featured-documents/emancipation-proclamation ；中文維基百科「解放黑人奴隸宣言」（1862 年 9 月 22 日預告、1863 年 1 月 1 日生效）https://zh.wikipedia.org/zh-tw/解放黑人奴隸宣言 ；World History Encyclopedia「Napoleon Bonaparte」（1804 年 12 月 2 日稱帝）https://www.worldhistory.org/Napoleon_Bonaparte/ ；Marxists Internet Archive《共產黨宣言》（1848 年 2 月首次出版）https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ ；中文維基百科「德意志帝國」（1871 年 1 月 18 日於凡爾賽宮宣布成立）https://zh.wikipedia.org/zh-tw/德意志帝國 。即使把宣言視為 1862 年預告，排序也不變。未修改。
- **expert-087** 排序：1917、1949、1957、1994。撰寫者要求查證。來源：World History Encyclopedia「Russian Revolution」（十月革命 1917 年 11 月 7 日，舊曆 10 月 25 日）https://www.worldhistory.org/Russian_Revolution/ ；北約官網「Founding treaty」（1949 年 4 月 4 日簽署）https://www.nato.int/cps/en/natohq/topics_67656.htm ；NASA「Sputnik 1」（1957 年 10 月 4 日）https://www.nasa.gov/image-article/sputnik-1/ ；South African History Online「South African general elections 1994」與 https://sahistory.org.za/node/96863 （1994 年 4 月 27 日首次全民選舉，搜尋摘要）；主要種族隔離法律已在 1991 年 6 月廢除（Christian Science Monitor 1993 年年表，搜尋摘要）。
  - 修正 1：`keys[1]`。原本「…南非廢除種族隔離，是在冷戰結束之前還是之後？」→「…南非舉行不分種族的全民選舉，是在冷戰結束之前還是之後？」。原因：主要種族隔離法律在 1991 年 6 月廢除，與蘇聯解體（1991 年 12 月）同年，原提問的答案不明確；改問 1994 年的選舉，答案清楚是冷戰之後。
  - 修正 2：`explain`。原本「1994 年南非舉行首次不分種族的全民選舉，結束種族隔離制度。」→「…，象徵種族隔離制度正式結束。」原因：法律層面的廢除早於 1994 年，選舉是制度結束的象徵與完成。

### 地理（world-geo、climate、economy-geo）

- **expert-088** 荷蘭圩田。撰寫者要求查證「約四分之一低於海平面」。來源：DutchNews「UN climate panel admits Dutch sea level error」（荷蘭約 26% 低於海平面，IPCC 2007 年誤植為 55%）https://www.dutchnews.nl/2010/02/un_climate_panel_admits_dutch/ ；第二來源：荷蘭 webwoordenboek 知識中心「Hoe diep ligt Nederland?」（依現行高程圖約 26% 低於 NAP，搜尋摘要，頁面 403）。「約四分之一」與 26% 相符。未修改。
- **expert-089** 亞馬遜雨林變為牧場與大豆田的環境影響。來源：Wikipedia「Deforestation of the Amazon rainforest」（養牛約占巴西亞馬遜毀林 80%，大豆也是重要因素；影響生物多樣性與碳吸收）https://en.wikipedia.org/wiki/Deforestation_of_the_Amazon_rainforest ；Re:wild「Brazil case study」（牛隻與飼料作物是生物多樣性最大威脅）https://www.rewild.org/brazil-case-study 。
  - 修正：表頭「牧場與大豆田」→「牧場與大豆田（指數）」。原因：第二欄原本沒有單位，與第一欄「森林（指數）」不一致，學生無法判斷數字意義。
- **expert-090** 剛果河因高原邊緣的瀑布急流無法從出海口上溯。來源：Wikipedia「Livingstone Falls」（金夏沙到馬塔迪之間的急流是下游航運的障礙，因此修築鐵路繞行）https://en.wikipedia.org/wiki/Livingstone_Falls ；Britannica「Livingstone Falls」（32 處急流，使馬塔迪到馬萊博湖之間無法航行，搜尋摘要）。未修改。
- **expert-091** 紐西蘭櫻桃的反季節出口。來源：紐西蘭官方百科 Te Ara「Stone fruit and the summerfruit industry」（出口季從聖誕節前開始、2 月初結束，搜尋摘要，頁面 403）；FreshPlaza、Asiafruit 等產業新聞（臺灣長年是最大買家，其次為中國，搜尋摘要）；紐西蘭南緯約 34～47 度為一般地理常識。
  - 修正：`question`。原本「…因此很受日本、歐洲等地市場歡迎。」→「…因此很受臺灣等北半球地區的市場歡迎。」原因：紐西蘭櫻桃主要銷往臺灣與東亞，找不到「日本、歐洲」為主要市場的依據；改成可查證的寫法，也與知識卡「冬天在臺灣市場買到的新鮮櫻桃，常來自南半球」一致。
- **expert-092** 新加坡的航運要衝與水資源。來源：新加坡外交部「Water Agreements」（依 1962 年協定每日自柔佛河取 2.5 億加侖原水）https://www.mfa.gov.sg/about-mfa/key-issues/water-agreements/ ；新加坡國家圖書館 Infopedia 水協定條目（搜尋摘要）。材料「連用水都有一部分要向鄰國購買」正確。未修改。
- **expert-093** 巴拿馬運河。來源：巴拿馬運河管理局「History」（1914 年 8 月 15 日通航；之前須繞行南美洲南端的合恩角）https://pancanal.com/en/history/ ；Wikipedia「Panama Canal」（搜尋摘要）。未修改。
- **expert-094** 地形成因分類。來源：密西根州立大學地理系「Great Lakes' origins」（冰體刨蝕冰河期前的河谷形成湖盆）https://project.geo.msu.edu/geogmich/lakeorigins.html ；WorldAtlas「How the Great Lakes were formed」（搜尋摘要）。喜馬拉雅山、阿爾卑斯山為板塊碰撞、恆河三角洲與密西西比河下游為沖積、芬蘭湖泊為冰河作用，屬教科書通行內容，參考 USGS「Ring of Fire」及 expert-1 紀錄中的板塊來源。未修改。
- **expert-095** 由剛果盆地往北到阿爾及利亞北部的氣候。來源：Wikipedia「Climate of Africa」（剛果盆地雨林、撒哈拉以南莽原、薩赫爾半乾燥帶、撒哈拉沙漠、北緣地中海型氣候）https://en.wikipedia.org/wiki/Climate_of_Africa ；Wikipedia「Köppen climate classification」https://en.wikipedia.org/wiki/K%C3%B6ppen_climate_classification 。沙漠與莽原之間還有半乾燥草原，但不在選項中，四個項目的順序唯一。未修改。
- **expert-096** 阿他加馬沙漠、納米比沙漠與涼流。撰寫者要求查證譯名。來源：NOAA Climate.gov「Flooding in the Atacama Desert: How did that happen?」（副熱帶高壓與冷的洪保德洋流使阿他加馬乾燥）https://content-drupal.climate.gov/news-features/event-tracker/flooding-atacama-desert-how-did-happen ；Atlas of Namibia「Climate」（本格拉洋流的冷海水使上方空氣降溫，南大西洋反氣旋的下沉氣流抑制雲雨）https://atlasofnamibia.online/node/41 。事實內容正確，未修改。
  - 譯名：題庫中「阿他加馬沙漠」「納米比沙漠」是臺灣常見寫法（外交部國名為「納米比亞」）。這次無法開啟國家教育研究院樂詞網（動態載入）與教科書，**未能確認是否與各版國中教科書一致**，列入「需要人工決定」。
- **expert-097** 氣候圖表判讀（熱帶莽原）。來源：Wikipedia「Köppen climate classification」（A 類各月均溫 18°C 以上；Aw 有明顯乾季）https://en.wikipedia.org/wiki/K%C3%B6ppen_climate_classification ；Wikipedia「Tropical savanna climate」（乾溼季分明，乾季多在低日照季節）https://en.wikipedia.org/wiki/Tropical_savanna_climate 。表中各月 26～31°C、7 月 210 mm、1 月 2 mm，屬北半球熱帶莽原；地中海型冬雨夏乾、溫帶大陸性溫差大，誘答確實錯。未修改。
- **expert-098** 工業區位導向分類。來源：國家教育研究院「全國中小學題庫網」國中段考題（水泥靠近石灰岩、製糖靠近蔗田、烘焙業設在城市、工資占比高的工廠以勞力為區位考量，搜尋摘要；網站 DNS 無法解析）；SaveMyExams「Factors affecting industry location」（原料笨重或易腐的工業靠近原料、成品笨重或易腐的靠近市場，搜尋摘要）。分類為臺灣國中地理教科書的通行例子；兩個來源都只看到搜尋摘要，未能開啟全文。未修改。
- **expert-099** 美國中部機械化穀物農業。撰寫者要求比對 expert-2 的 053。來源：Wikipedia「Extensive farming」（地勢平坦、農場面積大時，機械化效率高、每單位勞力產量高）https://en.wikipedia.org/wiki/Extensive_farming ；`data/checked/expert-2.json` 的 expert-053 審閱已查證「美國大平原以機械大規模種植小麥」。只有一個這次新開的外部頁面，但內容是國中地理「商業性穀物農業」的標準說法，誘答（人口稠密、梯田、高溫多雨）與美國中部明顯不符。
  - 與 expert-053 比對：053 是分類題（熱帶栽培業、商業性穀物農業、游牧，其中一張卡片是「美國大平原的大型小麥田」），099 是選擇題問「為什麼機械化」（地廣人稀、資金技術充足）。兩題考的重點不同，不算重複；同一場遊戲可能都出現美國大平原，但不會互相洩題。未修改。
- **expert-100** 微笑曲線。來源：遠見雜誌「微笑曲線」專文（1992 年施振榮提出，研發與品牌服務附加價值高、中游製造最低）https://www.gvm.com.tw/article/9101 ；政大、陽明交大的實證論文摘要（搜尋摘要）。表為虛構資料。未修改。
- **expert-101** 產業空洞化。來源：日文維基百科「産業の空洞化」（生產移往海外使國內產業基礎衰退、工作機會流失）https://ja.wikipedia.org/wiki/産業の空洞化 ；政大學位論文與日本勞動政策研究機構（JILPT）簡報（製造業對外投資使國內雇用下降，搜尋摘要，PDF 無法解析）。未修改。

### 公民（economy、global、law）

- **expert-102** 直接稅與間接稅。來源：法律百科 Legispedia「間接稅與直接稅」（區分標準是能否轉嫁；營業稅為間接稅、所得稅與地價稅為直接稅）https://www.legis-pedia.com/article/government-fundamental-rights/834 ；政府資料開放平臺「全國賦稅收入實徵淨額－按直接稅與間接稅分」（財政部統計處依各稅目轉嫁性分類）https://data.gov.tw/dataset/6743 ；財政部 114 年稅收分析的報導（直接稅含所得稅、土地稅、房屋稅；間接稅含關稅、營業稅、貨物稅、菸酒稅，搜尋摘要，頁面 403）。未修改。
- **expert-103** 比較利益計算。自行驗算：甲國 1 單位米＝2 單位布、1 單位布＝0.5 單位米；乙國 1 單位米＝1 單位布。甲國生產布、乙國生產米。來源：StockFeel 股感「國際分工與比較利益」（比較的是相對機會成本，即使一國兩者都有絕對利益）https://www.stockfeel.com.tw/%E5%9C%8B%E9%9A%9B%E5%88%86%E5%B7%A5%E8%88%87%E6%AF%94%E8%BC%83%E5%88%A9%E7%9B%8A-2 ；香港中文大學經濟系比較優勢教案（搜尋摘要）。未修改。
- **expert-104** 降息刺激景氣。來源：美國聯準會「Monetary Policy: What Are Its Goals? How Does It Work?」（降息使貸款成本下降，促進消費與企業投資）https://www.federalreserve.gov/monetarypolicy/monetary-policy-what-are-its-goals-how-does-it-work.htm ；渣打銀行（臺灣）「降息」說明（降息降低融資成本、鼓勵投資與消費）https://www.sc.com/tw/personal-loan/articles/rate-cut/ ；中央銀行 2001 年新聞參考資料（連續降息的寬鬆政策）https://www.cbc.gov.tw/tw/cp-302-20550-DD042-1.html 。未修改。
- **expert-105** 信用卡與簽帳金融卡。撰寫者要求查證用詞。來源：Money101「簽帳金融卡懶人包」（簽帳金融卡刷卡後由連結帳戶圈存或扣款；信用卡使用信用額度、之後繳款）https://www.money101.com.tw/blog/現金回饋-簽帳金融卡-懶人包-銀行金融卡-海外刷卡-Debit ；國泰世華、星展等銀行的簽帳金融卡約定條款（消費先自活期存款帳戶圈存、不得超過可用餘額，搜尋摘要）。「簽帳金融卡」是臺灣銀行業與金管會通用的正式名稱，用詞正確。信用卡未全額繳清須付循環利息、逾期須付違約金，詳解正確。未修改。
- **expert-106** 聯合行為與《公平交易法》。來源：全國法規資料庫《公平交易法》第 14、15 條（同一產銷階段的競爭事業以合意共同決定價格、數量、交易對象或地區，原則禁止）https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0150002 ；公平交易委員會網站「結合暨聯合行為專區」https://www.ftc.gov.tw/internet/main/doc/docDetail.aspx?uid=219&docid=203 ；公平會對水泥業聯合行為的處分新聞（2011 年哄抬價格、2023 年劃分市場，搜尋摘要）。未修改。
- **expert-107** 分工提高效率。屬經濟學基本概念，材料為虛構資料；誘答（人數、價格、補助）在材料中都沒有出現。參考 StockFeel 國際分工文章（同 103）與國中公民「分工與貿易」單元教案（彰化縣永靖國中公開授課資料，搜尋摘要）。未修改。
- **expert-108** 定存與股票的風險報酬。屬基本理財概念：定存利率事先約定，股票價格隨公司經營與市場變動，選項 D 以外三個選項都是絕對化的錯誤說法（「一定」「保證」「完全相同」）。這次沒有另外開啟專門頁面查證，屬常識性原則；題目只比較原則，沒有提供個別投資建議。未修改。
- **expert-109** 價格下限與政府收購。自行驗算：均衡價格 30 元（需求量＝供給量＝400）；50 元時需求 200、供給 600，過剩 400 公斤。表為虛構資料，計算唯一。未修改。
- **expert-110** 東協降低關稅。來源：東協官網「Agreement on the CEPT Scheme for AFTA」（1993 年起分階段把區內關稅降到 0～5%，搜尋摘要，頁面轉址）；東協秘書處「AFTA」說明 PDF（搜尋摘要）；WTO 通報（CEPT 已由東協貨品貿易協定 ATIGA 取代，搜尋摘要）。
  - 修正：`explain`。原本「…歐洲聯盟則進一步整合到人員自由移動與共同貨幣（歐元）。」→「…歐洲聯盟則進一步整合到人員自由移動，許多會員國也使用共同貨幣歐元。」原因：並非所有歐盟會員國都使用歐元，原寫法容易讓學生以為歐盟全體共用貨幣。
- **expert-111** 吐瓦魯與海平面上升。來源：吐瓦魯政府提交聯合國秘書長海平面上升報告的意見書（環礁下的淡水透鏡淺、易受海水入侵，特別是暴潮與大潮時）https://sdgs.un.org/sites/default/files/2026-02/Tuvalu.pdf ；Wikipedia「Climate change in Tuvalu」（平均海拔不到 2 公尺、最高點約 4.6 公尺，搜尋摘要）。材料「大部分陸地的海拔只有幾公尺」正確。未修改。
- **expert-112** 臺灣的移工。來源：政府資料開放平臺「產業及社福移工人數」新聞（移工來自印尼、菲律賓、越南、泰國等；產業移工以製造業為主、社福移工以家庭看護為主）https://data.gov.tw/news/32041 ；全國法規資料庫《就業服務法》第 46 條（海洋漁撈工作、家庭幫傭及看護工作等）https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=N0090001&flno=46 。題目「工廠、漁船與家庭照顧工作」正確。未修改。
- **expert-113** 權利類別。撰寫者要求查證是否與國中教科書一致。來源：全國法規資料庫《中華民國憲法》第 10、11、16、17、18、21 條 https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001 ；興望法律事務所「憲法基本權利完整解析」（自由權含言論、居住遷徙自由；受益權含訴訟權；參政權含選舉、應考試、服公職）https://bhlaw.com.tw/constitutional-fundamental-rights-guide-basic-rights-four-fundamental-human-rights-constitutional-protections/ ；三民輔考「權利與義務」（訴訟權為司法上受益權、受國民教育為教育上受益權、應考試服公職屬參政權）https://www.3people.com.tw/%E7%9F%A5%E8%AD%98/%E6%AC%8A%E5%88%A9%E8%88%87%E7%BE%A9%E5%8B%99/%E5%85%AC%E8%81%B7%E8%80%83%E8%A9%A6/a780da9f-783d-488b-bce8-637d649f976d 。
  - 查證結果：「平等權、自由權、受益權、參政權」是國中公民的通行分類，六張卡片的歸類與上述資料一致。學理上另有把受國民教育權歸入「社會權」的分法（湯德宗《憲法有聲書》講義，搜尋摘要），但題目的類別只有自由權、受益權、參政權三類，受國民教育只能放受益權，答案唯一。未修改。
- **expert-114** 憲法第 23 條與比例原則。來源：全國法規資料庫《中華民國憲法》第 23 條 https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001 ；《行政程序法》第 7 條（適當性、必要性、衡量性）https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=A0030055&flno=7 。材料改寫忠於條文。未修改。
- **expert-115** 網購 7 日解約權與例外。撰寫者要求特別查證。來源：全國法規資料庫《消費者保護法》第 19 條（收受商品後 7 日內，以退回商品或書面通知解除契約，無須說明理由及負擔任何費用或對價；通訊交易有合理例外情事者不在此限）、第 2 條第 10 款（通訊交易定義）https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0170001 ；《通訊交易解除權合理例外情事適用準則》第 2 條（易腐敗或保存期限短、客製化給付、報紙期刊雜誌、拆封的影音商品或電腦軟體、非有形媒介的數位內容、已拆封的個人衛生用品、國際航空客運；**須經企業經營者告知消費者**）https://6laws.net/6law/law3/通訊交易解除權合理例外情事適用準則.htm ；行政院消費者保護處 2024 年 7 月 26 日函釋（例外須事先告知，客製化舉例）https://www.ey.gov.tw/Page/24C4B877E850ED4E/008d4919-f21e-4caa-90be-82d745cdf63f 。
  - 外套沒有瑕疵、非例外商品，選項 A 正確；選項 B「只要拆封就一律不能退貨」因「一律」而錯（拆封只影響影音、軟體、個人衛生用品等例外），提示寫法沒有錯。
  - 修正：`explain`。原本「…不必說明理由，也不用負擔任何費用；客製化商品、易腐壞的食品等則有例外。」→「…；易腐壞的食品、依消費者要求客製化的商品等，經業者事先告知，可以不適用。」原因：依準則第 2 條，例外必須「經企業經營者告知消費者」才成立，原寫法讓人以為這些商品自動不能退。
- **expert-116** 無罪推定原則。來源：全國法規資料庫《刑事訴訟法》第 154 條（被告未經審判證明有罪確定前，推定其為無罪）https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=C0010001&flno=154 ；《中華民國憲法》第 8 條（非由法院依法定程序不得審問處罰）https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001 。材料為虛構情境。未修改。

## 知識卡

37 張知識卡逐張與上列來源核對。除上文已列的 3 張（`expert3-french-revolution`、`expert3-european-integration`、`expert3-islamic-learning`）外未修改。補充核對：

- `expert3-gandhi`：10 月 2 日「國際非暴力日」，見聯合國頁面（expert-082）。
- `expert3-islamic-learning`：「代數」（algebra）源自阿拉伯文 al-jabr，見 Wikipedia「Graeco-Arabic translation movement」相關的花拉子米著作說明。
- `expert3-european-integration`：歐盟 1993 年成立（馬斯垂克條約生效），申根與歐元的「許多國家」寫法正確。
- `expert3-columbian-exchange`：番薯、玉米、辣椒原產美洲，見 Wikipedia「Columbian exchange」。
- `expert3-cold-current-desert`：海岸沙漠多霧，見 NOAA Climate.gov 頁面與 Atlas of Namibia。
- `expert3-africa-plateau`：剛果河流量僅次於亞馬遜河，「世界水量最大的河流之一」正確。

## 需要人工決定

1. **expert-096 的譯名**：「阿他加馬沙漠」「納米比沙漠」是臺灣常見寫法，但這次無法連上國家教育研究院樂詞網與教科書確認。若各版國中地理課本使用「阿塔卡馬沙漠」「那米比沙漠」等寫法，請改成教科書用字（同時改知識卡 `expert3-cold-current-desert`）。
2. **expert-079 的人口比例**：0.5%、1.5%、98% 是教學通用的約略值（依 Lefebvre 的估計實際約 0.4%、1.5%、98%）。已把 `note` 改為「約略估計，1789 年前後」；若希望材料標示「虛構資料」或改成「約 0.4%」，請決定。
3. **expert-083 的類別名稱**：已由「原產於美洲／原產於歐亞非」改成「從美洲傳到歐亞非／從歐亞非傳到美洲」，以免甘蔗（原產新幾內亞）分類不精確。若希望保留「原產地」的問法，替代做法是把甘蔗換成牛、馬以外的其他舊大陸作物（例如稻米、柑橘）。
4. **expert-099 與 expert-2 的 053**：不算重複（一題分類、一題問成因），保留兩題；若希望同一批遊戲中不要同時出現「美國大平原的小麥」，可把 053 的卡片改成加拿大大草原或澳洲。
5. **來源較弱的題目**：expert-098（工業區位導向，兩個來源都只有搜尋摘要）、expert-107、expert-108（基本經濟與理財概念，未另找專門頁面）、expert-091（紐西蘭櫻桃市場，只有產業新聞的搜尋摘要）。內容都是國中教科書的通行說法，判斷可以保留；若要求每題都有兩個已開啟的政府或學術頁面，請再補查。

## 原始來源核對（2026-10-28）

- 範圍：補查原紀錄標示「（搜尋摘要）」或只有一個已開啟來源、且有具體事實的題目。觀念與計算題（expert-103 比較利益、107 分工、108 定存與股票、109 價格下限計算）略過。
- 開啟情況：Britannica、紐西蘭 Te Ara、新加坡公用事業局仍回應 403；本輪後段 WebSearch 額度用盡，無法再搜尋新網址。
- 結果：核對 3 題，全部一致；沒有修改題目、答案或知識卡。

- **expert-087** 已開啟 南非政府官網「History」https://www.gov.za/about-sa/history （「South Africa held its first democratic election in April 1994 under an interim Constitution.」）。`years` 1994 與詳解一致。另外三件事原紀錄已開啟北約、NASA、World History Encyclopedia。
- **expert-091** 已開啟 紐西蘭夏季水果產業協會 Summerfruit NZ「Market data」https://www.summerfruitnz.co.nz/industry/market-data （2025-26 產季櫻桃出口：臺灣約 134 萬公斤居首，其次為中國、越南）與「Export markets」https://www.summerfruitnz.co.nz/industry/export/markets 。題目「很受臺灣等北半球地區的市場歡迎」一致。採收期 12 月～1 月：Te Ara https://teara.govt.nz/en/stone-fruit-and-the-summerfruit-industry 仍回應 403，**仍只有摘錄**。
- **expert-110** 已開啟 亞洲開發銀行亞洲區域整合中心 ARIC「ASEAN Free Trade Area」https://aric.adb.org/fta/asean-free-trade-area （1992 年 1 月 28 日簽署、1993 年 1 月 1 日生效；2010 年東協貨品貿易協定生效）。「東協會員國陸續降低彼此之間的關稅」一致；CEPT 0～5% 的稅率細節題目沒有使用。東協官網 https://asean.org/our-communities/economic-community/trade-in-goods/ 轉址無法開啟。
- **expert-088** 荷蘭政府「Water management」https://www.government.nl/topics/water-management 與水利署 Rijkswaterstaat「Water safety」https://www.rijkswaterstaat.nl/en/water/water-safety 已開啟，只寫「國土有一大部分低於海平面」，沒有百分比；荷蘭環境評估署更正頁面回應 404。「約四分之一」**仍只有原紀錄的 DutchNews 一個已開啟來源**，方向一致。
- **expert-090** 美國國家地理教育「Congo River」頁面回應 404，**仍只有原紀錄的維基百科與 Britannica 摘錄**。
- **expert-092** 新加坡公用事業局「Imported Water」https://www.pub.gov.sg/Public/WaterLoop/OurWaterStory/NationalTaps/ImportedWater 回應 403，**仍只有原紀錄的新加坡外交部一個已開啟來源**。
- **仍只有摘錄或單一來源（本輪未能開啟新頁面）**：expert-098（工業區位導向）、expert-100（微笑曲線，遠見雜誌一個已開啟來源）、expert-101（產業空洞化）、expert-105（簽帳金融卡）、expert-111（吐瓦魯，政府意見書一個已開啟來源）。內容都是國中教科書的通行說法，原紀錄判斷可以保留。

### 統計

- 核對 3 題（expert-087、091、110），另嘗試 3 題（expert-088、090、092）但沒有開到含具體數據的原始頁面。
- 不一致：0 題；`data/bank/expert-3.json` 未修改。
