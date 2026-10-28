# expert-5 事實審閱紀錄

- 審閱檔案：`data/draft/expert-5.json` → `data/checked/expert-5.json`
- 檢查題數：42 題（`expert-159`～`expert-200`）、35 張知識卡
- 修正題數：12 題（另修正 5 張知識卡，其中 4 張與題目修正連動，`expert5-chile` 只改圖示）
- 移到 `held`：0 題
- 驗證：`node scripts/validate-bank.mjs data/checked/expert-5.json` 通過（42 題、35 張知識卡）；題目與知識卡 `id` 與 `data/bank/`、`data/checked/` 其他檔案沒有重複。

## 作業方式

- 先不看答案逐題作答，42 題的作答結果與 `answer`／`items`／`bins` 全部一致，沒有答案不唯一的題目。
- 來源標示：「已開啟」表示實際開啟頁面讀過內容；「僅搜尋摘錄」表示只看到搜尋引擎回傳的摘錄（部分官方網站，例如英國國會、紐西蘭 NZHistory、聯合國難民署，對自動抓取回應 403，無法開啟）。
- 沒有具體事實可查、屬於經濟學或地理學基本原理的觀念題，註明「觀念題」，並列出可對照的定義來源。
- 108 課綱範圍：世界史（古印度與佛教、中古歐洲、宗教改革、新航路與殖民、三角貿易、工業化與社會主義、帝國主義與非洲、兩次大戰與國際組織）、世界地理（區域特色、氣候、產業區位）、公民（經濟學基本概念、全球化、法律與生活）都在國中社會領域的學習內容內。托德西利亞斯條約、特倫托大公會議、非洲團結組織屬於加深的補充，只作為排序項目或詳解背景，題目答案本身不依賴背誦條約名稱，判定不超出範圍。

## 逐題查證

### expert-159（阿育王與佛教傳播，資料判讀）

- 查證：阿育王征服羯陵伽後悔悟、刻石柱與岩石詔令、派僧人（其子摩哂陀）到斯里蘭卡傳教，皆正確。羯陵伽位在孔雀王朝核心區的東南方（今奧里薩一帶）。伊斯蘭教在七世紀出現，提示正確。
- 來源：
  - World History Encyclopedia，The Edicts of Ashoka the Great：https://www.worldhistory.org/Edicts_of_Ashoka（僅搜尋摘錄）
  - Oregon State University Open Textbook，The Edicts of Ashoka：https://open.oregonstate.education/ancientcivilizations/chapter/edicts-of-ashoka/（僅搜尋摘錄）
  - World History Commons，Ashoka Rock and Pillar Edicts：https://worldhistorycommons.org/selections-ashoka-rock-and-pillar-edicts（僅搜尋摘錄）
- 結果：無修正。

### expert-160（中古歐洲大學與拉丁文）

- 查證：波隆那大學傳統上定為 1088 年創立，巴黎、牛津在十二世紀形成；拉丁文為當時學術共同語言。
- 來源：
  - University of Bologna（Wikipedia 條目摘錄，引 Carducci 委員會定 1088 年）：https://en.wikipedia.org/wiki/University_of_Bologna（僅搜尋摘錄）
  - History of Information，University of Bologna：https://www.historyofinformation.com/detail.php?id=2659（僅搜尋摘錄）
- 結果：無修正（「十一世紀末起」與 1088 年相符）。

### expert-161（馬丁路德德文聖經）

- 查證：路德 1522 年出版德文新約、1534 年出版全本聖經，配合印刷術大量流傳，促進德語書面語統一。屬課綱宗教改革的核心內容。
- 來源：
  - Library of Congress，Bible Collection（古騰堡聖經與印刷術背景）：https://loc.gov/exhibits/bibles/exhibititems.html（僅搜尋摘錄）
  - 國中歷史教科書宗教改革單元的通用說法（路德翻譯德文聖經、印刷術助長傳播）
- 結果：無修正。

### expert-162（三角貿易對非洲的影響，資料判讀）

- 查證：跨大西洋奴隸貿易十六到十九世紀，經大西洋運出的非洲人約 1,200 萬餘人，抵達美洲約 1,000 萬餘人，「上千萬名」正確。
- 來源：
  - UK National Archives，1833 Abolition of Slavery Act and compensation claims：https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/georgians/1833-abolition-of-slavery-act-and-compensation-claims/（僅搜尋摘錄）
  - Historic England，Slavery After 1807：https://historicengland.org.uk/research/inclusive-heritage/the-slave-trade-and-abolition/sites-of-memory/ending-slavery/slavery-after-1807（僅搜尋摘錄）
- 結果：無修正。

### expert-163（社會主義思想的背景）

- 查證：工業革命後工人處境與社會主義、馬克思主張生產工具公有；羅馬帝國分裂 395 年（四世紀末）、新航路十五～十六世紀，提示正確。
- 來源：國中歷史教科書工業革命與社會主義單元的通用說法；本題為因果觀念題，無需外部數字。
- 結果：無修正。

### expert-164（托德西利亞斯條約與巴西的葡萄牙語）

- 查證：1494 年 6 月 7 日簽訂，分界線在維德角群島以西 370 里格，線東歸葡萄牙、線西歸西班牙；南美洲東部突出部分落在葡萄牙側，1500 年卡布拉爾抵達巴西。
- 來源：
  - National Geographic Education，Treaty of Tordesillas：https://education.nationalgeographic.org/resource/treaty-tordesillas（僅搜尋摘錄）
  - University of Groningen，The Treaty of Tordesillas June 7 1494（條約英譯）：https://www.let.rug.nl/usa/documents/before-1600/the-treaty-of-tordesillas-june-7-1494.php（僅搜尋摘錄）
- 結果：無修正。

### expert-165（衣索比亞保持獨立）

- 查證：1896 年 3 月 1 日阿杜瓦之戰擊敗義大利；同年 10 月《阿迪斯阿貝巴條約》義大利承認衣索比亞完全獨立；1935 年義大利再度入侵，1936～1941 年占領，1941 年被逐出。題目問「十九世紀末」沒有成為殖民地，答案正確；但詳解與知識卡只寫「沒有成為殖民地」，容易誤解為從未被占領，補上占領時期。
- 來源：
  - Britannica，Ethiopia（Adwa 與 Treaty of Addis Ababa）：https://www.britannica.com/print/article/643083（僅搜尋摘錄）
  - World History Encyclopedia，Italo-Ethiopian Wars：https://www.worldhistory.org/Italo-Ethiopian_Wars/（僅搜尋摘錄）
  - EBSCO Research Starters，Battle of Adowa：https://www.ebsco.com/research-starters/military-history-and-science/battle-adowa（僅搜尋摘錄）
