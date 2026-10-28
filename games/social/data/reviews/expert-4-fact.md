# expert-4 事實審閱紀錄

- 審閱對象：`data/draft/expert-4.json` → 輸出 `data/checked/expert-4.json`
- 檢查題數：42 題（expert-117～expert-158）、34 張知識卡（另連到 `data/bank/expert-1.json` 的 `expert-industrial-revolution`、`expert-inflation`，以及 `data/bank/hard-1.json` 的 `hard-remedy`）
- 修正數：10 題（expert-118、expert-119、expert-123、expert-126、expert-127、expert-133、expert-136、expert-137、expert-151、expert-155）＋ 5 張知識卡（`expert4-persia`、`expert4-rome`、`expert4-meiji`、`expert4-bangladesh`、`expert4-africa-independence`）；沒有任何題目的答案需要更改
- 移到 `held`：0 題
- 驗證：`node scripts/validate-bank.mjs data/checked/expert-4.json` 通過（42 題、34 張知識卡）
- 來源說明：下列網址都是本次實際打開核對過的頁面。Britannica、UNESCO 世界遺產中心、大英博物館、Met Museum 本次回應 403 或 429 無法開啟，因此改用政府機關（全國法規資料庫、勞動部、行政院、聯合國、非洲聯盟、國立國會圖書館）、World History Encyclopedia、National Geographic Education、耶魯 Avalon Project 與維基百科（維基百科作為其中一個來源，並對照其他來源）。

## 作答核對

先不看答案自行作答，42 題的答案（選擇題索引、排序、分類）與檔案中的 `answer`／`items`／`bins` 全部一致；每題答案唯一、誘答確實錯誤，排序與分類只有一種合理答案（expert-151 原本有一張卡可能有兩種答案，已替換，見下）。

## 撰寫者標記項目的結論

| 標記 | 結論 |
| --- | --- |
| expert-127 巴格達 762、泰姬瑪哈陵 1643 或 1653 | 巴格達 762 年 8 月動工、763 年哈里發遷入，762 正確。泰姬瑪哈陵 1632 年動工，陵墓本體 1648（World History Encyclopedia 寫 1649）完成，整個建築群約 1653 年完成；各來源不一，`years` 改 1648，詳解改寫「十七世紀中期完工」。排序不受影響。 |
| expert-126 迦太基前 814、查士丁尼法典 529 | 前 814 是傳統說法（現代史家普遍採用，考古證據略晚），題目已寫「傳統上認為」，保留。查士丁尼 528 年 2 月**下令**編纂、529 年 4 月**頒布**第一部法典；項目文字是「下令編纂」，`years` 改 528，詳解補「隔年頒布第一部法典」。 |
| expert-120 曼薩・穆薩與開羅金價 | 1324 年朝聖；奧馬里（al-Umari）記載金價下跌、至少 12 年沒有回升。「據說使開羅的金價下跌了好幾年」符合史料性質（出自同時代記載），保留。 |
| expert-119 十二表法 | 約前 451～450 年制定、前 449 年公布，「西元前五世紀中期」正確；李維記載刻在銅表上（另有象牙之說），保留「銅表」。之前法律由貴族出身的祭司（pontifices）解釋，詳解「貴族出身的官員」改為「貴族出身的祭司」。 |
| expert-123 五條誓文改寫 | 原改寫只有四條，**漏掉第三條**（官武一途庶民ニ至ル迄各其志ヲ遂ケ…）且編號改成一～四，與「五條誓文」不符。已補成五條，第四條補「依循普遍的公理」（天地ノ公道），第五條改「振興國家的基業」（皇基）。答案不受影響。 |
| expert-158 民法成年 18 歲 | 民法第 12 條「滿十八歲為成年」自 2023 年 1 月 1 日施行；第 13、77、79 條內容與短文一致；`asOf: 2023` 與題目「依 2023 年起施行的民法規定」正確。未修改。 |
| expert-150／最低工資法 | 撰寫者標記的 expert-150 是物價與實質所得題（連到 `expert-inflation`），沒有時效性數字，不需要 `asOf`。最低工資題是 **expert-149**：題目不涉及金額，不需要 `asOf`。知識卡 `expert4-min-wage`「《最低工資法》自 2024 年起施行」**正確**（2023 年 12 月 27 日公布，行政院核定 2024 年 1 月 1 日施行）。 |
| expert-155 APEC 與紅十字國際委員會 | APEC 是「跨政府論壇」，成員稱「會員經濟體」，題目原寫「下列國際組織」不精確，改為「下列國際組織與合作論壇」；卡片提示原本就寫「論壇」。中文名稱「亞太經濟合作」依我國官方用法。紅十字國際委員會官方中文名即「紅十字國際委員會」（ICRC 中文網站），正確；它是瑞士法下的私人人道組織，不是政府間組織，改題目後已涵蓋。聯合國難民署正式名稱「聯合國難民事務高級專員公署」，簡稱「聯合國難民署」通用，保留。 |
| expert-157 合理使用 | 著作權法第 52 條（為報導、評論、教學、研究等正當目的，在合理範圍內引用）、第 64 條（應明示出處）、第 65 條（合理使用不構成侵害、四項判斷基準）與題目、詳解一致。未修改。 |
| expert-152 SDGs | 2015 年通過「2030 永續發展議程」，17 項目標、169 項細項目標，2030 年為目標年，整合經濟、社會、環境。正確，未修改。 |
| 表格 `note` | 四題表格（expert-139、expert-143、expert-146、expert-153）都有 `note:"虛構資料"`；**expert-146 有寫 note**，不需補。六題短文（expert-118、expert-120、expert-123、expert-132、expert-148、expert-158）都有「改寫」或「改寫自…」。 |

