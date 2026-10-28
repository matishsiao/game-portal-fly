# easy-5 事實審閱紀錄

- 審閱檔案：`data/draft/easy-5.json` → `data/checked/easy-5.json`
- 檢查題數：42 題（easy-159～easy-200）、28 張知識卡（另連到 `data/bank/easy-1.json` 的 `easy-life-then-now`、`easy-family-class`、`easy-landforms`、`easy-rain-typhoon`、`easy-directions` 5 張卡，已核對內容，未修改）
- 修正數：6 題（easy-167、182、183、187、190、192），其中 easy-190、192 同步修改知識卡 `easy5-compass`、`easy5-priority-seat`
- 移到 `held`：0 題
- 驗證：`node scripts/validate-bank.mjs data/checked/easy-5.json` 通過（42 題、28 張知識卡）

## 作法

- 先只看題目、選項、排序項目與分類卡片自行作答，再對照 `answer`、`items` 順序與 `bin`：42 題自答全部與答案一致；排序題與分類題都只有一種合理答案。
- 逐題查證題目、選項、提示、詳解與知識卡。來源標示：「已開啟」表示實際打開頁面核對內容；「僅搜尋摘錄」表示頁面無法開啟（PDF 無法解析、403 等），只依搜尋結果的摘錄核對。
- 觀念題（家鄉調查方法、班級與家庭生活、借用禮貌、地圖判讀、方位推理）以題目條件推理即可得到唯一答案，沒有具體事實可查；仍列出相關的教學或官方資料。

## 逐題查證

### easy-159 老照片看土地用途改變（未修改）

- 觀念題：同一地點從稻田變住宅，表示土地利用改變；沒有具體事實可查。
- 參考：彰化縣國小公開授課教案（家鄉變遷、地圖要素單元，僅搜尋摘錄）：https://www.openclass.chc.edu.tw/years/111/plans/48693/reviews/課程資料.pdf

### easy-160 地方文物館（未修改）

- 觀念題：文物館展示從前生活用品，用來認識家鄉過去；沒有具體事實可查。

### easy-161 訪問長輩前的準備（未修改）

- 觀念題：約時間、準備問題；沒有具體事實可查。

### easy-162 族譜（未修改）

- 族譜記錄家族世系、祖籍與遷徙。
- 來源：
  - 國家圖書館「臺灣家譜聯合目錄」相關說明（僅搜尋摘錄）：https://rbook.ncl.edu.tw/NCLSearch/Search/Index/3
  - 國立政治大學學位論文，族譜記載祖籍與遷臺（僅搜尋摘錄）：https://ah.lib.nccu.edu.tw/bitstream/140.119/34570/7/25900607.pdf

### easy-163 補鍋、修傘行業減少（未修改）

- 觀念題（工業大量生產使用品變便宜，修理行業減少）；四個選項中只有 0 合理。
- 參考：天下雜誌《微笑台灣》萬華打鐵店報導（機械化後傳統手工行業轉型，僅搜尋摘錄，403）：https://smiletaiwan.cw.com.tw/article/3026

### easy-164 網購使送貨工作增加（未修改）

- 觀念題，沒有具體事實可查。

### easy-165 打鐵店做鋤頭、菜刀（未修改）

- 打鐵店製作鋤頭、鐮刀等農具與菜刀。
- 來源：
  - 公視新聞網〈新莊自清朝即產米 打鐵業因農務而盛〉（鋤頭、鐮刀等鐵製農具需求大）（已開啟）：https://news.pts.org.tw/article/409342
  - TVBS 新聞〈三峽鏗鏘不斷 打鐵師傅承傳職工精神〉（店內有犁頭、鋤頭、菜刀等）（僅搜尋摘錄）：https://news.tvbs.com.tw/life/802907

### easy-166 曬乾、鹽醃保存食物（未修改）

- 降低水分、提高鹽分讓微生物不易生長，食物可放較久。
- 來源：
  - 食力 foodNEXT，鹽醃降低水活性、引述食藥署說明（僅搜尋摘錄）：https://www.foodnext.net/science/machining/paper/5616542963
  - 食力 foodNEXT，醃漬與乾燥保存原理（僅搜尋摘錄）：https://www.foodnext.net/science/machining/paper/4852952746

### easy-167 糖廠小火車（五分車）（修正詳解）

- 查證：糖業鐵道主要位於中南部平原，為運送甘蔗到糖廠而鋪設；軌距 762 公釐，比臺鐵的 1067 公釐窄；也曾經營客運（所以選項 0 的提示「有些小火車也載過乘客」正確）。「五分車」名稱由來有不同說法（軌距約為標準軌一半、車身較小、速度約一半）。
- 來源：
  - 遠見《未來城市》糖業鐵道介紹（中南部平原、為運輸甘蔗而鋪設、軌距小於標準軌）（已開啟）：https://city.gvm.com.tw/article/86300
  - Taipei Times〈Taiwan in Time〉2024-09-08（762mm 軌距、主要運甘蔗、五分車名稱有軌距或速度兩種說法）（已開啟）：https://www.taipeitimes.com/News/feat/archives/2024/09/08/2003823428
  - 公視新聞網，虎尾糖廠五分車運甘蔗（已開啟）：https://news.pts.org.tw/article/461592
  - Wikipedia「Taiwan Sugar Railways」（762mm、主要運甘蔗、41 條線曾有客運）（已開啟）：https://en.wikipedia.org/wiki/Taiwan_Sugar_Railways