- 修正：
  - `explain` 原文：「……衣索比亞和賴比瑞亞是非洲少數沒有成為殖民地的國家。」→ 改為「……是非洲少數沒有成為殖民地的國家（衣索比亞後來在 1936～1941 年曾被義大利占領）。」
  - 知識卡 `expert5-ethiopia` 的 `body` 句尾加上「；1936～1941 年曾被義大利占領。」
  - 原因：避免簡化成「衣索比亞從未被占領」的錯誤印象。

### expert-166（婦女投票權表格）

- 查證：紐西蘭 1893 年《選舉法》，是第一個全體成年女性可在國會選舉投票的自治國家；英國 1918 年《人民代表法》給予 30 歲以上且符合財產條件的婦女投票權（1928 年才與男性平等），表格寫「部分婦女」正確；德國 1918 年 11 月 12 日人民代表委員會宣布、11 月 30 日《帝國選舉法》生效；美國第 19 條修正案 1920 年 8 月 18 日批准。`note`「資料年份：1893～1920 年，依各國選舉制度整理」符合「資料年份」格式。
- 來源：
  - U.S. National Archives，19th Amendment：https://www.archives.gov/milestone-documents/19th-amendment（已開啟）
  - NZHistory，Women's suffrage：https://nzhistory.govt.nz/politics/womens-suffrage（開啟時 403，僅搜尋摘錄）
  - University of Warwick，Women and the vote：https://warwick.ac.uk/news/knowledgecentre/arts/history/women-vote（僅搜尋摘錄）
  - Deutscher Bundestag，30. November 1918 Frauenwahlrecht：https://www.bundestag.de/dokumente/textarchiv/1918-11-30-frauenwahlrecht-580156（僅搜尋摘錄）
  - Landeszentrale für politische Bildung BW，Frauenwahlrecht：https://www.lpb-bw.de/frauenwahlrecht（僅搜尋摘錄）
- 修正：`explain`「英國、德國、美國等國陸續給予婦女投票權」→「英國（1918 年先給予部分婦女）、德國、美國等國陸續給予婦女投票權」。原因：與表格一致，避免讀成英國 1918 年全體婦女取得投票權。

### expert-167（聯合國與國際聯盟的比較）

- 查證：美國參議院未批准《凡爾賽和約》，美國未加入國聯；美國是聯合國創始會員國；國聯總部日內瓦、聯合國總部紐約；中華民國為聯合國創始會員國（提示所述為 1945 年成立時的事實）。
- 來源：
  - U.S. Department of State Office of the Historian，The League of Nations, 1920：https://history.state.gov/milestones/1914-1920/league（僅搜尋摘錄）
  - SWI swissinfo.ch，How America shaped Geneva's international role（國聯在日內瓦、聯合國總部設紐約）：https://www.swissinfo.ch/eng/international-geneva/how-america-shaped-genevas-international-role/77159896（僅搜尋摘錄）
  - 美國、中華民國為聯合國創始會員國：《聯合國憲章》簽署國的通用事實（未另開啟網頁）
- 結果：無修正。

### expert-168（古代印度與佛教傳播排序，`years`）

- 查證：
  - 哈拉帕：成熟期約前 2600～前 1900 年，`-2500` 落在區間內。
  - 佛陀傳教：生卒有前 563～前 483 與前 480～前 400 兩說，`-500` 作為近似值可接受，詳解寫「約西元前六到五世紀」正確。
  - 佛教傳入中國：傳統說法為東漢明帝永平十年（67 年），學界視為傳說性質，詳解寫「約在東漢初年（一世紀）」沒有寫死年份，正確。
  - 玄奘：多數史料為貞觀三年（629 年）出發，另有 627 年之說，不影響排序。
  - 四件事前後相距至少數百年，排序唯一。
- 來源：
  - Britannica，Harappa：https://www.britannica.com/place/Harappa（僅搜尋摘錄）
  - Harappa.com，A Brief Introduction to the Ancient Indus Civilization：https://www.harappa.com/content/brief-introduction-ancient-indus-civilization（僅搜尋摘錄）
  - 臺大佛學數位圖書館（佛教初傳期研究）：https://buddhism.lib.ntu.edu.tw/search/search_detail.jsp?seq=171862（僅搜尋摘錄）
  - 中台世界，佛教初傳（永平十年）：https://ctworld.org/Arhats/arhats_08.html（僅搜尋摘錄）
  - 臺大佛學數位圖書館，玄奘相關論文：https://buddhism.lib.ntu.edu.tw/FULLTEXT/JR-MAG/mag581193.pdf（僅搜尋摘錄）
- 結果：無修正。

### expert-169（中古到近代初期歐洲排序，`years`）

- 查證：波隆那大學 1088 年（傳統說法，詳解已寫「傳統上認為」）；古騰堡聖經約 1454～1455 年；1534 年《至尊法案》亨利八世為英格蘭教會最高領袖；特倫托大公會議 1545 年開議。
- 來源：
  - Library of Congress，Bible Collection（古騰堡聖經 Mainz 1455）：https://loc.gov/exhibits/bibles/exhibititems.html（僅搜尋摘錄）
  - Library of Congress 目錄，Biblia Latina（1454～1455）：https://www.loc.gov/item/52002339（僅搜尋摘錄）
  - University of Bologna（Wikipedia 摘錄）：https://en.wikipedia.org/wiki/University_of_Bologna（僅搜尋摘錄）
  - 至尊法案 1534 與特倫托大公會議 1545：國中歷史教科書宗教改革單元通用年代（未另開啟網頁）
- 結果：無修正。

### expert-170（美洲與大西洋世界排序，`years`）

- 查證：1521 年特諾奇提特蘭陷落（征服阿茲特克）；1607 年詹姆斯敦；1804 年 1 月 1 日海地獨立；1833 年 8 月 28 日《廢除奴隸法》獲御准（1834 年 8 月 1 日生效）；1888 年 5 月 13 日巴西《黃金法》，美洲最後廢除奴隸制度的國家（古巴 1886 年）。
- 來源：
  - legislation.gov.uk，Slavery Abolition Act 1833：https://www.legislation.gov.uk/ukpga/Will4/3-4/73（僅搜尋摘錄）
  - UK National Archives，1833 Abolition of Slavery Act：https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/georgians/1833-abolition-of-slavery-act-and-compensation-claims/（僅搜尋摘錄）
  - IALS（倫敦大學高等法律研究所）blog，28 August 1833：https://ials.blogs.sas.ac.uk/2021/08/27/on-this-day-28-august-1833-abolition-of-slavery-act/（僅搜尋摘錄）
  - Lei Áurea（Wikipedia 摘錄）：https://en.wikipedia.org/wiki/Lei_%C3%81urea（僅搜尋摘錄）
  - University of Northern Iowa ScholarWorks（巴西廢奴）：https://scholarworks.uni.edu/ijc/vol25/iss3/26（僅搜尋摘錄）
