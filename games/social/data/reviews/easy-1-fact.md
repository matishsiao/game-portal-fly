# easy-1 事實審閱紀錄

- 審閱檔案：`data/draft/easy-1.json` → `data/checked/easy-1.json`
- 檢查題數：30 題、16 張知識卡
- 修正數：9 題（easy-003、005、006、007、010、017、018、019、027）與 2 張知識卡（`easy-life-then-now`、`easy-rivers`，隨 easy-010、017 同步修改）
- 移到 `held`：0 題
- 驗證：`node scripts/validate-bank.mjs data/checked/easy-1.json` 通過（30 題、16 張知識卡）

## 作法

- 先只看題目與選項（不看 `answer`／`items` 順序／`bin`）自行作答，再對照答案：30 題的自答結果全部與答案一致。
- 自答時發現的問題：easy-010「寫信和遠方的親人聯絡」在現代仍常見，分類不唯一（已修正）；easy-027 是單純的除法計算，偏數學科（已改寫）。
- 逐題查證題目、選項、提示、詳解與知識卡，每題至少兩個來源。

## 逐題查證

### easy-001 傳統節日依農曆排序（未修改）

- 春節一月一日、元宵節一月十五日、端午節五月五日、中秋節八月十五日。
- 來源：
  - 紀念日及節日實施條例第 5 條（臺中市政府公告 PDF）：https://tcrt.taichung.gov.tw/df_ufiles/030/紀念日及節日實施條例.pdf
  - 公共電視新聞網，國定假日修法報導（節日日期表）：https://news.pts.org.tw/article/720790

### easy-002 「坑」字地名（未修改）

- 「坑」在台語指山谷、山溝；「埔」泛指平坦的地方；「崙」指小山丘（山崙、崙仔、沙崙）。深坑因群山圍繞、地勢低窪如坑底而得名。
- 來源：
  - 教育部《臺灣台語常用詞辭典》「坑」用例（坑崁＝山谷、坑溝＝山溝）：https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_ku&tsha=坑
  - 同辭典「埔」（泛指平坦的地方）：https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_su&tsha=埔
  - 同辭典「崙」相關詞目（崙仔、山崙、沙崙）：https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_su&tsha=崙
  - 農業部《農政與農情》〈深坑巡古 農情悠遊〉：https://www.moa.gov.tw/ws.php?id=6003
- 備註：有教材把「坑」解為海岸灣澳，屬少數說法；以辭典與地方資料為準，答案「山谷或低窪的地方」正確。

### easy-003 「厝」字地名（修正提示）

- 「厝」台語讀 tshù，意思是房屋；姓氏＋厝的地名多來自同姓聚居（例如臺南西港的劉厝、淡水忠寮的李厝）。
- 來源：
  - 教育部《臺灣台語常用詞辭典》「厝」：https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_su&tsha=厝
  - 桃園市新屋區公所地名介紹（以厝、庄、圍等為聚落地名）：https://www.xinwu.tycg.gov.tw/cp.aspx?n=6659
  - 臺南市政府地名文史資料（劉厝由劉姓族人移入而得名）：https://w3fs.tainan.gov.tw/001/Upload/205/attachment/22143/7773676/09.pdf
- 修正：
  - 原本：選項「那裡從前有一座大廟」的提示「廟宇的地名常有「宮」「廟」等字，「厝」是一般人住的房子。」
  - 修改：「題目說「厝」是一般人住的房子，不是拜神的廟喔。」
  - 原因：「廟宇地名常有「宮」字」無法以可靠來源確認為通則，改成只依題目給的定義說明。

### easy-004 保存老街與古蹟（未修改）

- 屬觀念題；古蹟修復後再利用（展覽館、廟宇仍使用）的敘述正確。
- 來源：
  - 文化資產保存法（全國法規資料庫）：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=H0170001
  - 交通部觀光署台灣觀光資訊網（臺北水道水源地等古蹟再利用為博物館）：https://www.taiwan.net.tw/m1.aspx?id=9988&sNo=0001090

### easy-005 水運市街（修正題目與詳解）