- 修正：
  - 原本：「這種小火車的軌道比一般火車窄，所以也叫「五分車」。」
  - 修改：「這種小火車的軌道比一般火車窄，車身也比較小，大家暱稱它「五分車」。」
  - 原因：軌距較窄正確，但「五分車」名稱由來有多種說法，原文寫成單一因果；改為不斷定由來的寫法。

### easy-168 山村開通公路（未修改）

- 觀念題（交通改善使農產品運輸更快），沒有具體事實可查。

### easy-169 土地公廟（未修改）

- 農民祭拜土地公祈求五穀豐收、土地平安；詳解已用「信徒認為」。
- 來源：
  - 公視新聞網〈烏日迷你土地公廟〉（農民為了五穀豐收立石祭拜）（已開啟）：https://news.pts.org.tw/article/436751
  - 國立自然科學博物館館訊，土地公在農業社會兼管聚落、農業（僅搜尋摘錄）：https://libknowledge.nmns.edu.tw/nmns/lib/PDF/98/258/a-5.pdf

### easy-170 新舊行業分類（未修改）

- 打鐵、補鍋為傳統行業；人力車清末已少量出現、日治時期普及，戰後被三輪車等取代；手機維修、外送、網路商店需手機與網路普及。分類唯一。
- 來源：
  - 新新聞／The News Lens 臺灣交通史（戰後三輪車與 1953 年淘汰三輪客車）（僅搜尋摘錄）：https://www.thenewslens.com/article/138835
  - 公視新聞網，新莊打鐵業（已開啟）：https://news.pts.org.tw/article/409342

### easy-171 照明方式排序（未修改）

- 查證：日治初期（1905 年起）臺北才開始供電點亮電燈，日治後期家戶電燈普及率約 35%～40%，之前與農村多用油燈；LED 燈是近年推廣的節能照明，比傳統燈泡省電、壽命長。順序「油燈或蠟燭 → 電燈泡 → LED 燈」唯一（螢光燈未列入，不影響順序）。「LED 燈」為能源署、環境部宣導的通用寫法。
- 來源：
  - 台電〈百年前電器圖文包〉（日治後期電燈普及率約 35%～40%）（僅搜尋摘錄，PDF 無法解析）：https://service.taipower.com.tw/Collection/media/xwkpnedn/百年前電器圖文包-純文字.pdf
  - 國立中央大學論文，清末電燈未普及、日治初期百姓始用電燈（僅搜尋摘錄）：https://lit.ncu.edu.tw/ncujoh/word/32397282018.pdf
  - 元氣網引述能源署（LED 耗電約為傳統燈具 1/4）（已開啟）：https://health.udn.com/health/story/6006/9224168
  - 公視新聞網引述環境部（LED 壽命約為傳統燈泡 4 倍）（已開啟）：https://news.pts.org.tw/article/711362

### easy-172 家鄉報告步驟（未修改）

- 觀念題（決定主題 → 蒐集 → 整理 → 發表），順序唯一；沒有具體事實可查。

### easy-173 借東西的步驟（未修改）

- 觀念題，順序唯一；沒有具體事實可查。

### easy-174 垃圾三分類（未修改）

- 查證：用過的衛生紙屬一般垃圾；用過的口罩因衛生疑慮與材質，以一般垃圾處理、不回收；果皮（橘子、蘋果等軟果皮）屬廚餘（臺北市為堆肥廚餘，臺中市為生廚餘），只有椰子殼、榴槤殼等硬殼在部分縣市屬一般垃圾；鋁罐、報紙為資源回收。各縣市細節不同，但本題 6 張卡片在各縣市分類一致，答案唯一。
- 來源：
  - NOWnews〈口罩用後當一般垃圾〉（引述環保署副署長不建議回收）（已開啟）：https://www.nownews.com/news/5005531
  - TVBS 食尚玩家〈廚餘分類〉（果皮屬堆肥廚餘）（已開啟）：https://supertaste.tvbs.com.tw/kids/354295
  - 臺北市法規查詢系統，廚餘定義與堆肥廚餘包含水果外皮（榴槤皮、椰子殼除外）（僅搜尋摘錄，PDF 無法解析）：https://laws.gov.taipei/law/LawDecision/ContentExport?id=921-021
  - 國立臺東大學垃圾分類說明（衛生紙屬一般垃圾）（僅搜尋摘錄）：https://dga.nttu.edu.tw/var/file/8/1008/attach/36/pta_57266_2995897_61097.pdf

### easy-175 衛生股長（未修改）