- 修正：`keys[0]` 原文「哪一件事發生在歐洲人抵達美洲後不久，是西班牙在美洲擴張的開始？」→「哪一件事和十六世紀前期西班牙在美洲大陸的擴張有關？」。原因：西班牙在美洲的擴張始於 1492 年後的加勒比海，1521 年征服阿茲特克不是「開始」，且距 1492 年近 30 年。

### expert-171（二十世紀國際合作排序，`years`）

- 查證：巴黎和會 1919 年；《世界人權宣言》1948 年 12 月 10 日；《羅馬條約》1957 年簽訂、1958 年 1 月 1 日生效，歐洲經濟共同體成立；非洲團結組織 1963 年 5 月 25 日於阿迪斯阿貝巴成立；世界貿易組織 1995 年 1 月 1 日成立。
- 來源：
  - Britannica，Treaty of Rome：https://www.britannica.com/event/Treaty-of-Rome（僅搜尋摘錄）
  - 義大利政府歐洲事務部，The Treaties of Rome：https://www.affarieuropei.gov.it/en/legislation/the-treaties-of-rome/（僅搜尋摘錄）
  - Britannica，African Union（OAU 1963）：https://www.britannica.com/topic/African-Union（僅搜尋摘錄）
  - 聯合國非洲經濟委員會：https://uneca.org/node/4909（僅搜尋摘錄）
- 修正：`explain`「取代原本的關稅暨貿易總協定」→「接替原本關稅暨貿易總協定的角色」。原因：GATT 作為協定（GATT 1994）仍是 WTO 協定的一部分，被取代的是原本的組織架構，改成較精確的說法。

### expert-172（三角貿易商品分類）

- 查證：歐洲→非洲：槍枝火藥、紡織品、金屬器具；美洲→歐洲：蔗糖、菸草、棉花，分類唯一。
- 來源：同 expert-162、expert-170 的英國國家檔案館與 Historic England 頁面（僅搜尋摘錄）；國中歷史教科書三角貿易示意圖的通用內容。
- 修正：`question`「十七到十九世紀」→「十六到十九世紀」。原因：與 expert-162 短文、知識卡 `expert5-triangle-trade` 的時間範圍一致（奴隸貿易十六世紀即已開始）。

### expert-173（瑞士精密工業）

- 觀念題：產業區位（運費占產值比例）原理。瑞士為內陸國、礦產少、以鐘錶精密工業聞名，為國中地理通用例子，無需特定數字。
- 結果：無修正。

### expert-174（杜拜經濟多元化，資料判讀）

- 查證：1966 年近海法塔（Fateh）油田發現石油，1969 年開始出口；蘊藏量遠少於阿布達比，因此較早發展轉運、觀光、金融等產業。
- 來源：
  - Gulf News，Oil in Dubai: History & timeline：https://gulfnews.com/business/energy/oil-in-dubai-history--timeline-1.578333（僅搜尋摘錄）
  - AGBI，Contrary to urban myth Dubai was never an oil-rich emirate：https://www.agbi.com/oil-and-gas/2026/01/contrary-to-urban-myth-dubai-was-never-an-oil-rich-emirate/（僅搜尋摘錄）
- 結果：無修正。

### expert-175（智利氣候差異）

- 查證：北界南緯 17°30′、南端合恩角約南緯 56°；南北長約 4,270 公里（另有 4,329 公里之說）、平均寬約 177～180 公里，「東西寬度大約只有一兩百公里」「南北長約 4,000 多公里」正確；北部沙漠受副熱帶高壓與秘魯涼流影響，中部地中海型氣候，南部西風帶多雨，正確。
- 來源：
  - Britannica，Chile：https://www.britannica.com/place/Chile（僅搜尋摘錄）
  - IAEA Country Nuclear Power Profiles，Chile：https://www-pub.iaea.org/MTCD/publications/PDF/CNPP2014_CD/countryprofiles/Chile/Chile.htm（僅搜尋摘錄）
- 修正：知識卡 `expert5-chile` 的 `icon` 由 🌶️（辣椒，和國名諧音，與地理內容無關，容易誤會）改為 🏔️。

### expert-176（亞斯文高壩）

- 查證：1960 年動工、1970 年 7 月完工；泥沙沉積於納瑟湖，下游農田肥力下降、需施用化肥，三角洲海岸侵蝕。
- 來源：
  - HISTORY.com，Aswan High Dam completed（1970 年 7 月 21 日）：https://www.history.com/this-day-in-history/july-21/aswan-high-dam-completed（僅搜尋摘錄）
  - EBSCO Research Starters，Aswan High Dam：https://www.ebsco.com/research-starters/science/aswan-high-dam（僅搜尋摘錄）
  - Martin Luther University Halle，Impacts of the Aswan High Dam After 50 Years：https://klimawandel.geo.uni-halle.de/sites/default/files/Impacts%20of%20the%20Aswan%20High%20Dam%20After%2050%20Years.pdf（僅搜尋摘錄）
- 修正：
  - `question`「埃及在尼羅河上游的亞斯文完成高壩」→「埃及在南部尼羅河畔的亞斯文完成高壩」。
  - 知識卡 `expert5-aswan` 的 `body`「埃及在尼羅河上游興建亞斯文高壩」→「埃及在南部的亞斯文攔截尼羅河興建高壩」。
  - 原因：就整條尼羅河而言，亞斯文位在中下游（上游為維多利亞湖與衣索比亞高原），寫「上游」容易和尼羅河的地理分段混淆；改寫成不會錯的位置描述。

### expert-177（鹹海縮小，虛構資料表）

- 查證：1950～1960 年代起阿姆河、錫爾河被引去灌溉烏茲別克、土庫曼的棉田，鹹海大幅縮小；表格標「虛構資料」，指數趨勢與實際相近（2000 年代中期約剩四分之一）。
- 來源：
  - NASA Earth Observatory，World of Change: Shrinking Aral Sea：https://science.nasa.gov/earth/earth-observatory/world-of-change/aral-sea/（僅搜尋摘錄）
  - NASA Earth Observatory，Dust Storm, Aral Sea：https://earthobservatory.nasa.gov/IOTD/view.php?id=2057（僅搜尋摘錄）
- 結果：無修正。

### expert-178（午夜太陽）

- 查證：挪威北部（例如特羅姆瑟約北緯 69.6 度）位在北極圈內，約 5 月 20 日至 7 月 22 日出現午夜太陽；成因為地軸傾斜。
- 來源：
  - Visit Tromsø，Midnight Sun：https://www.visittromso.no/midnight-sun（僅搜尋摘錄）
  - Midnight sun（Wikipedia 摘錄）：https://en.wikipedia.org/wiki/Midnight_sun（僅搜尋摘錄）
- 結果：無修正。

### expert-179（內陸國分類）