## 逐題查證

### 歷史（world）

- **expert-117** 腓尼基字母與商業。來源：維基百科「Phoenician alphabet」https://en.wikipedia.org/wiki/Phoenician_alphabet （22 個子音字母、希臘人加上母音、演變為拉丁字母、由航海商人傳播）；World History Encyclopedia「Phoenician Alphabet」https://www.worldhistory.org/Phoenician_Alphabet/ （希臘字母約前八世紀源自腓尼基字母、腓尼基城市繁榮建立在貿易）。未修改。
- **expert-118** 波斯帝國的寬容政策。來源：維基百科「Cyrus Cylinder」https://en.wikipedia.org/wiki/Cyrus_Cylinder （前 539 年征服巴比倫，讓被遷居者返鄉、修復神殿）；維基百科「Achaemenid Empire」https://en.wikipedia.org/wiki/Achaemenid_Empire （宗教寬容；**埃及由岡比西斯於前 525 年征服**）；World History Encyclopedia「Cyrus Cylinder」https://www.worldhistory.org/Cyrus_Cylinder/ （前 539 年）。
  - 修正 `explain`：「居魯士建立波斯帝國，領土橫跨西亞、埃及到印度河一帶」→「居魯士建立波斯帝國，後來的國王再把領土擴展到埃及與印度河一帶」。原因：埃及與印度河一帶是居魯士之後的國王征服的。知識卡 `expert4-persia` 同步修正。
- **expert-119** 十二表法。來源：World History Encyclopedia「Twelve Tables」https://www.worldhistory.org/Twelve_Tables/ （前 451～450 年、銅表、之前只有貴族與祭司解釋法律）；耶魯 Avalon Project「The Twelve Tables」https://avalon.law.yale.edu/ancient/twelve_tables.asp （前 451～450 年編成、前 449 年批准、立於廣場）；維基百科「Twelve Tables」https://en.wikipedia.org/wiki/Twelve_Tables （李維記載為銅表；之前由貴族祭司 pontifices 解釋）。
  - 修正 `explain`：「由貴族出身的官員解釋」→「由貴族出身的祭司掌握與解釋」。原因：依來源，解釋法律的是祭司團。