- 查證：衛生股長負責分配掃區、督導整潔；班長負責「起立、敬禮」口令；總務股長管理班費。各校幹部名稱略有差異，但「衛生股長負責打掃與整潔」各校一致，答案唯一。
- 來源：
  - 新竹縣湖口高中〈衛生股長幹部手冊〉（督導整潔工作、分配掃區）（僅搜尋摘錄）：https://www.hgsh.hc.edu.tw/view-doc/17/114-1衛生股長幹部手冊.pdf
  - 臺南市國小衛生幹部訓練資料（僅搜尋摘錄）：https://www.ccsh.tn.edu.tw/newsupload/正副衛生幹部訓練報告1150223OK.pdf
  - 東海大學附屬學校〈學生班會組織通則〉（班長發「起立」「敬禮」口令）（僅搜尋摘錄）：https://www.hn.thu.edu.tw/upload/downloads_upload/1111_學生班會組織通則.pdf
  - 國立嘉義大學班級幹部設置要點（總務股長等幹部）（僅搜尋摘錄）：https://ncyuweb.ncyu.edu.tw/files/list/act/國立嘉義大學班級幹部設置要點NEW.pdf

### easy-176 圖書館續借（未修改）

- 觀念題（依規定續借、有人預約須先還），沒有具體事實可查。

### easy-177 家庭會議（未修改）

- 觀念題，沒有具體事實可查；連到 `easy-family-class`。

### easy-178 平原與山地景色（未修改）

- 觀念題：平原地勢平坦適合稻田、城市與直線道路；山地坡陡、道路彎曲、森林多。分類唯一。

### easy-179 陽明山冒氣、溫泉、硫磺味（未修改）

- 查證：陽明山國家公園以大屯火山群為主體，大油坑、小油坑、馬槽、大磺嘴有強烈噴氣孔活動，園區多溫泉，小油坑可見噴氣孔、溫泉與硫磺結晶，屬後火山活動。
- 來源：
  - 交通部觀光署臺灣觀光資訊網「陽明山國家公園」（已開啟）：https://www.taiwan.net.tw/m1.aspx?id=738&sno=0001016
  - TVBS 新聞〈會發電的山〉（小油坑噴氣孔屬後火山活動）（僅搜尋摘錄）：https://news.tvbs.com.tw/life/2845520

### easy-180 梯田（未修改）

- 梯田把坡地分層整平、築田埂，能留住灌溉水並減少水土流失；水梯田長年蓄水。
- 來源：
  - Wikipedia「梯田」（分層保持水土，避免灌溉水快速逕流；水稻梯田）（已開啟）：https://zh.wikipedia.org/zh-tw/梯田
  - 農業部刊物〈水梯田〉（水梯田長年蓄水、涵養水源）（僅搜尋摘錄，PDF 無法解析）：https://www.moa.gov.tw/ws.php?id=2507987

### easy-181 島嶼與半島（未修改）

- 定義題：四面環海為島嶼，三面環海為半島。
- 參考：彰化縣國小社會教案（地形名稱）（僅搜尋摘錄）：https://www.openclass.chc.edu.tw/years/112/plans/63053/reviews/課程資料.pdf

### easy-182 海邊岩石的洞（修正詳解）

- 查證：海蝕洞由波浪衝擊、海水夾帶的沙礫磨蝕形成；野柳等地的蜂窩岩則還有海水鹽分風化（鹽解）讓孔洞擴大。答案「海浪長時間拍打」在國小程度成立，其他三個選項都錯。
- 來源：
  - Wikipedia「海蝕洞」（波浪衝擊與沙礫磨蝕）（已開啟）：https://zh.wikipedia.org/zh-tw/海蝕洞
  - 林業及自然保育署野柳地質公園學習單（海浪、風化作用形成蜂窩岩等）（僅搜尋摘錄）：https://geopark.forest.gov.tw/File/Userfiles/0000000001/files/%e5%ad%b8%e7%bf%92%e5%96%ae_%e5%8d%97%e7%ab%bf%e9%81%8a%e5%ae%a2%e4%b8%ad%e5%bf%83.pdf
- 修正：
  - 原本：「海浪日夜拍打岩石，再加上海水帶著沙石磨擦，比較軟的岩石會先被侵蝕掉，……」
  - 修改：「海浪日夜拍打岩石，海水還帶著沙石磨擦，海水裡的鹽分也會讓岩石表面慢慢剝落，比較軟的部分會先被侵蝕掉，……」
  - 原因：海邊岩石的小洞（蜂窩岩）有一部分是鹽分風化造成，補上以免簡化過頭；答案不變。

### easy-183 颱風與梅雨分類（修正一張卡片與詳解）

- 查證：臺灣梅雨季約 5 月中旬至 6 月中旬，由滯留鋒面造成，常連續降雨；「梅雨」名稱來自長江中下游、華南梅子成熟的時節，又因潮濕易發霉稱「霉雨」。臺灣青梅產季為 3 月下旬至 5 月中旬，盛產在清明前後，**與臺灣梅雨季並不重合**。颱風侵臺以 8 月最多，次為 7、9 月；颱風中心有颱風眼。
- 來源：
  - TVBS 新聞〈梅雨季〉（臺灣梅雨季時間、滯留鋒、名稱來自長江中下游梅子成熟、霉雨）（已開啟）：https://news.tvbs.com.tw/life/2507357
  - 臺南市政府災害應變電子報（梅雨定義與名稱由來）（僅搜尋摘錄，PDF 無法解析）：https://w3fs.tainan.gov.tw/001/Upload/137/epaper/353/0601豪雨與0613豪雨應變中心開設6月份電子報-參議修正(3).pdf
  - 農業部食農教育文章（青梅產季 3 月下旬～5 月中旬，清明前後盛產）（僅搜尋摘錄，PDF 無法解析）：https://www.moa.gov.tw/ws.php?id=2515587
  - 天下雜誌引述氣象署《颱風百問》（侵臺颱風 8 月最多，次為 7、9 月）（僅搜尋摘錄）：https://www.cw.com.tw/article/5114462