- 淡水（滬尾）因船隻改停水深背風的滬尾而興起，開港後成為臺灣最大貿易港，後因淤積由基隆取代；鹿港為「一府二鹿三艋舺」的「鹿」，清代中部重要貿易港，後因港口淤塞沒落。兩地都適合作為例子。
- 來源：
  - 新北市政府文化局，張建隆〈淡水港史話〉：https://www.culture.ntpc.gov.tw/files/file_pool/1/0G258614562811657139/36%E5%BC%B5%E5%BB%BA%E9%9A%86%E3%80%88%E6%B7%A1%E6%B0%B4%E6%B8%AF%E5%8F%B2%E8%A9%B1%EF%BC%9A%E5%BE%9E%E6%97%A9%E6%9C%9F%E6%B7%A1%E6%B0%B4%E6%B8%AF%E5%88%B0%E6%BB%AC%E5%B0%BE%E8%A8%AD%E9%97%9C%E9%96%8B%E5%9F%A0%E3%80%89.pdf
  - 交通部觀光署台灣觀光資訊網（淡水開港通商）：https://www.taiwan.net.tw/m1.aspx?id=19&sNo=0001016
  - 彰化縣教育網路中心公開課程資料（鹿港因港口淤塞、貿易衰落）：https://www.openclass.chc.edu.tw/years/113/plans/84934/reviews/課程資料.pdf
  - 綠色和平〈鹿港老街〉報導（清治時期河港風貌）：https://www.greenpeace.org/taiwan/?p=36586
- 修正：
  - 原本題目：「很多老街（例如淡水、鹿港）都在河邊或海邊。為什麼……」
  - 修改：「淡水、鹿港的老街，從前都在船隻停靠的港口附近。為什麼……」
  - 原因：鹿港因淤積，老街現在已不在海邊，原句會變成錯的現況描述；改寫成「從前」的事實。詳解同步補上兩地例子與「港口淤積」的沒落原因。

### easy-006 端午節習俗（修正詳解）

- 端午節農曆五月五日，划龍舟、吃粽子、掛艾草菖蒲；划龍舟、吃粽子的由來傳說與屈原有關，掛艾草菖蒲是驅蟲避邪的習俗。
- 來源：
  - 紀念日及節日實施條例第 5 條（端午節：農曆五月五日）：https://tcrt.taichung.gov.tw/df_ufiles/030/紀念日及節日實施條例.pdf
  - 教育部全球華文網（僑務委員會）端午節介紹：https://www.huayuworld.org/Overseas/PrintReport?PID=792
  - TVBS 新聞端午習俗整理（引述國史館說法，屈原、驅疫等多種由來）：https://news.tvbs.com.tw/life/2883057
- 修正：
  - 原本：「……傳說這些習俗和紀念古代詩人屈原有關。」
  - 修改：「……傳說划龍舟、吃粽子和紀念古代詩人屈原有關；掛艾草、菖蒲則是從前人們用來驅蟲、避邪的習俗。」
  - 原因：掛艾草、菖蒲與屈原傳說無關，原句把所有習俗都歸給屈原。

### easy-007 交通建設排序（修正解題重點）

- 基隆到臺北鐵路 1891 年（光緒 17 年，清帝國統治時期）完成；中山高速公路 1978 年 10 月全線通車；臺北捷運木柵線 1996 年 3 月 28 日通車（第一條路線）；臺灣高鐵 2007 年 1 月 5 日通車。`years` 正確且遞增。
- 來源：
  - 東海大學圖書館館刊，周志仁論文（光緒 17 年完成基隆到臺北的鐵路，臺北至新竹 1893 年）：https://dcollection.lib.thu.edu.tw/wp-content/uploads/2025/09/01-館刊73期1-47周志仁.pdf
  - nippon.com〈臺灣鐵道〉（1891 年基隆－臺北間第一條鐵路通行）：https://www.nippon.com/hk/japan-topics/c10002/
  - 關鍵評論網，中山高 60 年 8 月動工、67 年 10 月全線通車：https://www.thenewslens.com/article/112850
  - 中央社，1996 年 3 月 28 日木柵線通車：https://www.cna.com.tw/culture/article/20200424w002
  - 臺北市政府捷運工程局資料（木柵線 1996 年 3 月 28 日正式營運）：https://www-ws.gov.taipei/001/Upload/388/relfile/19519/9051497/764bcd47-f366-4a99-a2b1-6d64229ef0b3.pdf
  - 遠見雜誌，高鐵 2007 年 1 月 5 日通車：https://www.gvm.com.tw/article/77460
- 備註：基隆至臺北段的通車日期各來源略有出入（1891 年 10 月或分段通車），但年份皆為 1891 年，且與其他項目相差至少 17 年，不影響排序。
- 修正：
  - 原本 `keys[1]`：「捷運在城市裡跑，高鐵跨過好多縣市、速度最快。想一想爸爸媽媽小時候，哪一種已經有了？」
  - 修改：「捷運只在一個城市裡跑，高鐵跨過好多縣市、速度最快。這兩種交通工具，哪一種比較晚才出現？」
  - 原因：玩家父母的年齡差距大（小時候可能在 1996 年前或後），這個提示無法得出唯一判斷。