- **expert-120** 馬利帝國的黃金與鹽貿易。來源：National Geographic Education「Mansa Musa (Musa I of Mali)」https://education.nationalgeographic.org/resource/mansa-musa-musa-i-mali/ （1324 年朝聖、埃及金價約 12 年偏低、財富來自黃金與鹽）；維基百科「Musa I of Mali」https://en.wikipedia.org/wiki/Musa_I_of_Mali （奧馬里記載金價至少 12 年未回升）；維基百科「Mali Empire」https://en.wikipedia.org/wiki/Mali_Empire （控制跨撒哈拉的黃金與鹽貿易、廷巴克圖為商業與學術中心）。未修改。
- **expert-121** 印度洋季風貿易。來源：維基百科「Monsoon」https://en.wikipedia.org/wiki/Monsoon （monsoon 源自阿拉伯文 mawsim「季節」，經葡萄牙文傳入）；維基百科「Indian Ocean trade」https://en.wikipedia.org/wiki/Indian_Ocean_trade （依季風安排航程、東非沿岸伊斯蘭化與貿易城市）；搜尋結果中史密森尼非洲藝術博物館「Monsoon Dhows」與劍橋大學 Genizah 研究頁面摘要都指出東北季風季節（約 11～3 月）南下東非、西南季風季節返航（該二頁直接開啟回應 403，只作輔助）。未修改。
- **expert-122** 伊斯蘭教經海上貿易傳入東南亞。來源：維基百科「Spread of Islam in Indonesia」https://en.wikipedia.org/wiki/Spread_of_Islam_in_Indonesia （十三世紀末北蘇門答臘已有伊斯蘭政權、1297 年蘇丹墓碑、商人定居通婚、和平緩慢傳播）；維基百科「Indian Ocean trade」https://en.wikipedia.org/wiki/Indian_Ocean_trade （穆斯林商人沿印度洋傳布伊斯蘭教）。未修改。
- **expert-123** 五條誓文。來源：國立國會圖書館「日本国憲法の誕生」收錄 1946 年官報號外（引用五條誓文全文）https://www.ndl.go.jp/constitution/shiryo/03/056/056tx.html ；維基百科「Charter Oath」https://en.wikipedia.org/wiki/Charter_Oath （1868 年 4 月 6 日、五條英譯）；維基百科「Perry Expedition」https://en.wikipedia.org/wiki/Perry_Expedition （1853 年抵達、1854 年《神奈川條約》開港）。
  - 修正 `material.body`：原「一、廣設會議…。二、上下同心…。三、破除過去不好的舊習慣。四、向世界各地尋求知識，振興國家。」→「一、廣設會議，國家大事依公眾的議論決定。二、上下同心，努力推動國家的事業。三、從官員、武士到百姓，都能實現自己的志向。四、破除過去不好的舊習慣，依循普遍的公理。五、向世界各地尋求知識，振興國家的基業。」原因：原改寫漏掉第三條，標成四條卻註明是《五條誓文》。
  - 修正 `explain`：「1853 年美國艦隊來到日本要求開港，日本被迫結束鎖國。」→「…要求開港，隔年日本被迫簽約開港，結束鎖國。」原因：開港條約是 1854 年。知識卡 `expert4-meiji` 同步改為「隔年日本被迫開港」。
- **expert-124** 非洲國家沿用殖民語言。來源：維基百科「Bandung Conference」https://en.wikipedia.org/wiki/Bandung_Conference （亞非新興國家背景）；非洲聯盟「Overview」https://au.int/en/overview （非洲國家合作背景）。內容（殖民國界、多語言、沿用英法葡語為官方語言）屬教科書通用說法，未修改。知識卡生活連結「非洲許多國家的國界是直線」→「非洲有些國家的國界是筆直的直線」，原因：直線國界只占部分，「許多國家的國界是直線」易誤解為大多數。
- **expert-125** 英國工廠法的背景。來源：維基百科「Factory Acts」https://en.wikipedia.org/wiki/Factory_Acts （1802、1819、1833 年法案限制童工年齡與工時）；World History Encyclopedia「Child Labour in the British Industrial Revolution」https://www.worldhistory.org/article/2183/child-labour-in-the-british-industrial-revolution/ （童工工資低、工時長、環境危險）。未修改。
- **expert-126** 古代地中海排序。來源：World History Encyclopedia「Carthage」https://www.worldhistory.org/carthage/ （傳統建城年約前 814 年，由泰爾人建立）；維基百科「Roman Republic」https://en.wikipedia.org/wiki/Roman_Republic （傳統上前 509 年）；維基百科「Code of Justinian」https://en.wikipedia.org/wiki/Code_of_Justinian （528 年 2 月下令、529 年 4 月 7 日頒布）；World History Encyclopedia「Justinian I」https://www.worldhistory.org/Justinian_I/ （529 年頒布第一版）。君士坦丁堡 330 年為一般通說。
  - 修正 `years`：`[-814,-509,330,529]` → `[-814,-509,330,528]`；`explain` 改為「西元 528 年，東羅馬皇帝查士丁尼下令編纂法典、整理羅馬法，隔年頒布第一部法典」。原因：項目文字是「下令編纂」。