- 修正：
  - 原本卡片：「正好是梅子成熟的季節」，提示「它的名字就和這種水果有關。」
  - 修改卡片：「天氣潮濕，東西容易發霉」，提示「雨一連下好幾天，空氣一直濕濕的，衣服和食物容易長黴。」
  - 原本詳解：「梅雨出現在五、六月，正值梅子成熟，常連續多天下雨，但風通常不大。」
  - 修改詳解：「梅雨出現在五、六月，常連續多天下雨、空氣潮濕，但風通常不大。「梅雨」的名稱來自中國江南一帶梅子成熟時的連綿陰雨，因為東西容易發霉，也叫「霉雨」。」
  - 原因：臺灣的梅子在 3～5 月成熟，五、六月的臺灣梅雨季並不是「正好梅子成熟」；名稱由來是江南的梅子季節。

### easy-184 雨量計（未修改）

- 雨量器（雨量計）收集並測量降雨量；溫度計量氣溫；風向標測風向。
- 來源：
  - 香港天文台〈自動氣象站的常規儀器〉（雨量器、溫度計、風向標的用途）（已開啟）：https://www.hko.gov.hk/tc/education/meteorological-instruments/automatic-weather-stations/00454-conventional-instruments-installed-at-an-automatic-weather-station-in-hong-kong.html
  - 國家文化記憶庫 AAT 詞彙「雨量計」（收集並測量降雨量的儀器）（僅搜尋摘錄）：https://aat.teldap.tw/AATFullDisplay/300201543

### easy-185 午後雷陣雨（未修改）

- 查證：日間陽光使地面升溫，近地面暖濕空氣對流上升形成積雨雲，午後產生雷雨，降雨後對流減弱、雲消散；東北季風降雨多在秋冬。
- 來源：
  - 香港天文台〈為何早上天晴，午後卻雷雨交加〉（已開啟）：https://www.hko.gov.hk/tc/education/weather/thunderstorm-and-lightning/00705-Why-is-it-sunny-in-the-morning-but-thundering-and-raining-in-the-afternoon.html
  - 聯合新聞網〈全臺午後熱對流發威〉（引述氣象署，午後局部雷陣雨）（已開啟）：https://udn.com/news/story/7266/9628285

### easy-186 缺水時節約用水（未修改）

- 洗菜、洗米水澆花，盆浴改淋浴等為水利署節水建議。
- 來源：
  - 教育部防災教育資訊網〈節水 36 計〉（僅搜尋摘錄）：https://disaster.moe.edu.tw/MOE_FILE/daolpU/teachingMaterial/2020/TM20200512103357224/節水36計.pdf
  - 國立陽明交通大學轉載水利署省水好習慣（洗菜洗米水澆花、盆浴改淋浴）（僅搜尋摘錄）：https://www.nycu.edu.tw/userfiles/gach/files/20231129105631939.pdf

### easy-187 寒流時瓦斯熱水器（修正詳解）

- 查證：一氧化碳無色無味；居家一氧化碳中毒多因熱水器裝在通風不良處、燃燒不完全，冬天門窗緊閉更容易發生；消防署統計約九成與屋外式熱水器裝在通風不良處有關；熱水器宜裝在室外或用強制排氣型，使用時保持通風。
- 來源：
  - TVBS 健康 2.0〈寒流來襲門窗關緊緊……一氧化碳中毒〉（無色無味、燃燒不完全、保持通風）（已開啟）：https://health.tvbs.com.tw/medical/331301
  - 聯合新聞網〈臺南消防局「五要」〉（引述消防署統計近九成與屋外式熱水器裝在通風不良處有關）（已開啟）：https://udn.com/news/story/7320/9314085
- 修正：
  - 原本：「……如果窗戶緊閉、空氣不流通，可能產生看不見也聞不到的一氧化碳，讓人中毒。天冷時也要讓熱水器附近的窗戶打開一點，保持通風。」
  - 修改：「……如果窗戶緊閉、空氣不流通，瓦斯燒不完全，會產生看不見也聞不到的一氧化碳，讓人中毒。熱水器最好裝在室外通風的地方；天冷時，熱水器附近的窗戶也要打開，保持通風。」
  - 原因：補上「燃燒不完全」的因果與消防單位「熱水器裝在室外」的建議；「打開一點」改為「打開」，避免讓人以為開一點縫就夠（消防宣導建議形成對流）。

### easy-188 圖名（未修改）

- 地圖基本要素：圖名、方位標（指北針）、圖例、比例尺；圖名說明地圖主題。
- 來源：
  - 彰化縣國小四年級社會公開授課教案（圖名、方位標、圖例、比例尺）（僅搜尋摘錄）：https://www.openclass.chc.edu.tw/years/111/plans/48693/reviews/課程資料.pdf
  - 彰化縣國中地理公開授課教案（圖名說明地圖主要內容）（僅搜尋摘錄）：https://www.openclass.chc.edu.tw/years/113/plans/96287/reviews/課程資料.pdf