- 查證：寮國、尼泊爾、奧地利、巴拉圭為內陸國；智利、葡萄牙、越南、肯亞（蒙巴薩港）臨海。分類唯一，提示皆正確。
- 來源：各國地理基本事實（Britannica 各國條目、外交部國家與地區資訊的通用內容）；未另開啟網頁。
- 結果：無修正。

### expert-180（稀少性）

- 觀念題：稀少性定義，國中公民經濟單元通用概念。
- 修正：選項 1 原文「物價持續上漲，貨幣變薄」→「物價持續上漲，購買力下降」。原因：「貨幣變薄」不是正確的經濟用語，容易讓學生誤解；改為通貨膨脹的正確描述（仍為錯誤選項，提示不變）。

### expert-181（雞蛋市場供需分類）

- 觀念題：替代品價格上升、偏好改變→需求增加；技術進步、生產者增加→供給增加；天候不佳、投入成本上漲→供給減少。分類唯一，與國中公民供需單元一致。連到既有知識卡 `expert-supply-demand`（`data/bank/expert-1.json`／`expert-2.json`）。
- 結果：無修正。

### expert-182（以物易物與貨幣，虛構短文）

- 觀念題：貨幣作為交易媒介，解決「慾望雙重巧合」問題；國中公民通用概念。
- 結果：無修正。

### expert-183（工會與團體協商）

- 查證：《團體協約法》第 2 條，團體協約是雇主與依工會法成立的工會所簽訂的書面契約；團體協約原則上適用於工會會員（同法第 17 條），工會法第 5 條列團體協約的締結為工會任務。
- 來源：
  - 團體協約法條文（6laws 轉載）：https://6laws.net/6law/law/團體協約法.htm（僅搜尋摘錄）
  - 法律百科，團體協約：https://www.legis-pedia.com/article/labor-work/997（僅搜尋摘錄）
  - 彰化縣政府勞工處，簽訂團體協約 Q&A：https://labor.chcg.gov.tw/files/9_20240514163521261_%e7%b0%bd%e8%a8%82%e5%9c%98%e9%ab%94%e5%8d%94%e7%b4%84qa.odt（僅搜尋摘錄）
- 修正：`question`「由工會代表全體員工和公司協商」→「由工會代表會員和公司協商」。原因：工會代表的是會員，團體協約原則上只拘束會員，與詳解「代表會員」一致。

### expert-184（市場競爭，虛構資料表）

- 觀念題：表格為虛構資料，推論與表格數字一致；市場競爭效果為國中公民通用概念。
- 結果：無修正。

### expert-185（累進稅率與所得重分配）

- 查證：我國綜合所得稅採 5%、12%、20%、30%、40% 五級累進稅率；財政部說明綜所稅具所得重分配功能。
- 來源：
  - 法律百科，累進稅率：https://www.legis-pedia.com/dictionary/6344（僅搜尋摘錄）
  - 政治大學資料（財政部回應所得分配）：https://www4.nccu.edu.tw/~joe/Comm/incomeinequality_20231105-2_mofreply.pdf（僅搜尋摘錄）
- 結果：無修正（題目不考級距數字，不需 `asOf`）。

### expert-186（自願交易使雙方得利）

- 觀念題：自願交易的雙方得利，國中公民通用概念。
- 結果：無修正。

### expert-187（全球化面向分類）

- 觀念題：經濟、文化、政治全球化的區分依國中公民全球化單元。「多國簽訂公約保護瀕臨絕種動植物」（例如《瀕臨絕種野生動植物國際貿易公約》）由各國政府簽訂，放在政治面向合理；三個類別中沒有其他合理位置，分類唯一。
- 結果：無修正。

### expert-188（文化同質化）

- 觀念題：全球化造成文化同質化、語言流失，國中公民通用概念。
- 結果：無修正。

### expert-189（難民，虛構短文）

- 查證：1951 年《難民地位公約》核心定義為因迫害而有充分理由畏懼、離開本國且無法或不願受本國保護者；聯合國難民署與區域文件（1969 年非洲團結組織公約、1984 年卡塔赫納宣言）將逃離戰爭與普遍暴力者納入。短文情境與詳解「因為戰爭、迫害等原因」與難民署的通俗定義一致。
- 來源：
  - UNHCR Emergency Handbook，Refugee definition：https://emergency.unhcr.org/node/658（僅搜尋摘錄）
  - UNHCR，What is a refugee：https://www.unhcr.org/what-refugee（開啟時 403，僅搜尋摘錄）
  - UN Audiovisual Library of International Law，Convention relating to the Status of Refugees：https://legal.un.org/avl/ha/prsr/prsr.html（僅搜尋摘錄）
- 結果：無修正。

### expert-190（碳足跡）

- 查證：環境部《推動產品碳足跡管理要點》定義產品碳足跡為原料取得、製造、配送銷售、使用及廢棄處理各階段的溫室氣體排放量，換算為二氧化碳當量。
- 來源：
  - 環境部推動產品碳足跡管理要點（6laws 轉載）：https://6laws.net/6law/law3/環境部推動產品碳足跡管理要點.htm（僅搜尋摘錄）
  - 香港理工大學，Product Carbon Footprint：https://www.polyu.edu.hk/ise/ecodesign/product_carbon_footprint_c.html（僅搜尋摘錄）
- 結果：無修正。

### expert-191（酪農業分布）

- 觀念題：杜能農業區位的易腐產品靠近市場原理，國中地理產業區位通用概念。
- 結果：無修正。

### expert-192（全球產業分工，虛構短文）

- 觀念題：國際分工降低成本，國中地理與公民全球化通用概念。
- 結果：無修正。

### expert-193（冷凍船與遠方畜牧業）

- 查證：1877 年 Le Frigorifique、Paraguay 號從阿根廷運冷凍肉到法國；1882 年 Dunedin 號從紐西蘭運冷凍羊肉到倫敦，開啟紐西蘭冷凍肉出口；「十九世紀後期」正確。
- 來源：
  - Te Ara（紐西蘭政府百科），Lamb and mutton production（1966 年版）：https://teara.govt.nz/mi/1966/lamb-and-mutton-production（僅搜尋摘錄）
  - Lloyd's Register Heritage & Education Centre，First and Famous: Dunedin：https://hec.lrfoundation.org.uk/whats-on/blogs/first-and-famous-dunedin（僅搜尋摘錄）
  - History Hit，How the SS Dunedin Revolutionised the Global Food Market：https://www.historyhit.com/how-the-ss-dunedin-revolutionised-the-global-food-market/（僅搜尋摘錄）
- 結果：無修正。

### expert-194（氣候類型分類）