- **expert-127** 伊斯蘭世界排序。來源：維基百科「Round city of Baghdad」https://en.wikipedia.org/wiki/Round_city_of_Baghdad （762 年 8 月動工、763 年遷入、766 年完成）；World History Encyclopedia「Baghdad」https://www.worldhistory.org/baghdad/ （阿拔斯王朝首都）；維基百科「Musa I of Mali」（1324 年）；維基百科「Taj Mahal」https://en.wikipedia.org/wiki/Taj_Mahal （1632 年動工、陵墓 1648 年完成、整體約 1653 年）；World History Encyclopedia「Taj Mahal」https://www.worldhistory.org/Taj_Mahal/ （1632～1649 年）。巴布爾 1526 年為通說。
  - 修正 `years` 末項 1653 → 1648；`explain`「約在 1653 年全部完工」→「在十七世紀中期完工」。原因：各來源完工年不一，避免寫死有爭議的年份。
- **expert-128** 亞洲現代化排序。來源：維基百科「Perry Expedition」（1853）；維基百科「Charter Oath」（1868）；維基百科「Constitution of the Empire of Japan」https://en.wikipedia.org/wiki/Constitution_of_the_Empire_of_Japan （1889 年 2 月 11 日頒布、1890 年召開國會）；維基百科「Republic of Turkey」https://en.wikipedia.org/wiki/Republic_of_Turkey （1923 年 10 月 29 日）。未修改。
- **expert-129** 戰後亞非排序。來源：維基百科「Proclamation of Indonesian Independence」https://en.wikipedia.org/wiki/Proclamation_of_Indonesian_Independence （1945 年 8 月 17 日）；維基百科「Bandung Conference」（1955 年 4 月 18～24 日）；維基百科「ASEAN」https://en.wikipedia.org/wiki/ASEAN （1967 年 8 月 8 日，印尼、馬來西亞、菲律賓、新加坡、泰國）；非洲聯盟「Overview」https://au.int/en/overview （2002 年 7 月於德班正式成立）。未修改。
- **expert-130** 波斯、羅馬、伊斯蘭的建設分類。來源：維基百科「Royal Road」https://en.wikipedia.org/wiki/Royal_Road （蘇薩到薩第斯約 2,700 公里、111 個驛站）；維基百科「Persepolis」https://en.wikipedia.org/wiki/Persepolis （大流士一世約前 518 年開始興建）；輸水道、競技場、拉丁文、宣禮塔、書法裝飾屬通說。題目未修改。
  - 知識卡 `expert4-rome` 修正：「後來改為帝國，興建道路、輸水道與競技場」→「羅馬人興建道路與輸水道，帝國時期建造大型競技場」。原因：阿庇亞大道與第一條輸水道都在共和時期（前 312 年）興建，原寫法像是帝國時期才有。
  - 備註：羅馬也有驛站制度，但「御道」是波斯御道的專稱，提示也寫明「連接帝國西部與首都蘇薩」，判斷不致產生兩種答案。

### 地理

- **expert-131** 冰島地熱。來源：搜尋結果中冰島國家地熱報告（2003 國際地熱研討會論文）與 Reykjavík Grapevine 訪談政府官員摘要，冰島位在大西洋中洋脊、北美與歐亞板塊每年約分開 2 公分、約 87% 房屋暖氣來自地熱（原文頁面 theargeo.org 本次 TLS 錯誤無法開啟）。本題內容是教科書通用說法，答案確定；**來源只有搜尋摘要，列入需要人工決定的「來源不足」清單**。未修改。
- **expert-132** 阿爾卑斯移牧。來源：維基百科「Transhumance」https://en.wikipedia.org/wiki/Transhumance （夏季上高山草場、冬季回山谷、保留谷地草場割乾草、製作乳酪）。屬教科書通用說法，未修改。
- **expert-133** 坎兒井／卡納特。來源：維基百科「Qanat」https://en.wikipedia.org/wiki/Qanat （伊朗發展、地下輸水減少蒸發與汙染、新疆吐魯番稱 karez 坎兒井）。
  - 修正 `question`：「自古開挖地下水道（坎兒井）」→「自古開挖地下水道（伊朗稱為卡納特）」。原因：題目寫伊朗，詳解與知識卡都說「坎兒井」是新疆的稱呼、伊朗稱「卡納特」，題目括號與詳解不一致。