### easy-008 鐵路與車站街區（未修改）

- 來源：
  - 工商時報，臺北車站起源（1891 年大稻埕臺北停車場）：https://www.ctee.com.tw/news/20210224700230-431001
  - nippon.com〈臺灣鐵道〉：https://www.nippon.com/hk/japan-topics/c10002/

### easy-009 沒有自來水時取水（未修改）

- 來源：
  - 文化部文化資產主題資料〈臺北水道水源地〉（清末以前取用河水、鑿井取地下水）：https://themefile.culture.tw/file/2019-03-06/8323b600-4923-4f21-9410-98c0b40e7c40/2.%E5%8F%B0%E5%8C%97%E6%B0%B4%E9%81%93%E6%B0%B4%E6%BA%90%E5%9C%B0.pdf
  - 臺北市政府教育局資料（臺北水道 1909 年前後開始供水）：https://tpomec.tp.edu.tw/archive/file/N1-msLTljZrppKgg5rC05L2g546p5tv2kwieo.pdf

### easy-010 生活今昔分類（修正卡片、解題重點、詳解與知識卡）

- 臺灣第一座近代水力發電所龜山發電所 1905 年完工，先供臺北市街照明，電燈之後才逐漸擴散到各城市；一百多年前很多家庭還沒有電。
- 來源：
  - 文化部文化資產資料（新店溪水力發電設施群，龜山發電所）：https://themefile.culture.tw/file/2019-03-06/89c7ff4f-5cb7-4a6e-8fae-64700fe34e63/4.%E6%96%B0%E5%BA%97%E6%BA%AA%E6%B0%B4%E5%8A%9B%E7%99%BC%E9%9B%BB%E8%A8%AD%E6%96%BD%E7%BE%A4.pdf
  - 台灣電力公司《源雜誌》第 118 期：https://dr.taipower.com.tw/mag/yuan/118/EP118.pdf
  - 遠見〈微笑台灣〉電燈普及報導：https://smiletaiwan.cw.com.tw/article/7151
- 修正：
  - 原本卡片：`{ "text": "寫信和遠方的親人聯絡", "bin": 0, "hint": "要等好幾天才收得到消息，那時候還沒有電話。" }`
  - 修改：`{ "text": "到河邊洗衣服", "bin": 0, "hint": "要提著衣服走到有水的地方，那時候家裡還沒有自來水和洗衣機。" }`
  - 原因：寫信在現代仍常見，分類不唯一；改為與 easy-009、知識卡一致、明確屬於從前的生活。
  - 原本 `keys[1]`：「一百多年前大部分家庭還沒有電，……」→ 修改：「一百多年前，很多家庭還沒有電和自來水，……」。原因：「大部分」的比例無法以來源確認，改為可確認的說法。
  - 詳解與知識卡 `easy-life-then-now` 的「寫信聯絡」同步改為「到河邊洗衣服」。
- 「一百多年前」：約 1920 年以前，電力剛開始供應都市，用語合適。

### easy-011 面北時右手邊（未修改）

- 來源：
  - 臺北市國小社會四上重點整理（家鄉地圖小世界，方位）：https://class2.hlps.tp.edu.tw/33/up_files/dl/01-112國小社會4上重點整理1-2教用.doc
  - 國立臺北教育大學〈方位快易通〉：https://fune.ntue.edu.tw/uploads/result/file/八年級方位快易通.pdf

### easy-012 沒有指北針時的方位（未修改）

- 地圖慣例以北為上，沒有方向標時一般視為上北下南。
- 來源：
  - 臺北市國小社會四上重點整理（地圖上方通常為北方）：https://class2.hlps.tp.edu.tw/33/up_files/dl/01-112國小社會4上重點整理1-2教用.doc
  - 法源法律網收錄之地圖設計論文（以北為上為共同慣例，指北標非必要）：https://lawdata.com.tw/tw/detail.aspx?no=475668

### easy-013 圖例（未修改）

- 來源：
  - 教育部《重編國語辭典修訂本》「圖例」：地理或統計等圖上所附有各種符號、標記的說明，一般位於圖的角落：https://dict.revised.moe.edu.tw/search.jsp?md=1&word=圖例
  - 彰化縣公開課程資料（地圖要素：圖名、圖例、比例尺、方位）：https://www.openclass.chc.edu.tw/years/112/plans/68992/reviews/課程資料.pdf

### easy-014 校園平面圖（未修改）