- 查證：雅典、伯斯（Csa）、開普敦（Csb，亦有 Csa 之說，皆為地中海型）屬地中海型氣候；北京、首爾在臺灣國中地理歸為溫帶季風氣候（夏雨冬乾，韓國年雨量約三分之二集中 6～9 月）；南極洲與格陵蘭內陸為冰原氣候。分類唯一。
- 來源：
  - Climate of Perth（Wikipedia 摘錄，Csa）：https://en.wikipedia.org/wiki/Climate_of_Perth（僅搜尋摘錄）
  - Murdoch University，Climate and culture（伯斯氣候）：https://www.murdoch.edu.au/study/international-students/life-in-perth/climate-and-culture（僅搜尋摘錄）
  - Climate-Data.org，Cape Town（Csb）：https://en.climate-data.org/region/469/（僅搜尋摘錄）
  - 韓國氣象廳，Climate of Korea：https://www.kma.go.kr/neng/biz/climate/climate-of-korea.do（僅搜尋摘錄）
  - 香港教育局，中國的氣候（溫帶季風氣候位於秦嶺—淮河以北）：https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/pshe/national-geography/3.%20Climate%20of%20China-Chi_Teacher-oct2022.pdf（僅搜尋摘錄）
  - 首爾歸類為溫帶季風氣候：臺灣國中地理教科書東亞單元的通用分類（搜尋未找到可直接開啟的臺灣官方頁面）
- 修正：`explain`「雅典、開普敦、伯斯位在大陸西岸緯度約 30～40 度，夏乾冬雨」→「雅典位在地中海沿岸，開普敦、伯斯位在大陸西岸緯度約 30～35 度，三地都夏乾冬雨」。原因：雅典不在大陸西岸，而是在地中海東部沿岸；開普敦約南緯 34 度、伯斯約南緯 32 度。

### expert-195（對流雨）

- 觀念題：地面受熱、空氣上升、凝結降雨的對流雨原理，國中地理氣候單元通用概念。
- 結果：無修正。

### expert-196（南亞季風，資料判讀）

- 查證：印度氣象局西南季風在喀拉拉的正常抵達日為 6 月 1 日，雨季約四個月（6～9 月）；冬季東北季風期間大部分地區乾燥，但印度東南部（坦米爾那都）在 10～12 月東北季風期會降雨。
- 來源：
  - India Meteorological Department，Press Release Monsoon onset Kerala 30-05-2024：https://mausam.imd.gov.in/Forecast/marquee_data/Press%20Release%20Monsoon%20onset%20Kerala%20and%20NEI%2030-05-2024.pdf（僅搜尋摘錄）
  - The Tribune，Southwest monsoon covers the entire northeast: IMD：https://www.tribuneindia.com/news/nation/southwest-monsoon-covers-the-entire-northeast-imd-264414/amp（僅搜尋摘錄）
- 修正：
  - `explain`「冬季則吹來自內陸的東北季風，天氣乾燥。」→「冬季則吹來自內陸的東北季風，大部分地區天氣乾燥。」
  - 知識卡 `expert5-south-asia-monsoon` 的 `body` 同步改為「大部分地區乾燥」。
  - 原因：印度東南沿岸在東北季風期仍有雨季，不能寫成全區乾燥。

### expert-197（沙漠日夜溫差）

- 查證：撒哈拉沙漠大致位在北緯 15～30 度（另有到北緯 33 度之說），提示「大約在北緯 15～30 度」可接受；日夜溫差大的原因為乾燥少雲、夜間輻射散熱快，屬氣候觀念。
- 來源：
  - Britannica Kids，Sahara：https://kids.britannica.com/students/article/Sahara/276838（僅搜尋摘錄）
  - Encyclopaedia Britannica 1842 年版 Sahara（北緯 15～30 度）：https://jimclifford.ca/early_encyclopedia_britannica/articles/1842/eb_7th_1842_015949.html（僅搜尋摘錄）
- 結果：無修正。

### expert-198（調解與三級三審排序）

- 查證：
  - 《鄉鎮市調解條例》第 27 條：「經法院核定之民事調解，與民事確定判決有同一之效力」；第 23 條：調解除勘驗費外不得徵收任何費用。
  - 民事訴訟法第 466 條：財產權訴訟第二審判決上訴利益不逾 100 萬元者不得上訴，司法院得增至 150 萬元（司法院已自 2002 年 2 月 8 日起提高為 150 萬元）；第 467 條：上訴第三審須以原判決違背法令為理由。
  - 簡易訴訟程序的第二審在地方法院合議庭，不經高等法院，題目已限定「一般民事案件」，排序唯一。
- 來源：
  - 全國法規資料庫，鄉鎮市調解條例：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0020003（已開啟）
  - 全國法規資料庫，民事訴訟法：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=B0010001（已開啟）
  - 司法院裁判書（援引司法院函將第三審上訴利益提高為 150 萬元）：https://judgment.judicial.gov.tw/FILES/TPHV/113,上,601,20250204,2.pdf（僅搜尋摘錄）
  - 新北市平溪區公所，調解服務簡介：https://www.pingxi.ntpc.gov.tw/userfiles/9530316/files/%E8%AA%BF%E8%A7%A3%E6%9C%8D%E5%8B%99%E7%B0%A1%E4%BB%8B.pdf（僅搜尋摘錄）
- 修正：
  - `explain`「符合規定的案件，還可再上訴到最高法院（第三審）」→「符合規定的案件（例如上訴利益超過法定金額，並以判決違背法令為理由），還可再上訴到最高法院（第三審）」。原因：明確寫出第三審的限制，避免讀成所有案件都能上訴三審。
  - 知識卡 `expert5-court-levels` 的 `life`「鄰里糾紛可以先到區公所的調解委員會免費調解。」→「鄰里糾紛可以先到鄉（鎮、市、區）公所的調解委員會申請調解，調解原則上不收費。」原因：調解委員會設在鄉、鎮、市、區公所，不只區公所；依條例第 23 條勘驗費由當事人負擔，「免費」改為「原則上不收費」。
  - 「調解成立經法院核定後與確定判決同效力」經查正確，保留。

### expert-199（少年事件處理法，`asOf` 2024）

- 查證：
  - 第 2 條：「本法稱少年者，謂十二歲以上十八歲未滿之人」（2019 年修法刪除未滿 12 歲兒童觸法的規定，2020 年施行）；條文修正日期 2023 年 6 月 21 日，`asOf: 2024` 時仍有效。
  - 第 42 條保護處分：訓誡並得予以假日生活輔導、保護管束並得命為勞動服務、安置輔導、感化教育。題目「接受輔導、保護管束等保護處分」正確。
  - 第 27 條：14 歲以上觸犯最輕本刑五年以上之罪者，應移送檢察官；犯罪時未滿 14 歲者不適用。題目寫「法官可以視情況裁定……保護處分」，14 歲情境寫法正確，沒有寫成「一定只會保護處分」。
- 來源：
  - 全國法規資料庫，少年事件處理法：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=C0010011（已開啟）
  - 司法院，少年法院（庭）處理少年事件流程圖：https://www2.judicial.gov.tw/work/work08/01少年法院（庭）處理少年事件流程圖.pdf（僅搜尋摘錄）
  - 司法院，少年事件保護處分說明：https://www.judicial.gov.tw/tw/cp-1887-1098110-4a1f4-1.html（僅搜尋摘錄）