- **expert-134** 爪哇島。來源：維基百科「Java」https://en.wikipedia.org/wiki/Java （面積約占印尼 7%、人口約 56%、世界人口最多的島、幾乎全為火山地形、肥沃與多雨適合水稻）。未修改。
- **expert-135** 永凍土與架高建築。來源：維基百科「Permafrost」https://en.wikipedia.org/wiki/Permafrost （以木樁、碎石墊、熱管避免建築使地層融化；雅庫茨克、諾里爾斯克建在連續永凍土上）。未修改。
- **expert-136** 孟加拉水災。來源：維基百科「Geography of Bangladesh」https://en.wikipedia.org/wiki/Geography_of_Bangladesh （大部分低於海拔 10 公尺、恆河與布拉馬普特拉河三角洲、80% 雨量集中在季風季）；搜尋結果中國家災害防救科技中心《2022 年印度阿薩姆邦與孟加拉 5 月洪災事件紀錄》（PDF 已下載，但無法轉出文字核對譯名）。
  - 修正：「布拉馬普得拉河」→「布拉馬普特拉河」（題目、詳解、知識卡 `expert4-bangladesh`）。原因：臺灣教科書與媒體通用「布拉馬普特拉河」。
- **expert-137** 海峽與運河。來源：維基百科「Kiel Canal」https://en.wikipedia.org/wiki/Kiel_Canal （連接北海與波羅的海、避開日德蘭半島、1895 年通航）。麻六甲、直布羅陀、白令海峽與蘇伊士、巴拿馬運河屬通說。
  - 修正：基爾運河卡片 `hint`「不必繞行丹麥半島」→「不必繞行日德蘭半島」。原因：日德蘭半島北部屬丹麥、南部屬德國，教科書名稱為日德蘭半島。
- **expert-138** 巴塔哥尼亞雨影。來源：維基百科「Rain shadow」https://en.wikipedia.org/wiki/Rain_shadow （東巴塔哥尼亞受安地斯山阻擋盛行西風而乾燥）。未修改。
- **expert-139** 大陸性與海洋性（虛構表格，`note` 為「虛構資料」）。計算：甲年溫差 32°C、乙 12°C，答案唯一。原理屬教科書通說。未修改。
- **expert-140** 氣候與傳統生活分類。高腳屋、游耕（熱帶雨林）、土磚厚牆小窗、長袍頭巾（沙漠）、雪屋、馴鹿（苔原）均為教科書通用對應；高腳屋的「通風又防潮」只對應熱帶雨林。未修改。
- **expert-141** 肯亞切花空運。來源：FreshPlaza「Air freight remains key to Kenya's horticultural exports」https://www.freshplaza.com/europe/article/9853654/air-freight-remains-key-to-kenya-s-horticultural-exports/ （鮮花易損、運送時間決定品質與價格、重量輕價值高）；搜尋結果中 VOA、Business Daily 摘要（肯亞是歐盟玫瑰主要供應國，奈瓦夏湖一帶）。未修改。
- **expert-142** 綠色革命。來源：維基百科「Green Revolution in India」https://en.wikipedia.org/wiki/Green_Revolution_in_India （1960 年代、高產量品種、灌溉、化肥、農藥、地下水問題）。未修改。
- **expert-143** 產業結構（虛構表格）。表格數字與選項核對無誤，答案唯一。未修改。
- **expert-144** 貨櫃化。來源：維基百科「Containerization」https://en.wikipedia.org/wiki/Containerization （1956 年起、在船、火車、卡車間轉運不必拆箱，大幅降低成本與時間）。未修改。

### 公民

- **expert-145** 結構性失業。來源：維基百科「Structural unemployment」https://en.wikipedia.org/wiki/Structural_unemployment （技能與需求不符、技術改變為主因，並與摩擦性、循環性失業比較）。未修改。
- **expert-146** 平均每人 GDP（虛構表格，`note` 為「虛構資料」）。計算：甲 3 萬、乙 1.5 萬、丙 4 萬、丁 2 萬美元，丙最高。來源：維基百科「Gross domestic product」https://en.wikipedia.org/wiki/Gross_domestic_product （GDP 定義、每人 GDP＝GDP÷人口）。未修改。
- **expert-147** 保險分攤風險。來源：維基百科「Insurance」https://en.wikipedia.org/wiki/Insurance （風險共同承擔、以小額保費換取不確定的大額損失）。未修改。
- **expert-148** 外部效益。來源：維基百科「Externality」https://en.wikipedia.org/wiki/Externality （正外部性又稱外部效益，養蜂授粉是典型例子）。未修改。
- **expert-149** 最低工資的目的。來源：勞動部「最低工資法」新聞稿 https://www.mol.gov.tw/1607/1632/1633/65855/post （2023 年 12 月 27 日公布、2024 年 1 月 1 日施行，持續保障基層勞工的經濟生活）；全國法規資料庫最低工資法頁面 https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0020093 本次回應「目前無資料」，未能核對條文。知識卡「自 2024 年起施行」正確。未修改。
- **expert-150** 名目與實質所得。來源：維基百科「Real income」https://en.wikipedia.org/wiki/Real_income （實質所得＝名目所得÷物價水準）。薪水 +2%、物價 +4%，實質購買力下降，答案唯一。未修改。
- **expert-151** 替代品與互補品。來源：維基百科「Substitute good」https://en.wikipedia.org/wiki/Substitute_good ；維基百科「Complementary good」https://en.wikipedia.org/wiki/Complementary_good （汽車與汽油、印表機與墨水匣為互補品例子）。
  - 修正：卡片「公車與捷運」（提示「要到同一個地方，搭其中一種就不必搭另一種。」）→「原子筆與鉛筆」（提示「寫字時，用其中一種就可以了。」），`explain` 同步。原因：公車與捷運常搭配轉乘（臺灣有轉乘優惠），學生可合理判為互補品，分類不唯一。