- 來源：
  - 彰化縣公開課程資料（地圖要素、比例尺與範圍）：https://www.openclass.chc.edu.tw/years/111/plans/48158/reviews/課程資料.pdf
  - 臺北市國小社會四上重點整理（平面圖）：https://class2.hlps.tp.edu.tw/33/up_files/dl/01-112國小社會4上重點整理1-2教用.doc

### easy-015 盆地（未修改）

- 來源：
  - 教育部《重編國語辭典修訂本》「盆地」：四周被高山或高地圍繞，中間相對低緩的地形：https://dict.revised.moe.edu.tw/dictView.jsp?ID=23961
  - 同辭典「臺地」：邊緣為陡坡的廣闊平坦的高地（誘答提示正確）：https://dict.revised.moe.edu.tw/dictView.jsp?ID=49584
  - 農業部〈深坑巡古〉（臺北盆地）：https://www.moa.gov.tw/ws.php?id=6003

### easy-016 平原與稻田城鎮（未修改）

- 來源：
  - 中央氣象署氣候百問〈臺灣一年的降雨分布特徵〉（迎風面山區雨量較多）：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2_list.html
  - 教育部《重編國語辭典修訂本》「盆地」「平原」詞條（平原 ID 26020）：https://dict.revised.moe.edu.tw/dictView.jsp?ID=26020

### easy-017 河流排序（修正項目、解題重點、詳解與知識卡）

- 源頭 → 山谷 → 平原 → 出海口的順序正確，只有一種合理答案。
- 來源：
  - 美國地質調查所（USGS）〈Downstream change of velocity in rivers〉：https://www.usgs.gov/publications/downstream-change-velocity-rivers
  - 日本國土交通省北海道開發局十勝川資料（上、中、下游特徵）：https://www.hkd.mlit.go.jp/ob/tisui/kds/pamphlet/tabi/pdf/01-04-column-jouchukaryu-p065.pdf
- 修正：
  - 原本項目：「流過平原、又寬又慢的河段」→ 修改：「流過平原、河面寬廣的河段」。
  - 原本 `keys[1]`：「比一比：山谷和平原，哪一個比較高？河水在哪裡流得比較急？」→ 修改：「比一比：山谷和平原，哪一個比較高？河水會先流過哪一個？」
  - 詳解與知識卡 `easy-rivers`：刪除「水流變慢」，保留「地勢平緩、河面變寬」。
  - 原因：USGS 實測研究指出河流平均流速往下游不一定變慢（常略增），「下游水流慢」屬簡化成可能錯的說法；坡度變緩、河面變寬則可確認。上游「流得很急」（湍急）保留。

### easy-018 梅雨（修正提示、解題重點與詳解）

- 臺灣梅雨季約 5 月中到 6 月中，是冬季東北季風轉換為夏季西南季風的時期，滯留鋒面帶來連續降雨；「梅雨」得名於長江中下游梅子成熟時期的連綿降雨。
- 來源：
  - 中央氣象署氣候百問 22〈梅雨是臺灣獨有的天氣現象嗎？〉：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate3_list.html（內文：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate3-04.txt）
  - 中央氣象署氣候百問 15〈臺灣一年的降雨分布特徵〉（5 至 6 月梅雨）：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2-08.txt
  - 教育部《重編國語辭典修訂本》「梅雨」：https://dict.revised.moe.edu.tw/dictView.jsp?ID=28753
- 修正：
  - 原本詳解：「……這就是梅雨，因為剛好是梅子成熟的時候而得名。」→ 修改：「……這就是梅雨。「梅雨」這個名字來自中國長江一帶，那裡下這種雨時正好是梅子成熟的季節。」原因：臺灣的梅子多在春天採收，不在五、六月成熟；名稱來自長江流域。
  - 原本 `keys[0]`：「這種雨下的時候，剛好是某種水果成熟的季節。」→ 修改：「這種雨每年在春天快結束、夏天快開始的時候出現，常常一下就好幾天。」原因同上。
  - 原本 `keys[1]` 改為：「這種雨下的時候，衣服很難晾乾、東西容易發霉。它的名字和一種酸酸的水果有關，是哪一種？」
  - 選項「颱風雨」提示：「不是五、六月連續的小雨」→「不是五、六月連續好幾天的雨」。原因：梅雨常伴隨豪大雨，不是「小雨」。

### easy-019 颱風季節（修正提示）