- 修正：`explain`「以教育輔導代替懲罰為主；」→「以教育輔導代替懲罰為主（14 歲以上觸犯重罪的少年，少年法院可移送檢察官依刑事程序處理）；」。原因：補充 14 歲以上的例外，讓「少年仍要為行為負責」的說明完整，也避免學生以為 14 歲以上一律只受保護處分。

### expert-200（個人資料保護，虛構短文）

- 查證：《個人資料保護法》第 5 條：不得逾越特定目的之必要範圍；第 20 條第 1 項：非公務機關利用個資應於蒐集之特定目的必要範圍內為之，經當事人同意等例外才可目的外利用。
- 來源：
  - 全國法規資料庫，個人資料保護法：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021（已開啟）
  - 臺北市法規查詢系統，法務部個資法第 20 條函釋：https://laws.gov.taipei/law/Interpretation/ContentPrint/FE267134?type=5（僅搜尋摘錄）
- 結果：無修正。

## 知識卡

- 35 張知識卡（33 張本批新增，另連到 `data/bank/` 既有的 `expert-supply-demand`、`expert-climate-types`）逐張對照上述來源。
- 修正 5 張：`expert5-ethiopia`（補占領時期）、`expert5-aswan`（位置描述）、`expert5-south-asia-monsoon`（大部分地區乾燥）、`expert5-court-levels`（調解地點與費用）、`expert5-chile`（圖示）。
- 其餘知識卡內容與題目詳解一致，沒有發現錯誤；`body` 都在 100 字內。

## 移到 held 的題目

- 無。

## 需要人工決定

- expert-194：北京、首爾歸為「溫帶季風氣候」依臺灣國中地理教科書通用分類（柯本分類為 Dwa 溫帶冬乾氣候）；搜尋未找到可直接開啟的臺灣官方頁面佐證首爾的分類，請以使用者採用的教科書版本確認。
- expert-176：題目原寫「尼羅河上游的亞斯文」，已改為「南部尼羅河畔的亞斯文」。如果使用者採用的教科書寫法是「尼羅河上游」，可改回。
- expert-198：題目只考「一般民事案件」的審級，未涵蓋簡易程序（第二審在地方法院合議庭）；目前寫法正確，但若希望更貼近實際小額漏水糾紛（多屬簡易或小額程序），題目情境可再調整。
- 來源限制：多數來源為「僅搜尋摘錄」；英國國會、NZHistory、聯合國難民署等官方網站對自動抓取回應 403，未能開啟原頁。

## 原始來源核對（2026-10-28）

- 範圍：本批原本幾乎全部是「僅搜尋摘錄」，本次逐題以 WebFetch 實際開啟原始頁面核對；觀念題略過。Britannica、NZHistory、英國國會、UNHCR 主站、印度氣象局、史密森尼、Oregon State 開放教材等對自動抓取回應 403 或連線錯誤，改用其他原始來源。本輪搜尋次數用盡後只以 WebFetch 開啟已知網址。
- 使用者已決定的項目（expert-166「婦女團體長期爭取」、expert-167「美國、中華民國」、expert-176「南部、尼羅河上游的亞斯文」、expert-194 首爾與北京歸溫帶季風氣候、expert-198 簡易與小額程序補充）只核對，不改寫法。
- 結果：3 題不一致或不精確，已修正（expert-168、expert-170、expert-199，見「修正」）；其餘一致。

### 逐題