- **expert-152** SDGs。來源：聯合國「The Sustainable Development Agenda」https://www.un.org/sustainabledevelopment/development-agenda/ （2015 年、17 項目標、169 項細項、2030 年、整合經濟、社會、環境）。未修改。
- **expert-153** 數位落差（虛構表格）。來源：維基百科「Digital divide」https://en.wikipedia.org/wiki/Digital_divide （取得與使用數位科技的不平等，含已開發與開發中國家的差距）。未修改。
- **expert-154** 安理會否決權。來源：聯合國《憲章》第五章 https://www.un.org/en/about-us/un-charter/chapter-5 （第 23 條 15 個理事國、5 個常任；第 27 條實質事項需 9 票且包括常任理事國同意票）。13 票贊成、1 個常任理事國反對即不通過，正確。未修改。
- **expert-155** 國際組織分類。來源：紅十字國際委員會中文網站 https://www.icrc.org/zh （官方中文名「紅十字國際委員會」）；維基百科「International Committee of the Red Cross」https://en.wikipedia.org/wiki/International_Committee_of_the_Red_Cross （瑞士法下的私人人道組織，任務是保護武裝衝突受難者）；政府資料開放平臺「APEC」資料集 https://data.gov.tw/dataset/36489 （中文名「亞太經濟合作」、共識決與自願性原則、21 個會員體）；維基百科「Asia-Pacific Economic Cooperation」https://en.wikipedia.org/wiki/Asia-Pacific_Economic_Cooperation （跨政府論壇、會員經濟體）；維基百科「聯合國難民署」https://zh.wikipedia.org/zh-tw/聯合國難民署 （正式名稱「聯合國難民事務高級專員公署」）。
  - 修正 `question`：「把下列國際組織放到所屬的類別」→「把下列國際組織與合作論壇放到所屬的類別」。原因：APEC 自稱論壇而非國際組織。
- **expert-156** 行政救濟程序。來源：全國法規資料庫《訴願法》https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0030020 （第 1 條對行政處分不服得提起訴願；第 4 條不服縣（市）政府所屬機關處分向縣（市）政府提起；第 58 條經由原處分機關提起）。訴願決定後再提行政訴訟，順序唯一。未修改。
- **expert-157** 著作權合理使用。來源：全國法規資料庫《著作權法》https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=J0070017 （第 52、64、65 條，見上表）。未修改。
- **expert-158** 限制行為能力人的契約。來源：全國法規資料庫《民法》https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=B0000001 （第 12、13、77、79 條）；行政院新聞稿 https://www.ey.gov.tw/Page/9277F759E41CCD91/a43e066b-f2f3-4d2e-b471-803dbeba7290 （成年年齡修正 2023 年 1 月 1 日施行）。未修改。

## 需要人工決定

1. **課綱範圍（未逐條核對，建議確認）**：expert-148 外部效益（前一批 expert-2 審閱查到「外部成本」在 108 課綱標示為第五學習階段、高中才學）、expert-145 失業類型、expert-146 平均每人 GDP、expert-150 名目與實質所得、expert-147 保險。這幾題事實正確，但可能超出國中課綱，是否保留由人工決定（`data/topics.md` 的挑戰 `economy` 主題有列經濟概念，本次未移到 `held`）。
2. **來源不足**：expert-131（冰島地熱）只有搜尋結果摘要，原始頁面無法開啟；expert-132、expert-140 只有一個網頁來源，其餘依教科書通說。expert-124 沒有找到直接說明「非洲國家沿用殖民語言為官方語言」的可靠頁面（內容是通說）。建議中立審閱或人工抽查時補一個來源。
3. **expert-127 泰姬瑪哈陵**：`years` 已改 1648（只用於驗證排序），詳解寫「十七世紀中期完工」；若希望詳解寫明確年份，請決定採用 1648（陵墓本體）或 1653（整個建築群）。
4. **expert-123**：補上第三條後短文約 110 字，仍在 150 字內；第五條「振興國家的基業」原文為「皇基」（天皇統治的基業），已以中性寫法簡化，請中立審閱確認。