### easy-189 走原路回去（未修改）

- 方位推理題：去程北 2、東 1，回程西 1、南 2；答案唯一，其他三個選項都會走到別處。沒有具體事實可查。

### easy-190 指南針（修正詳解與知識卡）

- 查證：指南針帶磁性，受地磁影響停下時指向南北；不需網路。臺灣國小教材多稱「指北針」。
- 來源：
  - 香港天文台〈地磁〉（指南針因地磁指向南北）（已開啟）：https://www.hko.gov.hk/tc/gts/equake/qe_geomagnetism.htm
  - 彰化縣國小自然教案（指北針、磁針受地磁影響指向南北）（僅搜尋摘錄）：https://www.openclass.chc.edu.tw/years/111/plans/50237/reviews/課程資料.pdf
- 修正：
  - 原本（詳解與 `easy5-compass`）：「指南針（也叫羅盤）」
  - 修改：「指南針（也有人叫它指北針）」
  - 原因：「羅盤」是附有方位刻度盤的定向儀器（例如航海、風水用），不等同於指南針；臺灣國小教材常用「指北針」，改用學生會在課本看到的名稱。

### easy-191 平面圖（未修改）

- 平面圖（俯視圖）是從正上方往下看描繪的圖。
- 來源：
  - 國家文化記憶庫 AAT「規劃圖（正投影）／平面圖」（以俯視角度描繪於水平面）（已開啟）：https://aat.teldap.tw/AATFullDisplay/300034104
  - 國家文化記憶庫 AAT「俯視圖（平面圖）」（由正上方觀視描繪）（僅搜尋摘錄）：https://aat.teldap.tw/AATFullDisplay/300117359

### easy-192 博愛座 → 優先席（修正題目、提示、解題重點、詳解與知識卡）

- 查證：立法院 2025 年 7 月三讀修正《身心障礙者權益保障法》第 53 條，「博愛座」改稱「優先席」，優先對象由「老弱婦孺」改為「身心障礙者或有其他實際需要者」；交通部 2025 年 9 月公布統一圖示（高齡者、孕婦、行動不便者、攜帶幼童、其他實際需要者），要求大眾運輸業者 2025 年 12 月 31 日前完成更換。答案「長輩和行動不便的人」仍是四個選項中唯一正確者。
- 來源：
  - 公視新聞網〈博愛座更名優先席 交通部公布統一圖示〉（已開啟）：https://news.pts.org.tw/article/769656
  - 自由時報〈優先席〉報導（對象為身心障礙者或有其他實際需要者，新增「身體不適」圖示）（已開啟）：https://news.ltn.com.tw/news/life/breakingnews/5151613
  - 世界日報〈博愛座走入歷史 身障權法三讀通過改「優先席」〉（僅搜尋摘錄）：https://www.worldjournal.com/wj/amp/story/121221/8873054
- 修正：
  - 題目原本：「公車和捷運上有「博愛座」。博愛座最主要是讓哪些人優先坐？」→ 修改：「公車和捷運上有「優先席」（以前叫做「博愛座」）。優先席最主要是讓哪些人優先坐？」
  - 選項 1、3 的提示：「博愛座」改為「優先席」。
  - `keys[0]` 原本：「「博愛」是什麼意思？是要照顧誰？」→ 修改：「「優先」坐的人，是看誰先上車，還是看誰比較需要？」
  - 詳解原本：「博愛座是讓長輩、孕婦、身心障礙者、抱著小孩或受傷的人等需要的人優先坐。……即使坐的不是博愛座，也可以主動讓座。」→ 修改：「優先席是讓長輩、孕婦、行動不便、抱著小孩或身體不舒服等有需要的人優先坐。車子搖晃時，他們站著比較危險。2025 年法律修改後，「博愛座」改名為「優先席」。看到需要的人，即使坐的不是優先席，也可以主動讓座。」
  - 知識卡 `easy5-priority-seat`：標題「博愛座」→「優先席」；內容改為「優先席（以前叫做「博愛座」）讓長輩、孕婦、行動不便、抱小孩或身體不舒服等有需要的人優先坐。……」
  - 原因：2025 年底起大眾運輸工具上的標示已全面改為「優先席」，學生在車上看不到「博愛座」；優先對象依新法與統一圖示改寫。

### easy-193 兒童權利公約：休息與遊戲（未修改）

- 查證：《兒童權利公約》第 28 條保障受教育權；第 31 條承認兒童有休息與休閒、從事適齡遊戲與娛樂、自由參加文化與藝術生活的權利。《兒童權利公約施行法》2014 年 5 月 20 日三讀、6 月 4 日公布、同年 11 月 20 日施行，第 2 條使公約規定具有國內法律效力。
- 來源：
  - UNICEF〈Convention on the Rights of the Child: text〉（第 28、31 條）（已開啟）：https://www.unicef.org/child-rights-convention/convention-text
  - Youth Law Australia〈Article 31〉（已開啟）：https://yla.org.au/sa/topics/child-rights/article-31-united-nations-convention-on-the-rights-of-the-child/
  - 《兒童權利公約施行法》條文（第 2 條、第 10 條施行日期）（已開啟）：https://6laws.net/6law/laws/兒童權利公約施行法.html
  - 總統府公報第 7143 號（2014 年 6 月 4 日公布）（僅搜尋摘錄）：https://www.president.gov.tw/PORTALS/0/BULLETINS/PAPER/PDF/7143-26.PDF