- **expert-159** 阿育王：https://www.worldhistory.org/Edicts_of_Ashoka/ （已開啟：入侵羯陵伽後在第十三號詔令表示深深悔恨；詔令刻在石柱、巨石與洞壁；派傳教者到斯里蘭卡等地）；https://en.wikipedia.org/wiki/Kalinga_War （已開啟：羯陵伽位在東海岸今奧里薩一帶、約前 261 年）。一致。Oregon State 開放教材 403。
- **expert-160** 中古大學：https://www.unibo.it/en/university/who-we-are/our-history （已開啟，波隆那大學官網：1088 年是「慣例上」視為創立的年份）；https://en.wikipedia.org/wiki/Medieval_university （已開啟：巴黎、牛津於十二世紀出現；教學一律用拉丁文）。一致。牛津大學官網 403。
- **expert-161** 路德德文聖經：https://www.worldhistory.org/Martin_Luther/ （已開啟：在瓦特堡把新約譯成德文，藉印刷術成為暢銷書；1534 年出版德文全本聖經）；https://en.wikipedia.org/wiki/Luther_Bible （已開啟：1522 年 9 月新約、1534 年全本；是德語標準化的一步）。一致。
- **expert-162** 三角貿易對非洲：https://www.neh.gov/project/transatlantic-slave-trade-database （已開啟，美國國家人文基金會：約 1,250 萬非洲人被押上船，1526～1866 年間約 1,070 萬人抵達）。與「十六到十九世紀」「上千萬名」一致。SlaveVoyages 網站頁面無內文。
- **expert-163** 社會主義背景：因果觀念題；提示中「羅馬帝國分裂在四世紀末」經 https://www.worldhistory.org/Theodosius_I/ （已開啟：狄奧多西一世在位 379～395 年）間接核對，分裂於其死後的 395 年仍只有通說。
- **expert-164** 托德西利亞斯條約：https://education.nationalgeographic.org/resource/treaty-tordesillas/ （已開啟：1494 年 6 月 7 日簽訂，線東歸葡萄牙、線西歸西班牙，巴西東部落在葡萄牙側）。一致。條約英譯（格羅寧根大學）404；1500 年卡布拉爾抵達巴西仍只有摘錄。
- **expert-165** 衣索比亞：https://www.worldhistory.org/Italo-Ethiopian_Wars/ （已開啟：1896 年 3 月 1 日阿杜瓦之戰義大利大敗；1914 年非洲只剩賴比瑞亞與衣索比亞獨立；1935 年入侵、1941 年被逐出）。一致。《阿迪斯阿貝巴條約》（1896 年 10 月）承認獨立仍只有摘錄（Britannica 403）。占領起點：來源寫入侵始於 1935 年 10 月，首都在 1936 年 5 月陷落，「1936～1941 年曾被占領」與此相符，保留。
- **expert-166** 婦女投票權：https://www.women.govt.nz/node/202 （已開啟，紐西蘭婦女部：1893 年 9 月 19 日簽署《選舉法》，第一個以法律保障婦女投票權的自治國家）；https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-topic/democracy-and-protest/womens-suffrage/ （已開啟，英國國家檔案館：1918 年法案讓 30 歲以上且符合財產條件的婦女投票，1928 年與男性平等）；https://www.bundestag.de/dokumente/textarchiv/2018/kw46-frauenwahlrecht-580156 （已開啟，德國聯邦議院：1918 年 11 月 30 日《帝國選舉法》，年滿 20 歲男女都有投票權）；https://www.archives.gov/milestone-documents/19th-amendment （已開啟：1920 年 8 月 18 日批准）。表格與詳解一致；「婦女團體長期爭取」依使用者決定保留。
- **expert-167** 聯合國與國聯：https://history.state.gov/milestones/1914-1920/league （已開啟，美國國務院史官辦公室：威爾遜提出國聯構想，參議院 1920 年否決《凡爾賽和約》，美國從未加入）；https://www.un.org/en/about-us/history-of-the-un （已開啟：1945 年 10 月 24 日成立，中、法、蘇、英、美批准憲章）；https://www.un.org/en/about-us/history-of-the-un/predecessor （已開啟：國聯設在日內瓦）。一致；「美國、中華民國」依使用者決定保留。
- **expert-168** 古代印度與佛教排序：https://www.worldhistory.org/Indus_Valley_Civilization/ （已開啟：成熟哈拉帕期約前 2800／2600～前 1900 年，哈拉帕與摩亨約達羅約前 2600 年已繁榮）；https://www.worldhistory.org/article/493/the-dates-of-the-buddha/ （已開啟：最常採用的年代約前 563～前 483 年，另有前 448～前 368 年等說法）；https://www.ebsco.com/research-starters/history/buddhism-enters-china （已開啟：傳統上定在東漢明帝約 60～68 年，學界認為一世紀中期已傳入）；https://collections.uag.pitt.edu/Detail/objects/7040 （已開啟，匹茲堡大學美術館：玄奘 629 年起西行）。**不一致（小）**：詳解「約西元前 2500 年」出現城市，原始來源為約前 2600 年起，已修正（見下）。
- **expert-169** 歐洲排序：https://www.unibo.it/en/university/who-we-are/our-history （已開啟：1088 年）；https://www.loc.gov/exhibits/bibles/exhibititems.html （已開啟，美國國會圖書館：古騰堡聖經 Mainz 1455）；https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/early-modern/the-dissolution-of-the-monasteries/ （已開啟，英國國家檔案館：1534 年《至尊法案》宣布亨利八世為英格蘭教會最高領袖）；https://www.newadvent.org/cathen/15030c.htm （已開啟，天主教百科：特倫托大公會議 1545 年 12 月 13 日開議）。一致。
- **expert-170** 美洲與大西洋世界排序：https://www.worldhistory.org/Tenochtitlan/ （已開啟：1521 年 8 月 13 日陷落）；https://www.nps.gov/jame/learn/historyculture/index.htm （已開啟，美國國家公園管理局：1607 年英格蘭第一個永久殖民地詹姆斯敦）；https://history.state.gov/countries/haiti （已開啟：1804 年脫離法國獨立）；https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/georgians/1833-abolition-of-slavery-act-and-compensation-claims/ （已開啟：1833 年 8 月通過、1834 年 8 月 1 日生效，奴隸先轉為學徒，1838 年英國各殖民地全面解放）；https://en.wikipedia.org/wiki/Lei_%C3%81urea （已開啟：1888 年 5 月 13 日，巴西是美洲最後廢除奴隸制度的國家）。**不一致**：項目與詳解寫「廢除帝國內的奴隸制度」，原始來源寫的是「殖民地」，且法案第 64 條排除東印度公司領地、錫蘭與聖赫勒拿島（條文全文頁面 403，此點仍只有摘錄）；已修正（見下）。
- **expert-171** 二十世紀國際合作排序：https://www.un.org/en/about-us/universal-declaration-of-human-rights （已開啟：1948 年 12 月 10 日）；https://european-union.europa.eu/principles-countries-history/history-eu/1945-59_en （已開啟，歐盟官網：1957 年 3 月 25 日簽約，1958 年 1 月 1 日歐洲經濟共同體成立）；https://au.int/en/overview （已開啟，非洲聯盟：1963 年 5 月在阿迪斯阿貝巴簽署非洲團結組織憲章）；https://www.wto.org/english/thewto_e/whatis_e/tif_e/fact4_e.htm （已開啟，WTO：1995 年 1 月 1 日成立，GATT 為 1948 年起的臨時協定與組織）。一致；巴黎和會 1919 年為通說。
- **expert-172** 三角貿易商品分類：與 expert-162 同來源（NEH 已開啟）；商品方向屬教科書通說，沒有另外的原始頁面，一致。
- **expert-174** 杜拜：https://gulfnews.com/business/energy/oil-in-dubai-history--timeline-1.578333 （已開啟：1966 年近海法塔油田發現石油、1969 年首批出口；杜拜蘊藏量約 40 億桶，在阿聯各酋長國中排第二）。一致。AGBI 403，與阿布達比的比較仍只有摘錄。
- **expert-175** 智利：https://en.wikipedia.org/wiki/Geography_of_Chile （已開啟：南北長 4,270 公里、平均寬 177 公里、南緯 17 度到合恩角 56 度，北部乾燥〔阿他加馬〕、中部地中海型、南部潮濕）。一致。Britannica 403、IAEA 402，政府或國際組織來源仍只有摘錄。
- **expert-176** 亞斯文高壩：https://www.ebsco.com/research-starters/science/aswan-high-dam （已開啟：1960 年動工、1970 年完工，位在埃及南部、開羅以南約 960 公里；攔住 98% 泥沙，農民更依賴化肥，三角洲前緣每年後退可達 100 公尺）。一致；「南部、尼羅河上游」依使用者決定保留。
- **expert-177** 鹹海：https://science.nasa.gov/earth/earth-observatory/world-of-change/aral-sea/ （已開啟，NASA：1960 年代起蘇聯把錫爾河、阿姆河引去灌溉棉花等作物，湖面縮小、湖水變鹹、漁業崩潰）。一致。
- **expert-178** 午夜太陽：https://www.visittromso.no/midnight-sun （已開啟：約 5 月 20 日至 7 月 22 日）；https://en.wikipedia.org/wiki/Midnight_sun （已開啟：成因為地軸傾斜約 23°26′）。一致。
- **expert-179** 內陸國：https://en.wikipedia.org/wiki/Landlocked_country （已開啟：寮國、尼泊爾、奧地利、巴拉圭列在內陸國表中；智利、葡萄牙、越南、肯亞不在其中）。一致。肯亞港務局網站憑證錯誤，蒙巴薩港仍只有通說。
- **expert-183** 工會：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0020006 （已開啟，《團體協約法》第 2 條：雇主與依工會法成立之工會簽訂的書面契約；第 17 條：拘束團體協約當事團體所屬的雇主及勞工）；https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0020001 （已開啟，《工會法》第 4 條勞工有組織及加入工會之權利、第 5 條第 1 款團體協約之締結為工會任務）。一致。
- **expert-185** 累進稅率：https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340003&flno=5 （已開啟，《所得稅法》第 5 條：5%、12%、20%、30%、40% 五級累進）。一致（題目不考級距金額）。
- **expert-189** 難民：https://emergency.unhcr.org/protection/legal-framework/refugee-definition （已開啟，聯合國難民署緊急手冊：1951 年公約的迫害定義，以及 1969 年非洲團結組織公約、1984 年卡塔赫納宣言與難民署職權納入逃離普遍暴力、外來侵略者）；https://www.un.org/en/global-issues/refugees （已開啟：難民越過國界逃離迫害、衝突或暴力）。一致。
- **expert-190** 碳足跡：https://law.moj.gov.tw/LawClass/LawAll.aspx?PCODE=O0020142 （已開啟，《自願性產品碳足跡核定標示及管理辦法》第 2 條：商品生命週期各階段〔原（物）料取得、製造、配送銷售、使用及廢棄處理〕的溫室氣體排放量換算為二氧化碳當量之總和）；https://www.polyu.edu.hk/ise/ecodesign/product_carbon_footprint_c.html （已開啟，香港理工大學：從原料取得到生命末端，以二氧化碳當量表示）。一致。
- **expert-193** 冷凍船：https://en.wikipedia.org/wiki/Dunedin_(1874_ship) （已開啟：1882 年 2 月 15 日從紐西蘭載冷凍肉出發，約 98 天抵倫敦，開啟冷凍肉產業）；https://iifiir.org/en/fridoc/land-marine-and-air-refrigerated-transport-5109 （已開啟，國際冷凍協會：1876 年 Le Frigorifique 法國—阿根廷往返，隔年 Carré 完成第一次冷凍肉運輸）。與「十九世紀後期」一致。Te Ara、NZHistory 403。
- **expert-194** 氣候類型分類：https://www.kma.go.kr/neng/biz/climate/climate-of-korea.do （已開啟，韓國氣象廳：年雨量一半以上落在梅雨〔Changma〕季，冬季盛行西北風、冬季降水不到全年 10%）；https://en.wikipedia.org/wiki/Climate_of_Perth （已開啟：Csa 地中海型，夏乾冬雨）；https://en.wikipedia.org/wiki/Cape_Town （已開啟：地中海型，6～8 月最多雨，約南緯 34 度）；https://en.wikipedia.org/wiki/Athens （已開啟：Csa，7、8 月極乾、冬季多雨）。一致；首爾、北京歸溫帶季風氣候依使用者決定。香港教育局 PDF 404，北京的分類仍只有摘錄。
- **expert-196** 南亞季風：https://en.wikipedia.org/wiki/Monsoon_of_South_Asia （已開啟：西南季風 6～9 月、6 月初抵達西岸；東北季風約 10 月 20 日起約 50 天）。一致。印度氣象局網站連線被拒，仍只有摘錄。
- **expert-197** 沙漠日夜溫差：https://en.wikipedia.org/wiki/Sahara （已開啟：夜間比白天低 13～20°C，原因是缺少雲層、濕度很低；中心約北緯 23 度）。一致；提示「北緯 15～30 度」頁面未直接寫出緯度界線，仍只有摘錄，屬概略說法。
- **expert-198** 調解與三級三審：上方紀錄已開啟《鄉鎮市調解條例》《民事訴訟法》兩個全國法規資料庫原始條文，沿用；簡易、小額程序的補充依使用者決定。
- **expert-199** 少年事件處理法：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=C0010011 （再次開啟：第 1 條保障少年健全自我成長；第 2 條 12 歲以上 18 歲未滿；第 27 條第 1 項觸犯最輕本刑 5 年以上之罪「應」移送檢察官、第 2 項情節重大「得」移送、第 3 項犯罪時未滿 14 歲不適用；第 42 條四種保護處分；最新修正 2023 年 6 月 21 日）。**不精確**：詳解「14 歲以上觸犯重罪的少年，少年法院可移送檢察官」，條文對最輕本刑 5 年以上之罪是「應」移送；已修正（見下）。
- **expert-200** 個人資料保護：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=I0050021 （再次開啟：第 5 條不得逾越特定目的之必要範圍；第 20 條第 1 項非公務機關應於蒐集之特定目的必要範圍內利用，例外含經當事人同意）。一致。
- **觀念題略過**：expert-173、expert-180、expert-181、expert-182、expert-184、expert-186、expert-187、expert-188、expert-191、expert-192、expert-195。