- 1991～2020 年平均每年侵臺颱風 3.2 個，7 至 10 月占約 91%；長期統計以 8 月最多、7 月與 9 月次之；氣象署列「夏季與秋季的颱風」為主要天氣災害。
- 來源：
  - 中央氣象署氣候百問 38〈侵臺颱風有幾個〉：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate5_list.html（內文：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate5-01.txt）
  - 中央氣象署氣候百問 10〈影響臺灣的主要天氣災害〉：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2-03.txt
  - 臺中市政府主計處颱風統計分析（侵臺月份 7 至 9 月占八成二）：https://www.dbas.taichung.gov.tw/media/245104/81413343071.pdf
- 修正：
  - 原本選項「冬季」提示：「冬天吹的是又冷又乾的東北季風，很少有颱風。」
  - 修改：「冬天吹的是寒冷的東北季風，很少有颱風。」
  - 原因：東北季風在北部、東部迎風面帶來降雨（氣象署氣候百問 15），「又乾」錯誤，也與 easy-020、知識卡 `easy-seasons` 矛盾。

### easy-020 季節與生活分類（未修改）

- 「去海邊玩水」歸夏天：兩個類別只有夏天與冬天，玩水只會屬於夏天，答案唯一。西北雨（午後雷陣雨）屬夏季；冬季有寒流、東北季風使北部濕冷多雨。
- 來源：
  - 中央氣象署氣候百問 10〈主要天氣災害〉（冬季寒流、午後雷陣雨）：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2-03.txt
  - 中央氣象署氣候百問 15（東北季風迎風面北部、東部的冬季降雨）：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2-08.txt
  - 中央氣象署氣候百問 9〈臺灣的四季怎麼劃分〉：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2-02.txt

### easy-021 分擔家事（未修改）

- 觀念題，無爭議事實。
- 來源（觀念題，只查證屬於課綱學習內容）：
  - 國家教育研究院〈社會領域課程手冊〉：https://www.naer.edu.tw/upload/1/16/doc/2026/社會領域課程手冊（定稿版）.pdf
  - 國家教育研究院課綱資訊：https://www.naer.edu.tw/PageCourse/projectDetail/RP000000001024

### easy-022 班級公約（未修改）

- 來源：
  - 國家教育研究院〈社會領域課程手冊〉：https://www.naer.edu.tw/upload/1/16/doc/2026/社會領域課程手冊（定稿版）.pdf
  - 衛生福利部 CRC 資訊網，兒童權利公約第 12 條表意權一般性意見：https://crc.sfaa.gov.tw/

### easy-023 志工（未修改）

- 志願服務法第 3 條：民眾出於自由意志、非基於義務或法律責任、不以獲取報酬為目的的輔助性服務。
- 來源：
  - 全國法規資料庫《志願服務法》：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0050131
  - 衛生福利部澎湖醫院公告之志願服務法條文：https://phsch.mohw.gov.tw/df_ufiles/069/%E5%BF%97%E9%A1%98%E6%9C%8D%E5%8B%99%E6%B3%95.pdf

### easy-024 班會步驟排序（未修改）

- 主席說明議題 → 討論（發表意見）→ 表決 → 執行決議，符合內政部 1965 年頒布、多數學校與團體準用的《會議規範》程序；只有一種合理順序。
- 來源：
  - 司法院憲法法庭文件（各學校、團體多準用民國 54 年內政部頒布之會議規範）：https://cons.judicial.gov.tw/download/download.aspx?id=494016
  - 文藻外語大學議事規則（依會議規範訂定討論與表決程序）：https://c009.wzu.edu.tw/datas/upload/files/%E6%B3%95%E8%A6%8F%E4%BA%8C%E7%B5%84/%E6%96%87%E8%97%BB%E5%A4%96%E8%AA%9E%E5%A4%A7%E5%AD%B8%E8%AD%B0%E4%BA%8B%E8%A6%8F%E5%89%871150821%E6%A0%A1%E9%95%B7%E5%88%A4%E8%A1%8C.pdf

### easy-025 表達意見（未修改）

- 來源：
  - 衛生福利部社會及家庭署 CRC 資訊網（第 12 條表意權）：https://crc.sfaa.gov.tw/
  - 新北市政府社會局〈兒童權利公約簡介〉：https://www.sw.ntpc.gov.tw/userfiles/1102300/files/新北市政府社會局兒童權利公約(CRC)簡介與宣導.pdf

### easy-026 權利與責任分類（未修改）

- 權利四張卡對應兒童權利公約：第 31 條休息與遊戲、第 12 條表意、第 19 條免受傷害、第 24 條健康與醫療；責任三張卡不屬於公約列舉的兒童權利，分類唯一。
- 來源：
  - 衛生福利部社會及家庭署 CRC 資訊網：https://crc.sfaa.gov.tw/
  - 衛生福利部兒童權利公約專區：https://www.mohw.gov.tw/fp-16-74119-1.html
  - 新北市政府社會局〈兒童權利公約簡介〉：https://www.sw.ntpc.gov.tw/userfiles/1102300/files/新北市政府社會局兒童權利公約(CRC)簡介與宣導.pdf