### easy-194 依能力與意願分工（未修改）

- 觀念題（性別平等教育），沒有具體事實可查；依《性別平等教育法》精神，答案唯一。

### easy-195 棉 T 恤的生產順序（未修改）

- 棉花採收 → 紡紗 → 織（含針織）成布 → 裁剪縫製 → 銷售；順序唯一。
- 來源：
  - 財報狗〈紡織產業〉（棉花為上游，紡紗、織造、染整、成衣）（僅搜尋摘錄）：https://statementdog.com/taiex/10-textile-industry
  - edumaps 棉 T 恤製程（採收、紡紗、織布、裁剪縫製）（僅搜尋摘錄）：https://www.edumaps.de/view/5017/4/yw4p09tn9z/2428
- 備註：T 恤多為針織布，「織成布」在國小程度可涵蓋，不另修改。

### easy-196 收入與支出分類（未修改）

- 觀念題，分類唯一；沒有具體事實可查。

### easy-197 存錢到郵局（未修改）

- 查證：郵局存簿儲金計息（每年 6 月 20 日、12 月 20 日付息）；未成年人可由法定代理人陪同開戶。
- 來源：
  - NOWnews〈郵局存款計息上限〉（引述郵局官網與郵政儲金匯兌法第 19、20 條）（已開啟）：https://www.nownews.com/news/6751610
  - Money101〈兒童儲蓄帳戶比較：郵局〉（未成年開戶需法定代理人）（僅搜尋摘錄）：https://www.money101.com.tw/blog/兒童儲蓄帳戶-玉山-元大-台新-郵局-國泰世華

### easy-198 社區中秋晚會步驟（未修改）

- 觀念題，順序唯一；沒有具體事實可查。

### easy-199 清真寺（未修改）

- 查證：清真寺是伊斯蘭教的禮拜場所；週五（主麻日）舉行聚禮；穆斯林每天禮拜五次；伊斯蘭飲食禁止豬肉。臺北清真寺每週五聚禮參加者超過百人。
- 來源：
  - 中央社〈臺北清真寺 72 年來首度暫停主麻聚禮〉（2020-03-19，週五聚禮、每週超過百人）（已開啟）：https://www.cna.com.tw/news/ahel/202003190258.aspx
  - Wikipedia「主麻日」（星期五聚禮、每日禮拜五次）（已開啟）：https://zh.wikipedia.org/zh-tw/主麻日
  - Wikipedia「清真食品」（禁止豬肉）（已開啟）：https://zh.wikipedia.org/zh-tw/清真食品
  - 香港科技大學華南研究通訊（主麻聚禮於週五晌禮時間、每天五次禮拜）（僅搜尋摘錄）：https://schina-publication.hkust.edu.hk/sites/default/files/pubs/news-086.03.pdf

### easy-200 本土語文課（未修改）

- 查證：108 課綱國小本土語文為必選，每週一節，學生從閩南語、客家語、原住民族語（另有新住民語文、臺灣手語、閩東語等）中選一種；國語文課照常上。
- 來源：
  - 中央社〈國教新課綱上路 7 國東南亞語可供選修〉（已開啟）：https://www.cna.com.tw/news/ahel/201908260031.aspx
  - 自由時報〈本土語文課綱草案〉（國小本土語文必選、每週一節，選閩南語、客家語、原住民族語、新住民語）（已開啟）：https://news.ltn.com.tw/news/life/breakingnews/3239917

## 知識卡（未列於上方者）

- `easy5-clues`、`easy5-interview`、`easy5-old-new-jobs`、`easy5-transport-change`、`easy5-earth-god`、`easy5-borrow`、`easy5-trash-three`、`easy5-class-officers`、`easy5-library`、`easy5-play`、`easy5-gender`、`easy5-clothes-chain`、`easy5-income`、`easy5-bank`、`easy5-community-event`、`easy5-religion-places`、`easy5-native-languages`、`easy5-volcano`、`easy5-terrace`、`easy5-island-coast`、`easy5-weather-tools`、`easy5-thunder`、`easy5-save-water`、`easy5-heater`、`easy5-map-parts`、`easy5-floor-plan`：內容與對應題目的查證結果一致，未修改。
- `easy5-transport-change` 只寫「小火車（五分車）把田裡的甘蔗運進糖廠」，沒有寫名稱由來，不需修改。

## 需要人工決定

- 本檔沒有移到 `held` 的題目。
- 範圍外發現（未修改，供人工決定）：已定稿的 `data/bank/medium-1.json` 的 `medium-018` 詳解寫「每年五、六月……這時正是梅子成熟的季節，所以叫做梅雨」，與本批 easy-183 修正的問題相同（臺灣青梅 3～5 月成熟，名稱來自中國江南梅子季節）；`data/bank/easy-1.json` 的 `easy-018` 寫法（名字來自中國長江一帶）正確。
- easy-187（瓦斯熱水器安全）的科目為 `geography`、主題為 `climate`；內容偏生活安全，是否改歸類請中立審閱或人工決定（不影響事實正確性）。