### 修正

- **expert-168**：`explain`「約西元前 2500 年，印度河流域出現哈拉帕、摩亨約達羅等城市」→「約西元前 2600 年起，印度河流域出現哈拉帕、摩亨約達羅等城市」；`years` 第一項 `-2500` → `-2600`。原因：World History Encyclopedia 寫成熟哈拉帕期約前 2600 年（另說前 2800 年）起，城市約前 2600 年已繁榮。排序與答案不變。
- **expert-170**：排序項目「英國國會廢除帝國內的奴隸制度」→「英國國會通過法律廢除殖民地的奴隸制度」；`explain`「1833 年，英國國會通過法律廢除帝國內的奴隸制度」→「1833 年，英國國會通過《廢除奴隸法》，隔年起逐步廢除大部分殖民地的奴隸制度」。原因：英國國家檔案館寫法案適用於殖民地、1834 年生效並經學徒制過渡到 1838 年；法案不適用於東印度公司領地、錫蘭、聖赫勒拿島，「帝國內」簡化成錯的說法。排序與答案不變；知識卡 `expert5-triangle-trade`「英國、巴西等國陸續廢除奴隸制度」正確，未改。
- **expert-199**：`explain` 括號「14 歲以上觸犯重罪的少年，少年法院可移送檢察官依刑事程序處理」→「14 歲以上的少年觸犯最輕本刑 5 年以上的重罪等情形，少年法院會移送檢察官依刑事程序處理」。原因：第 27 條第 1 項是「應」移送，寫「可」不精確。答案不變。

### 統計

- 本次核對 31 題（具體事實題），其中 30 題新開啟了原始頁面（expert-198 沿用已開啟條文）；觀念題 11 題略過。
- 不一致或不精確 3 題，已修正；需要改答案的 0 題。
- 部分事實仍只有摘錄：expert-163（羅馬帝國 395 年分裂）、expert-164（1500 年卡布拉爾）、expert-165（《阿迪斯阿貝巴條約》）、expert-170（法案第 64 條排除條款）、expert-174（與阿布達比比較）、expert-175（政府或國際組織來源）、expert-179（蒙巴薩港）、expert-194（北京的分類）、expert-196（印度氣象局）、expert-197（撒哈拉緯度界線）。
- 驗證：`node scripts/validate-bank.mjs data/bank/expert-4.json data/bank/expert-5.json` 通過（各 42 題；知識卡 34、35 張）。