### easy-027 存錢（改寫為儲蓄觀念題）

- 來源：
  - 國立臺灣師範大學學位論文（金管會《個人理財－國小篇》與國小理財教育）：https://etds.lib.ntnu.edu.tw/thesis/detail/354793e69c0458497b8af6dabd969f75
  - 臺北市南門國中「理財智慧王」課程（從零用錢規劃與儲蓄）：https://www.nmjh.tp.edu.tw/wp-content/uploads/doc/nmjh332/113七年級彈性學習課程(理財智慧王).pdf
- 修正：
  - 原本題目：「小明想買一本 300 元的繪本。他每星期存下 50 元零用錢，至少要存幾個星期才夠？」選項「5 個星期／6 個星期／3 個星期／30 個星期」，答案 6 個星期。
  - 修改題目：「小明想買一本 300 元的繪本，可是身上的零用錢不夠。下面哪一個做法，最能幫他用自己的錢買到繪本？」選項「跟同學借錢，今天就買／每週先存下一部分零用錢（正確）／把零用錢都拿去買零食／吵著要爸媽馬上買給他」，答案索引維持 1；提示、解題重點、詳解同步改寫，詳解保留「每星期存 50 元，存 6 個星期就有 300 元」的例子。
  - 原因：原題只考除法，屬數學能力，不是社會科的儲蓄概念；改為考「為目標儲蓄、先存一部分」的觀念，仍連到知識卡 `easy-needs-wants`。

### easy-028 需要與想要分類（未修改）

- 來源：
  - 國立臺灣師範大學學位論文（國小理財教育，需要與想要）：https://etds.lib.ntnu.edu.tw/thesis/detail/354793e69c0458497b8af6dabd969f75
  - 國家教育研究院〈社會領域課程手冊〉：https://www.naer.edu.tw/upload/1/16/doc/2026/社會領域課程手冊（定稿版）.pdf

### easy-029 守望相助隊（未修改）

- 依內政部 1998 年「守望相助再出發推行方案」，運用民間人力協助維護社區居民安全，由居民組成巡守。
- 來源：
  - 新北市政府警察局守望相助隊管理計畫：https://www.police.ntpc.gov.tw/dl-30415-00bf95c5-8d3e-49cd-816a-252df9a2730c.html
  - 臺北市法規查詢系統（區公所輔導成立守望相助巡守組織）：https://laws.gov.taipei/law/LawSearch/LawPrint/FL002157?type=0

### easy-030 多元文化美食節（未修改）

- 來源：
  - 內政部移民署新聞（新住民多元文化共融體驗活動，以美食認識不同國家風俗）：https://www.immigration.gov.tw/5385/7229/7238/414414/
  - 內政部移民署新聞（國際移民日多元文化活動）：https://www.immigration.gov.tw/5385/7229/7238/339541/cp_news

## 知識卡

| 知識卡 | 結果 | 依據 |
| --- | --- | --- |
| `easy-festivals` | 正確，未修改 | 紀念日及節日實施條例第 5 條 |
| `easy-place-names` | 正確，未修改 | 教育部台語辭典（坑、埔、崙、厝），見 easy-002、003 |
| `easy-heritage` | 正確，未修改 | 見 easy-004、005 |
| `easy-transport` | 正確，未修改（1891 年） | 見 easy-007 |
| `easy-life-then-now` | 修正：「寫信聯絡」改為「常到河邊洗衣服」 | 與 easy-010 一致 |
| `easy-directions` | 正確，未修改 | 見 easy-011、012 |
| `easy-map-reading` | 正確，未修改 | 見 easy-013、014 |
| `easy-landforms` | 正確，未修改 | 見 easy-015、016 |
| `easy-rivers` | 修正：刪除「水流變慢」 | 見 easy-017 |
| `easy-rain-typhoon` | 正確，未修改（五、六月梅雨；颱風夏秋、七到九月最多） | 見 easy-018、019 |
| `easy-seasons` | 正確，未修改 | 見 easy-020 |
| `easy-family-class` | 正確，未修改 | 見 easy-021、022、024 |
| `easy-community` | 正確，未修改 | 見 easy-023、029 |
| `easy-child-rights` | 正確，未修改 | 見 easy-025、026 |
| `easy-needs-wants` | 正確，未修改 | 見 easy-027、028 |
| `easy-diverse-culture` | 正確，未修改 | 見 easy-030 |