## 原始來源核對（2026-10-28）

- 範圍：補核對原本只有搜尋摘錄、只有一個已開啟來源或只依「通說」的題目；觀念題（沒有具體事實，依定義推論）略過。原本已有兩個以上已開啟來源的題目沿用上方紀錄，不重複列出網址。
- 本次以 WebFetch 實際開啟原始頁面；Britannica、UNESCO 世界遺產中心、史密森尼博物館、英國國會、聯合國安理會網頁對自動抓取回應 403 或連線錯誤，改用其他原始來源。本輪搜尋次數用盡後只以 WebFetch 開啟已知網址。
- 結果：本批沒有發現與原始來源不一致的內容，未修改 `data/bank/expert-4.json`。

### 逐題

- **expert-117～expert-120、expert-122、expert-123、expert-126、expert-127、expert-129、expert-130**：上方紀錄已有兩個以上已開啟來源（含國立國會圖書館、Avalon Project、National Geographic、非洲聯盟），沿用，不重複核對。expert-123「振興天皇治國的基業」依使用者決定保留。
- **expert-121** 印度洋季風貿易：https://en.wikipedia.org/wiki/Dhow （已開啟：帆船「冬季或早春隨季風南下，晚春或初夏返回阿拉伯」）；https://en.wikipedia.org/wiki/Swahili_coast （已開啟：季風帶船往返、斯瓦希里文化融合非洲與阿拉伯來源）。一致。史密森尼非洲藝術博物館頁面仍回應 403（仍只有摘錄）。
- **expert-124** 非洲國家沿用殖民語言：https://en.wikipedia.org/wiki/Languages_of_Africa （已開啟：獨立後為了國家統一，多選前殖民語言作為政府與教育用語；撒哈拉以南國家的官方語言多為法、葡、英語）。一致（詳解寫「讓不同族群有共同的溝通語言」與來源的「國家統一」意思相符）。仍只有百科類來源，沒有政府或大學頁面。
- **expert-125** 英國工廠法：上方已有兩個已開啟來源；英國國家檔案館 1833 Factory Act 教學頁回應 410，未能補充。一致。
- **expert-128** 亞洲現代化排序：https://history.state.gov/milestones/1830-1860/opening-to-japan （已開啟：培里 1853 年 7 月 8 日抵達、1854 年 3 月 31 日簽《神奈川條約》）；https://www.ndl.go.jp/constitution/e/etc/c02.html （已開啟：憲法日期明治 22 年 2 月 11 日即 1889 年、帝國議會於明治 23 年召集）；https://en.wikipedia.org/wiki/Atat%C3%BCrk%27s_reforms （已開啟：1923 年 10 月 29 日宣布共和、世俗化改革）。一致。
- **expert-131** 冰島地熱：https://pubs.usgs.gov/gip/dynamic/understanding.html （已開啟，美國地質調查所：冰島沿北美板塊與歐亞板塊之間的擴張中心裂開）；https://en.wikipedia.org/wiki/Geothermal_power_in_Iceland （已開啟：冰島跨在大西洋中洋脊上、至少 90% 住宅以地熱供暖、地熱占發電四分之一以上）。一致。冰島國家能源局 nea.is 頁面無內文、政府網站回應 402。原本「來源不足」已補足。
- **expert-132** 阿爾卑斯移牧：https://ich.unesco.org/en/RL/transhumance-the-seasonal-droving-of-livestock-along-migratory-routes-in-the-mediterranean-and-in-the-alps-01470 （已開啟，UNESCO 非物質文化遺產：每年春、秋季在不同地區之間移動牲畜，奧地利等阿爾卑斯國家列名）。一致。瑞士觀光局頁面無法載入。
- **expert-133** 卡納特：https://www.worldhistory.org/Qanat/ （已開啟：從高處水井開挖地下隧道引含水層的水、靠重力流動、地下輸水蒸發慢，並提到新疆吐魯番的同類系統）。一致。UNESCO「The Persian Qanat」回應 403。
- **expert-134** 爪哇島：https://en.wikipedia.org/wiki/Demographics_of_Indonesia （已開啟：爪哇〔不含馬都拉〕約占全國人口 54.4%、人口最多的島）。與「一半以上的人口」一致；面積約 7% 仍只有上方紀錄的 Java 條目一個來源。
- **expert-135** 永凍土與架高建築：https://nsidc.org/learn/parts-cryosphere/frozen-ground-permafrost/why-frozen-ground-matters （已開啟，美國國家冰雪資料中心：建築架在鋼架上離地數英尺，讓冷空氣在下方流通；室內暖氣可能使地面融化下陷）。一致。
- **expert-136** 孟加拉水災：https://en.banglapedia.org/index.php/Flood （已開啟，孟加拉亞洲學會百科：地勢低平、5～10 月季風與上游降雨、喜馬拉雅融雪、恆河與布拉馬普特拉河同時漲水）。一致。
- **expert-137** 海峽與運河：https://www.suezcanal.gov.eg/English/About/SuezCanal/Pages/CanalHistory.aspx （已開啟，蘇伊士運河管理局：1869 年通航、連接地中海與紅海）；https://pancanal.com/en/history/ （已開啟，巴拿馬運河管理局：1914 年 8 月 15 日通航、設有船閘）。一致。基爾運河德國聯邦水道局頁面 404，仍只有上方紀錄的維基百科來源。
- **expert-138** 巴塔哥尼亞雨影：https://en.wikipedia.org/wiki/Patagonian_Desert （已開啟：安地斯山阻擋來自南太平洋的西風水氣，形成雨影）。一致。
- **expert-140** 氣候與傳統生活分類：屬教科書通用的氣候與生活對應，沒有年份、數字，視為觀念題略過（上方紀錄已註明）。
- **expert-141** 肯亞切花空運：https://www.freshplaza.com/europe/article/9853654/air-freight-remains-key-to-kenya-s-horticultural-exports/ （已開啟：鮮花易腐、高價值低重量適合空運、新鮮度決定價格）；https://kenyaflowercouncil.org/ （已開啟，肯亞花卉協會：出口到 60 多個目的地，未提歐洲比例）。一致；「歐洲花卉市場」仍只有上方紀錄的搜尋摘錄。
- **expert-142** 綠色革命：https://www.fao.org/4/x0262e/x0262e06.htm （已開啟，聯合國糧農組織：1960 年代起高產量小麥、稻米品種在亞洲推廣，配合肥料、農藥與灌溉；地下水抽取速度超過補注）。一致。
- **expert-144** 貨櫃化：史密森尼美國歷史博物館 https://americanhistory.si.edu/on-the-water/global-waters/containerization 回應 403，仍只有上方紀錄的維基百科一個已開啟來源。內容為教科書通說，未修改。
- **expert-149** 最低工資：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0030028 （已開啟，全國法規資料庫《最低工資法》：第 1 條「確保勞工合理之最低工資，提高勞工及其家庭之生活水準」；第 19 條施行日期由行政院定之）。一致（上方紀錄的 pcode N0020093 有誤，正確為 N0030028）。
- **expert-152** SDGs：聯合國 https://sdgs.un.org/2030agenda 、https://www.un.org/sustainabledevelopment/development-agenda/ 本次連線錯誤（TLS），仍只有上方紀錄的一個已開啟來源。
- **expert-154** 安理會否決權：https://www.un.org/en/about-us/un-charter/chapter-5 （再次開啟：第 23 條 15 個理事國、第 27 條非程序事項需 9 票且包括常任理事國同意票）。一致。安理會投票制度頁面連線錯誤。
- **expert-156** 行政救濟：https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=A0030154&flno=4 （已開啟，《行政訴訟法》第 4 條：依訴願法提起訴願而不服其決定者，得向行政法院提起撤銷訴訟）。與上方《訴願法》合併，排序一致。
- **expert-157、expert-158**：條文本身（全國法規資料庫《著作權法》《民法》）為原始來源，上方紀錄已開啟，沿用。智慧財產局合理使用說明頁 404。
- **觀念題略過**：expert-139、expert-143、expert-145、expert-146、expert-147、expert-148、expert-150、expert-151、expert-153。

### 統計

- 本次補核對 21 題（其中 16 題新開啟了原始頁面），不一致 0 題，修改 0 題。
- 仍只有摘錄或只有一個來源的部分：expert-124（只有百科類來源）、expert-134 面積比例、expert-137 基爾運河、expert-141 歐洲市場、expert-144、expert-152。