## 原始來源核對（2026-10-28）

- 範圍：具體事實原本只有「僅搜尋摘錄」，或只有一個「已開啟」來源的題目，共 22 題。以網頁擷取實際開啟原始頁面核對；PDF 先下載再擷取文字核對（記為「已開啟（PDF）」）。
- 略過：觀念題與推理題（easy-159、160、161、163、164、168、172、173、176、177、178、189、194、196、198）；原本已有兩個以上已開啟來源的題目（easy-167、185、187、193、200）。
- 結果：22 題全部一致，沒有修改題庫；其中 3 題的部分細節仍只有摘錄（見各行）。
- 更正原紀錄：easy-182 引用的 `geopark.forest.gov.tw` 學習單實際是馬祖「南竿遊客中心」學習單，不是野柳地質公園。
- 限制：核對途中本輪網路搜尋次數用完，部分題目只能改用教育部辭典等可直接開啟的頁面。

| 題目 | 網址 | 狀態 | 核對結果 |
| --- | --- | --- | --- |
| easy-162 | https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E6%97%8F%E8%AD%9C（教育部《重編國語辭典修訂本》「族譜」） | 已開啟 | 一致：「記載宗族或家族系統的譜牒」 |
| easy-165 | https://news.tvbs.com.tw/life/802907（TVBS 2017-10-31，三峽打鐵店）；https://news.pts.org.tw/article/409342（原紀錄已開啟） | 已開啟 | 一致：「犁頭、鋤頭、菜刀、柴刀、筍刀，農具與廚房刀具掛滿牆壁」 |
| easy-166 | https://www.foodnext.net/science/machining/paper/4852952746；https://www.foodnext.net/science/machining/paper/5616542963（食力 foodNEXT） | 已開啟 | 一致：鹽醃造成高滲透壓、水活性降到 0.7 以下，細菌一般需 0.85 以上才能生長；去除水分後細菌難以生存。食藥署原始頁面未找到 |
| easy-169 | https://libknowledge.nmns.edu.tw/nmns/lib/PDF/98/258/a-5.pdf（科博館館訊第 258 期，周明〈從福德祠對聯看土地公信仰的神格變遷現象〉） | 已開啟（PDF） | 一致：「在農業社會中，土地公不但是聚落、農業、水溝、墳墓等的守護神」「田頭田尾土地公」 |
| easy-170 | https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E4%BA%BA%E5%8A%9B%E8%BB%8A（教育部辭典「人力車」） | 已開啟 | 一致：「為較早時期載人的交通工具，現已罕見」。The News Lens 交通史文章 403，戰後被三輪車取代的細節仍只有摘錄，卡片提示未寫年代，不影響 |
| easy-171 | https://service.taipower.com.tw/Collection/media/xwkpnedn/百年前電器圖文包-純文字.pdf（台電〈一百年前臺灣人已經在使用了電器？〉） | 已開啟（PDF） | 一致：「日治後期，電燈的家戶普及率已達到 35% - 40% 左右」（引吳政憲研究） |
| easy-174 | https://laws.gov.taipei/law/LawDecision/ContentExport?id=921-021（臺北市法規解釋）；https://dga.nttu.edu.tw/var/file/8/1008/attach/36/pta_57266_2995897_61097.pdf（臺東大學垃圾分類說明） | 已開啟（PDF）；口罩仍只有原紀錄的 NOWnews（已開啟） | 一致：堆肥廚餘含「水果外皮像西瓜皮、橘子皮、柚子皮、柳丁皮等，惟不含榴槤皮、椰子殼」；一般垃圾含「衛生紙」 |
| easy-175 | https://www.hgsh.hc.edu.tw/view-doc/17/114-1衛生股長幹部手冊.pdf（新竹縣湖口高中〈衛生股長幹部手冊〉） | 已開啟（PDF）；班長、總務股長仍只有摘錄 | 一致：衛生股長「分配本學期內、外打掃區域同學名單」、督導打掃與整潔評分。東海附中組織通則 404；提示已寫「通常是班長的工作」，不影響 |
| easy-179 | https://www.taiwan.net.tw/m1.aspx?id=738&sno=0001016（原紀錄已開啟）；https://zh.wikipedia.org/zh-tw/大屯火山群 | 已開啟 | 一致：大屯火山群有噴氣孔氣體與溫泉，顯示地下仍有岩漿庫，大部分位於陽明山國家公園 |
| easy-180 | https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E6%A2%AF%E7%94%B0（教育部辭典「梯田」）；https://www.moa.gov.tw/ws.php?id=2507987（農業部刊物〈水梯田〉，2017/12） | 已開啟；已開啟（PDF） | 一致：「開墾成階梯狀……其間砌築矮埂相隔，以利耕作和蓄水」；「人工引水灌溉的水梯田，長年蓄水」 |
| easy-181 | https://dict.revised.moe.edu.tw/dictView.jsp?ID=42762（「島嶼」）；https://dict.revised.moe.edu.tw/dictView.jsp?ID=16704（「半島」） | 已開啟 | 一致：島嶼「四周被水圍繞的小面積陸地」；半島「三面臨海，一面連接大陸的地形」 |
| easy-182 | https://en.wikipedia.org/wiki/Tafoni；https://geopark.forest.gov.tw/File/Userfiles/0000000001/files/%e5%ad%b8%e7%bf%92%e5%96%ae_%e5%8d%97%e7%ab%bf%e9%81%8a%e5%ae%a2%e4%b8%ad%e5%bf%83.pdf（林業及自然保育署，南竿遊客中心學習單） | 已開啟；已開啟（PDF） | 一致：蜂窩狀風化（tafoni）以「salt weathering」為主要成因，沿海地區鹽分作用明顯；學習單寫「花岡岩海岸被海水侵蝕」「海岸風化侵蝕」。詳解的海浪、沙石磨擦與鹽分剝落都有依據 |
| easy-183 | https://www.moa.gov.tw/ws.php?id=2515587（農業部《農政與農情》第 385 期〈國產青梅〉）；https://zh.wikipedia.org/zh-tw/梅雨；https://www.cwa.gov.tw/V8/C/K/Encyclopedia/typhoon/typhoon-09.txt、typhoon-05.txt（氣象署《颱風百問》） | 已開啟（PDF）；已開啟 | 一致：「3 月下旬～5 月中旬是青梅產季，集中在清明節前後」；梅雨因「江南梅子黃熟季節而得名」，又稱「霉雨」；颱風眼內「既無狂風亦無暴雨」；北半球颱風「多發生在 7、8、9、10 月」。侵臺颱風以 8 月最多的統計仍只有天下雜誌摘錄（403），卡片提示只寫「七、八、九月最常聽到它的警報」，不影響 |
| easy-184 | https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E9%9B%A8%E9%87%8F%E5%99%A8（教育部辭典「雨量器」）；https://aat.teldap.tw/AATFullDisplay/300201543（國家文化記憶庫 AAT「雨量器」） | 已開啟 | 一致：「用以觀測降水量的儀器……頂端開口的容器，上有刻度……也稱為『雨量計』」 |
| easy-186 | https://www.nycu.edu.tw/userfiles/gach/files/20231129105631939.pdf；https://disaster.moe.edu.tw/MOE_FILE/daolpU/teachingMaterial/2020/TM20200512103357224/節水36計.pdf（〈節水 36 計〉） | 已開啟（PDF） | 一致：「洗澡採用淋浴」「洗菜水、洗衣水、洗碗水及洗澡水等可用來洗車、擦洗地板或沖馬桶」。文件把澆花列在雨水回收的用途，沒有直接寫「洗菜水澆花」；題目考的是「用過的水再利用」，詳解也寫「澆花或沖馬桶」，未修改 |
| easy-188 | https://pedia.cloud.edu.tw/Entry/Detail/?title=%E5%9C%96%E5%90%8D（教育百科「圖名」，引《測繪學辭典》） | 已開啟 | 一致：「地圖圖幅之名稱。能提供讀圖者有關該幅地圖主題或區域之訊息」 |
| easy-190 | https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E6%8C%87%E5%8D%97%E9%87%9D（教育部辭典「指南針」）；https://www.hko.gov.hk/tc/gts/equake/qe_geomagnetism.htm（原紀錄已開啟） | 已開啟 | 一致：「一種利用磁針常指向南北的特性所製的儀器」 |
| easy-191 | https://aat.teldap.tw/AATFullDisplay/300117359（AAT「俯視圖（平面圖）」）；https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E5%B9%B3%E9%9D%A2%E5%9C%96（教育部辭典「平面圖」） | 已開啟 | 一致：「由建築結構或場址正上方觀視描繪或攝製出的圖景」 |
| easy-192 | https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0050046&flno=53（全國法規資料庫《身心障礙者權益保障法》第 53 條） | 已開啟 | 一致：「應設置供身心障礙者或有其他實際需要者優先乘坐之優先席」，比率不低於總座位數 15% |
| easy-195 | https://statementdog.com/taiex/10-textile-industry（財報狗〈紡織產業〉） | 已開啟 | 一致：棉花等天然纖維為上游原料 → 紡紗 → 織布 → 染整 → 裁製縫合為成衣（非官方來源，未找到官方頁面） |
| easy-197 | https://www.money101.com.tw/blog/兒童儲蓄帳戶-玉山-元大-台新-郵局-國泰世華（Money101）；https://www.nownews.com/news/6751610（原紀錄已開啟） | 已開啟；利息仍只有一個已開啟來源 | 一致：郵局提供兒童帳戶，「7 歲以上需與父母一同到櫃檯辦理」，與題目「在家人陪同下」一致。中華郵政官方頁面未找到 |
| easy-199 | https://dict.revised.moe.edu.tw/search.jsp?md=1&word=%E6%B8%85%E7%9C%9F%E5%AF%BA（教育部辭典「清真寺」）；https://schina-publication.hkust.edu.hk/sites/default/files/pubs/news-086.03.pdf（香港科技大學《華南研究資料中心通訊》） | 已開啟；已開啟（PDF） | 一致：清真寺是「回教徒禮拜的場所」，「每日五次的禮拜」；「伊斯蘭教逢星期五的主麻聚禮」參與人數較多 |