## 需要人工決定

- 無移到 `held` 的題目。
- 供參考（不影響上架）：
  - easy-012 依「沒有指北針時上北下南」的慣例作答，這是國小教材的通用說法，但地圖學上屬慣例而非規定；如希望更嚴謹，可改成「地圖右上角的指北針指向上方」。
  - easy-017 上游「流得很急」保留國小教材常見的描述（湍急），已刪除「下游水流慢」；若中立審閱者認為上游描述也需更保守，可改為「坡度很陡的河段」。
  - easy-027 已由計算題改寫為儲蓄觀念題，請確認符合題目配額（`economy` 主題仍為 2 題）。

## 原始來源核對（2026-10-28）

- 原紀錄沒有區分哪些來源實際開啟、哪些只看搜尋摘錄，本輪對有具體事實（日期、年份、法條、詞義、統計、制度）的題目逐題重新開啟原始頁面；觀念題（easy-004、008、011、012、014、016、017、021、022、025、027、028、030）略過。
- PDF 一律下載後以本機 PDFKit 擷取文字核對；網頁以 WebFetch 開啟。
- 結果：核對 17 題，全部一致，未修改題目與知識卡。

| 題目 | 來源（網址） | 狀態 | 核對結果 |
| --- | --- | --- | --- |
| easy-001 | 全國法規資料庫《紀念日及節日實施條例》第 5 條：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0020095 ；總統府公報第 7790 號（PDF）：https://www.ttsh.tp.edu.tw/wp-content/uploads/doc/g171/1140528%20制定紀念日及節日實施條例(總統府公報).pdf | 已開啟 | 一致：春節農曆一月一日、元宵節一月十五日、端午節五月五日、中秋節八月十五日。原紀錄引用的臺中市 PDF 改以法規資料庫為準。 |
| easy-002 | 教育部《臺灣台語常用詞辭典》「坑」：https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_su&tsha=坑 | 已開啟 | 一致：「坑」為「山谷、溪谷」，「坑溝」為山間水溝；誘答「埔」「崙」見下列辭典。 |
| easy-003 | 同辭典「厝」：https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_su&tsha=厝 ；臺南市政府〈劉厝里沿革〉（PDF）：https://w3fs.tainan.gov.tw/001/Upload/205/attachment/22143/7773676/09.pdf | 已開啟 | 一致：「厝」為「房屋」；劉厝「由先民劉登魁來此開基建厝，因而稱為劉厝」，與「姓氏＋厝」來自家族居住相符。 |
| easy-005 | 中央研究院臺灣史研究所檔案館〈「二鹿」：在鹿港深耕的郊商〉：https://archives.ith.sinica.edu.tw/collections_con.php?no=151 ；國家文化記憶庫〈褪色的淡水港〉：https://tcmb.culture.tw/zh-tw/detail?id=597056&indexCode=Culture_Object ；交通部觀光署〈淡水〉：https://www.taiwan.net.tw/m1.aspx?id=19&sNo=0001016 | 已開啟 | 一致：鹿港 1784 年開放與泉州通商，後因「港口泥沙淤積」與縱貫鐵路未經過而沒落；淡水「隨著港口泥沙淤積，加上 1899 年基隆港築港工程等原因」逐漸沒落；淡水 1858 年開港通商。詳解「後來港口淤積、交通方式改變」正確。 |
| easy-006 | 教育百科「端午節」（教育部辭典）：https://pedia.cloud.edu.tw/Entry/Detail/?title=%E7%AB%AF%E5%8D%88%E7%AF%80 ；交通部觀光署兒童網〈端午節〉：https://child.taiwan.net.tw/0000000050.htm ；農業部農業知識入口網〈防五毒天然艾草香〉：https://kmweb.moa.gov.tw/theme_data.php?theme=news&sub_theme=variety&id=54767 | 已開啟 | 一致：粽子、龍舟競渡相傳紀念屈原；門上插艾草、菖蒲「有避邪的效果」，農業部文章說明插菖蒲、艾草因應氣候、驅五毒。 |
| easy-007 | 交通部高速公路局〈從第一代國道到第三代國道〉：https://www.freeway.gov.tw/Publish.aspx?cnid=3005 ；臺北大眾捷運公司〈大事紀〉：https://www.metro.taipei/cp.aspx?n=B27E7BC8CBBCDA61 ；台灣高鐵公司簡介：https://www.thsrc.com.tw/corp/2ddb06c3-c9d5-4b6f-a580-40f887b1a01f ；國家文化記憶庫〈劉銘傳〉：https://tcmb.culture.tw/zh-tw/detail?indexCode=Culture_People&id=259191 | 已開啟 | 一致：中山高民國 67 年（1978）通車；木柵線 85.03.28（1996）通車；高鐵 2007 年開始營運；劉銘傳任巡撫期間（至 1891 年去職）開通臺北到基隆的鐵路。備註：國家鐵道博物館、國立臺灣博物館頁面沒有寫基隆－臺北段的完工年份，部分外文資料記為 1893 年全段完工；1891 年與 1893 年都遠早於 1978 年，排序不受影響，`years` 維持 1891（與原紀錄引用的東海大學館刊論文一致）。 |
| easy-009 | 文化部文化資產主題資料〈臺北水道水源地〉（PDF）：https://themefile.culture.tw/file/2019-03-06/8323b600-4923-4f21-9410-98c0b40e7c40/2.%E5%8F%B0%E5%8C%97%E6%B0%B4%E9%81%93%E6%B0%B4%E6%BA%90%E5%9C%B0.pdf | 已開啟 | 一致：清末以前多以淡水河河水為生活飲用水，並有鑿井汲取地下水；1909 年水道開工。 |
| easy-010 | 台灣電力公司電業文物典藏〈追尋大台北的水電足跡〉：https://service.taipower.com.tw/Collection/2009/2025/8330/ | 已開啟 | 一致：「1905（明治 38）年興建臺北第一發電所（今新店區龜山發電廠）」，一百多年前電力剛開始供應都市。 |
| easy-013 | 教育部《重編國語辭典修訂本》「圖例」：https://dict.revised.moe.edu.tw/search.jsp?md=1&word=圖例 | 已開啟 | 一致：「地理或統計等圖上所附有各種符號、標記的說明。一般位於圖的角落。」 |
| easy-015 | 同辭典「盆地」：https://dict.revised.moe.edu.tw/dictView.jsp?ID=23961 | 已開啟 | 一致：「四周被高山或高地圍繞，中間相對低緩的地形。」 |
| easy-018 | 中央氣象署氣候百問 22：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate3-04.txt | 已開啟 | 一致：梅雨約 5 月中到 6 月中影響臺灣，為東北季風與西南季風的轉換期、常有滯留鋒面；名稱來自「長江中下游一帶梅子成熟時期連綿降雨」。 |
| easy-019 | 中央氣象署氣候百問 38：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate5-01.txt ；中央氣象署《颱風百問》（PDF）第 38 問：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/typhoon/typhoon.pdf | 已開啟 | 一致：1991～2020 年平均每年侵臺 3.2 個，7～10 月約占 91%；1911～2025 年「以 8 月最多，次為 7 月和 9 月，因此每年之 7 至 9 月可說是臺灣的颱風季」。詳解「以七到九月最多」正確。 |
| easy-020 | 中央氣象署氣候百問 10：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2-03.txt ；氣候百問 15：https://www.cwa.gov.tw/V8/C/K/Encyclopedia/climate/climate2-08.txt | 已開啟 | 一致：夏秋颱風、冬季寒流、午後雷陣雨；東北季風迎風面的北、東部冬季平均日雨量約 3 毫米，背風面中南部不足 1 毫米。 |
| easy-023 | 全國法規資料庫《志願服務法》第 3 條：https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0050131&flno=3 | 已開啟 | 一致：出於自由意志、非基於義務或法律責任、不以獲取報酬為目的。 |
| easy-024 | 內政部《會議規範》（PDF）：https://ws.moi.gov.tw/001/Upload/OldFile/civil_law_file/%E6%9C%83%E8%AD%B0%E8%A6%8F%E7%AF%84.pdf | 已開啟 | 一致：主席報告議程後進行討論事項，提付討論及表決，紀錄載明討論事項、表決方法及結果。 |
| easy-026 | 全國法規資料庫《兒童權利公約》：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=Y0000062 | 已開啟 | 一致：第 12 條表意、第 19 條免受傷害、第 24 條健康與醫療、第 31 條休息與遊戲。 |
| easy-029 | 新北市政府警察局〈新北市里守望相助隊管理實施計畫〉（ODT 文件）：https://www.police.ntpc.gov.tw/dl-30415-00bf95c5-8d3e-49cd-816a-252df9a2730c.html | 已開啟（下載後解壓縮讀取） | 一致：依內政部 87 年（1998）「守望相助再出發推行方案」；由里長結合鄰長及熱心人士組成，任務為里、社區巡守與協助維護社區安全。 |
